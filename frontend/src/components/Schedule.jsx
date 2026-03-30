import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
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
const legacyTimeSlotMap = {
  '09:00': ['08:45-09:25', '09:30-10:10'],
  '10:30': ['10:15-10:55', '11:00-11:40'],
  '12:00': ['11:45-12:25', '12:30-13:10'],
  '13:30': ['13:10-13:55', '14:00-14:40'],
  '15:00': ['14:45-15:25', '15:30-16:10'],
  '16:30': ['16:15-16:55', '17:00-17:40']
};

const emptyForm = {
  id: null,
  day: '',
  time_slot: '',
  original_time_slot: '',
  legacy_slots: [],
  group_name: '',
  audience_type: 'group',
  subgroup_name: '',
  student_user_id: '',
  course_id: '',
  subject: '',
  teacher: '',
  room: ''
};
const emptyBatchForm = {
  course_id: '',
  subject: '',
  teacher: '',
  room: ''
};

const normalizeId = (value) => (value === '' || value === null || value === undefined ? '' : String(value));
const getRangeSlots = (startIndex, span = 1) => timeSlots.slice(startIndex, startIndex + span);
const getCourseTeacher = (course) => course?.teacher_name || course?.teacher || 'Teacher not assigned';
const getSlotStart = (slot) => String(slot || '').split('-')[0] || slot;
const scheduleCardPalette = [
  {
    bg: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(14, 165, 233, 0.28) 100%)',
    border: 'rgba(14, 165, 233, 0.42)',
    roomBg: 'rgba(2, 132, 199, 0.16)',
    roomText: '#0369a1'
  },
  {
    bg: 'linear-gradient(135deg, rgba(52, 211, 153, 0.16) 0%, rgba(16, 185, 129, 0.28) 100%)',
    border: 'rgba(16, 185, 129, 0.42)',
    roomBg: 'rgba(5, 150, 105, 0.16)',
    roomText: '#047857'
  },
  {
    bg: 'linear-gradient(135deg, rgba(167, 139, 250, 0.16) 0%, rgba(139, 92, 246, 0.28) 100%)',
    border: 'rgba(139, 92, 246, 0.42)',
    roomBg: 'rgba(124, 58, 237, 0.16)',
    roomText: '#6d28d9'
  },
  {
    bg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.16) 0%, rgba(245, 158, 11, 0.28) 100%)',
    border: 'rgba(245, 158, 11, 0.42)',
    roomBg: 'rgba(217, 119, 6, 0.16)',
    roomText: '#b45309'
  },
  {
    bg: 'linear-gradient(135deg, rgba(244, 114, 182, 0.16) 0%, rgba(236, 72, 153, 0.26) 100%)',
    border: 'rgba(236, 72, 153, 0.38)',
    roomBg: 'rgba(219, 39, 119, 0.14)',
    roomText: '#be185d'
  },
  {
    bg: 'linear-gradient(135deg, rgba(129, 140, 248, 0.16) 0%, rgba(99, 102, 241, 0.28) 100%)',
    border: 'rgba(99, 102, 241, 0.4)',
    roomBg: 'rgba(79, 70, 229, 0.14)',
    roomText: '#4338ca'
  }
];

const getScheduleCardTheme = (entry) => {
  const key = `${entry.course_id || ''}${entry.subject || ''}${entry.room || ''}`;
  const hash = key.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return scheduleCardPalette[hash % scheduleCardPalette.length];
};
const getScheduleCardStyle = (entry) => {
  const theme = getScheduleCardTheme(entry);
  return {
    '--schedule-card-bg': theme.bg,
    '--schedule-card-border': theme.border,
    '--schedule-room-bg': theme.roomBg,
    '--schedule-room-text': theme.roomText
  };
};

const normalizeDay = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const match = Object.entries(dayAliases).find(([, aliases]) => aliases.some((alias) => alias.toLowerCase() === normalized));
  return match ? match[0] : value;
};

const normalizeEntries = (entries) => (
  (entries || []).flatMap((item) => {
    const originalTimeSlot = String(item.time_slot || '').trim();
    const mappedSlots = legacyTimeSlotMap[originalTimeSlot]
      || (timeSlots.includes(originalTimeSlot) ? [originalTimeSlot] : [originalTimeSlot]);

    return mappedSlots.map((renderedSlot) => ({
      ...item,
      day: normalizeDay(item.day),
      time_slot: renderedSlot,
      original_time_slot: originalTimeSlot,
      legacy_slots: mappedSlots,
      student_user_id: item.student_user_id ?? '',
      course_id: item.course_id ?? ''
    }));
  })
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
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [showCustomGroupInput, setShowCustomGroupInput] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState({ type: '', message: '' });
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [showBatchEditor, setShowBatchEditor] = useState(false);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);

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
  const filteredSchedule = useMemo(() => (
    selectedCourseFilter
      ? visibleSchedule.filter((item) => String(item.course_id || '') === String(selectedCourseFilter))
      : visibleSchedule
  ), [selectedCourseFilter, visibleSchedule]);
  const overviewByDay = useMemo(() => (
    days
      .map((day) => ({
        day,
        items: filteredSchedule
          .filter((item) => item.day === day)
          .sort((left, right) => timeSlots.indexOf(left.time_slot) - timeSlots.indexOf(right.time_slot))
      }))
      .filter((section) => section.items.length > 0)
  ), [filteredSchedule]);

  const scheduleMap = useMemo(() => new Map(filteredSchedule.map((item) => [`${item.day}__${item.time_slot}`, item])), [filteredSchedule]);
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
        const entryIds = getRangeSlots(slotIndex, span)
          .map((slot) => scheduleMap.get(`${day}__${slot}`)?.id)
          .filter(Boolean);
        blocks.push({
          type: 'occupied',
          day,
          dayIndex,
          startIndex: slotIndex,
          span,
          startSlot: timeSlots[slotIndex],
          endSlot: timeSlots[slotIndex + span - 1],
          entry: current,
          entryIds
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
          api.getCourses(),
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

  useEffect(() => {
    if (!selectedCourseFilter) return;
    if (!filteredSchedule.some((item) => String(item.course_id || '') === String(selectedCourseFilter))) {
      const courseStillExists = courseOptions.some((item) => String(item.id) === String(selectedCourseFilter));
      if (!courseStillExists) {
        setSelectedCourseFilter('');
      }
    }
  }, [courseOptions, filteredSchedule, selectedCourseFilter]);

  useEffect(() => {
    setSelectedBatchIds((current) => current.filter((id) => filteredSchedule.some((item) => String(item.id) === String(id))));
  }, [filteredSchedule]);

  const reloadSchedule = async (nextGroup = selectedGroup) => {
    const entries = await loadSchedule();
    setSelectedBatchIds((current) => current.filter((id) => entries.some((item) => String(item.id) === String(id))));
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
    const student = students.find((item) => String(item.id) === String(studentId));
    if (student?.group_name) {
      setSelectedGroup(student.group_name);
      setShowCustomGroupInput(false);
    }
    if (!applyToForm) return;
    if (!student) return;
    setFormData((current) => ({
      ...current,
      student_user_id: String(student.id),
      group_name: student.group_name || current.group_name,
      subgroup_name: '',
      audience_type: 'individual'
    }));
  };

  const resetFilters = () => {
    if (isStudent) {
      setSelectedCourseFilter('');
      return;
    }

    setSelectedAudienceView('group');
    setSelectedSubgroup('');
    setSelectedCourseFilter('');
    setSelectedGroup(groupOptions[0] || '');
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

  const handleBatchCoursePick = (courseId) => {
    const course = courseOptions.find((item) => String(item.id) === String(courseId));
    setBatchForm((current) => ({
      ...current,
      course_id: courseId,
      subject: course ? course.name : current.subject,
      teacher: course ? getCourseTeacher(course) : current.teacher
    }));
  };

  const toggleBatchSelection = (entryIds = []) => {
    setSelectedBatchIds((current) => {
      const allSelected = entryIds.every((id) => current.includes(id));
      if (allSelected) {
        return current.filter((id) => !entryIds.includes(id));
      }

      return [...new Set([...current, ...entryIds])];
    });
  };

  const resetBatchEditor = () => {
    setShowBatchEditor(false);
    setBatchForm(emptyBatchForm);
  };

  const clearBatchSelection = () => {
    setSelectedBatchIds([]);
    resetBatchEditor();
  };

  const handleCellClick = (day, timeSlot) => {
    if (!canEdit) return;
    const existing = visibleSchedule.find((item) => item.day === day && item.time_slot === timeSlot);
    if (existing && batchSelectMode) {
      const linkedIds = filteredSchedule
        .filter((item) => item.day === day && item.subject === existing.subject && item.teacher === existing.teacher && item.room === existing.room && item.group_name === existing.group_name && (item.audience_type || 'group') === (existing.audience_type || 'group') && (item.subgroup_name || '') === (existing.subgroup_name || '') && String(item.student_user_id || '') === String(existing.student_user_id || '') && String(item.course_id || '') === String(existing.course_id || ''))
        .map((item) => item.id)
        .filter(Boolean);
      toggleBatchSelection(linkedIds.length ? linkedIds : [existing.id]);
      return;
    }
    if (!existing && selectedAudienceView === 'individual' && isAdmin && !selectedStudentId) {
      window.alert('Choose a student first to create an individual slot.');
      return;
    }
    if (existing) {
      setFormData({
        id: existing.id,
        day: existing.day,
        time_slot: existing.time_slot,
        original_time_slot: existing.original_time_slot || existing.time_slot,
        legacy_slots: Array.isArray(existing.legacy_slots) ? existing.legacy_slots : [existing.time_slot],
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
        original_time_slot: timeSlot,
        legacy_slots: [timeSlot],
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

  const handleBlockClick = (block) => {
    if (block.type === 'occupied' && batchSelectMode) {
      toggleBatchSelection(block.entryIds?.length ? block.entryIds : [block.entry.id]);
      return;
    }

    handleCellClick(block.day, block.startSlot);
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
        const legacySlots = Array.isArray(formData.legacy_slots) ? formData.legacy_slots : [];
        if (legacySlots.length > 1) {
          await api.deleteScheduleEntry(formData.id);
          await Promise.all(legacySlots.map((slot) => api.createScheduleEntry({ ...payload, time_slot: slot })));
        } else {
          await api.updateScheduleEntry(formData.id, payload);
        }
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

  const selectedBatchEntries = useMemo(
    () => filteredSchedule.filter((item) => selectedBatchIds.includes(item.id)),
    [filteredSchedule, selectedBatchIds]
  );
  const selectedBatchSummary = useMemo(() => {
    const groups = new Set(selectedBatchEntries.map((item) => item.group_name).filter(Boolean));
    const coursesInSelection = new Set(selectedBatchEntries.map((item) => item.course_id).filter(Boolean));
    return {
      count: selectedBatchEntries.length,
      groups: groups.size,
      courses: coursesInSelection.size
    };
  }, [selectedBatchEntries]);

  const openBatchEditor = () => {
    if (!selectedBatchEntries.length) return;
    const [firstEntry] = selectedBatchEntries;
    setBatchForm({
      course_id: normalizeId(firstEntry.course_id),
      subject: '',
      teacher: '',
      room: ''
    });
    setShowBatchEditor(true);
  };

  const handleBatchSave = async () => {
    if (!selectedBatchEntries.length) return;

    try {
      await Promise.all(selectedBatchEntries.map((entry) => {
        const nextCourseId = batchForm.course_id ? Number(batchForm.course_id) : entry.course_id || null;
        return api.updateScheduleEntry(entry.id, {
          day: entry.day,
          time_slot: entry.original_time_slot || entry.time_slot,
          group_name: entry.group_name,
          audience_type: entry.audience_type || 'group',
          subgroup_name: entry.subgroup_name || null,
          student_user_id: entry.student_user_id || null,
          course_id: nextCourseId,
          subject: batchForm.subject.trim() || entry.subject,
          teacher: batchForm.teacher.trim() || entry.teacher || '',
          room: batchForm.room.trim() || entry.room || ''
        });
      }));

      await reloadSchedule(selectedGroup);
      setCopyFeedback({ type: 'success', message: `Updated ${selectedBatchEntries.length} selected slot${selectedBatchEntries.length === 1 ? '' : 's'}.` });
      clearBatchSelection();
    } catch (batchError) {
      window.alert(batchError.message || 'Failed to update selected schedule entries.');
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedBatchEntries.length) return;

    try {
      await Promise.all(selectedBatchEntries.map((entry) => api.deleteScheduleEntry(entry.id)));
      await reloadSchedule(selectedGroup);
      setCopyFeedback({ type: 'success', message: `Deleted ${selectedBatchEntries.length} selected slot${selectedBatchEntries.length === 1 ? '' : 's'}.` });
      clearBatchSelection();
    } catch (batchError) {
      window.alert(batchError.message || 'Failed to delete selected schedule entries.');
    }
  };

  const totalEntries = schedule.length;
  const usesCustomGroup = showCustomGroupInput || (!!selectedGroup && !groupOptions.includes(selectedGroup));
  const selectedStudent = studentOptions.find((item) => String(item.id) === String(selectedStudentId));
  const visibleEntryCount = filteredSchedule.length;
  const currentScopeLabel = isStudent
    ? `${studentGroup || 'Not set'}${studentSubgroup ? ` / ${studentSubgroup}` : ''}`
    : (selectedAudienceView === 'individual'
      ? (selectedStudent ? getStudentLabel(selectedStudent) : 'Choose a student')
      : (selectedAudienceView === 'subgroup'
        ? `${selectedGroup || 'Choose group'}${selectedSubgroup ? ` / ${selectedSubgroup}` : ''}`
        : (selectedGroup || 'Choose group')));
  const needsSubgroup = canEdit && selectedAudienceView === 'subgroup' && !selectedSubgroup;
  const needsStudent = canEdit && selectedAudienceView === 'individual' && !selectedStudentId;
  const needsGroup = !visibleSchedule.length && !selectedGroup && canEdit && selectedAudienceView !== 'individual';
  const hasCourseFilter = Boolean(selectedCourseFilter);
  const filterClearedViewEmpty = hasCourseFilter && filteredSchedule.length === 0;

  if (loading) {
    return <div className="page"><div className="page-header"><h1>Schedule</h1><p>Loading your timetable...</p></div><div className="loading-spinner"></div></div>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Schedule</h1>
            <p>CampusOS could not load the active timetable view.</p>
          </div>
        </div>
        <StatusBanner tone="error" title="Schedule unavailable" message={error} />
      </div>
    );
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
        {canEdit && <div className="page-actions"><p className="edit-hint">Pick a scope, click any cell to edit it, drag a class onto an empty slot to copy it, or switch on batch mode for mass updates.</p></div>}
      </div>

      <div className="schedule-admin-bar">
        <div className="schedule-admin-card"><span className="management-summary-label">Lessons loaded</span><strong>{totalEntries}</strong></div>
        <div className="schedule-admin-card"><span className="management-summary-label">Visible in view</span><strong>{visibleEntryCount}</strong></div>
        <div className="schedule-admin-card"><span className="management-summary-label">Groups</span><strong>{groupOptions.length}</strong></div>
        <div className="schedule-admin-card">
          <span className="management-summary-label">Current scope</span>
          <strong>{currentScopeLabel}</strong>
        </div>
        <div className="schedule-admin-card schedule-admin-legend">
          <span className="schedule-legend-item"><span className="schedule-dot occupied"></span> Existing class</span>
          <span className="schedule-legend-item"><span className="schedule-dot empty"></span> Empty slot</span>
          {canEdit && <span className="schedule-legend-item"><span className="schedule-dot editable"></span> Click to manage or drag to copy</span>}
        </div>
      </div>

      {canEdit && (
        <div className="schedule-batch-toolbar">
          <div className="schedule-batch-copy">
            <strong>Batch workflow</strong>
            <span>
              {selectedBatchEntries.length
                ? `${selectedBatchSummary.count} slot${selectedBatchSummary.count === 1 ? '' : 's'} selected across ${selectedBatchSummary.groups} group${selectedBatchSummary.groups === 1 ? '' : 's'}.`
                : 'Turn on batch mode and click occupied slots to queue them for a shared update.'}
            </span>
          </div>
          <div className="schedule-batch-actions">
            <button
              type="button"
              className={`management-filter-chip ${batchSelectMode ? 'active' : ''}`}
              onClick={() => setBatchSelectMode((value) => !value)}
            >
              {batchSelectMode ? 'Exit batch mode' : 'Batch select'}
            </button>
            <button
              type="button"
              className="management-filter-chip"
              onClick={() => setSelectedBatchIds(Array.from(new Set(filteredSchedule.map((item) => item.id).filter(Boolean))))}
              disabled={!filteredSchedule.length}
            >
              Select visible
            </button>
            <button
              type="button"
              className="management-filter-chip"
              onClick={openBatchEditor}
              disabled={!selectedBatchEntries.length}
            >
              Batch edit
            </button>
            <button
              type="button"
              className="management-filter-chip"
              onClick={handleBatchDelete}
              disabled={!selectedBatchEntries.length}
            >
              Delete selected
            </button>
            <button
              type="button"
              className="management-filter-chip"
              onClick={clearBatchSelection}
              disabled={!selectedBatchEntries.length && !showBatchEditor}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <StatusBanner
        tone={copyFeedback.type === 'error' ? 'error' : 'success'}
        title={copyFeedback.type === 'error' ? 'Schedule update blocked' : 'Schedule updated'}
        message={copyFeedback.message}
      />

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

            <div className="schedule-group-field">
              <span className="management-summary-label">Course filter</span>
              <div className="schedule-group-select-row">
                <select className="schedule-group-select" value={selectedCourseFilter} onChange={(event) => setSelectedCourseFilter(event.target.value)}>
                  <option value="">All linked courses</option>
                  {courseOptions.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
                </select>
                <button type="button" className="management-filter-chip" onClick={resetFilters}>Reset view</button>
              </div>
            </div>
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
          <div className="schedule-group-field">
            <span className="management-summary-label">Course filter</span>
            <div className="schedule-group-select-row">
              <select className="schedule-group-select" value={selectedCourseFilter} onChange={(event) => setSelectedCourseFilter(event.target.value)}>
                <option value="">All linked courses</option>
                {courseOptions.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
              </select>
              <button type="button" className="management-filter-chip" onClick={resetFilters}>Reset</button>
            </div>
          </div>
          <p className="schedule-group-hint">Students see a personal timetable built from selected subjects, group classes, subgroup classes, and manual personal slots.</p>
        </div>
      )}

      {overviewByDay.length > 0 && (
        <div className="schedule-overview-strip">
          {overviewByDay.map((section) => (
            <div key={section.day} className="schedule-overview-card">
              <div className="schedule-overview-head">
                <strong>{section.day}</strong>
                <span>{section.items.length} class{section.items.length === 1 ? '' : 'es'}</span>
              </div>
              <div className="schedule-overview-body">
                {section.items.slice(0, 4).map((item) => {
                  const overviewStyle = getScheduleCardStyle(item);

                  return canEdit ? (
                    <button
                      key={`${item.id}-${item.time_slot}`}
                      type="button"
                      className="schedule-overview-item"
                      style={overviewStyle}
                      onClick={() => handleCellClick(item.day, item.time_slot)}
                    >
                      <span>{getSlotStart(item.time_slot)}</span>
                      <strong>{item.subject}</strong>
                      <small>{item.room || 'Room TBD'}</small>
                    </button>
                  ) : (
                    <div key={`${item.id}-${item.time_slot}`} className="schedule-overview-item" style={overviewStyle}>
                      <span>{getSlotStart(item.time_slot)}</span>
                      <strong>{item.subject}</strong>
                      <small>{item.room || 'Room TBD'}</small>
                    </div>
                  );
                })}
                {section.items.length > 4 && <div className="schedule-overview-more">+{section.items.length - 4} more</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {needsSubgroup ? (
        <EmptyState
          eyebrow="Schedule scope"
          title="Choose a subgroup to continue"
          description="Subgroup mode only edits one subgroup at a time. Pick it above or type a new subgroup name."
          compact
          className="schedule-empty-state"
        />
      ) : needsStudent ? (
        <EmptyState
          eyebrow="Schedule scope"
          title="Choose a student to continue"
          description="Individual mode opens a personal timetable for exactly one student."
          compact
          className="schedule-empty-state"
        />
      ) : needsGroup ? (
        <EmptyState
          eyebrow="Schedule scope"
          title="Choose a group to start building the schedule"
          description="Select an existing group or type a new group name above to open the timetable grid."
          compact
          className="schedule-empty-state"
        />
      ) : filterClearedViewEmpty ? (
        <EmptyState
          eyebrow="Course filter"
          title="No lessons match the current course filter"
          description="Reset the course filter to reopen the full timetable for the current scope."
          actionLabel="Reset course filter"
          onAction={() => setSelectedCourseFilter('')}
          compact
          className="schedule-empty-state"
        />
      ) : (
        <div className="schedule-grid">
          <div className="schedule-grid-board" style={{ gridTemplateColumns: '76px repeat(6, minmax(122px, 1fr))', gridTemplateRows: `52px repeat(${timeSlots.length}, 56px)` }}>
            <div className="schedule-board-corner"></div>
            {days.map((day, index) => <div key={day} className="day-column schedule-grid-day" style={{ gridColumn: index + 2, gridRow: 1 }}>{day}</div>)}
            {timeSlots.map((slot, index) => <div key={slot} className="time-column schedule-grid-time" style={{ gridColumn: 1, gridRow: index + 2 }}>{getSlotStart(slot)}</div>)}
            {mergedBlocks.map((block) => (
              <div
                key={`${block.day}-${block.startSlot}-${block.type}`}
                className={`schedule-cell schedule-grid-item ${block.type === 'occupied' ? 'occupied merged-block' : 'empty'} ${canEdit ? 'editable' : ''} ${block.type === 'occupied' && block.entryIds?.some((id) => selectedBatchIds.includes(id)) ? 'batch-selected' : ''} ${draggedBlock?.day === block.day && draggedBlock?.startSlot === block.startSlot ? 'drag-source' : ''} ${dropTarget?.day === block.day && dropTarget?.startSlot === block.startSlot ? 'drop-target' : ''}`}
                style={{
                  gridColumn: block.dayIndex + 2,
                  gridRow: `${block.startIndex + 2} / span ${block.span}`,
                  ...(block.type === 'occupied' ? getScheduleCardStyle(block.entry) : {})
                }}
                onClick={() => handleBlockClick(block)}
                draggable={canEdit && !batchSelectMode && block.type === 'occupied'}
                onDragStart={block.type === 'occupied' && !batchSelectMode ? handleDragStart(block) : undefined}
                onDragEnd={block.type === 'occupied' && !batchSelectMode ? handleDragEnd : undefined}
                onDragOver={canEdit && !batchSelectMode ? handleDragOver(block) : undefined}
                onDragLeave={canEdit && !batchSelectMode ? handleDragLeave(block) : undefined}
                onDrop={canEdit && !batchSelectMode ? handleDrop(block) : undefined}
              >
                {block.type === 'occupied' ? (
                  <div className="class-info">
                    <div className="class-subject">{block.entry.subject}</div>
                    <div className="class-room-chip">{block.entry.room || 'Room TBD'}</div>
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

      {showBatchEditor && (
        <div className="modal-overlay" onClick={clearBatchSelection}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Batch Edit Schedule</h3>
              <button className="modal-close" onClick={clearBatchSelection}>x</button>
            </div>
            <div className="schedule-modal-copy">
              <p>Update shared fields for the currently selected schedule slots. Leave a field blank to keep the existing value.</p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); handleBatchSave(); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Linked course</label>
                  <select value={batchForm.course_id} onChange={(event) => handleBatchCoursePick(event.target.value)}>
                    <option value="">Keep each current course</option>
                    {courseOptions.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject override</label>
                  <input value={batchForm.subject} onChange={(event) => setBatchForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Keep current subject if empty" />
                </div>
                <div className="form-group">
                  <label>Teacher override</label>
                  <input value={batchForm.teacher} onChange={(event) => setBatchForm((current) => ({ ...current, teacher: event.target.value }))} placeholder="Keep current teacher if empty" />
                </div>
                <div className="form-group">
                  <label>Room override</label>
                  <input value={batchForm.room} onChange={(event) => setBatchForm((current) => ({ ...current, room: event.target.value }))} placeholder="Keep current room if empty" />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={clearBatchSelection}>Cancel</button>
                <button type="submit" className="btn-primary">Update {selectedBatchEntries.length} slot{selectedBatchEntries.length === 1 ? '' : 's'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;
