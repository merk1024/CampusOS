const db = require('../config/database');
const { createServiceError } = require('./serviceError');

const SOURCES = Object.freeze({
  events: { table: 'system_audit_log', time: 'created_at' },
  grades: { table: 'grade_audit_log', time: 'changed_at' },
  attendance: { table: 'attendance_audit_log', time: 'changed_at' }
});

function dateFilter(value) {
  if (!value) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw createServiceError(400, 'Valid YYYY-MM-DD dates are required');
  }
  return value;
}

function utcTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2} /.test(value)
    ? value.replace(' ', 'T') + 'Z' : value;
}

async function getSecurityAlerts() {
  const evaluatedAt = new Date();
  const windowMinutes = 10;
  const cutoff = new Date(evaluatedAt.getTime() - windowMinutes * 60000);
  const format = date => db.client === 'postgres' ? date.toISOString()
    : date.toISOString().replace('T', ' ').replace('Z', '');
  // Aggregate in SQL rather than loading an unbounded event stream into memory.
  const rows = await db.all(`SELECT burst.*, u.name AS actor_name, u.email AS actor_email,
      evidence.request_id
    FROM (
      SELECT changed_by, action, COUNT(*) AS count, MIN(created_at) AS first_seen,
        MAX(created_at) AS last_seen, MAX(id) AS evidence_id
      FROM system_audit_log
      WHERE created_at >= ? AND created_at <= ? AND action IN ('login-failed', 'access-denied', 'mfa-failed')
      GROUP BY changed_by, action
      HAVING COUNT(*) >= CASE WHEN action = 'access-denied' THEN 10 ELSE 5 END
    ) burst
    LEFT JOIN users u ON u.id = burst.changed_by
    LEFT JOIN system_audit_log evidence ON evidence.id = burst.evidence_id
    ORDER BY burst.last_seen DESC, burst.evidence_id DESC LIMIT 101`, [format(cutoff), format(evaluatedAt)]);
  return {
    evaluatedAt: evaluatedAt.toISOString(), windowMinutes, alertsHasMore: rows.length > 100,
    alerts: rows.slice(0, 100).map(row => ({
      id: `${row.action}:${row.changed_by ?? 'anonymous'}`,
      rule: row.action === 'login-failed' ? 'failed-logins' : row.action === 'mfa-failed' ? 'failed-mfa' : 'access-denials',
      severity: 'warning', scope: row.changed_by == null ? 'anonymous-aggregate' : 'account',
      actorId: row.changed_by, actorName: row.actor_name, actorEmail: row.actor_email,
      count: Number(row.count), threshold: row.action === 'access-denied' ? 10 : 5,
      windowMinutes, firstSeen: utcTimestamp(row.first_seen), lastSeen: utcTimestamp(row.last_seen),
      requestId: row.request_id
    }))
  };
}

async function getSecurityAudit(filters = {}) {
  const source = filters.source || 'events';
  if (!Object.hasOwn(SOURCES, source)) throw createServiceError(400, 'Unknown audit source');
  const { table, time } = SOURCES[source];
  const from = dateFilter(filters.from);
  const to = dateFilter(filters.to);
  if (from && to && from > to) throw createServiceError(400, 'Invalid date range');
  const limit = Number(filters.limit || 50);
  const offset = Number(filters.offset || 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100
    || !Number.isInteger(offset) || offset < 0 || offset > 10000) {
    throw createServiceError(400, 'Invalid pagination');
  }
  const q = String(filters.q || '').trim();
  const action = String(filters.action || '').trim();
  if (q.length > 100 || action.length > 60) throw createServiceError(400, 'Filter is too long');
  const conditions = [];
  const params = [];
  if (from) { conditions.push(`DATE(a.${time}) >= ?`); params.push(from); }
  if (to) { conditions.push(`DATE(a.${time}) <= ?`); params.push(to); }
  if (action) { conditions.push('a.action = ?'); params.push(action); }
  if (q) {
    conditions.push("(LOWER(COALESCE(u.name, '')) LIKE LOWER(?) OR LOWER(COALESCE(u.email, '')) LIKE LOWER(?))");
    params.push('%' + q + '%', '%' + q + '%');
  }
  const rows = await db.all(`SELECT a.*, u.name AS actor_name, u.email AS actor_email
    FROM ${table} a LEFT JOIN users u ON u.id = a.changed_by
    ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
    ORDER BY a.${time} DESC, a.id DESC LIMIT ? OFFSET ?`, [...params, limit + 1, offset]);
  return {
    ...await getSecurityAlerts(),
    source, offset, limit, hasMore: rows.length > limit,
    entries: rows.slice(0, limit).map(row => ({
      id: row.id,
      occurredAt: utcTimestamp(row[time]),
      actorName: row.actor_name,
      actorEmail: row.actor_email, action: row.action,
      entity: source === 'events' ? row.entity_type : source,
      entityId: source === 'events' ? row.entity_id : (row.exam_id ?? row.schedule_id),
      studentId: row.student_id ?? null,
      summary: source === 'events' ? row.summary : null,
      previousValue: source === 'grades' ? row.previous_grade : source === 'attendance' ? row.previous_status : null,
      newValue: source === 'grades' ? row.new_grade : source === 'attendance' ? row.new_status : null,
      previousComments: source === 'grades' ? row.previous_comments : null,
      newComments: source === 'grades' ? row.new_comments : null
    }))
  };
}

module.exports = { getSecurityAudit };
