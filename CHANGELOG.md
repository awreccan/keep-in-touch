# Changelog

All notable changes to Keep In Touch. Versions are git tags in this repo; each is frozen under `releases/vN/`.

## v1.26.0 — 2026-06-06
### Fixed (fourth-audit finding)
- **An edit made while offline (or during a hiccup) is never silently lost.** If saving to the Sheet fails — you're offline, your Google sign-in lapsed, or the network blips — the change you made (a cadence, snooze, archive, rename, etc.) used to be quietly reverted to the Sheet's old value the next time the app opened. Now that change is protected: it sticks across reloads, the project bar shows a persistent **"⚠ unsynced changes — will retry when back online"** note, and the app automatically pushes it up the moment it reconnects (or the next time you open it online). Other people's edits and any contacts added on another device are still merged in correctly — your unsynced change doesn't overwrite them, and theirs don't overwrite yours.
- **Switching projects mid-save no longer drops the in-flight change.** If you edited someone and immediately switched projects within the brief save window, that pending save is now flushed for the project you're leaving instead of being discarded.

## v1.25.0 — 2026-06-06
### Fixed (third-audit findings)
- **Edits made on another device now stick.** Previously, changing a person's cadence, archive, or snooze on one device could be silently reverted when another device (with an older cached copy) synced. A normal Sheet load now takes the latest values from the Sheet for fields like cadence/archive/snooze, while still combining meeting history from both sides — so cross-device edits no longer fight each other.
- **The reserved sync tab can't be opened as a project.** Typing or linking to the internal `kit-registry` name now safely falls back to the default project, so the behind-the-scenes cross-device project list can't be corrupted.

## v1.24.0 — 2026-06-06
### Fixed (final-audit findings)
- **Meeting notes no longer get dropped when devices sync.** When merging your data with the Sheet, a note added on one device could be lost if another device had the same meeting date without a note. The merge now keeps the note from whichever side has one.
- **Importing no longer wipes your existing list.** Importing a JSON export now *merges* into the current project (matching the on-screen promise), instead of silently replacing everyone — so restoring a backup or importing one list while another is open is safe. (CSV/TSV import already merged.)
- **No spurious reload on first install.** Installing the app could trigger one needless reload; it now only reloads when a genuinely new version takes over.

## v1.23.0 — 2026-06-06
### Fixed
- **Corrupted data now cleans itself the moment you open the project — no edit needed.** Previously, garbage history cells (from the old `[object Object]` / scrambled-date bugs) were dropped in-app on load but only written back to your Sheet on your next change. Now, if the app detects and heals corruption while loading, it immediately re-saves the cleaned data to the Sheet. Open the affected project on any device and the bad cells fix themselves automatically.

## v1.22.0 — 2026-06-06
### Fixed
- **Hardened the History view against an edge-case crash.** If the history/timeline ever rendered for a person who'd just been removed (a stale reference), it could throw. Both now no-op safely instead. (Surfaced by a real end-to-end backend test.)

## v1.21.0 — 2026-06-06
### Added / Fixed (final audit items)
- **Meeting notes now sync across devices via the Sheet.** Notes are stored in a new `notes` column (as a compact per-date map), so a note you add on your computer shows up on your phone and vice-versa. The human-readable `history` cell stays plain dates. **Requires redeploying `backend/Code.gs`.**
- **Renamed or removed projects stop coming back.** Previously a project you renamed away from could reappear in the switcher on the next sync. Removed names are now tombstoned so cross-device discovery won't resurrect them (re-creating a project with that name clears the tombstone).

## v1.20.0 — 2026-06-06
### Fixed (from an adversarial audit of the sync/PWA paths)
- **Reloading a Sheet-backed project no longer loses data.** The app used to overwrite everything with whatever the Sheet returned on each load — so meeting **notes** (which the Sheet doesn't store) and any people that existed only on this device were silently dropped. Loads now *merge* with what you have, keeping notes and local-only people while pulling in the Sheet's additions.
- **"Connected but no data" on mobile now shows a real reason.** If the Sheet request redirects to a Google sign-in/error page (common when the phone's browser isn't signed into the right Google account), the app now says so ("couldn't sync — check your Sheet URL / token") instead of silently showing an empty local list. It also stays bound to the Sheet so your edits still save up.
- **A failed sync no longer secretly demotes you to local-only.** Saves keep going to the Sheet, and a wrong/expired token now shows "save failed" instead of a false "saved ✓".
- **Installed app updates itself.** When a new version is deployed, the PWA now reloads once to pick it up, instead of a warm Android window running stale code indefinitely.
- **The daily reminder email no longer lists a phantom "kit-registry" project**, and the hidden sync tab is excluded from project listings everywhere.

## v1.19.0 — 2026-06-05
### Fixed
- **Dates that Google Sheets auto-formats no longer corrupt your data.** If Sheets turned a date cell into a real date value, the backend used to stringify it as a long locale string (e.g. "Thu Apr 30 2026 00:00:00 GMT-0700 (Pacific Daylight Time)") which then got scrambled. The backend now converts any date-typed cell to plain `YYYY-MM-DD` on read. Combined with the v1.18 self-heal on load, this both prevents and cleans up that garbage. **Requires redeploying `backend/Code.gs`.**

## v1.18.0 — 2026-06-05
### Fixed
- **Old corrupted data now self-heals on load.** If a project's meeting history was previously damaged (cells showing `[object Object]` from the earlier sync bug), opening it now silently drops the garbage tokens, keeps any real dates, and writes clean data back on the next save — no crash, no manual cleanup needed. (Meeting dates are validated as real `YYYY-MM-DD` values before use.)

## v1.17.0 — 2026-06-05
### Fixed
- **Your Google Sheet data now loads on other devices.** Connecting the Sheet is now a once-per-device action that applies to *all* your projects (previously each project needed its own connection, so a freshly-connected device showed only an empty local list). After connecting, if your current list is empty but the Sheet has others, the project picker opens automatically. To pull a specific list, open the project switcher and type its tab name (e.g. `ppl`) — it loads from the Sheet and is remembered.
- **Cross-device project discovery without any backend redeploy.** Devices sharing one Sheet now sync their project list through a hidden `kit-registry` tab, so a project you create or open on one device appears on the others. (Tabs created entirely outside the app are also auto-listed *if* the backend is redeployed to v1.16+; otherwise just type the tab name once.)
- **Settings closes immediately when you press Connect** (and the redundant "connected" pop-up is gone — the data appearing and the "saved ✓" badge are the confirmation).

## v1.16.0 — 2026-06-05
### Fixed
- **Critical: Google Sheet sync no longer corrupts data.** After per-meeting notes were added, saving to the Sheet wrote malformed values (meeting history showed up as `[object Object]`) and could damage existing projects. The app now writes clean date values to the Sheet, and any already-corrupted cells are safely ignored on load. **This works without redeploying your Apps Script** — though redeploying (latest `backend/Code.gs`) is recommended so cross-device project discovery and the date-safe write also run server-side.
- **Connecting a Sheet on a new device now finds your existing lists.** Previously a fresh device stayed on "default" and didn't see projects already in the Sheet. It now reads the Sheet's tabs and lists them in the project switcher (requires the redeployed backend).

### Added
- **App version is shown** in the project bar (e.g. `v1.16.0`), so you can tell which version each device is running — handy when diagnosing sync issues.
- **Paste-to-import.** Settings now has a paste box: paste exported JSON, *or* copy a block of cells straight from Google Sheets (tab- or comma-separated, with a header row) and import them. Imported people merge into the current project (matched by name, meeting dates combined) — a quick recovery path.

## v1.15.0 — 2026-06-05
### Changed
- **Visual & UX refresh (research-driven).** A calmer, more considered look throughout: warmer neutral background, flatter surfaces with crisp hairline borders (no heavy shadows), a tighter type hierarchy, and gentle motion (cards ease in, modals/toasts settle in, a subtle "saved ✓" pulse) — all of which respect your "reduce motion" system setting.
- **Status is clearer and more accessible.** Overdue / due-soon / on-track now read with a leading colored dot *and* a higher-contrast label (meets WCAG AA in both light and dark), so status no longer relies on color alone.
- **Better on touch + keyboard.** Buttons and tap targets grow to a comfortable 44px on touch devices, and every control now shows a visible focus ring for keyboard navigation.
- **New app icon.** Replaced the off-centre placeholder with a crisp, properly centered icon — a recurrence loop wrapping ascending ranked bars, reflecting what the app is: recurring keep-in-touch reminders with your own priority ranking. Installs cleanly on Android (maskable-safe) and iOS.

## v1.14.0 — 2026-06-05
### Added
- **History timeline (P3-F8).** The History view now opens with a compact sparkline of your meetings over time — each dot is a meeting, the line between them is color-coded green/amber/red by whether you kept pace with the cadence, and a dashed trailing segment shows time since the last meeting. A one-line summary calls out your longest on-cadence streak and longest gap. Hover any dot for the exact date and days since the previous meeting.

## v1.13.0 — 2026-06-05
### Added
- **Adaptive cadence suggestions (P3-F3).** When your actual meeting rhythm with someone drifts from the cadence you set, the card gently suggests the real one — e.g. "💡 You're meeting ~every 30d, but cadence is 7d." Tap "Use 30d" to apply it or "Dismiss" to keep yours (it won't nag again unless your rhythm changes). Only appears with enough history (4+ meetings) and a steady rhythm — never for erratic or near-matching cadences. Suggestion math uses the median gap, so one outlier won't skew it.

## v1.12.0 — 2026-06-05
### Added
- **Snooze (P3-F7).** Temporarily hide someone until a date — handy when a person is on sabbatical, traveling, or you've agreed to reconnect later. Tap "Snooze…" on a card, pick 1 week / 1 month / 3 months or a specific date, optionally add a reason. Snoozed people drop out of your due/overdue list and the reminder email, show a 💤 badge in the "Show snoozed / archived" view, and **return to your active list automatically** when the date passes (or tap "Wake up" anytime).

## v1.11.0 — 2026-06-05
### Added
- **Per-meeting notes (F2).** Each logged meeting can carry an optional note (e.g. "coffee, talked about the new role"). Add one when you log a meeting, or tap "+ note" / "Edit note" on any past entry in the History view. One-tap "✔ Met today" stays exactly as fast — notes are always optional. Notes are included in CSV export.
- **Save status indicator.** A small "saving… → saved ✓" (and "save failed" if something goes wrong) now appears in the project bar after every change, so you always know your data made it — especially useful with the Google Sheet backend.

## v1.10.0 — 2026-06-05
### Fixed
- **Connecting a Google Sheet no longer wipes data you already have.** Previously, loading a list (e.g. from a file) and then connecting a Sheet for the first time would overwrite your list with the empty Sheet. Now connecting **merges** — your existing people are kept and pushed *up* to the Sheet, and if the Sheet already has data the two are unioned (meeting histories combined, never dropped). First connect = your data is saved to the Sheet, exactly as expected.

### Added
- **First-run onboarding.** New visitors are greeted with a friendly choice of where their list lives: **Sync with a Google Sheet** (recommended — keeps phone and computer in step, enables daily email reminders) or **Just use this device**. A collapsed "Advanced" option offers a local file on desktop. Returning users and anyone with existing data skip straight in. Settings now labels the Sheet as recommended for syncing.

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
