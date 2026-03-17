import { useState, useEffect } from 'react';
import './CoursesPage.css';

// ══════════════════════════════════════════════════════════
//  STORAGE (100% Local - No Backend Needed)
// ══════════════════════════════════════════════════════════
const store = {
  get: (key, def = null) => {
    try { return JSON.parse(localStorage.getItem(key)) || def; } 
    catch { return def; }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } 
    catch (e) { console.error('Storage error:', e); }
  }
};

// ══════════════════════════════════════════════════════════
//  DEMO DATA
// ══════════════════════════════════════════════════════════
const DEMO_COURSES = [
  {
    id: 1, code: 'CS101', name: 'Programming Language 2',
    description: 'Advanced OOP, design patterns, data structures.',
    credits: 6, semester: 'Spring 2026', teacher: 'Azhar Kazakbaeva',
    color: '#8b5cf6', icon: '💻',
    topics: [
      { id: 't1', week: 1, title: 'OOP Fundamentals', desc: 'Classes, inheritance.' },
      { id: 't2', week: 2, title: 'Design Patterns', desc: 'Singleton, Factory.' },
      { id: 't3', week: 3, title: 'Data Structures', desc: 'Stacks, queues, lists.' },
    ],
    materials: [
      { id: 'm1', title: 'Lecture Slides', type: 'pptx', size: '2.4 MB', date: '2026-02-01' },
    ],
  },
  {
    id: 2, code: 'MATH201', name: 'Calculus 2',
    description: 'Integrals, differential equations, series.',
    credits: 5, semester: 'Spring 2026', teacher: 'Hussien Chebsi',
    color: '#7c3aed', icon: '📐',
    topics: [], materials: [],
  },
  {
    id: 3, code: 'CS201', name: 'Data Structures',
    description: 'Trees, graphs, hash tables, algorithms.',
    credits: 6, semester: 'Spring 2026', teacher: 'Azhar Kazakbaeva',
    color: '#059669', icon: '🔗',
    topics: [], materials: [],
  },
  {
    id: 4, code: 'WEB101', name: 'Web Development',
    description: 'HTML, CSS, JavaScript, React.',
    credits: 4, semester: 'Spring 2026', teacher: 'Maria Teacher',
    color: '#dc2626', icon: '🌐',
    topics: [], materials: [],
  },
  {
    id: 5, code: 'CYB101', name: 'Cybersecurity',
    description: 'Network security, cryptography.',
    credits: 4, semester: 'Spring 2026', teacher: 'Ruslan Amanov',
    color: '#d97706', icon: '🔒',
    topics: [], materials: [],
  },
  {
    id: 6, code: 'PY101', name: 'Python Programming',
    description: 'Python syntax, data analysis.',
    credits: 4, semester: 'Spring 2026', teacher: 'Zhibek Namatova',
    color: '#0369a1', icon: '🐍',
    topics: [], materials: [],
  },
  {
    id: 7, code: 'MKT101', name: 'Digital Marketing',
    description: 'SEO, social media, analytics.',
    credits: 3, semester: 'Spring 2026', teacher: 'Meerim Chukaeva',
    color: '#be185d', icon: '📱',
    topics: [], materials: [],
  },
  {
    id: 8, code: 'ENT101', name: 'Startup Basics',
    description: 'Business model, MVP, pitching.',
    credits: 3, semester: 'Spring 2026', teacher: 'Radmir Gumerov',
    color: '#f59e0b', icon: '🚀',
    topics: [], materials: [],
  },
];

// ══════════════════════════════════════════════════════════
//  DATABASE
// ══════════════════════════════════════════════════════════
const db = {
  init: () => {
    if (!store.get('courses')) {
      store.set('courses', DEMO_COURSES);
      store.set('enrollments', {});
      store.set('progress', {});
    }
  },
  courses: {
    all: () => store.get('courses', []),
    save: (c) => store.set('courses', c),
    find: (id) => store.get('courses', []).find(c => c.id === id),
  },
  enrollments: {
    get: (uid) => store.get('enrollments', {})[uid] || [],
    add: (uid, cid) => {
      const e = store.get('enrollments', {});
      e[uid] = [...new Set([...(e[uid] || []), cid])];
      store.set('enrollments', e);
    },
    remove: (uid, cid) => {
      const e = store.get('enrollments', {});
      e[uid] = (e[uid] || []).filter(id => id !== cid);
      store.set('enrollments', e);
    },
  },
  progress: {
    get: (uid, cid) => store.get('progress', {})[`${uid}_${cid}`] || { pct: 0, done: [] },
    save: (uid, cid, p) => {
      const all = store.get('progress', {});
      all[`${uid}_${cid}`] = p;
      store.set('progress', all);
    },
  },
};

// ══════════════════════════════════════════════════════════
//  COMPONENTS
// ══════════════════════════════════════════════════════════

// Progress Ring
function Ring({ pct = 0, size = 52 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  const col = pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#8b5cf6';
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="6"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size*0.2} fontWeight="700" fill={col}>{pct}%</text>
    </svg>
  );
}

// Toast
function useToast() {
  const [t, setT] = useState(null);
  const show = (msg, type='success') => {
    setT({ msg, type });
    setTimeout(() => setT(null), 2500);
  };
  return { toast: t, show };
}

// Course Card
function Card({ course, enrolled, progress, isStudent, onOpen, onEnroll, onUnenroll, idx }) {
  return (
    <div className="cv-card" onClick={onOpen} 
      style={{ '--cc': course.color, animationDelay: `${idx * 0.04}s` }}>
      <div className="cv-card-stripe"/>
      <div className="cv-card-top">
        <span className="cv-card-icon">{course.icon}</span>
        {isStudent && enrolled && <Ring pct={progress?.pct || 0} size={46}/>}
        {!isStudent && <span className="cv-card-code">{course.code}</span>}
      </div>
      <div className="cv-card-body">
        {isStudent && <div className="cv-card-code">{course.code}</div>}
        <div className="cv-card-name">{course.name}</div>
        <div className="cv-card-desc">{course.description}</div>
      </div>
      <div className="cv-card-footer">
        <div className="cv-card-meta">
          <span>👩‍🏫 {course.teacher}</span>
          <span>📚 {course.credits} cr</span>
        </div>
        {isStudent && (
          <button className={enrolled ? 'cv-btn-leave' : 'cv-btn-join'}
            onClick={e => { e.stopPropagation(); enrolled ? onUnenroll() : onEnroll(); }}>
            {enrolled ? '✕ Leave' : '+ Enroll'}
          </button>
        )}
      </div>
    </div>
  );
}

// Detail View
function Detail({ course, userId, userRole, onBack, onUpdate }) {
  const [tab, setTab] = useState('syllabus');
  const [prog, setProg] = useState(() => db.progress.get(userId, course.id));
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showMatForm, setShowMatForm] = useState(false);
  const [topic, setTopic] = useState({ week: 1, title: '', desc: '' });
  const [mat, setMat] = useState({ title: '', type: 'pdf', url: '', size: '' });
  const [c, setC] = useState(course);
  const canEdit = userRole === 'admin' || userRole === 'teacher';

  const sync = (updated) => {
    const all = db.courses.all().map(x => x.id === updated.id ? updated : x);
    db.courses.save(all);
    setC(updated);
    onUpdate?.();
  };

  const toggleTopic = (tid) => {
    if (canEdit) return;
    const done = prog.done.includes(tid) ? prog.done.filter(x => x !== tid) : [...prog.done, tid];
    const pct = Math.round((done.length / c.topics.length) * 100);
    db.progress.save(userId, course.id, { pct, done });
    setProg({ pct, done });
  };

  const addTopic = (e) => {
    e.preventDefault();
    sync({ ...c, topics: [...c.topics, { id: `t${Date.now()}`, week: +topic.week, title: topic.title, desc: topic.desc }] });
    setTopic({ week: 1, title: '', desc: '' });
    setShowTopicForm(false);
  };

  const delTopic = (tid) => sync({ ...c, topics: c.topics.filter(t => t.id !== tid) });

  const addMat = (e) => {
    e.preventDefault();
    sync({ ...c, materials: [...c.materials, { 
      id: `m${Date.now()}`, title: mat.title, type: mat.type, 
      size: mat.size || '—', url: mat.url, date: new Date().toISOString().split('T')[0] 
    }] });
    setMat({ title: '', type: 'pdf', url: '', size: '' });
    setShowMatForm(false);
  };

  const delMat = (mid) => sync({ ...c, materials: c.materials.filter(m => m.id !== mid) });

  const weeks = [...new Set(c.topics.map(t => t.week))].sort((a,b) => a-b);
  const types = { pdf:'📄', video:'🎬', pptx:'📊', link:'🔗', docx:'📝', other:'📎' };

  return (
    <div className="cd-wrap">
      <div className="cd-hero" style={{ '--cc': c.color }}>
        <button className="cd-back" onClick={onBack}>← Back</button>
        <div className="cd-hero-inner">
          <div className="cd-hero-left">
            <span className="cd-hero-icon">{c.icon}</span>
            <div>
              <div className="cd-hero-code">{c.code} · {c.semester}</div>
              <h2 className="cd-hero-name">{c.name}</h2>
              <div className="cd-hero-meta">
                <span>👩‍🏫 {c.teacher}</span>
                <span>📚 {c.credits} cr</span>
              </div>
            </div>
          </div>
          {userRole === 'student' && (
            <div className="cd-hero-ring">
              <Ring pct={prog.pct} size={76}/>
              <div className="cd-ring-label">Progress</div>
            </div>
          )}
        </div>
        <p className="cd-hero-desc">{c.description}</p>
      </div>

      <div className="cd-tabs">
        {['syllabus','materials'].map(t => (
          <button key={t} className={`cd-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t==='syllabus'?'📋 Syllabus':'📁 Materials'}
            <span className="cd-tab-count">{t==='syllabus'?c.topics.length:c.materials.length}</span>
          </button>
        ))}
        {userRole==='student' && (
          <div className="cd-progress-bar-wrap">
            <div className="cd-progress-bar" style={{ width:`${prog.pct}%`, background:c.color }}/>
          </div>
        )}
      </div>

      <div className="cd-body">
        {tab === 'syllabus' && (
          <div>
            {userRole==='student' && <div className="cd-hint">💡 Click to mark as done</div>}
            {canEdit && <button className="cd-add-btn" onClick={()=>setShowTopicForm(!showTopicForm)}>
              {showTopicForm?'✕ Cancel':'+ Add Topic'}</button>}
            
            {showTopicForm && (
              <form className="cd-inline-form" onSubmit={addTopic}>
                <div className="cd-form-grid">
                  <label><span>Week</span><input type="number" min="1" value={topic.week} 
                    onChange={e=>setTopic({...topic,week:e.target.value})} required/></label>
                  <label><span>Title</span><input value={topic.title} onChange={e=>setTopic({...topic,title:e.target.value})} 
                    required/></label>
                  <label><span>Description</span><textarea value={topic.desc} onChange={e=>setTopic({...topic,desc:e.target.value})}/></label>
                </div>
                <div className="cd-form-actions">
                  <button type="button" className="cd-btn-sec" onClick={()=>setShowTopicForm(false)}>Cancel</button>
                  <button type="submit" className="cd-btn-pri">Add</button>
                </div>
              </form>
            )}

            {weeks.map(w => (
              <div key={w} className="cd-week-block">
                <div className="cd-week-label">
                  <span className="cd-week-num">Week {w}</span>
                  <span className="cd-week-done">{c.topics.filter(t=>t.week===w&&prog.done.includes(t.id)).length}/
                    {c.topics.filter(t=>t.week===w).length}</span>
                </div>
                {c.topics.filter(t=>t.week===w).map(t => {
                  const done = prog.done.includes(t.id);
                  return (
                    <div key={t.id} className={`cd-topic-row ${done?'done':'clickable'}`}
                      onClick={()=>toggleTopic(t.id)}>
                      <span className="cd-topic-check">{done?'✅':'⬜'}</span>
                      <div className="cd-topic-text">
                        <div className="cd-topic-title">{t.title}</div>
                        {t.desc && <div className="cd-topic-desc">{t.desc}</div>}
                      </div>
                      {canEdit && <button className="cd-row-del" onClick={e=>{e.stopPropagation();delTopic(t.id);}}>✕</button>}
                    </div>
                  );
                })}
              </div>
            ))}
            {c.topics.length===0 && <div className="lms-empty">No topics yet</div>}
          </div>
        )}

        {tab === 'materials' && (
          <div>
            {canEdit && <button className="btn-add" onClick={()=>setShowMatForm(!showMatForm)}>
              {showMatForm?'✕ Cancel':'+ Add Material'}</button>}
            
            {showMatForm && (
              <form className="cd-inline-form" onSubmit={addMat}>
                <div className="cd-form-grid">
                  <label><span>Title</span><input value={mat.title} onChange={e=>setMat({...mat,title:e.target.value})} 
                    required/></label>
                  <label><span>Type</span><select value={mat.type} onChange={e=>setMat({...mat,type:e.target.value})}>
                    {Object.keys(types).map(t=><option key={t} value={t}>{t}</option>)}
                  </select></label>
                  {mat.type==='link' ? (
                    <label><span>URL</span><input type="url" value={mat.url} onChange={e=>setMat({...mat,url:e.target.value})}/></label>
                  ) : (
                    <label><span>Size</span><input value={mat.size} onChange={e=>setMat({...mat,size:e.target.value})}/></label>
                  )}
                </div>
                <div className="cd-form-actions">
                  <button type="button" className="cd-btn-sec" onClick={()=>setShowMatForm(false)}>Cancel</button>
                  <button type="submit" className="cd-btn-pri">Add</button>
                </div>
              </form>
            )}

            <div className="cd-mat-grid">
              {c.materials.map(m => (
                <div key={m.id} className="cd-mat-card">
                  <div className="cd-mat-type-badge">{m.type.toUpperCase()}</div>
                  <div className="cd-mat-icon">{types[m.type]}</div>
                  <div className="cd-mat-title">{m.title}</div>
                  <div className="cd-mat-info">{m.size} · {m.date}</div>
                  <div className="cd-mat-actions">
                    {m.url ? <a href={m.url} target="_blank" rel="noreferrer">Open ↗</a> 
                      : <span>Local</span>}
                    {canEdit && <button onClick={()=>delMat(m.id)}>✕</button>}
                  </div>
                </div>
              ))}
            </div>
            {c.materials.length===0 && <div className="lms-empty">No materials yet</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════
export default function CoursesPage({ user }) {
  const [courses, setCourses] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [view, setView] = useState('catalog');
  const [detailId, setDetailId] = useState(null);
  const [search, setSearch] = useState('');
  const { toast, show } = useToast();

  const isStudent = user?.role === 'student';
  const uid = user?.id || 'guest';

  useEffect(() => {
    db.init();
    setCourses(db.courses.all());
    setEnrolled(db.enrollments.get(uid));
  }, [uid]);

  const enroll = (cid) => { db.enrollments.add(uid, cid); setEnrolled(db.enrollments.get(uid)); show('Enrolled ✓'); };
  const unenroll = (cid) => { db.enrollments.remove(uid, cid); setEnrolled(db.enrollments.get(uid)); show('Unenrolled'); };

  const detail = courses.find(c => c.id === detailId);
  const filtered = (view==='mine' ? courses.filter(c=>enrolled.includes(c.id)) : courses)
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  if (view === 'detail' && detail) {
    return (
      <>
        <Detail course={detail} userId={uid} userRole={user?.role} 
          onBack={()=>setView('catalog')} onUpdate={()=>setCourses(db.courses.all())}/>
        {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      </>
    );
  }

  return (
    <div className="lms-courses">
      <div className="lms-header">
        <div>
          <h2>📚 Courses</h2>
          <p>{isStudent ? 'Enroll and track progress' : 'Manage courses'}</p>
        </div>
      </div>

      <div className="lms-controls">
        {isStudent && (
          <div className="lms-tabs">
            <button className={view==='catalog'?'lms-tab active':'lms-tab'} onClick={()=>setView('catalog')}>
              🌍 All ({courses.length})
            </button>
            <button className={view==='mine'?'lms-tab active':'lms-tab'} onClick={()=>setView('mine')}>
              ✅ Mine ({enrolled.length})
            </button>
          </div>
        )}
        <input className="lms-search" placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {isStudent && view==='mine' && enrolled.length>0 && (
        <div className="lms-progress-strip">
          {courses.filter(c=>enrolled.includes(c.id)).map(c => {
            const p = db.progress.get(uid, c.id);
            return (
              <div key={c.id} className="lms-pstrip-item" style={{'--cc':c.color}}
                onClick={()=>{setDetailId(c.id);setView('detail');}}>
                <span className="lms-pstrip-icon">{c.icon}</span>
                <div className="lms-pstrip-info">
                  <div className="lms-pstrip-name">{c.name}</div>
                  <div className="lms-pstrip-bar">
                    <div className="lms-pstrip-fill" style={{width:`${p.pct}%`,background:c.color}}/>
                  </div>
                </div>
                <span className="lms-pstrip-pct" style={{color:c.color}}>{p.pct}%</span>
              </div>
            );
          })}
        </div>
      )}


      {/* Skeleton loader при загрузке */}
      {courses.length === 0 ? (
        <div className="lms-grid">
          {[...Array(4)].map((_,i) => (
            <div className="cv-card skeleton" key={i}></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="lms-empty">No courses found</div>
      ) : (
        <div className="lms-grid">
          {filtered.map((c,i) => (
            <Card key={c.id} course={c} idx={i}
              enrolled={enrolled.includes(c.id)}
              progress={db.progress.get(uid,c.id)}
              isStudent={isStudent}
              onOpen={()=>{setDetailId(c.id);setView('detail');}}
              onEnroll={()=>enroll(c.id)}
              onUnenroll={()=>unenroll(c.id)}/>
          ))}
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}