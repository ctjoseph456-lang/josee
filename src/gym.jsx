import React, { useEffect, useState } from 'react';
import { Calendar, addDays, dateFromIST, today } from './lib.jsx';
import { EXERCISES, MUSCLES, EQUIPMENT, DIFFICULTY, MOVEMENT, FORCE, POSITION } from './exercises.js';

const UID = () => (window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DEFAULT_PLAN = {
  monday: ['Barbell Bench Press', 'Incline Dumbbell Press', 'Cable Fly', 'Triceps Pushdown', 'Rope Pushdown', 'Hanging Leg Raise', 'Cable Crunch'],
  tuesday: ['Pull-Up', 'Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Dumbbell Curl', 'Hammer Curl', 'Concentration Curl'],
  wednesday: ['Barbell Back Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Extension', 'Calf Raise', 'Plank', 'Hanging Knee Raise'],
  thursday: ['Overhead Press', 'Dumbbell Lateral Raise', 'Face Pull', 'Rear Delt Fly', 'Barbell Shrug', 'Wrist Curl', 'Reverse Wrist Curl'],
  friday: ['Incline Barbell Bench Press', 'Dumbbell Bench Press', 'Pec Deck', 'Pull-Up', 'Barbell Row', 'Crunch', 'Bicycle Crunch'],
  saturday: ['Barbell Curl', 'Skull Crusher', 'Hammer Curl', 'Triceps Pushdown', 'Barbell Back Squat', 'Leg Press', 'Calf Raise'],
  sunday: []
};
const REST_PRESETS = [30, 45, 60, 90, 120, 180];
const loadActive = () => { try { return JSON.parse(localStorage.getItem('focusboard-active-workout')) || null; } catch { return null; } };
const saveActive = (w) => { if (w) localStorage.setItem('focusboard-active-workout', JSON.stringify(w)); else localStorage.removeItem('focusboard-active-workout'); };
const dispW = (kg, u) => { if (kg === '' || kg === null || kg === undefined) return ''; const v = u === 'lbs' ? kg * 2.2046226 : kg; return Math.round(v * 10) / 10; };
const storeW = (v, u) => { const n = Number(v); if (!n || n < 0) return ''; const kg = u === 'lbs' ? n / 2.2046226 : n; return Math.round(kg * 100) / 100; };
const prevSetsFor = (data, name) => {
  const ws = data.gym.workouts || [];
  for (let i = ws.length - 1; i >= 0; i--) {
    const ex = (ws[i].exercises || []).find(e => String(e.name).toLowerCase() === String(name).toLowerCase());
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
const isAbs = (ex) => { const list = [ex.primary, ...(ex.secondary || [])].map(s => String(s).toLowerCase()).join(' '); return /abs|obliqu|core/.test(list) || /ab |ab-|crunch|plank|leg raise|knee raise|sit-?up|twist|rollout|v-?up|flutter|scissor|jackknife|hollow|leg lift/i.test(ex.name); };
const absDays = (data) => { const p = data.gym.plan || {}; return DAY_KEYS.filter(k => (p[k] || []).some(n => { const ex = findEx(data, n); return ex && isAbs(ex); })).length; };
const findEx = (data, name) => { const n = String(name).toLowerCase(); const c = (data.gym.custom || []).find(x => x.name.toLowerCase() === n); if (c) return c; return EXERCISES.find(x => x.name.toLowerCase() === n) || null; };
const statsFor = (data, name) => { let bestW = 0, best1rm = 0, bestVol = 0, mostReps = 0, last = null, count = 0; (data.gym.workouts || []).forEach(w => { (w.exercises || []).forEach(ex => { if (String(ex.name).toLowerCase() === String(name).toLowerCase()) { count++; (ex.sets || []).forEach(s => { const wgt = Number(s.weight) || 0, r = Number(s.reps) || 0; if (wgt > bestW) bestW = wgt; const e = epley(wgt, r); if (e > best1rm) best1rm = e; const v = wgt * r; if (v > bestVol) bestVol = v; if (r > mostReps) mostReps = r; }); if (!last || w.date > last) last = w.date; } }); }); return { bestW, best1rm, bestVol, mostReps, last, count }; };
const guideFor = (ex) => {
  const compound = /compound|squat|hinge|lunge|olympic|carry/i.test(ex.movement);
  const push = ex.force === 'Push';
  const pos = (ex.position || '').toLowerCase();
  const reps = compound ? '6–10 (strength) or 8–12 (hypertrophy)' : '10–15 reps';
  const rest = compound ? '2–3 minutes' : '60–90 seconds';
  return {
    reps, rest,
    tips: [
      `Set up with a firm, braced ${push ? 'pushing' : 'pulling'} position before every rep.`,
      `Move through the full range of motion while keeping control, especially at the ${pos} starting point.`,
      `Exhale on the effort phase and inhale during the return.`,
      'Pick a weight you can move cleanly — technique first, weight second.'
    ],
    mistakes: ['Rushing the movement and losing control', 'Rounding your back or losing your brace', 'Using too much weight and shortening the range of motion'],
    safety: ['Warm up with light sets before working weight', 'Use a spotter or safeties for heavy lifts', 'Stop immediately if you feel sharp joint pain']
  };
};

const bmiInfo = (b) => {
  if (!b || b <= 0) return { label: '—', tone: '', verdict: '' };
  if (b < 18.5) return { label: 'Underweight', tone: 'warn', verdict: 'Below the healthy range — try adding some healthy calories and strength work.' };
  if (b < 25) return { label: 'Normal weight', tone: 'good', verdict: 'You are in the healthy range — keep up the good work!' };
  if (b < 30) return { label: 'Overweight', tone: 'warn', verdict: 'Slightly above the healthy range — a steady plan will help.' };
  return { label: 'Obese', tone: 'bad', verdict: 'Above the healthy range — a consistent routine makes a big difference.' };
};
const bmiTone = (b) => b < 18.5 || b >= 25 ? (b >= 30 ? 'bad' : 'warn') : 'good';

export function Gym({ data, update }) {
  const units = (data.gym.settings || {}).units || 'kg';
  const [view, setView] = useState('planner');
  const [planDate, setPlanDate] = useState(today());
  const [planMonth, setPlanMonth] = useState(today().slice(0, 7));
  const [editingDay, setEditingDay] = useState(null);
  const [planDraft, setPlanDraft] = useState([]);
  const [active, setActive] = useState(null);
  const [libOpen, setLibOpen] = useState(null);
  const [libQ, setLibQ] = useState('');
  const [libQ2, setLibQ2] = useState('');
  const [libCats, setLibCats] = useState([]);
  const [libEquip, setLibEquip] = useState('All');
  const [libDiff, setLibDiff] = useState('All');
  const [libForce, setLibForce] = useState('All');
  const [libMove, setLibMove] = useState('All');
  const [libPos, setLibPos] = useState('All');
  const [recentN, setRecentN] = useState(10);
  const [detailEx, setDetailEx] = useState(null);
  const [custom, setCustom] = useState({ name: '', primary: 'Chest', equipment: 'Dumbbell', difficulty: 'Beginner', movement: 'Isolation', force: 'Push', position: 'Standing', instructions: '' });
  const [rest, setRest] = useState(null);
  const [restNow, setRestNow] = useState(Date.now());
  const [summary, setSummary] = useState(null);
  const [toast, setToast] = useState('');
  const [bw, setBw] = useState({ date: today(), weight: '', notes: '' });
  const [bmi, setBmi] = useState({ date: today(), height: '', weight: '' });
  const [histQ, setHistQ] = useState('');
  const [histView, setHistView] = useState(null);
  const [tmplQ, setTmplQ] = useState('');
  useEffect(() => { const t = setInterval(() => { setRestNow(Date.now()); }, 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const a = loadActive(); if (a) setActive(a); }, []);
  useEffect(() => { if (rest && rest.end <= restNow) { const exName = (active?.exercises || []).find(e => e.id === rest.exId)?.name; beep(); setToast(`Rest over — ${exName || 'exercise'}`); setRest(null); } }, [restNow]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);
  const updateGym = (g) => update({ ...data, gym: g });
  const showToast = (m) => setToast(m);

  const recordRecent = (names) => { const set = new Set(); const list = names.map(n => String(n)).concat(data.gym.recent || []); const out = []; list.forEach(n => { if (!set.has(n.toLowerCase()) && out.length < 50) { set.add(n.toLowerCase()); out.push(n); } }); updateGym({ ...data.gym, recent: out }); };

  const makeExercise = (name) => { const lib = findEx(data, name) || { name, primary: 'Other', equipment: '', difficulty: 'Beginner', movement: 'Isolation', force: 'Pull', position: 'Standing', secondary: [] }; const prev = prevSetsFor(data, lib.name); const sets = prev && prev.length ? prev.map(s => ({ id: UID(), weight: s.weight, reps: s.reps, done: false })) : [{ id: UID(), weight: '', reps: '', done: false }]; return { id: UID(), name: lib.name, muscle: lib.primary || '', equipment: lib.equipment || '', notes: '', restSec: restFor(lib), sets }; };

  const startWorkout = () => { const w = { id: UID(), name: '', date: today(), startTime: Date.now(), endTime: null, durationMin: 0, notes: '', exercises: [] }; saveActive(w); setActive(w); setView('workout'); };
  const startFromPlan = (day) => { const names = (data.gym.plan[day] || []); if (!names.length) { showToast('This day has no exercises yet'); return; } const w = { id: UID(), name: `${DAY_LABELS[DAY_KEYS.indexOf(day)]} workout`, date: today(), startTime: Date.now(), endTime: null, durationMin: 0, notes: '', exercises: names.map(makeExercise) }; saveActive(w); setActive(w); recordRecent(names); setView('workout'); showToast('Workout started — good luck!'); };
  const startFromTemplate = (t) => { const w = { id: UID(), name: t.name, date: today(), startTime: Date.now(), endTime: null, durationMin: 0, notes: '', exercises: t.exercises.map(ex => ({ ...ex, id: UID(), notes: '', sets: ex.sets.map(s => ({ id: UID(), weight: s.weight || '', reps: s.reps || '', done: false })) })) }; saveActive(w); setActive(w); recordRecent(t.exercises.map(e => e.name)); setView('workout'); };
  const setActiveSave = (w) => { setActive(w); saveActive(w); };
  const addToActive = (lib) => { const ex = makeExercise(lib.name); if (!active) { const w = { id: UID(), name: '', date: today(), startTime: Date.now(), endTime: null, durationMin: 0, notes: '', exercises: [ex] }; saveActive(w); setActive(w); setView('workout'); } else setActiveSave({ ...active, exercises: [...active.exercises, ex] }); recordRecent([lib.name]); setLibOpen(null); };
  const addToPlan = (day, name) => { updateGym({ ...data.gym, plan: { ...data.gym.plan, [day]: [...(data.gym.plan[day] || []), name] } }); if (planEditing() === day) setPlanDraft([...planDraft, name]); setLibOpen(null); showToast(`Added to ${DAY_LABELS[DAY_KEYS.indexOf(day)]}`); };
  const replaceExercise = (lib) => { setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === libOpen.replaceId ? { ...e, name: lib.name, muscle: lib.primary, equipment: lib.equipment } : e) }); setLibOpen(null); };
  const deleteExercise = (id) => setActiveSave({ ...active, exercises: active.exercises.filter(e => e.id !== id) });
  const addSet = (exId) => setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === exId ? { ...e, sets: [...e.sets, { id: UID(), weight: '', reps: '', done: false }] } : e) });
  const patchSet = (exId, setId, field, value) => setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === exId ? { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, [field]: value } : s) } : e) });
  const patchEx = (exId, field, value) => setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e) });
  const removeSet = (exId, setId) => setActiveSave({ ...active, exercises: active.exercises.map(e => e.id === exId ? { ...e, sets: e.sets.filter(s => s.id !== setId) } : e) });
  const startRest = (exId, secs) => { setRest({ exId, end: Date.now() + secs * 1000, total: secs }); };
  const enterNext = (e) => { if (e.key !== 'Enter') return; e.preventDefault(); const box = e.currentTarget.closest('.sets-body'); if (!box) return; const inputs = [...box.querySelectorAll('.set-input')]; const i = inputs.indexOf(e.target); if (i >= 0 && inputs[i + 1]) inputs[i + 1].focus(); };
  const markDone = (exId, setId, done, exName) => { patchSet(exId, setId, 'done', done); setTimeout(() => { const cards = [...document.querySelectorAll('.ex-card')]; const idx = cards.findIndex(c => c.dataset.exid === exId); if (idx < 0) return; const box = cards[idx].querySelector('.sets-body'); if (box) { const inputs = [...box.querySelectorAll('.set-input')]; const empty = inputs.find(i => i.value === '' || Number(i.value) === 0); (empty || inputs[0])?.focus(); } }, 40); };
  const finishWorkout = () => { const a = active; const dur = Math.max(1, Math.round((Date.now() - a.startTime) / 60000)); const totalSets = a.exercises.reduce((t, ex) => t + ex.sets.length, 0); const totalReps = a.exercises.reduce((t, ex) => t + ex.sets.reduce((s, x) => s + (Number(x.reps) || 0), 0), 0); const vol = workoutVolume(a); const prs = a.exercises.filter(ex => (ex.sets || []).some(s => { const w = Number(s.weight) || 0; return w && w > bestWeightBefore(data, ex.name, data.gym.workouts.length); })).map(ex => ex.name); setSummary({ durationMin: dur, exercises: a.exercises.length, sets: totalSets, reps: totalReps, volume: vol, prs, calories: Math.round(dur * 5 + totalReps * 0.5) }); };
  const saveWorkout = () => { const a = { ...active, name: active.name || `Workout — ${active.date}`, durationMin: summary.durationMin, endTime: Date.now() }; updateGym({ ...data.gym, workouts: [...data.gym.workouts, a] }); saveActive(null); setActive(null); setSummary(null); setView('planner'); showToast('Workout saved'); };
  const discardWorkout = () => { saveActive(null); setActive(null); setSummary(null); setView('planner'); showToast('Workout discarded'); };

  const planEditing = () => editingDay;
  const startEditDay = (day) => { setEditingDay(day); setPlanDraft([...(data.gym.plan[day] || [])]); };
  const cancelEditDay = () => { setEditingDay(null); setPlanDraft([]); };
  const savePlanDay = () => { updateGym({ ...data.gym, plan: { ...data.gym.plan, [editingDay]: planDraft } }); setEditingDay(null); setPlanDraft([]); showToast(`${DAY_LABELS[DAY_KEYS.indexOf(editingDay)]} plan saved`); };
  const movePlanEx = (i, dir) => { const a = [...planDraft]; const j = i + dir; if (j < 0 || j >= a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; setPlanDraft(a); };
  const removePlanEx = (i) => setPlanDraft(planDraft.filter((_, x) => x !== i));
  const resetPlanDay = (day) => { if (confirm(`Set ${DAY_LABELS[DAY_KEYS.indexOf(day)]} to rest (empty)?`)) updateGym({ ...data.gym, plan: { ...data.gym.plan, [day]: [] } }); if (editingDay === day) setPlanDraft([]); };
  const restoreDefaultPlan = () => { if (confirm('Reset the weekly plan to the default split?')) updateGym({ ...data.gym, plan: JSON.parse(JSON.stringify(DEFAULT_PLAN)) }); };

  const addWeight = (e) => { e.preventDefault(); const n = Number(bw.weight); if (!n) return; updateGym({ ...data.gym, bodyWeight: [...data.gym.bodyWeight, { id: UID(), date: bw.date, weight: n, notes: bw.notes.trim() }] }); setBw({ date: today(), weight: '', notes: '' }); showToast('Weight added'); };
  const deleteWeight = (id) => updateGym({ ...data.gym, bodyWeight: data.gym.bodyWeight.filter(x => x.id !== id) });
  const addBmi = (e) => { e.preventDefault(); const h = Number(bmi.height); const w = Number(bmi.weight); if (!h || !w) return; const kg = units === 'lbs' ? w / 2.2046226 : w; const b = kg / Math.pow(h / 100, 2); updateGym({ ...data.gym, bmi: [...(data.gym.bmi || []), { id: UID(), date: bmi.date, height: h, weight: Math.round(kg * 100) / 100, bmi: Math.round(b * 100) / 100 }] }); setBmi({ date: today(), height: '', weight: '' }); showToast(`BMI ${Math.round(b * 100) / 100} saved`); };
  const deleteBmi = (id) => updateGym({ ...data.gym, bmi: (data.gym.bmi || []).filter(x => x.id !== id) });
  const saveAsTemplate = () => { const n = prompt('Template name', active.name || 'New template'); if (n) updateGym({ ...data.gym, templates: [...data.gym.templates, { id: UID(), name: n, exercises: active.exercises.map(ex => ({ name: ex.name, muscle: ex.muscle, equipment: ex.equipment, restSec: ex.restSec, sets: ex.sets.filter(s => s.weight !== '' || s.reps !== '').map(s => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 })) })) }] }); };
  const cloneTemplate = (t) => updateGym({ ...data.gym, templates: [...data.gym.templates, { ...t, id: UID(), name: t.name + ' (copy)' }] });
  const renameTemplate = (t) => { const n = prompt('Template name', t.name); if (n) updateGym({ ...data.gym, templates: data.gym.templates.map(x => x.id === t.id ? { ...x, name: n } : x) }); };
  const deleteTemplate = (t) => { if (confirm(`Delete template "${t.name}"?`)) updateGym({ ...data.gym, templates: data.gym.templates.filter(x => x.id !== t.id) }); };
  const deleteWorkout = (id) => { if (confirm('Delete this workout?')) updateGym({ ...data.gym, workouts: data.gym.workouts.filter(x => x.id !== id) }); };
  const setUnits = (u) => updateGym({ ...data.gym, settings: { ...data.gym.settings, units: u } });
  const setDark = (d) => updateGym({ ...data.gym, settings: { ...data.gym.settings, dark: d } });
  const toggleFav = (name) => { const f = data.gym.favorites || []; const has = f.some(x => x.toLowerCase() === name.toLowerCase()); updateGym({ ...data.gym, favorites: has ? f.filter(x => x.toLowerCase() !== name.toLowerCase()) : [...f, name] }); };
  const exportData = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'focusboard-backup.json'; a.click(); };
  const importData = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const j = JSON.parse(await f.text()); localStorage.setItem('study-dashboard-data', JSON.stringify({ ...j, _v: 7 })); location.reload(); } catch { alert('Invalid backup file'); } };
  const deleteAll = () => { if (confirm('Delete ALL data? This cannot be undone.')) { localStorage.removeItem('study-dashboard-data'); localStorage.removeItem('focusboard-active-workout'); location.reload(); } };
  const saveCustom = (e) => { e.preventDefault(); if (!custom.name.trim()) return; updateGym({ ...data.gym, custom: [...data.gym.custom, { name: custom.name.trim(), primary: custom.primary, equipment: custom.equipment, difficulty: custom.difficulty, movement: custom.movement, force: custom.force, position: custom.position, secondary: [], instructions: custom.instructions.trim(), custom: true }] }); setCustom({ name: '', primary: 'Chest', equipment: 'Dumbbell', difficulty: 'Beginner', movement: 'Isolation', force: 'Push', position: 'Standing', instructions: '' }); showToast('Custom exercise added'); };
  const deleteCustom = (name) => { if (confirm(`Delete custom exercise "${name}"?`)) updateGym({ ...data.gym, custom: data.gym.custom.filter(x => x.name !== name) }); };

  const chipMatch = (primary, m) => { if (m === 'Chest') return /Chest/.test(primary); if (m === 'Back') return /Back/.test(primary); if (m === 'Shoulders') return /Delts|Shoulders/.test(primary); if (m === 'Abs') return primary === 'Abs' || primary === 'Core'; return primary === m; };
  const libPool = (data.gym.custom || []).concat(EXERCISES);
  const matches = (e, q) => { const words = q.toLowerCase().split(/\s+/).filter(Boolean); if (!words.length) return true; const hay = `${e.name} ${e.primary} ${(e.secondary || []).join(' ')} ${e.equipment} ${e.movement} ${e.force} ${e.position} ${e.difficulty}`.toLowerCase(); return words.every(w => hay.includes(w)); };
  const libFiltered = libPool.filter(e => (!libCats.length || libCats.some(m => chipMatch(e.primary, m))) && (libEquip === 'All' || e.equipment === libEquip) && (libDiff === 'All' || e.difficulty === libDiff) && (libForce === 'All' || e.force === libForce) && (libMove === 'All' || e.movement === libMove) && (libPos === 'All' || e.position === libPos) && matches(e, libOpen ? libQ2 : libQ));
  const favorites = (data.gym.favorites || []).map(n => findEx(data, n)).filter(Boolean);
  const recents = (data.gym.recent || []).slice(0, recentN).map(n => findEx(data, n)).filter(Boolean);

  const gymNav = ['Planner', 'Workout', 'Library', 'Templates', 'Body weight', 'BMI', 'History', 'Settings'];
  const wmarks = {}; (data.gym.workouts || []).forEach(w => { wmarks[w.date] = true; });
  const ws = (data.gym.workouts || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const weekAgo = addDays(today(), -7); const monthAgo = addDays(today(), -30);
  const weeklyVolume = (data.gym.workouts || []).filter(w => w.date >= weekAgo).reduce((t, w) => t + workoutVolume(w), 0);
  const monthlyVolume = (data.gym.workouts || []).filter(w => w.date >= monthAgo).reduce((t, w) => t + workoutVolume(w), 0);
  const streak = (() => { const set = new Set((data.gym.workouts || []).map(w => w.date)); let d = today(); if (!set.has(d)) d = addDays(d, -1); let n = 0; while (set.has(d)) { n++; d = addDays(d, -1); } return n; })();
  const totalWorkouts = ws.length;
  const bodyW = (data.gym.bodyWeight || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
  const lastWorkout = ws[0] || null;
  const todayKey = dayKeyOf(planDate);
  const selectedDayPlan = data.gym.plan[todayKey] || [];
  const focusFor = (names) => { const set = new Set(); names.forEach(n => { const e = findEx(data, n); if (e) set.add(e.primary); }); return [...set].join(' · ') || 'Rest day'; };
  const absCount = absDays(data);
  const recentPRs = [];
  (data.gym.workouts || []).forEach((w, i) => { (w.exercises || []).forEach(ex => { const bw = bestWeightBefore(data, ex.name, i); (ex.sets || []).forEach(s => { const wgt = Number(s.weight) || 0; if (wgt && wgt > bw) recentPRs.push({ date: w.date, exercise: ex.name, weight: wgt, reps: s.reps }); }); }); });
  const topPRs = recentPRs.slice(-5).reverse();
  const totalSets = (active?.exercises || []).reduce((t, ex) => t + ex.sets.length, 0);
  const doneSets = (active?.exercises || []).reduce((t, ex) => t + ex.sets.filter(s => s.done).length, 0);
  const activeVol = active ? workoutVolume(active) : 0;
  const bwEntries = (data.gym.bodyWeight || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const bwChart = () => { if (bwEntries.length < 2) return <p className="muted">Add at least two entries to see the trend.</p>; const W = 600, H = 160, pad = 12; const vals = bwEntries.map(x => Number(x.weight) || 0); const min = Math.min(...vals) - 2, max = Math.max(...vals) + 2; const x = (i) => pad + i * (W - 2 * pad) / (bwEntries.length - 1); const y = (v) => H - pad - (v - min) / (max - min) * (H - 2 * pad); const pts = bwEntries.map((e, i) => `${x(i)},${y(e.weight)}`).join(' '); return <svg className="bw-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="#386750" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />{bwEntries.map((e, i) => <circle key={e.id} cx={x(i)} cy={y(e.weight)} r="3.5" fill="#386750" />)}<text x={6} y={14} className="bw-label">{max.toFixed(1)}</text><text x={6} y={H - 8} className="bw-label">{min.toFixed(1)}</text></svg>; };
  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - restNow) / 1000)) : 0;
  const bmiEntries = (data.gym.bmi || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const latestBmi = bmiEntries[bmiEntries.length - 1] || null;
  const lh = Number(bmi.height), lw = Number(bmi.weight);
  const liveBmi = lh && lw ? (units === 'lbs' ? lw / 2.2046226 : lw) / Math.pow(lh / 100, 2) : null;
  const bmiChart = () => { if (bmiEntries.length < 2) return <p className="muted">Add at least two entries to see the trend.</p>; const W = 600, H = 160, pad = 12; const vals = bmiEntries.map(x => Number(x.bmi) || 0); const min = Math.max(10, Math.floor(Math.min(...vals)) - 1), max = Math.ceil(Math.max(...vals)) + 1; const x = (i) => pad + i * (W - 2 * pad) / (bmiEntries.length - 1); const y = (v) => H - pad - (v - min) / (max - min) * (H - 2 * pad); const pts = bmiEntries.map((e, i) => `${x(i)},${y(e.bmi)}`).join(' '); return <svg className="bw-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="#386750" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />{bmiEntries.map((e, i) => <circle key={e.id} cx={x(i)} cy={y(e.bmi)} r="3.5" fill="#386750" />)}<text x={6} y={14} className="bw-label">{max}</text><text x={6} y={H - 8} className="bw-label">{min}</text></svg>; };
  const bmiScale = (b) => { if (!b) return 18; const pct = Math.max(0, Math.min(1, (b - 14) / (40 - 14))); return 8 + pct * 84; };

  const libBtn = (e) => { const m = libOpen; if (m.mode === 'replace') { replaceExercise(e); return; } if (m.mode === 'plan') { addToPlan(m.day, e.name); return; } addToActive(e); };
  const libCard = (e) => <button className="lib-item" key={e.name + e.equipment} onClick={() => libOpen ? libBtn(e) : (setDetailEx(e), setView('detail'))}><strong>{e.name}</strong><small>{e.primary}{e.equipment ? ` · ${e.equipment}` : ''}</small><span className="lib-foot"><em>{e.difficulty}</em><span className={`star${(data.gym.favorites || []).some(f => f.toLowerCase() === e.name.toLowerCase()) ? ' on' : ''}`} onClick={ev => { ev.stopPropagation(); toggleFav(e.name); }}>★</span></span></button>;
  const dayEditor = (day) => <div className="plan-edit"><div className="panel-head"><div><h2>Edit {DAY_LABELS[DAY_KEYS.indexOf(day)]}</h2><p className="muted">{planDraft.length} exercises{planDraft.length ? ` · ${focusFor(planDraft)}` : ' — rest day'}</p></div><div className="row-actions"><button className="ghost" onClick={cancelEditDay}>Cancel</button><button onClick={savePlanDay}>Save</button></div></div><div className="plan-ex-list">{planDraft.map((n, i) => { const e = findEx(data, n); return <div className="plan-ex" key={n + i}><span className="set-num">{i + 1}</span><strong>{n}</strong><small>{e ? e.primary : ''}</small><div className="row-actions"><button className="ghost" onClick={() => movePlanEx(i, -1)}>↑</button><button className="ghost" onClick={() => movePlanEx(i, 1)}>↓</button><button className="ghost del" onClick={() => removePlanEx(i)}>×</button></div></div>; })}</div><div className="row-actions"><button className="ghost" onClick={() => setLibOpen({ mode: 'plan', day })}>+ Add Exercise</button><button className="ghost" onClick={() => resetPlanDay(day)}>Set as rest</button></div></div>;

  return <div className="gym">
    <div className="gym-nav">{gymNav.map(v => <button key={v} className={view === v ? 'active' : ''} onClick={() => { setView(v); if (v !== 'Workout') setSummary(null); }}>{v}</button>)}</div>

    {view === 'planner' && <>
      <div className="stats gym-stats">
        <section className="card"><p className="eyebrow">Workout streak</p><strong className="metric">{streak}<span className="unit">d</span></strong><p className="muted">Consecutive days</p></section>
        <section className="card"><p className="eyebrow">Total workouts</p><strong className="metric">{totalWorkouts}</strong><p className="muted">{lastWorkout ? `Last: ${lastWorkout.name || lastWorkout.date}` : 'No workouts yet'}</p></section>
        <section className="card"><p className="eyebrow">Weekly volume</p><strong className="metric">{Math.round(weeklyVolume)}<span className="unit">{units === 'lbs' ? ' lb' : ' kg'}</span></strong><p className="muted">Last 7 days</p></section>
        <section className="card"><p className="eyebrow">Monthly volume</p><strong className="metric">{Math.round(monthlyVolume)}<span className="unit">{units === 'lbs' ? ' lb' : ' kg'}</span></strong><p className="muted">Last 30 days</p></section>
        <section className="card"><p className="eyebrow">Current body weight</p><strong className="metric">{bodyW ? `${bodyW.weight}` : '—'}<span className="unit">{units === 'lbs' ? ' lb' : ' kg'}</span></strong><p className="muted">{bodyW ? bodyW.date : 'Not logged yet'}</p></section>
        <section className="card"><p className="eyebrow">Abs this week</p><strong className="metric">{absCount}<span className="unit">/7</span></strong><p className="muted">{absCount >= 3 ? 'Target met (3+)' : 'Aim for at least 3 days'}</p></section>
      </div>
      <div className="timetable-layout">
        <div className="cal-col"><Calendar month={planMonth} onMonth={setPlanMonth} todayStr={today()} selected={planDate} off={{}} marks={wmarks} onPick={d => { setPlanDate(d); }} /><div className="cal-key"><span className="key-dot today" />Workout day</div></div>
        <div className="panel">
          <div className="panel-head"><div><h2>{DAY_LABELS[DAY_KEYS.indexOf(todayKey)]} · {planDate}</h2><p className="muted">{focusFor(selectedDayPlan)}</p></div><div className="row-actions"><button onClick={() => startFromPlan(todayKey)}>Start this workout</button></div></div>
          <div className="plan-ex-list today">{selectedDayPlan.map((n, i) => { const e = findEx(data, n); return <div className="plan-ex" key={n + i}><span className="set-num">{i + 1}</span><strong>{n}</strong><small>{e ? e.primary : ''}</small></div>; })}</div>
          {!selectedDayPlan.length && <p className="muted">Rest day — nothing scheduled.</p>}
          <div className="row-actions"><button className="ghost" onClick={() => { startEditDay(todayKey); }}>Edit this day</button><button className="ghost" onClick={() => setLibOpen({ mode: 'plan', day: todayKey })}>+ Add Exercise</button></div>
        </div>
      </div>
      <section className="panel">
        <div className="panel-head"><div><h2>Weekly plan</h2><p className="muted">Tap Edit to change any day. Abs appear {absCount}× this week {absCount >= 3 ? '— goal met.' : '— add abs to reach 3 days.'}</p></div><button className="ghost" onClick={restoreDefaultPlan}>Reset to default</button></div>
        {editingDay ? dayEditor(editingDay) : <div className="plan-grid">{DAY_KEYS.map(k => { const names = data.gym.plan[k] || []; return <div className="plan-day" key={k}><div className="plan-day-head"><strong>{DAY_LABELS[DAY_KEYS.indexOf(k)]}</strong><button className="ghost" onClick={() => startEditDay(k)}>Edit</button></div>{names.length ? <small className="focus">{focusFor(names)}</small> : <small className="muted">Rest</small>}<div className="plan-chips">{names.map(n => { const e = findEx(data, n); return <span className={`plan-chip${e && isAbs(e) ? ' abs' : ''}`} key={n}>{n}</span>; })}</div></div>; })}</div>}
      </section>
    </>}

    {view === 'workout' && !active && <div className="panel start-panel"><h2>No active workout</h2><p className="muted">Start today's plan or a blank workout.</p><div className="row-actions"><button onClick={() => startFromPlan(todayKey)}>Start {DAY_LABELS[DAY_KEYS.indexOf(todayKey)]} workout</button><button className="ghost" onClick={startWorkout}>Blank workout</button><button className="ghost" onClick={() => setView('Templates')}>From template</button></div></div>}

    {view === 'workout' && active && !summary && <>
      <div className="panel workout-head">
        <div className="panel-head"><div><h2>{active.name || 'Workout'}</h2><p className="muted">{active.exercises.length} exercises · {doneSets}/{totalSets} sets done · {Math.round(activeVol)} {units} volume</p></div><div className="row-actions"><button className="ghost" onClick={() => setLibOpen({ mode: 'add' })}>+ Add exercise</button><button onClick={finishWorkout}>Finish workout</button></div></div>
        <div className="workout-head-grid">
          <div className="field"><label>Workout name</label><input value={active.name} placeholder="e.g. Push A" onChange={e => setActiveSave({ ...active, name: e.target.value })} /></div>
          <div className="field"><label>Date</label><input type="date" value={active.date} onChange={e => setActiveSave({ ...active, date: e.target.value })} /></div>
          <div className="field"><label>Elapsed</label><span className="timer">{(() => { const t = Math.floor((restNow - active.startTime) / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; })()} min</span></div>
          <div className="field"><label>Notes</label><input value={active.notes} placeholder="Anything to remember..." onChange={e => setActiveSave({ ...active, notes: e.target.value })} /></div>
        </div>
        <div className="workout-progress"><span className="wprog-label">Workout progress</span><div className="total-bar"><div className="fill" style={{ width: `${totalSets ? doneSets / totalSets * 100 : 0}%` }} /></div><strong>{Math.round(totalSets ? doneSets / totalSets * 100 : 0)}%</strong></div>
      </div>
      {active.exercises.map((ex, ei) => { const done = ex.sets.filter(s => s.done).length; const best = bestWeightBefore(data, ex.name, data.gym.workouts.length); return <section className="panel ex-card" data-exid={ex.id} key={ex.id}>
        <div className="panel-head"><div><h2>{ex.name} <span className="ex-count">{ei + 1}/{active.exercises.length}</span></h2><p className="muted">{ex.muscle}{ex.equipment ? ` · ${ex.equipment}` : ''}{best ? ` · best ${dispW(best, units)} ${units}` : ''}{rest && rest.exId === ex.id ? ` · Rest ${restLeft}s` : ''}</p></div><div className="row-actions"><span className="set-progress">{done}/{ex.sets.length} sets</span><button className="ghost" onClick={() => setLibOpen({ mode: 'replace', replaceId: ex.id })}>Replace</button><button className="ghost del" onClick={() => deleteExercise(ex.id)}>×</button></div></div>
        {(() => { const prev = prevSetsFor(data, ex.name) || []; return <div className="sets-grid">
          <div className="sets-head"><span>Set</span><span>Previous</span><span>Weight ({units})</span><span>Reps</span><span>Done</span></div>
          <div className="sets-body">{ex.sets.map((s, si) => { const pw = prev[si]; const w = Number(s.weight) || 0; const r = Number(s.reps) || 0; const isPR = w > 0 && w > best; const is1PR = w > 0 && r > 0 && epley(w, r) > best1RMBefore(data, ex.name, data.gym.workouts.length); return <div className={`sets-row${s.done ? ' done' : ''}`} key={s.id}><span className="set-num">{si + 1}</span><span className="prev">{pw ? `${dispW(pw.weight, units)} × ${pw.reps}` : ''}</span><input className="set-input" type="number" inputMode="decimal" min="0" step="0.5" placeholder="0" value={dispW(s.weight, units) === '' ? '' : dispW(s.weight, units)} onChange={e => patchSet(ex.id, s.id, 'weight', storeW(e.target.value, units))} onKeyDown={enterNext} /><input className="set-input" type="number" inputMode="numeric" min="0" placeholder="0" value={s.reps} onChange={e => patchSet(ex.id, s.id, 'reps', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} onKeyDown={enterNext} /><input type="checkbox" checked={!!s.done} onChange={e => markDone(ex.id, s.id, e.target.checked, ex.name)} />{ex.sets.length > 1 && <button className="ghost del" onClick={() => removeSet(ex.id, s.id)}>×</button>}{isPR && <span className="pr-tag">New PR!</span>}{is1PR && !isPR && <span className="pr-tag">1RM PR!</span>}</div>; })}</div>
          <div className="row-actions"><button className="ghost" onClick={() => addSet(ex.id)}>+ Add Set</button></div>
        </div>; })()}
        <div className="ex-notes"><input className="set-input" placeholder={`Notes for ${ex.name} (form, grip, etc.)`} value={ex.notes} onChange={e => patchEx(ex.id, 'notes', e.target.value)} /></div>
        <div className="rest-row"><span className="muted">Rest timer</span>{REST_PRESETS.map(s => <button key={s} className={`ghost${rest && rest.exId === ex.id && rest.total === s ? ' active' : ''}`} onClick={() => startRest(ex.id, s)}>{s}s</button>)}<button className="ghost" onClick={() => startRest(ex.id, Number(prompt('Rest seconds', '60')) || 60)}>Custom</button></div>
      </section>; })}
      {!active.exercises.length && <div className="panel"><p className="muted">No exercises yet — add one from the library.</p><button className="ghost" onClick={() => setLibOpen({ mode: 'add' })}>+ Add exercise</button></div>}
    </>}

    {view === 'Library' && <div className="panel">
      <div className="panel-head"><div><h2>Exercise library</h2><p className="muted">{libPool.length} exercises — search or filter, then tap one for details.</p></div></div>
      <input className="lib-search" placeholder="Search by name, muscle, equipment, movement… e.g. bench, curl, lat, cable, rear, quad" value={libQ} onChange={e => setLibQ(e.target.value)} />
      <div className="filters"><span className="filter-label">Muscle</span><div className="chips">{MUSCLES.map(m => <button key={m} className={`chip${libCats.includes(m) ? ' on' : ''}`} onClick={() => setLibCats(libCats.includes(m) ? libCats.filter(x => x !== m) : [...libCats, m])}>{m}</button>)}</div></div>
      <div className="filters"><span className="filter-label">More filters</span><div className="chips"><select className="cat" value={libEquip} onChange={e => setLibEquip(e.target.value)}><option>All</option>{EQUIPMENT.map(m => <option key={m}>{m}</option>)}</select><select className="cat" value={libDiff} onChange={e => setLibDiff(e.target.value)}><option>All</option>{DIFFICULTY.map(m => <option key={m}>{m}</option>)}</select><select className="cat" value={libForce} onChange={e => setLibForce(e.target.value)}><option>All</option>{FORCE.map(m => <option key={m}>{m}</option>)}</select><select className="cat" value={libMove} onChange={e => setLibMove(e.target.value)}><option>All</option>{MOVEMENT.map(m => <option key={m}>{m}</option>)}</select><select className="cat" value={libPos} onChange={e => setLibPos(e.target.value)}><option>All</option>{POSITION.map(m => <option key={m}>{m}</option>)}</select></div></div>
      {favorites.length > 0 && <><div className="lib-section">⭐ Favorites</div><div className="lib-grid">{favorites.slice(0, 20).map(libCard)}</div></>}
      {recents.length > 0 && <><div className="lib-section">Recently used <select className="cat" value={recentN} onChange={e => setRecentN(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></div><div className="lib-grid">{recents.map(libCard)}</div></>}
      <div className="lib-section">All exercises <span className="muted">({libFiltered.length} shown)</span></div>
      <div className="lib-grid">{libFiltered.map(libCard)}</div>
      {!libFiltered.length && <p className="muted">No exercises match your search. Try fewer filters or add a custom exercise below.</p>}
      <div className="custom-form"><h3>Create a custom exercise</h3><form className="form" onSubmit={saveCustom}><input placeholder="Exercise name (required)" value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} required /><select value={custom.primary} onChange={e => setCustom({ ...custom, primary: e.target.value })}>{MUSCLES.map(m => <option key={m}>{m}</option>)}</select><select value={custom.equipment} onChange={e => setCustom({ ...custom, equipment: e.target.value })}>{EQUIPMENT.map(m => <option key={m}>{m}</option>)}</select><select value={custom.difficulty} onChange={e => setCustom({ ...custom, difficulty: e.target.value })}>{DIFFICULTY.map(m => <option key={m}>{m}</option>)}</select><select value={custom.movement} onChange={e => setCustom({ ...custom, movement: e.target.value })}>{MOVEMENT.map(m => <option key={m}>{m}</option>)}</select><select value={custom.force} onChange={e => setCustom({ ...custom, force: e.target.value })}>{FORCE.map(m => <option key={m}>{m}</option>)}</select><select value={custom.position} onChange={e => setCustom({ ...custom, position: e.target.value })}>{POSITION.map(m => <option key={m}>{m}</option>)}</select><input placeholder="Instructions (optional)" value={custom.instructions} onChange={e => setCustom({ ...custom, instructions: e.target.value })} /><button>Add custom exercise</button></form></div>
      {data.gym.custom.length > 0 && <div className="lib-section">Your custom exercises</div>}
    </div>}

    {view === 'detail' && detailEx && (() => { const g = guideFor(detailEx); const st = statsFor(data, detailEx.name); const prev = prevSetsFor(data, detailEx.name); const fav = (data.gym.favorites || []).some(f => f.toLowerCase() === detailEx.name.toLowerCase()); return <div className="panel">
      <div className="panel-head"><div><h2>{detailEx.name}</h2><p className="muted">{detailEx.primary}{detailEx.equipment ? ` · ${detailEx.equipment}` : ''} · {detailEx.movement} · {detailEx.force} · {detailEx.position}</p></div><div className="row-actions"><button className="ghost" onClick={() => setView('Library')}>← Back</button><button className={fav ? 'ghost star on' : 'ghost star'} onClick={() => toggleFav(detailEx.name)}>★ {fav ? 'Favorited' : 'Favorite'}</button></div></div>
      <div className="detail-grid"><div className="detail-chips"><span className="d-chip">Primary: <b>{detailEx.primary}</b></span><span className="d-chip">Secondary: <b>{(detailEx.secondary || []).join(', ') || '—'}</b></span><span className="d-chip">Equipment: <b>{detailEx.equipment || '—'}</b></span><span className="d-chip">Difficulty: <b>{detailEx.difficulty}</b></span><span className="d-chip">Force: <b>{detailEx.force}</b></span><span className="d-chip">Position: <b>{detailEx.position}</b></span></div>
        <div className="detail-stats"><h3>Personal records</h3><div className="sum-grid">{(() => { const items = [['Highest weight', st.bestW ? `${dispW(st.bestW, units)} ${units}` : '—'], ['Est. 1RM', st.best1rm ? `${Math.round(dispW(st.best1rm, units))} ${units}` : '—'], ['Best volume', st.bestVol ? `${Math.round(st.bestVol)}` : '—'], ['Most reps', st.mostReps || '—'], ['Times performed', st.count], ['Last done', st.last || '—']]; return items.map(([k, v]) => <div className="sum-cell" key={k}><span>{k}</span><strong>{v}</strong></div>); })()}</div></div>
      </div>
      {prev && <><h3>Previous workout</h3><div className="prev-list">{prev.map((s, i) => <div className="hist-set" key={i}>{i + 1}. {dispW(s.weight, units)} {units} × {s.reps}</div>)}</div></>}
      <div className="row-actions detail-actions"><button onClick={() => addToActive(detailEx)}>+ Add to {active ? 'workout' : 'a new workout'}</button><button className="ghost" onClick={() => addToPlan(todayKey, detailEx.name)}>+ Add to {DAY_LABELS[DAY_KEYS.indexOf(todayKey)]}</button></div>
      {detailEx.custom && detailEx.instructions && <div className="detail-instructions"><h3>Instructions</h3><p>{detailEx.instructions}</p></div>}
      <div className="detail-guide"><div><h3>Recommended sets &amp; rest</h3><p>Reps: <b>{g.reps}</b></p><p>Rest: <b>{g.rest}</b></p></div><div><h3>Tips</h3><ul>{g.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div><div><h3>Common mistakes</h3><ul>{g.mistakes.map((t, i) => <li key={i}>{t}</li>)}</ul></div><div><h3>Safety</h3><ul>{g.safety.map((t, i) => <li key={i}>{t}</li>)}</ul></div></div>
    </div>; })()}

    {view === 'Templates' && <div className="panel"><div className="panel-head"><div><h2>Templates</h2><p className="muted">Start a workout from a template, or build your own.</p></div>{active && <button onClick={saveAsTemplate}>Save current workout</button>}</div><input className="lib-search" placeholder="Search templates..." value={tmplQ} onChange={e => setTmplQ(e.target.value)} /><div className="tmpl-grid">{(data.gym.templates || []).filter(t => t.name.toLowerCase().includes(tmplQ.toLowerCase())).map(t => <div className="tmpl-card" key={t.id}><strong>{t.name}</strong><small>{t.exercises.length} exercises</small><div className="row-actions"><button className="ghost" onClick={() => startFromTemplate(t)}>Start</button><button className="ghost" onClick={() => cloneTemplate(t)}>Clone</button><button className="ghost" onClick={() => renameTemplate(t)}>Rename</button><button className="ghost del" onClick={() => deleteTemplate(t)}>Delete</button></div></div>)}</div></div>}

    {view === 'Body weight' && <div className="two-col"><section className="panel"><h2>Add weight</h2><form className="form" onSubmit={addWeight}><label className="log-field"><span>Date</span><input type="date" value={bw.date} onChange={e => setBw({ ...bw, date: e.target.value })} /></label><label className="log-field"><span>Weight ({units})</span><input type="number" min="0" step="0.1" placeholder="e.g. 70.5" value={bw.weight} onChange={e => setBw({ ...bw, weight: e.target.value })} required /></label><label className="log-field"><span>Notes</span><input placeholder="Optional" value={bw.notes} onChange={e => setBw({ ...bw, notes: e.target.value })} /></label><button>Add weight</button></form></section><section className="panel"><h2>Progress</h2>{bwChart()}<div className="bw-list">{bwEntries.slice().reverse().map(x => <div className="bw-item" key={x.id}><strong>{x.weight} {units}</strong><small>{x.date}{x.notes ? ` · ${x.notes}` : ''}</small><button className="ghost del" onClick={() => deleteWeight(x.id)}>×</button></div>)}</div></section></div>}

    {view === 'BMI' && <div className="two-col"><section className="panel"><h2>Daily BMI</h2><p className="muted">Enter your height and weight — we compute your BMI and rate it.</p><form className="form" onSubmit={addBmi}><label className="log-field"><span>Date</span><input type="date" value={bmi.date} onChange={e => setBmi({ ...bmi, date: e.target.value })} /></label><label className="log-field"><span>Height (cm)</span><input type="number" min="100" max="250" step="0.5" placeholder="e.g. 172" value={bmi.height} onChange={e => setBmi({ ...bmi, height: e.target.value })} required /></label><label className="log-field"><span>Weight ({units})</span><input type="number" min="0" step="0.1" placeholder="e.g. 70" value={bmi.weight} onChange={e => setBmi({ ...bmi, weight: e.target.value })} required /></label><button>Calculate &amp; save</button></form>{liveBmi && <div className={`bmi-result ${bmiTone(liveBmi)}`}><span className="bmi-num">{Math.round(liveBmi * 100) / 100}</span><div><strong>{bmiInfo(liveBmi).label}</strong><small>{bmiInfo(liveBmi).verdict}</small></div></div>}</section><section className="panel"><div className="panel-head"><div><h2>BMI history</h2><p className="muted">{latestBmi ? `Latest: ${latestBmi.bmi} (${bmiInfo(latestBmi.bmi).label})` : 'No entries yet'}</p></div></div>{latestBmi && <div className="bmi-scale"><div className="bmi-track"><span className="marker" style={{ left: `${bmiScale(latestBmi.bmi)}%` }} /></div><div className="bmi-zones"><span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span></div></div>}{bmiChart()}<div className="bw-list">{bmiEntries.slice().reverse().map(x => { const info = bmiInfo(x.bmi); return <div className="bw-item" key={x.id}><strong>{x.bmi} <span className={`bmi-tag ${info.tone}`}>{info.label}</span></strong><small>{x.date} · {x.weight} kg · {x.height} cm</small><button className="ghost del" onClick={() => deleteBmi(x.id)}>×</button></div>; })}</div></section></div>}

    {view === 'History' && <div className="panel"><div className="panel-head"><div><h2>Workout history</h2><p className="muted">Every previous workout.</p></div></div><input className="lib-search" placeholder="Search workouts..." value={histQ} onChange={e => setHistQ(e.target.value)} />{histView ? <div className="hist-detail"><div className="row-actions"><button className="ghost" onClick={() => setHistView(null)}>← Back</button><button className="ghost del" onClick={() => { deleteWorkout(histView.id); setHistView(null); }}>Delete</button></div><h2>{histView.name || histView.date}</h2><p className="muted">{histView.date} · {histView.durationMin} min · {Math.round(workoutVolume(histView))} {units} volume{histView.notes ? ` · ${histView.notes}` : ''}</p>{histView.exercises.map(ex => <div className="hist-ex" key={ex.id}><strong>{ex.name}</strong><small>{ex.muscle}</small>{ex.sets.map((s, i) => <span className="hist-set" key={s.id}>{i + 1}. {dispW(s.weight, units)} {units} × {s.reps}{s.done ? ' ✓' : ''}</span>)}</div>)}</div> : <div className="hist-list">{ws.filter(w => (w.name || '').toLowerCase().includes(histQ.toLowerCase()) || (w.date || '').includes(histQ)).map(w => <button className="hist-item" key={w.id} onClick={() => setHistView(w)}><strong>{w.name || w.date}</strong><small>{w.date} · {w.exercises.length} exercises · {Math.round(workoutVolume(w))} {units}</small></button>)}</div>}</div>}

    {view === 'Settings' && <div className="two-col"><section className="panel"><h2>Units</h2><div className="day-type"><button className={units === 'kg' ? 'active' : ''} onClick={() => setUnits('kg')}>Kilograms (kg)</button><button className={units === 'lbs' ? 'active' : ''} onClick={() => setUnits('lbs')}>Pounds (lbs)</button></div></section><section className="panel"><h2>Appearance</h2><div className="day-type"><button className={data.gym.settings.dark ? 'active' : ''} onClick={() => setDark(true)}>Dark mode</button><button className={!data.gym.settings.dark ? 'active' : ''} onClick={() => setDark(false)}>Light mode</button></div></section><section className="panel"><h2>Weekly plan</h2><button className="ghost" onClick={restoreDefaultPlan}>Reset plan to default split</button></section><section className="panel"><h2>Data</h2><div className="row-actions"><button className="ghost" onClick={exportData}>Export data</button><label className="ghost upload-ghost">Import data<input type="file" accept=".json" onChange={importData} /></label><button className="ghost del" onClick={deleteAll}>Delete all data</button></div><p className="muted">Everything is stored on this device and works offline. Export a backup regularly.</p></section></div>}

    {libOpen && <div className="gym-overlay" onClick={() => setLibOpen(null)}><div className="gym-modal" onClick={e => e.stopPropagation()}><div className="panel-head"><div><h2>{libOpen.mode === 'replace' ? 'Replace exercise' : libOpen.mode === 'plan' ? `Add exercise to ${DAY_LABELS[DAY_KEYS.indexOf(libOpen.day)]}` : 'Add exercise'}</h2><p className="muted">{libOpen.mode === 'plan' ? 'Tap an exercise to add it to this day.' : 'Tap an exercise to add it.'}</p></div><button className="ghost del" onClick={() => setLibOpen(null)}>×</button></div><input className="lib-search" placeholder="Search the library…" value={libQ2} onChange={e => setLibQ2(e.target.value)} /><div className="lib-grid modal">{libFiltered.map(e => <button className="lib-item" key={e.name + e.equipment} onClick={() => libBtn(e)}><strong>{e.name}</strong><small>{e.primary}{e.equipment ? ` · ${e.equipment}` : ''}</small></button>)}</div>{!libFiltered.length && <p className="muted">No matches — try another search.</p>}</div></div>}

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
