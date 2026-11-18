/* Saarthi - shared script: settings, language, nav, SOS, and the simple pages. */
(() => {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const get = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch { return fallback; }
  };
  const set = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ } };

  // Elements are built with setAttribute and text nodes only, so user text is never parsed as HTML.
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    node.append(...children);
    return node;
  };
  const on = (selector, handler) => { const n = $(selector); if (n) n.onclick = handler; };
  const getText = (n) => ('value' in n ? n.value : n.textContent);

  /* ---------- languages and saved settings ---------- */
  const TEXT = window.SaarthiText;
  const NAMES = window.SaarthiNames;
  const VOICE = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', mr: 'mr-IN', ta: 'ta-IN' };

  const P = Object.assign({ size: 0, cb: 0, lang: 'en', rate: 1 }, get('prefs', {}));
  if (!NAMES[P.lang]) P.lang = 'en';
  P.size = P.size ? 1 : 0; // one larger size only

  const t = (key) => (TEXT[P.lang] && TEXT[P.lang][key]) || TEXT.en[key] || key;
  const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));
  const fmtDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => d.toLocaleDateString(VOICE[P.lang], opts);
  const iso = (d) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };

  const page = document.body.dataset.page;
  const user = sessionStorage.getItem('sess');
  if (page !== 'auth' && !user) { location.replace('index.html'); return; }
  if (page === 'auth' && user) { location.replace('home.html'); return; }

  const renderers = [];
  const onRender = (fn) => { renderers.push(fn); fn(); };

  /* ---------- top strip ---------- */
  const header = $('#top');
  const bar = el('div', { class: 'bar' });
  const group = el('div', { class: 'tools-group' });
  const sizeBtn = el('button', { type: 'button', 'data-i18n': 'size' });
  const colorBtn = el('button', { type: 'button', 'data-i18n': 'color' });
  const langSel = el('select');
  for (const code in NAMES) langSel.append(el('option', { value: code }, NAMES[code]));
  langSel.value = P.lang;

  const apply = () => {
    const root = document.documentElement;
    root.dataset.size = P.size;
    root.dataset.cb = P.cb;
    root.lang = P.lang;
    $$('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    $$('[data-i18n-aria]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.i18nAria)));
    $$('[data-i18n-alt]').forEach((n) => n.setAttribute('alt', t(n.dataset.i18nAlt)));
    sizeBtn.setAttribute('aria-pressed', P.size ? 'true' : 'false');
    colorBtn.setAttribute('aria-pressed', P.cb ? 'true' : 'false');
    langSel.setAttribute('aria-label', t('langlabel'));
    document.title = (page === 'auth' ? t('login') : t('nav_' + page)) + ' | Saarthi';
    renderers.forEach((fn) => fn());
  };
  const keep = () => { set('prefs', P); apply(); };

  sizeBtn.onclick = () => { P.size = P.size ? 0 : 1; keep(); };
  colorBtn.onclick = () => { P.cb = P.cb ? 0 : 1; keep(); };
  langSel.onchange = () => { P.lang = langSel.value; keep(); };

  group.append(sizeBtn, colorBtn, langSel);
  bar.append(el(user ? 'a' : 'span', user ? { class: 'mark', href: 'home.html' } : { class: 'mark' }, 'Saarthi'), group);
  header.append(bar);

  if (user) {
    const signOut = el('button', { type: 'button', 'data-i18n': 'out' });
    signOut.onclick = () => { sessionStorage.clear(); location.replace('index.html'); };
    group.append(signOut);
    const nav = el('nav', { 'data-i18n-aria': 'nav_home' });
    ['home', 'speak', 'read', 'simplify', 'care', 'women'].forEach((k) => {
      const link = el('a', { href: k + '.html', 'data-i18n': 'nav_' + k });
      if (k === page) link.setAttribute('aria-current', 'page');
      nav.append(link);
    });
    header.append(nav);
  }

  /* ---------- speech out, copy, download ---------- */
  const say = (text) => {
    if (!window.speechSynthesis) { alert(t('nospeech')); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE[P.lang];
    u.rate = P.rate || 1;
    speechSynthesis.speak(u);
  };
  const download = (name, text) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = el('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  $$('.halt').forEach((b) => { b.onclick = () => window.speechSynthesis && speechSynthesis.cancel(); });
  $$('[data-say]').forEach((b) => { b.onclick = () => say(getText($(b.dataset.say))); });
  $$('[data-dl]').forEach((b) => { b.onclick = () => download('saarthi-' + page + '.txt', getText($(b.dataset.dl))); });
  $$('[data-copy]').forEach((b) => {
    b.onclick = async () => {
      try { await navigator.clipboard.writeText(getText($(b.dataset.copy))); b.textContent = t('copied'); }
      catch { b.textContent = t('nocopy'); }
      setTimeout(() => { b.textContent = t('copy'); }, 1500);
    };
  });

  window.Saarthi = { $, $$, el, on, get, set, t, fill, fmtDate, iso, P, say, download, onRender, VOICE };

  /* ---------- sign in / sign up ---------- */
  const toHex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
  const hash = async (pw, salt) => toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + pw)));

  if (page === 'auth') {
    const form = $('#auth');
    const msg = $('#msg');
    let failures = 0, lockedUntil = 0;
    $('#show').onchange = (e) => { $('#pw').type = e.target.checked ? 'text' : 'password'; };

    form.onsubmit = async (e) => {
      e.preventDefault();
      msg.textContent = '';
      if (Date.now() < lockedUntil) { msg.textContent = t('e_wait'); return; }
      const mode = (e.submitter && e.submitter.value) || 'login';
      const email = $('#em').value.trim().toLowerCase();
      const pw = $('#pw').value;
      if (!/^[^\s@]{1,64}@[^\s@]{1,63}\.[^\s@]{2,}$/.test(email)) { msg.textContent = t('e_email'); return; }
      if (pw.length < 8) { msg.textContent = t('e_pw'); return; }

      const users = get('users', {});
      if (mode === 'signup') {
        if (Object.hasOwn(users, email)) { msg.textContent = t('e_exists'); return; }
        const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
        users[email] = { salt, h: await hash(pw, salt) };
        set('users', users);
      } else {
        const account = Object.hasOwn(users, email) && users[email];
        if (!account || account.h !== await hash(pw, account.salt)) {
          if (++failures >= 5) { lockedUntil = Date.now() + 60000; failures = 0; }
          msg.textContent = t('e_bad');
          return;
        }
      }
      sessionStorage.setItem('sess', email);
      location.replace('home.html');
    };
  }

  /* ---------- home ---------- */
  if (page === 'home') {
    $('#hello').textContent = user.split('@')[0];
    onRender(() => {
      const reminders = get('rem', []);
      const nowHM = new Date().toTimeString().slice(0, 5);
      const next = reminders.find((r) => r.t >= nowHM) || reminders[0];
      const last = get('log', [])[0];
      $('#nextRem').textContent = next ? next.t + '  ' + next.x : t('f_noRem');
      $('#lastLog').textContent = last ? (TEXT.en['m_' + last.k] ? t('m_' + last.k) : last.k) + ': ' + last.v : t('f_noLog');
    });
  }

  /* ---------- speak ---------- */
  if (page === 'speak') {
    const txt = $('#txt'), rate = $('#rate'), rateOut = $('#rateOut'), words = $('#wc');
    const mic = $('#mic'), out = $('#out'), status = $('#sst');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null, count = 0, err = false;

    rate.value = P.rate;
    rateOut.textContent = Number(P.rate).toFixed(1) + 'x';
    rate.oninput = () => { P.rate = Number(rate.value); set('prefs', P); rateOut.textContent = P.rate.toFixed(1) + 'x'; };
    txt.oninput = () => { count = txt.value.trim().split(/\s+/).filter(Boolean).length; words.textContent = count + ' ' + t('words'); };
    onRender(() => {
      words.textContent = count + ' ' + t('words');
      status.textContent = !SR ? t('sst_no') : err ? t('sst_err') : t('sst_ok');
      mic.textContent = rec ? t('stop') : t('mic');
    });

    if (!SR) mic.disabled = true;
    else mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = VOICE[P.lang];
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) out.value += (out.value ? ' ' : '') + e.results[i][0].transcript.trim();
        }
      };
      rec.onerror = () => { err = true; status.textContent = t('sst_err'); };
      rec.onend = () => { rec = null; mic.setAttribute('aria-pressed', 'false'); mic.textContent = t('mic'); };
      err = false;
      mic.setAttribute('aria-pressed', 'true');
      mic.textContent = t('stop');
      rec.start();
    };
    on('#clr', () => { out.value = ''; });
  }

  /* ---------- read: photo or PDF summary from the backend ---------- */
  if (page === 'read') {
    const input = $('#f'), preview = $('#pv'), status = $('#st');
    let previewUrl = '', state = '';
    const say_ = (key) => { state = key; status.textContent = key ? t(key) : ''; };
    onRender(() => { if (state) status.textContent = t(state); });

    input.onchange = () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const file = input.files[0];
      preview.hidden = true;
      if (file && file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
        preview.src = previewUrl;
        preview.hidden = false;
      }
      state = '';
      status.textContent = file ? file.name : '';
    };

    on('#go', async () => {
      const file = input.files[0];
      if (!file) { say_('r_first'); return; }
      if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type)) { say_('r_type'); return; }
      if (file.size > 5242880) { say_('r_size'); return; }

      say_('r_reading');
      const body = new FormData();
      body.append('file', file);
      body.append('lang', P.lang);
      try {
        const res = await fetch('/api/summarize', { method: 'POST', body, credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const map = { too_big: 'r_size', bad_type: 'r_type', rate_limited: 'r_busy', not_configured: 'r_conf', unreadable: 'r_unread' };
          say_(map[data.error] || 'r_fail');
          return;
        }
        $('#sum').textContent = String(data.summary || '').slice(0, 2500);
        say_('r_done');
      } catch { say_('r_fail'); }
    });
  }

  /* ---------- simplify: medical short forms to everyday words, in the chosen language ---------- */
  if (page === 'simplify') {
    const WORDS = {
      'tab': 'w_tab', 'cap': 'w_cap', 'syp': 'w_syp', 'inj': 'w_inj',
      'hypertension': 'w_htn', 'diabetes mellitus': 'w_dm',
      'hypoglyc(?:a)?emia': 'w_hypo', 'hyperglyc(?:a)?emia': 'w_hyper',
      'analgesic': 'w_analg', 'antipyretic': 'w_antipy', 'antibiotic': 'w_abx',
      'anti-inflammatory': 'w_antiinf', 'contraindicated': 'w_contra',
      'dyspn(?:o)?ea': 'w_dysp', 'ed(?:e)?ma': 'w_edema', 'nausea': 'w_nausea',
      'prn': 'w_prn', 'od': 'w_od', 'bd|bid': 'w_bd', 'tds|tid': 'w_tds', 'qid': 'w_qid', 'hs': 'w_hs',
      'h(?:a)?emoglobin': 'w_hb', 'after food': 'w_af', 'before food': 'w_bf', 'in the morning': 'w_morn', 'review': 'w_rev',
    };
    let ran = false;

    on('#ex', () => {
      $('#src').value = 'Tab Metformin 500 mg BD after food. Tab Amlodipine 5 mg OD in the morning. Patient has hypertension and diabetes mellitus. Haemoglobin 9.8 g/dL. Review after 2 weeks.';
    });

    // Built-in word list: works offline, and is the fallback when the AI is not available.
    const basic = () => {
      let text = $('#src').value.slice(0, 5000);
      for (const k in WORDS) text = text.replace(new RegExp('\\b(' + k + ')\\b', 'gi'), t(WORDS[k]));
      return text.split(/(?<=[.;])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
    };
    const showDoses = (lines) => {
      const doses = lines.filter((l) => /\d+(\.\d+)?\s?(mg|mcg|ml|g|iu)\b/i.test(l));
      $('#doses').replaceChildren(...doses.map((d) => el('li', {}, d)));
      $('#dosehead').hidden = doses.length === 0;
    };
    const status = (key) => { const s = $('#simp-status'); s.hidden = !key; s.textContent = key ? t(key) : ''; };

    // Is the AI explanation available on this server? (GET /api/health says so; no server means no.)
    let aiReady = null;
    const checkAI = async () => {
      if (aiReady !== null) return aiReady;
      try { const r = await fetch('/api/health', { cache: 'no-store' }); aiReady = r.ok && (await r.json()).ai === true; }
      catch { aiReady = false; }
      return aiReady;
    };
    checkAI();

    let lastKey = '';
    const run = async (force) => {
      const src = $('#src').value.trim().slice(0, 5000);
      if (!src) return;
      const lines = basic();
      showDoses(lines);                          // doses are always read straight from the text, exactly as written
      const key = P.lang + '|' + src;
      if (!force && key === lastKey) return;     // same text and language: keep what is shown
      lastKey = key;
      if (!(await checkAI())) { $('#sum').textContent = lines.join('\n'); status('simp_basic'); return; }
      const btn = $('#simp');
      btn.disabled = true; status('simp_busy'); $('#sum').textContent = '';
      try {
        const r = await fetch('/api/simplify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: src, lang: P.lang }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.text) { $('#sum').textContent = j.text; status('simp_ai'); }
        else if (j.error === 'not_medical') { $('#sum').textContent = ''; status('simp_notmed'); lastKey = ''; }
        else if (j.error === 'rate_limited') { $('#sum').textContent = lines.join('\n'); status('r_busy'); lastKey = ''; }
        else { $('#sum').textContent = lines.join('\n'); status('simp_basic'); lastKey = ''; }
      } catch {
        $('#sum').textContent = lines.join('\n'); status('simp_basic'); lastKey = '';
      } finally { btn.disabled = false; }
    };
    on('#simp', () => { ran = true; run(true); });
    onRender(() => { if (ran) run(false); });
  }

  /* ---------- footer ---------- */
  document.body.append(el('footer', { 'data-i18n': 'footer' }));

  /* ---------- SOS: one small button on every page ---------- */
  const sosBtn = el('button', { type: 'button', class: 'sosbtn', 'data-i18n': 'sos' });
  const dialog = el('dialog', { class: 'sos', 'aria-labelledby': 'sh' });
  const contact = el('input', { id: 'sc', type: 'tel', maxlength: '16', autocomplete: 'tel' });
  const status = el('p', { role: 'status' });
  const sms = el('a', { class: 'btn ghost', href: '#', 'data-i18n': 'sos_sms' });
  const saveBtn = el('button', { type: 'button', class: 'btn ghost', 'data-i18n': 'save' });
  const closeBtn = el('button', { type: 'button', class: 'btn ghost', 'data-i18n': 'close' });
  dialog.append(
    el('h2', { id: 'sh', 'data-i18n': 'sos_h' }),
    el('a', { class: 'btn', href: 'tel:112', 'data-i18n': 'sos_call' }),
    el('p', { 'data-i18n': 'sos_112' }),
    el('label', { for: 'sc', 'data-i18n': 'sos_c' }),
    contact,
    el('div', { class: 'row' }, saveBtn, sms),
    status,
    closeBtn
  );
  document.body.append(sosBtn, dialog);

  let where = '';
  const number = () => contact.value.replace(/[^\d+]/g, '');
  const refresh = () => {
    const n = number();
    const body = t('sos_body') + ' ' + (where || t('sos_na'));
    sms.href = n ? 'sms:' + n + '?&body=' + encodeURIComponent(body) : '#';
    sms.setAttribute('aria-disabled', n ? 'false' : 'true');
    status.textContent = n ? (where ? t('sos_found') : t('sos_finding')) : t('sos_nonum');
  };
  onRender(refresh);
  sms.onclick = (e) => { if (!number()) e.preventDefault(); };
  contact.oninput = refresh;
  saveBtn.onclick = () => { set('contact', number()); refresh(); };
  closeBtn.onclick = () => dialog.close();
  sosBtn.onclick = () => {
    contact.value = get('contact', '');
    where = '';
    dialog.showModal();
    refresh();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => { where = 'https://maps.google.com/?q=' + p.coords.latitude + ',' + p.coords.longitude; refresh(); },
        () => { status.textContent = t('sos_deny'); },
        { timeout: 10000 }
      );
    }
  };

  apply();
})();
