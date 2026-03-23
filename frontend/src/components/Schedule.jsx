import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { canManageAcademicRecords, hasAdminAccess, isStudentAccount } from '../roles';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayAliases = {
  Monday: ['Monday', 'РџРѕРЅРµРґРµР»СЊРЅРёРє'],
  Tuesday: ['Tuesday', 'Р’С‚РѕСЂРЅРёРє'],
  Wednesday: ['Wednesday', 'РЎСЂРµРґР°'],
  Thursday: ['Thursday', 'Р§РµС‚РІРµСЂРі'],
  Friday: ['Friday', 'РџСЏС‚РЅРёС†Р°'],
  Saturday: ['Saturday', 'РЎСѓР±Р±РѕС‚Р°']
};

const timeSlots = [
  '08:00-08:40', '08:45-09:25', '09:30-10:10', '10:15-10:55',
  '11:00-11:40', '11:45-12:25', '12:30-13:10', '13:10-13:55',
  '14:00-14:40', '14:45-15:25', '15:30-16:10', '16:15-16:55',
  '17:00-17:40', '17:45-18:25'
];

const emptyForm = {
  id: null,
  day: '',
  time_slot: '',
  group_name: '',
  audience_type: 'group',
  subgroup_name: '',
  student_user_id: '',
  course_id: '',
  subject: '',
  teacher: '',
  room: ''
};

const normalizeId = (value) => (value === '' || value === null || value === undefined ? '' : String(value));
const getRangeSlots = (startIndex, span = 1) => timeSlots.slice(startIndex, startIndex + span);
const getCourseTeacher = (course) => course?.teacher_name || course?.teacher || 'Teacher not assigned';

const normalizeDay = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const match = Object.entries(dayAliases).find(([, aliases]) => aliases.some((alias) => alias.toLowerCase() === normalized));
  return match ? match[0] : value;
};

const normalizeEntries = (entries) => (
  (entries || []).map((item) => ({
    ...item,
    day: normalizeDay(item.day),
    student_user_id: item.student_user_id ?? '',
    course_id: item.course_id ?? ''
  }))
);

const getStudentLabel = (student) => {
  if (!student) return 'Student';
  const group = student.group_name || '';
  const subgroup = student.subgroup_name || '';
  return `${student.name}${group ? ` (${group}${subgroup ? ` / ${subgroup}` : ''})` : ''}`;
};

const matchesScope = (item, scope) => {
  const audienceType = item.audience_type || 'group';
  if (audienceType !== scope.audienceType) return false;
  if ((item.group_name || '') !== (scope.groupName || '')) return false;
  if (scope.audienceType === 'subgroup') return (item.subgroup_name || '') === (scope.subgroupName || '');
  if (scope.audienceType === 'individual') return Number(item.student_user_id || 0) === Number(scope.studentUserId || 0);
  return true;
};

function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedAudienceView, setSelectedAudienceView] = useState('group');
  const [selectedSubgroup, setSelectedSubgroup] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [showCustomGroupInput, setShowCustomGroupInput] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState({ type: '', message: '' });

  const canEdit = canManageAcademicRecords(user);
  const isAdmin = hasAdminAccess(user);
  const isStudent = isStudentAccount(user);
  const studentGroup = user?.group_name || user?.group || '';
  const studentSubgroup = user?.subgroup_name || user?.subgroup || '';

  const courseOptions = useMemo(() => [...courses].sort((a, b) => a.name.localeCompare(b.name)), [courses]);
  const groupOptions = useMemo(() => {
    const groups = new Set();
    schedule.forEach((item) => { if (item.group_name && item.group_name !== 'INDIVIDUAL') groups.add(item.group_name); });
    students.forEach((item) => { if (item.group_name) groups.add(item.group_name); });
    if (studentGroup) groups.add(studentGroup);
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [schedule, students, studentGroup]);
  const subgroupOptions = useMemo(() => {
    if (!selectedGroup) return [];
    const subgroups = new Set();
    schedule.forEach((item) => {
      if (item.group_name === selectedGroup && (item.audience_type || 'group') === 'subgroup' && item.subgroup_name) {
        subgroups.add(item.subgroup_name);
      }
    });
    students.forEach((item) => {
      if (item.group_name === selectedGroup && item.subgroup_name) {
        subgroups.add(item.subgroup_name);
      }
    });
    if (studentGroup === selectedGroup && studentSubgroup) subgroups.add(studentSubgroup);
    return Array.from(subgroups).sort((a, b) => a.localeCompare(b));
  }, [schedule, selectedGroup, students, studentGroup, studentSubgroup]);
  const studentOptions = useMemo(
    () => students.filter((item) => !selectedGroup || item.group_name === selectedGroup).sort((a, b) => a.name.localeCompare(b.name)),
    [selectedGroup, students]
  );

  const visibleSchedule = useMemo(() => {
    if (isStudent) return schedule;
    if (selectedAudienceView === 'individual') {
      return schedule.filter((item) => (
        (item.audience_type || 'group') === 'individual'
        && (!selectedGroup || item.group_name === selectedGroup)
        && (!selectedStudentId || Number(item.student_user_id || 0) === Number(selectedStudentId || 0))
      ));
    }
    if (!selectedGroup) return [];
    return schedule.filter((item) => {
      if (item.group_name !== selectedGroup) return false;
      const audienceType = item.audience_type || 'group';
      if (selectedAudienceView === 'subgroup') return audienceType === 'subgroup' && item.subgroup_name === selectedSubgroup;
      return audienceType === 'group';
    });
  }, [isStudent, schedule, selectedAudienceView, selectedGroup, selectedStudentId, selectedSubgroup]);

  const scheduleMap = useMemo(() => new Map(visibleSchedule.map((item) => [`${item.day}__${item.time_slot}`, item])), [visibleSchedule]);
  const mergedBlocks = useMemo(() => {
    const signature = (item) => [item.subject, item.teacher, item.room, item.group_name, item.audience_type || 'group', item.subgroup_name || '', item.student_user_id || '', item.course_id || ''].join('||');
    const blocks = [];
    days.forEach((day, dayIndex) => {
      let slotIndex = 0;
      while (slotIndex < timeSlots.length) {
        const current = scheduleMap.get(`${day}__${timeSlots[slotIndex]}`);
        if (!current) {
          blocks.push({ type: 'empty', day, dayIndex, startIndex: slotIndex, span: 1, startSlot: timeSlots[slotIndex] });
          slotIndex += 1;
          continue;
        }
        let span = 1;
        while (slotIndex + span < timeSlots.length) {
          const next = scheduleMap.get(`${day}__${timeSlots[slotIndex + span]}`);
          if (!next || signature(next) !== signature(current)) break;
          span += 1;
        }
        blocks.push({
          type: 'occupied',
          day,
          dayIndex,
          startIndex: slotIndex,
          span,
          startSlot: timeSlots[slotIndex],
          endSlot: timeSlots[slotIndex + span - 1],
          entry: current
        });
        slotIndex += span;
      }
    });
    return blocks;
  }, [scheduleMap]);

  const loadSchedule = async () => {
    const response = await api.getSchedule();
    const entries = normalizeEntries(response?.schedule || []);
    setSchedule(entries);
    return entries;
  };

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('lms_user'));
    setUser(savedUser);
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [scheduleResponse, courseResponse, usersResponse] = await Promise.all([
          api.getSchedule(),
          canEdit ? api.getCourses() : Promise.resolve({ courses: [] }),
          isAdmin ? api.getUsers() : Promise.resolve({ users: [] })
        ]);
        const nextSchedule = normalizeEntries(scheduleResponse?.schedule || []);
        const nextStudents = (usersResponse?.users || []).filter((item) => item.role === 'student');
        setSchedule(nextSchedule);
        setCourses(courseResponse?.courses || []);
        setStudents(nextStudents);
        if (isStudent) {
          setSelectedGroup(studentGroup);
          setSelectedSubgroup(studentSubgroup);
        } else {
          const groups = Array.from(new Set([
            ...nextSchedule.map((item) => item.group_name).filter((value) => value && value !== 'INDIVIDUAL'),
            ...nextStudents.map((item) => item.group_name).filter(Boolean)
          ])).sort((a, b) => a.localeCompare(b));
          setSelectedGroup((current) => current || groups[0] || '');
        }
      } catch (loadError) {
        setError(loadError.message || 'Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [canEdit, isAdmin, isStudent, studentGroup, studentSubgroup, user]);

  useEffect(() => {
    if (selectedAudienceView !== 'subgroup') return;
    if (!subgroupOptions.length) {
      setSelectedSubgroup('');
      return;
    }
    if (!subgroupOptions.includes(selectedSubgroup)) {
      setSelectedSubgroup(subgroupOptions[0]);
    }
  }, [selectedAudienceView, selectedSubgroup, subgroupOptions]);

  useEffect(() => {
    if (selectedAudienceView !== 'individual') return;
    if (!studentOptions.length) {
      setSelectedStudentId('');
      return;
    }
    if (!studentOptions.some((item) => String(item.id) === String(selectedStudentId))) {
      setSelectedStudentId(String(studentOptions[0].id));
    }
  }, [selectedAudienceView, selectedStudentId, studentOptions]);

  const reloadSchedule = async (nextGroup = selectedGroup) => {
    const entries = await loadSchedule();
    if (isStudent) {
      setSelectedGroup(studentGroup);
      return;
    }
    const groups = Array.from(new Set([
      ...entries.map((item) => item.group_name).filter((value) => value && value !== 'INDIVIDUAL'),
      ...students.map((item) => item.group_name).filter(Boolean)
    ])).sort((a, b) => a.localeCompare(b));
    setSelectedGroup(groups.includes(nextGroup) ? nextGroup : (groups[0] || nextGroup || ''));
  };

  const clearDragState = () => {
    setDraggedBlock(null);
    setDropTarget(null);
  };

  const getConflictingSlots = ({ day, slots, scope, ignoreId = null }) => (
    slots.filter((slot) => schedule.some((item) => (
      item.day === day
      && item.time_slot === slot
      && item.id !== ignoreId
      && matchesScope(item, scope)
    )))
  );

  const handleStudentPick = (studentId, applyToForm = false) => {
    setSelectedStudentId(studentId);
    if (!applyToForm) return;
    const student = students.find((item) => String(item.id) === String(studentId));
    if (!student) return;
    setFormData((current) => ({
      ...current,
      student_user_id: String(student.id),
      group_name: student.group_name || current.group_name,
      subgroup_name: '',
      audience_type: 'individual'
    }));
  };

  const handleCoursePick = (courseId) => {
    const course = courseOptions.find((item) => String(item.id) === String(courseId));
    setFormData((current) => ({
      ...current,
      course_id: courseId,
      subject: course ? course.name : current.subject,
      teacher: course ? getCourseTeacher(course) : current.teacher
    }));
  };

  const handleCellClick = (day, timeSlot) => {
    if (!canEdit) return;
    const existing = visibleSchedule.find((item) => item.day === day && item.time_slot === timeSlot);
    if (!existing && selectedAudienceView === 'individual' && isAdmin && !selectedStudentId) {
      window.alert('Choose a student first to create an individual slot.');
      return;
    }
    if (existing) {
      setFormData({
        id: existing.id,
        day: existing.day,
        time_slot: existing.time_slot,
        group_name: existing.group_name || '',
        audience_type: existing.audience_type || 'group',
        subgroup_name: existing.subgroup_name || '',
        student_user_id: normalizeId(existing.student_user_id),
        course_id: normalizeId(existing.course_id),
        subject: existing.subject,
        teacher: existing.teacher || '',
        room: existing.room || ''
      });
      setSelectedTimeSlots([existing.time_slot]);
    } else {
      const student = students.find((item) => String(item.id) === String(selectedStudentId));
      setFormData({
        id: null,
        day,
        time_slot: timeSlot,
        group_name: isStudent ? studentGroup : (selectedGroup || student?.group_name || ''),
        audience_type: selectedAudienceView,
        subgroup_name: selectedAudienceView === 'subgroup' ? selectedSubgroup : '',
        student_user_id: selectedAudienceView === 'individual' ? normalizeId(selectedStudentId) : '',
        course_id: '',
        subject: '',
        teacher: user?.role === 'teacher' ? user.name : '',
        room: ''
      });
      setSelectedTimeSlots([timeSlot]);
    }
    setShowEditForm(true);
  };

  const handleDragStart = (block) => (event) => {
    if (!canEdit || block.type !== 'occupied') return;
    setDraggedBlock(block);
    setCopyFeedback({ type: '', message: '' });
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', `${block.day}__${block.startSlot}`);
  };

  const handleDragEnd = () => clearDragState();

  const handleDragOver = (block) => (event) => {
    if (!draggedBlock) return;
    const targetSlots = getRangeSlots(block.startIndex, draggedBlock.span);
    const scope = {
      groupName: draggedBlock.entry.group_name,
      audienceType: draggedBlock.entry.audience_type || 'group',
      subgroupName: draggedBlock.entry.subgroup_name || '',
      studentUserId: draggedBlock.entry.student_user_id || ''
    };
    if (block.type !== 'empty' || targetSlots.length !== draggedBlock.span || getConflictingSlots({ day: block.day, slots: targetSlots, scope }).length) {
      setDropTarget(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropTarget({ day: block.day, startSlot: block.startSlot });
  };

  const handleDragLeave = (block) => () => {
    setDropTarget((current) => (current?.day === block.day && current?.startSlot === block.startSlot ? null : current));
  };

  const handleDrop = (block) => async (event) => {
    event.preventDefault();
    if (!draggedBlock) return;
    const targetSlots = getRangeSlots(block.startIndex, draggedBlock.span);
    const scope = {
      groupName: draggedBlock.entry.group_name,
      audienceType: draggedBlock.entry.audience_type || 'group',
      subgroupName: draggedBlock.entry.subgroup_name || '',
      studentUserId: draggedBlock.entry.student_user_id || ''
    };
    const conflicts = getConflictingSlots({ day: block.day, slots: targetSlots, scope });
    if (targetSlots.length !== draggedBlock.span) {
      setCopyFeedback({ type: 'error', message: 'Not enough consecutive slots in this day to place the copied class.' });
      clearDragState();
      return;
    }
    if (conflicts.length) {
      setCopyFeedback({ type: 'error', message: `Cannot copy into ${block.day}. Occupied slots: ${conflicts.join(', ')}.` });
      clearDragState();
      return;
    }
    try {
      await Promise.all(targetSlots.map((slot) => api.createScheduleEntry({
        day: block.day,
        time_slot: slot,
        group_name: draggedBlock.entry.group_name,
        audience_type: draggedBlock.entry.audience_type || 'group',
        subgroup_name: draggedBlock.entry.subgroup_name || null,
        student_user_id: draggedBlock.entry.student_user_id || null,
        course_id: draggedBlock.entry.course_id || null,
        subject: draggedBlock.entry.subject,
        teacher: draggedBlock.entry.teacher,
        room: draggedBlock.entry.room
      })));
      await reloadSchedule(draggedBlock.entry.group_name.trim());
      setCopyFeedback({ type: 'success', message: `Copied "${draggedBlock.entry.subject}" to ${block.day} at ${targetSlots[0]}.` });
    } catch (dropError) {
      setCopyFeedback({ type: 'error', message: dropError.message || 'Failed to copy class to the selected slot.' });
    } finally {
      clearDragState();
    }
  };

  const closeModal = () => {
    setShowEditForm(false);
    setFormData(emptyForm);
    setSelectedTimeSlots([]);
  };

  const toggleTimeSlot = (slot) => {
    setSelectedTimeSlots((current) => (
      current.includes(slot)
        ? (current.length === 1 ? current : current.filter((value) => value !== slot))
        : [...current, slot].sort((a, b) => timeSlots.indexOf(a) - timeSlots.indexOf(b))
    ));
  };

  const handleSave = async () => {
    const audienceType = formData.audience_type || 'group';
    const groupName = formData.group_name.trim();
    const subgroupName = audienceType === 'subgroup' ? formData.subgroup_name.trim() : '';
    const studentUserId = audienceType === 'individual' ? normalizeId(formData.student_user_id) : '';
    const slots = formData.id ? [formData.time_slot] : selectedTimeSlots;

    if (!groupName) return window.alert('Please enter a group name.');
    if (audienceType === 'subgroup' && !subgroupName) return window.alert('Please enter a subgroup.');
    if (audienceType === 'individual' && !studentUserId) return window.alert('Please choose a student.');
    if (!slots.length) return window.alert('Please choose at least one time slot.');

    const scope = { groupName, audienceType, subgroupName, studentUserId };
    const conflicts = getConflictingSlots({ day: formData.day, slots, scope, ignoreId: formData.id });
    if (conflicts.length) {
      return window.alert(`These slots already have classes for this audience: ${conflicts.join(', ')}`);
    }

    const payload = {
      ...formData,
      group_name: groupName,
      audience_type: audienceType,
      subgroup_name: audienceType === 'subgroup' ? subgroupName : null,
      student_user_id: audienceType === 'individual' ? Number(studentUserId) : null,
      course_id: formData.course_id ? Number(formData.course_id) : null,
      subject: formData.subject.trim(),
      teacher: formData.teacher.trim(),
      room: formData.room.trim()
    };

    try {
      if (formData.id) {
        await api.updateScheduleEntry(formData.id, payload);
      } else {
        await Promise.all(slots.map((slot) => api.createScheduleEntry({ ...payload, time_slot: slot })));
      }
      await reloadSchedule(groupName);
      closeModal();
    } catch (saveError) {
      window.alert(saveError.message || 'Failed to save schedule entry');
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;
    try {
      await api.deleteScheduleEntry(formData.id);
      await reloadSchedule(formData.group_name.trim());
      closeModal();
    } catch (deleteError) {
      window.alert(deleteError.message || 'Failed to delete schedule entry');
    }
  };

  const totalEntries = schedule.length;
  const usesCustomGroup = showCustomGroupInput || (!!selectedGroup && !groupOptions.includes(selectedGroup));

  if (loading) {
    return <div className="page"><div className="page-header"><h1>Schedule</h1><p>Loading your timetable...</p></div><div className="loading-spinner"></div></div>;
  }

  if (error) {
    return <div className="page"><div className="page-header"><h1>Schedule</h1><p>Error loading schedule: {error}</p></div></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Schedule</h1>
          <p>
            {isStudent
              ? `Personal timetable for ${studentGroup || 'your group'}${studentSubgroup ? ` / ${studentSubgroup}` : ''}. Course-linked classes appear automatically after enrollment, plus personal overrides.`
              : 'Manage course schedules for groups, subgroups, and individual students.'}
          </p>
        </div>
        {canEdit && <div className="page-actions"><p className="edit-hint">Pick a scope, click any cell to edit it, or drag a class onto an empty slot to copy it.</p></div>}
      </div>

      <div className="schedule-admin-bar">
        <div className="schedule-admin-card"><span className="management-summary-label">Lessons loaded</span><strong>{totalEntries}</strong></div>
        <div className="schedule-admin-card"><span className="management-summary-label">Groups</span><strong>{groupOptions.length}</strong></div>
        <div className="schedule-admin-card">
          <span className="management-summary-label">Current scope</span>
          <strong>
            {isStudent
              ? `${studentGroup || 'Not set'}${studentSubgroup ? ` / ${studentSubgroup}` : ''}`
              : (selectedAudienceView === 'individual'
                ? (selectedStudentId ? getStudentLabel(studentOptions.find((item) => String(item.id) === String(selectedStudentId))) : 'Choose a student')
                : (selectedGroup || 'Choose group'))}
          </strong>
        </div>
        <div className="schedule-admin-card schedule-admin-legend">
          <span className="schedule-legend-item"><span className="schedule-dot occupied"></span> Existing class</span>
          <span className="schedule-legend-item"><span className="schedule-dot empty"></span> Empty slot</span>
          {canEdit && <span className="schedule-legend-item"><span className="schedule-dot editable"></span> Click to manage or drag to copy</span>}
        </div>
      </div>

      {copyFeedback.message && <div className={copyFeedback.type === 'error' ? 'error-message' : 'success-message'}>{copyFeedback.message}</div>}

      {canEdit ? (
        <div className="management-toolbar schedule-group-toolbar">
          <div className="schedule-group-switcher">
            <div className="schedule-group-field">
              <span className="management-summary-label">Group schedule</span>
              <div className="schedule-group-select-row">
                <select className="schedule-group-select" value={groupOptions.includes(selectedGroup) ? selectedGroup : ''} onChange={(event) => { setSelectedGroup(event.target.value); setShowCustomGroupInput(false); }}>
                  <option value="" disabled>{groupOptions.length ? 'Choose a group' : 'No groups yet'}</option>
                  {groupOptions.map((groupName) => <option key={groupName} value={groupName}>{groupName}</option>)}
                </select>
                <button type="button" className="management-filter-chip" onClick={() => { setSelectedGroup(''); setShowCustomGroupInput(true); }}>+ New group</button>
              </div>
              {usesCustomGroup && <input value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} placeholder="For example CYB-23" />}
            </div>

            {groupOptions.length > 0 && (
              <div className="management-filters schedule-group-chips">
                {groupOptions.map((groupName) => (
                  <button key={groupName} type="button" className={`management-filter-chip ${selectedGroup === groupName ? 'active' : ''}`} onClick={() => { setSelectedGroup(groupName); setShowCustomGroupInput(false); }}>
                    {groupName}
                  </button>
                ))}
              </div>
            )}

            <div className="management-filters schedule-group-chips">
              <button type="button" className={`management-filter-chip ${selectedAudienceView === 'group' ? 'active' : ''}`} onClick={() => setSelectedAudienceView('group')}>Whole group</button>
              <button type="button" className={`management-filter-chip ${selectedAudienceView === 'subgroup' ? 'active' : ''}`} onClick={() => setSelectedAudienceView('subgroup')}>Subgroup</button>
              {isAdmin && <button type="button" className={`management-filter-chip ${selectedAudienceView === 'individual' ? 'active' : ''}`} onClick={() => setSelectedAudienceView('individual')}>Individual</button>}
            </div>

            {selectedAudienceView === 'subgroup' && (
              <div className="schedule-group-field">
                <span className="management-summary-label">Subgroup schedule</span>
                <div className="schedule-group-select-row">
                  <select className="schedule-group-select" value={subgroupOptions.includes(selectedSubgroup) ? selectedSubgroup : ''} onChange={(event) => setSelectedSubgroup(event.target.value)}>
                    <option value="" disabled>{subgroupOptions.length ? 'Choose a subgroup' : 'No subgroups yet'}</option>
                    {subgroupOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <input value={selectedSubgroup} onChange={(event) => setSelectedSubgroup(event.target.value)} placeholder="For example 1-Group" />
                </div>
              </div>
            )}

            {selectedAudienceView === 'individual' && (
              <div className="schedule-group-field">
                <span className="management-summary-label">Student schedule</span>
                <div className="schedule-group-select-row">
                  <select className="schedule-group-select" value={selectedStudentId} onChange={(event) => handleStudentPick(event.target.value)}>
                    <option value="" disabled>{studentOptions.length ? 'Choose a student' : 'No students in this group'}</option>
                    {studentOptions.map((student) => <option key={student.id} value={student.id}>{getStudentLabel(student)}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
          <p className="schedule-group-hint">
            {selectedAudienceView === 'individual'
              ? 'Individual mode creates a personal timetable slot for one selected student.'
              : selectedAudienceView === 'subgroup'
                ? 'Subgroup mode edits only the selected subgroup inside the current group.'
                : 'Whole group mode edits classes shared by every student in the selected group.'}
          </p>
        </div>
      ) : (
        <div className="management-toolbar schedule-group-toolbar">
          <div className="schedule-group-field"><span className="management-summary-label">Your timetable source</span><input value={`${studentGroup}${studentSubgroup ? ` / ${studentSubgroup}` : ''}`} readOnly /></div>
          <p className="schedule-group-hint">Students see a personal timetable built from selected subjects, group classes, subgroup classes, and manual personal slots.</p>
        </div>
      )}

      {canEdit && selectedAudienceView === 'subgroup' && !selectedSubgroup ? (
        <div className="lms-empty">Choose or type a subgroup above to start building its subgroup schedule.</div>
      ) : canEdit && selectedAudienceView === 'individual' && !selectedStudentId ? (
        <div className="lms-empty">Choose a student above to manage an individual schedule.</div>
      ) : !visibleSchedule.length && !selectedGroup && canEdit && selectedAudienceView !== 'individual' ? (
        <div className="lms-empty">Choose or type a group name above to start building its schedule.</div>
      ) : (
        <div className="schedule-grid">
          <div className="schedule-grid-board" style={{ gridTemplateColumns: '80px repeat(6, minmax(150px, 1fr))', gridTemplateRows: `52px repeat(${timeSlots.length}, 56px)` }}>
            <div className="schedule-board-corner"></div>
            {days.map((day, index) => <div key={day} className="day-column schedule-grid-day" style={{ gridColumn: index + 2, gridRow: 1 }}>{day}</div>)}
            {timeSlots.map((slot, index) => <div key={slot} className="time-column schedule-grid-time" style={{ gridColumn: 1, gridRow: index + 2 }}>{slot}</div>)}
            {mergedBlocks.map((block) => (
              <div
                key={`${block.day}-${block.startSlot}-${block.type}`}
                className={`schedule-cell schedule-grid-item ${block.type === 'occupied' ? 'occupied merged-block' : 'empty'} ${canEdit ? 'editable' : ''} ${draggedBlock?.day === block.day && draggedBlock?.startSlot === block.startSlot ? 'drag-source' : ''} ${dropTarget?.day === block.day && dropTarget?.startSlot === block.startSlot ? 'drop-target' : ''}`}
                style={{ gridColumn: block.dayIndex + 2, gridRow: `${block.startIndex + 2} / span ${block.span}` }}
                onClick={() => handleCellClick(block.day, block.startSlot)}
                draggable={canEdit && block.type === 'occupied'}
                onDragStart={block.type === 'occupied' ? handleDragStart(block) : undefined}
                onDragEnd={block.type === 'occupied' ? handleDragEnd : undefined}
                onDragOver={canEdit ? handleDragOver(block) : undefined}
                onDragLeave={canEdit ? handleDragLeave(block) : undefined}
                onDrop={canEdit ? handleDrop(block) : undefined}
              >
                {block.type === 'occupied' ? (
                  <div className="class-info">
                    <div className="class-subject">{block.entry.subject}</div>
                    {block.entry.course_code && <div className="class-teacher">{block.entry.course_code}</div>}
                    <div className="class-teacher">{block.entry.teacher}</div>
                    <div className="class-room">Room: {block.entry.room || 'TBD'}</div>
                    <div className="class-group">Group: {block.entry.group_name}{block.entry.subgroup_name ? ` / ${block.entry.subgroup_name}` : ''}{(block.entry.audience_type || 'group') === 'individual' && block.entry.student_user_id ? ` / Student #${block.entry.student_user_id}` : ''}</div>
                    {canEdit && <div className="class-copy-hint">Drag to copy</div>}
                    {block.span > 1 && <div className="class-duration">{block.span} slots | {block.startSlot} to {block.endSlot}</div>}
                  </div>
                ) : canEdit ? <div className="empty-slot"><span>{dropTarget?.day === block.day && dropTarget?.startSlot === block.startSlot ? 'Drop to copy' : '+ Add Class'}</span></div> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><h3>{formData.id ? 'Edit Class' : 'Add Class'}</h3><button className="modal-close" onClick={closeModal}>x</button></div>
            <div className="schedule-modal-copy"><p>{formData.id ? 'Edit one existing slot.' : 'Choose one or several hours below to place the same class into all selected slots.'}</p></div>
            <form onSubmit={(event) => { event.preventDefault(); handleSave(); }}>
              <div className="form-grid">
                <div className="form-group"><label>Day</label><select value={formData.day} onChange={(event) => setFormData({ ...formData, day: event.target.value })} required>{days.map((day) => <option key={day} value={day}>{day}</option>)}</select></div>
                <div className="form-group"><label>{formData.id ? 'Time Slot' : 'Start Slot'}</label><select value={formData.time_slot} onChange={(event) => setFormData({ ...formData, time_slot: event.target.value })} required>{timeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></div>
                <div className="form-group"><label>Group</label><input list="schedule-groups" value={formData.group_name} onChange={(event) => setFormData({ ...formData, group_name: event.target.value })} readOnly={formData.audience_type === 'individual'} required /></div>
                <div className="form-group"><label>Audience</label><select value={formData.audience_type} onChange={(event) => setFormData((current) => ({ ...current, audience_type: event.target.value, subgroup_name: event.target.value === 'subgroup' ? current.subgroup_name : '', student_user_id: event.target.value === 'individual' ? current.student_user_id || selectedStudentId : '' }))}><option value="group">Whole group</option><option value="subgroup">Subgroup</option>{isAdmin && <option value="individual">Individual</option>}</select></div>
                {formData.audience_type === 'subgroup' && <div className="form-group"><label>Subgroup</label><input value={formData.subgroup_name} onChange={(event) => setFormData({ ...formData, subgroup_name: event.target.value })} placeholder="e.g. 1-Group" required /></div>}
                {formData.audience_type === 'individual' && <div className="form-group"><label>Student</label><select value={formData.student_user_id} onChange={(event) => handleStudentPick(event.target.value, true)} required><option value="" disabled>Choose a student</option>{studentOptions.map((student) => <option key={student.id} value={student.id}>{getStudentLabel(student)}</option>)}</select></div>}
                <div className="form-group"><label>Linked course</label><select value={formData.course_id} onChange={(event) => handleCoursePick(event.target.value)}><option value="">Standalone / manual</option>{courseOptions.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}</select></div>
                <div className="form-group"><label>Subject</label><input value={formData.subject} onChange={(event) => setFormData({ ...formData, subject: event.target.value })} required /></div>
                <div className="form-group"><label>Teacher</label><input value={formData.teacher} onChange={(event) => setFormData({ ...formData, teacher: event.target.value })} /></div>
                <div className="form-group"><label>Room</label><input value={formData.room} onChange={(event) => setFormData({ ...formData, room: event.target.value })} required /></div>
                {!formData.id && <div className="form-group form-group-wide"><label>Apply this class to several hours</label><div className="schedule-slot-picker">{timeSlots.map((slot) => <button key={slot} type="button" className={`schedule-slot-chip ${selectedTimeSlots.includes(slot) ? 'active' : ''}`} onClick={() => toggleTimeSlot(slot)}>{slot}</button>)}</div><p className="schedule-slot-hint">Selected: {selectedTimeSlots.length ? selectedTimeSlots.join(', ') : 'none'}</p></div>}
              </div>
              <datalist id="schedule-groups">{groupOptions.map((groupName) => <option key={groupName} value={groupName} />)}</datalist>
              <div className="form-actions">
                {formData.id && <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>}
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{formData.id ? 'Update' : `Create for ${selectedTimeSlots.length || 1} slot${selectedTimeSlots.length === 1 ? '' : 's'}`}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;
