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

    /* Pastels. These are not the bright ones turned down — a tint of a
       saturated colour goes grey and stops being identifiable, which is the
       whole job a topic colour has. They are their own set, mixed to stay
       distinct from each other at a glance, and each one is taken several
       steps deeper for the dark theme, where a genuine pastel would read as
       a smudge of white. */
    { id: 'blush',   l: '#ff9db0', d: '#ff8fa6' },
    { id: 'peach',   l: '#ffb08a', d: '#ff9e72' },
    { id: 'butter',  l: '#f2c94c', d: '#ffd75e' },
    { id: 'sage',    l: '#8fc99b', d: '#7cc98d' },
    { id: 'seafoam', l: '#7fd4c1', d: '#6bd9c2' },
    { id: 'powder',  l: '#93bdf0', d: '#7fb4f5' },
    { id: 'lilac',   l: '#b9a3ed', d: '#ad93f0' },
    { id: 'clay',    l: '#c9a48b', d: '#d2a98c' },

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
  /* A live id always wins. The remap is only for colours that no longer
     exist — and two of them, amber and rose, have since come back, so
     checking the retirement list first was quietly handing back yellow and
     red to anyone who picked them. */
  function swatchColor(id) {
    var s = swatch(id) || swatch(RETIRED[id]) || SW_FALLBACK;
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
      name: '', avatar: '', dayStart: 4, theme: '', font: '', uid: 200,
      wall: { k: 'none' }, wallDim: 58, onboarded: false, sound: true,
      petName: '', petColor: '', petSex: 'm',
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
      // The one task with a timer on it, if any: { id, at, mins, rang }.
      // One at a time, on purpose — see openFocus().
      focus: null,
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
  if (typeof S.font !== 'string') S.font = '';
  if (typeof S.petName !== 'string') S.petName = '';
  if (typeof S.petColor !== 'string') S.petColor = '';
  if (typeof S.petSex !== 'string') S.petSex = 'm';
  if (!S.focus || typeof S.focus !== 'object') S.focus = null;

  /* The six wallpapers were redrawn and renamed. An id that no longer exists
     produces no wallpaper at all and looks like the setting was lost, so each
     old one points at whichever new one it most nearly was. */
  var WALL_WAS = { dawn: 'petal', sea: 'tide', moss: 'orchard',
                   dusk: 'ember', sand: 'sunrise', ink: 'slate' };
  if (S.wall && S.wall.k === 'grad' && WALL_WAS[S.wall.g]) S.wall.g = WALL_WAS[S.wall.g];

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
  /* The whole document goes to localStorage as one string, and that document
     can be carrying a wallpaper — a hundred kilobytes and more of base64.
     Doing that between a key going down and the row appearing is most of why
     adding a task felt heavy on a phone. The write is coalesced and pushed
     off the end of the interaction instead; anything that could lose it
     flushes first, so nothing is ever risked for the sake of it. */
  var saveT = null, unsaved = false;
  function flushSave() {
    if (!unsaved) return;
    unsaved = false;
    if (saveT) { clearTimeout(saveT); saveT = null; }
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  function save() {
    S.rev = Date.now();
    unsaved = true;
    if (saveT) clearTimeout(saveT);
    saveT = setTimeout(flushSave, 80);
    if (window.OTSync) OTSync.touch();
  }
  window.addEventListener('pagehide', flushSave);
  window.addEventListener('beforeunload', flushSave);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) flushSave();
  });
  if (S.theme) document.documentElement.setAttribute('data-theme', S.theme);
  if (S.font) document.documentElement.setAttribute('data-font', S.font);

  /* ── The bar above the app ─────────────────────────────
     On a phone the browser paints the status bar from one meta tag, and the
     markup used to answer it twice — once per OS scheme — which is fine right
     up until somebody uses the theme switch inside the app and their phone
     disagrees. Then the app is dark and the strip above it is white.

     Reading --ground back off the document instead means there is one answer
     and it is, by construction, the colour the app is actually painted in. */
  function paintThemeColor() {
    var m = document.getElementById('themeColor');
    if (!m) return;
    var c = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim();
    if (c) m.setAttribute('content', c);
  }
  paintThemeColor();
  // Only matters while the app is following the phone rather than its own
  // setting, but it costs nothing to keep listening.
  try {
    matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', paintThemeColor);
  } catch (e) {}

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

  /* A one-off you have finished is archived: it keeps its place in your
     history and stops sitting in the list of things you might do, which is
     the only place it was ever noise.

     It is worked out from two things that have to agree — the stamp put on
     the task when it was finished, and a surviving completion in the
     history — rather than from the stamp alone. That matters because the
     history is the one part of this document that merges losslessly across
     devices: undo the completion anywhere and the entry goes, so the task
     comes back everywhere, even if the stamp itself survived the trip. */
  function archived() {
    var done = {}, out = {};
    S.history.forEach(function (h) { done[h.taskId] = 1; });
    S.library.forEach(function (t) {
      if (t.doneAt && !repeats(t) && done[t.id]) out[t.id] = 1; });
    return out;
  }

  function topic(id) { return S.topics.filter(function (t) { return t.id === id; })[0] || S.topics[0]; }
  function topColor(id) { return swatchColor(topic(id).sw); }
  function todayKey() { return localDay(new Date(), S.dayStart); }

  function ensureDay() {
    var k = todayKey();
    if (!S.day || S.day.key !== k) {
      S.day = { key: k, planned: false, tasks: [], done: [], pick: {} };
      // Anything whose rule lands on this date is already in the day.
      // A paused task keeps its rule and stops acting on it.
      S.library.filter(function (t) { return !t.paused && dueOn(t, k); })
        .forEach(function (t) { S.day.tasks.push(t.id); });
      save();
    }
  }
  ensureDay();
  if (S.day && !S.day.pick) S.day.pick = {};

  /* Archiving a finished one-off works from a stamp put on the task at the
     moment it is ticked — which means everything anyone had already finished
     before that existed carries no stamp, and sat in the list for ever. That
     is precisely the pile this was meant to clear, so it is worth one pass to
     put the stamps on from the history, using the day each task was last
     finished. Done once, and recorded so it never runs again. */
  if (!S.archived1) {
    var lastDone = {};
    S.history.forEach(function (h) {
      if (!lastDone[h.taskId] || h.day > lastDone[h.taskId]) lastDone[h.taskId] = h.day; });
    S.library.forEach(function (t) {
      if (!t.doneAt && !repeats(t) && lastDone[t.id]) t.doneAt = lastDone[t.id]; });
    S.archived1 = 1;
  }
  /* Taking something off today has to be recorded, not just done. The day's
     task list is merged between devices as a union, so a removal that leaves
     no trace is put straight back by the next sync — and since a sync also
     pulls back the copy this device pushed a moment ago, that happened on one
     device too: the row went, and a second later it was there again, which is
     indistinguishable from the button not working.

     A plain list of removed ids would not be enough either, because putting
     something back has to beat having taken it off, and a union of two lists
     has no way to say which came last. So each decision is stamped:

         day.pick = { <task id>: [when, 1 on today / 0 off it] }

     and the merge keeps whichever of the two is later. That makes taking off
     and putting back symmetrical, and both survive a round trip. */
  function markDay(id, on) {
    if (!S.day.pick) S.day.pick = {};
    S.day.pick[id] = [Date.now(), on ? 1 : 0];
  }
  function offDay(id, yes) { markDay(id, !yes); }
  function onDay(id) {
    markDay(id, true);
    if (S.day.tasks.indexOf(id) < 0) S.day.tasks.push(id);
  }
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
  var AC = null, silentEl = null;
  function audio() {
    if (AC !== null) return AC;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      AC = Ctor ? new Ctor() : false;
    } catch (e) { AC = false; }
    return AC;
  }

  /* Why a page that plainly called play() still made no sound on a phone:
     iOS treats Web Audio as an alert by default, and the ring/silent switch
     silences alerts. Almost everybody leaves that switch on silent, so the
     app was mute for almost everybody.

     Two things fix it, and both have to happen inside a real gesture.
     `audioSession.type = 'playback'` is the modern answer and says this is
     media, not a notification. Before that existed, the rule only lifted
     once a media element had played — so a generated silent clip is played
     once, which costs nothing and is the difference between sound and no
     sound on an older phone. */
  function silentClip() {
    if (silentEl) return silentEl;
    try {
      var n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), i = 0;
      function s(str) { for (var j = 0; j < str.length; j++) v.setUint8(i++, str.charCodeAt(j)); }
      function u32(x) { v.setUint32(i, x, true); i += 4; }
      function u16(x) { v.setUint16(i, x, true); i += 2; }
      s('RIFF'); u32(36 + n * 2); s('WAVE'); s('fmt '); u32(16); u16(1); u16(1);
      u32(8000); u32(16000); u16(2); u16(16); s('data'); u32(n * 2);
      silentEl = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
      silentEl.setAttribute('playsinline', '');
      silentEl.volume = 0.001;
    } catch (e) { silentEl = false; }
    return silentEl;
  }

  var audioReady = false;
  function unlockAudio() {
    if (audioReady) return;
    var ac = audio(); if (!ac) { audioReady = true; return; }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      if (ac.state === 'suspended') ac.resume();
      var src0 = ac.createBufferSource();
      src0.buffer = ac.createBuffer(1, 1, 22050);
      src0.connect(ac.destination); src0.start(0);
    } catch (e) {}
    try {
      var el = silentClip();
      if (el) { var pr = el.play(); if (pr && pr.catch) pr.catch(function () {}); }
    } catch (e) {}
    audioReady = true;
  }
  // Every route in: a tap, a key, or the first touch of the screen.
  ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, unlockAudio, { capture: true, passive: true });
  });
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
                                 { f: 1320, d: .55, g: .05, at: .18 }] },
    /* A timer running out is information, not applause — the task is not
       finished, the clock simply passed the number you picked. Two soft
       notes, well short of `finale`, and nothing at all if sound is off. */
    time:   { w: 'sine',     n: [{ f: 740, d: .26, g: .05 },
                                 { f: 988, d: .34, g: .045, at: .16 }] }
  };
  function play(kind) {
    if (!S || !S.sound) return;
    var ac = audio(); if (!ac) return;
    try {
      unlockAudio();
      if (ac.state === 'suspended') ac.resume();
      // A hair of lookahead. Scheduling exactly at currentTime is scheduling
      // in the past by the time the graph runs, and the attack gets clipped
      // — which reads as a click, or as nothing at all.
      var v = SOUNDS[kind] || SOUNDS.tap, t0 = ac.currentTime + .012;
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
    var R = px / 2 - 13, C = 2 * Math.PI * R, n = Math.max(total, 1);
    var gap = n === 1 ? 0 : Math.min(13, C * 0.034);
    var seg = Math.max((C - gap * n) / n, 2);
    var out = '<svg width="' + px + '" height="' + px + '" viewBox="0 0 ' + px + ' ' + px +
      '" aria-hidden="true">';
    for (var i = 0; i < n; i++) {
      var c = colours[i];
      out += '<circle class="seg' + (c ? '' : ' empty') + '" cx="' + px / 2 + '" cy="' + px / 2 +
        '" r="' + R + '" stroke-width="11"' + (c ? ' stroke="' + c + '"' : '') +
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

  /* "Yesterday" beats a date, and a weekday beats a date inside the last
     week. Past that a date is the only thing that means anything. */
  function dayLabel(key) {
    var k = todayKey();
    if (key === k) return 'Today';
    if (key === shiftDay(k, -1)) return 'Yesterday';
    for (var i = 2; i <= 6; i++) if (key === shiftDay(k, -i)) return dayName(key);
    var d = parseDay(key);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  /* When, not how long ago. In the reader's own clock format, because 5pm
     and 17:00 are the same moment to everyone except the person reading it. */
  function timeOfDay(at) {
    try {
      return new Date(at).toLocaleTimeString(undefined,
        { hour: 'numeric', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  /* ── A small companion, not a system ────────────────────
     No level bar, no health, nothing that can go down — because it has no
     daily state at all. What it reads is one number that can only ever
     grow: how many things you have finished with this app, all time. It
     grows a few times over the life of the app and then stops, on purpose.
     The point is to notice a long arc of effort without turning that into
     a new thing to track every day — today's count is never part of this,
     only the running total already sitting in S.history. */
  var PET_STAGES = [50, 100, 250]; // lifetime finishes needed for stage 1, 2, 3
  function petStage() {
    var n = S.history.length, s = 0;
    for (var i = 0; i < PET_STAGES.length; i++) if (n >= PET_STAGES[i]) s = i + 1;
    return s;
  }
  /* A line in its own voice at each stage — the same "narrative, not a
     number" idea as the stage system itself. It says nothing the profile
     stats don't already say more precisely; the point is how it says it. */
  var PET_LINES = [
    'New around here. Let’s see where this goes.',
    'Fifty things, done. Starting to notice a pattern.',
    'A hundred now. This is a habit, not a streak.',
    'Two-fifty and counting. Still here because you are.'
  ];
  function petLine(stage) { return PET_LINES[stage] || PET_LINES[PET_LINES.length - 1]; }
  /* The companion is a rendered character now rather than a drawn shape.
     One file per body per pose, and the lifetime stage is carried by how
     tall it is drawn (see --char-h in the stylesheet) instead of by
     redrawing it — which is what lets four stages exist without four
     separate pictures of each pose.

     Every picture the app has lives in this table and nowhere else. A pose
     with no art yet is null, and charSrc falls back to that body's idle
     rather than ever asking for a file that is not there. That fallback is
     the whole reason the pose system can ship ahead of the pictures: the
     matching, the timer and the focus view all work today against one
     drawing each, and every file that lands afterwards turns a fallback
     into the real thing without a line changing here or anywhere else.

     A body is only offered in the picker if its idle exists. */
  var CHAR_ART = {
    m: {
      idle:  './art/char-m-idle.webp',
      cook:  './art/char-m-cook.webp',
      move:  './art/char-m-move.webp',
      eat:   './art/char-m-eat.webp',
      study: './art/char-m-study.webp',
      work:  './art/char-m-work.webp',
      cheer: './art/char-m-cheer.webp',
      wash:  null
    },
    f: {
      idle:  './art/char-f-idle.webp',
      cook:  './art/char-f-cook.webp',
      move:  './art/char-f-move.webp',
      eat:   './art/char-f-eat.webp',
      study: './art/char-f-study.webp',
      work:  './art/char-f-work.webp',
      cheer: './art/char-f-cheer.webp',
      wash:  null
    }
  };
  function charSex() { return (CHAR_ART[S.petSex] || {}).idle ? S.petSex : 'm'; }
  function charSrc(pose) {
    var set = CHAR_ART[charSex()];
    return set[pose] || set.idle;
  }
  /* The same character, small, standing in a tab heading. Not a control and
     not a status — just them being somewhere other than Today, so the rest of
     the app reads as the same place rather than three screens that happen to
     share a tab bar. */
  function charBadge(pose, big) {
    return '<span class="tabchar' + (big ? ' tabchar-big' : '') + '" aria-hidden="true">' +
      charTag(pose) + '</span>';
  }
  function charTag(pose, cls) {
    return '<img class="char' + (cls ? ' ' + cls : '') + '" src="' +
      charSrc(pose || 'idle') + '" alt="" draggable="false">';
  }

  /* ── Changing from one drawing to another ──────────────
     Swapping the src on a single tag is a cut: one frame he is standing,
     the next his arms are up, with nothing in between. There is no in-between
     to draw — these are six finished pictures, not a rig — so the transition
     has to be made rather than animated, and the honest way to make one is to
     dissolve.

     Both drawings are on the screen for a fifth of a second: the old one
     fading where it stands, the new one arriving a little low and light and
     settling onto its feet. That settle is what stops it reading as a
     cross-dissolve in a slideshow — something lands, and the ground it lands
     on is the same in both pictures because every pose was cut onto one
     shared canvas.

     The outgoing copy has its animation killed outright. It is a clone, so it
     inherits whatever motion rule was running, and a picture that keeps
     jogging while it disappears is a ghost rather than a goodbye. */
  var POSE_FADE = 300;
  function swapChar(host, pose, cls) {
    if (!host) return null;
    var old = host.querySelector('.char');
    var next = el(charTag(pose, cls));
    if (!old || reduce) {
      if (old) old.parentNode.removeChild(old);
      host.appendChild(next);
      return next;
    }
    // Falling back to the same file is not a pose change, and dissolving a
    // picture into itself only makes it flicker.
    if (old.getAttribute('src') === next.getAttribute('src')) return old;
    old.classList.add('char-ghost');
    next.classList.add('pose-in');
    /* Straight after the one it replaces rather than at the end, so it keeps
       the old one's place in the stack. Appended, it would land on top of the
       effects layer and the finishing sparks would go off behind him. */
    host.insertBefore(next, old.nextSibling);
    void next.offsetWidth;            // so removing the class is a transition
    next.classList.remove('pose-in');
    setTimeout(function () {
      if (old.parentNode) old.parentNode.removeChild(old);
    }, POSE_FADE + 40);
    return next;
  }

  /* ── What the character is doing ───────────────────────
     A task is a line of free text somebody typed in a hurry, so the pose
     has to be read out of it. First list to match wins, which is the whole
     reason the order is what it is: cooking sits above eating because
     "cook dinner" is cooking, and above washing because "wash up" is the
     kitchen sink, not your face. Desk work sits last because its list is
     the broadest and would otherwise swallow things the others describe
     better.

     A key ending in * matches any word starting with it, so run/runs/
     running need one entry between them. Everything else has to match a
     whole word: prefix-matching something as short as "tea" quietly turns
     every team meeting into a coffee break.

     Nothing matching is the common case, not a failure — most tasks are not
     one of five activities, and this returns '' for those. They stand there
     working, in the idle drawing, with the calm default motion. They do not
     get the finishing pose: that one is arms-up, and holding arms-up for
     twenty-five minutes of paying bills would be a lie. It plays for a
     second and a half when something is actually ticked off, which is the
     moment it is about. */
  var POSE_WORDS = [
    ['cook',  ['cook*','bak*','recipe*','kitchen','dish*','chop*','roast*','fry','frying',
               'oven','grill*','simmer*','marinat*','dinnertime']],
    ['move',  ['gym','workout*','exercis*','run','runs','running','jog*','walk*','hike',
               'hikes','hiking','stretch*','yoga','lift*','weights','cardio','swim*','bike',
               'bikes','biking','cycl*','train','training','sport*','pushup*','squat*',
               'pilates','treadmill','football','basketball','tennis','boxing','danc*','steps']],
    ['eat',   ['eat*','ate','breakfast','lunch*','dinner','supper','brunch','snack*','food',
               'meal*','drink*','hydrat*','coffee','tea','juice','smoothie','protein',
               'vitamin*','supplement*','meds','medication*','pill*']],
    ['wash',  ['shower*','bath','bathe','wash*','brush*','teeth','tooth','floss*','skincare',
               'skin','face','shav*','hair','nails','groom*','hygiene','moisturis*',
               'moisturiz*','sunscreen','deodorant','makeup','shampoo*']],
    ['study', ['stud*','read*','homework','essay*','assignment*','revis*','exam*','note',
               'notes','lecture*','class','classes','course*','book','books','chapter*',
               'learn*','journal*','practic*','research*','flashcard*','thesis']],
    /* Two desk poses came back from the same sheet — one sitting with a book,
       one standing with a laptop — so reading and screen work stopped having
       to share a drawing. Studying is the seated one; everything that is
       really admin is the laptop. */
    ['work',  ['work*','writ*','email*','inbox','report*','draft*','cod*','admin',
               'paperwork','invoic*','budget*','pay','bill*','form','forms','tax','taxes',
               'apply','applic*','plan','plans','planning','review*','spreadsheet*',
               'slides','deck','cv','resume','meeting*','project*','expenses','sort*',
               'file','filing','submit','renew*','book*ing','print*']]
  ];
  /* The handful of two-word phrases the lists above would read the wrong way
     round on their own. "Wash up" is the sink, not your face, and no amount
     of reordering the lists fixes that without breaking the other one. */
  var POSE_PHRASES = [
    ['cook', ['wash up', 'washing up', 'meal prep']],
    ['move', ['work out', 'press up', 'sit up', 'push up']]
  ];
  function taskPose(title) {
    var words = String(title || '').toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
    var flat = words.join(' ');
    for (var p = 0; p < POSE_PHRASES.length; p++) {
      for (var q = 0; q < POSE_PHRASES[p][1].length; q++) {
        if (flat.indexOf(POSE_PHRASES[p][1][q]) > -1) return POSE_PHRASES[p][0];
      }
    }
    for (var i = 0; i < POSE_WORDS.length; i++) {
      var keys = POSE_WORDS[i][1];
      for (var w = 0; w < words.length; w++) {
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          if (key.slice(-1) === '*'
              ? words[w].indexOf(key.slice(0, -1)) === 0
              : words[w] === key) return POSE_WORDS[i][0];
        }
      }
    }
    return '';
  }
  /* The one moment it is allowed to make a small fuss — right after you
     finish something. Most finishes just get a small bump; crossing an
     evolution threshold gets a bigger moment (the toast announcing it is
     the caller's job — see finish() — since a second toast() call here
     would just delete the one already on screen). Either way there is no
     opposite version of this function — nothing here ever plays a losing
     animation, because there is no losing count to read. */
  /* How long the finishing pose holds before the character goes back to
     standing. Long enough to register, over before the toast is. The window
     is a timestamp rather than a class on the element because Today gets
     rebuilt from scratch a fifth of a second into it — renderToday reads
     the same window, so the pose survives the repaint instead of being
     wiped by it. */
  var CHEER_MS = 1500;
  var cheerUntil = 0, cheerT = null;
  function cheering() { return Date.now() < cheerUntil; }
  function bumpPet(evolved) {
    var p = document.getElementById('pet');
    if (!p) return;
    p.dataset.stage = petStage();
    if (!reduce) {
      cheerUntil = Date.now() + CHEER_MS;
      if (cheerT) clearTimeout(cheerT);
      cheerT = setTimeout(function () {
        cheerUntil = 0; cheerT = null;
        swapChar(document.getElementById('pet'), 'idle');   // may be long gone; fine
      }, CHEER_MS);
    }
    swapChar(p, cheering() ? 'cheer' : 'idle');
    if (reduce) return;
    p.classList.remove('bump', 'evolve'); void p.offsetWidth;
    p.classList.add(evolved ? 'evolve' : 'bump');
  }

  /* The floating add button lives once in index.html rather than being
     rebuilt with every render — it only needs showing, hiding, and one
     click handler for the whole life of the app. Visible only where it
     earns its keep: Today, with something open already on it. The two
     empty states already carry their own centred button and a second one
     floating over a mostly empty screen would be clutter, not help. */
  function updateFab() {
    var fab = document.getElementById('fab');
    if (!fab) return;
    fab.classList.toggle('hidden', !(tab === 'today' && S.day && openIds().length > 0));
  }

  function rowHtml(t, done) {
    var tp = topic(t.top), r = repLabel(t.rep);
    var timed = !done && !!S.focus && S.focus.id === t.id;
    var inner = '<span class="row-title">' + esc(t.t) + '</span>' +
      '<span class="row-sub"><b>' + esc(tp.n) + '</b>' + (r ? ' · ' + esc(r) : '') +
      '</span>';
    return '<li class="row' + (done ? ' done' : '') + (timed ? ' timing' : '') +
      '" data-id="' + t.id + '" style="--topic:' + topColor(t.top) + '">' +
      '<button class="cbx' + (done ? ' on' : '') + '" type="button" aria-label="' +
        (done ? 'Put back ' : 'Finish ') + esc(t.t) + '">' +
        '<svg viewBox="0 0 24 24"><path pathLength="1" d="M5 12.5l4.6 4.6L19 7"/></svg></button>' +
      /* An open task's body is a real button: tapping the words is how you
         get the focus view and a timer. A finished one is not — there is
         nothing left to sit down and do. */
      (done
        ? '<span class="row-body">' + inner + '</span>'
        : '<button class="row-body" type="button" data-act="focus" aria-label="Focus on ' +
          esc(t.t) + '">' + inner + '</button>') +
      (timed ? '<span class="row-clock" data-clock aria-hidden="true">' +
        focusLabel() + '</span>' : '') +
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
    pruneFocus();
    /* Replacing main's contents collapses its scroll height for an instant,
       and the browser pins scrollTop to 0 on the way through. Every add,
       every removal, every tick was quietly scrolling you back to the top of
       a long list. Put it back where it was. */
    var keepY = main.scrollTop;
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
        '<div class="petrow"><button type="button" class="pet" id="pet" data-stage="' +
          petStage() + '" aria-label="Customize ' +
          (S.petName ? esc(S.petName) : 'your companion') + '">' +
          charTag(cheering() ? 'cheer' : 'idle') + '</button>' +
        '<p class="greeting">' + esc(greeting()) + '</p></div>') +
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
            '<p class="small">Pick a few things from your list.</p>' +
            '<button class="btn quiet" id="add" type="button" style="margin-top:8px;max-width:250px">' +
              'Choose today\u2019s tasks</button></div>') +
        doneBlock;
      body.querySelectorAll('#openList .row').forEach(function (row) {
        var id = Number(row.dataset.id);
        row.querySelector('.cbx').addEventListener('click', function (e) {
          finish(row, id, e.currentTarget); });
        row.querySelector('[data-act="off"]').addEventListener('click', function () {
          offToday(id); });
        row.querySelector('[data-act="focus"]').addEventListener('click', function () {
          openFocus(id); });
      });
    }

    body.querySelectorAll('#doneList .row').forEach(function (row) {
      row.querySelector('.cbx').addEventListener('click', function () {
        undoTask(Number(row.dataset.id)); tick(8, 'undo'); });
    });
    var addBtn = body.querySelector('#add');
    if (addBtn) addBtn.addEventListener('click', openPicker);
    var petBtn = document.getElementById('pet');
    if (petBtn) petBtn.addEventListener('click', openPet);
    if (keepY) main.scrollTop = keepY;
    updateFab();
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
    offDay(id, true);
    save(); tick(8, 'del'); render();
    toast('Took “' + t.t + '” off today', function () {
      offDay(id, false);
      if (S.day.tasks.indexOf(id) < 0) S.day.tasks.splice(at, 0, id);
      save(); play('undo'); render();
    });
  }

  /* The state half of finishing something, with no DOM in it, so the row's
     checkbox and the focus view's Done button can share one definition of
     what finished means rather than drifting apart. Returns whether the
     companion crossed a stage, which is the only thing either caller wants
     back from it. */
  function commitFinish(id) {
    var t = lib(id);
    if (!t || S.day.done.indexOf(id) > -1) return false;
    var stageBefore = petStage();
    S.day.done.push(id);
    if (!repeats(t)) t.doneAt = S.day.key;
    S.history.push({ hid: 'h' + Date.now() + Math.random().toString(36).slice(2, 5),
                     taskId: id, t: t.t, top: t.top, day: S.day.key, at: Date.now() });
    // A timer on the thing you just finished has done its job.
    if (S.focus && S.focus.id === id) S.focus = null;
    save();
    return petStage() > stageBefore;
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

    var evolved = commitFinish(id);
    bumpPet(evolved);

    var total = dayTotal(), left = openIds().length;
    paintRing(total);
    // The pet's growth rides along on the same toast rather than showing
    // its own — a second toast() call here would just delete this one the
    // instant it appeared, since toast() only ever keeps the latest.
    toast('Finished “' + t.t + '”' + (evolved ? ' — your companion grew!' : ''),
      function () { undoTask(id); });

    // The row slides out of the open list and comes back, checked, under Done.
    // It is never simply gone.
    // 350ms used to pass between ticking something and the list moving on.
    // Long enough to see the line drawn through it was the intent; long
    // enough to feel like waiting was the result. 230 still reads.
    setTimeout(function () {
      row.classList.add('out');
      setTimeout(function () {
        // A quick tap to another tab in this quarter-second is entirely
        // possible, and by now that tab's own render already owns `main` —
        // repainting Today here would stomp back over wherever you actually
        // are. Only touch it if you are still looking at it.
        if (tab !== 'today') return;
        if (left === 0 && total > 0) finale(); else renderToday();
      }, reduce ? 0 : 110);
    }, reduce ? 0 : 120);
  }

  function undoTask(id) {
    var back = lib(id);
    if (back) delete back.doneAt;
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
      // Same reasoning as the setTimeout in finish(): only repaint Today if
      // that is still what is on screen 820ms from now.
      setTimeout(function () { if (tab === 'today') renderToday(); }, 820);
    } else if (tab === 'today') { renderToday(); }
  }

  /* ═══════════════════════════════════════════════════════
     FOCUS
     One task, one timer, one character getting on with it. The app is
     called One Thing, so there is exactly one timer in the document and
     starting a second moves it rather than stacking up a dashboard of
     half-watched clocks.

     What is stored is a start time and a length, never a number being
     counted down. Reloading, backgrounding the app, or leaving the phone
     face down for an hour all give the same answer when you come back, and
     a missed interval tick cannot make time run slow. The interval only
     ever repaints what the clock already says.
     ═══════════════════════════════════════════════════════ */
  var MINS = [5, 10, 15, 25, 45];

  function focusSecs() { return S.focus ? Math.floor((Date.now() - S.focus.at) / 1000) : 0; }
  /* null when there is no limit for anything to be left of — the "No limit"
     chip is a stopwatch, and counts up until the task is ticked. */
  function focusLeft() { return S.focus && S.focus.mins ? S.focus.mins * 60 - focusSecs() : null; }
  function clock(s) {
    s = Math.max(0, Math.round(s));
    var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) +
      ':' + String(s % 60).padStart(2, '0');
  }
  function focusLabel() {
    if (!S.focus) return '';
    var left = focusLeft();
    if (left === null) return clock(focusSecs());
    return (left < 0 ? '+' : '') + clock(Math.abs(left));
  }
  /* A timer belongs to a task that is still on today and still unfinished.
     Deleted, taken off the day, or ticked on another device and it is
     quietly dropped — a clock counting down on something that no longer
     exists is worse than no clock. */
  function pruneFocus() {
    if (!S.focus) return;
    var t = lib(S.focus.id);
    if (!(t && S.day && S.day.tasks.indexOf(t.id) > -1 && S.day.done.indexOf(t.id) < 0)) {
      S.focus = null;
      save();   // it has to actually go, or it is back on the next reload
    }
  }

  var clockT = null;
  function startClock() {
    if (clockT || document.hidden || !S.focus) return;
    clockT = setInterval(paintClocks, 1000);
  }
  function stopClock() { if (clockT) { clearInterval(clockT); clockT = null; } }
  function paintClocks() {
    var had = !!S.focus;
    pruneFocus();
    if (had && !S.focus && tab === 'today') renderToday();
    paintFocus();
    var label = focusLabel();
    document.querySelectorAll('[data-clock]').forEach(function (n) { n.textContent = label; });
    if (!S.focus) stopClock();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopClock();
    else if (S.focus) { paintClocks(); startClock(); }
  });

  function focusRing(p) {
    return '<svg class="focus-ring" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="fr-track" cx="50" cy="50" r="45.5" pathLength="1"/>' +
      '<circle class="fr-arc" cx="50" cy="50" r="45.5" pathLength="1" ' +
        'stroke-dasharray="' + p.toFixed(4) + ' 1"/></svg>';
  }

  var focusEl = null;

  function openFocus(id) {
    var t = lib(id);
    if (!t) return;
    closeFocus(true);
    var pose = taskPose(t.t);
    focusEl = el(
      '<div class="focus" role="dialog" aria-modal="true" data-pose="' + (pose || 'none') + '" ' +
        /* The body matters to the motion as well as the picture: his exercise
           drawing is a run and hers is a standing stretch, and a jogging
           bounce on a stretch looks like somebody who cannot keep still. */
        'data-body="' + charSex() + '" ' +
        'data-id="' + id + '" style="--topic:' + topColor(t.top) + '" ' +
        'aria-label="Focus on ' + esc(t.t) + '">' +
        '<div class="focus-bar"><button class="iconbtn" data-act="back" type="button" ' +
          'aria-label="Back to today"><svg viewBox="0 0 24 24" fill="none" ' +
          'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
          'stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"/></svg></button></div>' +
        '<div class="focus-mid">' +
          '<div class="focus-stage">' + focusRing(0) +
            '<span class="focus-shade"></span>' +
            charTag(pose || 'idle', 'focus-char') +
            '<span class="fx" aria-hidden="true"><i></i><i></i><i></i></span>' + '</div>' +
          '<h2 class="focus-title">' + esc(t.t) + '</h2>' +
          '<div class="focus-time" data-time></div>' +
          '<p class="focus-sub" data-sub></p>' +
          '<div class="pickrow focus-mins" data-mins>' +
            MINS.map(function (m) {
              return '<button class="pick" type="button" data-m="' + m + '" aria-pressed="' +
                (t.mins === m) + '">' + m + ' min</button>'; }).join('') +
            '<button class="pick" type="button" data-m="0" aria-pressed="' +
              (t.mins === 0) + '">No limit</button>' +
          '</div>' +
        '</div>' +
        '<div class="focus-acts">' +
          '<button class="btn primary" data-act="done" type="button">Done</button>' +
          '<button class="btn quiet" data-act="stop" type="button">Stop the timer</button>' +
        '</div>' +
      '</div>');
    document.body.appendChild(focusEl);

    focusEl.querySelector('[data-act="back"]').addEventListener('click', function () {
      closeFocus(); });
    focusEl.querySelector('[data-act="stop"]').addEventListener('click', function () {
      stopFocus(id); });
    focusEl.querySelector('[data-act="done"]').addEventListener('click', function () {
      doneFromFocus(id); });
    focusEl.querySelectorAll('[data-mins] .pick').forEach(function (b) {
      b.addEventListener('click', function () { startFocus(id, Number(b.dataset.m)); });
    });
    document.addEventListener('keydown', function k(e) {
      if (!focusEl) { document.removeEventListener('keydown', k); return; }
      if (e.key === 'Escape') { closeFocus(); document.removeEventListener('keydown', k); }
    });
    tick(8);
    paintFocus();
    startClock();
  }

  function paintFocus() {
    if (!focusEl) return;
    var id = Number(focusEl.dataset.id), t = lib(id);
    if (!t) { closeFocus(); return; }
    var run = !!S.focus && S.focus.id === id;
    var left = run ? focusLeft() : null;
    var over = left !== null && left < 0;
    focusEl.dataset.run = run ? '1' : '0';
    focusEl.dataset.over = over ? '1' : '0';

    var p = 0;
    if (run) {
      p = left === null
        /* No limit still fills, just slowly — an hour is a full ring. It is
           there to show that something is running, not to be read off. */
        ? Math.min(1, focusSecs() / 3600)
        : Math.min(1, Math.max(0, 1 - left / (S.focus.mins * 60)));
    }
    focusEl.querySelector('.fr-arc').setAttribute('stroke-dasharray', p.toFixed(4) + ' 1');
    focusEl.querySelector('[data-time]').textContent = run ? focusLabel() : '';
    focusEl.querySelector('[data-sub]').textContent = !run
      ? 'How long do you want to give it?'
      : over ? 'Past ' + S.focus.mins + ' minutes. Finish whenever you’re ready.'
      : left === null ? 'Counting up. Tick it off when it’s done.'
      : 'Stay with it.';
    focusEl.querySelector('[data-act="stop"]').hidden = !run;
    focusEl.querySelector('[data-mins]').hidden = run;

    /* Once, on the way past the number you picked. Not a interruption that
       has to be dismissed — the task is not finished, the clock just went
       by, and the state is saved so a reload does not ring it again. */
    if (run && over && !S.focus.rang) {
      S.focus.rang = true;
      save();
      tick(24, 'time');
      toast('Time’s up on “' + t.t + '”');
    }
  }

  function startFocus(id, mins) {
    var t = lib(id);
    if (!t) return;
    var moved = S.focus && S.focus.id !== id ? lib(S.focus.id) : null;
    t.mins = mins;                       // offered again next time
    S.focus = { id: id, at: Date.now(), mins: mins, rang: false };
    save();
    tick(10, 'step');
    paintFocus();
    startClock();
    if (tab === 'today') renderToday();
    if (moved) toast('Timer moved off “' + moved.t + '”');
  }

  function stopFocus(id) {
    if (S.focus && S.focus.id === id) S.focus = null;
    save();
    stopClock();
    tick(8, 'undo');
    paintFocus();
    if (tab === 'today') renderToday();
  }

  /* Finishing from in here goes through the same commitFinish as the
     checkbox on the row, then holds the finishing pose for a beat at the
     one size in the app where it is actually worth seeing before dropping
     back to the list. */
  function doneFromFocus(id) {
    var t = lib(id);
    if (!t) return;
    var evolved = commitFinish(id);
    stopClock();
    tick(12, 'done');
    focusEl.dataset.run = '0';
    focusEl.dataset.cheer = '1';
    swapChar(focusEl.querySelector('.focus-stage'), 'cheer', 'focus-char');
    focusEl.querySelector('[data-time]').textContent = '';
    focusEl.querySelector('[data-sub]').textContent = 'Done.';
    focusEl.querySelector('[data-mins]').hidden = true;
    focusEl.querySelector('[data-act="stop"]').hidden = true;
    setTimeout(function () {
      closeFocus();
      if (tab === 'today') renderToday();
      toast('Finished “' + t.t + '”' + (evolved ? ' — your companion grew!' : ''),
        function () { undoTask(id); });
    }, reduce ? 0 : 900);
  }

  function closeFocus(now) {
    if (!focusEl) return;
    var e = focusEl;
    focusEl = null;
    if (now || reduce) { e.remove(); return; }
    e.classList.add('out');
    setTimeout(function () { e.remove(); }, 200);
  }

  /* ═══════════════════════════════════════════════════════
     TASKS
     ═══════════════════════════════════════════════════════ */
  var filterTop = 'all';
  function renderTasks() {
    var keepY = main.scrollTop;
    var gone = archived();
    var items = S.library.filter(function (t) {
      if (gone[t.id]) return false;
      return filterTop === 'all' || t.top === filterTop; });
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
    var freq = frequentSuggestions();

    main.innerHTML =
      '<div class="headrow" style="padding-top:6px">' +
        '<div style="flex:1;min-width:0"><h2 style="font-size:1.5rem">Your tasks</h2>' +
        '<p class="tiny" style="margin-top:3px">Everything you might do. Nothing here is a promise.</p></div>' +
        charBadge('work') +
        '<button class="iconbtn" id="topicsBtn" type="button" aria-label="Manage topics" ' +
          'style="flex:none;margin-top:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.9" stroke-linecap="round"><circle cx="8" cy="8" r="3.4"/>' +
          '<circle cx="16.5" cy="16.5" r="3.4"/><path d="M8 14.5v5M5.5 17h5"/></svg></button>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:14px">' +
        '<input class="input" id="newTask" placeholder="Add a task…" maxlength="70" ' +
          /* Not "done" — on iOS that key tells the system itself to close the
             keyboard, underneath whatever the keydown handler below does, so
             preventDefault() on the JS event never sees it. It reads as the
             keyboard randomly vanishing after some adds and not others,
             because whether the OS honours a script's handler at all is not
             consistent. "enter" carries no such instruction; the row still
             goes in on Enter, the keyboard just has no reason to leave. */
          'autocomplete="off" enterkeyhint="enter">' +
        '<button class="btn primary" id="newGo" type="button" style="width:48px;flex:none;padding:0" ' +
          'aria-label="Add a task, choosing its topic and repeat">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
          'stroke="currentColor" stroke-width="2.4" stroke-linecap="round">' +
          '<path d="M12 5.5v13M5.5 12h13"/></svg></button></div>' +
      (freq.length ? '<span class="picklabel">You’ve added this a few times</span>' +
        '<div class="pickrow" id="freqRow">' + freq.map(function (x, i) {
          var c = topColor(x.top);
          return '<button class="pick" type="button" data-freq="' + i + '" style="--topic:' + c +
            '"><i style="background:' + c + '"></i>' + esc(x.t) + '</button>'; }).join('') +
        '</div>' : '') +
      '<hr class="rule" style="margin:18px 0 0">' +
      '<span class="picklabel">Show me</span>' +
      '<div class="pickrow scrollrow" id="filters">' +
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
      (!items.length ? '<div class="empty">' + charBadge('idle', true) +
        '<h3>Nothing here yet</h3>' +
        '<p class="small">Add a task above and it will be waiting tomorrow morning.</p></div>' : '') +
      '<p class="note" style="margin-top:18px">Press <b>enter</b> to drop something on the ' +
      'list and keep typing. Press the <b>+</b> and you get asked the rest first — what ' +
      'to file it under, and whether it repeats <b>every day</b>, on <b>certain days</b> ' +
      '(just Tuesdays, say), or <b>once a month</b>. Tap any task here to change either ' +
      'later.</p>';

    var input = document.getElementById('newTask');

    /* Two ways in, and the split is deliberate. The return key puts the row
       in and leaves the keyboard exactly where it is, because emptying your
       head into the list is the single thing this app is for and it cannot
       be a stop-start business of tapping the field again between every
       item. A sheet — any sheet — takes the keyboard down on a phone, and on
       iOS it will not come back up without another tap.

       The button is the considered one: it opens the sheet with whatever is
       in the field, and asks for the topic and the repeat before the task
       exists at all. That question used to be a wall of topic chips sitting
       above the field, directly above the identical wall that filters the
       list, and the repeat was not asked at all — you added the row, found
       it again, and opened it. */
    function quickAdd() {
      var v = input.value.trim(); if (!v) return;
      var nt = { id: nid(), t: v, top: S.topics[0].id, rep: { k: 'none' } };
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

    function addWithDetails() {
      openNewTask(input.value.trim(), function () {
        input.value = '';
        renderTasks();
        var again = document.getElementById('newTask');
        if (again) again.focus();
      });
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); quickAdd(); } });
    document.getElementById('newGo').addEventListener('click', addWithDetails);
    document.querySelectorAll('#freqRow .pick').forEach(function (b) {
      b.addEventListener('click', function () {
        var x = freq[Number(b.dataset.freq)]; if (!x) return;
        var already = S.library.some(function (t) { return t.t.trim().toLowerCase() === x.t.toLowerCase(); });
        if (!already) {
          S.library.unshift({ id: nid(), t: x.t, top: x.top, rep: { k: 'none' } });
          save(); tick(10, 'add');
        }
        renderTasks();
      });
    });
    document.getElementById('topicsBtn').addEventListener('click', openTopics);
    document.querySelectorAll('#filters .pick').forEach(function (b) {
      b.addEventListener('click', function () { filterTop = b.dataset.f; renderTasks(); }); });

    main.querySelectorAll('.row[data-id]').forEach(wireLibRow);
    if (keepY) main.scrollTop = keepY;
    updateFab();
  }

  /* ── Quick re-add, pulled not pushed ─────────────────────
     Nothing here is suggested to you unfiltered — it only ever surfaces a
     one-off you have typed out and finished more than once before, and only
     while your list doesn't already have it. It sits by the input as a
     shortcut for retyping something you clearly ask for again and again,
     not as the app telling you what to do — it says nothing unless you are
     already here adding something, and doing nothing about it costs you
     exactly nothing. */
  function frequentSuggestions() {
    var haveNow = {};
    S.library.forEach(function (t) { haveNow[t.t.trim().toLowerCase()] = 1; });
    var counts = {}, sample = {};
    S.history.forEach(function (h) {
      var key = (h.t || '').trim().toLowerCase();
      if (!key || haveNow[key]) return;
      counts[key] = (counts[key] || 0) + 1;
      sample[key] = { t: h.t, top: h.top };
    });
    return Object.keys(counts)
      .filter(function (k) { return counts[k] >= 2; })
      .sort(function (a, b) { return counts[b] - counts[a]; })
      .slice(0, 6)
      .map(function (k) { return sample[k]; });
  }

  /* Pulled out of renderTasks so a row added while you are typing can be
     wired on its own, without rebuilding the page around the field. */
  function wireLibRow(row) {
    var id = Number(row.dataset.id);
    row.querySelector('[data-act="edit"]').addEventListener('click', function () {
      openTask(id);
    });
    row.querySelector('[data-act="del"]').addEventListener('click', function () {
      var t = lib(id), ix = S.library.indexOf(t);
      S.library.splice(ix, 1);
      S.libDel.push(id);
      S.day.tasks = S.day.tasks.filter(function (x) { return x !== id; });
      offDay(id, false);
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
     HISTORY

     The record, not a peephole onto it. The profile sheet used to carry a
     capped, newest-60 slice of this — enough to feel like it existed, not
     enough to actually be it, and it lived one tap away from the settings
     you came there to change. A real tab, and everything you have ever
     finished, grouped by the day it happened. Days come in a page at a
     time rather than all at once, since a year of use here can be
     thousands of rows and a browser rendering all of them at once is
     exactly the kind of lag the rest of this app has spent effort
     avoiding. ═══════════════════════════════════════════════════════ */
  /* A list of days, not a wall of everything at once. Every day is a
     button showing only a count and a hint of what colours were on it;
     nothing is expanded until you choose to look at it, so scrolling this
     tab is never itself a review of everything you didn't do. The point is
     a place to check in on a day, not a table that keeps score. */
  var histShown = 20;   // day-buttons revealed so far
  function renderHistory() {
    var keepY = main.scrollTop;
    var byDay = {};
    S.history.forEach(function (h) { (byDay[h.day] = byDay[h.day] || []).push(h); });
    var days = Object.keys(byDay).sort().reverse();

    if (!days.length) {
      main.innerHTML =
        '<div class="headrow" style="padding-top:6px">' +
          '<div style="flex:1;min-width:0"><h2 style="font-size:1.5rem">History</h2>' +
          '<p class="tiny" style="margin-top:3px">Everything you finish ends up here. ' +
          'Pick a day to see what was on it.</p></div>' + charBadge('cheer') + '</div>' +
        '<div class="empty" style="padding-top:22px">' + charBadge('study', true) +
        '<h3>Nothing finished yet</h3>' +
        '<p class="small">Tick something off on Today and it will show up here.</p></div>';
      updateFab();
      return;
    }

    var shown = days.slice(0, histShown), rest = days.length - shown.length;
    var body = shown.map(function (d) {
      var items = byDay[d];
      var dots = items.slice(0, 6).map(function (h) {
        return '<span class="dot" style="--topic:' + topColor(h.top) + '"></span>';
      }).join('');
      return '<button class="dayrow" type="button" data-day="' + d + '">' +
        '<span class="daylabel">' + esc(dayLabel(d)) + '</span>' +
        '<span class="daydots">' + dots + '</span>' +
        '<span class="tiny">' + items.length + (items.length === 1 ? ' thing' : ' things') + '</span>' +
        '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>';
    }).join('');

    main.innerHTML =
      '<div class="headrow" style="padding-top:6px">' +
        '<div style="flex:1;min-width:0"><h2 style="font-size:1.5rem">History</h2>' +
        '<p class="tiny" style="margin-top:3px">' + S.history.length + ' finished in all, over ' +
        days.length + (days.length === 1 ? ' day' : ' days') + '.</p></div>' +
        charBadge('cheer') + '</div>' +
      '<div class="daylist">' + body + '</div>' +
      (rest > 0 ? '<button class="btn quiet" id="histMore" type="button" style="margin-top:8px">' +
        'Show ' + Math.min(rest, 20) + ' earlier day' + (Math.min(rest, 20) === 1 ? '' : 's') +
        '</button>' : '');

    main.querySelectorAll('.dayrow').forEach(function (b) {
      b.addEventListener('click', function () { openDay(b.dataset.day, byDay[b.dataset.day]); });
    });
    var more = document.getElementById('histMore');
    if (more) more.addEventListener('click', function () { histShown += 20; renderHistory(); });

    if (keepY) main.scrollTop = keepY;
    updateFab();
  }

  /* What a single day looked like, opened on demand. Lighter than a task
     row on purpose: these are not things left to act on, and drawing them
     like the ones you can would make the list read as work still to do. */
  function openDay(day, items) {
    var isToday = day === todayKey();
    var sorted = items.slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    var rows = sorted.map(function (h) {
      return '<div class="archrow' + (isToday ? ' undoable' : '') + '" ' +
        'style="--topic:' + topColor(h.top) + '">' +
        '<span class="dot"></span>' +
        '<span class="archbody"><span class="archname">' + esc(h.t) + '</span>' +
          '<span class="archtop">' + esc(topic(h.top).n) +
          (h.at ? ' · ' + timeOfDay(h.at) : '') + '</span></span>' +
        /* Only today's can go back, because putting one back means putting it
           on today — and a thing finished last Tuesday has no business
           landing on this morning's list without being asked for. */
        (isToday ? '<button class="undo" data-undo="' + h.taskId + '" type="button">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M20 12a8 8 0 10-2.5 5.8"/><path d="M20 6.5V12h-5.5"/></svg>' +
          'Put back</button>' : '') +
        '</div>';
    }).join('');
    sheet(dayLabel(day),
      '<p class="tiny" style="margin:-2px 0 12px">' + items.length +
        (items.length === 1 ? ' thing' : ' things') + ' finished' +
        (isToday ? ' — tap Put back on anything you ticked by mistake.' : '.') + '</p>' +
      '<div class="archive">' + rows + '</div>', function (sh, close) {
      sh.querySelectorAll('[data-undo]').forEach(function (b) {
        b.addEventListener('click', function () {
          undoTask(Number(b.dataset.undo));
          tick(8, 'undo');
          close();
          renderHistory();
          setTimeout(function () { toast('Put back on today'); }, 260);
        });
      });
    });
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
  /* ── Topic and repeat, in one place ───────────────────
     These two fields have two homes now: the sheet that makes a task and the
     sheet that edits one. They were written twice for about an hour, which is
     exactly as long as it took for the two copies to disagree about whether a
     topic chip wears its own colour. */
  function draftFields(draft) {
    return '<div class="field"><label>Topic</label><div class="pickrow" id="eTop">' +
        S.topics.map(function (tp) {
          return '<button class="pick" type="button" data-t="' + tp.id + '" aria-pressed="' +
            (tp.id === draft.top) + '" style="--topic:' + topColor(tp.id) +
            '"><i style="background:' + topColor(tp.id) + '"></i>' +
            esc(tp.n) + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label>Repeats</label><div class="pickrow" id="eKind">' +
        [['none','Never'],['daily','Every day'],['week','Certain days'],['month','Once a month']]
          .map(function (k) {
            return '<button class="pick" type="button" data-k="' + k[0] + '" aria-pressed="' +
              (draft.rep.k === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div></div>' +
      '<div id="eDetail"></div>' +
      '<p class="tiny" id="eSummary"></p>';
  }

  function wireDraftFields(sh, draft) {
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
  }

  /* ── Making one ────────────────────────────────────────
     Everything a task can be, asked once, before it exists. The tab used to
     carry a wall of topic chips above the field for this, sitting directly
     above the identical wall of chips that filters the list — the same eight
     words twice, doing two unrelated jobs. And the repeat was not there at
     all: you added the row, then found it in the list, then opened it to say
     it happens on Tuesdays.

     So the field and its button stay where they were, and the button opens
     this. Whatever was typed comes with it. */
  function openNewTask(prefill, afterAdd) {
    var draft = { top: S.topics[0].id, rep: { k: 'none' } };
    sheet('Add a task',
      '<div class="field"><label>Task</label>' +
        '<input class="input" id="nName" maxlength="70" placeholder="What is it?" ' +
          'autocomplete="off" enterkeyhint="done" value="' + esc(prefill || '') + '"></div>' +
      draftFields(draft) +
      '<div class="sheet-foot">' +
        '<button class="btn primary" id="nSave" type="button">Add to your list</button>' +
      '</div>',
      function (sh, close) {
        wireDraftFields(sh, draft);
        var name = sh.querySelector('#nName');
        // Straight into the field if nothing was typed yet; if something was,
        // leave the caret at the end of it rather than selecting it all.
        setTimeout(function () {
          name.focus();
          var v = name.value; name.value = ''; name.value = v;
        }, 90);

        function commit() {
          var v = name.value.trim();
          if (!v) { name.focus(); return; }
          var rep = draft.rep;
          if (rep.k === 'week' && !(rep.d || []).length) rep = { k: 'none' };
          var nt = { id: nid(), t: v, top: draft.top, rep: rep };
          S.library.unshift(nt);
          // Due today means today, not tomorrow — otherwise a task set to
          // every day is missing from the only day you can see.
          if (S.day && dueOn(nt, S.day.key)) onDay(nt.id);
          save(); tick(12, 'add');
          close();
          setTimeout(function () {
            if (afterAdd) afterAdd(nt); else render();
          }, 60);
        }
        sh.querySelector('#nSave').addEventListener('click', commit);
        name.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); commit(); } });
      });
  }

  function openTask(id) {
    var t = lib(id);
    if (!t) return;
    var draft = { t: t.t, top: t.top, rep: JSON.parse(JSON.stringify(t.rep || { k: 'none' })) };

    sheet('Edit task',
      '<div class="field"><label>Task</label>' +
        '<input class="input" id="eName" maxlength="70" value="' + esc(t.t) + '"></div>' +
      draftFields(draft) +
      '<div class="sheet-foot">' +
        '<button class="btn primary" id="eSave" type="button">Save</button>' +
        /* Pausing is the answer to "I am not doing this for a while but I am
           not giving up on it either" — the case where the only other options
           were deleting something you want back later, or watching it arrive
           every morning and ignoring it, which is how a list stops being
           trusted. */
        '<button class="btn quiet" id="ePause" type="button">' +
          (t.paused ? 'Unpause this task' : 'Pause this task') + '</button>' +
        '<button class="link" id="eDel" type="button">Delete this task</button>' +
      '</div>',

      function (sh, close) {
        wireDraftFields(sh, draft);

        sh.querySelector('#eSave').addEventListener('click', function () {
          var name = sh.querySelector('#eName').value.trim();
          if (name) t.t = name;
          t.top = draft.top;
          t.rep = draft.rep;
          if (t.rep.k === 'week' && !(t.rep.d || []).length) t.rep = { k: 'none' };
          // If it now falls on today, put it straight in the day — unless you
          // took it off today on purpose, which editing it does not undo.
          var p = (S.day.pick || {})[t.id];
          if (dueOn(t, S.day.key) && !(p && p[1] === 0)) onDay(t.id);
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
            offDay(t.id, true);
          } else if (dueOn(t, S.day.key)) {
            onDay(t.id);
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
    var goneIds = archived();
    var avail = S.library.filter(function (t) {
      return !t.paused && !goneIds[t.id] && S.day.tasks.indexOf(t.id) < 0; });
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
      '<div class="sheet-foot">' +
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
          Object.keys(chosen).forEach(function (k) { if (chosen[k]) onDay(Number(k)); });
          S.day.planned = true; save(); close(); tick(12);
          setTimeout(function () { if (tab === 'today') renderToday(); }, 60);
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
  /* These were six two-stop gradients off the shelf — the kind any app
     ships, and the giveaway was that none of them used a colour this app
     actually owns. A wallpaper that belongs here is built from the same
     six hues as everything else on top of it, and has something in it:
     light with a direction, a horizon, a place the colour comes from.
     Hence layers rather than a ramp, each one anchored somewhere off the
     edge of the screen so the source of the light is implied rather than
     drawn. The hex is written out rather than pulled from the custom
     properties on purpose — a wallpaper is a fixed picture, and the veil
     over it is what answers the theme. */
  var WALLS = [
    { id: 'sunrise', n: 'Sunrise', g:
      'radial-gradient(130% 80% at 14% 106%,#ffb300 0%,rgba(255,179,0,0) 56%),' +
      'radial-gradient(110% 70% at 86% 100%,#ff6b2c 0%,rgba(255,107,44,0) 60%),' +
      'linear-gradient(168deg,#ffd98a 0%,#ffab5e 52%,#ef6d3a 100%)' },
    { id: 'tide', n: 'Tide', g:
      'radial-gradient(130% 64% at 50% 116%,#0067b8 0%,rgba(0,103,184,0) 66%),' +
      'radial-gradient(96% 56% at 18% -8%,#b8ecff 0%,rgba(184,236,255,0) 58%),' +
      'linear-gradient(176deg,#8fdcff 0%,#2ab4f5 46%,#0a72c4 100%)' },
    { id: 'orchard', n: 'Orchard', g:
      'radial-gradient(120% 74% at 84% 108%,#2f7a16 0%,rgba(47,122,22,0) 62%),' +
      'radial-gradient(92% 58% at 10% 0%,#e4ffb8 0%,rgba(228,255,184,0) 58%),' +
      'linear-gradient(172deg,#c2ea8e 0%,#74c73f 50%,#3c8c1c 100%)' },
    { id: 'petal', n: 'Petal', g:
      'radial-gradient(80% 54% at 16% 16%,#ffd9f2 0%,rgba(255,217,242,0) 58%),' +
      'radial-gradient(96% 64% at 92% 74%,#a23fe0 0%,rgba(162,63,224,0) 60%),' +
      'radial-gradient(88% 58% at 4% 106%,#ff5f9e 0%,rgba(255,95,158,0) 58%),' +
      'linear-gradient(160deg,#f0c2ff 0%,#b86ae0 100%)' },
    { id: 'ember', n: 'Ember', g:
      'radial-gradient(124% 74% at 50% 112%,#ff4a3d 0%,rgba(255,74,61,0) 58%),' +
      'radial-gradient(88% 56% at 88% 4%,#c98bff 0%,rgba(201,139,255,0) 58%),' +
      'linear-gradient(168deg,#ffc7b4 0%,#ef5b4c 50%,#96253a 100%)' },
    { id: 'slate', n: 'Slate', g:
      'radial-gradient(104% 58% at 22% -8%,#eaf4f8 0%,rgba(234,244,248,0) 58%),' +
      'radial-gradient(104% 64% at 88% 112%,#0a8fd4 0%,rgba(10,143,212,0) 62%),' +
      'linear-gradient(174deg,#cfe0e8 0%,#7b98a8 52%,#3b5766 100%)' }
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

  /* ── Companion sheet ──────────────────────────────────────
     A name and a colour are cheap to build and do more for "this is mine"
     than another drawn-on accessory would. Nothing here touches the stage
     system above — that stays the one thing that only ever moves forward. */
  function openPet() {
    function body() {
      var stage = petStage(), n = S.history.length, next = PET_STAGES[stage];
      return '<div style="display:grid;place-items:center;gap:10px;padding:4px 0 6px">' +
          '<span class="pet pet-big" id="petBig">' + charTag() + '</span>' +
          '<p class="small" style="text-align:center;max-width:270px">' +
            esc(petLine(stage)) + '</p>' +
        '</div>' +
        '<p class="tiny" style="text-align:center">' + (next
          ? (next - n) + ' more finished tasks, all time, to the next stage'
          : 'As far as the stages go — it keeps you company either way') + '</p>' +
        '<hr class="rule" style="margin:16px 0">' +
        '<div class="field"><label>Name</label>' +
          '<input class="input" id="petNameIn" maxlength="24" placeholder="Give them a name" ' +
            'value="' + esc(S.petName || '') + '"></div>' +
        '<div class="field"><label>Body</label>' +
          '<div class="pickrow" id="petSexRow">' +
            [['m', 'Boy'], ['f', 'Girl']].map(function (o) {
              var has = !!(CHAR_ART[o[0]] || {}).idle;
              return '<button class="pick" type="button" data-sex="' + o[0] + '"' +
                (has ? '' : ' disabled') + ' aria-pressed="' + (charSex() === o[0]) +
                '">' + o[1] + (has ? '' : ' · soon') + '</button>'; }).join('') +
          '</div></div>' +
        /* There was a row of colours here that tinted the light around them.
           It was the only thing this screen could change, which is exactly
           why it went: offering one knob because it is the one you can build
           is how a customization screen ends up being about nothing. Clothes
           are painted into the artwork, so real choices start with more
           artwork, and this screen stays two honest fields until then. */
        '<p class="tiny" style="margin-top:2px">Their clothes come with the ' +
        'artwork — outfits to pick from are still to come.</p>';
    }

    sheet(S.petName ? esc(S.petName) : 'Your companion', body(), function (sh) {
      var petBtn = document.getElementById('pet');
      sh.querySelector('#petNameIn').addEventListener('input', function (e) {
        S.petName = e.target.value.slice(0, 24); save();
        var h2 = sh.querySelector('.sheet-head h2');
        if (h2) h2.textContent = S.petName || 'Your companion';
        if (petBtn) petBtn.setAttribute('aria-label', 'Customize ' + (S.petName || 'your companion'));
      });
      sh.querySelectorAll('[data-sex]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!(CHAR_ART[b.dataset.sex] || {}).idle) return;   // art not in yet
          S.petSex = b.dataset.sex; save();
          sh.querySelectorAll('[data-sex]').forEach(function (x) {
            x.setAttribute('aria-pressed', String(x.dataset.sex === charSex())); });
          swapChar(sh.querySelector('#petBig'), 'idle');
          swapChar(petBtn, 'idle');
        });
      });
    });
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

      /* Putting something back belongs where the thing itself is: on Today
         while the day is still running, and in History once it is not. This
         screen used to carry a third copy of the same list, which was a third
         place to keep in step and the last one anybody thought to look in. */
      (S.history.length ? '<div class="groupline"><span class="label">The record</span></div>' +
        '<button class="link" id="goHistory" type="button" style="text-align:left;padding:2px">' +
          'Open History — every day you have had, and anything you need to put back' +
        '</button>' : '') +

      '<div id="wallCard">' + wallHtml() + '</div>' +

      accountHtml() +

      '<div class="groupline"><span class="label">Settings</span></div>' +
      '<div class="field"><label>Your day starts at</label>' +
        '<div class="pickrow" id="hours">' + [2,3,4,5,6,7].map(function (h) {
          return '<button class="pick" type="button" data-h="' + h + '" aria-pressed="' +
            (h === S.dayStart) + '">' + h + 'am</button>'; }).join('') + '</div>' +
        '<p class="tiny" id="hourNote"></p></div>' +
      '<div class="field"><label>Text</label>' +
        '<div class="pickrow" id="fonts">' +
          '<button class="pick" type="button" data-font="" aria-pressed="' + (!S.font) +
            '" style="font-family:\'Nunito\',sans-serif">Nunito</button>' +
          '<button class="pick" type="button" data-font="dyslexic" aria-pressed="' +
            (S.font === 'dyslexic') + '" style="font-family:\'OpenDyslexic\',sans-serif">' +
            'OpenDyslexic</button>' +
          '<button class="pick" type="button" data-font="legible" aria-pressed="' +
            (S.font === 'legible') + '" style="font-family:\'Atkinson Hyperlegible\',sans-serif">' +
            'Atkinson</button>' +
        '</div>' +
        '<p class="tiny">Two options built for easier reading — Atkinson keeps ' +
        'letters like b/d/p/q apart, OpenDyslexic is the well-known dyslexia ' +
        'typeface. Try both; which one helps is personal.</p></div>' +
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

        var goHist = sh.querySelector('#goHistory');
        if (goHist) goHist.addEventListener('click', function () { close(); goTab('history'); });

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
        sh.querySelectorAll('#fonts .pick').forEach(function (b) {
          b.addEventListener('click', function () {
            S.font = b.dataset.font; save();
            if (S.font) document.documentElement.setAttribute('data-font', S.font);
            else document.documentElement.removeAttribute('data-font');
            sh.querySelectorAll('#fonts .pick').forEach(function (x) {
              x.setAttribute('aria-pressed', String(x.dataset.font === S.font)); });
          });
        });
        sh.querySelector('#themeSw').addEventListener('click', function () {
          var next = isDark() ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          S.theme = next; save(); paintThemeColor();
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
          document.documentElement.removeAttribute('data-font');
          close(); render(); topAvatar(); paintWall(); paintThemeColor();
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
            'autocomplete="off" enterkeyhint="enter">' +
          '<button class="btn primary" id="wAdd" type="button" style="width:48px;flex:none;padding:0" ' +
            'aria-label="Add"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="2.4" stroke-linecap="round">' +
            '<path d="M12 5.5v13M5.5 12h13"/></svg></button></div>' +
        '<div id="wIdeas">' + ideaHtml(kind) + '</div>' +
        '<div id="wList">' + listHtml(kind) + '</div>' +
        '<div class="sheet-foot" style="margin-top:14px">' +
          '<button class="btn primary" id="wNext" type="button">' + c.next + '</button>' +
          '<button class="link" id="wSkipStep" type="button">' + c.skip + '</button></div>';
    }

    function finish() {
      ensureDay();
      // The dailies belong on today by definition; a few of the one-offs go on
      // too, so the first screen after this is never an empty one.
      added.daily.concat(added.once.slice(0, 3)).forEach(function (id) {
        if (lib(id)) onDay(id);
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
    var goneIds = archived();
    var avail = S.library.filter(function (t) {
      return !t.paused && !goneIds[t.id] && S.day.tasks.indexOf(t.id) < 0; });

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
      '<div class="sheet-foot">' +
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
            if (chosen[x]) onDay(Number(x)); });
          S.day.planned = true; save(); close();
          setTimeout(function () { if (tab === 'today') renderToday(); }, 60);
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
    /* If a field is on the page and focused, carry its contents and caret
       across the rebuild. This cannot bring an iOS keyboard back on its own
       — only a gesture does that — which is why the sync path waits instead;
       but for every other repaint it means a half-typed word survives. */
    var act = document.activeElement;
    var fid = act && act.id &&
      (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA') ? act.id : null;
    var fval = null, fs = null, fe = null;
    if (fid) {
      fval = act.value;
      try { fs = act.selectionStart; fe = act.selectionEnd; } catch (e) {}
    }

    if (tab === 'today') renderToday();
    else if (tab === 'history') renderHistory();
    else renderTasks();
    paintWall();

    if (fid) {
      var back = document.getElementById(fid);
      if (back && back !== act) {
        if (fval !== null && back.value !== undefined) back.value = fval;
        try {
          back.focus({ preventScroll: true });
          if (fs !== null && back.setSelectionRange) back.setSelectionRange(fs, fe);
        } catch (e) {}
      }
    }
    document.querySelectorAll('.tabbtn').forEach(function (b) {
      if (b.dataset.tab === tab) b.setAttribute('aria-selected', 'true');
      else b.removeAttribute('aria-selected'); });
  }

  /* A repaint that arrives from somewhere other than a tap — a sync landing,
     another device's change — must never interrupt someone mid-sentence. On
     a phone, replacing a focused field takes the keyboard down with it and
     loses whatever was half typed, and no amount of putting the focus back
     afterwards brings the keyboard up again: iOS only opens it inside a real
     gesture. So the repaint waits until the field is let go. */
  var pendingRender = false;
  function typing() {
    var el = document.activeElement;
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
  }
  function renderWhenFree() {
    if (typing()) { pendingRender = true; return; }
    pendingRender = false;
    render();
  }
  document.addEventListener('focusout', function () {
    if (!pendingRender) return;
    // A tab of focus from one field to another is not finishing.
    setTimeout(function () {
      if (pendingRender && !typing()) { pendingRender = false; render(); }
    }, 80);
  }, true);

  /* Arriving at a tab is worth a little theatre; redrawing the one you are
     already looking at is not — run the cascade every time and adding a task
     makes the whole list flicker and jump. So the class that carries the
     animation is put on for one render, and the scroll goes to the top only
     because you have genuinely gone somewhere else. */
  function goTab(next) {
    if (next === tab) return;
    tab = next;
    tick(8, 'step');
    main.classList.remove('enter');
    void main.offsetWidth;            // let the class actually leave first
    main.scrollTop = 0;
    render();
    main.classList.add('enter');
    setTimeout(function () { main.classList.remove('enter'); }, 420);
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
    b.addEventListener('click', function () { goTab(b.dataset.tab); }); });
  document.getElementById('fab').addEventListener('click', function () { tick(8, 'tap'); openPicker(); });
  document.getElementById('profileBtn').addEventListener('click', openProfile);
  document.getElementById('themeBtn').addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    S.theme = next; save(); paintThemeColor(); render();
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
        if (S.font) document.documentElement.setAttribute('data-font', S.font);
        paintThemeColor();
        ensureDay();
        topAvatar();
        renderWhenFree();
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
  // A timer that was running when the app was closed is still running — it
  // was only ever a start time and a length. Pick the second hand back up.
  startClock();
  // A first run gets the welcome; every run after that gets the morning
  // question. They never both appear, and neither ever blocks the app.
  setTimeout(S.onboarded ? morning : welcome, S.onboarded ? 400 : 320);
})();
