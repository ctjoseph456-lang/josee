import React, { useEffect, useRef, useState } from 'react';
import { addDays, dateFromIST, today } from './lib.jsx';
import { EXERCISES, MUSCLES, EQUIPMENT, DIFFICULTY, MOVEMENT, FORCE } from './exercises.js';

const UID = () => (window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const REST_PRESETS = [30, 45, 60, 90, 120, 180];
const loadActive = () => { try { return JSON.parse(localStorage.getItem('focusboard-active-workout')) || null; } catch { return null; } };
const saveActive = (w) => { if (w) localStorage.setItem('focusboard-active-workout', JSON.stringify(w)); else localStorage.removeItem('focusboard-active-workout'); };
const dispW = (kg, u) => { if (kg === '' || kg === null || kg === undefined) return ''; const v = u === 'lbs' ? kg * 2.2046226 : kg; return Math.round(v * 10) / 10; };
const storeW = (v, u) => { const n = Number(v); if (!n || n < 0) return ''; const kg = u === 'lbs' ? n / 2.2046226 : n; return Math.round(kg * 100) / 100; };
const prevWorkoutFor = (data, date, name) => {
  const wd = dayKeyOf(date);
  const ws = (data.gym.workouts || []).slice().reverse();
  for (const w of ws) {
    if (!w.date || dayKeyOf(w.date) !== wd) continue;
    const ex = (w.exercises || []).find(e => String(e.name).toLowerCase() === String(name).toLowerCase());
    if (ex && ex.sets && ex.sets.length) return ex.sets;
  }
  return null;
};
const workoutVolume = (w) => (w.exercises || []).reduce((t, ex) => t + (ex.sets || []).reduce((s, x) => s + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0), 0);
const bestWeightBefore = (data, name, uptoIndex) => { let b = 0; (data.gym.workouts || []).forEach((w, i) => { if (i >= uptoIndex) return; (w.exercises || []).forEach(ex => { if (String(ex.name).toLowerCase() === String(name).toLowerCase()) (ex.sets || []).forEach(s => { const wgt = Number(s.weight) || 0; if (wgt > b) b = wgt; }); }); }); return b; };
const epley = (w, r) => { if (!w || !r) return 0; return w * (1 + r / 30); };
const best1RMBefore = (data, name, uptoIndex) => { let b = 0; (data.gym.workouts || []).forEach((w, i) => { if (i >= uptoIndex) return; (w.exercises || []).forEach(ex => { if (String(ex.name).toLowerCase() === String(name).toLowerCase()) (ex.sets || []).forEach(s => { const e = epley(Number(s.weight) || 0, Number(s.reps) || 0); if (e > b) b = e; }); }); }); return b; };
const dayKeyOf = (d) => DAY_KEYS[dateFromIST(d).getUTCDay()];
const restFor = (lib) => /compound|squat|hinge|lunge|olympic|carry/i.test(lib.movement) ? 120 : 60;
const findEx = (data, name) => { const n = String(name).toLowerCase(); const c = (data.gym.custom || []).find(x => x.name.toLowerCase() === n); if (c) return c; return EXERCISES.find(x => x.name.toLowerCase() === n) || null; };
export const defaultSetsFor = (name) => { const lib = EXERCISES.find(x => x.name.toLowerCase() === String(name).toLowerCase()); const compound = lib && /compound|squat|hinge|lunge|olympic|carry/i.test(lib.movement); const reps = compound ? 8 : 12; return Array.from({ length: 2 }, () => ({ weight: '', reps })); };
export const normalizePlan = (plan) => {
  const out = {};
  DAY_KEYS.forEach(k => {
    const list = (plan && plan[k]) || [];
    out[k] = list.map(e => typeof e === 'string' ? { name: e, sets: defaultSetsFor(e) } : { name: e.name, sets: ((e.sets && e.sets.length) ? e.sets : defaultSetsFor(e.name)).map(s => ({ weight: s.weight != null ? s.weight : '', reps: s.reps != null ? s.reps : '' })) });
  });
  return out;
};
export const DEFAULT_PLAN = normalizePlan({
  monday: ['Barbell Bench Press', 'Incline Dumbbell Press', 'Cable Fly', 'Triceps Pushdown', 'Rope Pushdown', 'Hanging Leg Raise', 'Cable Crunch'],
  tuesday: ['Pull-Up', 'Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Dumbbell Curl', 'Hammer Curl', 'Concentration Curl'],
  wednesday: ['Barbell Back Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Extension', 'Calf Raise', 'Plank', 'Hanging Knee Raise'],
  thursday: ['Overhead Press', 'Dumbbell Lateral Raise', 'Face Pull', 'Rear Delt Fly', 'Barbell Shrug', 'Wrist Curl', 'Reverse Wrist Curl'],
  friday: ['Incline Barbell Bench Press', 'Dumbbell Bench Press', 'Pec Deck', 'Pull-Up', 'Barbell Row', 'Crunch', 'Bicycle Crunch'],
  saturday: ['Barbell Curl', 'Skull Crusher', 'Hammer Curl', 'Triceps Pushdown', 'Barbell Back Squat', 'Leg Press', 'Calf Raise'],
  sunday: []
});
const bmiInfo = (b) => {
  if (!b || b <= 0) return { label: '—', tone: '', verdict: '' };
  if (b < 18.5) return { label: 'Underweight', tone: 'warn', verdict: 'Below the healthy range — try adding some healthy calories and strength work.' };
  if (b < 25) return { label: 'Normal weight', tone: 'good', verdict: 'You are in the healthy range — keep up the good work!' };
  if (b < 30) return { label: 'Overweight', tone: 'warn', verdict: 'Slightly above the healthy range — a steady plan will help.' };
  return { label: 'Obese', tone: 'bad', verdict: 'Above the healthy range — a consistent routine makes a big difference.' };
};
const bmiTone = (b) => b < 18.5 || b >= 25 ? (b >= 30 ? 'bad' : 'warn') : 'good';
const guideFor = (ex) => {
  const compound = /compound|squat|hinge|lunge|olympic|carry/i.test(ex.movement);
  const push = ex.force === 'Push';
  return {
    reps: compound ? '6–10 (strength) or 8–12 (hypertrophy)' : '10–15 reps',
    rest: compound ? '2–3 minutes' : '60–90 seconds',
    tips: [
      `Set up with a firm, braced ${push ? 'pushing' : 'pulling'} position before every rep.`,
      'Move through the full range of motion while keeping control.',
      'Exhale on the effort phase and inhale during the return.',
      'Pick a weight you can move cleanly — technique first, weight second.'
    ],
    mistakes: ['Rushing the movement and losing control', 'Rounding your back or losing your brace', 'Using too much weight and shortening the range of motion'],
    safety: ['Warm up with light sets before working weight', 'Use a spotter or safeties for heavy lifts', 'Stop immediately if you feel sharp joint pain']
  };
};

export function Gym({ data, update }) {
  const units = (data.gym.settings || {}).units || 'kg';
  const heightCm = Number(data.gym.settings.height) || 0;
  const [view, setView] = useState('Start Workout');
  const [active, setActive] = useState(null);
  const [startDay, setStartDay] = useState(dayKeyOf(today()));
  const [libOpen, setLibOpen] = useState(null);
  const [libQ2, setLibQ2] = useState('');
  const [libCats, setLibCats] = useState([]);
  const [libEquip, setLibEquip] = useState('All');
  const [libDiff, setLibDiff] = useState('All');
  const [libMove, setLibMove] = useState('All');
  const [libForce, setLibForce] = useState('All');
  const [routineDay, setRoutineDay] = useState(null);
  const [repOffset, setRepOffset] = useState(0);
  const [bw, setBw] = useState({ date: today(), weight: '', height: heightCm ? String(heightCm) : '' });
  const [bwFilter, setBwFilter] = useState('30');
  const [exProg, setExProg] = useState('');
  const [rest, setRest] = useState(null);
  const [restNow, setRestNow] = useState(Date.now());
  const [summary, setSummary] = useState(null);
  const [toast, setToast] = useState('');
  const dragIdx = useRef(null);
  useEffect(() => { const t = setInterval(() => setRestNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const a = loadActive(); if (a) setActive(a); }, []);
  useEffect(() => { if (rest && rest.end <= restNow) { const exName = (active?.exercises || []).find(e => e.id === rest.exId)?.name; beep(); setToast(`Rest over — ${exName || 'exercise'}`); setRest(null); } }, [restNow]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);
  const updateGym = (g) => update({ ...data, gym: g });
  const showToast = (m) => setToast(m);

  const planFor = (day) => (data.gym.plan[day] || []);
  const savePlan = (day, list) => updateGym({ ...data.gym, plan: { ...data.gym.plan, [day]: list } });
  const focusFor = (list) => { const set = new Set(); list.forEach(en => { const e = findEx(data, en.name); if (e) set.add(e.primary); }); return [...set].join(' · ') || 'Rest day'; };
  const estMin = (list) => Math.max(1, Math.round((list.reduce((t, en) => { const lib = findEx(data, en.name) || {}; return t + en.sets.length * restFor(lib); }, 0) + list.length * 45) / 60));

  const makeExercise = (entry, date) => {
    const name = entry.name;
    const lib = findEx(data, name) || { name, primary: 'Other', equipment: '', difficulty: 'Beginner', movement: 'Isolation', force: 'Pull', position: 'Standing', secondary: [] };
    const prev = prevWorkoutFor(data, date, lib.name);
    const def = entry.sets && entry.sets.length ? entry.sets : defaultSetsFor(name);
    const sets = prev && prev.length
      ? prev.map(s => ({ id: UID(), weight: s.weight, reps: s.reps, done: false }))
      : def.map(s => ({ id: UID(), weight: s.weight != null ? s.weight : '', reps: s.reps != null ? s.reps : '', done: false }));
    return { id: UID(), name: lib.name, muscle: lib.primary || '', equipment: lib.equipment || '', notes: '', restSec: restFor(lib), sets };
  };

  const startFromDay = (day) => {
    const list = planFor(day);
    if (!list.length) { showToast('This day has no exercises yet'); return; }
    const w = { id: UID(), name: `${DAY_LABELS[DAY_KEYS.indexOf(day)]} workout`, date: today(), startTime: Date.now(), endTime: null, durationMin: 0, notes: '', exercises: list.map(e => makeExercise(e, today())) };
    saveActive(w); setActive(w); setView('Start Workout'); showToast('Workout started — good luck!');
  };
  const startBlank = () => { const w = { id: UID(), name: '', date: today(), startTime: Date.now(), endTime: null, durationMin: 0, notes: '', exercises: [] }; saveActive(w); setActive(w); setView('Start Workout'); };
  const setActiveSave = (w) => { setActive(w); saveActive(w); };
  const addToActive = (lib) => { const ex = makeExercise({ name: lib.name, sets: defaultSetsFor(lib.name) }, active.date); setActiveSave({ ...active, exercises: [...active.exercises, ex] }); showToast(`${lib.name} added`); };
  const deleteExercise = (id) => setActiveSave({ ...active, exercises: active.exercises.filter(e => e.id !== id) });
  const addSet = (exId) => setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === exId ? { ...e, sets: [...e.sets, { id: UID(), weight: '', reps: '', done: false }] } : e) });
  const patchSet = (exId, setId, field, value) => setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === exId ? { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, [field]: value } : s) } : e) });
  const removeSet = (exId, setId) => setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === exId ? { ...e, sets: e.sets.filter(s => s.id !== setId) } : e) });
  const startRest = (exId, secs) => { setRest({ exId, end: Date.now() + secs * 1000, total: secs }); };
  const enterNext = (e) => { if (e.key !== 'Enter') return; e.preventDefault(); const row = e.currentTarget.closest('.wt-row'); if (!row) return; const inputs = [...row.querySelectorAll('.set-input')]; const i = inputs.indexOf(e.target); if (i >= 0 && inputs[i + 1]) inputs[i + 1].focus(); };
  const markDone = (exId, setId, done) => { patchSet(exId, setId, 'done', done); if (done) setTimeout(() => { const row = [...document.querySelectorAll('.wt-row')].find(r => r.dataset.exid === exId); if (!row) return; const inputs = [...row.querySelectorAll('.set-input')]; const empty = inputs.find(i => i.value === '' || Number(i.value) === 0); (empty || inputs[0])?.focus(); }, 40); };
  const finishWorkout = () => { const a = active; const dur = Math.max(1, Math.round((Date.now() - a.startTime) / 60000)); const totalSets = a.exercises.reduce((t, ex) => t + ex.sets.length, 0); const totalReps = a.exercises.reduce((t, ex) => t + ex.sets.reduce((s, x) => s + (Number(x.reps) || 0), 0), 0); const vol = workoutVolume(a); const prs = a.exercises.filter(ex => (ex.sets || []).some(s => { const w = Number(s.weight) || 0; return w && w > bestWeightBefore(data, ex.name, data.gym.workouts.length); })).map(ex => ex.name); setSummary({ durationMin: dur, exercises: a.exercises.length, sets: totalSets, reps: totalReps, volume: vol, prs, calories: Math.round(dur * 5 + totalReps * 0.5) }); };
  const saveWorkout = () => { const a = { ...active, name: active.name || `Workout — ${active.date}`, durationMin: summary.durationMin, endTime: Date.now() }; updateGym({ ...data.gym, workouts: [...data.gym.workouts, a] }); saveActive(null); setActive(null); setSummary(null); setView('Reports'); showToast('Workout saved to Reports'); };
  const discardWorkout = () => { saveActive(null); setActive(null); setSummary(null); showToast('Workout discarded'); };

  const addToPlan = (day, ex) => { savePlan(day, [...planFor(day), { name: ex.name, sets: defaultSetsFor(ex.name) }]); setLibOpen(null); showToast(`${ex.name} added to ${DAY_LABELS[DAY_KEYS.indexOf(day)]}`); };
  const removePlanEx = (day, i) => savePlan(day, planFor(day).filter((_, x) => x !== i));
  const duplicatePlanEx = (day, i) => { const list = planFor(day); const copy = { ...list[i], name: `${list[i].name} (2)`, sets: list[i].sets.map(s => ({ ...s })) }; savePlan(day, [...list.slice(0, i + 1), copy, ...list.slice(i + 1)]); };
  const moveExercise = (day, from, to) => { const list = [...planFor(day)]; const [m] = list.splice(from, 1); list.splice(to, 0, m); savePlan(day, list); };
  const patchPlanSet = (day, ei, si, field, value) => savePlan(day, planFor(day).map((en, i) => i === ei ? { ...en, sets: en.sets.map((s, x) => x === si ? { ...s, [field]: value } : s) } : en));
  const addPlanSet = (day, ei) => savePlan(day, planFor(day).map((en, i) => i === ei ? { ...en, sets: [...en.sets, { weight: '', reps: '' }] } : en));
  const removePlanSet = (day, ei, si) => savePlan(day, planFor(day).map((en, i) => i === ei ? { ...en, sets: en.sets.filter((_, x) => x !== si) } : en));

  const deleteBody = (id) => updateGym({ ...data.gym, bodyWeight: data.gym.bodyWeight.filter(x => x.id !== id) });
  const saveBody = (e) => { e.preventDefault(); const w = Number(bw.weight); if (!w) return; const h = Number(bw.height) || heightCm; updateGym({ ...data.gym, bodyWeight: [...data.gym.bodyWeight, { id: UID(), date: bw.date, weight: w, height: h || undefined, notes: '' }], settings: { ...data.gym.settings, height: h || heightCm } }); setBw({ date: today(), weight: '', height: h ? String(h) : '' }); showToast('Body entry saved'); };

  const matches = (e, q) => { const words = q.toLowerCase().split(/\s+/).filter(Boolean); if (!words.length) return true; const hay = `${e.name} ${e.primary} ${(e.secondary || []).join(' ')} ${e.equipment} ${e.movement} ${e.force} ${e.difficulty}`.toLowerCase(); return words.every(w => hay.includes(w)); };
  const chipMatch = (primary, m) => { if (m === 'Chest') return /Chest/.test(primary); if (m === 'Back') return /Back/.test(primary); if (m === 'Shoulders') return /Delts|Shoulders/.test(primary); if (m === 'Abs') return primary === 'Abs' || primary === 'Core'; return primary === m; };
  const libPool = (data.gym.custom || []).concat(EXERCISES);
  const libFiltered = libPool.filter(e => (!libCats.length || libCats.some(m => chipMatch(e.primary, m))) && (libEquip === 'All' || e.equipment === libEquip) && (libDiff === 'All' || e.difficulty === libDiff) && (libMove === 'All' || e.movement === libMove) && (libForce === 'All' || e.force === libForce) && matches(e, libQ2));

  const ws = (data.gym.workouts || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalWorkouts = ws.length;
  const streak = (() => { const set = new Set(ws.map(w => w.date)); let d = today(); if (!set.has(d)) d = addDays(d, -1); let n = 0; while (set.has(d)) { n++; d = addDays(d, -1); } return n; })();
  const totalHours = Math.round(ws.reduce((t, w) => t + (w.durationMin || 0), 0) / 60 * 10) / 10;
  const totalExercises = ws.reduce((t, w) => t + (w.exercises || []).length, 0);
  const totalSets = ws.reduce((t, w) => t + (w.exercises || []).reduce((a, e) => a + (e.sets || []).length, 0), 0);
  const totalReps = ws.reduce((t, w) => t + (w.exercises || []).reduce((a, e) => a + (e.sets || []).reduce((s, x) => s + (Number(x.reps) || 0), 0), 0), 0);
  const totalKg = ws.reduce((t, w) => t + workoutVolume(w), 0);
  const avgDur = totalWorkouts ? Math.round(ws.reduce((t, w) => t + (w.durationMin || 0), 0) / totalWorkouts) : 0;
  const rWeekStart = addDays(today(), -((dateFromIST(today()).getUTCDay() + 6) % 7) + repOffset * 7);
  const rWeekDays = Array.from({ length: 7 }, (_, i) => addDays(rWeekStart, i));
  const fmtDate = (ds) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' }).format(dateFromIST(ds));
  const weekLabel = `${fmtDate(rWeekDays[0])} – ${fmtDate(rWeekDays[6])}`;
  const sumOn = (d, fn) => ws.filter(w => w.date === d).reduce((t, w) => t + fn(w), 0);
  const seriesFor = (fn) => rWeekDays.map(d => Math.round(sumOn(d, fn)));
  const barChart = (arr, fmt) => { const mx = Math.max(...arr, 1); return <div className="bar-chart">{arr.map((v, i) => <div className="bar" key={rWeekDays[i]}><span>{fmt(v)}</span><i style={{ height: `${Math.max(4, v / mx * 100)}%` }} /><small>{fmtDate(rWeekDays[i])}</small></div>)}</div>; };
  const lineChart = (pts) => { if (pts.length < 2) return <p className="muted">Not enough data yet.</p>; const W = 600, H = 160, pad = 12; const vals = pts.map(p => Number(p.y) || 0); const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1; const x = (i) => pad + i * (W - 2 * pad) / (pts.length - 1); const y = (v) => H - pad - (v - min) / (max - min) * (H - 2 * pad); const points = pts.map((p, i) => `${x(i)},${y(p.y)}`).join(' '); return <svg className="bw-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><polyline points={points} fill="none" stroke="#386750" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />{pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.y)} r="3.5" fill="#386750" />)}<text x={6} y={14} className="bw-label">{Math.round(max * 10) / 10}</text><text x={6} y={H - 8} className="bw-label">{Math.round(min * 10) / 10}</text></svg>; };
  const allExNames = [...new Set(ws.flatMap(w => (w.exercises || []).map(e => e.name)))].sort();
  const selEx = exProg || allExNames[0] || '';
  const exPoints = ws.filter(w => (w.exercises || []).some(e => e.name === selEx)).map(w => { let mx = 0; (w.exercises || []).filter(e => e.name === selEx).forEach(e => (e.sets || []).forEach(s => { const wg = Number(s.weight) || 0; if (wg > mx) mx = wg; })); return { x: w.date, y: mx }; }).sort((a, b) => (a.x < b.x ? -1 : 1));
  const muscleAgg = {};
  ws.forEach(w => (w.exercises || []).forEach(ex => { const m = ex.muscle || 'Other'; const agg = muscleAgg[m] || (muscleAgg[m] = { sets: 0, reps: 0, vol: 0, count: 0 }); agg.count++; (ex.sets || []).forEach(s => { const wg = Number(s.weight) || 0, r = Number(s.reps) || 0; agg.sets++; agg.reps += r; agg.vol += wg * r; }); }));
  const muscleList = Object.entries(muscleAgg).map(([muscle, a]) => ({ muscle, ...a })).sort((a, b) => b.vol - a.vol);
  const mMax = Math.max(...muscleList.map(m => m.vol), 1);
  const bestFor = (kw) => { let best = { w: 0, name: '', date: '' }; ws.forEach(w => (w.exercises || []).forEach(ex => { if (new RegExp(kw, 'i').test(ex.name)) (ex.sets || []).forEach(s => { const wg = Number(s.weight) || 0; if (wg > best.w) best = { w: wg, name: ex.name, date: w.date }; }); })); return best.w ? best : null; };
  const highestVolW = ws.reduce((m, w) => { const v = workoutVolume(w); return v > m.v ? { v, w } : m; }, { v: 0, w: null });
  const longestW = ws.reduce((m, w) => (w.durationMin || 0) > m.min ? { min: w.durationMin || 0, w } : m, { min: 0, w: null });
  const mostSetsW = ws.reduce((m, w) => { const s = (w.exercises || []).reduce((t, e) => t + (e.sets || []).length, 0); return s > m.s ? { s, w } : m; }, { s: 0, w: null });
  const mostExW = ws.reduce((m, w) => { const n = (w.exercises || []).length; return n > m.n ? { n, w } : m; }, { n: 0, w: null });

  const bodyEntries = (data.gym.bodyWeight || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const cut = addDays(today(), -(bwFilter === 'all' ? 3650 : Number(bwFilter)));
  const filteredBody = bodyEntries.filter(x => x.date >= cut);
  const latestBody = filteredBody[filteredBody.length - 1] || null;
  const prevBody = filteredBody[filteredBody.length - 2] || null;
  const bmiFor = (w, h) => h ? Math.round(w / Math.pow(h / 100, 2) * 100) / 100 : null;
  const curBmi = latestBody ? bmiFor(latestBody.weight, heightCm) : null;
  const prevBmi = prevBody ? bmiFor(prevBody.weight, heightCm) : null;
  const weightPts = filteredBody.map(x => ({ x: x.date, y: Number(x.weight) || 0 }));
  const bmiPts = filteredBody.filter(x => heightCm).map(x => ({ x: x.date, y: bmiFor(x.weight, heightCm) }));
  const estActiveMin = active ? Math.max(1, Math.round(active.exercises.reduce((t, ex) => t + ex.sets.length * (ex.restSec || 60), 0) / 60)) : 0;
  const liveSets = active ? active.exercises.reduce((t, ex) => t + ex.sets.length, 0) : 0;
  const liveDone = active ? active.exercises.reduce((t, ex) => t + ex.sets.filter(s => s.done).length, 0) : 0;
  const liveKg = active ? active.exercises.reduce((t, ex) => t + (ex.sets || []).reduce((s, x) => s + (Number(x.weight) || 0), 0), 0) : 0;
  const liveReps = active ? active.exercises.reduce((t, ex) => t + (ex.sets || []).reduce((s, x) => s + (Number(x.reps) || 0), 0), 0) : 0;
  const liveVol = active ? workoutVolume(active) : 0;
  const maxSets = active ? Math.max(0, ...active.exercises.map(e => e.sets.length)) : 0;
  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - restNow) / 1000)) : 0;
  const todayDay = dayKeyOf(today());
  const todayPlan = planFor(todayDay);
  const statsCard = (t, v, n) => <section className="card"><p className="eyebrow">{t}</p><strong className="metric">{v}</strong>{n && <p className="muted">{n}</p>}</section>;
  const weekNav = () => <div className="row-actions"><button className="ghost" onClick={() => setRepOffset(o => o - 1)}>← Previous week</button>{repOffset !== 0 && <button className="ghost" onClick={() => setRepOffset(0)}>This week</button>}<button className="ghost" onClick={() => setRepOffset(o => o + 1)}>Next week →</button></div>;
  const NAV = ['Start Workout', 'Edit Workout / Routine', 'Reports', 'BMI & Body Tracking'];

  const libModal = () => libOpen && <div className="gym-overlay" onClick={() => setLibOpen(null)}><div className="gym-modal" onClick={e => e.stopPropagation()}>
    <div className="panel-head"><div><h2>Add exercise to {libOpen.mode === 'active' ? (active?.name || 'workout') : DAY_LABELS[DAY_KEYS.indexOf(libOpen.day)]}</h2><p className="muted">{libPool.length} exercises — tap one to add it {libOpen.mode === 'active' ? 'to this workout' : 'to this day'}.</p></div><button className="ghost del" onClick={() => setLibOpen(null)}>×</button></div>
    <input className="lib-search" placeholder="Search by name, muscle, equipment, keywords… e.g. bench, curl, lat, cable, rear" value={libQ2} onChange={e => setLibQ2(e.target.value)} />
    <div className="filters"><span className="filter-label">Muscle</span><div className="chips">{MUSCLES.map(m => <button key={m} className={`chip${libCats.includes(m) ? ' on' : ''}`} onClick={() => setLibCats(libCats.includes(m) ? libCats.filter(x => x !== m) : [...libCats, m])}>{m}</button>)}</div></div>
    <div className="filters"><span className="filter-label">More</span><div className="chips"><select className="cat" value={libEquip} onChange={e => setLibEquip(e.target.value)}><option>All</option>{EQUIPMENT.map(m => <option key={m}>{m}</option>)}</select><select className="cat" value={libDiff} onChange={e => setLibDiff(e.target.value)}><option>All</option>{DIFFICULTY.map(m => <option key={m}>{m}</option>)}</select><select className="cat" value={libMove} onChange={e => setLibMove(e.target.value)}><option>All</option>{MOVEMENT.map(m => <option key={m}>{m}</option>)}</select><select className="cat" value={libForce} onChange={e => setLibForce(e.target.value)}><option>All</option>{FORCE.map(m => <option key={m}>{m}</option>)}</select></div></div>
    <div className="lib-grid modal">{libFiltered.map(e => <button className="lib-item" key={e.name + e.equipment} onClick={() => libOpen.mode === 'active' ? addToActive(e) : addToPlan(libOpen.day, e)}><strong>{e.name}</strong><small>{e.primary}{e.equipment ? ` · ${e.equipment}` : ''} · {e.difficulty}</small></button>)}</div>
    {!libFiltered.length && <p className="muted">No matches — try another search.</p>}
  </div></div>;

  const routineEditor = () => { const list = planFor(routineDay); return <div className="panel"><div className="panel-head"><div><h2>Edit {DAY_LABELS[DAY_KEYS.indexOf(routineDay)]}</h2><p className="muted">{list.length} exercises · {focusFor(list)} · est. {estMin(list)} min</p></div><div className="row-actions"><button className="ghost" onClick={() => setRoutineDay(null)}>← Back</button><button onClick={() => setLibOpen({ mode: 'plan', day: routineDay })}>+ Add Exercise</button></div></div>
    <div className="plan-ex-list">{list.map((en, i) => <div className="plan-ex drag" key={i} draggable onDragStart={() => { dragIdx.current = i; }} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragIdx.current != null && dragIdx.current !== i) moveExercise(routineDay, dragIdx.current, i); dragIdx.current = null; }}>
      <span className="set-num">{i + 1}</span>
      <div className="plan-ex-body"><strong>{en.name}</strong><div className="plan-sets">{en.sets.map((s, si) => <div className="plan-set" key={si}><input className="set-input" type="number" min="0" step="0.5" placeholder="kg" value={dispW(s.weight, units) === '' ? '' : dispW(s.weight, units)} onChange={e => patchPlanSet(routineDay, i, si, 'weight', storeW(e.target.value, units))} /><input className="set-input" type="number" min="0" placeholder="reps" value={s.reps} onChange={e => patchPlanSet(routineDay, i, si, 'reps', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />{en.sets.length > 1 && <button className="ghost del" onClick={() => removePlanSet(routineDay, i, si)}>×</button>}</div>)}<button className="ghost" onClick={() => addPlanSet(routineDay, i)}>+ Set</button></div><small className="muted">{en.sets.length} default sets</small></div>
      <div className="row-actions"><button className="ghost" title="Duplicate exercise" onClick={() => duplicatePlanEx(routineDay, i)}>⧉</button><button className="ghost" title="Move up" disabled={i === 0} onClick={() => moveExercise(routineDay, i, i - 1)}>↑</button><button className="ghost" title="Move down" disabled={i === list.length - 1} onClick={() => moveExercise(routineDay, i, i + 1)}>↓</button><button className="ghost del" title="Remove" onClick={() => removePlanEx(routineDay, i)}>×</button></div>
    </div>)}</div>
    {!list.length && <p className="muted">No exercises yet — add some from the library.</p>}
  </div>; };

  return <div className="gym">
    <div className="gym-nav">{NAV.map(v => <button key={v} className={view === v ? 'active' : ''} onClick={() => { setView(v); if (v !== 'Start Workout') setSummary(null); }}>{v}</button>)}</div>

    {view === 'Start Workout' && active && !summary && <>
      <div className="panel workout-head">
        <div className="panel-head"><div><h2>{active.name || 'Workout'}</h2><p className="muted">{fmtDate(active.date)} · {DAY_LABELS[DAY_KEYS.indexOf(dayKeyOf(active.date))]} · {active.exercises.length} exercises · est. {estActiveMin} min</p></div><div className="row-actions"><button className="ghost" onClick={() => setLibOpen({ mode: 'active' })}>+ Exercise</button><button onClick={finishWorkout}>Finish workout</button></div></div>
        <div className="workout-head-grid">
          <div className="field"><label>Workout name</label><input value={active.name} placeholder="e.g. Push A" onChange={e => setActiveSave({ ...active, name: e.target.value })} /></div>
          <div className="field"><label>Date</label><input type="date" value={active.date} onChange={e => setActiveSave({ ...active, date: e.target.value })} /></div>
          <div className="field"><label>Elapsed</label><span className="timer">{(() => { const t = Math.floor((restNow - active.startTime) / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; })()} min</span></div>
          <div className="field"><label>Notes</label><input value={active.notes} placeholder="Anything to remember..." onChange={e => setActiveSave({ ...active, notes: e.target.value })} /></div>
        </div>
        <div className="workout-totals"><span>Weight lifted <b>{Math.round(liveKg)} {units}</b></span><span>Reps <b>{liveReps}</b></span><span>Volume <b>{Math.round(liveVol)} {units}</b></span><span>Sets <b>{liveDone}/{liveSets}</b></span></div>
        <div className="workout-progress"><span className="wprog-label">Workout progress</span><div className="total-bar"><div className="fill" style={{ width: `${liveSets ? liveDone / liveSets * 100 : 0}%` }} /></div><strong>{Math.round(liveSets ? liveDone / liveSets * 100 : 0)}%</strong></div>
      </div>
      {active.exercises.length ? <section className="panel">
        <div className="panel-head"><div><h2>Today's sets</h2><p className="muted">Boxes are pre-filled from your last {DAY_LABELS[DAY_KEYS.indexOf(dayKeyOf(active.date))]} workout — edit and mark done as you go.</p></div></div>
        <div className="wt-wrap">
          <div className="wt-row wt-head" style={{ gridTemplateColumns: `170px 120px repeat(${maxSets},1fr)` }}><span className="wt-ex">Exercise</span><span className="wt-prev">Last time</span>{Array.from({ length: maxSets }, (_, i) => <span className="wt-set" key={i}>Set {i + 1}</span>)}</div>
          {active.exercises.map((ex, ei) => { const prev = prevWorkoutFor(data, active.date, ex.name) || []; const best = bestWeightBefore(data, ex.name, data.gym.workouts.length); return <div className="wt-row" data-exid={ex.id} key={ex.id} style={{ gridTemplateColumns: `170px 120px repeat(${maxSets},1fr)` }}>
            <div className="wt-ex"><strong>{ex.name} <span className="ex-count">{ei + 1}/{active.exercises.length}</span></strong><small>{ex.muscle}{ex.equipment ? ` · ${ex.equipment}` : ''}{best ? ` · best ${dispW(best, units)} ${units}` : ''}{rest && rest.exId === ex.id ? ` · Rest ${restLeft}s` : ''}</small><div className="wt-actions"><select className="cat rest-select" value={rest && rest.exId === ex.id ? rest.total : 60} onChange={e => startRest(ex.id, Number(e.target.value))}>{REST_PRESETS.map(s => <option key={s} value={s}>{s}s rest</option>)}</select><button className="ghost" onClick={() => addSet(ex.id)}>+ Set</button><button className="ghost del" onClick={() => deleteExercise(ex.id)}>Remove</button></div></div>
            <div className="wt-prev">{Array.from({ length: maxSets }, (_, si) => { const pw = prev[si]; return <span key={si}>{pw ? `${dispW(pw.weight, units)} × ${pw.reps}` : ''}</span>; })}</div>
            {ex.sets.map((s, si) => { const w = Number(s.weight) || 0; const r = Number(s.reps) || 0; const isPR = w > 0 && w > best; const is1PR = w > 0 && r > 0 && epley(w, r) > best1RMBefore(data, ex.name, data.gym.workouts.length); return <div className={`wt-set${s.done ? ' done' : ''}`} key={s.id}>
              <input className="set-input" type="number" inputMode="decimal" min="0" step="0.5" placeholder="kg" value={dispW(s.weight, units) === '' ? '' : dispW(s.weight, units)} onChange={e => patchSet(ex.id, s.id, 'weight', storeW(e.target.value, units))} onKeyDown={enterNext} />
              <input className="set-input" type="number" inputMode="numeric" min="0" placeholder="reps" value={s.reps} onChange={e => patchSet(ex.id, s.id, 'reps', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} onKeyDown={enterNext} />
              <div className="wt-set-foot"><input type="checkbox" checked={!!s.done} onChange={e => markDone(ex.id, s.id, e.target.checked)} />{ex.sets.length > 1 && <button className="ghost del" onClick={() => removeSet(ex.id, s.id)}>×</button>}{isPR && <span className="pr-tag">PR</span>}{is1PR && !isPR && <span className="pr-tag">1RM PR</span>}</div>
            </div>; })}
            {Array.from({ length: Math.max(0, maxSets - ex.sets.length) }, (_, i) => <div className="wt-set empty" key={'pad' + i} />)}
          </div>; })}
        </div>
      </section> : <div className="panel"><p className="muted">No exercises yet — this is a blank workout. Finish it or head to the routine.</p></div>}
    </>}

    {view === 'Start Workout' && !active && <div className="panel start-panel">
      <div className="panel-head"><div><h2>{DAY_LABELS[DAY_KEYS.indexOf(todayDay)]} · {fmtDate(today())}</h2><p className="muted">{todayPlan.length ? `${focusFor(todayPlan)} · ${todayPlan.length} exercises · est. ${estMin(todayPlan)} min` : 'Rest day — take it easy.'}</p></div></div>
      {!todayPlan.length && <div className="rest-day"><strong>Rest Day</strong><p className="muted">Nothing scheduled today. You can still start any workout below.</p></div>}
      <div className="start-row"><label className="log-field"><span>Start a routine</span><select className="cat" value={startDay} onChange={e => setStartDay(e.target.value)}>{DAY_KEYS.map(k => <option key={k} value={k}>{DAY_LABELS[DAY_KEYS.indexOf(k)]}{planFor(k).length ? ` (${planFor(k).length} exercises)` : ' — Rest'}</option>)}</select></label><button onClick={() => startFromDay(startDay)}>Start Workout</button><button className="ghost" onClick={startBlank}>Blank workout</button></div>
      <div className="plan-ex-list today">{todayPlan.map((en, i) => <div className="plan-ex" key={i}><span className="set-num">{i + 1}</span><strong>{en.name}</strong><small className="muted">{findEx(data, en.name)?.primary || ''} · {en.sets.length} sets</small></div>)}</div>
    </div>}

    {view === 'Edit Workout / Routine' && (routineDay == null ? <div className="panel"><div className="panel-head"><div><h2>Weekly routine</h2><p className="muted">Tap a day to edit its exercises, order, and default sets.</p></div></div><div className="plan-grid">{DAY_KEYS.map(k => { const names = planFor(k); return <div className="plan-day" key={k}><div className="plan-day-head"><strong>{DAY_LABELS[DAY_KEYS.indexOf(k)]}</strong><button className="ghost" onClick={() => setRoutineDay(k)}>Edit</button></div><small className="focus">{names.length ? focusFor(names) : 'Rest'}</small><div className="plan-chips">{names.map((en, i) => <span className="plan-chip" key={i}>{en.name}</span>)}</div></div>; })}</div></div> : routineEditor())}

    {view === 'Reports' && <>
      <div className="stats gym-stats">{statsCard('Total workouts', totalWorkouts, streak ? `${streak}-day streak` : 'No active streak')}{statsCard('Total hours trained', `${totalHours}h`, `${avgDur} min average`)}{statsCard('Exercises completed', totalExercises, `${totalSets} sets · ${totalReps.toLocaleString()} reps`)}{statsCard('Total weight lifted', `${Math.round(totalKg).toLocaleString()} ${units}`, 'Across all workouts')}{statsCard('Highest workout volume', highestVolW.w ? `${Math.round(highestVolW.v).toLocaleString()} ${units}` : '—', highestVolW.w ? highestVolW.w.name || highestVolW.w.date : '')}{statsCard('Longest workout', longestW.w ? `${longestW.min} min` : '—', mostSetsW.w ? `${mostSetsW.s} sets most` : '')}</div>
      <section className="panel"><div className="panel-head"><div><h2>Total weight lifted</h2><p className="muted">{weekLabel}</p></div>{weekNav()}</div>{barChart(seriesFor(workoutVolume), v => `${v}`)}</section>
      <section className="panel"><div className="panel-head"><div><h2>Total repetitions</h2><p className="muted">{weekLabel}</p></div>{weekNav()}</div>{barChart(seriesFor(w => (w.exercises || []).reduce((a, e) => a + (e.sets || []).reduce((s, x) => s + (Number(x.reps) || 0), 0), 0)), v => `${v}`)}</section>
      <section className="panel"><div className="panel-head"><div><h2>Workout duration</h2><p className="muted">{weekLabel}</p></div>{weekNav()}</div>{barChart(seriesFor(w => w.durationMin || 0), v => `${v}m`)}</section>
      <section className="panel"><div className="panel-head"><div><h2>Exercise progress</h2><p className="muted">Heaviest weight per session — pick an exercise below.</p></div></div><select className="cat" value={selEx} onChange={e => setExProg(e.target.value)}>{allExNames.map(n => <option key={n}>{n}</option>)}</select>{allExNames.length ? lineChart(exPoints) : <p className="muted">Complete a workout first.</p>}</section>
      <section className="panel"><div className="panel-head"><div><h2>Muscle group analysis</h2><p className="muted">Work done per muscle group, all time</p></div></div>{muscleList.length ? <div className="muscle-list">{muscleList.map(m => <div className="muscle-row" key={m.muscle}><span className="muscle-name">{m.muscle}</span><div className="muscle-track"><i style={{ width: `${Math.round(m.vol / mMax * 100)}%` }} /></div><div className="muscle-stats"><strong>{Math.round(m.vol).toLocaleString()} {units}</strong><small>{m.count} exercises · {m.sets} sets · {m.reps.toLocaleString()} reps</small></div></div>)}</div> : <p className="muted">Complete a workout first.</p>}</section>
      <section className="panel"><div className="panel-head"><div><h2>Personal records</h2><p className="muted">Automatic — updated with every workout</p></div></div><div className="sum-grid">{[['Bench Press', bestFor('bench')], ['Squat', bestFor('squat')], ['Deadlift', bestFor('deadlift')], ['Shoulder Press', bestFor('overhead press|shoulder press')], ['Curl', bestFor('curl')], ['Lat Pulldown', bestFor('lat pulldown')], ['Leg Press', bestFor('leg press')]].map(([label, r]) => <div className="sum-cell" key={label}><span>{label}</span><strong>{r ? `${dispW(r.w, units)} ${units} × ${r.date}` : '—'}</strong></div>)}<div className="sum-cell"><span>Most exercises</span><strong>{mostExW.w ? `${mostExW.n}` : '—'}</strong></div></div></section>
    </>}

    {view === 'BMI & Body Tracking' && <div className="two-col"><section className="panel"><h2>Log your body</h2><p className="muted">Weight every day — height is saved permanently after the first entry.</p><form className="form" onSubmit={saveBody}><label className="log-field"><span>Date</span><input type="date" value={bw.date} onChange={e => setBw({ ...bw, date: e.target.value })} /></label><label className="log-field"><span>Weight (kg)</span><input type="number" min="0" step="0.1" placeholder="e.g. 70.5" value={bw.weight} onChange={e => setBw({ ...bw, weight: e.target.value })} required /></label><label className="log-field"><span>Height (cm){heightCm ? ' — saved' : ' — required once'}</span><input type="number" min="100" max="250" step="0.5" placeholder="e.g. 172" value={bw.height} onChange={e => setBw({ ...bw, height: e.target.value })} required={!heightCm} /></label><button>Save</button></form>{latestBody && <div className={`bmi-result ${bmiTone(curBmi)}`}><span className="bmi-num">{curBmi ?? '—'}</span><div><strong>{bmiInfo(curBmi).label}</strong><small>{bmiInfo(curBmi).verdict}</small></div></div>}</section>
    <section className="panel"><div className="panel-head"><div><h2>Body stats</h2><p className="muted">Compared to your previous entry</p></div></div><div className="sum-grid"><div className="sum-cell"><span>Current weight</span><strong>{latestBody ? `${latestBody.weight} kg` : '—'}</strong></div><div className="sum-cell"><span>Weight change</span><strong className={prevBody && latestBody.weight > prevBody.weight ? 'bmi-tag bad' : 'bmi-tag good'}>{prevBody ? `${latestBody.weight > prevBody.weight ? '+' : ''}${Math.round((latestBody.weight - prevBody.weight) * 10) / 10} kg` : '—'}</strong></div><div className="sum-cell"><span>BMI</span><strong>{curBmi ?? '—'}</strong></div><div className="sum-cell"><span>BMI change</span><strong>{prevBmi && curBmi != null ? `${curBmi > prevBmi ? '+' : ''}${Math.round((curBmi - prevBmi) * 100) / 100}` : '—'}</strong></div></div>
    <div className="panel-head" style={{ marginTop: 18 }}><div><h3 style={{ font: '600 18px Newsreader,serif', margin: 0 }}>Progress</h3></div><select className="cat" value={bwFilter} onChange={e => setBwFilter(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 3 months</option><option value="180">Last 6 months</option><option value="365">Last year</option><option value="all">All time</option></select></div>
    <h3 className="chart-label">Weight</h3>{weightPts.length >= 2 ? lineChart(weightPts) : <p className="muted">Log at least two entries to see the trend.</p>}
    <h3 className="chart-label">BMI</h3>{heightCm ? (bmiPts.length >= 2 ? lineChart(bmiPts) : <p className="muted">Log at least two entries to see the trend.</p>) : <p className="muted">Enter your height once to start tracking BMI.</p>}
    <div className="bw-list">{filteredBody.slice().reverse().map(x => <div className="bw-item" key={x.id}><strong>{x.weight} kg</strong><small>{x.date} · BMI {bmiFor(x.weight, heightCm) ?? '—'}</small><button className="ghost del" onClick={() => deleteBody(x.id)}>×</button></div>)}</div>
    </section></div>}

    {summary && <div className="gym-overlay"><div className="gym-modal"><h2>Workout complete</h2><div className="sum-grid"><div className="sum-cell"><span>Duration</span><strong>{summary.durationMin} min</strong></div><div className="sum-cell"><span>Exercises</span><strong>{summary.exercises}</strong></div><div className="sum-cell"><span>Sets</span><strong>{summary.sets}</strong></div><div className="sum-cell"><span>Total reps</span><strong>{summary.reps}</strong></div><div className="sum-cell"><span>Volume</span><strong>{Math.round(summary.volume)} {units}</strong></div><div className="sum-cell"><span>PRs broken</span><strong>{summary.prs.length}</strong></div></div>{summary.prs.length ? <p className="pr-badge">New PRs: {summary.prs.join(', ')}</p> : null}<div className="row-actions"><button className="ghost" onClick={discardWorkout}>Discard</button><button onClick={saveWorkout}>Save workout</button></div></div></div>}

    {libModal()}
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
