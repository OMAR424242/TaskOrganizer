# One Thing

A task app that asks how much you've got, lets you pick a few things, and shows
you one circle for the day. Finished tasks stay on the page. Nothing punishes you
for a bad week.

This folder is the **working prototype** — one HTML file, no build step, no
dependencies. Open it, edit it, push it, install it on your phone.

---

## Run it on your computer

**In VS Code:** open this folder (`File → Open Folder…`).

You can't just double-click `index.html` — service workers only run over `http://`
or `https://`, so the offline part won't work from a `file://` path. Use one of these:

- **VS Code Live Server extension** — install "Live Server" by Ritwick Dey, then
  right-click `index.html` → *Open with Live Server*.
- **Or a one-line server** in the VS Code terminal:
  ```bash
  python3 -m http.server 5055
  ```
  then open `http://localhost:5055`.

Everything is in `index.html` — the styles at the top, the app logic at the
bottom. Search for `═══` to jump between sections.

---

## Put it on GitHub

Create a repo at [github.com/new](https://github.com/new) named `one-thing`,
**Public** (Pages needs this on a free account), and **don't** tick "Add a README".

Then, in this folder:

```bash
git init
git add .
git commit -m "One Thing prototype"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/one-thing.git
git push -u origin main
```

If it asks for a password, GitHub won't take your account password — it wants a
token. Easiest fix: install [GitHub CLI](https://cli.github.com), run
`gh auth login`, then push again.

---

## Get it on your iPhone

**1. Turn on GitHub Pages.** In your repo: **Settings → Pages → Source:
Deploy from a branch → `main` / `(root)` → Save.**

Wait a minute, then your app is live at:

```
https://YOUR-USERNAME.github.io/one-thing/
```

**2. Open that link on your iPhone — in Safari.** It has to be Safari. Chrome on
iOS can't install a web app to the Home Screen.

**3. Share button → Add to Home Screen → Add.**

You now have an icon on your Home Screen. Tapping it opens the app full screen —
no address bar, no tabs — and it works with no signal.

### One thing worth knowing before you start using it

**Add it to the Home Screen *first*, then enter your tasks.** On iOS an installed
web app gets its own private storage, separate from Safari. Anything you type into
the app while it's still a Safari tab won't be there once you install it.

---

## Where your data lives

In `localStorage` on the device, under the key `onething.v3`. That means:

- It never leaves your phone. There's no account and no server.
- It does **not** sync between your phone and your laptop — each is its own copy.
- Clearing Safari's website data, or deleting the Home Screen app, deletes it.

Cross-device sync needs accounts and a database, which is Phase 3 of the plan in
the project docs. This prototype deliberately stops short of that.

---

## Updating it

Change `index.html`, then:

```bash
git add .
git commit -m "what I changed"
git push
```

GitHub Pages redeploys in about a minute.

**If your phone still shows the old version:** the service worker is serving its
cached copy. Open `sw.js`, bump the version:

```js
const CACHE = 'one-thing-v2';   // was v1
```

and push again. That's the switch that tells every installed copy to throw away
its cache and take the new files. Your tasks are untouched by this — `sw.js`
caches the app, never your data.

---

## What's in here

| File | What it does |
|---|---|
| `index.html` | The entire app. Styles near the top, logic at the bottom. |
| `manifest.webmanifest` | Name, icons and colours — what makes it installable. |
| `sw.js` | Service worker. Caches the app so it opens with no connection. |
| `icons/` | Home Screen and tab icons. |

---

## How the app is put together

Worth knowing before you change anything:

**The day is worked out, never stored.** "Today" is a function of the clock, your
timezone and your day-start hour (4am by default, so finishing something at 1am
counts toward the night before). There's no midnight job — which means the day
turning over can't delete anything.

**Finishing a task is append-only.** It goes into `S.history` and stays there.
Deleting the task later, changing its topic, or clearing your list leaves your
stats exactly as they were.

**Repeat rules live on the task**, as `{ k: 'daily' }`, `{ k: 'week', d: [2,5] }`
or `{ k: 'month', d: 1 }`. `ensureDay()` checks them once when the day rolls over
and puts the matching tasks into your circle. Nothing runs in the background.

**Motion is tight on purpose.** Completing a task takes about 370ms end to end,
and the ring updates on the tap rather than after the animation. The tokens are at
the top of the stylesheet: `--t1` through `--t5`. If it ever feels slow, those are
the numbers to look at first.

---

## This is the prototype, not the finished build

There's a separate React + TypeScript codebase (Phases 0 and 1 in the project
docs) with a tested domain layer, a verified Postgres schema and accessibility
checks in CI. That's the production path — cross-device sync, accounts, real
statistics.

This file is how you find out whether the thing is worth building properly. Use it
for a couple of weeks first.
