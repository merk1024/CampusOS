const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { readTrustedCheckpoint, exportCheckpoint } = require('../security/auditCheckpoint');
test('checkpoint files are bounded, validated and never overwritten', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-checkpoint-'));
  try {
    const file = path.join(directory, 'checkpoint.json');
    const checkpoint = { version: 1, chainId: randomUUID(), sequence: 2, hash: 'a'.repeat(64), createdAt: new Date().toISOString() };
    await exportCheckpoint(file, checkpoint);
    assert.deepEqual(await readTrustedCheckpoint(file), checkpoint);
    await assert.rejects(exportCheckpoint(file, checkpoint));
    await assert.rejects(readTrustedCheckpoint('relative-path'));
    await assert.rejects(readTrustedCheckpoint(path.join(directory, 'missing')));
    await fs.writeFile(file, '{"password":"never-echo"}');
    await assert.rejects(readTrustedCheckpoint(file), { message: 'Invalid audit checkpoint' });
    await fs.writeFile(file, 'x'.repeat(5000));
    await assert.rejects(readTrustedCheckpoint(file));
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
