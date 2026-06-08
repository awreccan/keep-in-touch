# Backend deploy — Google Sheets + Apps Script (one-time, ~5 min)

This is the only part I can't do for you: it runs under **your** Google account. Once deployed, the renderer talks to your private Sheet and the Sheet stays your human-editable database.

---

## ⚡ ALREADY DEPLOYED? Re-deploy to turn the daily email back on (~2 min, 4 clicks)

> **Why:** the current `Code.gs` fixes a bug that broke the daily-reminder email for
> anyone with logged meetings (it threw and silently skipped your tabs). Your live app
> already works without this — it's **only** the email digest that needs the redeploy.
> Your Sheet, your data, and the Web-app URL are all unchanged by this.

**Fastest path — one command (clasp):** if you have the Apps Script **Script ID**
(script editor → ⚙ Project Settings → "Script ID"), just run:

```bash
bash backend/deploy-via-clasp.sh <SCRIPT_ID>
```

It pushes the current `Code.gs` and updates your existing web-app deployment **in place**
(same `/exec` URL). `clasp` is already installed + authenticated on this machine. The
`.clasp.json` it writes (holding your Script ID) is gitignored — it never leaves your disk.
Then do step 4 below once (the email trigger). — *Prefer this; the 4-click flow is the manual fallback.*

**Manual fallback (4 clicks):**

1. Open your Sheet → **Extensions → Apps Script**.
2. Select-all in the editor, delete, and paste the entire current `Code.gs` (next to this file).
3. **Deploy → Manage deployments → ✏️ (edit) → Version: *New version* → Deploy.** (URL stays the same.)
4. Run the **`installDailyReminder`** function once (Run menu / function dropdown) and approve the email permission.

Done — you'll get the morning digest again. (First set your timezone if you never have: **Project Settings → Time zone**.) Everything below is the full first-time setup, for reference.

---

## What you'll end up with
- A **Google Sheet** (your private DB) — open it, click any cell, edit, autosaves.
- An **Apps Script web app** behind a secret URL that the app reads/writes as JSON.
- One Sheet holds **all projects** — each project is its own tab (e.g. `work`, `family`).

## Steps

1. **Create the Sheet**
   - Go to <https://sheets.new>. Name it e.g. *Keep In Touch DB*.
   - Leave it empty — the script creates a tab per project automatically.

2. **Open the script editor**
   - In the Sheet: **Extensions → Apps Script**.

3. **Paste the code**
   - Delete the stub `myFunction`, paste the entire contents of `Code.gs` (next to this file).
   - (Optional, recommended) set `var SHARED_TOKEN = "some-long-random-string";` for an extra layer beyond the secret URL. Remember it — you'll give it to the app.
   - Click 💾 Save.

4. **Deploy as a web app**
   - **Deploy → New deployment**.
   - Gear ⚙ next to "Select type" → **Web app**.
   - **Execute as:** *Me*.
   - **Who has access:** *Anyone*. (Required so the app can call it without a Google login. The URL is the secret.)
   - **Deploy**. Approve the permissions prompt (it's your own script touching your own Sheet).
   - **Copy the Web app URL** — looks like `https://script.google.com/macros/s/AKfy…/exec`.

5. **Connect the app**
   - Open `index.html?project=work` (or any project).
   - ⚙ Settings → **Google Sheet backend** → paste the Web app URL (+ token if you set one) → **Connect**.
   - The app pulls from the Sheet and from then on autosaves every change back to it.

## Daily email reminders (optional)
Get a once-a-day email listing who's due or overdue — across **all** your project tabs — even when every device is closed. This runs server-side on Google's schedule; no Web Push, works on iPhone/Android/desktop alike.

1. **Set the timezone first.** In the script editor: **File → Project Settings → Time zone** → set it to yours. (The pasted-in script has no committed timezone, so it defaults to the project creator's locale; the daily send hour and "due today" math use this.)
2. **Install the trigger.** In the editor's **Run** menu (or the function dropdown), select **`installDailyReminder`** and Run. Approve the **send email** (MailApp) permission when prompted — if you decline, no emails are sent and an error is logged.
3. That's it — you'll get a digest each morning (default **8 AM**) at your Google account's email.

**Tuning (optional), via Project Settings → Script Properties:**
- `reminderHour` — 0–23, default `8`. **Re-run `installDailyReminder` after changing** (a time trigger's schedule can't be edited in place).
- `reminderRecipient` — send to a different address (default: your own).
- `reminderEnabled` — set to `false` to pause without removing the trigger.

**Stop entirely:** run **`uninstallDailyReminder`** once.

**Notes:** the email is self-to-self — if it lands in Promotions/Spam, add a filter or mark it Important. The reminder path only *reads* your Sheet; it never writes, so it can't disturb your data. The "remind X days before due" lead time (Settings in the app) controls what counts as "due soon" in the email, exactly like the in-app banner.

## Updating the script later
- Edit the code, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The URL stays the same.
- If you added/changed reminder code, also re-run `installDailyReminder` once.

> **Backend update (recommended):** paste the latest `Code.gs` and redeploy a new version (see the ⚡ quickstart at the top). The current script: (a) coerces meeting-history entries to plain `YYYY-MM-DD` on read/write (defensive against the `[object Object]` and "Thu Apr 30 2026 … (Pacific Daylight Time)" corruption classes — the app also guards these client-side); (b) adds `?action=projects` so a freshly-connected device can list the Sheet's existing project tabs; and (c) **fixes the daily-reminder email**, which previously threw on any contact with logged history and silently dropped that whole tab from the digest. Existing data and the URL are unaffected.

## Security notes
- The deployment URL is an unguessable secret. Anyone with it can read/write your Sheet → don't paste it in public places.
- For more safety, set `SHARED_TOKEN`; the app appends it as `?token=` and the script rejects calls without it.
- The Sheet itself stays private to your Google account; "Anyone" applies only to the script endpoint, not the document.

## How the Sheet looks (each project tab)

| id | name | cadenceDays | lastMet | history | remindDays | archived | rank | snoozedUntil | suggestDismissed |
|----|------|-------------|---------|---------|-----------|----------|------|--------------|------------------|
| p_a | Alex Rivera | 30 | 2026-06-01 | 2026-05-01, 2026-06-01 |  | FALSE | 0 |  |  |

> Existing Sheets from before these columns were added keep working — the script appends `snoozedUntil` and `suggestDismissed` automatically on the next write. Blank cells mean "not snoozed" / "no suggestion dismissed".

- Edit any cell directly in Sheets — the app picks it up on next load/sync.
- **`history` is the source of truth** and append-only. Add dates; don't delete past ones.
- `lastMet` is auto-derived; you can ignore it (the script recomputes it).
