/**
 * Keep In Touch — Google Sheets backend (Apps Script web app)
 * =============================================================
 * The Google Sheet IS the human-editable database. A human opens the Sheet,
 * clicks any cell, edits, and it autosaves natively. This script exposes that
 * same Sheet to the renderer (index.html) as a tiny JSON API.
 *
 * One Sheet can hold MANY projects: each project = one tab (sheet) named after
 * the project (e.g. "work", "family"). The renderer passes ?project=NAME.
 *
 * SECURITY: deploy with "Execute as: Me" and "Who has access: Anyone".
 * The deployment URL is an unguessable secret — treat it like a password.
 * Optionally set a SHARED_TOKEN below and the renderer must send it.
 *
 * Columns (row 1 = headers, edited freely by the human):
 *   id | name | cadenceDays | lastMet | history | remindDays | archived | rank | snoozedUntil | suggestDismissed
 *   - lastMet: convenience YYYY-MM-DD (max of history); the script keeps it in sync
 *   - history: comma-separated YYYY-MM-DD dates (append-only; the source of truth)
 *   - remindDays: blank = inherit global
 *   - archived: TRUE/FALSE
 *   - rank: integer for "My ranking" mode (blank ok)
 *   - snoozedUntil: YYYY-MM-DD; person is hidden + excluded from reminders until this date (blank = not snoozed)
 *   - suggestDismissed: a cadence number the user rejected for the adaptive suggestion (blank = none)
 */

var SHARED_TOKEN = ""; // optional; if set, renderer must send ?token=...
var HEADERS = ["id", "name", "cadenceDays", "lastMet", "history", "remindDays", "archived", "rank", "snoozedUntil", "suggestDismissed"];

function doGet(e) {
  return handle(e, "GET");
}
function doPost(e) {
  return handle(e, "POST");
}

function handle(e, method) {
  try {
    if (SHARED_TOKEN && (!e.parameter || e.parameter.token !== SHARED_TOKEN)) {
      return json({ error: "unauthorized" });
    }
    // ?action=projects → list existing project tab names (so a fresh device can
    // discover projects already in this Sheet). Handled BEFORE getOrCreateSheet
    // so it never creates a stray tab.
    if (e.parameter && e.parameter.action === "projects") {
      var names = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function (s) { return s.getName(); });
      return json({ projects: names });
    }
    var project = (e.parameter && e.parameter.project) || "default";
    var sheet = getOrCreateSheet(project);

    if (method === "POST") {
      var body = JSON.parse(e.postData.contents);
      writeState(sheet, body);
      return json({ ok: true, project: project, count: Object.keys(body.items || {}).length });
    }
    return json(readState(sheet, project));
  } catch (err) {
    return json({ error: String(err) });
  }
}

function getOrCreateSheet(project) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(project);
  if (!sheet) {
    sheet = ss.insertSheet(project);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// A cell that Google Sheets auto-typed as a Date stringifies to a locale string
// like "Thu Apr 30 2026 00:00:00 GMT-0700 (Pacific Daylight Time)" — which, once
// split/sorted, becomes garbage. Coerce real Dates to YYYY-MM-DD; pass strings through.
function cellToText(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v == null ? "" : v).trim();
}

function readState(sheet, project) {
  var values = sheet.getDataRange().getValues();
  var items = {};
  var manualOrder = [];
  var ranked = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var id = String(row[0] || "").trim();
    var name = String(row[1] || "").trim();
    if (!id && !name) continue;          // skip blank rows
    if (!id) id = "p_row" + r;           // human added a name without id
    // history may be one date-typed cell, or comma/space-joined dates; coerce Dates first
    var historyRaw = cellToText(row[4]);
    var history = historyRaw ? historyRaw.split(/[,\s]+/).map(cellToText).filter(String) : [];
    history.sort();
    var item = {
      id: id,
      name: name,
      cadenceDays: parseInt(row[2], 10) || 30,
      history: history,
      remindDays: row[5] === "" || row[5] === null ? null : parseInt(row[5], 10),
      archived: row[6] === true || String(row[6]).toUpperCase() === "TRUE"
    };
    var snoozedUntil = cellToText(row[8]);                // Date-typed cell → YYYY-MM-DD
    if (snoozedUntil) item.snoozedUntil = snoozedUntil;   // optional; absent if blank
    var sd = row[9] === "" || row[9] === null || row[9] === undefined ? null : parseInt(row[9], 10);
    if (sd != null && !isNaN(sd)) item.suggestDismissed = sd;   // cadence value the user rejected
    items[id] = item;
    var rank = row[7] === "" || row[7] === null ? null : parseInt(row[7], 10);
    if (rank !== null && !isNaN(rank)) ranked.push({ id: id, rank: rank });
  }
  ranked.sort(function (a, b) { return a.rank - b.rank; });
  manualOrder = ranked.map(function (x) { return x.id; });
  return {
    schemaVersion: 1,
    project: project,
    globalRemindDays: readGlobal(sheet),
    mode: "auto",
    manualOrder: manualOrder,
    items: items
  };
}

// Extract the YYYY-MM-DD date from a history entry (string OR {date,note} object).
function histDateOf(entry) {
  return (entry && typeof entry === "object") ? (entry.date || "") : (entry || "");
}

function writeState(sheet, state) {
  var items = state.items || {};
  var order = state.manualOrder || [];
  var rows = [HEADERS];
  Object.keys(items).forEach(function (id) {
    var it = items[id];
    // history entries may be plain ISO strings (legacy) or {date,note} objects (v1.11+);
    // the Sheet stores DATES only — extract them so a cell never becomes "[object Object]".
    var history = (it.history || []).map(histDateOf).filter(String).sort();
    var lastMet = history.length ? history[history.length - 1] : "";
    var rank = order.indexOf(id);
    rows.push([
      it.id || id,
      it.name || "",
      it.cadenceDays || 30,
      lastMet,
      history.join(", "),
      it.remindDays == null ? "" : it.remindDays,
      it.archived ? true : false,
      rank === -1 ? "" : rank,
      it.snoozedUntil || "",
      it.suggestDismissed == null ? "" : it.suggestDismissed
    ]);
  });
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, HEADERS.length).setValues(rows);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  writeGlobal(sheet, state.globalRemindDays);
}

/* globalRemindDays stored in a document property so it survives edits */
function readGlobal(sheet) {
  var props = PropertiesService.getDocumentProperties();
  var v = props.getProperty("globalRemindDays");
  return v == null ? 3 : parseInt(v, 10);
}
function writeGlobal(sheet, v) {
  if (v == null) return;
  PropertiesService.getDocumentProperties().setProperty("globalRemindDays", String(v));
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =============================================================
 * Daily email reminders (F9)
 * -------------------------------------------------------------
 * A time-driven trigger emails the Sheet owner a digest of due/overdue
 * contacts across ALL project tabs — so reminders arrive even when every
 * device is closed, on any platform, with no Web Push setup.
 *
 * READ-ONLY against the Sheet + Document Properties: this path performs ZERO
 * Sheet writes and ZERO Document-Property writes (it only reads them; it writes
 * its own Script Properties for config). It never calls writeState, so it
 * cannot perturb the autosave round-trip or globalRemindDays.
 *
 * SETUP (once, from the Apps Script editor): run installDailyReminder().
 * Approve the MailApp (send email) consent when prompted, and set/verify the
 * project timezone under File > Project Settings. See backend/DEPLOY.md.
 * ============================================================= */

function gasEscapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// Midnight (ms) of a YYYY-MM-DD string in the script's timezone.
function gasDateMidnightMs(ymd) {
  var parts = ymd.split("-");
  // Construct in UTC then treat as a plain calendar day; day-math below is
  // difference-based so a consistent basis for both dates is all that matters.
  return Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

// Days until next-due for an item, or null if never met. Mirrors the frontend.
function gasDaysUntilDue(item, todayStr) {
  if (!item.history || !item.history.length) return null;
  var lm = item.history[item.history.length - 1];   // history is sorted ascending
  var nextDueMs = gasDateMidnightMs(lm) + (item.cadenceDays || 30) * 86400000;
  return Math.round((nextDueMs - gasDateMidnightMs(todayStr)) / 86400000);
}

function getReminderConfig() {
  var props = PropertiesService.getScriptProperties();
  var hour = parseInt(props.getProperty("reminderHour"), 10);
  if (isNaN(hour) || hour < 0 || hour > 23) hour = 8;
  var recipient = (props.getProperty("reminderRecipient") || "").trim();
  if (!recipient) recipient = Session.getEffectiveUser().getEmail();
  var enabledProp = props.getProperty("reminderEnabled");
  return { enabled: enabledProp !== "false", hour: hour, recipient: recipient };
}

// Group an item set (a readState result) into overdue / dueSoon / neverMet.
function collectDueForProject(state) {
  var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var global = state.globalRemindDays;
  var overdue = [], dueSoon = [], neverMet = [];
  Object.keys(state.items).forEach(function (id) {
    var item = state.items[id];
    if (item.archived === true) return;
    if (item.snoozedUntil && item.snoozedUntil >= todayStr) return;   // snoozed: skip until date passes
    var d = gasDaysUntilDue(item, todayStr);
    var eff = item.remindDays != null ? item.remindDays : global;
    if (isNaN(eff)) eff = global;   // garbage cell can't silently suppress a contact
    if (d === null) { neverMet.push({ name: item.name, label: "Never met", d: -1e9 }); }
    else if (d < 0) { overdue.push({ name: item.name, label: "Overdue " + (-d) + "d", d: d }); }
    else if (d <= eff) { dueSoon.push({ name: item.name, label: "Due in " + d + "d", d: d }); }
  });
  var byD = function (a, b) { return a.d - b.d; };
  overdue.sort(byD); dueSoon.sort(byD); neverMet.sort(byD);
  return { overdue: overdue, dueSoon: dueSoon, neverMet: neverMet };
}

// One-time installer (idempotent). Run from the editor.
function installDailyReminder() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sendDailyReminders") ScriptApp.deleteTrigger(t);
  });
  var cfg = getReminderConfig();
  ScriptApp.newTrigger("sendDailyReminders").timeBased().atHour(cfg.hour).everyDays(1).create();
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty("reminderEnabled") == null) props.setProperty("reminderEnabled", "true");
  Logger.log("Daily reminder installed: recipient=" + cfg.recipient + " hour=" + cfg.hour);
}

function uninstallDailyReminder() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sendDailyReminders") ScriptApp.deleteTrigger(t);
  });
  Logger.log("Daily reminder uninstalled.");
}

// Trigger handler — also runnable manually from the editor for testing.
function sendDailyReminders() {
  var cfg = getReminderConfig();
  if (!cfg.enabled) { Logger.log("Reminders disabled; skipping."); return; }
  var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var sections = [];   // [{project, overdue, dueSoon, neverMet}]
  var total = 0;
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sheet) {
    try {
      var state = readState(sheet, sheet.getName());
      var due = collectDueForProject(state);
      var n = due.overdue.length + due.dueSoon.length + due.neverMet.length;
      if (n > 0) { sections.push({ project: sheet.getName(), due: due }); total += n; }
    } catch (err) { Logger.log("Tab '" + sheet.getName() + "' skipped: " + err); }
  });
  if (total === 0) { Logger.log("Nothing due; no email sent."); return; }
  if (MailApp.getRemainingDailyQuota() <= 0) { Logger.log("Mail quota exhausted; skipping."); return; }
  var digest = buildDigest(sections, todayStr, total);
  try {
    MailApp.sendEmail({ to: cfg.recipient, subject: digest.subject, body: digest.body, htmlBody: digest.htmlBody });
    Logger.log("Sent digest to " + cfg.recipient + " (" + total + " people).");
  } catch (err) { Logger.log("sendEmail failed (check MailApp consent): " + err); }
}

function buildDigest(sections, todayStr, total) {
  var subject = "Keep In Touch — " + total + " " + (total === 1 ? "person" : "people") + " to reach out to";
  // colors from index.html :root
  var C = { overdue: "#e0463f", dueSoon: "#c87b13", muted: "#677488", accent: "#2f6df0" };
  var bandHtml = function (title, color, rows) {
    if (!rows.length) return "";
    var lis = rows.map(function (x) {
      return '<tr><td style="padding:4px 0;color:' + color + ';font-weight:700;white-space:nowrap;width:90px;">'
        + x.label + '</td><td style="padding:4px 0;">' + gasEscapeHtml(x.name) + '</td></tr>';
    }).join("");
    return '<div style="margin:8px 0 4px;font-size:13px;font-weight:700;color:' + color + ';">' + title
      + '</div><table style="border-collapse:collapse;font-size:14px;width:100%;">' + lis + '</table>';
  };
  var html = '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1b2330;">'
    + '<h2 style="font-size:18px;margin:0 0 4px;">👋 Keep In Touch</h2>'
    + '<p style="color:' + C.muted + ';font-size:13px;margin:0 0 14px;">People to reach out to as of ' + todayStr + '</p>';
  var text = "Keep In Touch — people to reach out to as of " + todayStr + "\n";
  sections.forEach(function (s) {
    html += '<div style="margin:18px 0 4px;font-size:15px;font-weight:700;border-bottom:1px solid #d9dee5;padding-bottom:4px;">'
      + gasEscapeHtml(s.project) + '</div>';
    text += "\n[" + s.project + "]\n";
    html += bandHtml("Overdue", C.overdue, s.due.overdue);
    html += bandHtml("Due soon", C.dueSoon, s.due.dueSoon);
    html += bandHtml("Never met", C.muted, s.due.neverMet);
    [].concat(s.due.overdue, s.due.dueSoon, s.due.neverMet).forEach(function (x) {
      text += "  " + x.label + " — " + x.name + "\n";
    });
  });
  html += '<p style="color:' + C.muted + ';font-size:12px;margin-top:20px;">Reach out, then tap “✔ Met today” in the app.</p></div>';
  return { subject: subject, body: text, htmlBody: html };
}
