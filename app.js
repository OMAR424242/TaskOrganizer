(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KEY = 'onething.v3';

  /* ── Topic colours ──────────────────────────────────────
     Ten saturated hues. Deliberately the *same* colour in both themes — that
     is what keeps a bright palette feeling like one app rather than two. The
     dark value is nudged up a little only where the hue loses punch against a
     dark ground. These are fills: borders, tints, dots, bars. Where a topic
     colour has to carry small text, the stylesheet mixes it toward the ink. */
  /* Eighteen, round the wheel, each one loud enough to be recognised as
     itself from across a room — a topic colour is data, and two topics you
     have to squint at are two topics you stop using. The dark column is not
     the same hex: a colour that sings on white goes muddy on a dark ground
     unless it is lifted. Slate is the one deliberate exception, for the
     topic somebody wants to disappear. */
  var SWATCHES = [
    { id: 'green',   l: '#4ead2b', d: '#63cc38' },
    { id: 'lime',    l: '#86cc16', d: '#a3e635' },
    { id: 'mint',    l: '#00c46a', d: '#1ed983' },
    { id: 'teal',    l: '#00cdb3', d: '#14e0c6' },
    { id: 'cyan',    l: '#00bcd9', d: '#22d3ee' },
    { id: 'sky',     l: '#2aa5ff', d: '#4db6ff' },
    { id: 'blue',    l: '#0eaaf7', d: '#31bcff' },
    { id: 'indigo',  l: '#6366f1', d: '#818cf8' },
    { id: 'violet',  l: '#9b5cff', d: '#b07dff' },
    { id: 'purple',  l: '#ce82ff', d: '#d99bff' },
    { id: 'magenta', l: '#ea45ce', d: '#fb69e3' },
    { id: 'pink',    l: '#ff6fc4', d: '#ff8ed2' },
    { id: 'rose',    l: '#ff4d7e', d: '#ff6f97' },
    { id: 'red',     l: '#ff3b3b', d: '#ff6262' },
    { id: 'coral',   l: '#ff6a3d', d: '#ff855e' },
    { id: 'orange',  l: '#ff9600', d: '#ffab2e' },
    { id: 'amber',   l: '#f0a500', d: '#ffc22e' },
    { id: 'yellow',  l: '#ffc800', d: '#ffd93d' },
    { id: 'slate',   l: '#7c93a0', d: '#94aab6' }
  ];
  function swatch(id) {
    return SWATCHES.filter(function (x) { return x.id === id; })[0];
  }
  var SW_FALLBACK = swatch('slate');
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  }
  var RETIRED = { clay: 'orange', amber: 'yellow', olive: 'green', forest: 'green',
                  plum: 'purple', rose: 'red', sand: 'orange', stone: 'slate' };
  function swatchColor(id) {
    id = RETIRED[id] || id;
    var s = swatch(id) || SW_FALLBACK;
    return isDark() ? s.d : s.l;
  }

  /* ── Time ─────────────────────────────────────────────── */
  function localDay(at, startHour) {
    var d = new Date(at.getTime());
    if (d.getHours() < startHour) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }
  function parseDay(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayName(k) {
    return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][parseDay(k).getDay()];
  }
  function shiftDay(k, n) {
    var d = parseDay(k); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  /* ── State ────────────────────────────────────────────── */
  function fresh() {
    return {
      name: '', avatar: '', dayStart: 4, theme: '', uid: 200,
      wall: { k: 'none' }, wallDim: 58, onboarded: false, sound: true,
      topics: [
        { id: 't1', n: 'Personal',    sw: 'purple' },
        { id: 't2', n: 'Health',      sw: 'green'  },
        { id: 't3', n: 'Home',        sw: 'orange' },
        { id: 't4', n: 'Work/School', sw: 'blue'   }
      ],
      /* Empty on purpose. A new install used to arrive with eight example
         tasks in it, which reads as somebody else's list that you have to
         clear before you can start — the opposite of what this app is for.
         The welcome flow asks for the real ones instead. */
      library: [],
      day: null, history: [], removed: [], libDel: [], topDel: []
    };
  }
  function nid() { return Math.floor(Math.random() * 8999999999999) + 1000000000000; }

  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
  if (!S || !S.topics || !S.library) S = fresh();
  if (!S.removed) S.removed = [];
  if (!S.libDel) S.libDel = [];
  if (!S.topDel) S.topDel = [];
  if (!S.history) S.history = [];
  if (!S.wall) S.wall = { k: 'none' };
  if (typeof S.wallDim !== 'number') S.wallDim = 58;
  if (typeof S.sound !== 'boolean') S.sound = true;

  /* The build before this one seeded eight example tasks. If a device still
     has exactly those, with nothing finished and nothing of its own added,
     then nobody ever really used it — clear them out so the welcome can do
     its job. One edit, one completion, one extra task, and this leaves the
     whole thing alone: the ids of real tasks are thirteen digits, these
     were 1 to 8. */
  var SEEDED = ['Morning meds', 'Walk the dog', 'Bins out', 'Pay the rent',
                'Tidy the kitchen', 'Clear the inbox', 'Call Mum', 'Book the dentist'];
  function untouchedSeed() {
    if (!S.library || S.library.length !== SEEDED.length) return false;
    if ((S.history || []).length) return false;
    return S.library.every(function (t, i) { return t.id === i + 1 && t.t === SEEDED[i]; });
  }
  if (untouchedSeed()) {
    S.library = [];
    S.day = null;              // it pointed at tasks that no longer exist
    S.onboarded = false;
  }
  if (typeof S.onboarded !== 'boolean') {
    // Anyone already carrying a list of their own has been through this.
    S.onboarded = S.library.length > 0 || S.history.length > 0;
  }
  function save() {
    S.rev = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    if (window.OTSync) OTSync.touch();
  }
  if (S.theme) document.documentElement.setAttribute('data-theme', S.theme);

  /* ── Repeat rules ──────────────────────────────────────
     none  · once, sits in the library until you pick it
     daily · every day
     week  · chosen weekdays, e.g. Tuesday and Friday
     month · a date each month, clamped to the last day in short months */
  var WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function repLabel(r) {
    if (!r || r.k === 'none') return '';
    if (r.k === 'daily') return 'Every day';
    if (r.k === 'week') {
      var d = (r.d || []).slice().sort(function (a, b) { return a - b; });
      if (!d.length) return 'Weekly';
      if (d.length === 7) return 'Every day';
      if (d.length === 5 && d.join() === '1,2,3,4,5') return 'Weekdays';
      if (d.length === 2 && d.join() === '0,6') return 'Weekends';
      return d.map(function (i) { return WD[i]; }).join(', ');
    }
    if (r.k === 'month') return ordinal(r.d) + ' of the month';
    return '';
  }
  function ordinal(n) {
    var s2 = ['th','st','nd','rd'], v = n % 100;
    return n + (s2[(v - 20) % 10] || s2[v] || s2[0]);
  }
  function dueOn(t, key) {
    var r = t.rep;
    if (!r || r.k === 'none') return false;
    if (r.k === 'daily') return true;
    var d = parseDay(key);
    if (r.k === 'week') return (r.d || []).indexOf(d.getDay()) > -1;
    if (r.k === 'month') {
      var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return d.getDate() === Math.min(r.d, last);
    }
    return false;
  }
  function repeats(t) { return t.rep && t.rep.k !== 'none'; }

  function topic(id) { return S.topics.filter(function (t) { return t.id === id; })[0] || S.topics[0]; }
  function topColor(id) { return swatchColor(topic(id).sw); }
  function todayKey() { return localDay(new Date(), S.dayStart); }

  function ensureDay() {
    var k = todayKey();
    if (!S.day || S.day.key !== k) {
      S.day = { key: k, planned: false, tasks: [], done: [] };
      // Anything whose rule lands on this date is already in the day.
      // A paused task keeps its rule and stops acting on it.
      S.library.filter(function (t) { return !t.paused && dueOn(t, k); })
        .forEach(function (t) { S.day.tasks.push(t.id); });
      save();
    }
  }
  ensureDay();
  function lib(id) { return S.library.filter(function (t) { return t.id === id; })[0]; }
  function openIds() {
    return S.day.tasks.filter(function (id) { return S.day.done.indexOf(id) < 0 && lib(id); });
  }
  function dayTotal() { return S.day.tasks.filter(function (id) { return lib(id); }).length; }

  /* ── Helpers ──────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  /* ── Sound ───────────────────────────────────────────────
     Synthesised on the spot rather than loaded — six short tones cost
     nothing to ship, never wait on the network, and can be tuned by
     changing a number instead of re-recording. They are deliberately
     quiet, short, and pitched well above the voice range so they read as
     feedback rather than as an alert.

     iOS will not let a page make a sound until the person has touched it,
     and refuses to build the audio context outside a gesture — so it is
     built lazily, inside the first tap, which is what `tick` already is. */
  var AC = null;
  function audio() {
    if (AC !== null) return AC;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      AC = Ctor ? new Ctor() : false;
    } catch (e) { AC = false; }
    return AC;
  }
  /* at: when, f: from, to: slide to, d: how long, g: how loud. */
  var SOUNDS = {
    tap:    { w: 'triangle', n: [{ f: 620, to: 720, d: .05,  g: .05 }] },
    add:    { w: 'triangle', n: [{ f: 520, to: 880, d: .085, g: .06 }] },
    done:   { w: 'sine',     n: [{ f: 680, to: 700, d: .08,  g: .07 },
                                 { f: 1020, d: .16, g: .075, at: .055 }] },
    undo:   { w: 'sine',     n: [{ f: 560, to: 340, d: .12,  g: .05 }] },
    del:    { w: 'triangle', n: [{ f: 300, to: 180, d: .13,  g: .05 }] },
    step:   { w: 'sine',     n: [{ f: 780, d: .07, g: .05 },
                                 { f: 1040, d: .1, g: .05, at: .06 }] },
    finale: { w: 'sine',     n: [{ f: 660, d: .5, g: .06 },
                                 { f: 880, d: .5, g: .055, at: .09 },
                                 { f: 1320, d: .55, g: .05, at: .18 }] }
  };
  function play(kind) {
    if (!S || !S.sound) return;
    var ac = audio(); if (!ac) return;
    try {
      if (ac.state === 'suspended') ac.resume();
      var v = SOUNDS[kind] || SOUNDS.tap, t0 = ac.currentTime;
      v.n.forEach(function (n) {
        var o = ac.createOscillator(), g = ac.createGain();
        var at = t0 + (n.at || 0), end = at + n.d;
        o.type = v.w;
        o.frequency.setValueAtTime(n.f, at);
        if (n.to) o.frequency.exponentialRampToValueAtTime(n.to, end);
        // Ramps rather than steps: a gain that jumps clicks audibly.
        g.gain.setValueAtTime(.0001, at);
        g.gain.exponentialRampToValueAtTime(n.g, at + .01);
        g.gain.exponentialRampToValueAtTime(.0001, end);
        o.connect(g); g.connect(ac.destination);
        o.start(at); o.stop(end + .03);
      });
    } catch (e) {}
  }
  /* One call for both channels of feedback, so every place that already
     buzzes also speaks, and neither can be forgotten at a new call site. */
  function tick(ms, kind) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) {}
    play(kind || 'tap');
  }
  function el(h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstElementChild; }
  var main = document.getElementById('main');
  var tab = 'today';

  var toastEl = null, toastT = null;
  function toast(msg, undo) {
    if (toastEl) { toastEl.remove(); clearTimeout(toastT); }
    toastEl = el('<div class="toast"><span>' + esc(msg) + '</span>' +
      (undo ? '<button type="button">Undo</button>' : '') + '</div>');
    if (undo) toastEl.querySelector('button').addEventListener('click', function () { undo(); hideToast(); });
    document.body.appendChild(toastEl);
    toastT = setTimeout(hideToast, 4500);
  }
  function hideToast() {
    if (!toastEl) return;
    var t = toastEl; toastEl = null; t.classList.add('out');
    setTimeout(function () { t.remove(); }, 210);
  }

  /* ── Account banner ─────────────────────────────────────────────
     The account fields live inside a menu almost nobody opens on their
     own, so a build with sync switched on gets one quiet nudge toward
     it — shown once, gone for good the moment it is dismissed or an
     account exists, and never a dialog you have to clear before you can
     see today. */
  var BANNER_KEY = 'onething.bannerSeen';
  function acctBanner() {
    var host = document.getElementById('acctBanner');
    if (!host) return;
    var sy = window.OTSync;
    var seen = false;
    try { seen = !!localStorage.getItem(BANNER_KEY); } catch (e) {}
    if (!sy || !sy.configured || sy.signedIn || seen) { host.classList.add('hidden'); return; }
    host.classList.remove('hidden');
    host.innerHTML =
      '<p>Create a free account and your list follows you to your other devices.</p>' +
      '<button class="btn blue" type="button" id="bannerGo">Create account</button>' +
      '<button class="x" type="button" id="bannerX" aria-label="Dismiss">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round"><path d="M5 19L19 5M5 5l14 14"/></svg></button>';
    host.querySelector('#bannerX').addEventListener('click', dismissBanner);
    host.querySelector('#bannerGo').addEventListener('click', function () {
      dismissBanner();
      authMode = 'up';
      openProfile();
    });
  }
  function dismissBanner() {
    try { localStorage.setItem(BANNER_KEY, '1'); } catch (e) {}
    var host = document.getElementById('acctBanner');
    if (host) host.classList.add('hidden');
  }

  /* `colours` holds one hex per finished segment. The ring ends the day as a
     picture of what the day was made of, rather than a uniform green bar. */
  function ringSvg(total, colours, px) {
    var R = px / 2 - 11, C = 2 * Math.PI * R, n = Math.max(total, 1);
    var gap = n === 1 ? 0 : Math.min(13, C * 0.034);
    var seg = Math.max((C - gap * n) / n, 2);
    var out = '<svg width="' + px + '" height="' + px + '" viewBox="0 0 ' + px + ' ' + px +
      '" aria-hidden="true">';
    for (var i = 0; i < n; i++) {
      var c = colours[i];
      out += '<circle class="seg' + (c ? '' : ' empty') + '" cx="' + px / 2 + '" cy="' + px / 2 +
        '" r="' + R + '" stroke-width="8"' + (c ? ' stroke="' + c + '"' : '') +
        ' stroke-dasharray="' + seg.toFixed(2) + ' ' + (C - seg).toFixed(2) +
        '" stroke-dashoffset="' + (-(i * (seg + gap))).toFixed(2) + '"/>';
    }
    return out + '</svg>';
  }
  /* Finished tasks first, in the order they were finished. */
  function doneColours() {
    return S.day.done.filter(function (id) { return lib(id); })
      .map(function (id) { return topColor(lib(id).top); });
  }

  function sparks(anchor, host) {
    if (reduce || !host) return;
    var a = anchor.getBoundingClientRect(), h = host.getBoundingClientRect();
    var cx = a.left - h.left + a.width / 2 + host.scrollLeft;
    var cy = a.top - h.top + a.height / 2 + host.scrollTop;
    for (var i = 0; i < 6; i++) {
      var s = document.createElement('span'); s.className = 'spark';
      var ang = (-145 + Math.random() * 110) * Math.PI / 180, d = 20 + Math.random() * 22;
      s.style.left = cx + 'px'; s.style.top = cy + 'px';
      s.style.setProperty('--dx', (Math.cos(ang) * d).toFixed(1) + 'px');
      s.style.setProperty('--dy', (Math.sin(ang) * d).toFixed(1) + 'px');
      s.style.setProperty('--life', (400 + Math.random() * 180).toFixed(0) + 'ms');
      host.appendChild(s);
      (function (n2) { setTimeout(function () { n2.remove(); }, 700); })(s);
    }
  }

  /* A line that changes with what actually happened. Descriptive, never praise
     — "you did four things" is a fact; "great job!" is an opinion someone who
     feels behind will simply disagree with. */
  function greeting() {
    var k = todayKey(), y = shiftDay(k, -1);
    var yc = S.history.filter(function (h) { return h.day === y; }).length;
    var last = S.history.length ? S.history[S.history.length - 1].day : null;
    if (last && last !== k && last !== y) {
      var gap = Math.round((parseDay(k) - parseDay(last)) / 864e5);
      if (gap > 3) return 'Good to see you back. Nothing was lost.';
    }
    if (yc >= 4) return 'You finished ' + yc + ' things yesterday.';
    if (yc > 0) return 'Yesterday: ' + yc + (yc === 1 ? ' thing' : ' things') + ' done.';
    var h = new Date().getHours();
    if (h < 11) return 'A fresh one.';
    if (h < 17) return 'Still plenty of day left.';
    return 'Whatever fits in the evening.';
  }

  function rowHtml(t, done) {
    var tp = topic(t.top), r = repLabel(t.rep);
    return '<li class="row' + (done ? ' done' : '') + '" data-id="' + t.id +
      '" style="--topic:' + topColor(t.top) + '">' +
      '<button class="cbx' + (done ? ' on' : '') + '" type="button" aria-label="' +
        (done ? 'Put back ' : 'Finish ') + esc(t.t) + '">' +
        '<svg viewBox="0 0 24 24"><path pathLength="1" d="M5 12.5l4.6 4.6L19 7"/></svg></button>' +
      '<span class="row-body"><span class="row-title">' + esc(t.t) + '</span>' +
      '<span class="row-sub"><b>' + esc(tp.n) + '</b>' + (r ? ' · ' + esc(r) : '') +
      '</span></span>' +
      /* Off today, not deleted. A repeating task lands here every morning
         whether or not today is the day for it, and without this the only
         way to clear one was to tick something you had not done. */
      (done ? '' : '<button class="mini" data-act="off" type="button" ' +
        'aria-label="Take ' + esc(t.t) + ' off today">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round"><path d="M6 12h12"/></svg></button>') +
      '</li>';
  }

  /* ═══════════════════════════════════════════════════════
     TODAY
     ═══════════════════════════════════════════════════════ */
  function renderToday() {
    ensureDay();
    var open = openIds(), total = dayTotal(), done = total - open.length;
    var clear = total > 0 && open.length === 0;
    var doneList = S.day.done.filter(function (id) { return lib(id); });

    main.innerHTML =
      (clear ? '' :
        '<div class="ringwrap"><div class="ring" id="ring">' +
          ringSvg(total, doneColours(), 196) +
          '<div class="ringmid"><span class="day-name">' + dayName(S.day.key) + '</span>' +
          '<span class="ringcount">' + (total ? done + ' of ' + total : 'nothing yet') +
          '</span></div></div></div>' +
        '<p class="greeting">' + esc(greeting()) + '</p>') +
      '<div id="body" style="margin-top:16px"></div>';

    var body = document.getElementById('body');

    /* Finished tasks stay on the page, checked and struck, in their own group
       underneath. Tapping one puts it back. */
    var doneBlock = doneList.length
      ? '<div class="groupline"><span class="label">Done</span>' +
        '<span class="tiny">' + doneList.length + '</span></div>' +
        '<ul class="list" id="doneList">' +
        doneList.map(function (id) { return rowHtml(lib(id), true); }).join('') + '</ul>' +
        '<p class="tiny" style="margin-top:7px">Tap one to put it back.</p>'
      : '';

    if (clear) {
      body.innerHTML =
        '<div class="empty fade-up" style="padding-top:30px">' +
          '<span class="day-name" style="font-size:1.3rem;color:var(--ink-3)">' +
            dayName(S.day.key) + '</span>' +
          '<h3 style="font-size:1.5rem">That\u2019s the day.</h3>' +
          '<p class="small">' + total + (total === 1 ? ' thing' : ' things') + ' finished.</p>' +
          '<button class="btn primary" id="add" type="button" style="margin-top:8px;max-width:250px">' +
            'Add something else</button></div>' + doneBlock;
    } else {
      /* Grouped by topic rather than in the order things were added. Five
         rows in five colours next to each other is a fruit salad; the same
         five under their own headings is a plan. The heading only appears
         when there is more than one topic in play. */
      var groups = [], byTopic = {};
      open.forEach(function (id) {
        var t = lib(id), key = topic(t.top).id;
        if (!byTopic[key]) { byTopic[key] = []; groups.push(key); }
        byTopic[key].push(id);
      });
      groups.sort(function (a, b) {
        return S.topics.map(function (x) { return x.id; }).indexOf(a) -
               S.topics.map(function (x) { return x.id; }).indexOf(b); });
      var openBlock = groups.length > 1
        ? groups.map(function (key) {
            return '<div class="groupline"><span class="label" style="color:' +
              topColor(key) + '">' + esc(topic(key).n) + '</span>' +
              '<span class="tiny">' + byTopic[key].length + '</span></div>' +
              '<ul class="list">' +
              byTopic[key].map(function (id) { return rowHtml(lib(id)); }).join('') +
              '</ul>'; }).join('')
        : '<ul class="list">' +
          open.map(function (id) { return rowHtml(lib(id)); }).join('') + '</ul>';

      body.innerHTML =
        (open.length
          ? '<div id="openList">' + openBlock + '</div>'
          : '<div class="empty"><h3>Nothing left on today</h3>' +
            '<p class="small">Pick a few things from your list.</p></div>') +
        '<button class="btn quiet" id="add" type="button" style="margin-top:14px">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2.2" stroke-linecap="round"><path d="M12 5.5v13M5.5 12h13"/></svg>' +
          (open.length ? 'Add more to today' : 'Choose today\u2019s tasks') + '</button>' +
        doneBlock;
      body.querySelectorAll('#openList .row').forEach(function (row) {
        var id = Number(row.dataset.id);
        row.querySelector('.cbx').addEventListener('click', function (e) {
          finish(row, id, e.currentTarget); });
        row.querySelector('[data-act="off"]').addEventListener('click', function () {
          offToday(id); });
      });
    }

    body.querySelectorAll('#doneList .row').forEach(function (row) {
      row.querySelector('.cbx').addEventListener('click', function () {
        undoTask(Number(row.dataset.id)); tick(8, 'undo'); });
    });
    var addBtn = body.querySelector('#add');
    if (addBtn) addBtn.addEventListener('click', openPicker);
  }

  /* Off today, still in your list, still repeating tomorrow. Undoable,
     because the button sits next to the one that finishes a task and a
     mis-tap should never cost anything. */
  function offToday(id) {
    var t = lib(id); if (!t) return;
    var at = S.day.tasks.indexOf(id);
    if (at < 0) return;
    S.day.tasks.splice(at, 1);
    S.day.done = S.day.done.filter(function (x) { return x !== id; });
    save(); tick(8, 'del'); render();
    toast('Took “' + t.t + '” off today', function () {
      if (S.day.tasks.indexOf(id) < 0) S.day.tasks.splice(at, 0, id);
      save(); play('undo'); render();
    });
  }

  function finish(row, id, cbx) {
    if (row.dataset.busy) return;
    row.dataset.busy = '1';
    var t = lib(id);
    cbx.classList.add('on');
    tick(12, 'done');
    sparks(cbx, main);
    var title = row.querySelector('.row-title');
    if (title && !title.querySelector('.strike')) {
      var st = document.createElement('span'); st.className = 'strike'; title.appendChild(st);
    }
    row.classList.add('done');

    S.day.done.push(id);
    S.history.push({ hid: 'h' + Date.now() + Math.random().toString(36).slice(2, 5),
                     taskId: id, t: t.t, top: t.top, day: S.day.key, at: Date.now() });
    save();

    var total = dayTotal(), left = openIds().length;
    paintRing(total);
    toast('Finished “' + t.t + '”', function () { undoTask(id); });

    // The row slides out of the open list and comes back, checked, under Done.
    // It is never simply gone.
    setTimeout(function () {
      row.classList.add('out');
      setTimeout(function () {
        if (left === 0 && total > 0) finale(); else renderToday();
      }, reduce ? 0 : 165);
    }, reduce ? 0 : 185);
  }

  function undoTask(id) {
    S.day.done = S.day.done.filter(function (x) { return x !== id; });
    for (var i = S.history.length - 1; i >= 0; i--) {
      if (S.history[i].taskId === id && S.history[i].day === S.day.key) {
        S.removed.push(S.history[i].hid);
        S.history.splice(i, 1);
        break;
      }
    }
    save();
    if (tab === 'today') renderToday();
  }

  function paintRing(total) {
    var ring = document.getElementById('ring');
    if (!ring) return;
    var cols = doneColours();
    ring.innerHTML = ringSvg(total, cols, 196) +
      '<div class="ringmid"><span class="day-name">' + dayName(S.day.key) +
      '</span><span class="ringcount">' + cols.length + ' of ' + total + '</span></div>';
    if (!reduce) { ring.classList.remove('bump'); void ring.offsetWidth; ring.classList.add('bump'); }
  }

  /* The only long animation in the app, and it happens at most once a day. */
  function finale() {
    var ring = document.getElementById('ring');
    var body = document.getElementById('body');
    if (body) body.innerHTML = '';
    var g = document.querySelector('.greeting'); if (g) g.remove();
    tick(18);
    if (ring && !reduce) {
      ring.classList.add('finale');
      setTimeout(renderToday, 820);
    } else { renderToday(); }
  }

  /* ═══════════════════════════════════════════════════════
     TASKS
     ═══════════════════════════════════════════════════════ */
  var filterTop = 'all';
  function renderTasks() {
    var items = S.library.filter(function (t) { return filterTop === 'all' || t.top === filterTop; });
    /* Within each group, same-topic rows sit together. The list is tinted by
       topic, so leaving it in the order things happened to be typed turns
       the page into stripes; grouping the colours makes the same list read
       as organised without taking any colour out of it. */
    var order = S.topics.map(function (x) { return x.id; });
    var byTopic = function (a, b) { return order.indexOf(a.top) - order.indexOf(b.top); };
    var live = items.filter(function (t) { return !t.paused; });
    var held = items.filter(function (t) { return !!t.paused; }).sort(byTopic);
    var daily = live.filter(repeats).sort(byTopic);
    var rest = live.filter(function (t) { return !repeats(t); }).sort(byTopic);
    var newTop = S.topics[0].id;

    main.innerHTML =
      '<div style="padding-top:6px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px">' +
        '<div><h2 style="font-size:1.5rem">Your tasks</h2>' +
        '<p class="tiny" style="margin-top:3px">Everything you might do. Nothing here is a promise.</p></div>' +
        '<button class="iconbtn" id="topicsBtn" type="button" aria-label="Manage topics" ' +
          'style="flex:none;margin-top:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.9" stroke-linecap="round"><circle cx="8" cy="8" r="3.4"/>' +
          '<circle cx="16.5" cy="16.5" r="3.4"/><path d="M8 14.5v5M5.5 17h5"/></svg></button>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:14px">' +
        '<input class="input" id="newTask" placeholder="Add a task…" maxlength="70" ' +
          'autocomplete="off" enterkeyhint="done">' +
        '<button class="btn primary" id="newGo" type="button" style="width:48px;flex:none;padding:0" ' +
          'aria-label="Add"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
          'stroke="currentColor" stroke-width="2.4" stroke-linecap="round">' +
          '<path d="M12 5.5v13M5.5 12h13"/></svg></button></div>' +
      '<span class="picklabel">File the new one under</span>' +
      '<div class="pickrow" id="newTop">' +
        S.topics.map(function (t, i) {
          return '<button class="pick" type="button" data-t="' + t.id + '" aria-pressed="' + (i === 0) +
            '" style="--topic:' + topColor(t.id) + '"><i style="background:' + topColor(t.id) +
            '"></i>' + esc(t.n) + '</button>'; }).join('') +
      '</div>' +
      '<hr class="rule" style="margin:20px 0 0">' +
      '<span class="picklabel">Show me</span>' +
      '<div class="pickrow" id="filters">' +
        '<button class="pick" type="button" data-f="all" aria-pressed="' + (filterTop === 'all') +
          '">Everything</button>' +
        S.topics.map(function (t) {
          return '<button class="pick" type="button" data-f="' + t.id + '" aria-pressed="' +
            (filterTop === t.id) + '" style="--topic:' + topColor(t.id) + '"><i style="background:' +
            topColor(t.id) + '"></i>' + esc(t.n) + '</button>'; }).join('') +
      '</div>' +
      (daily.length ? '<div class="groupline"><span class="label">Repeating</span>' +
        '<span class="tiny">' + daily.length + '</span></div><ul class="list">' +
        daily.map(libRow).join('') + '</ul>' : '') +
      '<div class="groupline" id="restHead"' + (rest.length ? '' : ' hidden') +
        '><span class="label">Pick from</span>' +
        '<span class="tiny" id="restCount">' + rest.length + '</span></div>' +
      '<ul class="list" id="restList"' + (rest.length ? '' : ' hidden') + '>' +
        rest.map(libRow).join('') + '</ul>' +
      (held.length ? '<div class="groupline"><span class="label">Paused</span>' +
        '<span class="tiny">' + held.length + '</span></div><ul class="list">' +
        held.map(libRow).join('') + '</ul>' +
        '<p class="tiny" style="margin-top:7px">These keep their repeat and stay ' +
        'out of your days until you unpause them.</p>' : '') +
      (!items.length ? '<div class="empty"><h3>Nothing here yet</h3>' +
        '<p class="small">Add a task above and it will be waiting tomorrow morning.</p></div>' : '') +
      '<p class="note" style="margin-top:18px">Tap any task to set when it repeats — ' +
      '<b>every day</b>, <b>certain days</b> (just Tuesdays, say), or <b>once a month</b>. ' +
      'Repeating tasks are already in your circle when the day comes round.</p>';

    var input = document.getElementById('newTask');
    document.querySelectorAll('#newTop .pick').forEach(function (b) {
      b.addEventListener('click', function () {
        newTop = b.dataset.t;
        document.querySelectorAll('#newTop .pick').forEach(function (x) {
          x.setAttribute('aria-pressed', String(x.dataset.t === newTop)); });
      });
    });
    /* Adding used to rebuild the whole page and then open the repeat editor
       on top of it. Both of those take the keyboard down on a phone, which
       makes emptying your head into the list — the single thing this app is
       for — a stop-start business of tapping the field again between every
       item. So the row is put in by hand, the field keeps its focus, and the
       repeat choice waits until the row is tapped. */
    function add() {
      var v = input.value.trim(); if (!v) return;
      var nt = { id: nid(), t: v, top: newTop, rep: { k: 'none' } };
      S.library.unshift(nt);
      save(); input.value = ''; tick(10, 'add');

      var host = document.getElementById('restList');
      var head = document.getElementById('restHead');
      if (!host || (filterTop !== 'all' && filterTop !== nt.top)) {
        // Filtered out of the view it would land in, or the page is not in a
        // shape that can take a row. Rebuild, and put the field back.
        renderTasks();
        var again = document.getElementById('newTask');
        if (again) again.focus();
        return;
      }
      var li = el(libRow(nt));
      li.classList.add('in');
      host.insertBefore(li, host.firstChild);
      wireLibRow(li);
      host.hidden = false; if (head) head.hidden = false;
      var empty = main.querySelector('.empty');
      if (empty) empty.remove();
      var count = document.getElementById('restCount');
      if (count) count.textContent = String(Number(count.textContent || 0) + 1);
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    document.getElementById('newGo').addEventListener('click', add);
    document.getElementById('topicsBtn').addEventListener('click', openTopics);
    document.querySelectorAll('#filters .pick').forEach(function (b) {
      b.addEventListener('click', function () { filterTop = b.dataset.f; renderTasks(); }); });

    main.querySelectorAll('.row[data-id]').forEach(wireLibRow);
  }

  /* Pulled out of renderTasks so a row added while you are typing can be
     wired on its own, without rebuilding the page around the field. */
  function wireLibRow(row) {
    var id = Number(row.dataset.id);
    row.querySelector('[data-act="edit"]').addEventListener('click', function () {
      openTask(id, false);
    });
    row.querySelector('[data-act="del"]').addEventListener('click', function () {
      var t = lib(id), ix = S.library.indexOf(t);
      S.library.splice(ix, 1);
      S.libDel.push(id);
      S.day.tasks = S.day.tasks.filter(function (x) { return x !== id; });
      save(); renderTasks();
      toast('Deleted “' + t.t + '”', function () {
        S.library.splice(ix, 0, t);
        S.libDel = S.libDel.filter(function (x) { return x !== id; });
        save(); renderTasks(); });
    });
  }

  function libRow(t) {
    var r = repLabel(t.rep);
    return '<li class="row' + (t.paused ? ' held' : '') + '" data-id="' + t.id +
      '" style="--topic:' + topColor(t.top) + '">' +
      '<button class="row-body" data-act="edit" type="button" style="background:none;border:none;' +
        'text-align:left;padding:0;font-family:var(--sans);align-items:flex-start">' +
        '<span class="row-title">' + esc(t.t) + '</span>' +
        '<span class="row-sub"><b>' + esc(topic(t.top).n) + '</b>' +
        (r ? ' · ' + esc(r) : '') + (t.paused ? ' · paused' : '') + '</span></button>' +
      (r ? '<span class="mini" style="color:var(--topic);pointer-events:none" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a8 8 0 0113.5-3.5L20 8"/>' +
        '<path d="M20 15a8 8 0 01-13.5 3.5L4 16"/><path d="M20 4.5V8h-3.5M4 19.5V16h3.5"/>' +
        '</svg></span>' : '') +
      '<button class="mini" data-act="del" type="button" aria-label="Delete ' + esc(t.t) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
        'stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></button></li>';
  }

  /* ═══════════════════════════════════════════════════════
     SHEETS
     ═══════════════════════════════════════════════════════ */
  function sheet(title, html, ready) {
    var scrim = el('<div class="scrim"></div>');
    var sh = el('<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' +
      '<div class="sheet-head"><h2>' + title + '</h2>' +
      '<button class="iconbtn" data-close type="button" aria-label="Close">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></button></div>' +
      '<div class="sheet-body">' + html + '</div></div>');
    document.body.appendChild(scrim); document.body.appendChild(sh);
    function close() {
      sh.classList.add('out'); scrim.classList.add('out');
      setTimeout(function () { sh.remove(); scrim.remove(); }, 230);
    }
    scrim.addEventListener('click', close);
    sh.querySelector('[data-close]').addEventListener('click', close);
    document.addEventListener('keydown', function k(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    if (ready) ready(sh, close);
    return close;
  }

  /* ── Topics ──────────────────────────────────────────── */
  function openTopics() {
    function body() {
      return S.topics.map(function (t) {
        var n = S.library.filter(function (x) { return x.top === t.id; }).length;
        return '<div class="topicrow" data-t="' + t.id + '">' +
          '<button class="sw" data-edit="' + t.id + '" style="background:' + topColor(t.id) +
            '" aria-label="Change colour for ' + esc(t.n) + '"></button>' +
          '<span class="name">' + esc(t.n) + '</span>' +
          '<span class="count">' + n + '</span>' +
          (S.topics.length > 1 ? '<button class="mini" data-del="' + t.id +
            '" type="button" aria-label="Delete topic"><svg viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="1.9" stroke-linecap="round">' +
            '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></button>' : '') +
          '</div>' +
          '<div class="swatches hidden" data-pal="' + t.id + '" style="padding:2px 2px 8px">' +
            SWATCHES.map(function (s) {
              return '<button class="sw" type="button" data-set="' + t.id + '|' + s.id +
                '" aria-pressed="' + (t.sw === s.id) + '" style="background:' +
                (isDark() ? s.d : s.l) + '" aria-label="' + s.id + '"></button>'; }).join('') +
          '</div>';
      }).join('') +
      '<hr class="rule" style="margin:8px 0">' +
      '<div class="field"><label>Add a topic</label>' +
        '<div style="display:flex;gap:8px">' +
          '<input class="input" id="newTopName" placeholder="Study, Fitness, Side project…" maxlength="22">' +
          '<button class="btn primary" id="newTopGo" type="button" style="width:48px;flex:none;padding:0" ' +
            'aria-label="Add topic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="2.4" stroke-linecap="round">' +
            '<path d="M12 5.5v13M5.5 12h13"/></svg></button></div>' +
        '<div class="swatches" id="newTopSw" style="margin-top:8px">' +
          SWATCHES.map(function (s, i) {
            return '<button class="sw" type="button" data-new="' + s.id + '" aria-pressed="' +
              (i === 6) + '" style="background:' + (isDark() ? s.d : s.l) + '" aria-label="' +
              s.id + '"></button>'; }).join('') + '</div></div>';
    }

    sheet('Topics', body(), function (sh) {
      var chosenSw = 'teal';
      function rewire() { sh.querySelector('.sheet-body').innerHTML = body(); wire(); }
      function wire() {
        sh.querySelectorAll('[data-edit]').forEach(function (b) {
          b.addEventListener('click', function () {
            var pal = sh.querySelector('[data-pal="' + b.dataset.edit + '"]');
            sh.querySelectorAll('[data-pal]').forEach(function (p) {
              if (p !== pal) p.classList.add('hidden'); });
            pal.classList.toggle('hidden');
          });
        });
        sh.querySelectorAll('[data-set]').forEach(function (b) {
          b.addEventListener('click', function () {
            var p = b.dataset.set.split('|');
            topic(p[0]).sw = p[1]; save(); tick(); rewire(); render();
          });
        });
        sh.querySelectorAll('[data-del]').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.dataset.del;
            var used = S.library.filter(function (x) { return x.top === id; });
            var fallback = S.topics.filter(function (t) { return t.id !== id; })[0];
            if (used.length && !confirm(used.length + ' task(s) will move to “' +
                fallback.n + '”. Delete this topic?')) return;
            used.forEach(function (x) { x.top = fallback.id; });
            S.topics = S.topics.filter(function (t) { return t.id !== id; });
            S.topDel.push(id);
            if (filterTop === id) filterTop = 'all';
            save(); rewire(); render();
          });
        });
        sh.querySelectorAll('[data-new]').forEach(function (b) {
          b.addEventListener('click', function () {
            chosenSw = b.dataset.new;
            sh.querySelectorAll('[data-new]').forEach(function (x) {
              x.setAttribute('aria-pressed', String(x.dataset.new === chosenSw)); });
          });
        });
        var nameIn = sh.querySelector('#newTopName');
        function addTopic() {
          var v = nameIn.value.trim(); if (!v) return;
          S.topics.push({ id: 'u' + nid(), n: v, sw: chosenSw });
          save(); tick(); rewire(); render();
        }
        nameIn.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); addTopic(); } });
        sh.querySelector('#newTopGo').addEventListener('click', addTopic);
      }
      wire();
    });
  }

  /* ── Task editor: name, topic, and when it repeats ──────
     This is the answer to "a task that only happens on Tuesdays": set it once
     and the day picks it up every Tuesday from then on. */
  function openTask(id, isNew) {
    var t = lib(id);
    if (!t) return;
    var draft = { t: t.t, top: t.top, rep: JSON.parse(JSON.stringify(t.rep || { k: 'none' })) };

    sheet(isNew ? 'When does it repeat?' : 'Edit task',
      '<div class="field"><label>Task</label>' +
        '<input class="input" id="eName" maxlength="70" value="' + esc(t.t) + '"></div>' +
      '<div class="field"><label>Topic</label><div class="pickrow" id="eTop">' +
        S.topics.map(function (tp) {
          return '<button class="pick" type="button" data-t="' + tp.id + '" aria-pressed="' +
            (tp.id === draft.top) + '"><i style="background:' + topColor(tp.id) + '"></i>' +
            esc(tp.n) + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label>Repeats</label><div class="pickrow" id="eKind">' +
        [['none','Never'],['daily','Every day'],['week','Certain days'],['month','Once a month']]
          .map(function (k) {
            return '<button class="pick" type="button" data-k="' + k[0] + '" aria-pressed="' +
              (draft.rep.k === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div></div>' +
      '<div id="eDetail"></div>' +
      '<p class="tiny" id="eSummary"></p>' +
      '<div style="position:sticky;bottom:0;background:var(--ground);padding-top:10px;' +
        'display:flex;flex-direction:column;gap:6px">' +
        '<button class="btn primary" id="eSave" type="button">Save</button>' +
        (isNew ? '' :
          /* Pausing is the answer to "I am not doing this for a while but I
             am not giving up on it either" — the case where the only other
             options were deleting something you want back later, or watching
             it arrive every morning and ignoring it, which is how a list
             stops being trusted. */
          '<button class="btn quiet" id="ePause" type="button">' +
            (t.paused ? 'Unpause this task' : 'Pause this task') + '</button>' +
          '<button class="link" id="eDel" type="button">Delete this task</button>') +
      '</div>',

      function (sh, close) {
        var detail = sh.querySelector('#eDetail'), summary = sh.querySelector('#eSummary');

        function paintDetail() {
          if (draft.rep.k === 'week') {
            if (!draft.rep.d) draft.rep.d = [];
            detail.innerHTML = '<div class="pickrow" id="eDays" style="gap:5px">' +
              WD.map(function (n, i) {
                return '<button class="pick" type="button" data-d="' + i + '" aria-pressed="' +
                  (draft.rep.d.indexOf(i) > -1) + '" style="flex:1;justify-content:center;' +
                  'padding:9px 0">' + n + '</button>'; }).join('') + '</div>';
            detail.querySelectorAll('[data-d]').forEach(function (b) {
              b.addEventListener('click', function () {
                var i = Number(b.dataset.d), at = draft.rep.d.indexOf(i);
                if (at > -1) draft.rep.d.splice(at, 1); else draft.rep.d.push(i);
                b.setAttribute('aria-pressed', String(draft.rep.d.indexOf(i) > -1));
                tick(8); paintSummary();
              });
            });
          } else if (draft.rep.k === 'month') {
            if (!draft.rep.d) draft.rep.d = Math.min(parseDay(todayKey()).getDate(), 28);
            var opts = '';
            for (var n2 = 1; n2 <= 31; n2++) {
              opts += '<option value="' + n2 + '"' + (n2 === draft.rep.d ? ' selected' : '') +
                '>' + ordinal(n2) + '</option>';
            }
            detail.innerHTML = '<div class="field"><label>Day of the month</label>' +
              '<select class="input" id="eDom">' + opts + '</select></div>';
            detail.querySelector('#eDom').addEventListener('change', function (e) {
              draft.rep.d = Number(e.target.value); paintSummary(); });
          } else {
            detail.innerHTML = '';
          }
          paintSummary();
        }

        function paintSummary() {
          if (draft.rep.k === 'none') {
            summary.textContent = 'Stays on your list until you choose it for a day.';
          } else if (draft.rep.k === 'week' && !(draft.rep.d || []).length) {
            summary.textContent = 'Pick at least one day.';
          } else {
            summary.innerHTML = 'Added to your day automatically · <b>' +
              esc(repLabel(draft.rep)) + '</b>';
          }
        }

        sh.querySelectorAll('#eTop .pick').forEach(function (b) {
          b.addEventListener('click', function () {
            draft.top = b.dataset.t; tick();
            sh.querySelectorAll('#eTop .pick').forEach(function (x) {
              x.setAttribute('aria-pressed', String(x.dataset.t === draft.top)); });
          });
        });
        sh.querySelectorAll('#eKind .pick').forEach(function (b) {
          b.addEventListener('click', function () {
            draft.rep = { k: b.dataset.k };
            tick();
            sh.querySelectorAll('#eKind .pick').forEach(function (x) {
              x.setAttribute('aria-pressed', String(x.dataset.k === draft.rep.k)); });
            paintDetail();
          });
        });
        paintDetail();

        sh.querySelector('#eSave').addEventListener('click', function () {
          var name = sh.querySelector('#eName').value.trim();
          if (name) t.t = name;
          t.top = draft.top;
          t.rep = draft.rep;
          if (t.rep.k === 'week' && !(t.rep.d || []).length) t.rep = { k: 'none' };
          // If it now falls on today, put it straight in the day.
          if (dueOn(t, S.day.key) && S.day.tasks.indexOf(t.id) < 0) S.day.tasks.push(t.id);
          save(); close(); tick(12);
          setTimeout(render, 60);
        });
        var pause = sh.querySelector('#ePause');
        if (pause) pause.addEventListener('click', function () {
          t.paused = !t.paused;
          if (t.paused) {
            // Take it off today as well, or pausing changes nothing until
            // tomorrow and looks broken.
            S.day.tasks = S.day.tasks.filter(function (x) { return x !== t.id; });
            S.day.done = S.day.done.filter(function (x) { return x !== t.id; });
          } else if (dueOn(t, S.day.key) && S.day.tasks.indexOf(t.id) < 0) {
            S.day.tasks.push(t.id);
          }
          save(); tick(8, t.paused ? 'del' : 'add'); close();
          setTimeout(render, 60);
          setTimeout(function () {
            toast(t.paused ? '“' + t.t + '” is paused' : '“' + t.t + '” is back');
          }, 300);
        });

        var del = sh.querySelector('#eDel');
        if (del) del.addEventListener('click', function () {
          var ix = S.library.indexOf(t);
          S.library.splice(ix, 1);
          S.libDel.push(t.id);
          S.day.tasks = S.day.tasks.filter(function (x) { return x !== t.id; });
          save(); close(); setTimeout(render, 60);
          setTimeout(function () {
            toast('Deleted “' + t.t + '”', function () {
              S.library.splice(ix, 0, t);
              S.libDel = S.libDel.filter(function (x) { return x !== t.id; });
              save(); render(); });
          }, 300);
        });
      });
  }

  /* ── Pick tasks for today ────────────────────────────── */
  function openPicker() {
    var chosen = {};
    var avail = S.library.filter(function (t) {
      return !t.paused && S.day.tasks.indexOf(t.id) < 0; });
    sheet('Add to today',
      (avail.length
        ? '<p class="tiny">Tap what you want to finish. Everything else stays on your list.</p>' +
          '<div style="display:flex;flex-direction:column;gap:7px">' + avail.map(function (t) {
            return '<button class="selrow" type="button" data-id="' + t.id + '" aria-pressed="false">' +
              '<span class="selbox"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.6 4.6L19 7"/></svg></span>' +
              '<span class="dot" style="--topic:' + topColor(t.top) + '"></span>' +
              '<span style="flex:1;min-width:0"><span style="display:block;font-size:.93rem">' +
              esc(t.t) + '</span><span class="row-sub">' + esc(topic(t.top).n) + '</span></span></button>';
          }).join('') + '</div>'
        : '<div class="empty"><h3>Everything is already on today</h3>' +
          '<p class="small">Add more in the Tasks tab.</p></div>') +
      '<div style="position:sticky;bottom:0;background:var(--ground);padding-top:10px">' +
        '<button class="btn primary" id="go" type="button" disabled>Add to today</button></div>',
      function (sh, close) {
        var go = sh.querySelector('#go');
        sh.querySelectorAll('.selrow').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = Number(b.dataset.id);
            chosen[id] = !chosen[id];
            b.setAttribute('aria-pressed', String(!!chosen[id]));
            var n = Object.keys(chosen).filter(function (k) { return chosen[k]; }).length;
            go.disabled = !n;
            go.textContent = n ? 'Add ' + n + (n === 1 ? ' task' : ' tasks') : 'Add to today';
            tick(8);
          });
        });
        go.addEventListener('click', function () {
          Object.keys(chosen).forEach(function (k) { if (chosen[k]) S.day.tasks.push(Number(k)); });
          S.day.planned = true; save(); close(); tick(12);
          setTimeout(renderToday, 60);
        });
      });
  }

  /* ── Profile + stats ─────────────────────────────────── */
  /* ── Wallpaper ────────────────────────────────────────
     Today's screen can sit on a picture of your own, or on one of six
     built-in washes. Two things keep it from wrecking the page: the
     veil, which is a slider rather than a fixed value because a dark
     photo and a bright one need very different amounts of it, and the
     fact that task rows keep their own solid backgrounds, so the
     picture shows in the gaps rather than behind the words.

     It is deliberately only on Today. A wallpaper behind a list you are
     editing is noise; behind the one screen you open to look at, it is
     the reason to open it. */
  var WALLS = [
    { id: 'dawn', n: 'Dawn',  g: 'linear-gradient(155deg,#ffd9a0 0%,#ff9a8b 45%,#a78bfa 100%)' },
    { id: 'sea',  n: 'Sea',   g: 'linear-gradient(155deg,#9be7ff 0%,#1cb0f6 52%,#3f5efb 100%)' },
    { id: 'moss', n: 'Moss',  g: 'linear-gradient(155deg,#e2ffc4 0%,#4ead2b 58%,#0f5f36 100%)' },
    { id: 'dusk', n: 'Dusk',  g: 'linear-gradient(155deg,#ffb199 0%,#ff4b4b 45%,#6d28d9 100%)' },
    { id: 'sand', n: 'Sand',  g: 'linear-gradient(155deg,#fff3e0 0%,#ffc800 50%,#ff7a00 100%)' },
    { id: 'ink',  n: 'Ink',   g: 'linear-gradient(155deg,#5b7cb7 0%,#243b55 55%,#121c26 100%)' }
  ];
  function wallCss(w) {
    if (!w || w.k === 'none') return '';
    if (w.k === 'grad') {
      var g = WALLS.filter(function (x) { return x.id === w.g; })[0];
      return g ? g.g : '';
    }
    if (w.k === 'img' && w.src) return 'url("' + w.src + '")';
    return '';
  }
  function paintWall() {
    var app = document.querySelector('.app');
    var layer = document.getElementById('wall');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'wall'; layer.className = 'wall'; layer.setAttribute('aria-hidden', 'true');
      app.insertBefore(layer, app.firstChild);
    }
    var css = tab === 'today' ? wallCss(S.wall) : '';
    app.classList.toggle('walled', !!css);
    layer.style.setProperty('--wall-img', css || 'none');
    layer.style.setProperty('--wall-dim', String(Math.min(Math.max(S.wallDim, 0), 95) / 100));
  }

  /* A phone photo is several megabytes and this document is pushed to the
     server on every save, so it gets squeezed until it fits a budget. The
     first version of this aimed at 1100px and 95KB, which is fine on a
     laptop and visibly blocky on a phone screen with three times the pixels
     — so the ceiling is now high enough to survive one. WebP carries far
     more detail per byte and every current phone browser can write it; the
     check falls back to JPEG on anything that can't, because a canvas asked
     for a format it does not have quietly hands back a PNG instead. */
  var WALL_TYPE = (function () {
    try {
      var c = document.createElement('canvas'); c.width = c.height = 1;
      return c.toDataURL('image/webp').indexOf('data:image/webp') === 0
        ? 'image/webp' : 'image/jpeg';
    } catch (e) { return 'image/jpeg'; }
  })();
  var WALL_BUDGET = 240000;
  var WALL_EDGE = 1600;
  function shrinkWall(img, done) {
    var w = img.width, h = img.height;
    var long = Math.max(w, h), scale = Math.min(1, WALL_EDGE / long);
    function attempt(sc, q) {
      var cv = document.createElement('canvas');
      cv.width = Math.max(Math.round(w * sc), 1);
      cv.height = Math.max(Math.round(h * sc), 1);
      var cx = cv.getContext('2d');
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL(WALL_TYPE, q);
    }
    var out = attempt(scale, 0.88);
    var qs = [0.82, 0.76, 0.7, 0.64];
    for (var i = 0; i < qs.length && out.length > WALL_BUDGET; i++) out = attempt(scale, qs[i]);
    // Only once quality is as low as it should ever go does it start losing
    // pixels, because scale is what you actually see on a big screen.
    while (out.length > WALL_BUDGET && scale > 0.25) {
      scale *= 0.85;
      out = attempt(scale, 0.7);
    }
    done(out);
  }

  function wallHtml() {
    var w = S.wall || { k: 'none' };
    return '<div class="groupline"><span class="label">Today\u2019s wallpaper</span></div>' +
      '<div class="wallrow">' +
        '<button class="wallopt' + (w.k === 'none' ? ' on' : '') + '" type="button" data-w="none" ' +
          'aria-pressed="' + (w.k === 'none') + '" aria-label="No wallpaper">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
          'stroke-linecap="round"><circle cx="12" cy="12" r="8.2"/>' +
          '<path d="M6.2 17.8L17.8 6.2"/></svg></button>' +
        WALLS.map(function (g) {
          return '<button class="wallopt' + (w.k === 'grad' && w.g === g.id ? ' on' : '') +
            '" type="button" data-w="' + g.id + '" aria-pressed="' +
            (w.k === 'grad' && w.g === g.id) + '" style="background-image:' + g.g +
            '" aria-label="' + g.n + '"></button>'; }).join('') +
        '<button class="wallopt photo' + (w.k === 'img' ? ' on' : '') + '" type="button" id="wallPick" ' +
          'aria-pressed="' + (w.k === 'img') + '" aria-label="Use one of your own pictures"' +
          (w.k === 'img' ? ' style="background-image:url(&quot;' + w.src + '&quot;)"' : '') + '>' +
          (w.k === 'img' ? '' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="3.2" y="5" width="17.6" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/>' +
          '<path d="M4 17l4.5-4.5 3 3L15.5 11l4.5 4.5"/></svg>') + '</button>' +
      '</div>' +
      '<input type="file" id="wallFile" accept="image/*" class="hidden">' +
      '<div class="field" id="dimField"' + (w.k === 'none' ? ' hidden' : '') + '>' +
        '<label for="wallDim">How much to veil it</label>' +
        '<input class="slider" type="range" id="wallDim" min="28" max="92" step="1" value="' +
          S.wallDim + '">' +
        '<p class="tiny" id="dimNote"></p></div>';
  }

  function wireWall(sh) {
    function repaintCard() {
      var host = sh.querySelector('#wallCard');
      if (!host) return;
      host.innerHTML = wallHtml();
      wireWall(sh);
    }
    function note() {
      var el2 = sh.querySelector('#dimNote');
      if (!el2) return;
      el2.textContent = S.wallDim > 72
        ? 'Barely there \u2014 easiest to read.'
        : S.wallDim > 45 ? 'A hint of it behind the circle.'
        : 'Bold. Check it still reads in the light you use.';
    }
    note();

    sh.querySelectorAll('[data-w]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.w;
        S.wall = v === 'none' ? { k: 'none' } : { k: 'grad', g: v };
        save(); tick(); paintWall(); repaintCard();
      });
    });

    var pick = sh.querySelector('#wallPick');
    if (pick) pick.addEventListener('click', function () { sh.querySelector('#wallFile').click(); });
    var file = sh.querySelector('#wallFile');
    if (file) file.addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          shrinkWall(img, function (src) {
            S.wall = { k: 'img', src: src };
            save(); tick(); paintWall(); repaintCard();
          });
        };
        img.onerror = function () { toast('That file did not open as a picture.'); };
        img.src = r.result;
      };
      r.readAsDataURL(f);
    });

    var dim = sh.querySelector('#wallDim');
    if (dim) {
      dim.addEventListener('input', function () {
        S.wallDim = Number(dim.value);
        // Repaint live so the slider is a preview, not a guess. Saving is
        // debounced by the sync layer anyway.
        paintWall(); note();
      });
      dim.addEventListener('change', function () { save(); });
    }
  }

  /* ── Account ──────────────────────────────────────────
     Four states, and the important one is the first: with no backend
     configured this is a single reassuring sentence, not a dead login
     form. Sync is something the app can have, never something it needs. */
  var authMode = 'in';   // 'in' | 'up'

  function accountHtml() {
    var sy = window.OTSync;
    if (!sy || !sy.configured) {
      return '<div class="groupline"><span class="label">Your data</span></div>' +
        '<p class="tiny">Everything lives on this device. No account, no server, ' +
        'nothing to sign into \u2014 and it all works with no signal.</p>';
    }
    var head = '<div class="groupline"><span class="label">Account</span></div>';

    if (sy.signedIn) {
      var st = sy.status;
      var word = st === 'on' ? 'Everything is synced'
               : st === 'busy' ? 'Syncing\u2026'
               : st === 'err' ? 'Not synced yet' : 'Waiting';
      return head +
        '<div class="authcard">' +
          '<div class="syncline"><span class="syncdot ' + esc(st) + '"></span>' +
            '<span id="syncWord">' + esc(word) + '</span></div>' +
          '<p class="tiny" style="margin:0">Signed in as <b>' + esc(sy.email) + '</b>. ' +
            'Sign in with the same email anywhere else and your tasks follow you.</p>' +
          (st === 'err' && sy.error ? '<div class="authmsg err">' + esc(sy.error) + '</div>' : '') +
          '<button class="btn quiet" id="syncNow" type="button">Sync now</button>' +
          '<button class="link" id="signOut" type="button">Sign out</button>' +
        '</div>';
    }

    var up = authMode === 'up';
    return head +
      '<p class="tiny">Make an account and today\u2019s circle, your list and your ' +
        'whole history show up on every device you sign in on. Skip it and the app ' +
        'carries on exactly as it is, on this device.</p>' +
      '<div class="authcard" style="margin-top:10px">' +
        '<input class="input" id="auEmail" type="email" inputmode="email" ' +
          'autocomplete="email" placeholder="you@example.com">' +
        '<input class="input" id="auPass" type="password" ' +
          'autocomplete="' + (up ? 'new-password' : 'current-password') + '" ' +
          'placeholder="' + (up ? 'Pick a password (6+ characters)' : 'Password') + '">' +
        '<div class="authmsg err hidden" id="auMsg"></div>' +
        '<button class="btn primary" id="auGo" type="button">' +
          (up ? 'Create account' : 'Sign in') + '</button>' +
        '<button class="link" id="auSwap" type="button">' +
          (up ? 'I already have an account' : 'Create an account') + '</button>' +
        (up ? '' : '<button class="link" id="auForgot" type="button" ' +
          'style="margin-top:-8px">Forgot password</button>') +
      '</div>';
  }

  function wireAccount(sh) {
    var sy = window.OTSync;
    if (!sy || !sy.configured) return;

    var now = sh.querySelector('#syncNow');
    if (now) {
      now.addEventListener('click', function () {
        now.disabled = true;
        sy.syncNow().then(function () {
          now.disabled = false;
          var w = sh.querySelector('#syncWord');
          if (w) w.textContent = sy.status === 'on' ? 'Everything is synced' : 'Not synced yet';
          var d = sh.querySelector('.syncdot');
          if (d) d.className = 'syncdot ' + sy.status;
          render(); topAvatar();
        });
      });
    }
    var out = sh.querySelector('#signOut');
    if (out) {
      out.addEventListener('click', function () {
        if (!confirm('Sign out? Your tasks stay on this device.')) return;
        out.disabled = true;
        sy.signOut().then(function () { reopenProfile(); });
      });
    }

    var go = sh.querySelector('#auGo');
    if (!go) return;
    var email = sh.querySelector('#auEmail'),
        pass  = sh.querySelector('#auPass'),
        msg   = sh.querySelector('#auMsg');

    function say(text, ok) {
      msg.textContent = text;
      msg.className = 'authmsg ' + (ok ? 'ok' : 'err') + (text ? '' : ' hidden');
    }
    function busy(on, label) {
      go.disabled = on;
      go.textContent = on ? label : (authMode === 'up' ? 'Create account' : 'Sign in');
    }

    function submit() {
      var e = (email.value || '').trim(), p = pass.value || '';
      if (!e || e.indexOf('@') < 0) { say('That does not look like an email address.'); return; }
      if (p.length < 6) { say('Use at least 6 characters for the password.'); return; }
      say('');
      busy(true, authMode === 'up' ? 'Creating\u2026' : 'Signing in\u2026');
      var run = authMode === 'up' ? sy.signUp(e, p) : sy.signIn(e, p);
      run.then(function (r) {
        if (r && r.needsConfirm) {
          busy(false);
          say('Account made. Check ' + e + ' for a confirmation link, then sign in.', true);
          authMode = 'in';
          return;
        }
        // A sign-in pulls, merges and repaints; the sheet is stale now.
        return sy.syncNow().then(function () {
          // A brand new account arrives with nothing in it, so this is the
          // moment for the welcome. Signing in to an account that already
          // has a list has just filled the library — that person is set up
          // already and gets their own tasks instead.
          if (!S.library.length) {
            document.querySelectorAll('.sheet,.scrim').forEach(function (n) { n.remove(); });
            render(); topAvatar();
            setTimeout(welcome, 180);
            return;
          }
          reopenProfile(); render(); topAvatar();
        });
      }).catch(function (err) {
        busy(false);
        say(sy.friendly(err));
      });
    }

    go.addEventListener('click', submit);
    pass.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); submit(); } });

    sh.querySelector('#auSwap').addEventListener('click', function () {
      authMode = authMode === 'up' ? 'in' : 'up';
      reopenProfile();
    });
    var forgot = sh.querySelector('#auForgot');
    if (forgot) {
      forgot.addEventListener('click', function () {
        var e = (email.value || '').trim();
        if (!e || e.indexOf('@') < 0) { say('Type your email above first.'); return; }
        sy.resetPassword(e)
          .then(function () { say('Sent. Check ' + e + ' for a reset link.', true); })
          .catch(function (err) { say(sy.friendly(err)); });
      });
    }
  }

  /* Rebuilding the sheet is cheaper than patching it, and it keeps the
     account block a pure function of the sync state. */
  function reopenProfile() {
    document.querySelectorAll('.sheet,.scrim').forEach(function (n) { n.remove(); });
    openProfile();
  }

  function openProfile() {
    var byDay = {}, byTop = {};
    S.history.forEach(function (h) {
      byDay[h.day] = (byDay[h.day] || 0) + 1;
      byTop[h.top] = (byTop[h.top] || 0) + 1; });
    var k = todayKey(), active = 0;
    for (var i = 0; i < 30; i++) if (byDay[shiftDay(k, -i)]) active++;
    var best = 0, bestDay = null;
    Object.keys(byDay).forEach(function (d) { if (byDay[d] > best) { best = byDay[d]; bestDay = d; } });

    var names = ['S','M','T','W','T','F','S'], week = '';
    for (var j = 6; j >= 0; j--) {
      var dk = shiftDay(k, -j);
      week += '<span class="' + (byDay[dk] ? 'hit' : '') + '">' + names[parseDay(dk).getDay()] + '</span>';
    }
    var heat = '';
    for (var m = 83; m >= 0; m--) {
      var hk = shiftDay(k, -m), n = byDay[hk] || 0;
      heat += '<i style="background:' + (n === 0 ? 'var(--sunken)'
        : n < 2 ? 'color-mix(in oklab,var(--done) 32%,var(--sunken))'
        : n < 4 ? 'color-mix(in oklab,var(--done) 62%,var(--sunken))' : 'var(--done)') + '"></i>';
    }
    var tot = Object.keys(byTop).reduce(function (a, x) { return a + byTop[x]; }, 0) || 1;
    var bars = Object.keys(byTop).sort(function (a, b) { return byTop[b] - byTop[a]; })
      .map(function (id) {
        return '<div class="barline"><div class="t"><span>' + esc(topic(id).n) + '</span>' +
          '<span class="tiny">' + byTop[id] + '</span></div><div class="bartrack">' +
          '<i style="width:' + Math.max(Math.round(byTop[id] / tot * 100), 3) + '%;background:' +
          topColor(id) + '"></i></div></div>'; }).join('');

    var todayDone = S.history.filter(function (h) { return h.day === k; });

    sheet('You',
      '<div style="display:flex;align-items:center;gap:13px">' +
        '<button class="avatar" id="ava" type="button" style="width:60px;height:60px;font-size:1.25rem" ' +
          'aria-label="Change picture"></button>' +
        '<div style="flex:1;min-width:0">' +
          '<input class="input" id="nameIn" placeholder="Your name" maxlength="28" value="' +
            esc(S.name) + '">' +
          '<button class="link" id="avaPick" type="button" style="text-align:left;width:auto;padding:6px 2px">' +
            (S.avatar ? 'Change picture' : 'Add a picture') + '</button></div>' +
        '<input type="file" id="avaFile" accept="image/*" class="hidden"></div>' +

      '<div class="groupline"><span class="label">Your stats</span></div>' +
      '<div class="statgrid">' +
        '<div class="stat"><b>' + S.history.length + '</b><span>finished, all time</span></div>' +
        '<div class="stat"><b>' + active + '<span style="font-family:var(--sans);font-size:.85rem;' +
          'font-weight:600;color:var(--ink-3);display:inline"> / 30</span></b>' +
          '<span>days active recently</span></div>' +
        '<div class="stat"><b>' + best + '</b><span>most in a day' +
          (bestDay ? ' · ' + dayName(bestDay) : '') + '</span></div>' +
        '<div class="stat"><b>' + (byDay[k] || 0) + '</b><span>finished today</span></div></div>' +

      '<div class="groupline"><span class="label">This week</span></div>' +
      '<div class="week">' + week + '</div>' +
      '<p class="tiny">A dip is a dip. There is no streak to lose.</p>' +

      '<div class="groupline"><span class="label">Last 12 weeks</span></div>' +
      '<div class="heat">' + heat + '</div>' +

      (bars ? '<div class="groupline"><span class="label">What you finish most</span></div>' +
        '<div style="display:flex;flex-direction:column;gap:11px">' + bars + '</div>' : '') +

      (todayDone.length ? '<div class="groupline"><span class="label">Finished today</span></div>' +
        '<ul class="list">' + todayDone.map(function (h) {
          return '<li class="row"><span class="dot" style="--topic:' + topColor(h.top) + '"></span>' +
            '<span class="row-body"><span class="row-title" style="color:var(--ink-3);' +
            'text-decoration:line-through">' + esc(h.t) + '</span></span>' +
            '<button class="mini" data-undo="' + h.taskId + '" type="button" aria-label="Put back">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
            'stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 10-2.5 5.8"/>' +
            '<path d="M20 6.5V12h-5.5"/></svg></button></li>'; }).join('') + '</ul>' +
        '<p class="tiny">Tapped one by mistake? Put it back.</p>' : '') +

      '<div id="wallCard">' + wallHtml() + '</div>' +

      accountHtml() +

      '<div class="groupline"><span class="label">Settings</span></div>' +
      '<div class="field"><label>Your day starts at</label>' +
        '<div class="pickrow" id="hours">' + [2,3,4,5,6,7].map(function (h) {
          return '<button class="pick" type="button" data-h="' + h + '" aria-pressed="' +
            (h === S.dayStart) + '">' + h + 'am</button>'; }).join('') + '</div>' +
        '<p class="tiny" id="hourNote"></p></div>' +
      '<div class="switchrow"><span style="font-size:.9rem">Dark theme</span>' +
        '<button class="switch" id="themeSw" role="switch" aria-checked="' + isDark() +
        '"><span></span></button></div>' +
      '<div class="switchrow"><span style="font-size:.9rem">Sounds</span>' +
        '<button class="switch" id="soundSw" role="switch" aria-checked="' + !!S.sound +
        '"><span></span></button></div>' +
      '<button class="link" id="wipe" type="button" style="margin-top:4px">Reset everything</button>',

      function (sh, close) {
        var ava = sh.querySelector('#ava');
        function paint() {
          ava.innerHTML = S.avatar ? '<img src="' + S.avatar + '" alt="">'
            : (S.name ? esc(S.name.trim()[0].toUpperCase()) : '☺');
        }
        paint();
        function pickFile() { sh.querySelector('#avaFile').click(); }
        ava.addEventListener('click', pickFile);
        sh.querySelector('#avaPick').addEventListener('click', pickFile);
        sh.querySelector('#avaFile').addEventListener('change', function (e) {
          var f = e.target.files && e.target.files[0]; if (!f) return;
          var r = new FileReader();
          r.onload = function () {
            var img = new Image();
            img.onload = function () {
              // Downscaled before storing — a phone photo would blow the quota.
              var size = 200, cv = document.createElement('canvas');
              cv.width = cv.height = size;
              var g = cv.getContext('2d'), s = Math.min(img.width, img.height);
              g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
              S.avatar = cv.toDataURL('image/jpeg', 0.82);
              save(); paint(); topAvatar();
            };
            img.src = r.result;
          };
          r.readAsDataURL(f);
        });
        sh.querySelector('#nameIn').addEventListener('input', function (e) {
          S.name = e.target.value; save(); paint(); topAvatar(); });

        sh.querySelectorAll('[data-undo]').forEach(function (b) {
          b.addEventListener('click', function () {
            undoTask(Number(b.dataset.undo)); close();
            setTimeout(function () { toast('Put back on today'); }, 260);
          });
        });

        wireAccount(sh);
        wireWall(sh);

        function note() {
          sh.querySelector('#hourNote').innerHTML = 'Something finished at 1am counts toward ' +
            (S.dayStart > 1 ? '<b>the day before</b>' : '<b>that same day</b>') +
            '. Nothing is deleted when the day turns over.';
        }
        note();
        sh.querySelectorAll('#hours .pick').forEach(function (b) {
          b.addEventListener('click', function () {
            S.dayStart = Number(b.dataset.h); save(); tick();
            sh.querySelectorAll('#hours .pick').forEach(function (x) {
              x.setAttribute('aria-pressed', String(Number(x.dataset.h) === S.dayStart)); });
            note();
          });
        });
        sh.querySelector('#themeSw').addEventListener('click', function () {
          var next = isDark() ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          S.theme = next; save();
          this.setAttribute('aria-checked', String(next === 'dark'));
          render();
        });
        sh.querySelector('#soundSw').addEventListener('click', function () {
          S.sound = !S.sound; save();
          this.setAttribute('aria-checked', String(!!S.sound));
          // Turning it on should make the sound it is promising.
          if (S.sound) play('step');
        });
        sh.querySelector('#wipe').addEventListener('click', function () {
          if (!confirm('Clear all tasks, topics, history and settings?')) return;
          localStorage.removeItem(KEY); S = fresh(); ensureDay(); save();
          document.documentElement.removeAttribute('data-theme');
          close(); render(); topAvatar(); paintWall();
          // Starting over should feel like a first run, because it is one.
          seenIntro = false;
          setTimeout(welcome, 320);
        });
      });
  }

  /* ── Welcome ─────────────────────────────────────────────
     What a new person sees before anything else. It asks two questions,
     in this order for a reason: the things that come back every day are
     the ones people forget they can stop holding in their head, and they
     are also the ones that make the app look alive tomorrow morning. The
     one-offs come second because they are the part everybody already
     knows how to type.

     Everything is written to the list the moment it is typed, so closing
     this half way through keeps the work rather than throwing it away,
     and the whole thing is skippable at every step. It is shown once —
     marked as shown the moment it opens, not when it is completed,
     because a welcome you have already met should never come back. */
  /* The suggestions carry the topic they obviously belong to, so a list built
     entirely by tapping still comes out in more than one colour — the ring is
     supposed to be a picture of what the day is made of, and it can't be that
     if everything lands in the same pile. Anything typed goes to the first
     topic and can be re-filed later. */
  var DAILY_IDEAS = [
    { t: 'Morning meds', top: 't2' }, { t: 'Make the bed',  top: 't3' },
    { t: 'Walk the dog', top: 't2' }, { t: 'Drink water',   top: 't2' },
    { t: 'Stretch',      top: 't2' }, { t: 'Tidy up',       top: 't3' },
    { t: 'Read a bit',   top: 't1' }];
  var ONCE_IDEAS = [
    { t: 'Book the dentist',    top: 't2' }, { t: 'Reply to that email', top: 't4' },
    { t: 'Pay a bill',          top: 't1' }, { t: 'Tidy the kitchen',    top: 't3' },
    { t: 'Call someone back',   top: 't1' }];
  var STEPS = {
    daily: {
      title: 'What do you do most days?',
      note: 'Things that come back — meds, the dog, the school run. These ' +
            'turn up in your circle on their own every morning, so they stop ' +
            'being something you have to remember.',
      ph: 'Something you do most days…',
      sub: 'Every day',
      ideas: DAILY_IDEAS,
      next: 'Next',
      skip: 'Nothing daily — skip'
    },
    once: {
      title: 'What do you want to get done?',
      note: 'The one-offs. They wait in your list until you pick them, and ' +
            'nothing expires or nags you about them.',
      ph: 'Something you want to get done…',
      sub: 'When you get to it',
      ideas: ONCE_IDEAS,
      next: 'Start my day',
      skip: 'Skip this too'
    }
  };

  var seenIntro = false;
  function welcome() {
    // Second time round — after making an account on a device that skipped
    // it — the introduction has already been read. Go straight to the ask.
    var step = seenIntro ? 2 : 1;       // 1 intro · 2 daily · 3 one-offs
    var added = { daily: [], once: [] };
    var closeSheet = null;
    seenIntro = true;

    // Shown is shown. Anything typed from here is saved as it is typed.
    S.onboarded = true; save();

    function kindOf() { return step === 2 ? 'daily' : 'once'; }
    function topicFor(want) {
      var has = S.topics.some(function (t) { return t.id === want; });
      return has ? want : (S.topics[0] || { id: 't1' }).id;
    }
    function addOne(text, top) {
      var v = (text || '').trim().slice(0, 70);
      if (!v) return false;
      var taken = S.library.some(function (t) {
        return t.t.toLowerCase() === v.toLowerCase(); });
      if (taken) return false;
      var kind = kindOf();
      var nt = { id: nid(), t: v, top: topicFor(top),
                 rep: kind === 'daily' ? { k: 'daily' } : { k: 'none' } };
      S.library.unshift(nt);
      added[kind].push(nt.id);
      save();
      return true;
    }
    function dropOne(id) {
      var t = lib(id); if (!t) return;
      S.library.splice(S.library.indexOf(t), 1);
      S.libDel.push(id);
      var kind = kindOf();
      added[kind] = added[kind].filter(function (x) { return x !== id; });
      save();
    }

    function listHtml(kind) {
      if (!added[kind].length) return '';
      return '<ul class="list" style="margin-top:14px">' + added[kind].map(function (id) {
        var t = lib(id); if (!t) return '';
        return '<li class="row" style="--topic:' + topColor(t.top) + '">' +
          '<span class="row-body"><span class="row-title">' + esc(t.t) + '</span>' +
          '<span class="row-sub"><b>' + esc(topic(t.top).n) + '</b> · ' +
          esc(STEPS[kind].sub) + '</span></span>' +
          '<button class="mini" data-drop="' + id + '" type="button" aria-label="Remove ' +
          esc(t.t) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.9" stroke-linecap="round">' +
          '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></button></li>';
      }).join('') + '</ul>';
    }
    function ideaHtml(kind) {
      var have = {};
      S.library.forEach(function (t) { have[t.t.toLowerCase()] = 1; });
      var left = STEPS[kind].ideas.filter(function (x) { return !have[x.t.toLowerCase()]; });
      if (!left.length) return '';
      return '<span class="picklabel">Or tap one of these</span>' +
        '<div class="pickrow">' + left.map(function (x) {
          var c = topColor(topicFor(x.top));
          return '<button class="pick" type="button" data-idea="' + esc(x.t) +
            '" data-top="' + esc(x.top) + '" style="--topic:' + c + '">' +
            '<i style="background:' + c + '"></i>' + esc(x.t) + '</button>'; }).join('') +
        '</div>';
    }

    function bodyHtml() {
      if (step === 1) {
        return '<p class="lede">Two questions and your list is set up.</p>' +
          '<p class="tiny">One Thing keeps the day down to a handful of things and ' +
          'shows you a single circle for all of them. Nothing punishes you for a bad ' +
          'day, there is no streak to lose, and everything here can be changed later.</p>' +
          '<div style="margin-top:20px">' +
            '<button class="btn primary" id="wGo" type="button">Set up my list</button>' +
            '<button class="link" id="wSkip" type="button">Skip — I’ll add my own</button>' +
          '</div>';
      }
      var kind = kindOf(), c = STEPS[kind];
      return '<p class="tiny">' + c.note + '</p>' +
        '<div style="display:flex;gap:8px;margin-top:14px">' +
          '<input class="input" id="wIn" placeholder="' + c.ph + '" maxlength="70" ' +
            'autocomplete="off" enterkeyhint="done">' +
          '<button class="btn primary" id="wAdd" type="button" style="width:48px;flex:none;padding:0" ' +
            'aria-label="Add"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="2.4" stroke-linecap="round">' +
            '<path d="M12 5.5v13M5.5 12h13"/></svg></button></div>' +
        '<div id="wIdeas">' + ideaHtml(kind) + '</div>' +
        '<div id="wList">' + listHtml(kind) + '</div>' +
        '<div style="position:sticky;bottom:0;background:var(--ground);padding-top:14px;' +
          'margin-top:18px">' +
          '<button class="btn primary" id="wNext" type="button">' + c.next + '</button>' +
          '<button class="link" id="wSkipStep" type="button">' + c.skip + '</button></div>';
    }

    function finish() {
      ensureDay();
      // The dailies belong on today by definition; a few of the one-offs go on
      // too, so the first screen after this is never an empty one.
      added.daily.concat(added.once.slice(0, 3)).forEach(function (id) {
        if (lib(id) && S.day.tasks.indexOf(id) < 0) S.day.tasks.push(id);
      });
      S.day.planned = true;              // the morning question would be noise now
      save();
      if (closeSheet) closeSheet();
      tab = 'today';
      setTimeout(function () { render(); paintWall(); tick(12, 'finale'); }, 90);
    }

    function paint(sh) {
      sh.querySelector('.sheet-head h2').textContent =
        step === 1 ? 'Welcome' : STEPS[kindOf()].title;
      var body = sh.querySelector('.sheet-body');
      body.innerHTML = bodyHtml();
      wire(sh);
    }

    /* Adding something must not touch the field you are typing into: on a
       phone, replacing that element takes the keyboard down with it. So the
       two parts that actually changed are redrawn and nothing else is. */
    function refresh(sh) {
      var kind = kindOf();
      var ideas = sh.querySelector('#wIdeas'), list = sh.querySelector('#wList');
      if (ideas) ideas.innerHTML = ideaHtml(kind);
      if (list) list.innerHTML = listHtml(kind);
      wirePieces(sh);
    }

    function wirePieces(sh) {
      sh.querySelectorAll('[data-idea]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (addOne(b.dataset.idea, b.dataset.top)) { tick(8, 'add'); refresh(sh); } });
      });
      sh.querySelectorAll('[data-drop]').forEach(function (b) {
        b.addEventListener('click', function () {
          dropOne(Number(b.dataset.drop)); refresh(sh); });
      });
    }

    function wire(sh) {
      var go = sh.querySelector('#wGo');
      if (go) go.addEventListener('click', function () { step = 2; tick(8, 'step'); paint(sh); });
      var skip = sh.querySelector('#wSkip');
      if (skip) skip.addEventListener('click', function () { if (closeSheet) closeSheet(); });

      var input = sh.querySelector('#wIn');
      if (input) {
        var commit = function () {
          if (addOne(input.value)) { tick(8, 'add'); refresh(sh); }
          input.value = '';
          // The field is the same element it was a moment ago, so the
          // keyboard never went anywhere.
        };
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); commit(); } });
        sh.querySelector('#wAdd').addEventListener('click', function () {
          commit(); input.focus(); });
      }
      wirePieces(sh);

      var next = sh.querySelector('#wNext');
      if (next) next.addEventListener('click', function () {
        if (step === 2) { step = 3; tick(8, 'step'); paint(sh); } else finish(); });
      var skipStep = sh.querySelector('#wSkipStep');
      if (skipStep) skipStep.addEventListener('click', function () {
        if (step === 2) { step = 3; paint(sh); } else finish(); });
    }

    closeSheet = sheet('Welcome', '', function (sh, close) {
      closeSheet = close;
      paint(sh);
    });
  }

  /* ── Morning ─────────────────────────────────────────── */
  function morning() {
    if (S.day.planned) return;
    var late = new Date().getHours() >= 14;
    var chosen = {}, capSel = null;
    var avail = S.library.filter(function (t) {
      return !t.paused && S.day.tasks.indexOf(t.id) < 0; });

    sheet(late ? 'Shape the rest of the day?' : 'Good morning',
      '<p class="tiny">' + (late
        ? 'Half the day has gone. Pick a couple of things for what is left — or skip it.'
        : 'How much have you got today? This resets every morning.') + '</p>' +
      '<div class="pickrow" id="cap" style="gap:7px">' +
        [['little','Not much'],['some','Some'],['lots','Plenty']].map(function (c) {
          return '<button class="pick" type="button" data-c="' + c[0] + '" aria-pressed="false" ' +
            'style="flex:1;justify-content:center">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<p class="tiny" id="capNote">Pick one and I will only suggest as much as that.</p>' +
      '<div class="groupline"><span class="label">What do you want to finish?</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:7px" id="mList"></div>' +
      '<div style="position:sticky;bottom:0;background:var(--ground);padding-top:10px">' +
        '<button class="btn primary" id="go" type="button">Start my day</button>' +
        '<button class="link" id="skip" type="button">Skip — just show me today</button></div>',
      function (sh, close) {
        var listEl = sh.querySelector('#mList'), go = sh.querySelector('#go');
        var N = { little: 3, some: 6, lots: 99 };
        var TXT = { little: 'Three at most. That is a whole day.',
                    some: 'A handful, and the rest waits.',
                    lots: 'Everything you might want to look at.' };
        function paint() {
          listEl.innerHTML = avail.slice(0, capSel ? N[capSel] : 6).map(function (t) {
            return '<button class="selrow" type="button" data-id="' + t.id + '" aria-pressed="' +
              !!chosen[t.id] + '"><span class="selbox"><svg viewBox="0 0 24 24">' +
              '<path d="M5 12.5l4.6 4.6L19 7"/></svg></span>' +
              '<span class="dot" style="--topic:' + topColor(t.top) + '"></span>' +
              '<span style="flex:1;min-width:0"><span style="display:block;font-size:.93rem">' +
              esc(t.t) + '</span><span class="row-sub">' + esc(topic(t.top).n) + '</span></span></button>';
          }).join('') || '<p class="tiny">Nothing in your list yet — add some in Tasks.</p>';
          listEl.querySelectorAll('.selrow').forEach(function (b) {
            b.addEventListener('click', function () {
              var id = Number(b.dataset.id);
              chosen[id] = !chosen[id];
              b.setAttribute('aria-pressed', String(!!chosen[id]));
              var c = Object.keys(chosen).filter(function (x) { return chosen[x]; }).length;
              go.textContent = c ? 'Start my day · ' + c : 'Start my day';
              tick(8);
            });
          });
        }
        paint();
        sh.querySelectorAll('#cap .pick').forEach(function (b) {
          b.addEventListener('click', function () {
            capSel = b.dataset.c; tick();
            sh.querySelectorAll('#cap .pick').forEach(function (x) {
              x.setAttribute('aria-pressed', String(x.dataset.c === capSel)); });
            sh.querySelector('#capNote').textContent = TXT[capSel];
            paint();
          });
        });
        function done() {
          Object.keys(chosen).forEach(function (x) {
            if (chosen[x] && S.day.tasks.indexOf(Number(x)) < 0) S.day.tasks.push(Number(x)); });
          S.day.planned = true; save(); close();
          setTimeout(renderToday, 60);
        }
        go.addEventListener('click', function () { tick(12, 'step'); done(); });
        sh.querySelector('#skip').addEventListener('click', function () { chosen = {}; done(); });
      });
  }

  /* ═══════════ BOOT ═══════════ */
  function topAvatar() {
    var btn = document.getElementById('profileBtn');
    btn.innerHTML = S.avatar
      ? '<img src="' + S.avatar + '" alt="">'
      : (S.name ? esc(S.name.trim()[0].toUpperCase()) : '☺');
    // A green rim when there is an account behind it. The only thing on the
    // main screen that says anything about sync, and it says it quietly.
    var on = !!(window.OTSync && OTSync.signedIn);
    btn.classList.toggle('signed', on);
    btn.setAttribute('aria-label', on
      ? 'You and your stats — signed in, tasks synced'
      : 'You and your stats');
  }
  function render() {
    if (tab === 'today') renderToday(); else renderTasks();
    paintWall();
    document.querySelectorAll('.tabbtn').forEach(function (b) {
      if (b.dataset.tab === tab) b.setAttribute('aria-selected', 'true');
      else b.removeAttribute('aria-selected'); });
    // There used to be a 120ms opacity animation on the whole of main here.
    // It promoted the entire scroll container to its own layer on every
    // single render, which on a phone is the difference between a tab
    // switch that lands instantly and one that visibly lags. The rows
    // animate themselves in; the container does not need to.
    main.scrollTop = 0;
  }
  /* iOS does not resize the layout when the keyboard opens — it shrinks the
     visual viewport and leaves the layout the same size underneath. So a
     shell pinned to the layout viewport puts everything anchored to the
     bottom, including the field you are typing into, behind the keyboard.
     This measures the difference and lets the CSS lift the sheet clear of
     it. On anything that resizes properly the number is always zero and
     none of it does anything. */
  if (window.visualViewport) {
    var vv = window.visualViewport;
    var applyKb = function () {
      var gap = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      document.documentElement.style.setProperty('--kb', gap + 'px');
      document.documentElement.classList.toggle('kb', gap > 90);
    };
    vv.addEventListener('resize', applyKb);
    vv.addEventListener('scroll', applyKb);
    applyKb();
  }

  /* Safari's own pinch gesture, which zooms the page rather than anything in
     it — on a fixed app shell that only ever leaves you looking at a corner
     of it with no way back except reloading. The browser's text size setting
     and the system zoom both still work. */
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });

  document.querySelectorAll('.tabbtn').forEach(function (b) {
    b.addEventListener('click', function () { tab = b.dataset.tab; tick(8); render(); }); });
  document.getElementById('profileBtn').addEventListener('click', openProfile);
  document.getElementById('themeBtn').addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    S.theme = next; save(); render();
  });

  /* Sync gets its hooks only after the first paint. Nothing above this
     line touches the network, which is why the app opens the same with
     or without a signal. */
  if (window.OTSync) {
    OTSync.init({
      get: function () { return S; },
      set: function (doc) {
        S = doc;
        if (!S.removed) S.removed = [];
        if (!S.libDel) S.libDel = [];
        if (!S.topDel) S.topDel = [];
        try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
        if (S.theme) document.documentElement.setAttribute('data-theme', S.theme);
        ensureDay();
        topAvatar();
        render();
      }
    });
    OTSync.onChange(function (sy) {
      topAvatar();
      acctBanner();
      var sheetOpen = document.querySelector('.sheet');
      var dot = sheetOpen && sheetOpen.querySelector('.syncdot');
      if (dot) {
        dot.className = 'syncdot ' + sy.status;
        var w = sheetOpen.querySelector('#syncWord');
        if (w) w.textContent = sy.status === 'on' ? 'Everything is synced'
          : sy.status === 'busy' ? 'Syncing\u2026'
          : sy.status === 'err' ? 'Not synced yet' : 'Waiting';
      }
    });
  }

  topAvatar();
  render();
  paintWall();
  acctBanner();
  // A first run gets the welcome; every run after that gets the morning
  // question. They never both appear, and neither ever blocks the app.
  setTimeout(S.onboarded ? morning : welcome, S.onboarded ? 400 : 320);
})();
