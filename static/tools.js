/* Saarthi - Care and Women pages show a list of tools; opening one shows only that tool. */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;
  const panels = [...main.querySelectorAll('.cards > .panel')];
  const show = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = panels.find((p) => p.id === id);
    main.dataset.tool = target ? id : '';
    panels.forEach((p) => { p.hidden = p !== target; });
    window.scrollTo(0, 0);
    if (target) { const h = target.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
  };
  window.addEventListener('hashchange', show);
  show();
})();
