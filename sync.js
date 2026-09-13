/* ═══════════════════════════════════════════════════════════════
   One Thing — accounts and sync

   Everything here is optional. With no config.js values the whole file
   does nothing but report "off", and the app is exactly the local-only
   app it was before. That is deliberate: the offline path must never
   depend on the online one.

   The shape of it:

     · The whole state is one JSON document, one row per person.
     · Saving locally is instant and unconditional. The network is a
       background chore, never something you wait for.
     · Sync is pull → merge → push, serialised so two of them can't
       overlap.

   The merge is the part worth reading. Last-write-wins on the whole
   document is easy and loses things — finish a task on your phone while
   your laptop has a stale copy open, and the laptop's next save erases
   it. So the pieces that must never be lost are merged as sets instead:

     history  union by hid, minus the union of the undo tombstones
     library  union by id,  minus the union of the delete tombstones
     topics   same
     day.done union, when both devices are on the same day

   One thing here is not a set, because it cannot be. A union can only ever
   add, so removing something from today could never survive a merge — the
   other copy still had it, and back it came. Taking a task off today, and
   putting it back, are recorded in day.pick as a stamped decision per task,
   and the later stamp wins.

   Everything else — your name, avatar, theme, day-start hour — is
   genuinely last-write-wins, because for those it's the right answer.
   ═══════════════════════════════════════════════════════════════ */
window.OTSync = (function () {
  'use strict';

  var cfg = window.OT_CONFIG || {};
  var url = (cfg.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  var key = (cfg.SUPABASE_ANON_KEY || '').trim();
  var configured = !!(url && key && url.indexOf('http') === 0);

  var sb = null;            // the supabase client, once loaded
  var user = null;
  var status = configured ? 'signedout' : 'off';
  var lastError = '';
  var host = {};            // { get, set } handed over by app.js
  var listeners = [];
  var chain = Promise.resolve();
  var pushTimer = null;
  var poll = null;

  var TABLE = 'app_state';

  function emit() { listeners.forEach(function (f) { try { f(api); } catch (e) {} }); }
  function setStatus(s, err) {
    status = s; lastError = err || '';
    emit();
  }

  /* ── The library, fetched only if it is actually going to be used ──
     An offline-first app has no business blocking its first paint on a
     CDN. Nothing here runs until the app is configured, and even then
     it runs after boot. */
  var sdk = null;
  function loadSdk() {
    if (sdk) return sdk;
    sdk = new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve(window.supabase);
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
      s.async = true;
      s.onload = function () {
        if (window.supabase && window.supabase.createClient) resolve(window.supabase);
        else reject(new Error('Sync library loaded but looked wrong.'));
      };
      s.onerror = function () { reject(new Error('Could not reach the sync service.')); };
      document.head.appendChild(s);
    });
    return sdk;
  }

  function client() {
    if (sb) return Promise.resolve(sb);
    return loadSdk().then(function (lib) {
      sb = lib.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      sb.auth.onAuthStateChange(function (_evt, session) {
        var next = session && session.user ? session.user : null;
        var changed = (next && next.id) !== (user && user.id);
        user = next;
        if (changed) {
          if (user) { setStatus('busy'); startPolling(); sync(); }
          else { setStatus('signedout'); stopPolling(); }
        }
      });
      return sb;
    });
  }

  /* ── Merge ───────────────────────────────────────────────────── */
  function uniq(a, b, keyOf) {
    var seen = {}, out = [];
    (a || []).concat(b || []).forEach(function (x) {
      if (!x) return;
      var k = keyOf(x);
      if (k === undefined || k === null || seen[k]) return;
      seen[k] = 1; out.push(x);
    });
    return out;
  }
  function idset(a, b) {
    var m = {};
    (a || []).concat(b || []).forEach(function (x) { m[x] = 1; });
    return m;
  }

  function merge(local, remote) {
    if (!remote) return local;
    if (!local) return remote;

    // The newer document wins the scalars. Everything set-like below is
    // then merged back over the top of it.
    var base = (remote.rev || 0) > (local.rev || 0) ? remote : local;
    var out = JSON.parse(JSON.stringify(base));

    var undone = idset(local.removed, remote.removed);
    var libGone = idset(local.libDel, remote.libDel);
    var topGone = idset(local.topDel, remote.topDel);

    out.removed = Object.keys(undone);
    out.libDel = Object.keys(libGone).map(Number);
    out.topDel = Object.keys(topGone);

    // Completions: a set that only ever grows, minus the undos. The one
    // thing in here that would genuinely hurt to lose.
    out.history = uniq(local.history, remote.history, function (h) { return h.hid; })
      .filter(function (h) { return !undone[h.hid]; })
      .sort(function (x, y) { return (x.at || 0) - (y.at || 0); });

    // A task added on one device and a task added on the other both survive.
    // The newer document's copy of a shared id wins, which is why base goes
    // first into uniq().
    var baseIsRemote = base === remote;
    out.library = uniq(baseIsRemote ? remote.library : local.library,
                       baseIsRemote ? local.library : remote.library,
                       function (t) { return t.id; })
      .filter(function (t) { return !libGone[t.id]; });
    out.topics = uniq(baseIsRemote ? remote.topics : local.topics,
                      baseIsRemote ? local.topics : remote.topics,
                      function (t) { return t.id; })
      .filter(function (t) { return !topGone[t.id]; });

    // Finishing a one-off stamps the task. Whichever document happened to
    // win the row, that stamp has to survive the merge, or a task you
    // finished on your phone climbs back into the list on your laptop. It
    // only ever gets set here; what takes it away is undoing the completion,
    // which removes the history entry that the stamp is checked against.
    var stamped = {};
    (local.library || []).concat(remote.library || []).forEach(function (t) {
      if (t && t.doneAt && !stamped[t.id]) stamped[t.id] = t.doneAt; });
    out.library.forEach(function (t) {
      if (!t.doneAt && stamped[t.id]) t.doneAt = stamped[t.id]; });
    if (!out.topics.length) out.topics = base.topics || local.topics || remote.topics;

    // Today. Only worth merging when both devices agree what today is —
    // otherwise the newer one simply has the right answer.
    var ld = local.day, rd = remote.day;
    if (ld && rd && ld.key === rd.key) {
      /* The day's tasks are a union, which on its own can only ever add —
         so taking something off today never survived a sync, on any number
         of devices. `pick` carries a stamped decision per task, on or off,
         and the later stamp wins. Union, then apply the decisions. */
      var pick = {};
      [ld.pick, rd.pick].forEach(function (m) {
        Object.keys(m || {}).forEach(function (id) {
          var p = m[id];
          if (!p || !p.length) return;
          if (!pick[id] || p[0] > pick[id][0]) pick[id] = p;
        });
      });
      out.day = {
        key: ld.key,
        tasks: uniq(ld.tasks, rd.tasks, function (x) { return x; })
          .filter(function (x) { return !(pick[x] && pick[x][1] === 0); }),
        done: [],
        pick: pick,
        planned: !!(ld.planned || rd.planned),
        cap: (base.day && base.day.cap) || ld.cap || rd.cap || null
      };

      /* What is finished today is not merged as a set either, and for the
         same reason: a union can only add, so unticking something could
         never win — the other copy still had it done, and the tick came
         straight back. It is not given its own tombstones though, because
         there is already something that knows exactly this: the history,
         which merges losslessly and whose undo tombstones are honoured a
         few lines above. So the day's done list is read back out of the
         merged history rather than being merged itself. One source of
         truth, and unticking works everywhere by construction. */
      var fromHistory = {};
      out.history.forEach(function (h) {
        if (h && h.day === ld.key && h.taskId !== undefined) fromHistory[h.taskId] = 1; });
      out.day.done = Object.keys(fromHistory).map(Number)
        .filter(function (x) { return out.day.tasks.indexOf(x) >= 0; });
    }

    out.rev = Math.max(local.rev || 0, remote.rev || 0);
    return out;
  }

  /* ── Transfer ────────────────────────────────────────────────── */
  function pull() {
    return client().then(function (c) {
      return c.from(TABLE).select('doc').eq('user_id', user.id).maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      return r.data ? r.data.doc : null;
    });
  }

  function push(doc) {
    return client().then(function (c) {
      return c.from(TABLE).upsert({
        user_id: user.id,
        doc: doc,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    }).then(function (r) {
      if (r.error) throw r.error;
    });
  }

  /* One at a time. Two overlapping syncs would each push a document that
     didn't see the other's merge. */
  function sync() {
    if (!user) return Promise.resolve();
    chain = chain.then(function () {
      if (!user) return;
      setStatus('busy');
      return pull().then(function (remote) {
        var local = host.get();
        var merged = merge(local, remote);
        if (remote) host.set(merged);
        return push(merged);
      }).then(function () {
        setStatus('on');
      }).catch(function (e) {
        setStatus('err', friendly(e));
      });
    });
    return chain;
  }

  function friendly(e) {
    var m = (e && (e.message || e.error_description || e.msg)) || String(e || 'Something went wrong.');
    if (/Failed to fetch|NetworkError|reach the sync/i.test(m))
      return 'No connection. Your tasks are saved here and will sync when you are back online.';
    if (/Invalid login credentials/i.test(m)) return 'That email and password do not match.';
    if (/User already registered/i.test(m)) return 'There is already an account with that email. Sign in instead.';
    if (/Password should be at least/i.test(m)) return 'Use at least 6 characters for the password.';
    if (/Email not confirmed/i.test(m)) return 'Check your email and confirm the address first.';
    if (/relation .*app_state.* does not exist/i.test(m))
      return 'The database table is missing — run supabase/schema.sql in the SQL editor.';
    return m;
  }

  function startPolling() {
    stopPolling();
    // Cheap, predictable, and it survives a sleeping phone in a way a
    // websocket does not. A single row is a very small read.
    poll = setInterval(function () { if (user && navigator.onLine) sync(); }, 45000);
  }
  function stopPolling() { if (poll) clearInterval(poll); poll = null; }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && user && navigator.onLine) sync();
  });
  window.addEventListener('online', function () { if (user) sync(); });

  /* ── What app.js talks to ────────────────────────────────────── */
  var api = {
    get configured() { return configured; },
    get status() { return status; },          // off | signedout | busy | on | err
    get error() { return lastError; },
    get email() { return user ? user.email : ''; },
    get signedIn() { return !!user; },

    init: function (h) {
      host = h;
      if (!configured) return;
      // Restore a session if there is one. Boot has already painted by now.
      client().then(function (c) { return c.auth.getSession(); })
        .then(function (r) {
          var s = r && r.data && r.data.session;
          if (s && s.user) { user = s.user; setStatus('busy'); startPolling(); sync(); }
          else setStatus('signedout');
        })
        .catch(function (e) { setStatus('err', friendly(e)); });
    },

    onChange: function (f) { listeners.push(f); },

    /* Called on every local save. Coalesced, because typing a task name
       fires one of these per keystroke. */
    touch: function () {
      if (!user) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(function () { sync(); }, 1200);
    },

    syncNow: function () { return sync(); },

    signUp: function (email, password) {
      return client()
        .then(function (c) { return c.auth.signUp({ email: email, password: password }); })
        .then(function (r) {
          if (r.error) throw r.error;
          // With email confirmation on, there is no session yet.
          return { needsConfirm: !(r.data && r.data.session) };
        });
    },

    signIn: function (email, password) {
      return client()
        .then(function (c) { return c.auth.signInWithPassword({ email: email, password: password }); })
        .then(function (r) { if (r.error) throw r.error; return {}; });
    },

    resetPassword: function (email) {
      return client()
        .then(function (c) {
          return c.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
        })
        .then(function (r) { if (r.error) throw r.error; return {}; });
    },

    signOut: function () {
      // Push whatever is outstanding before letting go of the session,
      // so signing out is never how someone loses an afternoon.
      return sync().then(function () { return client(); })
        .then(function (c) { return c.auth.signOut(); })
        .then(function () { user = null; stopPolling(); setStatus('signedout'); });
    },

    friendly: friendly,
    merge: merge   // exported for the test page
  };

  return api;
})();
