/* Sakhi bridge: runs the old app's handlers without inline JavaScript, so the page keeps its strict
   Content Security Policy. An attribute like data-onclick="calNav(-1)" is read as: one allowed function
   name, then simple arguments (text in quotes, numbers, this, this.value, this.checked, or one of the old
   app's variables). Anything else is ignored, never evaluated. */
(function () {
  'use strict';
  const ALLOW = new Set(["addAppt", "addNewPatientPrompt", "apptICS", "apptNote", "calNav", "calToday", "calculateCyclePhase", "checkPostpartumScreening", "closePMDDModal", "closeQL", "delAppt", "delEvent", "deleteActivePatient", "deleteReading", "eddChanged", "enableAlerts", "flipCard", "lmpChanged", "loadDemoCycleData", "openPMDDModal", "openQL", "periodICS", "recordPeriodStart", "renderEpds", "saveAndEvaluateMotherWatch", "saveDailyCheckIn", "savePeriodReminder", "saveQL", "saveQLSymptoms", "selectCalDay", "suggestAppts", "switchPatientProfile", "toggleAppt", "toggleQLSym", "toggleTest"]);
  const CALL = /^\s*([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)\s*;?\s*$/;

  function splitArgs(s) {
    const out = []; let cur = '', q = null;
    for (const ch of s) {
      if (q) { cur += ch; if (ch === q && cur.slice(-2, -1) !== '\\') q = null; continue; }
      if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
      if (ch === ',') { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim() !== '') out.push(cur.trim());
    return out;
  }
  function value(a, el) {
    if (/^-?\d+(\.\d+)?$/.test(a)) return Number(a);
    const m = /^(['"])([\s\S]*)\1$/.exec(a);
    if (m) return m[2].replace(/\\(['"\\])/g, '$1');
    if (a === 'this') return el;
    if (a === 'this.value') return el.value;
    if (a === 'this.checked') return el.checked;
    if (a === 'true' || a === 'false') return a === 'true';
    if (/^[A-Za-z_$][\w$]*$/.test(a) && typeof __sakhiVar === 'function') return __sakhiVar(a);
    throw new Error('unsupported argument: ' + a);
  }
  function run(el, attr) {
    const m = CALL.exec(el.getAttribute(attr) || '');
    if (!m || !ALLOW.has(m[1]) || typeof window[m[1]] !== 'function') return;
    try { window[m[1]].apply(el, splitArgs(m[2]).map(a => value(a, el))); }
    catch (e) { console.warn('Sakhi:', e); }
  }
  ['click', 'change', 'input'].forEach(type => {
    document.addEventListener(type, e => {
      const attr = 'data-on' + type;
      const el = e.target.closest && e.target.closest('[' + attr + ']');
      if (el && el.closest('#sakhi')) run(el, attr);
    });
  });
  const start = () => { if (typeof sakhiInit === 'function') sakhiInit(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
