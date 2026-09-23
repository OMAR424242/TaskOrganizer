/* ═══════════════════════════════════════════════════════════════
   One Thing — the parts that only exist on a phone

   This file is the whole boundary between the app and the native shell.
   Nothing above it knows whether it is running in Safari, in Chrome, on
   a home screen, or inside the real thing from the App Store — it asks
   OTNative for something and either gets it or does not.

   Every single entry point here is safe to call anywhere. On the web,
   with no Capacitor underneath, each one returns a resolved promise or
   false and does nothing at all. That is not politeness, it is the only
   way one codebase can be both: the same app.js drives the PWA people
   already use and the build that goes to the stores, and neither has a
   branch in it saying which one it is.

   Four things live here, and they are the four things Apple means when
   it asks what this app does that a website could not:

     haptics    a real tap through the phone, not a buzz
     remind     a notification at an hour you pick, scheduled on the
                device, no server, nothing sent anywhere
     lock       Face ID / Touch ID / fingerprint in front of the app
     widget     today's one thing on the home screen

   The plugins are asked for by name at call time rather than imported,
   so a build missing one degrades to the web behaviour instead of
   failing to start. A missing plugin is a feature that is quietly off,
   never a white screen.
   ═══════════════════════════════════════════════════════════════ */
window.OTNative = (function () {
  'use strict';

  var Cap = window.Capacitor;
  var native = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());
  var platform = (Cap && typeof Cap.getPlatform === 'function') ? Cap.getPlatform() : 'web';

  function plug(name) {
    if (!native || !Cap || !Cap.Plugins) return null;
    return Cap.Plugins[name] || null;
  }
  var no = function () { return Promise.resolve(null); };
  function safe(fn) {
    try {
      var out = fn();
      return (out && typeof out.then === 'function') ? out.catch(function () { return null; })
                                                     : Promise.resolve(out);
    } catch (e) { return Promise.resolve(null); }
  }

  /* ── Haptics ─────────────────────────────────────────────────
     The app already answers every press with a sound and a movement.
     On a phone it should answer with a tap you feel, which is a
     different sense doing the same job — and the one people keep on
     when they turn the sound off.

     navigator.vibrate, which app.js already calls, is a blunt motor
     buzz and iOS Safari does not implement it at all. This is the real
     taptic engine. The mapping is deliberately narrow: light for
     anything you touched, heavy for a thing that is finished, a warning
     pattern for the timer running past its limit. */
  var IMPACT = { tap: 'LIGHT', step: 'LIGHT', add: 'MEDIUM', undo: 'LIGHT',
                 del: 'MEDIUM', done: 'HEAVY' };

  function haptic(kind) {
    var H = plug('Haptics');
    if (!H) return Promise.resolve(null);
    if (kind === 'time') {
      return safe(function () { return H.notification({ type: 'WARNING' }); });
    }
    var style = IMPACT[kind] || 'LIGHT';
    return safe(function () { return H.impact({ style: style }); });
  }

  /* ── The daily nudge ─────────────────────────────────────────
     One notification, at an hour you choose, repeating. It is built on
     the device and never leaves it: no push service, no token, no
     server that knows you exist. That matters for the privacy answer on
     both store listings — "this app sends no data anywhere" stays true
     with this feature switched on.

     Fixed id 1: scheduling again replaces the one that is there rather
     than stacking up a second, third and fourth reminder over a month
     of changing your mind about the time. */
  var NUDGE_ID = 1;

  function canRemind() { return !!plug('LocalNotifications'); }

  function askRemind() {
    var N = plug('LocalNotifications');
    if (!N) return Promise.resolve(false);
    return safe(function () { return N.requestPermissions(); })
      .then(function (r) { return !!(r && r.display === 'granted'); });
  }

  function scheduleRemind(hour, minute, body) {
    var N = plug('LocalNotifications');
    if (!N) return Promise.resolve(false);
    return cancelRemind().then(function () {
      return safe(function () {
        return N.schedule({
          notifications: [{
            id: NUDGE_ID,
            title: 'One Thing',
            body: body || 'What is the one thing today?',
            schedule: {
              on: { hour: hour, minute: minute },
              allowWhileIdle: true,
              repeats: true
            },
            smallIcon: 'ic_stat_onething',
            channelId: 'onething-daily'
          }]
        });
      });
    }).then(function (r) { return r !== null; });
  }

  function cancelRemind() {
    var N = plug('LocalNotifications');
    if (!N) return Promise.resolve(null);
    return safe(function () {
      return N.cancel({ notifications: [{ id: NUDGE_ID }] });
    });
  }

  /* ── Face ID / Touch ID / fingerprint ────────────────────────
     A task list is a list of the things somebody has not done yet,
     which is a more personal document than it looks. This puts the
     phone's own lock in front of it.

     Two rules it has to obey. It never stores anything — the answer is
     yes or no from the OS and nothing is kept. And a device that cannot
     do biometrics at all reports unavailable rather than falling back to
     a passcode of our own invention, because a lock this app invented
     would be worse than the one the phone already has. */
  function lockAvailable() {
    var B = plug('NativeBiometric');
    if (!B) return Promise.resolve(false);
    return safe(function () { return B.isAvailable(); })
      .then(function (r) { return !!(r && r.isAvailable); });
  }

  function lockName() {
    var B = plug('NativeBiometric');
    if (!B) return Promise.resolve('');
    return safe(function () { return B.isAvailable(); })
      .then(function (r) {
        if (!r || !r.isAvailable) return '';
        // 1 touch, 2 face, 3 fingerprint, 4 multiple — per the plugin's
        // own enum. Anything else gets the generic word.
        return r.biometryType === 2 ? 'Face ID'
             : r.biometryType === 1 ? 'Touch ID'
             : r.biometryType === 3 ? 'your fingerprint'
             : 'your phone’s lock';
      });
  }

  function unlock(reason) {
    var B = plug('NativeBiometric');
    if (!B) return Promise.resolve(true);      // nothing to ask: let them in
    return new Promise(function (resolve) {
      try {
        B.verifyIdentity({
          reason: reason || 'Open One Thing',
          title: 'One Thing',
          subtitle: '',
          description: ''
        }).then(function () { resolve(true); })
          .catch(function () { resolve(false); });
      } catch (e) { resolve(false); }
    });
  }

  /* ── The home-screen widget ──────────────────────────────────
     A tiny custom plugin rather than a library, because all it has to
     do is hand a string to the place the widget reads from — an App
     Group on iOS, SharedPreferences on Android — and then tell the
     system to redraw. Anything bigger would be a dependency to keep in
     step for no gain.

     The payload is deliberately already-rendered text. The widget does
     no logic, holds no rules about repeats or day-start hours, and
     cannot disagree with the app about what today is, because it is
     never asked to work anything out. */
  function widget(data) {
    var W = plug('OTWidget');
    if (!W) return Promise.resolve(null);
    return safe(function () { return W.set({ data: JSON.stringify(data || {}) }); });
  }

  /* ── The shell around the page ───────────────────────────────
     The splash stays up until the app says it is ready rather than
     until the web view says it has loaded, which are not the same
     moment: the second one still shows a blank page while the first
     render happens. */
  function ready() {
    var S = plug('SplashScreen');
    if (!S) return Promise.resolve(null);
    return safe(function () { return S.hide(); });
  }

  /* Back button on Android. Without this, the hardware back button
     closes the whole app from anywhere, including from inside a sheet —
     which reads as a crash. */
  function onBack(handler) {
    var A = plug('App');
    if (!A || typeof A.addListener !== 'function') return;
    try {
      A.addListener('backButton', function (e) { handler(e && e.canGoBack); });
    } catch (e) {}
  }

  function onResume(handler) {
    var A = plug('App');
    if (!A || typeof A.addListener !== 'function') return;
    try {
      A.addListener('appStateChange', function (s) { if (s && s.isActive) handler(); });
    } catch (e) {}
  }

  return {
    get is() { return native; },
    get platform() { return platform; },
    get isIOS() { return platform === 'ios'; },
    get isAndroid() { return platform === 'android'; },

    haptic: haptic,

    canRemind: canRemind,
    askRemind: askRemind,
    scheduleRemind: scheduleRemind,
    cancelRemind: cancelRemind,

    lockAvailable: lockAvailable,
    lockName: lockName,
    unlock: unlock,

    widget: widget,
    ready: ready,
    onBack: onBack,
    onResume: onResume,

    // Only used by the tests, which need a way to stand in for a phone.
    _plug: plug
  };
})();
