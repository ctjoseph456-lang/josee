import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import { addDays, Calendar, dateFromIST, today, WEEK, MONTHS } from './lib.jsx';
import { Gym, DEFAULT_PLAN } from './gym.jsx';
import './styles.css';

const CATEGORIES = ['Study', 'Practice', 'Break', 'Personal'];
const CLASS_DEFAULT = [
  { id: 'c1', start: '04:30', end: '06:30', title: 'Wake Up', category: 'Study' },
  { id: 'c2', start: '06:30', end: '07:00', title: 'Get Ready', category: 'Personal' },
  { id: 'c3', start: '07:00', end: '08:00', title: 'any HWs', category: 'Study' },
  { id: 'c4', start: '08:00', end: '08:30', title: 'Breakfast', category: 'Personal' },
  { id: 'c5', start: '19:00', end: '20:30', title: 'Study', category: 'Study' },
  { id: 'c6', start: '20:30', end: '21:00', title: 'Light Dinner', category: 'Break' },
  { id: 'c7', start: '21:00', end: '10:10', title: 'Gym', category: 'Personal' }
];
const GYM_SEED = [
  { id: 'tp1', name: 'Push A', exercises: [{ name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell', restSec: 90, sets: [{ weight: 60, reps: 10 }, { weight: 60, reps: 10 }, { weight: 60, reps: 8 }] }, { name: 'Shoulder Press', muscle: 'Shoulders', equipment: 'Dumbbell', restSec: 90, sets: [{ weight: 20, reps: 10 }, { weight: 20, reps: 10 }, { weight: 20, reps: 8 }] }, { name: 'Triceps Pushdown', muscle: 'Triceps', equipment: 'Cable', restSec: 60, sets: [{ weight: 25, reps: 12 }, { weight: 25, reps: 12 }] }] },
  { id: 'tp2', name: 'Pull A', exercises: [{ name: 'Pull-up', muscle: 'Back', equipment: 'Bodyweight', restSec: 90, sets: [{ weight: 0, reps: 10 }, { weight: 0, reps: 8 }, { weight: 0, reps: 6 }] }, { name: 'Barbell Row', muscle: 'Back', equipment: 'Barbell', restSec: 90, sets: [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }] }, { name: 'Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', restSec: 60, sets: [{ weight: 12, reps: 12 }, { weight: 12, reps: 10 }] }] },
  { id: 'tp3', name: 'Legs A', exercises: [{ name: 'Squat', muscle: 'Legs', equipment: 'Barbell', restSec: 120, sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 80, reps: 6 }] }, { name: 'Leg Press', muscle: 'Legs', equipment: 'Machine', restSec: 90, sets: [{ weight: 120, reps: 12 }, { weight: 120, reps: 10 }] }, { name: 'Calf Raise', muscle: 'Legs', equipment: 'Machine', restSec: 60, sets: [{ weight: 60, reps: 15 }, { weight: 60, reps: 12 }] }] },
  { id: 'tp4', name: 'Upper', exercises: [{ name: 'Pull-up', muscle: 'Back', equipment: 'Bodyweight', restSec: 90, sets: [{ weight: 0, reps: 10 }, { weight: 0, reps: 8 }] }, { name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell', restSec: 90, sets: [{ weight: 60, reps: 10 }, { weight: 60, reps: 8 }] }, { name: 'Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell', restSec: 60, sets: [{ weight: 10, reps: 15 }, { weight: 10, reps: 12 }] }, { name: 'Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', restSec: 60, sets: [{ weight: 12, reps: 12 }, { weight: 12, reps: 10 }] }] },
  { id: 'tp5', name: 'Full Body', exercises: [{ name: 'Squat', muscle: 'Legs', equipment: 'Barbell', restSec: 120, sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }] }, { name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell', restSec: 90, sets: [{ weight: 60, reps: 10 }, { weight: 60, reps: 8 }] }, { name: 'Barbell Row', muscle: 'Back', equipment: 'Barbell', restSec: 90, sets: [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }] }] }
];
const GYM_PLAN = DEFAULT_PLAN;
const initial = {
  _v: 7,
  defaultHabits: [
    { id: 'h1', name: 'Morning revision' },
    { id: 'h2', name: 'Exercise' },
    { id: 'h3', name: 'Read' }
  ],
  habitDefaults: [],
  habitDone: {},
  sessions: [],
  studyLog: {},
  defaultTimetable: CLASS_DEFAULT.map(e => ({ ...e })),
  offdayTimetable: [
    { id: 'o1', start: '09:00', end: '10:30', title: 'Light revision', category: 'Study' }
  ],
  dayOff: {},
  dayTimetables: {},
  completed: {},
  gym: { workouts: [], bodyWeight: [], templates: GYM_SEED, plan: JSON.parse(JSON.stringify(GYM_PLAN)), favorites: [], recent: [], custom: [], bmi: [], settings: { units: 'kg', dark: false } }
};
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('study-dashboard-data')) || initial;
    if (d.timetable && !d.defaultTimetable) { d.defaultTimetable = d.timetable; delete d.timetable; }
    d.offdayTimetable = d.offdayTimetable || [{ id: 'o1', start: '09:00', end: '10:30', title: 'Light revision', category: 'Study' }];
    d.dayOff = d.dayOff || {};
    d.dayTimetables = d.dayTimetables || {};
    d.completed = d.completed || {};
    d.studyLog = d.studyLog || {};
    if (Array.isArray(d.habits)) {
      if (!d.defaultHabits) d.defaultHabits = d.habits.map(h => ({ id: h.id, name: h.name }));
      d.habitDone = d.habitDone || {};
      d.habits.forEach(h => Object.keys(h.dates || {}).forEach(ds => { if ((h.dates[ds] || 0) >= (h.target || 1)) d.habitDone[ds] = { ...(d.habitDone[ds] || {}), [h.id]: true }; }));
    }
    delete d.habits;
    d.defaultHabits = d.defaultHabits || [];
    d.habitDefaults = d.habitDefaults || [];
    d.habitDone = d.habitDone || {};
    d.gym = d.gym || { workouts: [], bodyWeight: [], templates: GYM_SEED, settings: { units: 'kg', dark: false } };
    d.gym.workouts = d.gym.workouts || [];
    d.gym.bodyWeight = d.gym.bodyWeight || [];
    d.gym.templates = (d.gym.templates && d.gym.templates.length ? d.gym.templates : GYM_SEED);
    d.gym.settings = d.gym.settings || { units: 'kg', dark: false };
    d.gym.plan = d.gym.plan && d.gym.plan.monday ? d.gym.plan : JSON.parse(JSON.stringify(GYM_PLAN));
    d.gym.favorites = d.gym.favorites || [];
    d.gym.recent = d.gym.recent || [];
    d.gym.custom = d.gym.custom || [];
    d.gym.bmi = d.gym.bmi || [];
    if (!d._v) { d.defaultTimetable = CLASS_DEFAULT.map(e => ({ ...e })); }
    d._v = 7;
    return d;
  } catch { return initial; }
}
function save(data) { localStorage.setItem('study-dashboard-data', JSON.stringify(data)); }
const effectiveHabitsFor = (data, d) => {
  let best = null;
  (data.habitDefaults || []).forEach(en => { if (en.from <= d && (!best || en.from > best.from)) best = en; });
  return best ? best.habits : (data.defaultHabits || []);
};
function Card({ title, value, note, children }) { return <section className="card"><p className="eyebrow">{title}</p><strong className="metric">{value}</strong>{note && <p className="muted">{note}</p>}{children}</section>; }
function Progress({ value }) { return <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>; }
function StudyLogForm({ log, onSave }) {
  const [hours, setHours] = useState(log ? String(log.hours) : '');
  const [notes, setNotes] = useState(log ? log.notes || '' : '');
  const [saved, setSaved] = useState(!!log);
  const save = (e) => { e.preventDefault(); const h = Math.max(0, Number(hours) || 0); if (!h) return; onSave(h, notes.trim()); setSaved(true); };
  return <form onSubmit={save} className="study-q"><h3 className="study-q-title">How many hours did you study?</h3><input className="hours-box" type="number" min="0" step="0.25" placeholder="0" value={hours} onChange={e => setHours(e.target.value)} required /><p className="hours-hint">Hours (you can use decimals like 3.5)</p><h3 className="study-q-title">What subjects and topics did you cover?</h3><textarea className="topics-box" rows="9" placeholder="Type everything you studied..." value={notes} onChange={e => setNotes(e.target.value)} /><div className="log-actions"><button>Save</button>{saved && <span className="saved">Saved for this day — update it anytime</span>}</div></form>;
}

function App() {
  const [data, setData] = useState(load);
  const [page, setPage] = useState('Timetable');
  const [date, setDate] = useState(today());
  const [calMonth, setCalMonth] = useState(() => date.slice(0, 7));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [addForm, setAddForm] = useState({ start: '', end: '', title: '', category: 'Study' });
  const [now, setNow] = useState(Date.now());
  const [editingHabits, setEditingHabits] = useState(false);
  const [habitDraft, setHabitDraft] = useState([]);
  const [newHabit, setNewHabit] = useState('');
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', !!(data.gym && data.gym.settings && data.gym.settings.dark)); }, [data]);
  const update = (next) => { setData(next); save(next); };
  const isOff = !!data.dayOff[date];
  const effective = data.dayTimetables[date] || (isOff ? data.offdayTimetable : data.defaultTimetable);
  const doneCount = effective.filter(t => data.completed[date]?.[t.id]).length;
  const pickDate = (ds) => { setDate(ds); setCalMonth(ds.slice(0, 7)); };
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const weeklyMinutes = weekDays.map(d => Math.round((data.sessions.filter(s => s.date === d).reduce((n, s) => n + Number(s.minutes), 0)) + (data.studyLog?.[d]?.hours || 0) * 60));
  const saveLog = (h, notes) => update({ ...data, studyLog: { ...data.studyLog, [date]: { hours: h, notes } } });
  const studyMarks = {}; Object.keys(data.studyLog || {}).forEach(ds => { studyMarks[ds] = true; });
  const effectiveHabits = effectiveHabitsFor(data, date);
  const habitDoneCount = effectiveHabits.filter(h => data.habitDone?.[date]?.[h.id]).length;
  const habitPct = effectiveHabits.length ? habitDoneCount / effectiveHabits.length * 100 : 0;
  const habitMarks = {}; Object.keys(data.habitDone || {}).forEach(ds => { const list = effectiveHabitsFor(data, ds); if (list.length && list.filter(h => data.habitDone[ds]?.[h.id]).length === list.length) habitMarks[ds] = true; });
  const toggleHabit = (id) => { const day = { ...(data.habitDone[date] || {}) }; day[id] = !day[id]; update({ ...data, habitDone: { ...data.habitDone, [date]: day } }); };
  const startEditHabits = () => { setHabitDraft(effectiveHabits.map(h => ({ ...h }))); setEditingHabits(true); };
  const patchHabitDraft = (id, name) => setHabitDraft(habitDraft.map(h => h.id === id ? { ...h, name } : h));
  const removeHabitDraft = (id) => setHabitDraft(habitDraft.filter(h => h.id !== id));
  const addHabitField = (e) => { e.preventDefault(); if (!newHabit.trim()) return; setHabitDraft([...habitDraft, { id: crypto.randomUUID(), name: newHabit.trim() }]); setNewHabit(''); };
  const saveHabits = () => { const list = habitDraft.filter(h => h.name.trim()).map(h => ({ id: h.id, name: h.name.trim() })); update({ ...data, defaultHabits: list, habitDefaults: [...(data.habitDefaults || []), { from: date, habits: list }] }); setEditingHabits(false); };
  const importFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const normalized = rows.map((r, i) => ({ id: crypto.randomUUID(), subject: r.Subject || r.subject || r.Task || r.task || `Imported item ${i + 1}`, minutes: Number(r.Minutes || r.minutes || r.Duration || r.duration || 0), date: String(r.Date || r.date || today()).slice(0, 10) })).filter(r => r.minutes);
    update({ ...data, sessions: [...data.sessions, ...normalized] }); alert(`${normalized.length} study records imported from ${file.name}.`);
  };
  const setDayType = (off) => update({ ...data, dayOff: { ...data.dayOff, [date]: off } });
  const toggleDone = (id) => { const day = { ...(data.completed[date] || {}) }; day[id] = !day[id]; update({ ...data, completed: { ...data.completed, [date]: day } }); };
  const startEdit = () => { setDraft(effective.map(e => ({ ...e }))); setEditing(true); };
  const finishEdit = () => { update({ ...data, dayTimetables: { ...data.dayTimetables, [date]: draft } }); setEditing(false); };
  const resetDay = () => { const nd = { ...data.dayTimetables }; delete nd[date]; update({ ...data, dayTimetables: nd }); setEditing(false); };
  const makeClassDefault = () => { const list = editing ? draft : effective; const nd = { ...data.dayTimetables }; delete nd[date]; update({ ...data, defaultTimetable: list.map(e => ({ ...e })), dayTimetables: nd }); setEditing(false); };
  const patchDraft = (id, field, value) => setDraft(draft.map(e => e.id === id ? { ...e, [field]: value } : e));
  const removeEntry = (id) => setDraft(draft.filter(e => e.id !== id));
  const addEntry = (e) => { e.preventDefault(); if (!addForm.title || !addForm.start || !addForm.end) return; setDraft([...draft, { id: crypto.randomUUID(), ...addForm }]); setAddForm({ start: '', end: '', title: '', category: 'Study' }); };
  const shiftMonth = (n) => setCalMonth(new Date(Date.UTC(Number(calMonth.slice(0, 4)), Number(calMonth.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7));
  const weekdayFull = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateFromIST(date));
  const istTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(now);
  const nav = ['Timetable', 'Study', 'Habits', 'Gym', 'Reports', 'Import & backup'];
  const chartMax = Math.max(...weeklyMinutes, 60);
  return <div className="app-shell"><aside><div className="brand"><span>✦</span> Focusboard</div><p className="side-copy">A quiet place for your routine.</p><nav>{nav.map(n => <button className={page === n ? 'active' : ''} onClick={() => setPage(n)} key={n}>{n}</button>)}</nav><div className="side-footer">Private by default<br />Saved on this device</div></aside><main><header><div><p className="eyebrow">PERSONAL STUDY DASHBOARD</p><h1>{page === 'Timetable' ? 'Plan the day, then do it.' : page}</h1></div><div className="header-right"><label className="date"><span>Viewing</span><input type="date" value={date} onChange={e => pickDate(e.target.value)} /></label><span className="ist-clock">{istTime} IST</span></div></header>
  {page === 'Timetable' && <div className="timetable-layout"><div className="cal-col"><Calendar month={calMonth} onMonth={shiftMonth} todayStr={today()} selected={date} off={data.dayOff} marks={{}} onPick={pickDate} /><div className="cal-key"><span className="key-dot off" />Off day<span className="key-dot today" />Today</div></div><section className="panel"><div className="panel-head"><div><h2>Day plan</h2><p className="muted">{weekdayFull} · IST</p></div>{editing ? <button onClick={finishEdit}>Save day</button> : <button onClick={startEdit}>Edit day</button>}</div><div className="day-type"><button className={!isOff ? 'active' : ''} onClick={() => setDayType(false)}>Class day</button><button className={isOff ? 'active' : ''} onClick={() => setDayType(true)}>Off day</button></div><div className="day-actions"><button className="ghost" onClick={makeClassDefault}>Save as class-day default</button>{editing && data.dayTimetables[date] && <button className="ghost" onClick={resetDay}>Reset this day</button>}</div><div className="timetable-list">{(editing ? draft : effective).map(t => <div className={`schedule${!editing && data.completed[date]?.[t.id] ? ' done' : ''}`} key={t.id}>{editing ? <div className="times"><input className="time" type="time" value={t.start} onChange={e => patchDraft(t.id, 'start', e.target.value)} /><input className="time" type="time" value={t.end} onChange={e => patchDraft(t.id, 'end', e.target.value)} /></div> : <time>{t.start}<br />{t.end}</time>}<span className={`dot ${t.category.toLowerCase()}`} />{editing ? <div className="sch-body"><input className="title" value={t.title} onChange={e => patchDraft(t.id, 'title', e.target.value)} /><select className="cat" value={t.category} onChange={e => patchDraft(t.id, 'category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div> : <div><strong>{t.title}</strong><small>{t.category}</small></div>}<div className="sch-right"><input type="checkbox" aria-label={`Mark ${t.title} done`} checked={!!data.completed[date]?.[t.id]} onChange={() => toggleDone(t.id)} />{editing && <button className="ghost del" onClick={() => removeEntry(t.id)}>×</button>}</div></div>)}</div>{editing && <form className="form add-entry" onSubmit={addEntry}><input type="time" value={addForm.start} onChange={e => setAddForm({ ...addForm, start: e.target.value })} required /><input type="time" value={addForm.end} onChange={e => setAddForm({ ...addForm, end: e.target.value })} required /><input placeholder="Title" value={addForm.title} onChange={e => setAddForm({ ...addForm, title: e.target.value })} required /><select value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select><button>Add</button></form>}{!editing && <p className="muted done-note">{doneCount} of {effective.length} completed for this day</p>}</section></div>}
  {page === 'Study' && <div className="timetable-layout"><Calendar month={calMonth} onMonth={shiftMonth} todayStr={today()} selected={date} off={data.dayOff} marks={studyMarks} onPick={pickDate} /><section className="panel"><div className="panel-head"><div><h2>Daily study log</h2><p className="muted">{weekdayFull} · IST</p></div></div><StudyLogForm log={data.studyLog?.[date]} onSave={saveLog} /></section></div>}
  {page === 'Habits' && <div className="habits-layout"><section className="panel"><div className="panel-head"><div><h2>Habit checklist</h2><p className="muted">{weekdayFull} · IST</p></div>{editingHabits ? <button onClick={saveHabits}>Save &amp; set as default</button> : <button onClick={startEditHabits}>Edit habits</button>}</div><p className="muted">{editingHabits ? 'Edit the list, then save it as the default from this day onward.' : 'Tick the habits you completed today.'}</p><div className="habit-checklist">{(editingHabits ? habitDraft : effectiveHabits).map(h => <div className={`habit-check${!editingHabits && data.habitDone?.[date]?.[h.id] ? ' done' : ''}`} key={h.id}><input type="checkbox" aria-label={h.name} checked={!!data.habitDone?.[date]?.[h.id]} onChange={() => toggleHabit(h.id)} disabled={editingHabits} />{editingHabits ? <><input className="title" value={h.name} onChange={e => patchHabitDraft(h.id, e.target.value)} />{habitDraft.length > 1 && <button className="ghost del" onClick={() => removeHabitDraft(h.id)}>×</button>}</> : <strong>{h.name}</strong>}</div>)}</div>{editingHabits && <form className="form add-habit" onSubmit={addHabitField}><input placeholder="New habit name" value={newHabit} onChange={e => setNewHabit(e.target.value)} required /><button>Add habit</button></form>}<div className="habit-total"><span>{habitDoneCount} of {effectiveHabits.length} completed today</span><div className="total-bar"><Progress value={habitPct} /></div><strong>{Math.round(habitPct)}%</strong></div></section><div className="cal-col"><Calendar month={calMonth} onMonth={shiftMonth} todayStr={today()} selected={date} off={data.dayOff} marks={habitMarks} onPick={pickDate} /><div className="cal-key"><span className="key-dot today" />All habits done</div></div></div>}
  {page === 'Gym' && <Gym data={data} update={update} />}
  {page === 'Reports' && <><div className="stats"><Card title="Weekly study" value={`${weeklyMinutes.reduce((a, b) => a + b, 0)} min`} note="Rolling seven days" /><Card title="Daily average" value={`${Math.round(weeklyMinutes.reduce((a, b) => a + b, 0) / 7)} min`} note="Rolling seven days" /><Card title="Sessions" value={data.sessions.length} note="All time" /></div><section className="panel"><div className="panel-head"><div><h2>Study rhythm</h2><p className="muted">Minutes logged during the last seven days</p></div></div><div className="bar-chart">{weeklyMinutes.map((v, i) => <div className="bar" key={weekDays[i]}><span>{v || ''}</span><i style={{ height: `${Math.max(4, v / chartMax * 100)}%` }} /><small>{WEEK[dateFromIST(weekDays[i]).getUTCDay()]}</small></div>)}</div></section></>}
  {page === 'Import & backup' && <div className="two-col"><section className="panel"><h2>Import a spreadsheet</h2><p className="muted">Import the first sheet of an .xlsx, .xls, or .csv file. Recognized columns: Date, Subject (or Task), and Minutes (or Duration).</p><label className="upload">Choose spreadsheet<input type="file" accept=".xlsx,.xls,.csv" onChange={importFile} /></label></section><section className="panel"><h2>Your data, your device</h2><p className="muted">Everything is stored in this browser’s local storage. Export a backup before clearing your browser data.</p><button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'focusboard-backup.json'; a.click(); }}>Download backup</button></section></div>}
  </main></div>;
}
createRoot(document.getElementById('root')).render(<App />);
