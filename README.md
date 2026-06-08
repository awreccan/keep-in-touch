# Keep In Touch 🌱

A personal **"stay in touch" tracker** — a ranked list of the people you care about, each with a
cadence ("meet every X days") and a permanent meeting log, that tells you **who's due or overdue**
before you fall out of touch.

**▶ Live app:** https://awreccan.github.io/keep-in-touch/

> One file, no build step, works offline, and your data is **yours** — it lives in your own
> Google Sheet (or a local file), never on anyone else's server. The hosted URL is code only.

---

## What it does

Add the people you want to keep up with, set how often you'd like to see each of them, and tap
**✔ Met today** whenever you do. The app continuously answers the one question that matters —
*who have I been neglecting?* — and surfaces them, gently, without guilt.

### The three views
- **Auto · due / overdue** — auto-ranks by urgency (never-met → most-overdue → soonest-due). Read-only.
- **My ranking** — drag rows into your own preference order (touch-friendly), stored separately.
- **Grid rank** — the same ranking in dense multi-column cards so a long list fits on one screen.
- **Garden 🌱** — an affective view where each person is a plant whose health reflects how overdue they are (thriving → wilting). Tap a tile to act.

### Day-to-day
- **✔ Met today** — one tap logs a meeting and resets the clock.
- **History** — append-only, never lost. Log a meeting on any date; tag *how* you connected (☎️ call / ☕ coffee / 💬 text / 📹 video / 🤝 in person).
- **Reschedule…** — push someone's next nudge out to a date without logging a meeting or hiding them.
- **Snooze / Archive** — hide someone temporarily (with a reason) or for good, without losing their history.

---

## The 13 features

| # | Feature | What it gives you |
|---|---------|-------------------|
| 1 | **One-tap reach-out** | `tel:` / `sms:` / `mailto:` chips on each card — go from "due" to actually reaching out in one tap |
| 2 | **Smart drift nudge** | "You usually see Alex ~every 30d — it's been 50" |
| 3 | **Reconnection wins** | Celebrates reconnecting with someone you'd drifted from — never shames a lapse |
| 4 | **Relationship-health glance** | A calm status strip (overdue / due-soon / on-track) you can tap to filter |
| 5 | **Talking points** | A "pick up next time" note per person |
| 6 | **Key dates** | 🎂 birthday / 💍 anniversary countdown chips |
| 7 | **Reschedule-from-today** | Defer a person's next nudge without logging a meeting |
| 8 | **Per-meeting channel** | Tag each meeting as call / coffee / text / video / in person |
| 9 | **Relationship tiers** | Inner / Close / Orbit circles that preset a sensible cadence |
| 10 | **On-this-day** | Resurfaces a meeting from a year ago today |
| 11 | **Monthly recap** | A private, shareable "this month in connection" summary |
| 12 | **Garden view** | The plant-health visualization described above |
| — | **Daily email digest** | An optional morning email of who's due (via the Sheet backend) |

Plus the foundation: drag-to-rank, per-person cadence, due/overdue math, add/edit/archive,
permanent meeting history, light/dark theme, and offline support.

---

## How it works (architecture)

Keep In Touch is a **renderer, not a data owner.** It holds no shared bucket of user data — each
*project* supplies and owns its own.

- **Single `index.html`**, vanilla JS, no build step, installable as a PWA, works offline.
- **Projects** = isolated lists via a `?project=NAME` URL param (e.g. `?project=family`). Default is `default`.
- **Your data lives in your storage**, in priority order:
  1. **Google Sheet** (recommended) — the Sheet *is* your database: open it, click a cell, it autosaves; the app reads/writes it as JSON through a tiny Apps Script web app. One Sheet = many projects (one tab each). **This is what syncs your phone ↔ computer.**
  2. **Connected local file** (desktop) — bind to a `.json` you choose via the File System Access API; edits write straight to disk.
  3. **Namespaced `localStorage`** (fallback / offline cache).
- **Updating the app never loses data** — data is keyed by origin + project, not by the HTML.
- **Privacy:** the public GitHub Pages URL is *code only*. Your contacts never leave your Google account / device.

### Platforms
- **Desktop (Arc/Chrome/Edge):** full experience incl. direct file binding.
- **Android Chrome:** full app incl. touch drag-to-rank; syncs via the Google Sheet backend.

---

## Documentation

| Read this | For |
|-----------|-----|
| **[HOWTO.md](HOWTO.md)** | How to use the app day-to-day, projects, where data lives |
| **[PLAN.md](PLAN.md)** | The vision and original feature design (F1–F10) |
| **[CHANGELOG.md](CHANGELOG.md)** | Every version and what shipped in it — the fullest build narrative |
| **[backend/DEPLOY.md](backend/DEPLOY.md)** | Set up / redeploy the Google Sheet + Apps Script backend |

## Backend setup (for cross-device sync + email)

The Sheet backend is optional but recommended (it's what enables phone ↔ computer sync and the
daily email digest). One-time setup — create a Sheet, paste `backend/Code.gs` into its Apps Script
editor, deploy as a web app, paste the URL into the app's Settings. Full steps in
**[backend/DEPLOY.md](backend/DEPLOY.md)**.

---

## Tech

Vanilla HTML/CSS/JS · PWA (service worker + manifest) · Google Apps Script backend · GitHub Pages
hosting. No framework, no build, no tracking.
