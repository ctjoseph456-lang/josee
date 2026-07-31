import React from 'react';

export const dateFromIST = (str) => { const [y, m, d] = str.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const addDays = (str, n) => { const dt = dateFromIST(str); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); };
export const today = () => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const g = (t) => p.find(x => x.type === t)?.value || '';
  return `${g('year')}-${g('month')}-${g('day')}`;
};
export const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function Calendar({ month, onMonth, todayStr, selected, off, marks, onPick }) {
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
