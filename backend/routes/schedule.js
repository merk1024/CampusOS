const express = require('express');
const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const db = require('../config/database');

// Get schedule
router.get('/', auth, async (req, res) => {
  try {
    let query = 'SELECT * FROM schedule ORDER BY group_name, subgroup_name, day, time_slot';
    let params = [];

    if (req.user.role === 'student') {
      query = `
        SELECT * FROM schedule
        WHERE
          (
            group_name = ?
            AND COALESCE(audience_type, 'group') = 'group'
          )
          OR (
            group_name = ?
            AND subgroup_name = ?
            AND audience_type = 'subgroup'
          )
          OR (
            student_user_id = ?
            AND audience_type = 'individual'
          )
        ORDER BY day, time_slot
      `;
      params = [
        req.user.group_name,
        req.user.group_name,
        req.user.subgroup_name,
        req.user.id
      ];
    }

    const result = await db.all(query, params);
    res.json({ schedule: result });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create schedule entry
router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const {
      day,
      timeSlot,
      time_slot,
      groupName,
      group_name,
      subgroupName,
      subgroup_name,
      audienceType,
      audience_type,
      studentUserId,
      student_user_id,
      subject,
      teacher,
      room
    } = req.body;

    const normalizedAudienceType = audience_type || audienceType || 'group';
    const normalizedGroupName = group_name || groupName || (normalizedAudienceType === 'individual' ? 'INDIVIDUAL' : null);
    const normalizedSubgroupName = normalizedAudienceType === 'subgroup' ? (subgroup_name || subgroupName || null) : null;
    const normalizedStudentUserId = normalizedAudienceType === 'individual' ? (student_user_id || studentUserId || null) : null;

    const result = await db.run(
      `INSERT INTO schedule (
        day, time_slot, group_name, audience_type, subgroup_name, student_user_id, subject, teacher, room
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        day,
        time_slot || timeSlot,
        normalizedGroupName,
        normalizedAudienceType,
        normalizedSubgroupName,
        normalizedStudentUserId,
        subject,
        teacher,
        room
      ]
    );

    const inserted = await db.get('SELECT * FROM schedule WHERE id = ?', [result.id]);
    res.status(201).json({ message: 'Schedule created', schedule: inserted });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update schedule entry
router.put('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const {
      day,
      timeSlot,
      time_slot,
      groupName,
      group_name,
      subgroupName,
      subgroup_name,
      audienceType,
      audience_type,
      studentUserId,
      student_user_id,
      subject,
      teacher,
      room
    } = req.body;

    const normalizedAudienceType = audience_type || audienceType || 'group';
    const normalizedGroupName = group_name || groupName || (normalizedAudienceType === 'individual' ? 'INDIVIDUAL' : null);
    const normalizedSubgroupName = normalizedAudienceType === 'subgroup' ? (subgroup_name || subgroupName || null) : null;
    const normalizedStudentUserId = normalizedAudienceType === 'individual' ? (student_user_id || studentUserId || null) : null;

    const result = await db.run(
      `UPDATE schedule
       SET day = ?,
           time_slot = ?,
           group_name = ?,
           audience_type = ?,
           subgroup_name = ?,
           student_user_id = ?,
           subject = ?,
           teacher = ?,
           room = ?
       WHERE id = ?`,
      [
        day,
        time_slot || timeSlot,
        normalizedGroupName,
        normalizedAudienceType,
        normalizedSubgroupName,
        normalizedStudentUserId,
        subject,
        teacher,
        room,
        req.params.id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const updated = await db.get('SELECT * FROM schedule WHERE id = ?', [req.params.id]);
    res.json({ message: 'Schedule updated', schedule: updated });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete schedule entry
router.delete('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const result = await db.run('DELETE FROM schedule WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
