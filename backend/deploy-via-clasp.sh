#!/usr/bin/env bash
# One-command backend redeploy for Keep In Touch via clasp (the Apps Script CLI).
#
# WHY THIS EXISTS: the daily-reminder email (F9) + 4 roadmap features (birthdays,
# reschedule-anchor, channel-tag, relationship tiers) need the current Code.gs deployed
# to Sam's Apps Script project. The code fix is already committed + verified (the email
# digest no longer throws on object-history — see /tmp/kit-email-verify.js, 5/5). This
# script just pushes + redeploys it.
#
# PREREQUISITES (one-time):
#   1. clasp authenticated as Sam's Google account. Status here: ~/.clasprc.json EXISTS
#      (older clasp token format). If `clasp login` is needed, run it interactively first.
#   2. The Apps Script project's scriptId. Find it: open the script editor →
#      Project Settings (gear) → "Script ID". It is NOT the AKfyc… in the /exec URL
#      (that's the deployment id); it's the longer project id.
#
# USAGE:
#   bash backend/deploy-via-clasp.sh <SCRIPT_ID>
#
# It is IDEMPOTENT and SAFE: it pushes Code.gs (overwriting the project's copy with the
# repo's committed, tested version) and updates the EXISTING web-app deployment in place,
# so the /exec URL Sam's app already points at keeps working — no new URL, no client change.

set -euo pipefail

SCRIPT_ID="${1:-}"
if [ -z "$SCRIPT_ID" ]; then
  echo "ERROR: pass the Apps Script project's Script ID."
  echo "Usage: bash backend/deploy-via-clasp.sh <SCRIPT_ID>"
  echo "(Find it: script editor → Project Settings → Script ID)"
  exit 2
fi

cd "$(dirname "$0")"   # the backend/ dir (where Code.gs lives)
BACKEND_DIR="$(pwd)"
echo "== Keep In Touch backend redeploy via clasp =="
echo "backend dir: $BACKEND_DIR"
echo "scriptId:    $SCRIPT_ID"

# Pin a known-good clasp version ephemerally via npx (no global/mise state touched).
CLASP="npx --yes @google/clasp@2.4.2"

# Auth sanity check (read-only).
if [ ! -f "$HOME/.clasprc.json" ]; then
  echo "ERROR: no ~/.clasprc.json — run 'npx --yes @google/clasp@2.4.2 login' first (interactive)."
  exit 3
fi
echo "auth: ~/.clasprc.json present."

# clasp needs an appsscript.json manifest in the push dir. Create a minimal one if absent.
if [ ! -f appsscript.json ]; then
  cat > appsscript.json <<'JSON'
{
  "timeZone": "America/Los_Angeles",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" }
}
JSON
  echo "wrote minimal appsscript.json (web app: execute as deploying user, anonymous access — matches a public /exec endpoint)."
fi

# Link this dir to the project (.clasp.json). rootDir '.' so it pushes Code.gs from here.
cat > .clasp.json <<JSON
{ "scriptId": "$SCRIPT_ID", "rootDir": "." }
JSON
echo "wrote .clasp.json (gitignored — contains the scriptId)."

echo
echo "== STEP 1: push Code.gs to the project =="
$CLASP push --force

echo
echo "== STEP 2: redeploy the web app in place =="
# Find the existing web-app deployment id and update it (keeps the same /exec URL).
# If none is found, fall back to creating one (prints the new URL to wire into the app).
DEPLOY_ID="$($CLASP deployments 2>/dev/null | grep -oE '^- [A-Za-z0-9_-]+' | head -1 | awk '{print $2}' || true)"
if [ -n "$DEPLOY_ID" ]; then
  echo "updating existing deployment: $DEPLOY_ID (same /exec URL preserved)"
  $CLASP deploy --deploymentId "$DEPLOY_ID" --description "KIT email-digest fix + contact/key-date columns ($(cat ../VERSION | tr -d '[:space:]'))"
else
  echo "no existing deployment found — creating a NEW one. NOTE: this yields a NEW /exec URL"
  echo "that must be pasted into the app's Settings → Sheet URL. Old URL stops receiving updates."
  $CLASP deploy --description "KIT initial deploy ($(cat ../VERSION | tr -d '[:space:]'))"
fi

echo
echo "== DONE =="
echo "Verify: open the app, pull-to-refresh, confirm edits sync + (if email enabled) the daily digest sends."
echo "The .clasp.json here holds your scriptId; it is gitignored and stays local."
