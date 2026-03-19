import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const timeSlots = [
  '08:00-08:40',
  '08:45-09:25',
  '09:30-10:10',
  '10:15-10:55',
  '11:00-11:40',
  '11:45-12:25',
  '12:30-13:10',
  '13:10-13:55',
  '14:00-14:40',
  '14:45-15:25',
  '15:30-16:10',
  '16:15-16:55',
  '17:00-17:40',
  '17:45-18:25'
];

const emptyForm = {
  id: null,
  day: '',
  time_slot: '',
  group_name: '',
  audience_type: 'group',
  subgroup_name: '',
  student_user_id: '',
  subject: '',
  teacher: '',
  room: ''
};

function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedAudienceView, setSelectedAudienceView] = useState('group');
  const [selectedSubgroup, setSelectedSubgroup] = useState('');
  const [showCustomGroupInput, setShowCustomGroupInput] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);

  const canEdit = user && (user.role === 'admin' || user.role === 'teacher');
  const studentGroup = user?.group_name || user?.group || '';
  const studentSubgroup = user?.subgroup_name || user?.subgroup || '';

  const groupOptions = useMemo(() => {
    const groups = new Set(
      schedule
        .map((item) => item.group_name)
        .filter((value) => value && value !== 'INDIVIDUAL')
    );
    if (studentGroup) {
      groups.add(studentGroup);
    }
    return Array.from(groups).sort((left, right) => left.localeCompare(right));
  }, [schedule, studentGroup]);

  const subgroupOptions = useMemo(() => {
    if (!selectedGroup) {
      return [];
    }

    const subgroups = new Set(
      schedule
        .filter((item) => item.group_name === selectedGroup && (item.audience_type || 'group') === 'subgroup')
        .map((item) => item.subgroup_name)
        .filter(Boolean)
    );

    if (studentGroup === selectedGroup && studentSubgroup) {
      subgroups.add(studentSubgroup);
    }

    return Array.from(subgroups).sort((left, right) => left.localeCompare(right));
  }, [schedule, selectedGroup, studentGroup, studentSubgroup]);

  const visibleSchedule = useMemo(() => {
    if (user?.role === 'student') {
      return schedule;
    }

    if (!selectedGroup) {
      return [];
    }

    return schedule.filter((item) => {
      if (item.group_name !== selectedGroup) {
        return false;
      }

      const audienceType = item.audience_type || 'group';

      if (selectedAudienceView === 'subgroup') {
        return audienceType === 'subgroup' && item.subgroup_name === selectedSubgroup;
      }

      return audienceType === 'group';
    });
  }, [schedule, selectedAudienceView, selectedGroup, selectedSubgroup, user?.role]);
  const scheduleMap = useMemo(() => {
    return new Map(
      visibleSchedule.map((item) => [`${item.day}__${item.time_slot}`, item])
    );
  }, [visibleSchedule]);

  const totalEntries = schedule.length;
  const groupsCount = groupOptions.length;
  const usesCustomGroup = showCustomGroupInput || (!!selectedGroup && !groupOptions.includes(selectedGroup));
  const mergedBlocks = useMemo(() => {
    const getSignature = (item) => [item.subject, item.teacher, item.room, item.group_name].join('||');
    const blocks = [];

    days.forEach((day, dayIndex) => {
      let slotIndex = 0;

      while (slotIndex < timeSlots.length) {
        const timeSlot = timeSlots[slotIndex];
        const current = scheduleMap.get(`${day}__${timeSlot}`);

        if (!current) {
          blocks.push({
            type: 'empty',
            day,
            dayIndex,
            startIndex: slotIndex,
            span: 1,
            startSlot: timeSlot
          });
          slotIndex += 1;
          continue;
        }

        const signature = getSignature(current);
        let span = 1;

        while (slotIndex + span < timeSlots.length) {
          const nextSlot = timeSlots[slotIndex + span];
          const next = scheduleMap.get(`${day}__${nextSlot}`);

          if (!next || getSignature(next) !== signature) {
            break;
          }

          span += 1;
        }

        blocks.push({
          type: 'occupied',
          day,
          dayIndex,
          startIndex: slotIndex,
          span,
          startSlot: timeSlot,
          endSlot: timeSlots[slotIndex + span - 1],
          entry: current
        });

        slotIndex += span;
      }
    });

    return blocks;
  }, [scheduleMap]);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('lms_user'));
    setUser(savedUser);
  }, []);

  useEffect(() => {
    if (user?.role === 'student' || selectedAudienceView !== 'subgroup') {
      return;
    }

    if (!subgroupOptions.length) {
      setSelectedSubgroup('');
      return;
    }

    if (!subgroupOptions.includes(selectedSubgroup)) {
      setSelectedSubgroup(subgroupOptions[0]);
    }
  }, [selectedAudienceView, selectedSubgroup, subgroupOptions, user?.role]);

  useEffect(() => {
    if (!user) return;

    const loadSchedule = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.getSchedule();
        const entries = response.schedule || [];
        setSchedule(entries);

        if (user.role === 'student') {
          setSelectedGroup(user.group_name || user.group || '');
          return;
        }

        const knownGroups = Array.from(
          new Set(entries.map((item) => item.group_name).filter((value) => value && value !== 'INDIVIDUAL'))
        ).sort((left, right) => left.localeCompare(right));
        setSelectedGroup((current) => current || knownGroups[0] || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [user]);

  const reloadSchedule = async (nextGroup = selectedGroup) => {
    const response = await api.getSchedule();
    const entries = response.schedule || [];
    setSchedule(entries);

    if (user?.role === 'student') {
      setSelectedGroup(studentGroup);
      return;
    }

    const knownGroups = Array.from(
      new Set(entries.map((item) => item.group_name).filter((value) => value && value !== 'INDIVIDUAL'))
    ).sort((left, right) => left.localeCompare(right));
    if (nextGroup && knownGroups.includes(nextGroup)) {
      setSelectedGroup(nextGroup);
      return;
    }

    setSelectedGroup(knownGroups[0] || nextGroup || '');
  };

  const handleGroupChange = (groupName) => {
    setSelectedGroup(groupName);
    setShowCustomGroupInput(false);
  };

  const handleCreateGroupMode = () => {
    setSelectedGroup('');
    setShowCustomGroupInput(true);
  };

  const handleCellClick = (day, timeSlot) => {
    if (!canEdit) return;

    const existingClass = visibleSchedule.find((item) => item.day === day && item.time_slot === timeSlot);

    if (existingClass) {
      setFormData({
        id: existingClass.id,
        day: existingClass.day,
        time_slot: existingClass.time_slot,
        group_name: existingClass.group_name,
        audience_type: existingClass.audience_type || 'group',
        subgroup_name: existingClass.subgroup_name || '',
        student_user_id: existingClass.student_user_id || '',
        subject: existingClass.subject,
        teacher: existingClass.teacher,
        room: existingClass.room
      });
      setSelectedTimeSlots([existingClass.time_slot]);
    } else {
      setFormData({
        id: null,
        day,
        time_slot: timeSlot,
        group_name: user?.role === 'student' ? studentGroup : selectedGroup,
        audience_type: selectedAudienceView,
        subgroup_name: selectedAudienceView === 'subgroup' ? selectedSubgroup : '',
        student_user_id: '',
        subject: '',
        teacher: user?.role === 'teacher' ? user.name : '',
        room: ''
      });
      setSelectedTimeSlots([timeSlot]);
    }

    setShowEditForm(true);
  };

  const closeModal = () => {
    setShowEditForm(false);
    setFormData(emptyForm);
    setSelectedTimeSlots([]);
  };

  const toggleTimeSlot = (slot) => {
    setSelectedTimeSlots((current) => {
      if (current.includes(slot)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((value) => value !== slot);
      }

      return [...current, slot].sort((left, right) => timeSlots.indexOf(left) - timeSlots.indexOf(right));
    });
  };

  const handleSave = async () => {
    try {
      const normalizedGroup = formData.group_name.trim();
      const normalizedAudienceType = formData.audience_type || 'group';
      const normalizedSubgroup = normalizedAudienceType === 'subgroup' ? formData.subgroup_name.trim() : '';
      const slotsToSave = formData.id ? [formData.time_slot] : selectedTimeSlots;

      if (!normalizedGroup) {
        alert('Please enter a group name');
        return;
      }

      if (normalizedAudienceType === 'subgroup' && !normalizedSubgroup) {
        alert('Please enter a subgroup name');
        return;
      }

      if (!slotsToSave.length) {
        alert('Please choose at least one time slot');
        return;
      }

      const conflictingSlots = slotsToSave.filter((slot) => (
        schedule.some((item) => (
          item.day === formData.day
          && item.group_name === normalizedGroup
          && item.time_slot === slot
          && (item.audience_type || 'group') === normalizedAudienceType
          && (
            normalizedAudienceType !== 'subgroup'
            || (item.subgroup_name || '') === normalizedSubgroup
          )
          && item.id !== formData.id
        ))
      ));

      if (conflictingSlots.length) {
        alert(`These slots already have classes for ${normalizedGroup}: ${conflictingSlots.join(', ')}`);
        return;
      }

      if (formData.id) {
        await api.updateScheduleEntry(formData.id, {
          ...formData,
          group_name: normalizedGroup,
          audience_type: normalizedAudienceType,
          subgroup_name: normalizedSubgroup || null
        });
      } else {
        await Promise.all(
          slotsToSave.map((slot) => api.createScheduleEntry({
            ...formData,
            time_slot: slot,
            group_name: normalizedGroup,
            audience_type: normalizedAudienceType,
            subgroup_name: normalizedSubgroup || null
          }))
        );
      }

      await reloadSchedule(normalizedGroup);
      closeModal();
    } catch (err) {
      console.error('Failed to save schedule entry:', err);
      alert(err.message || 'Failed to save schedule entry');
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;

    try {
      await api.deleteScheduleEntry(formData.id);
      await reloadSchedule(formData.group_name.trim());
      closeModal();
    } catch (err) {
      console.error('Failed to delete schedule entry:', err);
      alert(err.message || 'Failed to delete schedule entry');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Schedule</h1>
          <p>Loading your timetable...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Schedule</h1>
          <p>Error loading schedule: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Schedule</h1>
          <p>{user?.role === 'student' ? `Weekly timetable for ${studentGroup || 'your group'}${studentSubgroup ? ` / ${studentSubgroup}` : ''}` : 'Manage timetable group by group'}</p>
        </div>
        {canEdit && (
          <div className="page-actions">
            <p className="edit-hint">Pick a group, then click any cell to add or edit classes</p>
          </div>
        )}
      </div>

      <div className="schedule-admin-bar">
        <div className="schedule-admin-card">
          <span className="management-summary-label">Lessons loaded</span>
          <strong>{totalEntries}</strong>
        </div>
        <div className="schedule-admin-card">
          <span className="management-summary-label">Groups</span>
          <strong>{groupsCount}</strong>
        </div>
        <div className="schedule-admin-card">
          <span className="management-summary-label">Current group</span>
          <strong>
            {user?.role === 'student'
              ? `${studentGroup || 'Not set'}${studentSubgroup ? ` / ${studentSubgroup}` : ''}`
              : (selectedGroup || 'Choose group')}
          </strong>
        </div>
        <div className="schedule-admin-card schedule-admin-legend">
          <span className="schedule-legend-item"><span className="schedule-dot occupied"></span> Existing class</span>
          <span className="schedule-legend-item"><span className="schedule-dot empty"></span> Empty slot</span>
          {canEdit && <span className="schedule-legend-item"><span className="schedule-dot editable"></span> Click to manage</span>}
        </div>
      </div>

      {canEdit ? (
        <div className="management-toolbar schedule-group-toolbar">
          <div className="schedule-group-switcher">
            <div className="schedule-group-field">
              <span className="management-summary-label">Group schedule</span>
              <div className="schedule-group-select-row">
                <select
                  className="schedule-group-select"
                  value={groupOptions.includes(selectedGroup) ? selectedGroup : ''}
                  onChange={(event) => handleGroupChange(event.target.value)}
                >
                  <option value="" disabled>{groupOptions.length ? 'Choose a group' : 'No groups yet'}</option>
                  {groupOptions.map((groupName) => (
                    <option key={groupName} value={groupName}>{groupName}</option>
                  ))}
                </select>
                <button type="button" className="management-filter-chip" onClick={handleCreateGroupMode}>
                  + New group
                </button>
              </div>

              {usesCustomGroup && (
                <input
                  value={selectedGroup}
                  onChange={(event) => setSelectedGroup(event.target.value)}
                  placeholder="For example CYB-23"
                />
              )}
            </div>

            {groupOptions.length > 0 && (
              <div className="management-filters schedule-group-chips">
                {groupOptions.map((groupName) => (
                  <button
                    key={groupName}
                    type="button"
                    className={`management-filter-chip ${selectedGroup === groupName ? 'active' : ''}`}
                    onClick={() => handleGroupChange(groupName)}
                  >
                    {groupName}
                  </button>
                ))}
              </div>
            )}

            <div className="management-filters schedule-group-chips">
              <button
                type="button"
                className={`management-filter-chip ${selectedAudienceView === 'group' ? 'active' : ''}`}
                onClick={() => setSelectedAudienceView('group')}
              >
                Whole group
              </button>
              <button
                type="button"
                className={`management-filter-chip ${selectedAudienceView === 'subgroup' ? 'active' : ''}`}
                onClick={() => setSelectedAudienceView('subgroup')}
              >
                Subgroup
              </button>
            </div>

            {selectedAudienceView === 'subgroup' && (
              <div className="schedule-group-field">
                <span className="management-summary-label">Subgroup schedule</span>
                <div className="schedule-group-select-row">
                  <select
                    className="schedule-group-select"
                    value={subgroupOptions.includes(selectedSubgroup) ? selectedSubgroup : ''}
                    onChange={(event) => setSelectedSubgroup(event.target.value)}
                  >
                    <option value="" disabled>
                      {subgroupOptions.length ? 'Choose a subgroup' : 'No subgroups yet'}
                    </option>
                    {subgroupOptions.map((subgroupName) => (
                      <option key={subgroupName} value={subgroupName}>{subgroupName}</option>
                    ))}
                  </select>
                  <input
                    value={selectedSubgroup}
                    onChange={(event) => setSelectedSubgroup(event.target.value)}
                    placeholder="For example 1-Group"
                  />
                </div>
              </div>
            )}
          </div>
          <p className="schedule-group-hint">
            {selectedAudienceView === 'subgroup'
              ? 'Subgroup mode edits only the selected subgroup inside the current base group.'
              : 'Whole group mode edits classes shared by every student in the selected group.'}
          </p>
        </div>
      ) : (
        <div className="management-toolbar schedule-group-toolbar">
          <div className="schedule-group-field">
            <span className="management-summary-label">Your timetable source</span>
            <input value={`${studentGroup}${studentSubgroup ? ` / ${studentSubgroup}` : ''}`} readOnly />
          </div>
          <p className="schedule-group-hint">
            Students see a personal timetable built from their group classes and subgroup classes.
          </p>
        </div>
      )}

      {canEdit && selectedAudienceView === 'subgroup' && !selectedSubgroup ? (
        <div className="lms-empty">
          Choose or type a subgroup above to start building its subgroup schedule.
        </div>
      ) : !visibleSchedule.length && !selectedGroup && canEdit ? (
        <div className="lms-empty">
          Choose or type a group name above to start building its schedule.
        </div>
      ) : (
        <div className="schedule-grid">
          <div
            className="schedule-grid-board"
            style={{
              gridTemplateColumns: '80px repeat(6, minmax(150px, 1fr))',
              gridTemplateRows: `52px repeat(${timeSlots.length}, 56px)`
            }}
          >
            <div className="schedule-board-corner"></div>

            {days.map((day, index) => (
              <div
                key={day}
                className="day-column schedule-grid-day"
                style={{ gridColumn: index + 2, gridRow: 1 }}
              >
                {day}
              </div>
            ))}

            {timeSlots.map((timeSlot, index) => (
              <div
                key={timeSlot}
                className="time-column schedule-grid-time"
                style={{ gridColumn: 1, gridRow: index + 2 }}
              >
                {timeSlot}
              </div>
            ))}

            {mergedBlocks.map((block) => (
              <div
                key={`${block.day}-${block.startSlot}-${block.type}`}
                className={`schedule-cell schedule-grid-item ${block.type === 'occupied' ? 'occupied merged-block' : 'empty'} ${canEdit ? 'editable' : ''}`}
                style={{
                  gridColumn: block.dayIndex + 2,
                  gridRow: `${block.startIndex + 2} / span ${block.span}`
                }}
                onClick={() => handleCellClick(block.day, block.startSlot)}
              >
                {block.type === 'occupied' ? (
                  <div className="class-info">
                    <div className="class-subject">{block.entry.subject}</div>
                    <div className="class-teacher">{block.entry.teacher}</div>
                    <div className="class-room">Room: {block.entry.room}</div>
                    <div className="class-group">
                      Group: {block.entry.group_name}
                      {block.entry.subgroup_name ? ` / ${block.entry.subgroup_name}` : ''}
                    </div>
                    {block.span > 1 && (
                      <div className="class-duration">{block.span} slots · {block.startSlot} to {block.endSlot}</div>
                    )}
                  </div>
                ) : canEdit ? (
                  <div className="empty-slot">
                    <span>+ Add Class</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{formData.id ? 'Edit Class' : 'Add Class'}</h3>
              <button className="modal-close" onClick={closeModal}>x</button>
            </div>
            <div className="schedule-modal-copy">
              <p>
                {formData.id
                  ? 'Edit one existing slot.'
                  : 'Choose one or several hours below to place the same class into all selected slots.'}
              </p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); handleSave(); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Day</label>
                  <select value={formData.day} onChange={(event) => setFormData({ ...formData, day: event.target.value })} required>
                    {days.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{formData.id ? 'Time Slot' : 'Start Slot'}</label>
                  <select value={formData.time_slot} onChange={(event) => setFormData({ ...formData, time_slot: event.target.value })} required>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Group</label>
                  <input
                    list="schedule-groups"
                    type="text"
                    value={formData.group_name}
                    onChange={(event) => setFormData({ ...formData, group_name: event.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Audience</label>
                  <select
                    value={formData.audience_type}
                    onChange={(event) => setFormData({
                      ...formData,
                      audience_type: event.target.value,
                      subgroup_name: event.target.value === 'subgroup' ? formData.subgroup_name : ''
                    })}
                  >
                    <option value="group">Whole group</option>
                    <option value="subgroup">Subgroup</option>
                  </select>
                </div>
                {formData.audience_type === 'subgroup' && (
                  <div className="form-group">
                    <label>Subgroup</label>
                    <input
                      type="text"
                      value={formData.subgroup_name}
                      onChange={(event) => setFormData({ ...formData, subgroup_name: event.target.value })}
                      placeholder="e.g. 1-Group"
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Subject</label>
                  <input type="text" value={formData.subject} onChange={(event) => setFormData({ ...formData, subject: event.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Teacher</label>
                  <input type="text" value={formData.teacher} onChange={(event) => setFormData({ ...formData, teacher: event.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Room</label>
                  <input type="text" value={formData.room} onChange={(event) => setFormData({ ...formData, room: event.target.value })} required />
                </div>
                {!formData.id && (
                  <div className="form-group form-group-wide">
                    <label>Apply this class to several hours</label>
                    <div className="schedule-slot-picker">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`schedule-slot-chip ${selectedTimeSlots.includes(slot) ? 'active' : ''}`}
                          onClick={() => toggleTimeSlot(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    <p className="schedule-slot-hint">
                      Selected: {selectedTimeSlots.length ? selectedTimeSlots.join(', ') : 'none'}
                    </p>
                  </div>
                )}
              </div>
              <datalist id="schedule-groups">
                {groupOptions.map((groupName) => (
                  <option key={groupName} value={groupName} />
                ))}
              </datalist>
              <div className="form-actions">
                {formData.id && (
                  <button type="button" className="btn-danger" onClick={handleDelete}>
                    Delete
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {formData.id ? 'Update' : `Create for ${selectedTimeSlots.length || 1} slot${selectedTimeSlots.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;
