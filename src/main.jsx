import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import './styles.css';

const dateFromIST = (str) => { const [y, m, d] = str.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (str, n) => { const dt = dateFromIST(str); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); };
const today = () => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const g = (t) => p.find(x => x.type === t)?.value || '';
  return `${g('year')}-${g('month')}-${g('day')}`;
};
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
const initial = {
  _v: 3,
  habits: [
    { id: 'h1', name: 'Morning revision', target: 30, unit: 'min', dates: {} },
    { id: 'h2', name: 'Exercise', target: 20, unit: 'min', dates: {} },
    { id: 'h3', name: 'Read', target: 15, unit: 'pages', dates: {} }
  ],
  sessions: [],
  studyLog: {},
  defaultTimetable: CLASS_DEFAULT.map(e => ({ ...e })),
  offdayTimetable: [
    { id: 'o1', start: '09:00', end: '10:30', title: 'Light revision', category: 'Study' }
  ],
  dayOff: {},
  dayTimetables: {},
  completed: {}
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
    if (!d._v) { d.defaultTimetable = CLASS_DEFAULT.map(e => ({ ...e })); }
    d._v = 3;
    return d;
  } catch { return initial; }
}
function save(data) { localStorage.setItem('study-dashboard-data', JSON.stringify(data)); }
function Card({ title, value, note, children }) { return <section className="card"><p className="eyebrow">{title}</p><strong className="metric">{value}</strong>{note && <p className="muted">{note}</p>}{children}</section>; }
function Progress({ value }) { return <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>; }
function Calendar({ month, onMonth, todayStr, selected, off, marks, onPick }) {
  const calY = Number(month.slice(0, 4)); const calM = Number(month.slice(5, 7));
  const firstWeekday = dateFromIST(`${month}-01`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(calY, calM, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(<div className="cal-cell blank" key={`b${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${month}-${String(d).padStart(2, '0')}`;
    cells.push(<button className={`cal-cell${ds === selected ? ' active' : ''}${ds === todayStr ? ' today' : ''}${off[ds] ? ' off' : ''}${marks[ds] ? ' mark' : ''}`} key={ds} onClick={() => onPick(ds)}><span>{d}</span></button>);
  }
  return <section className="panel"><div className="panel-head cal-head"><h2>Calendar</h2><div className="cal-nav"><button className="ghost" onClick={() => onMonth(-1)}>‹</button><strong>{MONTHS[calM - 1]} {calY}</strong><button className="ghost" onClick={() => onMonth(1)}>›</button></div></div><div className="cal-weekdays">{WEEK.map(w => <span key={w}>{w}</span>)}</div><div className="cal-grid">{cells}</div></section>;
}
function StudyLogForm({ log, onSave }) {
  const [hours, setHours] = useState(log ? String(log.hours) : '');
  const [notes, setNotes] = useState(log ? log.notes || '' : '');
  const save = (e) => { e.preventDefault(); const h = Math.max(0, Number(hours) || 0); if (!h) return; onSave(h, notes.trim()); };
  return <form onSubmit={save} className="form log-form"><label className="log-field"><span>How many hours did you study?</span><input type="number" min="0" step="0.25" placeholder="e.g. 3.5" value={hours} onChange={e => setHours(e.target.value)} required /></label><label className="log-field"><span>Topics / subjects covered</span><textarea rows="5" placeholder="What topics or subjects did you cover today?" value={notes} onChange={e => setNotes(e.target.value)} /></label><div className="log-actions"><button>Save</button>{log && <span className="saved">Saved for this day — update it anytime</span>}</div></form>;
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
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const update = (next) => { setData(next); save(next); };
  const isOff = !!data.dayOff[date];
  const effective = data.dayTimetables[date] || (isOff ? data.offdayTimetable : data.defaultTimetable);
  const doneCount = effective.filter(t => data.completed[date]?.[t.id]).length;
  const pickDate = (ds) => { setDate(ds); setCalMonth(ds.slice(0, 7)); };
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const weeklyMinutes = weekDays.map(d => Math.round((data.sessions.filter(s => s.date === d).reduce((n, s) => n + Number(s.minutes), 0)) + (data.studyLog?.[d]?.hours || 0) * 60));
  const saveLog = (h, notes) => update({ ...data, studyLog: { ...data.studyLog, [date]: { hours: h, notes } } });
  const studyMarks = {}; Object.keys(data.studyLog || {}).forEach(ds => { studyMarks[ds] = true; });
  const setHabit = (id, raw) => update({ ...data, habits: data.habits.map(h => h.id === id ? { ...h, dates: { ...h.dates, [date]: Math.max(0, Number(raw) || 0) } } : h) });
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
  const nav = ['Timetable', 'Study', 'Habits', 'Reports', 'Import & backup'];
  const chartMax = Math.max(...weeklyMinutes, 60);
  return <div className="app-shell"><aside><div className="brand"><span>✦</span> Focusboard</div><p className="side-copy">A quiet place for your routine.</p><nav>{nav.map(n => <button className={page === n ? 'active' : ''} onClick={() => setPage(n)} key={n}>{n}</button>)}</nav><div className="side-footer">Private by default<br />Saved on this device</div></aside><main><header><div><p className="eyebrow">PERSONAL STUDY DASHBOARD</p><h1>{page === 'Timetable' ? 'Plan the day, then do it.' : page}</h1></div><div className="header-right"><label className="date"><span>Viewing</span><input type="date" value={date} onChange={e => pickDate(e.target.value)} /></label><span className="ist-clock">{istTime} IST</span></div></header>
  {page === 'Timetable' && <div className="timetable-layout"><div className="cal-col"><Calendar month={calMonth} onMonth={shiftMonth} todayStr={today()} selected={date} off={data.dayOff} marks={{}} onPick={pickDate} /><div className="cal-key"><span className="key-dot off" />Off day<span className="key-dot today" />Today</div></div><section className="panel"><div className="panel-head"><div><h2>Day plan</h2><p className="muted">{weekdayFull} · IST</p></div>{editing ? <button onClick={finishEdit}>Save day</button> : <button onClick={startEdit}>Edit day</button>}</div><div className="day-type"><button className={!isOff ? 'active' : ''} onClick={() => setDayType(false)}>Class day</button><button className={isOff ? 'active' : ''} onClick={() => setDayType(true)}>Off day</button></div><div className="day-actions"><button className="ghost" onClick={makeClassDefault}>Save as class-day default</button>{editing && data.dayTimetables[date] && <button className="ghost" onClick={resetDay}>Reset this day</button>}</div><div className="timetable-list">{(editing ? draft : effective).map(t => <div className={`schedule${!editing && data.completed[date]?.[t.id] ? ' done' : ''}`} key={t.id}>{editing ? <div className="times"><input className="time" type="time" value={t.start} onChange={e => patchDraft(t.id, 'start', e.target.value)} /><input className="time" type="time" value={t.end} onChange={e => patchDraft(t.id, 'end', e.target.value)} /></div> : <time>{t.start}<br />{t.end}</time>}<span className={`dot ${t.category.toLowerCase()}`} />{editing ? <div className="sch-body"><input className="title" value={t.title} onChange={e => patchDraft(t.id, 'title', e.target.value)} /><select className="cat" value={t.category} onChange={e => patchDraft(t.id, 'category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div> : <div><strong>{t.title}</strong><small>{t.category}</small></div>}<div className="sch-right"><input type="checkbox" aria-label={`Mark ${t.title} done`} checked={!!data.completed[date]?.[t.id]} onChange={() => toggleDone(t.id)} />{editing && <button className="ghost del" onClick={() => removeEntry(t.id)}>×</button>}</div></div>)}</div>{editing && <form className="form add-entry" onSubmit={addEntry}><input type="time" value={addForm.start} onChange={e => setAddForm({ ...addForm, start: e.target.value })} required /><input type="time" value={addForm.end} onChange={e => setAddForm({ ...addForm, end: e.target.value })} required /><input placeholder="Title" value={addForm.title} onChange={e => setAddForm({ ...addForm, title: e.target.value })} required /><select value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select><button>Add</button></form>}{!editing && <p className="muted done-note">{doneCount} of {effective.length} completed for this day</p>}</section></div>}
  {page === 'Study' && <div className="timetable-layout"><Calendar month={calMonth} onMonth={shiftMonth} todayStr={today()} selected={date} off={data.dayOff} marks={studyMarks} onPick={pickDate} /><section className="panel"><div className="panel-head"><div><h2>Daily study log</h2><p className="muted">{weekdayFull} · IST</p></div></div><p className="muted">Pick a day on the calendar, then tell it how your study went.</p><StudyLogForm log={data.studyLog?.[date]} onSave={saveLog} /></section></div>}
  {page === 'Habits' && <section className="panel"><div className="panel-head"><div><h2>Habit tracker</h2><p className="muted">Enter today’s completed amount.</p></div><button onClick={() => { const name = prompt('New habit name'); if (name) update({ ...data, habits: [...data.habits, { id: crypto.randomUUID(), name, target: 1, unit: 'times', dates: {} }] }) }}>+ New habit</button></div><div className="habit-list">{data.habits.map(h => { const amount = h.dates[date] || 0; const pct = amount / h.target * 100; return <div className="habit" key={h.id}><div><strong>{h.name}</strong><small>Goal: {h.target} {h.unit}</small></div><div className="habit-progress"><Progress value={pct} /><span>{Math.round(Math.min(pct, 100))}%</span></div><input aria-label={`${h.name} amount`} type="number" min="0" value={amount} onChange={e => setHabit(h.id, e.target.value)} /></div> })}</div></section>}
  {page === 'Reports' && <><div className="stats"><Card title="Weekly study" value={`${weeklyMinutes.reduce((a, b) => a + b, 0)} min`} note="Rolling seven days" /><Card title="Daily average" value={`${Math.round(weeklyMinutes.reduce((a, b) => a + b, 0) / 7)} min`} note="Rolling seven days" /><Card title="Sessions" value={data.sessions.length} note="All time" /></div><section className="panel"><div className="panel-head"><div><h2>Study rhythm</h2><p className="muted">Minutes logged during the last seven days</p></div></div><div className="bar-chart">{weeklyMinutes.map((v, i) => <div className="bar" key={weekDays[i]}><span>{v || ''}</span><i style={{ height: `${Math.max(4, v / chartMax * 100)}%` }} /><small>{WEEK[dateFromIST(weekDays[i]).getUTCDay()]}</small></div>)}</div></section></>}
  {page === 'Import & backup' && <div className="two-col"><section className="panel"><h2>Import a spreadsheet</h2><p className="muted">Import the first sheet of an .xlsx, .xls, or .csv file. Recognized columns: Date, Subject (or Task), and Minutes (or Duration).</p><label className="upload">Choose spreadsheet<input type="file" accept=".xlsx,.xls,.csv" onChange={importFile} /></label></section><section className="panel"><h2>Your data, your device</h2><p className="muted">Everything is stored in this browser’s local storage. Export a backup before clearing your browser data.</p><button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'focusboard-backup.json'; a.click(); }}>Download backup</button></section></div>}
  </main></div>;
}
createRoot(document.getElementById('root')).render(<App />);
