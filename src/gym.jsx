import React, { useEffect, useState } from 'react';
import { Calendar, addDays, dateFromIST, today } from './lib.jsx';

const UID = () => (window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Glutes', 'Core', 'Forearms', 'Cardio'];
const EQUIP = ['Machine', 'Dumbbell', 'Barbell', 'Cable', 'Bodyweight', 'Smith Machine'];
const REST_PRESETS = [30, 45, 60, 90, 120, 180];
const LIBRARY = [
  { n: 'Bench Press', m: 'Chest', e: 'Barbell' }, { n: 'Incline Bench Press', m: 'Chest', e: 'Barbell' }, { n: 'Dumbbell Press', m: 'Chest', e: 'Dumbbell' }, { n: 'Cable Fly', m: 'Chest', e: 'Cable' }, { n: 'Push-up', m: 'Chest', e: 'Bodyweight' }, { n: 'Smith Bench Press', m: 'Chest', e: 'Smith Machine' },
  { n: 'Pull-up', m: 'Back', e: 'Bodyweight' }, { n: 'Lat Pulldown', m: 'Back', e: 'Machine' }, { n: 'Barbell Row', m: 'Back', e: 'Barbell' }, { n: 'Seated Cable Row', m: 'Back', e: 'Cable' }, { n: 'Dumbbell Row', m: 'Back', e: 'Dumbbell' },
  { n: 'Overhead Press', m: 'Shoulders', e: 'Barbell' }, { n: 'Dumbbell Shoulder Press', m: 'Shoulders', e: 'Dumbbell' }, { n: 'Lateral Raise', m: 'Shoulders', e: 'Dumbbell' }, { n: 'Face Pull', m: 'Shoulders', e: 'Cable' }, { n: 'Rear Delt Fly', m: 'Shoulders', e: 'Machine' },
  { n: 'Barbell Curl', m: 'Biceps', e: 'Barbell' }, { n: 'Dumbbell Curl', m: 'Biceps', e: 'Dumbbell' }, { n: 'Cable Curl', m: 'Biceps', e: 'Cable' }, { n: 'Preacher Curl', m: 'Biceps', e: 'Machine' },
  { n: 'Close-Grip Bench', m: 'Triceps', e: 'Barbell' }, { n: 'Triceps Pushdown', m: 'Triceps', e: 'Cable' }, { n: 'Overhead Extension', m: 'Triceps', e: 'Dumbbell' }, { n: 'Dips', m: 'Triceps', e: 'Bodyweight' },
  { n: 'Squat', m: 'Legs', e: 'Barbell' }, { n: 'Front Squat', m: 'Legs', e: 'Barbell' }, { n: 'Leg Press', m: 'Legs', e: 'Machine' }, { n: 'Leg Extension', m: 'Legs', e: 'Machine' }, { n: 'Romanian Deadlift', m: 'Legs', e: 'Barbell' }, { n: 'Lunges', m: 'Legs', e: 'Dumbbell' }, { n: 'Hamstring Curl', m: 'Legs', e: 'Machine' }, { n: 'Calf Raise', m: 'Legs', e: 'Machine' },
  { n: 'Hip Thrust', m: 'Glutes', e: 'Barbell' }, { n: 'Glute Bridge', m: 'Glutes', e: 'Bodyweight' }, { n: 'Glute Kickback', m: 'Glutes', e: 'Cable' },
  { n: 'Plank', m: 'Core', e: 'Bodyweight' }, { n: 'Crunch', m: 'Core', e: 'Bodyweight' }, { n: 'Hanging Leg Raise', m: 'Core', e: 'Bodyweight' }, { n: 'Cable Crunch', m: 'Core', e: 'Cable' },
  { n: 'Wrist Curl', m: 'Forearms', e: 'Dumbbell' }, { n: "Farmer's Carry", m: 'Forearms', e: 'Dumbbell' },
  { n: 'Treadmill', m: 'Cardio', e: 'Machine' }, { n: 'Cycling', m: 'Cardio', e: 'Machine' }, { n: 'Rowing Machine', m: 'Cardio', e: 'Machine' }, { n: 'Jump Rope', m: 'Cardio', e: 'Bodyweight' }
];
const loadActive = () => { try { return JSON.parse(localStorage.getItem('focusboard-active-workout')) || null; } catch { return null; } };
const saveActive = (w) => { if (w) localStorage.setItem('focusboard-active-workout', JSON.stringify(w)); else localStorage.removeItem('focusboard-active-workout'); };
const dispW = (kg, u) => { if (kg === '' || kg === null || kg === undefined) return ''; const v = u === 'lbs' ? kg * 2.2046226 : kg; return Math.round(v * 10) / 10; };
const storeW = (v, u) => { const n = Number(v); if (!n || n < 0) return ''; const kg = u === 'lbs' ? n / 2.2046226 : n; return Math.round(kg * 100) / 100; };
const prevSetsFor = (data, name) => {
  const ws = data.gym.workouts || [];
  for (let i = ws.length - 1; i >= 0; i--) {
    const ex = (ws[i].exercises || []).find(e => e.name.toLowerCase() === String(name).toLowerCase());
    if (ex && ex.sets && ex.sets.length) return ex.sets;
  }
  return null;
};
const workoutVolume = (w) => (w.exercises || []).reduce((t, ex) => t + (ex.sets || []).reduce((s, x) => s + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0), 0);
const bestWeightBefore = (data, name, uptoIndex) => { let b = 0; (data.gym.workouts || []).forEach((w, i) => { if (i >= uptoIndex) return; (w.exercises || []).forEach(ex => { if (ex.name.toLowerCase() === String(name).toLowerCase()) (ex.sets || []).forEach(s => { const wgt = Number(s.weight) || 0; if (wgt > b) b = wgt; }); }); }); return b; };
const epley = (w, r) => { if (!w || !r) return 0; return w * (1 + r / 30); };
const best1RMBefore = (data, name, uptoIndex) => { let b = 0; (data.gym.workouts || []).forEach((w, i) => { if (i >= uptoIndex) return; (w.exercises || []).forEach(ex => { if (ex.name.toLowerCase() === String(name).toLowerCase()) (ex.sets || []).forEach(s => { const e = epley(Number(s.weight) || 0, Number(s.reps) || 0); if (e > b) b = e; }); }); }); return b; };

export function Gym({ data, update }) {
  const units = (data.gym.settings || {}).units || 'kg';
  const [view, setView] = useState('dashboard');
  const [active, setActive] = useState(null);
  const [libOpen, setLibOpen] = useState(null);
  const [libQ, setLibQ] = useState('');
  const [libCat, setLibCat] = useState('All');
  const [libEquip, setLibEquip] = useState('All');
  const [rest, setRest] = useState(null);
  const [restNow, setRestNow] = useState(Date.now());
  const [summary, setSummary] = useState(null);
  const [toast, setToast] = useState('');
  const [bw, setBw] = useState({ date: today(), weight: '', notes: '' });
  const [histQ, setHistQ] = useState('');
  const [histView, setHistView] = useState(null);
  const [libQ2, setLibQ2] = useState('');
  const [tmplQ, setTmplQ] = useState('');
  useEffect(() => {
    const t = setInterval(() => { setRestNow(Date.now()); }, 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { const a = loadActive(); if (a) setActive(a); }, []);
  useEffect(() => {
    if (rest && rest.end <= restNow) {
      const exName = (active?.exercises || []).find(e => e.id === rest.exId)?.name;
      beep(); setToast(`Rest over — ${exName || 'exercise'}`); setRest(null);
    }
  }, [restNow]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);
  const updateGym = (g) => update({ ...data, gym: g });
  const showToast = (m) => setToast(m);
  const startWorkout = () => { const w = { id: UID(), name: '', date: today(), startTime: Date.now(), endTime: null, durationMin: 0, notes: '', exercises: [] }; saveActive(w); setActive(w); setView('workout'); };
  const startFromTemplate = (t) => { const w = { id: UID(), name: t.name, date: today(), startTime: Date.now(), endTime: null, durationMin: 0, notes: '', exercises: t.exercises.map(ex => ({ ...ex, id: UID(), notes: '', sets: ex.sets.map(s => ({ id: UID(), weight: '', reps: s.reps || '', done: false })) })) }; saveActive(w); setActive(w); setView('workout'); };
  const setActiveSave = (w) => { setActive(w); saveActive(w); };
  const addExercise = (lib) => { const prev = prevSetsFor(data, lib.n); const sets = prev ? prev.map(s => ({ id: UID(), weight: '', reps: s.reps, done: false })) : [{ id: UID(), weight: '', reps: '', done: false }]; const ex = { id: UID(), name: lib.n, muscle: lib.m, equipment: lib.e, notes: '', restSec: 90, sets }; if (!active) { const w = { id: UID(), name: '', date: today(), startTime: Date.now(), endTime: null, durationMin: 0, notes: '', exercises: [ex] }; saveActive(w); setActive(w); setView('workout'); } else setActiveSave({ ...active, exercises: [...active.exercises, ex] }); setLibOpen(null); };
  const replaceExercise = (lib) => { setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === libOpen.replaceId ? { ...e, name: lib.n, muscle: lib.m, equipment: lib.e } : e) }); setLibOpen(null); };
  const deleteExercise = (id) => setActiveSave({ ...active, exercises: active.exercises.filter(e => e.id !== id) });
  const addSet = (exId) => setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === exId ? { ...e, sets: [...e.sets, { id: UID(), weight: '', reps: '', done: false }] } : e) });
  const patchSet = (exId, setId, field, value) => setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === exId ? { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, [field]: value } : s) } : e) });
  const patchEx = (exId, field, value) => setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e) });
  const startRest = (exId, secs) => { setRest({ exId, end: Date.now() + secs * 1000, total: secs }); };
  const finishWorkout = () => {
    const a = active; const dur = Math.max(1, Math.round((Date.now() - a.startTime) / 60000));
    const totalSets = a.exercises.reduce((t, ex) => t + ex.sets.length, 0);
    const totalReps = a.exercises.reduce((t, ex) => t + ex.sets.reduce((s, x) => s + (Number(x.reps) || 0), 0), 0);
    const vol = workoutVolume(a);
    const prs = a.exercises.filter(ex => (ex.sets || []).some(s => { const w = Number(s.weight) || 0; return w && w > bestWeightBefore(data, ex.name, data.gym.workouts.length); })).map(ex => ex.name);
    setSummary({ durationMin: dur, exercises: a.exercises.length, sets: totalSets, reps: totalReps, volume: vol, prs, calories: Math.round(dur * 5 + totalReps * 0.5) });
  };
  const saveWorkout = () => {
    const a = { ...active, name: active.name || `Workout — ${active.date}`, durationMin: summary.durationMin, endTime: Date.now() };
    updateGym({ ...data.gym, workouts: [...data.gym.workouts, a] });
    saveActive(null); setActive(null); setSummary(null); setView('dashboard'); showToast('Workout saved');
  };
  const discardWorkout = () => { saveActive(null); setActive(null); setSummary(null); setView('dashboard'); showToast('Workout discarded'); };
  const addWeight = (e) => { e.preventDefault(); const n = Number(bw.weight); if (!n) return; updateGym({ ...data.gym, bodyWeight: [...data.gym.bodyWeight, { id: UID(), date: bw.date, weight: n, notes: bw.notes.trim() }] }); setBw({ date: today(), weight: '', notes: '' }); showToast('Weight added'); };
  const deleteWeight = (id) => updateGym({ ...data.gym, bodyWeight: data.gym.bodyWeight.filter(x => x.id !== id) });
  const saveAsTemplate = () => { const n = prompt('Template name', active.name || 'New template'); if (n) updateGym({ ...data.gym, templates: [...data.gym.templates, { id: UID(), name: n, exercises: active.exercises.map(ex => ({ name: ex.name, muscle: ex.muscle, equipment: ex.equipment, restSec: ex.restSec, sets: ex.sets.filter(s => s.weight !== '' || s.reps !== '').map(s => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 })) })) }] }); };
  const cloneTemplate = (t) => updateGym({ ...data.gym, templates: [...data.gym.templates, { ...t, id: UID(), name: t.name + ' (copy)' }] });
  const renameTemplate = (t) => { const n = prompt('Template name', t.name); if (n) updateGym({ ...data.gym, templates: data.gym.templates.map(x => x.id === t.id ? { ...x, name: n } : x) }); };
  const deleteTemplate = (t) => { if (confirm(`Delete template "${t.name}"?`)) updateGym({ ...data.gym, templates: data.gym.templates.filter(x => x.id !== t.id) }); };
  const deleteWorkout = (id) => { if (confirm('Delete this workout?')) updateGym({ ...data.gym, workouts: data.gym.workouts.filter(x => x.id !== id) }); };
  const setUnits = (u) => updateGym({ ...data.gym, settings: { ...data.gym.settings, units: u } });
  const setDark = (d) => updateGym({ ...data.gym, settings: { ...data.gym.settings, dark: d } });
  const exportData = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'focusboard-backup.json'; a.click(); };
  const importData = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const j = JSON.parse(await f.text()); localStorage.setItem('study-dashboard-data', JSON.stringify({ ...j, _v: 5 })); location.reload(); } catch { alert('Invalid backup file'); } };
  const deleteAll = () => { if (confirm('Delete ALL data? This cannot be undone.')) { localStorage.removeItem('study-dashboard-data'); localStorage.removeItem('focusboard-active-workout'); location.reload(); } };
  const enterNext = (e) => { if (e.key !== 'Enter') return; e.preventDefault(); const box = e.currentTarget.closest('.sets-body'); if (!box) return; const inputs = [...box.querySelectorAll('.set-input')]; const i = inputs.indexOf(e.target); if (i >= 0 && inputs[i + 1]) inputs[i + 1].focus(); };

  const gymNav = ['Dashboard', 'Workout', 'Library', 'Templates', 'Body weight', 'History', 'Settings'];
  const wmarks = {}; (data.gym.workouts || []).forEach(w => { wmarks[w.date] = true; });
  const ws = (data.gym.workouts || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalWorkouts = ws.length;
  const weekAgo = addDays(today(), -7); const monthAgo = addDays(today(), -30);
  const weeklyVolume = (data.gym.workouts || []).filter(w => w.date >= weekAgo).reduce((t, w) => t + workoutVolume(w), 0);
  const monthlyVolume = (data.gym.workouts || []).filter(w => w.date >= monthAgo).reduce((t, w) => t + workoutVolume(w), 0);
  const streak = (() => { const set = new Set((data.gym.workouts || []).map(w => w.date)); let d = today(); if (!set.has(d)) d = addDays(d, -1); let n = 0; while (set.has(d)) { n++; d = addDays(d, -1); } return n; })();
  const lastWorkout = ws[0] || null;
  const bodyW = (data.gym.bodyWeight || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
  const recentPRs = [];
  (data.gym.workouts || []).forEach((w, i) => { (w.exercises || []).forEach(ex => { const bw = bestWeightBefore(data, ex.name, i); (ex.sets || []).forEach(s => { const wgt = Number(s.weight) || 0; if (wgt && wgt > bw) recentPRs.push({ date: w.date, exercise: ex.name, weight: wgt, reps: s.reps }); }); }); });
  const topPRs = recentPRs.slice(-5).reverse();

  const libFiltered = LIBRARY.filter(x => (libCat === 'All' || x.m === libCat) && (libEquip === 'All' || x.e === libEquip) && (libOpen ? libQ2 : libQ).toLowerCase().split(' ').every(part => x.n.toLowerCase().includes(part)));

  const bwEntries = (data.gym.bodyWeight || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const bwChart = () => {
    if (bwEntries.length < 2) return <p className="muted">Add at least two entries to see the trend.</p>;
    const W = 600, H = 160, pad = 12;
    const vals = bwEntries.map(x => Number(x.weight) || 0);
    const min = Math.min(...vals) - 2, max = Math.max(...vals) + 2;
    const x = (i) => pad + i * (W - 2 * pad) / (bwEntries.length - 1);
    const y = (v) => H - pad - (v - min) / (max - min) * (H - 2 * pad);
    const pts = bwEntries.map((e, i) => `${x(i)},${y(e.weight)}`).join(' ');
    return <svg className="bw-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="#386750" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />{bwEntries.map((e, i) => <circle key={e.id} cx={x(i)} cy={y(e.weight)} r="3.5" fill="#386750" />)}<text x={6} y={14} className="bw-label">{max.toFixed(1)}</text><text x={6} y={H - 8} className="bw-label">{min.toFixed(1)}</text></svg>;
  };

  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - restNow) / 1000)) : 0;

  return <div className="gym">
    <div className="gym-nav">{gymNav.map(v => <button key={v} className={view === v ? 'active' : ''} onClick={() => { setView(v); if (v !== 'Workout') setSummary(null); }}>{v}</button>)}</div>

    {view === 'dashboard' && <>
      <div className="stats gym-stats">
        <section className="card"><p className="eyebrow">Workout streak</p><strong className="metric">{streak}<span className="unit">d</span></strong><p className="muted">Consecutive days</p></section>
        <section className="card"><p className="eyebrow">Total workouts</p><strong className="metric">{totalWorkouts}</strong><p className="muted">{lastWorkout ? `Last: ${lastWorkout.name || lastWorkout.date}` : 'No workouts yet'}</p></section>
        <section className="card"><p className="eyebrow">Weekly volume</p><strong className="metric">{Math.round(weeklyVolume)}<span className="unit">{units === 'lbs' ? ' lb' : ' kg'}</span></strong><p className="muted">Last 7 days</p></section>
        <section className="card"><p className="eyebrow">Monthly volume</p><strong className="metric">{Math.round(monthlyVolume)}<span className="unit">{units === 'lbs' ? ' lb' : ' kg'}</span></strong><p className="muted">Last 30 days</p></section>
        <section className="card"><p className="eyebrow">Current body weight</p><strong className="metric">{bodyW ? `${bodyW.weight}` : '—'}<span className="unit">{units === 'lbs' ? ' lb' : ' kg'}</span></strong><p className="muted">{bodyW ? bodyW.date : 'Not logged yet'}</p></section>
        <section className="card"><p className="eyebrow">Last workout</p><strong className="metric">{lastWorkout ? new Date(dateFromIST(lastWorkout.date)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</strong><p className="muted">{lastWorkout ? `${lastWorkout.exercises.length} exercises · ${Math.round(workoutVolume(lastWorkout))} ${units}` : ''}</p></section>
      </div>
      <div className="timetable-layout">
        <div className="cal-col"><Calendar month={today().slice(0, 7)} onMonth={() => {}} todayStr={today()} selected={today()} off={{}} marks={wmarks} onPick={() => {}} /><div className="cal-key"><span className="key-dot today" />Workout day</div></div>
        <div className="panel">
          <div className="panel-head"><div><h2>Start a workout</h2><p className="muted">Log in seconds — the app remembers your last weights.</p></div><button onClick={startWorkout}>Start Workout</button></div>
          <div className="pr-list">{topPRs.length ? <><h3 className="pr-title">Recent PRs</h3>{topPRs.map((p, i) => <div className="pr-item" key={i}><span className="pr-badge">New PR!</span><strong>{p.exercise}</strong><small>{p.weight} {units} × {p.reps} · {p.date}</small></div>)}</> : <p className="muted">Hit a personal record and it will show up here.</p>}</div>
        </div>
      </div>
    </>}

    {view === 'workout' && !active && <div className="panel start-panel"><h2>No active workout</h2><p className="muted">Start a fresh workout or load a template.</p><div className="row-actions"><button onClick={startWorkout}>Start Workout</button><button className="ghost" onClick={() => setView('Templates')}>From template</button></div></div>}

    {view === 'workout' && active && !summary && <>
      <div className="panel workout-head">
        <div className="workout-head-grid">
          <div className="field"><label>Workout name</label><input value={active.name} placeholder="e.g. Push A" onChange={e => setActiveSave({ ...active, name: e.target.value })} /></div>
          <div className="field"><label>Date</label><input type="date" value={active.date} onChange={e => setActiveSave({ ...active, date: e.target.value })} /></div>
          <div className="field"><label>Elapsed</label><span className="timer">{(() => { const t = Math.floor((restNow - active.startTime) / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; })()} min</span></div>
          <div className="field"><label>Notes</label><input value={active.notes} placeholder="Anything to remember..." onChange={e => setActiveSave({ ...active, notes: e.target.value })} /></div>
        </div>
        <div className="row-actions"><button className="ghost" onClick={() => setLibOpen({ mode: 'add' })}>+ Add exercise</button><button onClick={finishWorkout}>Finish workout</button></div>
      </div>
      {active.exercises.map(ex => <section className="panel ex-card" key={ex.id}>
        <div className="panel-head"><div><h2>{ex.name}</h2><p className="muted">{ex.muscle} · {ex.equipment}{rest && rest.exId === ex.id ? ` · Rest ${restLeft}s` : ''}</p></div><div className="row-actions"><button className="ghost" onClick={() => setLibOpen({ mode: 'replace', replaceId: ex.id })}>Replace</button><button className="ghost del" onClick={() => deleteExercise(ex.id)}>×</button></div></div>
        {(() => { const prev = prevSetsFor(data, ex.name) || []; const best = bestWeightBefore(data, ex.name, data.gym.workouts.length); const best1 = best1RMBefore(data, ex.name, data.gym.workouts.length); return <div className="sets-grid">
          <div className="sets-head"><span>Set</span><span>Previous</span><span>Weight ({units})</span><span>Reps</span><span>Done</span></div>
          <div className="sets-body">{ex.sets.map((s, si) => { const pw = prev[si]; const w = Number(s.weight) || 0; const r = Number(s.reps) || 0; const isPR = w > 0 && w > best; const is1PR = w > 0 && r > 0 && epley(w, r) > best1; return <div className={`sets-row${s.done ? ' done' : ''}`} key={s.id}><span className="set-num">{si + 1}</span><span className="prev">{pw ? `${dispW(pw.weight, units)} × ${pw.reps}` : ''}</span><input className="set-input" type="number" inputMode="decimal" min="0" step="0.5" placeholder="0" value={dispW(s.weight, units) === '' ? '' : dispW(s.weight, units)} onChange={e => patchSet(ex.id, s.id, 'weight', storeW(e.target.value, units))} onKeyDown={enterNext} /><input className="set-input" type="number" inputMode="numeric" min="0" placeholder="0" value={s.reps} onChange={e => patchSet(ex.id, s.id, 'reps', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} onKeyDown={enterNext} /><input type="checkbox" checked={!!s.done} onChange={() => patchSet(ex.id, s.id, 'done', !s.done)} />{isPR && <span className="pr-tag">New PR!</span>}{is1PR && !isPR && <span className="pr-tag">1RM PR!</span>}</div>; })}</div>
          <div className="row-actions"><button className="ghost" onClick={() => addSet(ex.id)}>+ Add Set</button></div>
        </div>; })()}
        <div className="ex-notes"><input className="set-input" placeholder={`Notes for ${ex.name} (form, grip, etc.)`} value={ex.notes} onChange={e => patchEx(ex.id, 'notes', e.target.value)} /></div>
        <div className="rest-row"><span className="muted">Rest timer</span>{REST_PRESETS.map(s => <button key={s} className={`ghost${rest && rest.exId === ex.id && rest.total === s ? ' active' : ''}`} onClick={() => startRest(ex.id, s)}>{s}s</button>)}<button className="ghost" onClick={() => startRest(ex.id, Number(prompt('Rest seconds', '60')) || 60)}>Custom</button></div>
      </section>)}
      {!active.exercises.length && <div className="panel"><p className="muted">No exercises yet — add one from the library.</p><button className="ghost" onClick={() => setLibOpen({ mode: 'add' })}>+ Add exercise</button></div>}
    </>}

    {view === 'Library' && <div className="panel"><div className="panel-head"><div><h2>Exercise library</h2><p className="muted">Search or filter to find an exercise.</p></div></div><div className="lib-controls"><input className="lib-search" placeholder="Search exercises..." value={libQ} onChange={e => setLibQ(e.target.value)} /><select className="cat" value={libCat} onChange={e => setLibCat(e.target.value)}><option>All</option>{MUSCLES.map(m => <option key={m}>{m}</option>)}</select><select className="cat" value={libEquip} onChange={e => setLibEquip(e.target.value)}><option>All</option>{EQUIP.map(m => <option key={m}>{m}</option>)}</select></div><div className="lib-grid">{libFiltered.map(x => <button className="lib-item" key={x.n} onClick={() => addExercise(x)}><strong>{x.n}</strong><small>{x.m} · {x.e}</small></button>)}</div></div>}

    {view === 'Templates' && <div className="panel"><div className="panel-head"><div><h2>Templates</h2><p className="muted">Start a workout from a template, or build your own.</p></div>{active && <button onClick={saveAsTemplate}>Save current workout</button>}</div><input className="lib-search" placeholder="Search templates..." value={tmplQ} onChange={e => setTmplQ(e.target.value)} /><div className="tmpl-grid">{(data.gym.templates || []).filter(t => t.name.toLowerCase().includes(tmplQ.toLowerCase())).map(t => <div className="tmpl-card" key={t.id}><strong>{t.name}</strong><small>{t.exercises.length} exercises</small><div className="row-actions"><button className="ghost" onClick={() => startFromTemplate(t)}>Start</button><button className="ghost" onClick={() => cloneTemplate(t)}>Clone</button><button className="ghost" onClick={() => renameTemplate(t)}>Rename</button><button className="ghost del" onClick={() => deleteTemplate(t)}>Delete</button></div></div>)}</div></div>}

    {view === 'Body weight' && <div className="two-col"><section className="panel"><h2>Add weight</h2><form className="form" onSubmit={addWeight}><label className="log-field"><span>Date</span><input type="date" value={bw.date} onChange={e => setBw({ ...bw, date: e.target.value })} /></label><label className="log-field"><span>Weight ({units})</span><input type="number" min="0" step="0.1" placeholder="e.g. 70.5" value={bw.weight} onChange={e => setBw({ ...bw, weight: e.target.value })} required /></label><label className="log-field"><span>Notes</span><input placeholder="Optional" value={bw.notes} onChange={e => setBw({ ...bw, notes: e.target.value })} /></label><button>Add weight</button></form></section><section className="panel"><h2>Progress</h2>{bwChart()}<div className="bw-list">{bwEntries.slice().reverse().map(x => <div className="bw-item" key={x.id}><strong>{x.weight} {units}</strong><small>{x.date}{x.notes ? ` · ${x.notes}` : ''}</small><button className="ghost del" onClick={() => deleteWeight(x.id)}>×</button></div>)}</div></section></div>}

    {view === 'History' && <div className="panel"><div className="panel-head"><div><h2>Workout history</h2><p className="muted">Every previous workout.</p></div></div><input className="lib-search" placeholder="Search workouts..." value={histQ} onChange={e => setHistQ(e.target.value)} />{histView ? <div className="hist-detail"><div className="row-actions"><button className="ghost" onClick={() => setHistView(null)}>← Back</button><button className="ghost del" onClick={() => { deleteWorkout(histView.id); setHistView(null); }}>Delete</button></div><h2>{histView.name || histView.date}</h2><p className="muted">{histView.date} · {histView.durationMin} min · {Math.round(workoutVolume(histView))} {units} volume{histView.notes ? ` · ${histView.notes}` : ''}</p>{histView.exercises.map(ex => <div className="hist-ex" key={ex.id}><strong>{ex.name}</strong><small>{ex.muscle}</small>{ex.sets.map((s, i) => <span className="hist-set" key={s.id}>{i + 1}. {dispW(s.weight, units)} {units} × {s.reps}{s.done ? ' ✓' : ''}</span>)}</div>)}</div> : <div className="hist-list">{ws.filter(w => (w.name || '').toLowerCase().includes(histQ.toLowerCase()) || (w.date || '').includes(histQ)).map(w => <button className="hist-item" key={w.id} onClick={() => setHistView(w)}><strong>{w.name || w.date}</strong><small>{w.date} · {w.exercises.length} exercises · {Math.round(workoutVolume(w))} {units}</small></button>)}</div>}</div>}

    {view === 'Settings' && <div className="two-col"><section className="panel"><h2>Units</h2><div className="day-type"><button className={units === 'kg' ? 'active' : ''} onClick={() => setUnits('kg')}>Kilograms (kg)</button><button className={units === 'lbs' ? 'active' : ''} onClick={() => setUnits('lbs')}>Pounds (lbs)</button></div></section><section className="panel"><h2>Appearance</h2><div className="day-type"><button className={data.gym.settings.dark ? 'active' : ''} onClick={() => setDark(true)}>Dark mode</button><button className={!data.gym.settings.dark ? 'active' : ''} onClick={() => setDark(false)}>Light mode</button></div></section><section className="panel"><h2>Data</h2><div className="row-actions"><button className="ghost" onClick={exportData}>Export data</button><label className="ghost upload-ghost">Import data<input type="file" accept=".json" onChange={importData} /></label><button className="ghost del" onClick={deleteAll}>Delete all data</button></div><p className="muted">Everything is stored on this device and works offline. Export a backup regularly.</p></section></div>}

    {libOpen && <div className="gym-overlay" onClick={() => setLibOpen(null)}><div className="gym-modal" onClick={e => e.stopPropagation()}><div className="panel-head"><div><h2>{libOpen.mode === 'replace' ? 'Replace exercise' : 'Add exercise'}</h2><p className="muted">Pick from the library.</p></div><button className="ghost del" onClick={() => setLibOpen(null)}>×</button></div><input className="lib-search" placeholder="Search exercises..." value={libQ2} onChange={e => setLibQ2(e.target.value)} /><div className="lib-grid modal">{libFiltered.map(x => <button className="lib-item" key={x.n} onClick={() => libOpen.mode === 'replace' ? replaceExercise(x) : addExercise(x)}><strong>{x.n}</strong><small>{x.m} · {x.e}</small></button>)}</div></div></div>}

    {summary && <div className="gym-overlay"><div className="gym-modal"><h2>Workout complete</h2><div className="sum-grid"><div className="sum-cell"><span>Duration</span><strong>{summary.durationMin} min</strong></div><div className="sum-cell"><span>Exercises</span><strong>{summary.exercises}</strong></div><div className="sum-cell"><span>Sets</span><strong>{summary.sets}</strong></div><div className="sum-cell"><span>Total reps</span><strong>{summary.reps}</strong></div><div className="sum-cell"><span>Total volume</span><strong>{Math.round(summary.volume)} {units}</strong></div><div className="sum-cell"><span>PRs broken</span><strong>{summary.prs.length}</strong></div><div className="sum-cell"><span>Calories (est.)</span><strong>{summary.calories}</strong></div></div>{summary.prs.length ? <p className="pr-badge">New PRs: {summary.prs.join(', ')}</p> : null}<div className="row-actions"><button className="ghost" onClick={discardWorkout}>Discard</button><button onClick={saveWorkout}>Save workout</button></div></div></div>}

    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.25;
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.18);
    });
  } catch { /* audio blocked */ }
}
