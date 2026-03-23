import { useState, useRef } from 'react';
import './ScheduleManager.css';

const ROOMS = [
  'B101','B102','B103','B104','B105','B106','B107',
  'B109 (Apple Lab)','B110','B111 Lab','B113',
  'B201','B202','B203','B204','B205',
  'BIGLAB','LAB3 (210)','LAB4 (211)','LAB4 (213)',
  'C006','C006A','309',
];

const GROUPS = ['COMSE-24','COMCEH-24','COMFCI-24','COMSE-25','COMCEH-25','COMFCI-25'];
const WEEKDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const TIME_SLOTS = [
  { id:'1',     label:'1st Hour',  time:'08:00-08:40', type:'class' },
  { id:'2',     label:'2nd Hour',  time:'08:45-09:25', type:'class' },
  { id:'3',     label:'3rd Hour',  time:'09:30-10:10', type:'class' },
  { id:'4',     label:'4th Hour',  time:'10:15-10:55', type:'class' },
  { id:'5',     label:'5th Hour',  time:'11:00-11:40', type:'class' },
  { id:'6',     label:'6th Hour',  time:'11:45-12:25', type:'class' },
  { id:'lunch', label:'Lunch',     time:'12:30-13:10', type:'lunch' },
  { id:'7',     label:'7th Hour',  time:'13:15-13:55', type:'class' },
  { id:'8',     label:'8th Hour',  time:'14:00-14:40', type:'class' },
  { id:'9',     label:'9th Hour',  time:'14:45-15:25', type:'class' },
  { id:'10',    label:'10th Hour', time:'15:30-16:10', type:'class' },
  { id:'11',    label:'11th Hour', time:'16:15-16:55', type:'class' },
  { id:'12',    label:'12th Hour', time:'17:00-17:40', type:'class' },
  { id:'13',    label:'13th Hour', time:'17:45-18:25', type:'class' },
];

const ELECTIVES = [
  // COMCEH-24 / COMSE-24 / COMFCI-24 group
  { id:'e1', name:'Kyrgyz Language for Foreign Students',       teacher:'Ms. Saidalieva',          room:'B106',       color:'#6366f1', groups:['COMCEH-24','COMSE-24','COMFCI-24'] },
  // Shared electives (all groups)
  { id:'e2', name:'DocuIT: Mastering Professional Writing in IT', teacher:'Mr. Murrey Eldred',     room:'B101',       color:'#0ea5e9', groups:'all' },
  { id:'e3', name:'Cybersecurity Foundation',                   teacher:'Mr. Ruslan Amanov',       room:'LAB4 (211)', color:'#ef4444', groups:'all' },
  { id:'e4', name:'Programming with Python',                    teacher:'Ms. Zhibek Namatova',     room:'BIGLAB',     color:'#10b981', groups:'all' },
  { id:'e5', name:'Startup: From Idea to Launch',               teacher:'Mr. Radmir Gumerov',      room:'B113',       color:'#f59e0b', groups:'all' },
  { id:'e6', name:'Philosophy of Technology',                   teacher:'Ms. Zhamby Dzhusubalieva',room:'B103',       color:'#8b5cf6', groups:'all' },
  { id:'e7', name:'Digital Marketing Technologies',             teacher:'Ms. Meerim Chukaeva',     room:'B111 Lab',   color:'#ec4899', groups:'all' },
];

const ck = (g,d,s) => `${g}||${d}||${s}`;

function getChipColors(cls) {
  if (cls.type === 'elective') {
    const e = ELECTIVES.find(x => x.id === cls.electiveId);
    if (e) return { bg: e.color+'1a', border: e.color, text: e.color };
  }
  if (cls.type === 'lab') return { bg:'#fef3c7', border:'#f59e0b', text:'#92400e' };
  return { bg:'#e0f2fe', border:'#0ea5e9', text:'#0369a1' };
}

function ClassChip({ cls, onEdit, onDelete, onDragStart }) {
  const c = getChipColors(cls);
  const icon = cls.type==='elective' ? '🌟' : cls.type==='lab' ? '🔬' : '📘';
  return (
    <div className="chip" draggable onDragStart={onDragStart}
      style={{ '--cbg':c.bg,'--cbr':c.border,'--ctxt':c.text }}>
      <div className="chip-badge">{icon}</div>
      <div className="chip-content">
        <div className="chip-subject">{cls.subject}</div>
        <div className="chip-meta">
          <span>{cls.teacher}</span>
          <span className="chip-room">{cls.room}</span>
        </div>
      </div>
      <div className="chip-actions">
        <button className="chip-btn" onClick={e=>{e.stopPropagation();onEdit();}} title="Edit">✏️</button>
        <button className="chip-btn chip-btn-del" onClick={e=>{e.stopPropagation();onDelete();}} title="Remove">✕</button>
      </div>
    </div>
  );
}

function ClassForm({ initial, cellInfo, onSave, onClose }) {
  const [f, setF] = useState(initial
    ? { ...initial }
    : { type:'regular', subject:'', teacher:'', room:'', electiveId:'' }
  );
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const pickElective = id => {
    const e = ELECTIVES.find(x=>x.id===id);
    if (e) setF(p=>({...p, electiveId:id, subject:e.name, teacher:e.teacher, room:e.room, type:'elective'}));
  };

  const valid = f.subject.trim() && f.teacher.trim() && f.room;

  return (
    <div className="sf-backdrop" onClick={onClose}>
      <div className="sf-modal" onClick={e=>e.stopPropagation()}>
        <div className="sf-header">
          <div>
            <h3>{initial ? 'Edit Class' : 'Add Class'}</h3>
            {cellInfo && (
              <div className="sf-cell-info">
                {cellInfo.group} · {cellInfo.day} · {cellInfo.time}
              </div>
            )}
          </div>
          <button className="sf-close" onClick={onClose}>✕</button>
        </div>

        <div className="sf-body">
          <div className="sf-field">
            <label>Class Type</label>
            <div className="sf-radio-group">
              {[{v:'regular',icon:'📘',lbl:'Regular'},{v:'elective',icon:'🌟',lbl:'Elective'},{v:'lab',icon:'🔬',lbl:'Lab'}].map(t=>(
                <label key={t.v} className={`sf-radio ${f.type===t.v?'active':''}`}>
                  <input type="radio" name="type" checked={f.type===t.v} onChange={()=>set('type',t.v)} />
                  {t.icon} {t.lbl}
                </label>
              ))}
            </div>
          </div>

          {f.type === 'elective' && (
            <div className="sf-field">
              <label>Choose Elective Course</label>
              <div className="sf-elective-list">
                {ELECTIVES.map(e=>(
                  <label key={e.id} className={`sf-elective-item ${f.electiveId===e.id?'active':''}`}
                    style={{'--ec':e.color}}>
                    <input type="radio" name="elective" checked={f.electiveId===e.id} onChange={()=>pickElective(e.id)} />
                    <div className="sf-elective-dot" style={{background:e.color}} />
                    <div>
                      <div className="sf-elective-name">{e.name}</div>
                      <div className="sf-elective-meta">{e.teacher} · {e.room}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="sf-field">
            <label>Subject *</label>
            <input value={f.subject} onChange={e=>set('subject',e.target.value)} placeholder="Subject name" />
          </div>
          <div className="sf-field">
            <label>Teacher *</label>
            <input value={f.teacher} onChange={e=>set('teacher',e.target.value)} placeholder="e.g. Ms. Namatova" />
          </div>
          <div className="sf-field">
            <label>Room *</label>
            <select value={f.room} onChange={e=>set('room',e.target.value)}>
              <option value="">— Select Room —</option>
              {ROOMS.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="sf-footer">
          <button className="sf-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="sf-btn-save" disabled={!valid} onClick={()=>onSave(f)}>
            {initial ? 'Save Changes' : 'Add Class'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScheduleManager({ userRole = 'admin' }) {
  const canEdit = userRole === 'admin' || userRole === 'teacher';

  const [schedule, setSchedule] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('alatoo_schedule_v3')||'{}'); }
    catch { return {}; }
  });
  const [activeGroup, setActiveGroup] = useState('COMCEH-24');
  const [filterDay,   setFilterDay]   = useState('all');
  const [formState,   setFormState]   = useState(null);
  const [toast,       setToast]       = useState(null);
  const dragSrc = useRef(null);

  const persist = next => {
    setSchedule(next);
    localStorage.setItem('alatoo_schedule_v3', JSON.stringify(next));
  };

  const notify = (msg, type='success') => {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 2500);
  };

  const saveClass = (key, cls) => {
    persist({...schedule, [key]:{...cls, _id:Date.now()}});
    setFormState(null);
    notify(formState?.initial ? 'Updated ✓' : 'Added ✓');
  };

  const deleteClass = key => {
    const next = {...schedule};
    delete next[key];
    persist(next);
    notify('Removed', 'info');
  };

  const onDragStart = key => { dragSrc.current = key; };
  const onDragOver  = e => e.preventDefault();
  const onDrop      = targetKey => {
    const src = dragSrc.current;
    if (!src || src === targetKey) return;
    const next = {...schedule};
    const tmp = next[src];
    if (next[targetKey]) next[src] = next[targetKey];
    else delete next[src];
    next[targetKey] = tmp;
    persist(next);
    notify('Moved ✓');
    dragSrc.current = null;
  };

  const days = filterDay === 'all' ? WEEKDAYS : [filterDay];

  // Build all grid cells as flat array
  const gridCells = [];

  // Header row
  gridCells.push(
    <div key="corner" className="sg-corner">
      <div className="sg-corner-group">{activeGroup}</div>
      <div className="sg-corner-sub">Hour / Day</div>
    </div>
  );
  days.forEach(day => {
    gridCells.push(
      <div key={`dh-${day}`} className="sg-day-header">
        <span className="sg-day-name">{day}</span>
      </div>
    );
  });

  // Data rows
  TIME_SLOTS.forEach(slot => {
    // Time cell
    gridCells.push(
      <div key={`time-${slot.id}`} className={`sg-time${slot.type==='lunch'?' sg-time-lunch':''}`}>
        <div className="sg-time-label">{slot.label}</div>
        <div className="sg-time-range">{slot.time}</div>
      </div>
    );

    // Day cells
    days.forEach(day => {
      const key = ck(activeGroup, day, slot.id);
      const cls = schedule[key];

      if (slot.type === 'lunch') {
        gridCells.push(
          <div key={`${day}-lunch`} className="sg-cell sg-lunch">
            🍽&nbsp; Lunch Break
          </div>
        );
        return;
      }

      gridCells.push(
        <div key={`${day}-${slot.id}`}
          className={`sg-cell${!cls && canEdit?' sg-cell-empty':''}`}
          onDragOver={onDragOver}
          onDrop={() => canEdit && onDrop(key)}
          onClick={() => !cls && canEdit && setFormState({key, initial:null, day, time:slot.time})}
        >
          {cls ? (
            <ClassChip
              cls={cls}
              onEdit={()=>canEdit&&setFormState({key,initial:cls,day,time:slot.time})}
              onDelete={()=>canEdit&&deleteClass(key)}
              onDragStart={()=>onDragStart(key)}
            />
          ) : canEdit ? (
            <div className="sg-add-hint">＋</div>
          ) : null}
        </div>
      );
    });
  });

  return (
    <div className="sm-wrap">
      <header className="sm-header">
        <div className="sm-title">
          <span className="sm-logo">COS</span>
          <div>
            <h1>Schedule Manager</h1>
            <p>CampusOS · Spring 2025-2026</p>
          </div>
        </div>
        <div className="sm-legend">
          <span className="leg-item"><span className="leg-dot" style={{background:'#0ea5e9'}}/>Regular</span>
          <span className="leg-item"><span className="leg-dot" style={{background:'#10b981'}}/>Elective</span>
          <span className="leg-item"><span className="leg-dot" style={{background:'#f59e0b'}}/>Lab</span>
          {canEdit && <span className="leg-item" style={{opacity:.5, fontSize:'.72rem'}}>drag to move</span>}
        </div>
      </header>

      <div className="sm-controls">
        <div className="sm-groups">
          {GROUPS.map(g=>(
            <button key={g} className={`sm-group-tab${activeGroup===g?' active':''}`}
              onClick={()=>setActiveGroup(g)}>{g}</button>
          ))}
        </div>
        <div className="sm-day-filter">
          <button className={`sm-day-btn${filterDay==='all'?' active':''}`}
            onClick={()=>setFilterDay('all')}>All Days</button>
          {WEEKDAYS.map(d=>(
            <button key={d} className={`sm-day-btn${filterDay===d?' active':''}`}
              onClick={()=>setFilterDay(d)}>{d.slice(0,3)}</button>
          ))}
        </div>
      </div>

      {canEdit && (
        <div className="elective-palette">
          <div className="ep-label">Elective Courses - click a cell to assign</div>
          <div className="ep-list">
            {ELECTIVES.map(e=>(
              <div key={e.id} className="ep-card" style={{'--ec':e.color}}>
                <div className="ep-dot" style={{background:e.color}} />
                <div className="ep-info">
                  <div className="ep-name">{e.name}</div>
                  <div className="ep-meta">{e.teacher} · {e.room}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sm-grid-wrapper">
        <div className="sm-grid" style={{'--days':days.length}}>
          {gridCells}
        </div>
      </div>

      <details className="room-legend">
        <summary>🏫 University Rooms ({ROOMS.length} total)</summary>
        <div className="rl-grid">
          {ROOMS.map(r=><span key={r} className="rl-item">{r}</span>)}
        </div>
      </details>

      {formState && (
        <ClassForm
          initial={formState.initial}
          cellInfo={formState.day ? {group:activeGroup, day:formState.day, time:formState.time} : null}
          onSave={cls=>saveClass(formState.key, cls)}
          onClose={()=>setFormState(null)}
        />
      )}

      {toast && (
        <div className={`sm-toast sm-toast-${toast.type}`}>
          {toast.type==='success'?'✓':'ℹ'} {toast.msg}
        </div>
      )}
    </div>
  );
}
