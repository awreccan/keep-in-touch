# Keep In Touch

## Goal / Vision

> A `/webpage` where:
>
> 1. It's a list of items that I can drag and drop to rank them
> 2. I can assign when I met that item/person last
> 3. I can assign a "I want to meet this person" once every X days
> 4. The list auto-rotates in one mode of the webapp and auto-ranks based on who is coming up due soon and who is overdue
> 5. I can rank the list based on my preference in another mode
> 6. I can add new list items
> 7. I can archive list items
> 8. Point 2 history is recorded, never lost
> 9. The webapp (hopefully just an HTML file on my Android phone and computer — that syncs to an easy-to-edit online backend like Google Sheets) can remind me X days before someone is coming due using a push notification on Android and macOS, and I can configure X globally for P1 and per-item for P2

In one line: **a personal "stay in touch" tracker** — a ranked list of people I care about, each with a cadence (meet every X days) and a permanent meeting log, that tells me who's due or overdue and (eventually) reminds me before I fall out of touch.

## Architecture decisions (locked in)

- **Single `index.html`**, vanilla JS, no build step. Works offline.
- **The app is a RENDERER, not a data owner.** It holds no shared global bucket of user data. Each *project* (think: a user / a context) supplies and owns its own data.
  - **Project identity = `?project=NAME` URL param** (default `default`). Each project is a fully isolated instance.
  - **Data lives in the project's storage**, two tiers:
    1. **Connected project file** (preferred) — bind to a `.json` file *inside the project* via the File System Access API. All reads/writes go to that file; the handle is remembered in IndexedDB and auto-reconnects. The project owns the bytes; the app just renders and writes back.
    2. **Namespaced `localStorage`** (fallback) — key `keepInTouch.project.<NAME>`, used where file access isn't available (e.g. Android, see below). Export/Import moves data with the project.
  - **Only UI prefs** (theme) live in app-global storage — never user data.
- **Updating the HTML never loses data:** data is keyed by origin + project, not by markup. Rewriting this file leaves every project's data intact (same origin + same `?project` + same storage key).
- **Theme:** light by default (per `/webpage` skill), dark toggle in header; preference persisted.
- **Layout:** capped at `--maxw` (640px) and centered — not full-width on desktop.
- **Hosting:** GitHub Pages (free, HTTPS). The URL is public but contains *no data* — code only. Privacy preserved.
- **Reminders:** email via a scheduled Apps Script trigger (later). True OS push is explicitly out of scope for P1.

### Platform note — Android vs desktop data binding
- **Desktop (Arc/Chrome/Edge):** File System Access API works → "Connect project file" binds directly to a project `.json`; edits write straight back to disk. This is the full renderer-owns-nothing model.
- **Android (Chrome):** `showOpenFilePicker` is **not supported**. The app auto-detects this and falls back to namespaced `localStorage`; the "Connect project file" button explains the limitation and points to Export/Import. Cross-device project sync on Android arrives with the backend step (P9-P2: a shared JSON/Sheets store both platforms read/write over HTTPS).

---

## P1 — shipping featureset (localStorage, single file)

Each feature lists its P2 and P3 improvements.

### F1. Drag-and-drop ranking
- **P1:** Reorder items by dragging in "preference" mode. Order persists.
- **P2:** Touch-friendly drag handles for Android; haptic/visual drop feedback.
- **P3:** Multi-select drag; keyboard reordering for accessibility.

### F2. "Last met" date per item
- **P1:** Date picker per item; defaults to today when logged.
- **P2:** Quick "met today" one-tap button; freeform note attached to each meeting.
- **P3:** Location / channel (call, coffee, text) tagging per meeting.

### F3. Cadence — "meet every X days"
- **P1:** Per-item integer (days). Drives due/overdue math.
- **P2:** Presets (weekly / monthly / quarterly / yearly) + custom.
- **P3:** Adaptive cadence suggestions based on actual meeting frequency.

### F4. Auto mode — rank by due/overdue
- **P1:** Compute `nextDue = lastMet + cadence`; sort most-overdue first. Read-only ordering.
- **P2:** Color/severity bands (overdue / due soon / on track); "auto-rotate" cycling highlight of the top item.
- **P3:** Weight urgency by preference rank (a high-priority person due slightly is surfaced over a low-priority person very overdue).

### F5. Manual preference mode
- **P1:** Separate, drag-sorted order stored independently from auto mode. Toggle between modes.
- **P2:** Pin/favorite items to the top regardless of cadence.
- **P3:** Multiple named custom views/orderings.

### F6. Add items
- **P1:** Add a person/item with name + cadence.
- **P2:** Inline edit of name/cadence; avatar/emoji.
- **P3:** Import contacts; bulk add.

### F7. Archive items
- **P1:** Soft-delete flag; archived items hidden from active lists but retained.
- **P2:** Archive view + restore; archived items excluded from due math.
- **P3:** Reason/snooze ("archive until date").

### F8. Permanent meeting history
- **P1:** Append-only array of meet-dates per item. Never overwritten. Viewable per item.
- **P2:** Edit/delete a wrong entry (with confirm); export history as JSON/CSV.
- **P3:** Timeline visualization; streaks and gaps.

### F9. Reminders + sync
- **P1:** Global "remind me X days before due" setting + per-item override. Stored and shown in-app due-soon banner. No external delivery.
- **P2 — DONE (v1.1):** Google Sheets backend. The Sheet is the human-editable DB (click-edit-autosave); the app reads/writes it as JSON via an Apps Script web app. One Sheet = many projects (one tab each). Works on all devices incl. Android → this is also real cross-device sync. See `backend/Code.gs` + `backend/DEPLOY.md`.
- **P2-next:** Email reminders via an Apps Script daily time-trigger reading the same Sheet.
- **P3:** True OS push (PWA + service worker + web-push sender) on Android + macOS.

### F10. Project + bindings model (v1.2 target)
A **project** is a logical identity (e.g. `family`). A **binding** maps that project, *on this device*, to a storage target. Bindings are per-(device × project); the cloud binding is shared.
- **P1:** Editable project name in-app (not only via `?project=` URL). Bindings already stored separately from data: file handle in IndexedDB (`file.<project>`), Sheet config in localStorage (`keepInTouch.sheet.<project>`), local cache in `keepInTouch.project.<project>`.
- **P2:** Explicit bindings UI — see/add/remove this device's bindings for a project; pick which is active (Sheet = shared source of truth, file/local = per-device).
- **P3:** Multiple cloud bindings; conflict resolution when two devices write the same Sheet.

---

## Out of scope (current)
- OS-level push notifications (F9-P3).
- Multi-device write-conflict resolution (F10-P3).

## Migration notes
- Schema is versioned (`schemaVersion`) for clean migration.
- Backend delivered: Google Sheets + Apps Script web app. Free, private to the user's Drive, directly editable.
