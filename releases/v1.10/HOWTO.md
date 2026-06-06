# Keep In Touch — HOWTO

A single-file webapp that tracks people you want to stay in touch with: rank them, log when you last met, set a "meet every X days" cadence, and see who's **due** or **overdue**.

> **One-line model:** the app is a *renderer*. Your data lives in **your** project's storage, not in the app. Open it with `?project=NAME` to keep separate, isolated lists.

---

## Quick start

1. Open `index.html` (double-click, or serve it — see *Notifications caveat*).
2. Tap **+ Add person** → name + "meet every X days" + optionally when you last met.
3. You're done. The app shows who's due.

### The three modes
- **Auto · due / overdue** — the list auto-ranks by urgency: never-met first, then most-overdue, then soonest-due. Read-only ordering.
- **My ranking** — drag rows (handle on the left, works with touch too) into your own preference order. Stored separately from auto mode.
- **Grid rank** — same ranking as "My ranking", but laid out in dense multi-column cards so a long list is fully visible at once for informed drag-reordering. The page widens to use the screen. Reordering here and in "My ranking" stay in sync.

### Daily use
- **✔ Met today** — one tap logs a meeting with today's date and resets the clock.
- **History** — log a meeting on any date, or remove a wrong entry. History is **append-only and never lost**.
- **Edit** — change name, cadence, or per-person reminder lead time.
- **Archive / Restore** — hide someone without deleting; toggle **Show archived** to see them.

### Reminders (today)
- Settings (⚙️) → **"remind X days before due"** sets the global lead time.
- Per-person override lives in the Edit dialog.
- For now this drives the in-app **due-soon banner** at the top. Email/push delivery comes with the backend (see ROADMAP / PLAN.md).

### Theme
- 🌙 / ☀️ in the header toggles light/dark. Preference is remembered.

---

## Projects (multiple isolated lists)

The app owns no shared data bucket. Each **project** is its own world:

```
index.html?project=work       → your work contacts
index.html?project=family     → family
index.html?project=mentors    → mentors
index.html                    → the "default" project
```

Switching the `?project=` value switches to a completely separate dataset. Two projects never see each other's data.

### Where does a project's data live?

| Tier | When | Notes |
|------|------|-------|
| **Google Sheet** | Any device (recommended for sync) | Settings ⚙ → **Google Sheet backend** → paste your Web app URL. The Sheet is your human-editable DB (open it, click any cell, autosaves). The app autosaves every change back to it. One Sheet holds all projects (one tab each). Set it up once via `backend/DEPLOY.md`. |
| **Connected file** | Desktop (Arc/Chrome/Edge) | Header → **Connect project file…** binds to a `.json` *you* choose. All edits write back to that file; it auto-reconnects next launch. The project owns the bytes. |
| **Namespaced localStorage** | Fallback / offline | Key `keepInTouch.project.<NAME>`. Persists on-device; also used as an offline cache when the Sheet is configured. Use **Export / Import** to move it. |

Priority when the app loads: **Google Sheet** (if configured) → connected file → localStorage.

**Updating the app never loses your data** — data is keyed by origin + project, not by the HTML. A new app version reads the same data.

---

## Platform notes

- **Desktop:** full experience, including direct file binding.
- **Android Chrome:** full app (incl. touch drag-to-rank). No file-picker API, but the **Google Sheet backend works on Android too** — that's the recommended way to sync phone ↔ computer. Without it, falls back to localStorage + Export/Import.

## Google Sheet backend (cross-device sync)

The Sheet IS your database — viewable and editable like any spreadsheet, and the app reads/writes it as JSON. Set up once: see **`backend/DEPLOY.md`** (create a Sheet, paste `backend/Code.gs` into Apps Script, deploy as a web app, paste the URL into Settings). Free, private to your Google account, works on every device.

## Notifications caveat

OS-level push (alerts when the app is closed) needs HTTPS + a service worker + a sender — out of scope for v1. v1 gives the in-app due-soon banner. Email reminders and then push are on the roadmap.

## Backup / move data

- **Export** (toolbar) downloads `keep-in-touch-<project>-<date>.json`.
- **Import** (Settings) loads a previously exported file into the current project.
