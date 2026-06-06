# 👋 Keep In Touch

A gentle, single-file web app that reminds you to keep in touch with the people who matter — before too much time slips by.

**[▶ Open the app](https://awreccan.github.io/keep-in-touch/)**

## What it does

- Track the people you want to stay close to, and how often you'd like to reach out (weekly, monthly, quarterly… or any custom cadence).
- Log each time you connect. The app shows who's **due** or **overdue**, and how long it's been ("5 days ago").
- Sort by urgency (Auto), your own priority (drag-to-rank), a dense Grid, or bulk-set cadences in Batch mode.
- Archive people you're not actively keeping up with, edit your meeting history, and export everything as JSON or CSV.
- Optional **daily email reminder** of who's due — even when every device is closed (via a Google Apps Script you own).

## Your data stays yours

This app is a **renderer that owns no data**. Everything you enter lives in *your* storage, never on any server of mine:

- **In your browser** (localStorage) by default — works offline, nothing leaves the device.
- **In a Google Sheet you own** (optional) — the Sheet is the editable database and syncs across your phone and computer. See [`backend/DEPLOY.md`](backend/DEPLOY.md).
- **In a local `.json` file** you connect (optional, desktop Chromium).

Multiple separate lists ("projects") live side by side via `?project=name` in the URL.

## Install it

Open the link above on your phone or computer and choose **Install** (Android/desktop Chrome show an install button; on iPhone, tap Share → *Add to Home Screen*). It then opens like a native app and works offline.

## Tech

One `index.html` — vanilla HTML/CSS/JS, no build step, no framework, no tracking. A small service worker caches the app shell; an optional Google Apps Script (`backend/`) turns a Google Sheet into a tiny JSON backend and sends the daily reminder email.

See [`HOWTO.md`](HOWTO.md) to run it locally and [`CHANGELOG.md`](CHANGELOG.md) for the version history.

## License

MIT
