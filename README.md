# One Thing

A task app that asks how much you've got, lets you pick a few things, and shows
you one circle for the day. Finished tasks stay on the page, checked. Nothing
punishes you for a bad week.

Works with no signal. Optionally works across all your devices.

---

## If you just want the link to send people

Do these in this order. The order matters — if you publish before the backend
exists, the first people who try it will sign up against nothing.

1. **Make the Supabase project and run the schema** → *Accounts and sync*, steps 1–2
2. **Paste the two keys into `config.js`** → step 3
3. **Push to GitHub and turn on Pages** → *Put it on GitHub*
4. **Set the Site URL in Supabase to your Pages link** → step 4
5. **Turn email confirmation off while you're testing** → step 5
6. **Send the link.** Anyone who opens it taps the avatar, top right, and
   makes an account. Laptop, phone, someone else's laptop — same email and
   password, same tasks.

About 15 minutes end to end, and free at this size.

---

## What's in here

| File | What it does |
|---|---|
| `index.html` | The page. Mostly just markup — the three script tags at the bottom are the app. |
| `styles.css` | Everything visual. Colours are CSS variables at the very top. |
| `app.js` | The app itself. Tasks, the circle, repeats, stats, the sheets. |
| `sync.js` | Accounts and cross-device sync. Does nothing until you configure it. |
| `config.js` | Two blanks. Fill them in to turn sync on. |
| `sw.js` | Service worker — makes the app open offline. |
| `manifest.webmanifest` | Name, icons, colours. What makes it installable. |
| `fonts/` | Nunito, shipped with the app so it looks right offline. |
| `icons/` | Home Screen and tab icons. |
| `supabase/schema.sql` | The database. Paste it in once. |
| `build.py` | Folds everything into one file in `dist/`. Only needed for a single-file copy. |

---

## Run it on your computer

Open this folder in VS Code (`File → Open Folder…`).

You can't just double-click `index.html` — service workers only run over
`http://` or `https://`, so the offline part won't work from a `file://` path.
Use one of these:

- **Live Server extension** — install "Live Server" by Ritwick Dey, then
  right-click `index.html` → *Open with Live Server*.
- **Or one line** in the VS Code terminal:
  ```bash
  python3 -m http.server 5055
  ```
  then open `http://localhost:5055`.

---

## Put it on GitHub

Create a repo at [github.com/new](https://github.com/new) named `one-thing`,
**Public** (Pages needs this on a free account), and **don't** tick "Add a README".

This folder is already a git repo with the history in it, so you only need to
point it at yours and push:

```bash
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/one-thing.git
git push -u origin main
```

If it asks for a password, GitHub won't take your account password — it wants a
token. Easiest fix: install [GitHub CLI](https://cli.github.com), run
`gh auth login`, then push again.

**Turn on Pages:** repo **Settings → Pages → Source: Deploy from a branch →
`main` / `(root)` → Save.** A minute later it's live at:

```
https://YOUR-USERNAME.github.io/one-thing/
```

That's the link you send people.

---

## Get it on your iPhone

1. Open your Pages link on your iPhone **in Safari**. It has to be Safari —
   Chrome on iOS can't install a web app to the Home Screen.
2. **Share button → Add to Home Screen → Add.**

Tapping the icon opens it full screen — no address bar, no tabs — and it works
with no signal.

> **If you're not using accounts:** add it to the Home Screen *first*, then enter
> your tasks. On iOS an installed web app gets its own private storage, separate
> from Safari, so anything you typed in the Safari tab won't be there after you
> install it. With an account this doesn't matter — sign in and everything comes
> back.

---

## Accounts and sync — the 10-minute version

Without this, every copy of the app is its own island: your phone and your
laptop each keep their own tasks, and a friend you send the link to gets their
own blank copy on their own device. That's a perfectly good way to run a small
test. Do the steps below when you want people to have real accounts and their
tasks to follow them around.

### 1. Make a Supabase project

[supabase.com](https://supabase.com) → sign up → **New project**. Free tier is
fine. Pick a region near you. It takes a couple of minutes to build.

### 2. Create the table

In the project: **SQL Editor → New query**. Open `supabase/schema.sql` from this
repo, paste the whole thing in, press **Run**. It should say success.

That file creates one table, `app_state`, one row per person, and four
row-level-security policies that all say the same thing: you can read and write
your own row and nobody else's. It's safe to run again if you ever need to.

### 3. Put the two keys in `config.js`

**Settings → API.** Copy:

- **Project URL** → `SUPABASE_URL`
- **anon / public** key → `SUPABASE_ANON_KEY`

```js
window.OT_CONFIG = {
  SUPABASE_URL: 'https://abcdefgh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...'
};
```

The anon key is **meant** to be public — it sits in every visitor's browser and
can only do what those policies allow. The **service_role** key is the opposite:
it ignores every policy. Never put that one in this repo, or anywhere a browser
can see it.

### 4. Tell Supabase where the app lives

**Authentication → URL Configuration → Site URL**: your Pages link
(`https://YOUR-USERNAME.github.io/one-thing/`). Add it under **Redirect URLs**
too. Password-reset emails go to this address, so a wrong value here means
broken reset links.

### 5. Decide about email confirmation

**Authentication → Providers → Email.** "Confirm email" is on by default. That's
the right setting for real use, but Supabase's built-in mail server is rate
limited to a handful of messages an hour — enough for a few friends, not enough
for a launch. Two options:

- **Testing with a handful of people:** turn **Confirm email off**. They pick an
  email and a password and they're straight in. Turn it back on later.
- **Anything bigger:** leave it on and plug in a real mail provider under
  **Authentication → Emails → SMTP Settings** (Resend has a free tier and works
  well here).

### 6. Push, and try it

```bash
git add . && git commit -m "Turn on sync" && git push
```

Then bump the cache version in `sw.js` (see *Updating it* below) so installed
copies pick up the change.

Open the app → tap your avatar, top right → **Create an account**. Do the same on
a second device with the same email and password. What you do on one shows up on
the other within about a minute, and instantly whenever you bring the app back to
the front.

---

## How sync behaves

Worth knowing before you rely on it.

**Local first, always.** Every change is written to the device immediately. The
network is a background chore. Lose signal mid-task and nothing stops; the sync
catches up when you're back.

**Nothing you typed gets thrown away.** The naive version of this — newest copy
of the whole document wins — quietly loses work: finish something on your phone
while your laptop has an older copy open, and the laptop's next save erases it.
So the parts that would hurt to lose are merged as sets rather than overwritten:

- every completion you've ever logged, matched by id, minus the ones you undid
- every task in your list, minus the ones you deleted
- every topic, same
- today's finished list, when both devices agree what today is

Your name, picture, theme and day-start hour are the only things where newest
simply wins — which for those is the right answer.

**It checks when you look at it.** Bringing the app to the front syncs. So does
coming back online. Otherwise it's every 45 seconds while open. There's a **Sync
now** button in your profile if you want to force it.

**Signing out leaves everything on the device** and pushes anything outstanding
first, so signing out is never how you lose an afternoon.

**Without accounts** (`config.js` left blank) none of this code runs at all. No
network requests, no login form — the profile just tells you your data is on the
device.

---

## Where your data lives

On the device, in `localStorage` under the key `onething.v3`. With an account
configured, a copy also lives in your Supabase project, in your own row.

Clearing Safari's website data or deleting the Home Screen app wipes the local
copy. With an account, signing back in brings it all back. Without one, it's gone.

---

## Updating it

```bash
git add .
git commit -m "what I changed"
git push
```

GitHub Pages redeploys in about a minute.

**If your phone still shows the old version:** the service worker is serving its
cached copy. Open `sw.js` and bump the version:

```js
const CACHE = 'one-thing-v3';   // was v2
```

and push again. That's the switch that tells every installed copy to throw away
its cache and take the new files. Your tasks are untouched — `sw.js` caches the
app, never your data.

---

## The wallpaper

Profile (your avatar, top right) → **Today's wallpaper**. Six built-in washes,
or one of your own pictures, or none. It appears on Today only — a photo behind
a list you are editing is noise; behind the one screen you open just to look at,
it is a reason to open it.

**The veil slider** is how much of the app's own background sits over the
picture. A dark photo and a bright one need very different amounts, so it's a
slider rather than a fixed number. Whatever you set it to, the day name, the
greeting and the group labels keep their own backing, so nothing becomes
unreadable at the bold end.

Your picture is squeezed to under 95KB before it's stored — a phone photo is
several megabytes, and this document gets pushed to the server on every save.
It's going behind a veil at half opacity; sharpness was never the point. The
wallpaper syncs with everything else, so it follows you to your other devices.

---

## Changing how it looks

Open `styles.css`. The first forty lines are the whole palette:

```css
--green:#4ead2b;  --green-dk:#3d8c1e;  --green-soft:#dff2cd;
--blue:#1cb0f6;   --blue-dk:#1899d6;   --blue-soft:#ddf4ff;
```

Each colour comes in three: the fill, a darker edge (that's the solid line under
every button, which collapses when you press it), and a pale wash for
backgrounds. The dark theme is the same block again further down, on a deep
blue-slate ground rather than black — bright colours on true black vibrate, and
this is an app you're meant to open every day.

Topic colours are separate, in `app.js` at the top (`SWATCHES`), because they
have to be readable as data in both themes. Everything else is derived from them
with `color-mix()`, so changing one hex changes the row tint, the border, the
dot, the ring segment and the stats bar together.

Motion lives in `--t1` through `--t5`. Completing a task takes about 370ms end to
end, and the circle updates on the tap rather than after the animation. If it
ever feels slow, those five numbers are where to look first.

---

## How the app is put together

**The day is worked out, never stored.** "Today" is a function of the clock, your
timezone and your day-start hour (4am by default, so finishing something at 1am
counts toward the night before). There's no midnight job — which means the day
turning over can't delete anything.

**Finishing a task is append-only.** It goes into `history` and stays there.
Deleting the task later, changing its topic, or clearing your list leaves your
stats exactly as they were. Undoing a completion doesn't cut it out of the log,
it records the undo — otherwise your other device would put it straight back.

**Repeat rules live on the task**, as `{ k: 'daily' }`, `{ k: 'week', d: [2,5] }`
or `{ k: 'month', d: 1 }`. The day-roll check reads them once and puts the
matching tasks into your circle. Nothing runs in the background.

**Task ids are random, not sequential.** A counter is fine on one device and a
disaster on two — both phones hand out the same number to different tasks and a
merge welds them together.

---

## One file, if you want one

```bash
python3 build.py
```

writes `dist/one-thing.html` — the whole app, font included, in a single file
with nothing external. Useful for emailing someone a copy or dropping it
somewhere that only takes one file. The repo is the source; that file is built
from it, so edit here and rebuild rather than editing the built copy.

---

## This is the beta build, not the final architecture

There's a separate React + TypeScript codebase (Phases 0 and 1 in the project
docs) with a tested domain layer, a proper relational Postgres schema and
accessibility checks in CI. That's where this goes once the idea has earned it.

This version is how you find out whether it's worth building properly. Use it
for a few weeks with a few people first.
