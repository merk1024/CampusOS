const { randomUUID } = require('node:crypto');
const db = require('../config/database');
const { FIELDS, auditDigest, chainDigest, selectAudit } = require('../security/auditDigest');
const ZERO = '0'.repeat(64);
const PAGE = 200;
async function lockedHead(tx) {
  await tx.run('UPDATE audit_integrity_head SET sequence = sequence WHERE id = 1');
  const head = await tx.get('SELECT * FROM audit_integrity_head WHERE id = 1');
  if (!head || Number(head.version) !== 1 || !Number.isSafeInteger(Number(head.sequence))) throw new Error('Invalid audit chain head');
  return head;
}
async function writeEntry(tx, head, source, row) {
  const sequence = Number(head.sequence) + 1;
  if (!Number.isSafeInteger(sequence)) throw new Error('Audit sequence exhausted');
  const payloadHash = auditDigest(source, row);
  const entryHash = chainDigest({ chainId: head.chain_id, sequence, source, recordId: row.id, payloadHash, previousHash: head.head_hash });
  await tx.run(`INSERT INTO audit_integrity_entries (sequence, source, record_id, payload_hash, previous_hash, entry_hash)
    VALUES (?, ?, ?, ?, ?, ?)`, [sequence, source, row.id, payloadHash, head.head_hash, entryHash]);
  await tx.run('UPDATE audit_integrity_head SET sequence = ?, head_hash = ? WHERE id = 1', [sequence, entryHash]);
  head.sequence = sequence; head.head_hash = entryHash;
}
async function appendAuditRecord(source, sql, params, executor = db) {
  if (!Object.hasOwn(FIELDS, source)) throw new Error('Unknown audit source');
  const work = async tx => {
    const head = await lockedHead(tx);
    const result = await tx.run(sql, params);
    if (Number(head.initialized)) {
      const row = await tx.get(selectAudit(source, tx.client || executor.client || db.client) + ' WHERE id = ?', [result.id]);
      if (!row) throw new Error('Audit insert returned no record');
      await writeEntry(tx, head, source, row);
    }
    return result;
  };
  if (executor.inTransaction || (executor === db && db.isInTransaction())) return work(executor);
  if (typeof executor.transaction !== 'function') throw new Error('Unsupported audit executor: transactional adapter required');
  return executor.transaction(work);
}
async function updateLegacyAudit(source, sql, params) {
  if (!Object.hasOwn(FIELDS, source)) throw new Error('Unknown audit source');
  const work = async tx => {
    const head = await lockedHead(tx);
    if (Number(head.initialized)) return false;
    await tx.run(sql, params);
    return true;
  };
  return db.isInTransaction() ? work(db) : db.transaction(work);
}
async function initializeAuditChain() {
  return db.transaction(async tx => {
    const head = await lockedHead(tx);
    if (Number(head.initialized)) throw new Error('Audit chain is already initialized; re-baselining is forbidden');
    if (Number((await tx.get('SELECT COUNT(*) AS count FROM audit_integrity_entries')).count)) throw new Error('Unexpected existing chain entries');
    head.chain_id = randomUUID(); head.head_hash = ZERO; head.sequence = 0;
    for (const source of Object.keys(FIELDS)) {
      let after = 0;
      while (true) {
        const rows = await tx.all(selectAudit(source, db.client) + ' WHERE id > ? ORDER BY id LIMIT ?', [after, PAGE]);
        if (!rows.length) break;
        for (const row of rows) { await writeEntry(tx, head, source, row); after = row.id; }
      }
    }
    const initializedAt = new Date().toISOString();
    await tx.run('UPDATE audit_integrity_head SET initialized = 1, chain_id = ?, initialized_at = ? WHERE id = 1', [head.chain_id, initializedAt]);
    return { chainId: head.chain_id, sequence: Number(head.sequence), hash: head.head_hash, initializedAt };
  });
}
async function verifyAuditChain({ checkpoint = null } = {}) {
  return db.transaction(async tx => {
    const verifiedAt = new Date().toISOString();
    const head = await tx.get('SELECT * FROM audit_integrity_head WHERE id = 1');
    const violation = (reason, entry) => ({ status: 'violation', verifiedAt, reason,
      ...(entry ? { reference: { source: entry.source, recordId: entry.record_id, sequence: Number(entry.sequence) } } : {}) });
    if (!head) return violation('missing-head');
    if (!Number(head.initialized)) return checkpoint ? violation('checkpoint-without-initialized-chain') : { status: 'not-initialized', verifiedAt };
    if (Number(head.version) !== 1 || !head.chain_id || !Number.isSafeInteger(Number(head.sequence)) || Number(head.sequence) < 0) return violation('invalid-head');
    const total = Number(head.sequence);
    if (Number((await tx.get('SELECT COUNT(*) AS count FROM audit_integrity_entries')).count) !== total) return violation('entry-count-mismatch');
    if (await tx.get('SELECT source, record_id FROM audit_integrity_entries GROUP BY source, record_id HAVING COUNT(*) > 1 LIMIT 1')) return violation('duplicate-association');
    let previousHash = ZERO;
    let sequence = 0;
    let anchorHash = checkpoint?.sequence === 0 ? ZERO : null;
    const counts = Object.fromEntries(Object.keys(FIELDS).map(source => [source, 0]));
    while (true) {
      const entries = await tx.all('SELECT * FROM audit_integrity_entries WHERE sequence > ? ORDER BY sequence LIMIT ?', [sequence, PAGE]);
      if (!entries.length) break;
      for (const entry of entries) {
        if (Number(entry.sequence) !== sequence + 1 || entry.previous_hash !== previousHash || !Object.hasOwn(FIELDS, entry.source)) return violation('broken-link', entry);
        const row = await tx.get(selectAudit(entry.source, db.client) + ' WHERE id = ?', [entry.record_id]);
        if (!row) return violation('missing-record', entry);
        let payloadHash;
        try { payloadHash = auditDigest(entry.source, row); } catch { return violation('invalid-record', entry); }
        if (payloadHash !== entry.payload_hash) return violation('changed-record', entry);
        const expected = chainDigest({ chainId: head.chain_id, sequence: entry.sequence, source: entry.source, recordId: entry.record_id, payloadHash, previousHash });
        if (expected !== entry.entry_hash) return violation('changed-chain', entry);
        sequence++; previousHash = expected; counts[entry.source]++;
        if (checkpoint && sequence === checkpoint.sequence) anchorHash = expected;
      }
    }
    if (sequence !== total || previousHash !== head.head_hash) return violation('head-mismatch');
    for (const source of Object.keys(FIELDS)) {
      if (Number((await tx.get(`SELECT COUNT(*) AS count FROM ${source}`)).count) !== counts[source]) return violation('untracked-record');
    }
    if (checkpoint && (checkpoint.version !== 1 || checkpoint.chainId !== head.chain_id || !Number.isSafeInteger(checkpoint.sequence)
      || checkpoint.sequence < 0 || checkpoint.sequence > total || checkpoint.hash !== anchorHash || !Number.isFinite(Date.parse(checkpoint.createdAt)))) return violation('checkpoint-mismatch');
    return { status: checkpoint ? 'anchored-prefix-valid' : 'unanchored', verifiedAt, chainId: head.chain_id,
      anchoredSequence: checkpoint?.sequence ?? null, tailCount: checkpoint ? total - checkpoint.sequence : total,
      checkpointTime: checkpoint?.createdAt ?? null, baselineTime: head.initialized_at,
      checkpoint: { version: 1, chainId: head.chain_id, sequence: total, hash: head.head_hash, createdAt: verifiedAt } };
  }, { repeatableRead: true });
}
async function verifyConfiguredAuditChain() {
  try {
    const checkpoint = process.env.AUDIT_CHECKPOINT_PATH
      ? await require('../security/auditCheckpoint').readTrustedCheckpoint(process.env.AUDIT_CHECKPOINT_PATH) : null;
    return await verifyAuditChain({ checkpoint });
  } catch {
    return { status: 'unavailable', verifiedAt: new Date().toISOString(), reason: 'verification-or-checkpoint-unavailable' };
  }
}
module.exports = { appendAuditRecord, updateLegacyAudit, initializeAuditChain, verifyAuditChain, verifyConfiguredAuditChain };
