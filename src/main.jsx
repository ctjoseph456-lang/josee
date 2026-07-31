import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import './styles.css';

const today = () => new Date().toISOString().slice(0, 10);
const initial = {
  habits: [
    { id: 'h1', name: 'Morning revision', target: 30, unit: 'min', dates: {} },
    { id: 'h2', name: 'Exercise', target: 20, unit: 'min', dates: {} },
    { id: 'h3', name: 'Read', target: 15, unit: 'pages', dates: {} }
  ],
  sessions: [],
  timetable: [
    { id: 't1', start: '07:00', end: '08:00', title: 'Morning revision', category: 'Study' },
    { id: 't2', start: '10:00', end: '12:00', title: 'Deep study block', category: 'Study' },
    { id: 't3', start: '17:00', end: '18:00', title: 'Practice questions', category: 'Practice' }
  ]
};
function load() { try { return JSON.parse(localStorage.getItem('study-dashboard-data')) || initial; } catch { return initial; } }
function save(data) { localStorage.setItem('study-dashboard-data', JSON.stringify(data)); }
function Card({ title, value, note, children }) { return <section className="card"><p className="eyebrow">{title}</p><strong className="metric">{value}</strong>{note && <p className="muted">{note}</p>}{children}</section>; }
function Progress({ value }) { return <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>; }

function App() {
  const [data, setData] = useState(load);
  const [page, setPage] = useState('Today');
  const [date, setDate] = useState(today());
  const [session, setSession] = useState({ subject: '', minutes: '', date: today() });
  const update = (next) => { setData(next); save(next); };
  const completedHabits = data.habits.filter(h => (h.dates[date] || 0) >= h.target).length;
  const dayMinutes = data.sessions.filter(s => s.date === date).reduce((sum, s) => sum + Number(s.minutes), 0);
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d.toISOString().slice(0,10); });
  const weeklyMinutes = weekDays.map(d => data.sessions.filter(s => s.date === d).reduce((n,s) => n + Number(s.minutes),0));
  const addSession = (e) => { e.preventDefault(); if (!session.subject || !session.minutes) return; update({ ...data, sessions: [...data.sessions, { ...session, id: crypto.randomUUID() }] }); setSession({ subject: '', minutes: '', date }); };
  const setHabit = (id, raw) => update({ ...data, habits: data.habits.map(h => h.id === id ? { ...h, dates: { ...h.dates, [date]: Math.max(0, Number(raw) || 0) } } : h) });
  const importFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const normalized = rows.map((r, i) => ({ id: crypto.randomUUID(), subject: r.Subject || r.subject || r.Task || r.task || `Imported item ${i + 1}`, minutes: Number(r.Minutes || r.minutes || r.Duration || r.duration || 0), date: String(r.Date || r.date || today()).slice(0, 10) })).filter(r => r.minutes);
    update({ ...data, sessions: [...data.sessions, ...normalized] }); alert(`${normalized.length} study records imported from ${file.name}.`);
  };
  const nav = ['Today', 'Study', 'Habits', 'Reports', 'Import & backup'];
  const chartMax = Math.max(...weeklyMinutes, 60);
  return <div className="app-shell"><aside><div className="brand"><span>✦</span> Focusboard</div><p className="side-copy">A quiet place for your routine.</p><nav>{nav.map(n => <button className={page === n ? 'active' : ''} onClick={() => setPage(n)} key={n}>{n}</button>)}</nav><div className="side-footer">Private by default<br />Saved on this device</div></aside><main><header><div><p className="eyebrow">PERSONAL STUDY DASHBOARD</p><h1>{page === 'Today' ? 'Good day — make it count.' : page}</h1></div><label className="date"><span>Viewing</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label></header>
  {page === 'Today' && <><div className="stats"><Card title="Study time" value={`${dayMinutes} min`} note="Logged today"/><Card title="Habits complete" value={`${completedHabits}/${data.habits.length}`} note="For this day"/><Card title="Week total" value={`${weeklyMinutes.reduce((a,b)=>a+b,0)} min`} note="Last seven days"/></div><div className="two-col"><section className="panel"><div className="panel-head"><h2>Today’s timetable</h2><button className="text" onClick={() => setPage('Study')}>Manage study →</button></div>{data.timetable.map(t => <div className="schedule" key={t.id}><time>{t.start}<br />{t.end}</time><span className={`dot ${t.category.toLowerCase()}`}/><div><strong>{t.title}</strong><small>{t.category}</small></div></div>)}</section><section className="panel accent"><p className="eyebrow">DAILY INTENTION</p><h2>Small, deliberate work compounds.</h2><p>Log a session or mark a habit when you finish it. Your weekly view will take care of the rest.</p><button onClick={() => setPage('Habits')}>Update habits</button></section></div></>}
  {page === 'Study' && <div className="two-col"><section className="panel"><h2>Log study session</h2><form onSubmit={addSession} className="form"><input required placeholder="Subject or task" value={session.subject} onChange={e=>setSession({...session,subject:e.target.value})}/><input required type="number" min="1" placeholder="Minutes" value={session.minutes} onChange={e=>setSession({...session,minutes:e.target.value})}/><input type="date" value={session.date} onChange={e=>setSession({...session,date:e.target.value})}/><button>Add session</button></form></section><section className="panel"><h2>Study timetable</h2>{data.timetable.map(t => <div className="schedule" key={t.id}><time>{t.start}<br/>{t.end}</time><div><strong>{t.title}</strong><small>{t.category}</small></div></div>)}</section></div>}
  {page === 'Habits' && <section className="panel"><div className="panel-head"><div><h2>Habit tracker</h2><p className="muted">Enter today’s completed amount.</p></div><button onClick={() => { const name=prompt('New habit name'); if(name) update({...data, habits:[...data.habits,{id:crypto.randomUUID(),name,target:1,unit:'times',dates:{}}]}) }}>+ New habit</button></div><div className="habit-list">{data.habits.map(h => { const amount = h.dates[date] || 0; const pct=amount/h.target*100; return <div className="habit" key={h.id}><div><strong>{h.name}</strong><small>Goal: {h.target} {h.unit}</small></div><div className="habit-progress"><Progress value={pct}/><span>{Math.round(Math.min(pct,100))}%</span></div><input aria-label={`${h.name} amount`} type="number" min="0" value={amount} onChange={e=>setHabit(h.id,e.target.value)}/></div> })}</div></section>}
  {page === 'Reports' && <><div className="stats"><Card title="Weekly study" value={`${weeklyMinutes.reduce((a,b)=>a+b,0)} min`} note="Rolling seven days"/><Card title="Daily average" value={`${Math.round(weeklyMinutes.reduce((a,b)=>a+b,0)/7)} min`} note="Rolling seven days"/><Card title="Sessions" value={data.sessions.length} note="All time"/></div><section className="panel"><div className="panel-head"><div><h2>Study rhythm</h2><p className="muted">Minutes logged during the last seven days</p></div></div><div className="bar-chart">{weeklyMinutes.map((v,i)=><div className="bar" key={weekDays[i]}><span>{v || ''}</span><i style={{height:`${Math.max(4,v/chartMax*100)}%`}}/><small>{new Date(weekDays[i]).toLocaleDateString(undefined,{weekday:'short'})}</small></div>)}</div></section></>}
  {page === 'Import & backup' && <div className="two-col"><section className="panel"><h2>Import a spreadsheet</h2><p className="muted">Import the first sheet of an .xlsx, .xls, or .csv file. Recognized columns: Date, Subject (or Task), and Minutes (or Duration).</p><label className="upload">Choose spreadsheet<input type="file" accept=".xlsx,.xls,.csv" onChange={importFile}/></label></section><section className="panel"><h2>Your data, your device</h2><p className="muted">Everything is stored in this browser’s local storage. Export a backup before clearing your browser data.</p><button onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='focusboard-backup.json';a.click();}}>Download backup</button></section></div>}
  </main></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
