const fs = require('node:fs/promises');
const path = require('node:path');
function validateCheckpoint(value) {
  if (!value || value.version !== 1 || typeof value.chainId !== 'string' || !/^[a-f0-9-]{36}$/.test(value.chainId)
    || !Number.isSafeInteger(value.sequence) || value.sequence < 0 || typeof value.hash !== 'string' || !/^[a-f0-9]{64}$/.test(value.hash)
    || typeof value.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value.createdAt) || !Number.isFinite(Date.parse(value.createdAt))) throw new Error('Invalid audit checkpoint');
  return { version: value.version, chainId: value.chainId, sequence: value.sequence, hash: value.hash, createdAt: value.createdAt };
}
async function readTrustedCheckpoint(file) {
  if (!path.isAbsolute(file)) throw new Error('Audit checkpoint path must be absolute');
  const info = await fs.lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 4096) throw new Error('Invalid audit checkpoint file');
  const handle = await fs.open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 4096) throw new Error('Invalid audit checkpoint file');
    const buffer = Buffer.alloc(4097);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 4096) throw new Error('Invalid audit checkpoint file');
    let value;
    try { value = JSON.parse(buffer.subarray(0, bytesRead).toString('utf8')); } catch { throw new Error('Invalid audit checkpoint'); }
    return validateCheckpoint(value);
  } finally { await handle.close(); }
}
async function exportCheckpoint(file, value) {
  const checkpoint = validateCheckpoint(value);
  if (!path.isAbsolute(file)) throw new Error('Audit checkpoint destination must be absolute');
  const database = path.resolve(process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database.db'));
  const normalize = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
  if (normalize(file) === normalize(database)) throw new Error('Checkpoint destination cannot be the database');
  const handle = await fs.open(file, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(checkpoint) + '\n'); await handle.sync(); } finally { await handle.close(); }
  return checkpoint;
}
module.exports = { validateCheckpoint, readTrustedCheckpoint, exportCheckpoint };
