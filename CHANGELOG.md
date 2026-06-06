# Changelog

All notable changes to Keep In Touch. Versions are git tags in this repo; each is frozen under `releases/vN/`.

## v1.9.0 — 2026-06-05
### Added
- **Installable app (PWA).** When served over HTTPS (or localhost), Keep In Touch can be installed to your home screen / dock on Android, macOS, and iOS — it then opens like a native app with no browser chrome and works offline (the app shell is cached; your data still lives in your Sheet / file / browser). Android & desktop Chrome show an "⬇ Install app" button in the header; iOS shows a one-time "Add to Home Screen" hint. The status-bar color follows the in-app light/dark theme. All of this stays dormant on `file://` (where service workers aren't allowed), so nothing changes for local use.

## v1.8.1 — 2026-06-05
### Changed
- **Batch "Set" view now lists people in your "My ranking" order** (instead of arbitrary insertion order), so batch-setting cadence/remind-days follows the same priority you arranged. People with no rank fall to the end.

## v1.8.0 — 2026-06-05
### Added
- **Daily email reminders (F9) — the big one.** When the Google Sheet backend is connected, a server-side Apps Script trigger emails you once a day listing everyone who's due or overdue, grouped by project, **even when every device is closed**. No Web Push, no app install — works the same on iPhone, Android, and desktop, because it's just email. Set it up by running `installDailyReminder()` once in the Apps Script editor (see backend/DEPLOY.md); tune the send hour, recipient, or pause it via Script Properties. The email's "due" logic is verified to match the in-app banner exactly. The reminder path only reads your Sheet — it never writes, so it can't disturb your data.

## v1.7.0 — 2026-06-05
### Added
- **Edit & delete individual meetings (F8).** In a person's History, each logged meeting now has Edit (inline date picker, commit with Enter, cancel with Escape) and Delete (with a confirm naming the exact date — history drives your due dates, so deletes are deliberate). Editing a date re-sorts and de-dupes; the card's status recomputes immediately.
- **Export history as CSV** alongside the existing JSON export. The toolbar now has "Export JSON" and "Export CSV". The CSV (one row per meeting: person_id, person, cadence_days, remind_days, archived, meeting_date, note, is_last_met) is Excel-ready (UTF-8 BOM, RFC-4180 quoting, CRLF) for analysis in any spreadsheet. The `note` column is reserved for the upcoming per-meeting notes feature.

## v1.6.0 — 2026-06-05
### Fixed
- **The "due / overdue" banner no longer counts archived people while you're viewing the archive.** Due math is now computed from a dedicated active-only set, so the banner reads identically whether you're on the active list or the archived view.

### Added
- **Archive polish (F7).** Archiving someone shows an "Archived {name} · Undo" toast (6s) so a mis-tap is one tap to reverse. The archived view drops the "✔ Met today" button (logging a meeting on a parked contact made no sense), shows the date each person was archived (on file/local backends), and dims parked cards. Grid ranking is forced off in the archived view, and switching projects always returns you to the active list.

> Note: the archived-on date is shown on file/local storage; on the Google Sheet backend the date isn't persisted yet (the `archived` flag itself is) — it'll show plain "archived" there until a future Sheet-column update.

## v1.5.0 — 2026-06-05
### Added
- **Cadence presets (F3).** The "Meet every (days)" box is now a dropdown of friendly presets — Weekly, Every 2 weeks, Monthly, Quarterly, Twice a year, Yearly — plus a "Custom…" option that reveals a day field for any other interval. Existing off-preset values (e.g. 45 days, common when edited via the Sheet) open as Custom with the exact number preserved; nothing about stored data or due-math changed.

## v1.4.0 — 2026-06-05
### Added
- **Batch "Set" mode — drag people onto a value to bulk-set cadence or remind-days.** A new mode tab shows every active person as a draggable chip and a value axis (1…30, plus 45/60/90/182/365 presets for cadence). Toggle between "Set cadence" and "Set remind-before", then drag any chip onto a number to set that person's value instantly. Each axis value shows a count badge of how many people sit there, and the dropped chip flashes to confirm. Works with mouse (desktop) and touch (Android).

## v1.3.3 — 2026-06-05
### Fixed
- **Bookmarked `file://…?project=X` URLs no longer lose the project.** macOS `open` strips the `?query` from `file://` URLs before the browser sees it (verified: `http://` and AppleScript `open location` keep it; `open -a` does not), so a saved link would drop `?project=work` and fall back to the empty "default". The app now remembers the last-active project and restores it when a load arrives with no project param, rewriting the URL bar to include `?project=…` again. After the first visit, the bookmark just works.

### Added
- **Relative "time ago" for the last meeting.** Cards and the history view now show "today / yesterday / 5 days ago / 2 weeks ago / 3 months ago / 1 year ago" alongside the date, so you can see at a glance how long it's been.

## v1.3.2 — 2026-06-05
### Fixed
- **Switching projects now loads instantly — no page reload, no manual "Reconnect".** Selecting a project used to navigate to a new URL, which dropped the click's user gesture; the new page then couldn't request file permission on its own and stranded you on a blank screen until you pressed Reconnect. Projects now switch **in-place** (via `history.replaceState`), so the selecting click's gesture flows straight into loading that project's data.
- **Empty "default" project greets you with the project picker.** A first run (or any empty, unbound default) now opens the project switcher automatically instead of showing a bare empty list — it doubles as the create-a-project screen.
- **No more redundant permission dialog when connecting a file.** Connecting a project file relied on the picker's own grant; the extra `readwrite` request was removed (write access is upgraded lazily on first save), so connecting asks for at most the single picker interaction.

## v1.3.1 — 2026-06-05
### Fixed
- **Connected-file projects no longer show a blank screen after reload.** Browsers reset a stored file handle's permission to "prompt" across page loads, and the app's auto-load asked for `readwrite` (which can only be granted from a user gesture), so it silently fell back to empty localStorage. Now:
  - **Zero-click reconnect:** auto-load checks only the *read* grant via `queryPermission` (no prompt, no gesture needed). If it survived, the file loads silently and picks up any external edits — you never re-pick the file.
  - **Lazy write upgrade:** the `readwrite` permission is requested only on your first actual edit (which is a user gesture), so saving still works without an extra step on load.
  - **localStorage mirror:** every file load/save now also mirrors into localStorage, so the worst case (grant fully lapsed) shows your real last-known data instead of a blank page.
  - **One-tap reconnect fallback:** if the read grant did lapse, the first interaction anywhere on the page silently re-grants and loads the file; a "Reconnect file" link in the project bar is also available. Either way you never choose the file again.

## v1.3.0 — 2026-06-05
### Added
- **Grid rank mode.** A third tab beside "Auto" and "My ranking". Lays the list out in responsive multi-column compact cards (rank number + name + status + key facts) so a long list is fully visible at once for informed drag-reordering. The page widens to 1200px in this mode. Shares the same ranking (`manualOrder`) as "My ranking" — reordering in either view updates both.

## v1.2.0 — 2026-06-05
### Added
- **Google Sheets backend.** The Sheet is the human-editable database (click-edit-autosave); the app reads/writes it as JSON via an Apps Script web app (`backend/Code.gs`, deploy guide `backend/DEPLOY.md`). One Sheet holds many projects (one tab each). Works on all devices including Android → real cross-device sync. Autosave is debounced; localStorage is kept as an offline cache.
- **Editable projects.** Click the project chip to switch, create, or rename projects. Project names are normalized (`lowercase`, `[a-z0-9-]`). A project registry (`keepInTouch.projects`) powers the switcher. Rename moves data + all bindings (file handle, Sheet config, local cache) to the new name.
- **Loading UI.** Full-screen spinner shown at first paint and during file/Sheet loads, so opening a pre-populated project no longer looks frozen. When a Sheet is configured, cached data paints instantly and the Sheet refresh happens in the background.

### Notes on bindings
- Data and *bindings* are stored separately. Bindings are per-(device × project): file handle in IndexedDB (`file.<project>`), Sheet config in localStorage (`keepInTouch.sheet.<project>`). The Sheet binding points at one shared cloud target; the file binding is inherently per-device. Load priority: Sheet → file → localStorage.

## v1.0.0 — 2026-06-05
### Added
- Initial single-file renderer. Drag-to-rank (mouse + touch), per-person "last met" + "meet every X days" cadence, auto due/overdue mode, manual ranking mode, append-only meeting history, archive/restore, global + per-item reminder lead time (in-app banner), light/dark toggle, 640px capped centered layout, JSON export/import.
- Renderer architecture: data owned per-project (`?project=NAME`) via connected file (File System Access API) or namespaced localStorage fallback. App stores no user data of its own.
- Docs: `HOWTO.md` (humans), `FOR-AGENTS.md` (agent integration + schema), `PLAN.md` (vision + P1/P2/P3 featureset).
