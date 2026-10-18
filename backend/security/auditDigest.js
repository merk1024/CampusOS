const { createHash } = require('node:crypto');
const FIELDS = Object.freeze({
  system_audit_log: ['id', 'entity_type', 'entity_id', 'action', 'summary', 'details', 'changed_by', 'request_id', 'created_at'],
  grade_audit_log: ['id', 'grade_id', 'exam_id', 'student_id', 'action', 'previous_grade', 'new_grade', 'previous_comments', 'new_comments', 'changed_by', 'changed_at'],
  attendance_audit_log: ['id', 'attendance_id', 'schedule_id', 'student_id', 'date', 'action', 'previous_status', 'new_status', 'changed_by', 'changed_at']
});
const NUMBERS = new Set(['id', 'grade_id', 'exam_id', 'attendance_id', 'schedule_id', 'changed_by', 'previous_grade', 'new_grade']);
const hash = text => createHash('sha256').update(text).digest('hex');
function timestamp(value) {
  const text = value instanceof Date ? value.toISOString() : String(value).replace(' ', 'T');
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?Z?$/.exec(text);
  if (!match || !Number.isFinite(Date.parse(match[1] + 'Z'))) throw new Error('Invalid audit timestamp');
  return match[1] + '.' + (match[2] || '').padEnd(6, '0') + 'Z';
}
function canonicalAuditRecord(source, row) {
  if (!Object.hasOwn(FIELDS, source)) throw new Error('Unknown audit source');
  const values = FIELDS[source].map(field => {
    const value = row[field];
    if (value === undefined) throw new Error('Missing protected audit field');
    if (value === null) return null;
    if (NUMBERS.has(field)) {
      const number = Number(value);
      if (!Number.isSafeInteger(number)) throw new Error('Invalid audit integer');
      return number;
    }
    if (field === 'changed_at' || field === 'created_at') return timestamp(value);
    if (field === 'details') {
      // Parsing JSON here would lose large-number precision and conceal edits.
      return ['text', String(value)];
    }
    return String(value);
  });
  return JSON.stringify(['CampusOS:audit-record:v1', source, values]);
}
const auditDigest = (source, row) => hash(canonicalAuditRecord(source, row));
const chainDigest = entry => hash(JSON.stringify(['CampusOS:audit-chain:v1', entry.chainId, Number(entry.sequence), entry.source,
  Number(entry.recordId), entry.payloadHash, entry.previousHash]));
function selectAudit(source, client) {
  if (!Object.hasOwn(FIELDS, source)) throw new Error('Unknown audit source');
  // pg's default Date parser drops microseconds, so preserve them as UTC text.
  return 'SELECT ' + FIELDS[source].map(field => client === 'postgres' && ['created_at', 'changed_at'].includes(field)
    ? `to_char(${field} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS ${field}` : field).join(', ') + ' FROM ' + source;
}
module.exports = { FIELDS, canonicalAuditRecord, auditDigest, chainDigest, selectAudit };
