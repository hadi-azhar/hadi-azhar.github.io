(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Language ----------
  function setLang(l) {
    root.lang = l;
    try { localStorage.setItem('lang', l); } catch (e) {}
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.setLang === l));
    });
    renderNumbers();
    renderCats();
  }
  document.querySelectorAll('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.setLang); });
  });

  function fmt(n) { return Number(n).toLocaleString(root.lang === 'id' ? 'id-ID' : 'en-US'); }

  // ---------- Flow tabs ----------
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.flow-steps [role="tab"]'));
  function select(tab, fromKeyboard) {
    tabs.forEach(function (t) {
      var on = t === tab;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      // Arrowing through six stages should feel instant, so keyboard switches skip the fade.
      panel.style.animation = fromKeyboard ? 'none' : '';
      panel.hidden = !on;
    });
    if (fromKeyboard) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t, false); });
    t.addEventListener('keydown', function (e) {
      var j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); select(tabs[j], true); }
    });
  });

  // ---------- Data ----------
  // Fallback mirrors data.json at build time, so the page still reads right if the fetch fails.
  // Application counts are deliberately absent here and in data.json.
  var data = {
    updated: '2026-10-17',
    adverts_read: 2144,
    verdicts: { LOCKED: 1103, GATE: 679, OK: 243, DEAD: 82, PAID: 26 },
    categories: [
      { key: 'ai', fit_median: 85, scored: 31 },
      { key: 'recruit', fit_median: 76, scored: 16 },
      { key: 'support', fit_median: 60, scored: 51 },
      { key: 'backoffice', fit_median: 54, scored: 80 }
    ]
  };

  var NAMES = {
    ai: { en: 'AI data & evaluation', id: 'Data & evaluasi AI' },
    recruit: { en: 'Recruitment & HR', id: 'Rekrutmen & HR' },
    support: { en: 'Customer support', id: 'Layanan pelanggan' },
    backoffice: { en: 'Back office & data admin', id: 'Back office & admin data' },
    language: { en: 'Language services', id: 'Layanan bahasa' }
  };
  var MIN_SCORED = 10; // categories with fewer scored adverts are too thin to show

  function renderNumbers() {
    document.querySelectorAll('[data-num]').forEach(function (el) {
      var v = data[el.dataset.num];
      if (v != null) el.textContent = fmt(v);
    });
    document.querySelectorAll('[data-v]').forEach(function (el) {
      var v = data.verdicts[el.dataset.v];
      if (v != null) el.textContent = fmt(v);
    });
    var u = document.querySelector('[data-updated]');
    if (u && data.updated) {
      u.dateTime = data.updated;
      u.textContent = new Date(data.updated + 'T00:00:00').toLocaleDateString(
        root.lang === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  var list = document.querySelector('[data-cats]');
  function renderCats() {
    if (!list) return;
    var rows = data.categories
      .filter(function (c) { return NAMES[c.key] && c.fit_median != null && c.scored >= MIN_SCORED; })
      .sort(function (a, b) { return b.fit_median - a.fit_median; });
    list.innerHTML = rows.map(function (c, i) {
      return '<li class="cat-row" style="--i:' + i + '">' +
        '<span class="cat-name">' + NAMES[c.key][root.lang] + '</span>' +
        '<span class="cat-bar" style="--v:' + c.fit_median + '" role="img" aria-label="' + c.fit_median + ' / 100">' +
          '<i></i><span>' + c.fit_median + '</span></span>' +
      '</li>';
    }).join('');
  }

  setLang(root.lang === 'id' ? 'id' : 'en');

  fetch('data.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { data = d; renderNumbers(); renderCats(); })
    .catch(function () { /* keep the fallback */ });

  // ---------- Scroll reveals ----------
  // Classes are added here, so with JS off or reduced motion everything is simply visible.
  var cats = document.querySelector('.cats');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    if (cats) cats.classList.add('in');
    return;
  }
  // Document order matters: when one block shows, every block above it shows too, so a
  // nav jump that skips past a section (no intersection ever fires for it) never leaves it hidden.
  var targets = Array.prototype.slice.call(document.querySelectorAll(
    '.how-list, .section-head, .feature, .cats, .grid > .project, .record-list, .tools-wrap, .letter blockquote, .contact-lead'));
  targets.forEach(function (el) { if (el !== cats) el.classList.add('reveal'); });

  function show(upTo) {
    for (var k = 0; k <= upTo; k++) {
      if (!targets[k].classList.contains('in')) { targets[k].classList.add('in'); io.unobserve(targets[k]); }
    }
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      // Already above the viewport (jumped past) counts as seen.
      if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
      show(targets.indexOf(e.target));
    });
  }, { threshold: [0, 0.15], rootMargin: '0px 0px -8% 0px' });

  targets.forEach(function (el) { io.observe(el); });
})();
