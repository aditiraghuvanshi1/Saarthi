/* Saarthi - ElderEasy page: health logs (vitals, mood, symptoms, wellness, calendar, trends, appointments)
   plus medicine reminders, BMI, medicine stock and a medical card. Everything stays on this device. */
(() => {
  'use strict';
  const S = window.Saarthi;
  if (!S || document.body.dataset.page !== 'care') return;
  const { $, el, get, set, t, fill, fmtDate, iso, say, onRender } = S;

  const del = (onClick) => { const b = el('button', { type: 'button', class: 'btn ghost small' }, t('del')); b.onclick = onClick; return b; };
  const remove = (key, i, redraw) => () => { const a = get(key, []); a.splice(i, 1); set(key, a); redraw(); };
  const num = (v) => Number(String(v).replace(',', '.'));

  /* ---------- health logs ---------- */
  const HL = 'hlog';
  const today = () => iso(new Date());
  const load = () => { const d = get(HL, {}); d.days = d.days && typeof d.days === 'object' ? d.days : {}; d.appts = Array.isArray(d.appts) ? d.appts : []; return d; };
  const day = (d, k) => (d.days[k] = d.days[k] || { vitals: [], symptoms: [] });
  const clock = () => new Date().toLocaleTimeString(S.VOICE[S.P.lang], { hour: '2-digit', minute: '2-digit' });
  const n = (id) => { const v = $('#' + id).value.trim(); return v === '' ? null : num(v); };
  const say1 = (id, text) => { $('#' + id).textContent = text; };

  // vitals: one entry per save, with a plain warning when a value is out of range
  const vitalFlags = (v) => {
    const f = [];
    if (v.sys >= 180 || v.dia >= 120) f.push('BP is very high. Call your doctor now.');
    else if (v.sys >= 140 || v.dia >= 90) f.push('BP looks high. Please check with your doctor.');
    else if (v.sys && v.sys < 90) f.push('BP looks low. Sit down, drink water, and tell your doctor if you feel dizzy.');
    if (v.sugar >= 300) f.push('Blood sugar is very high. Call your doctor now.');
    else if (v.sugar && v.sugar < 70) f.push('Blood sugar is low. Take something sweet now.');
    else if (v.sugar && ((v.when === 'Fasting' && v.sugar > 125) || v.sugar > 200)) f.push('Blood sugar looks high. Please check with your doctor.');
    if (v.spo2 && v.spo2 < 94) f.push('Oxygen is low. Call your doctor or 112 if you feel breathless.');
    if (v.pulse && (v.pulse < 50 || v.pulse > 120)) f.push('Pulse is outside the usual range. Please check with your doctor.');
    return f;
  };
  const fmtV = (v) => [v.sys && v.dia ? 'BP ' + v.sys + '/' + v.dia : '', v.sugar ? 'Sugar ' + v.sugar + ' (' + v.when + ')' : '', v.pulse ? 'Pulse ' + v.pulse : '', v.spo2 ? 'SpO2 ' + v.spo2 + '%' : '', v.weight ? 'Weight ' + v.weight + ' kg' : ''].filter(Boolean).join(' · ');
  $('#fv2').onsubmit = (e) => {
    e.preventDefault();
    const v = { time: clock(), sys: n('v-sys'), dia: n('v-dia'), sugar: n('v-sugar'), when: $('#v-when').value, pulse: n('v-pulse'), spo2: n('v-spo2'), weight: n('v-weight') };
    const ok = (x, lo, hi) => x == null || (x >= lo && x <= hi);
    if ([v.sys, v.dia, v.sugar, v.pulse, v.spo2, v.weight].every((x) => x == null)) { say1('hl-alert', 'Enter at least one reading.'); return; }
    if ((v.sys == null) !== (v.dia == null)) { say1('hl-alert', 'Enter both BP numbers, top and bottom.'); return; }
    if (!ok(v.sys, 50, 260) || !ok(v.dia, 30, 150) || !ok(v.sugar, 30, 600) || !ok(v.pulse, 30, 220) || !ok(v.spo2, 70, 100) || !ok(v.weight, 20, 250)) { say1('hl-alert', 'One of the numbers looks wrong. Please check it.'); return; }
    const d = load(); day(d, today()).vitals.push(v); set(HL, d);
    // keep the home page's "last reading" working
    const log = get('log', []), stamp = new Date().toLocaleString(S.VOICE[S.P.lang]);
    if (v.weight) log.unshift({ k: 'weight', v: String(v.weight), d: stamp });
    if (v.spo2) log.unshift({ k: 'spo2', v: String(v.spo2), d: stamp });
    if (v.pulse) log.unshift({ k: 'pulse', v: String(v.pulse), d: stamp });
    if (v.sugar) log.unshift({ k: 'sugar', v: String(v.sugar), d: stamp });
    if (v.sys) log.unshift({ k: 'bp', v: v.sys + '/' + v.dia, d: stamp });
    set('log', log.slice(0, 100));
    say1('hl-alert', vitalFlags(v).join(' '));
    e.target.reset(); calSel = today(); drawAll();
  };

  // mood
  const MOOD = ['Very low', 'Low', 'Okay', 'Good', 'Very good'];
  let moodPick = 0;
  const drawMoods = () => $('#mood-row').replaceChildren(...MOOD.map((label, i) => {
    const b = el('button', { type: 'button', class: 'mood' + (moodPick === i + 1 ? ' on' : ''), 'aria-pressed': moodPick === i + 1 ? 'true' : 'false' }, el('strong', {}, String(i + 1)), el('small', {}, label));
    b.onclick = () => { moodPick = i + 1; drawMoods(); };
    return b;
  }));
  $('#m-lonely').onchange = () => { $('#lonely-tip').hidden = !$('#m-lonely').checked; };
  $('#save-mood').onclick = () => {
    if (!moodPick) { say1('hl-alert', 'Tap a number from 1 to 5 for how you feel.'); return; }
    const sleep = n('m-sleep');
    if (sleep != null && !(sleep >= 0 && sleep <= 24)) { say1('hl-alert', 'Sleep should be between 0 and 24 hours.'); return; }
    const d = load();
    day(d, today()).mood = { time: clock(), mood: moodPick, sleep, stress: $('#m-stress').value, lonely: $('#m-lonely').checked, note: $('#m-note').value.trim().slice(0, 300) };
    set(HL, d); say1('hl-alert', '');
    moodPick = 0; $('#m-sleep').value = ''; $('#m-note').value = ''; $('#m-lonely').checked = false; $('#lonely-tip').hidden = true;
    drawMoods(); calSel = today(); drawAll();
  };

  // speak instead of typing the mood note
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  $('#m-mic').onclick = () => {
    if (!Rec) { say1('hl-alert', 'Speaking needs Google Chrome or Microsoft Edge.'); return; }
    const r = new Rec(); r.lang = S.VOICE[S.P.lang]; r.interimResults = false;
    $('#m-mic').classList.add('on');
    r.onresult = (e) => { const tx = e.results[0][0].transcript.trim(); const box = $('#m-note'); box.value = (box.value ? box.value + ' ' : '') + tx; };
    r.onend = () => $('#m-mic').classList.remove('on');
    r.onerror = () => $('#m-mic').classList.remove('on');
    r.start();
  };

  // symptoms
  const SYM = ['Headache', 'Dizziness', 'Chest pain', 'Breathlessness', 'Joint / knee pain', 'Weakness', 'Nausea', 'Cough / cold'];
  const picked = new Set();
  const symWarn = () => {
    const serious = picked.has('Chest pain') || picked.has('Breathlessness');
    say1('sym-warn', serious ? 'Chest pain or breathlessness can be serious. Call 112 or your doctor now.' : ($('#sym-sev').value === 'Severe' && picked.size ? 'Severe symptoms: please call your doctor today.' : ''));
  };
  const drawChips = () => $('#sym-chips').replaceChildren(...SYM.map((x) => {
    const b = el('button', { type: 'button', class: 'chip' + (picked.has(x) ? ' on' : ''), 'aria-pressed': picked.has(x) ? 'true' : 'false' }, x);
    b.onclick = () => { if (picked.has(x)) picked.delete(x); else picked.add(x); drawChips(); symWarn(); };
    return b;
  }));
  $('#sym-sev').onchange = symWarn;
  $('#save-sym').onclick = () => {
    if (!picked.size) { say1('sym-warn', 'Tap at least one symptom first.'); return; }
    const d = load(); day(d, today()).symptoms.push({ time: clock(), list: [...picked], sev: $('#sym-sev').value }); set(HL, d);
    picked.clear(); drawChips(); calSel = today(); drawAll();
  };

  // wellness
  $('#save-well').onclick = () => {
    const w = n('w-water'), k = n('w-walk');
    if (w == null && k == null) { say1('hl-alert', 'Enter water or walking minutes.'); return; }
    if ((w != null && !(w >= 0 && w <= 30)) || (k != null && !(k >= 0 && k <= 600))) { say1('hl-alert', 'One of the numbers looks wrong. Please check it.'); return; }
    const d = load(), t0 = day(d, today());
    if (w != null) t0.water = w;
    if (k != null) t0.walk = k;
    set(HL, d); say1('hl-alert', ''); $('#w-water').value = ''; $('#w-walk').value = '';
    calSel = today(); drawAll();
  };

  // calendar: shapes, not only colours, tell the kinds apart
  let calM = new Date(); calM.setDate(1);
  let calSel = today();
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const kinds = (d, k) => {
    const x = d.days[k] || {}, out = [];
    if ((x.vitals || []).length) out.push('d-vit');
    if (x.mood) out.push('d-mood');
    if ((x.symptoms || []).length) out.push('d-sym');
    if (x.water != null || x.walk != null) out.push('d-well');
    if (d.appts.some((a) => a.date === k)) out.push('d-appt');
    return out;
  };
  const drawCal = () => {
    const d = load(), y = calM.getFullYear(), m = calM.getMonth();
    $('#cal-title').textContent = calM.toLocaleDateString(S.VOICE[S.P.lang], { month: 'long', year: 'numeric' });
    $('#cal-dow').replaceChildren(...DOW.map((x) => el('span', {}, x)));
    const cells = [];
    for (let i = 0; i < new Date(y, m, 1).getDay(); i++) cells.push(el('span', { class: 'cal-blank' }));
    const last = new Date(y, m + 1, 0).getDate();
    for (let i = 1; i <= last; i++) {
      const k = iso(new Date(y, m, i)), ks = kinds(d, k);
      const b = el('button', { type: 'button', class: 'cal-cell' + (k === today() ? ' today' : '') + (k === calSel ? ' sel' : ''), 'aria-label': i + (ks.length ? ', ' + ks.length + ' entries' : '') }, el('b', {}, String(i)), el('span', { class: 'dots' }, ...ks.map((c) => el('i', { class: 'dot ' + c }))));
      b.onclick = () => { calSel = k; drawCal(); drawDetail(); };
      cells.push(b);
    }
    $('#cal-grid').replaceChildren(...cells);
  };
  const drawDetail = () => {
    const d = load(), x = d.days[calSel] || {}, rows = [];
    const row = (label, text, warn) => el('li', warn ? { class: 'warn' } : {}, el('span', {}, (label ? label + '  ' : '') + text));
    (x.vitals || []).forEach((v) => rows.push(row(v.time, fmtV(v), vitalFlags(v).length > 0)));
    if (x.mood) rows.push(row('Mood', x.mood.mood + ' ' + MOOD[x.mood.mood - 1] + (x.mood.sleep != null ? ' · Sleep ' + x.mood.sleep + 'h' : '') + ' · Stress ' + x.mood.stress + (x.mood.lonely ? ' · Felt lonely' : '') + (x.mood.note ? '\n' + x.mood.note : '')));
    (x.symptoms || []).forEach((s) => rows.push(row(s.time, s.list.join(', ') + ' (' + s.sev + ')', s.sev === 'Severe' || s.list.includes('Chest pain') || s.list.includes('Breathlessness'))));
    if (x.water != null || x.walk != null) rows.push(row('Wellness', [x.water != null ? 'Water ' + x.water + ' glasses' : '', x.walk != null ? 'Walk ' + x.walk + ' min' : ''].filter(Boolean).join(' · ')));
    d.appts.filter((a) => a.date === calSel).forEach((a) => rows.push(row('Appointment', a.text)));
    $('#day-detail').replaceChildren(el('h3', { class: 'mini' }, fmtDate(new Date(calSel + 'T00:00:00'), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })),
      rows.length ? el('ul', { class: 'list' }, ...rows) : el('p', { class: 'note' }, 'Nothing recorded on this day.'));
  };
  $('#cal-prev').onclick = () => { calM = new Date(calM.getFullYear(), calM.getMonth() - 1, 1); drawCal(); };
  $('#cal-next').onclick = () => { calM = new Date(calM.getFullYear(), calM.getMonth() + 1, 1); drawCal(); };

  // trends: last 10 readings, two series differ by dash and marker (styles shared with the old chart)
  const svg = (tag, attrs = {}, ...kids) => { const nd = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) nd.setAttribute(k, attrs[k]); nd.append(...kids); return nd; };
  const chart = (box, series, label) => {
    const len = series[0].length;
    if (len < 2) { box.replaceChildren(el('p', { class: 'note' }, 'Add a few readings to see a trend.')); return; }
    const all = series.flat(), lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
    const W = 480, H = 180, L = 40, B = 20, T = 12, R = 12;
    const x = (i) => L + (i * (W - L - R)) / (len - 1), y = (v) => T + (1 - (v - lo) / span) * (H - T - B);
    const c = svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label });
    c.append(svg('line', { class: 'axis', x1: L, y1: T, x2: L, y2: H - B }), svg('line', { class: 'axis', x1: L, y1: H - B, x2: W - R, y2: H - B }), svg('text', { x: 4, y: T + 8 }, String(hi)), svg('text', { x: 4, y: H - B }, String(lo)));
    series.forEach((vals, si) => {
      c.append(svg('polyline', { class: 's' + (si + 1), points: vals.map((v, i) => x(i) + ',' + y(v)).join(' ') }));
      vals.forEach((v, i) => c.append(si ? svg('rect', { class: 'd2', x: x(i) - 4, y: y(v) - 4, width: 8, height: 8 }) : svg('circle', { class: 'd1', cx: x(i), cy: y(v), r: 4 })));
    });
    box.replaceChildren(c);
  };
  const drawTrends = () => {
    const d = load(), vs = Object.keys(d.days).sort().flatMap((k) => d.days[k].vitals || []);
    const bp = vs.filter((v) => v.sys && v.dia).slice(-10), sg = vs.filter((v) => v.sugar).slice(-10);
    chart($('#chart-bp'), [bp.map((v) => v.sys), bp.map((v) => v.dia)], 'Blood pressure trend');
    chart($('#chart-sugar'), [sg.map((v) => v.sugar)], 'Blood sugar trend');
  };

  // appointments
  const drawAppts = () => {
    const d = load(), now = new Date(today() + 'T00:00:00');
    const list = d.appts.slice().sort((a, b) => a.date.localeCompare(b.date));
    $('#a-list').replaceChildren(...(list.length ? list.map((a) => {
      const diff = Math.round((new Date(a.date + 'T00:00:00') - now) / 86400000);
      const when = diff === 0 ? t('today') : diff < 0 ? t('v_past') : fill(t('v_in'), { n: diff });
      return el('li', diff >= 0 && diff <= 2 ? { class: 'warn' } : {}, el('span', {}, fmtDate(new Date(a.date + 'T00:00:00'), { day: 'numeric', month: 'short', year: 'numeric' }) + ' (' + when + ')  ' + a.text),
        del(() => { const x = load(); x.appts = x.appts.filter((y) => y.id !== a.id); set(HL, x); drawAll(); }));
    }) : [el('li', {}, el('span', { class: 'muted' }, 'None recorded'))]));
  };
  $('#fa').onsubmit = (e) => {
    e.preventDefault();
    const date = $('#a-date').value, text = $('#a-text').value.trim().slice(0, 80);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !text) return;
    const d = load(); d.appts.push({ id: 'a' + Date.now(), date, text }); d.appts = d.appts.slice(-60); set(HL, d);
    e.target.reset(); drawAll();
  };

  const drawAll = () => { drawCal(); drawDetail(); drawTrends(); drawAppts(); };

  /* 1. medicine reminders */
  const drawRem = () => $('#rl').replaceChildren(...get('rem', []).map((r, i) => el('li', {}, el('span', {}, r.t + '  ' + r.x), del(remove('rem', i, drawRem)))));
  $('#fr').onsubmit = (e) => {
    e.preventDefault();
    const x = $('#rx').value.trim().slice(0, 80), tm = $('#rt').value;
    if (!x || !tm) return;
    const all = get('rem', []); all.push({ x, t: tm });
    all.sort((a, b) => a.t.localeCompare(b.t));
    set('rem', all.slice(0, 50)); e.target.reset(); drawRem();
  };
  const fired = new Set();
  setInterval(() => {
    const now = new Date(), hm = now.toTimeString().slice(0, 5);
    get('rem', []).forEach((r) => {
      const id = now.toDateString() + hm + r.x;
      if (r.t === hm && !fired.has(id)) { fired.add(id); $('#ring').textContent = t('c_ring') + ' ' + r.x; say(r.x); }
    });
  }, 10000);

  /* 3. BMI */
  $('#fb').onsubmit = (e) => {
    e.preventDefault();
    const h = num($('#bh').value) / 100, w = num($('#bw').value), out = $('#bres');
    if (!(h >= 1 && h <= 2.3 && w >= 20 && w <= 250)) { out.textContent = t('b_err'); return; }
    const b = w / (h * h);
    const cat = b < 18.5 ? 'b_lo' : b < 23 ? 'b_ok' : b < 25 ? 'b_mid' : 'b_hi';
    out.textContent = t('b_res') + ' ' + b.toFixed(1) + ', ' + t(cat);
  };

  /* 5. medicine stock */
  const drawStock = () => $('#sl').replaceChildren(...get('stock', []).map((m, i) => {
    const d = Math.floor(m.n / m.p), end = new Date(); end.setDate(end.getDate() + d);
    const soon = d <= 5;
    return el('li', soon ? { class: 'warn' } : {}, el('span', {}, (soon ? t('s_soon') + ' ' : '') + m.x + ': ' + fill(t('s_runs'), { d, date: fmtDate(end, { day: 'numeric', month: 'short' }) })), del(remove('stock', i, drawStock)));
  }));
  $('#fs').onsubmit = (e) => {
    e.preventDefault();
    const x = $('#sn').value.trim().slice(0, 60), n = Math.floor(num($('#sq').value)), p = Math.floor(num($('#sp').value)) || 1;
    if (!x || !(n >= 0 && n <= 2000) || p < 1 || p > 20) return;
    const all = get('stock', []); all.push({ x, n, p, on: today() }); set('stock', all.slice(0, 30)); e.target.reset(); drawStock();
  };

  /* 7. medical card */
  const FIELDS = [['kn', 'k_name'], ['kb', 'k_blood'], ['ka', 'k_allergy'], ['kc', 'k_cond'], ['km', 'k_meds'], ['kd', 'k_doc']];
  const drawCard = () => {
    const c = get('card', {}), dl = el('dl');
    FIELDS.forEach(([id, key]) => { if (c[id]) dl.append(el('dt', {}, t(key)), el('dd', {}, c[id])); });
    $('#idc').replaceChildren(...(dl.children.length ? [dl] : []));
  };
  const c0 = get('card', {}); FIELDS.forEach(([id]) => { $('#' + id).value = c0[id] || ''; });
  $('#fk').onsubmit = (e) => {
    e.preventDefault();
    const c = {}; FIELDS.forEach(([id]) => { c[id] = $('#' + id).value.trim().slice(0, 120); });
    set('card', c); drawCard();
  };
  $('#kp').onclick = () => window.print();

  onRender(() => { drawMoods(); drawChips(); drawAll(); drawRem(); drawStock(); drawCard(); });
})();
