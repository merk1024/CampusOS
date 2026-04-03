const db = require('../config/database');
const {
  normalizeAudienceScope,
  parseAudienceTokens,
  normalizeGroupToken,
  normalizeNumericId
} = require('./announcementAudience');

const ACTIVE_USER_FILTER = () => (
  db.client === 'postgres'
    ? 'u.is_active = TRUE'
    : 'u.is_active = 1'
);

const toDatabaseTimestamp = (value) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 19).replace('T', ' ');
};

const safeJson = (value) => {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ serializationError: 'Could not serialize details payload' });
  }
};

async function logSystemAudit({
  entityType,
  entityId = null,
  action,
  summary,
  details = null,
  changedBy = null,
  requestId = null
}) {
  if (!entityType || !action || !summary) {
    return null;
  }

  return db.run(
    `INSERT INTO system_audit_log
      (entity_type, entity_id, action, summary, details, changed_by, request_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      entityType,
      entityId === undefined || entityId === null ? null : String(entityId),
      action,
      summary,
      safeJson(details),
      changedBy || null,
      requestId || null
    ]
  );
}

async function enqueueJob({
  jobType,
  payload,
  createdBy = null,
  maxAttempts = 3,
  availableAt = null
}) {
  if (!jobType) {
    throw new Error('jobType is required');
  }

  return db.run(
    `INSERT INTO job_queue
      (job_type, payload, max_attempts, available_at, created_by)
     VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)`,
    [
      jobType,
      safeJson(payload || {}),
      maxAttempts,
      toDatabaseTimestamp(availableAt),
      createdBy || null
    ]
  );
}

async function createNotificationInboxEntry({
  userId,
  sourceType,
  sourceId,
  title,
  message,
  status = 'delivered',
  metadata = null,
  deliveredAt = null
}) {
  if (!userId || !sourceType || !sourceId || !title || !message) {
    return null;
  }

  if (db.client === 'postgres') {
    return db.query(
      `INSERT INTO notification_inbox
        (user_id, source_type, source_id, title, message, status, metadata, delivered_at, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_TIMESTAMP), FALSE)
       ON CONFLICT (user_id, source_type, source_id)
       DO UPDATE SET
         title = EXCLUDED.title,
         message = EXCLUDED.message,
         status = EXCLUDED.status,
         metadata = EXCLUDED.metadata,
         delivered_at = EXCLUDED.delivered_at,
         is_read = FALSE`,
      [
        userId,
        sourceType,
        String(sourceId),
        title,
        message,
        status,
        safeJson(metadata),
        toDatabaseTimestamp(deliveredAt)
      ]
    );
  }

  return db.run(
    `INSERT OR REPLACE INTO notification_inbox
      (id, user_id, source_type, source_id, title, message, status, metadata, delivered_at, is_read, created_at)
     VALUES (
       COALESCE(
         (SELECT id FROM notification_inbox WHERE user_id = ? AND source_type = ? AND source_id = ?),
         NULL
       ),
       ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), 0,
       COALESCE(
         (SELECT created_at FROM notification_inbox WHERE user_id = ? AND source_type = ? AND source_id = ?),
         CURRENT_TIMESTAMP
       )
     )`,
    [
      userId,
      sourceType,
      String(sourceId),
      userId,
      sourceType,
      String(sourceId),
      title,
      message,
      status,
      safeJson(metadata),
      toDatabaseTimestamp(deliveredAt),
      userId,
      sourceType,
      String(sourceId)
    ]
  );
}

async function getPendingJob() {
  return db.get(
    `SELECT *
     FROM job_queue
     WHERE status = 'pending'
       AND COALESCE(available_at, CURRENT_TIMESTAMP) <= CURRENT_TIMESTAMP
     ORDER BY created_at ASC
     LIMIT 1`
  );
}

async function claimJob(jobId, workerName) {
  const result = await db.run(
    `UPDATE job_queue
     SET status = 'processing',
         worker_name = ?,
         locked_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND status = 'pending'`,
    [workerName, jobId]
  );

  return Number(result?.changes || 0) > 0;
}

async function completeJob(jobId, resultPayload = null) {
  await db.run(
    `UPDATE job_queue
     SET status = 'completed',
         result_payload = ?,
         completed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [safeJson(resultPayload || {}), jobId]
  );
}

async function failJob(job, error) {
  const nextAttempts = Number(job.attempts || 0) + 1;
  const maxAttempts = Number(job.max_attempts || 3);
  const shouldRetry = nextAttempts < maxAttempts;
  const nextAvailableAt = shouldRetry
    ? toDatabaseTimestamp(new Date(Date.now() + (5 * 60 * 1000)))
    : job.available_at;

  await db.run(
    `UPDATE job_queue
     SET status = ?,
         attempts = ?,
         last_error = ?,
         available_at = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      shouldRetry ? 'pending' : 'failed',
      nextAttempts,
      String(error?.message || error || 'Unknown job failure'),
      nextAvailableAt,
      job.id
    ]
  );
}

const dedupeUsers = (users) => {
  const byId = new Map();
  users.forEach((user) => {
    if (user?.id) {
      byId.set(user.id, user);
    }
  });
  return [...byId.values()];
};

async function getNotificationAudienceUsers({
  audienceScope = 'all',
  audienceValue = null,
  courseId = null,
  excludeUserId = null
}) {
  const normalizedScope = normalizeAudienceScope(audienceScope);

  if (normalizedScope === 'all') {
    const params = [];
    let sql = `
      SELECT u.id, u.email, u.name, u.role, u.group_name, u.subgroup_name
      FROM users u
      WHERE ${ACTIVE_USER_FILTER()}
    `;

    if (excludeUserId) {
      sql += db.client === 'postgres'
        ? ' AND u.id <> $1'
        : ' AND u.id <> ?';
      params.push(excludeUserId);
    }

    return db.all(sql, params);
  }

  if (normalizedScope === 'students' || normalizedScope === 'teachers' || normalizedScope === 'admins') {
    const roleMap = {
      students: 'student',
      teachers: 'teacher',
      admins: 'admin'
    };
    const params = [roleMap[normalizedScope]];
    let sql = `
      SELECT u.id, u.email, u.name, u.role, u.group_name, u.subgroup_name
      FROM users u
      WHERE ${ACTIVE_USER_FILTER()}
        AND u.role = ?
    `;

    if (excludeUserId) {
      sql += ' AND u.id <> ?';
      params.push(excludeUserId);
    }

    return db.all(sql, params);
  }

  if (normalizedScope === 'group') {
    const groups = parseAudienceTokens(audienceValue).map(normalizeGroupToken);
    if (groups.length === 0) {
      return [];
    }

    const students = await db.all(
      `SELECT u.id, u.email, u.name, u.role, u.group_name, u.subgroup_name
       FROM users u
       WHERE ${ACTIVE_USER_FILTER()}
         AND u.role = 'student'`
    );

    return students.filter((user) => {
      if (excludeUserId && user.id === excludeUserId) {
        return false;
      }

      return groups.includes(normalizeGroupToken(user.group_name))
        || groups.includes(normalizeGroupToken(user.subgroup_name));
    });
  }

  if (normalizedScope === 'course') {
    const resolvedCourseId = normalizeNumericId(courseId);
    if (!resolvedCourseId) {
      return [];
    }

    const enrolledUsers = await db.all(
      `SELECT DISTINCT u.id, u.email, u.name, u.role, u.group_name, u.subgroup_name
       FROM users u
       JOIN course_enrollments ce ON ce.student_id = u.id
       WHERE ${ACTIVE_USER_FILTER()}
         AND ce.course_id = ?`,
      [resolvedCourseId]
    );
    const assignedTeacher = await db.all(
      `SELECT DISTINCT u.id, u.email, u.name, u.role, u.group_name, u.subgroup_name
       FROM users u
       JOIN courses c ON c.teacher_id = u.id
       WHERE ${ACTIVE_USER_FILTER()}
         AND c.id = ?`,
      [resolvedCourseId]
    );

    return dedupeUsers([...enrolledUsers, ...assignedTeacher]).filter((user) => (
      excludeUserId ? user.id !== excludeUserId : true
    ));
  }

  return [];
}

async function deliverNotificationBroadcast(payload = {}) {
  const recipients = await getNotificationAudienceUsers({
    audienceScope: payload.audienceScope,
    audienceValue: payload.audienceValue,
    courseId: payload.courseId,
    excludeUserId: payload.excludeUserId || null
  });

  for (const recipient of recipients) {
    await createNotificationInboxEntry({
      userId: recipient.id,
      sourceType: payload.sourceType || 'system',
      sourceId: payload.sourceId || job.id,
      title: payload.title || 'CampusOS update',
      message: payload.message || 'A new CampusOS notification is available.',
      metadata: {
        ...payload.metadata,
        audienceRole: recipient.role
      }
    });
  }

  return {
    delivered: recipients.length,
    sourceType: payload.sourceType || 'system',
    sourceId: payload.sourceId || null
  };
}

async function processNotificationBroadcastJob(job) {
  const payload = JSON.parse(job.payload || '{}');
  const deliveryResult = await deliverNotificationBroadcast(payload);

  return {
    ...deliveryResult,
    sourceId: deliveryResult.sourceId || job.id
  };
}

async function processImportSummaryJob(job) {
  const payload = JSON.parse(job.payload || '{}');
  if (payload.notifyUserId) {
    await createNotificationInboxEntry({
      userId: payload.notifyUserId,
      sourceType: payload.sourceType || 'import',
      sourceId: payload.sourceId || job.id,
      title: payload.title || 'CampusOS import finished',
      message: payload.message || 'A background import summary is available.',
      metadata: payload.metadata || null
    });
  }

  return {
    notifiedUserId: payload.notifyUserId || null,
    sourceType: payload.sourceType || 'import'
  };
}

const JOB_PROCESSORS = {
  'notification.broadcast': processNotificationBroadcastJob,
  'import.summary': processImportSummaryJob
};

async function runQueuedJobs({ workerName = 'campusos-worker', limit = 20 } = {}) {
  const processed = [];

  for (let index = 0; index < limit; index += 1) {
    const job = await getPendingJob();
    if (!job) {
      break;
    }

    const claimed = await claimJob(job.id, workerName);
    if (!claimed) {
      continue;
    }

    try {
      const processor = JOB_PROCESSORS[job.job_type];
      if (!processor) {
        throw new Error(`Unsupported job type: ${job.job_type}`);
      }

      const resultPayload = await processor(job);
      await completeJob(job.id, resultPayload);
      processed.push({
        id: job.id,
        job_type: job.job_type,
        status: 'completed'
      });
    } catch (error) {
      await failJob(job, error);
      processed.push({
        id: job.id,
        job_type: job.job_type,
        status: 'failed',
        error: String(error.message || error)
      });
    }
  }

  return {
    workerName,
    processedCount: processed.length,
    jobs: processed
  };
}

module.exports = {
  logSystemAudit,
  enqueueJob,
  createNotificationInboxEntry,
  deliverNotificationBroadcast,
  runQueuedJobs
};
