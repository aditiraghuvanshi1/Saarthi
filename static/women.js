/* Saarthi - Women's Health page: seven tools, all stored on this device. */
(() => {
  'use strict';
  const S = window.Saarthi;
  if (!S || document.body.dataset.page !== 'women') return;
  const { $, el, get, set, t, fmtDate, iso, onRender } = S;

  const DAY = 86400000;
  const at = (s) => new Date(s + 'T00:00:00');
  const add = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const today = () => at(iso(new Date()));
  const when = (d) => fmtDate(d, { day: 'numeric', month: 'long', year: 'numeric' });
  const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' });
  const bad = (n, lo, hi) => !(n >= lo && n <= hi);

  /* 1. period and fertile days */
  const showCycle = () => {
    const c = get('cycle', null), out = $('#cres');
    if (!c) { out.textContent = ''; return; }
    const start = at(c.d), len = Number(c.l);
    if (isNaN(start) || bad(len, 20, 45)) { out.textContent = t('p_err'); return; }
    const next = add(start, len), ov = add(next, -14), left = Math.round((next - today()) / DAY);
    out.textContent = [
      t('p_next') + ' ' + when(next) + (left >= 0 ? ' (' + t('p_left') + ': ' + left + ')' : ''),
      t('p_ov') + ' ' + when(ov),
      t('p_fert') + ': ' + short(add(ov, -5)) + ' – ' + short(add(ov, 1)),
    ].join('\n');
  };
  $('#fc').onsubmit = (e) => { e.preventDefault(); set('cycle', { d: $('#lp').value, l: Number($('#cl').value) }); showCycle(); };
  const c0 = get('cycle', null); if (c0) { $('#lp').value = c0.d; $('#cl').value = c0.l; }

  /* 2. symptom diary */
  const LEVELS = ['0', '1', '2', '3'], MOODS = ['good', 'ok', 'low', 'irr'];
  const fillSel = (id, keys) => { const s = $(id), v = s.value; s.replaceChildren(...keys.map((k, i) => el('option', { value: i }, t('y_' + k)))); s.value = v || '0'; };
  const drawDiary = () => {
    fillSel('#yf', LEVELS); fillSel('#yp', LEVELS); fillSel('#ym', MOODS);
    $('#yl').replaceChildren(...get('diary', []).map((r, i) => {
      const li = el('li', r.f === 3 && r.p === 3 ? { class: 'warn' } : {});
      const b = el('button', { type: 'button', class: 'btn ghost small' }, t('del'));
      b.onclick = () => { const a = get('diary', []); a.splice(i, 1); set('diary', a); drawDiary(); };
      li.append(el('span', {}, short(at(r.d)) + ': ' + t('y_flow') + ' ' + t('y_' + r.f) + ', ' + t('y_pain') + ' ' + t('y_' + r.p) + ', ' + t('y_mood') + ' ' + t('y_' + MOODS[r.m]) + (r.n ? ' – ' + r.n : '')), b);
      return li;
    }));
  };
  $('#yd').value = iso(new Date());
  $('#fy').onsubmit = (e) => {
    e.preventDefault();
    const r = { d: $('#yd').value || iso(new Date()), f: +$('#yf').value, p: +$('#yp').value, m: +$('#ym').value, n: $('#yn').value.trim().slice(0, 80) };
    $('#yflag').textContent = r.f === 3 && r.p === 3 ? t('y_flag') : '';
    const a = get('diary', []); a.unshift(r); a.sort((x, y) => y.d.localeCompare(x.d));
    set('diary', a.slice(0, 60)); $('#yn').value = ''; drawDiary();
  };

  /* 3. pregnancy due date */
  const showDue = () => {
    const d = get('lmp', null), out = $('#gres');
    if (!d) { out.textContent = ''; return; }
    const diff = Math.round((today() - at(d)) / DAY);
    if (isNaN(diff) || diff < 0 || diff > 300) { out.textContent = t('g_err'); return; }
    const wk = Math.floor(diff / 7), tri = wk < 13 ? 1 : wk < 28 ? 2 : 3;
    out.textContent = [t('g_due') + ': ' + when(add(at(d), 280)), t('g_now') + ' ' + wk + ' ' + t('g_wk') + ' ' + (diff % 7) + ' ' + t('g_dy'), t('g_tri') + ': ' + tri].join('\n');
  };
  $('#fg').onsubmit = (e) => { e.preventDefault(); set('lmp', $('#gl').value || null); showDue(); };
  if (get('lmp', null)) $('#gl').value = get('lmp', '');

  /* checklists (iron and danger signs): ticks survive a language change */
  const checklist = (box, prefix, count, name, onChange) => {
    const have = new Set([...box.querySelectorAll('input:checked')].map((i) => i.value));
    box.replaceChildren(...Array.from({ length: count }, (_, i) => {
      const id = name + (i + 1), cb = el('input', { type: 'checkbox', id, value: String(i + 1) });
      cb.checked = have.has(String(i + 1)); cb.onchange = onChange;
      return el('label', { for: id }, cb, t(prefix + (i + 1)));
    }));
  };
  const ticks = (box) => box.querySelectorAll('input:checked').length;
  let ironTouched = false, dangerTouched = false;
  const showIron = () => {
    const n = ticks($('#ironbox'));
    $('#ires').textContent = !ironTouched ? '' : n >= 3 ? t('i_hi') : t('i_lo');
    $('#ifood').textContent = t('i_food');
  };
  const showDanger = () => {
    const n = ticks($('#dangerbox'));
    $('#nres').textContent = n ? t('n_alert') : '';
    $('#nok').textContent = dangerTouched && !n ? t('n_ok') : '';
  };

  /* 6. breast self-check reminder */
  const showBreast = () => {
    const day = get('bday', null), out = $('#bres');
    if (!day) { out.textContent = ''; return; }
    const now = today();
    let d = new Date(now.getFullYear(), now.getMonth(), day);
    if (d < now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
    out.textContent = t('b_next') + ' ' + when(d);
  };
  $('#fbr').onsubmit = (e) => { e.preventDefault(); const n = Math.floor(Number($('#bd').value)); if (n >= 1 && n <= 28) { set('bday', n); showBreast(); } };
  if (get('bday', null)) $('#bd').value = get('bday', '');

  /* 7. helplines */
  const LINES = [['112', 'h_112'], ['181', 'h_181'], ['1091', 'h_1091'], ['102', 'h_102'], ['14416', 'h_14416']];
  const drawLines = () => $('#hl').replaceChildren(...LINES.map(([n, k]) => el('a', { class: 'btn ghost', href: 'tel:' + n }, t(k))));

  $('#ironbox').addEventListener('change', () => { ironTouched = true; showIron(); });
  $('#dangerbox').addEventListener('change', () => { dangerTouched = true; showDanger(); });

  onRender(() => {
    showCycle(); drawDiary(); showDue(); showBreast(); drawLines();
    checklist($('#ironbox'), 'i_', 6, 'ir', () => {});
    checklist($('#dangerbox'), 'n_', 8, 'dg', () => {});
    showIron(); showDanger();
    $('#hdoc').textContent = t('h_doc');
    $('#bsteps').replaceChildren(...[1, 2, 3, 4].map((i) => el('li', {}, t('b_s' + i))));
  });
})();
