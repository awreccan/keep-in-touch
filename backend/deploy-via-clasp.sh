#!/usr/bin/env bash
# One-command backend redeploy for Keep In Touch via clasp (Apps Script CLI, v3.x).
#
# WHY: the daily-reminder email (F9) + 4 synced roadmap features (birthdays,
# reschedule-anchor, channel-tag, tiers) need the current, committed-and-verified Code.gs
# deployed to the Apps Script project. The email fix is proven (/tmp/kit-email-verify.js → 5/5).
#
# PREREQUISITE — fresh auth (the stored token from Jul 2025 is expired / invalid_grant):
#   npx --yes @google/clasp@latest login        # opens browser; log in as the Sheet's owner
#
# USAGE:
#   bash backend/deploy-via-clasp.sh [SCRIPT_ID]
#   - If SCRIPT_ID is omitted, the script lists your Apps Script projects so you can pick it.
#   - Find it explicitly: script editor → ⚙ Project Settings → "Script ID"
#     (NOT the AKfyc… in the /exec URL — that's the deployment id).
#
# SAFE + IDEMPOTENT: pushes Code.gs (overwriting the project copy with the repo's tested
# version) and UPDATES THE EXISTING web-app deployment in place → same /exec URL, so the
# app keeps working with no client change.

set -euo pipefail
CLASP="npx --yes @google/clasp@latest"   # 3.x matches the ~/.clasprc.json token format
SCRIPT_ID="${1:-}"

cd "$(dirname "$0")"   # backend/ (where Code.gs lives)
echo "== Keep In Touch backend redeploy via clasp 3.x =="
echo "backend dir: $(pwd)"

# 1) Auth must be valid (the common failure mode here is a stale token → invalid_grant).
if ! $CLASP show-authorized-user 2>&1 | grep -qiE "logged in|authorized|@"; then
  echo "ERROR: clasp is not authenticated (or the token is expired/invalid_grant)."
  echo "Run this once, interactively, then re-run me:"
  echo "    npx --yes @google/clasp@latest login"
  exit 3
fi

# 2) Resolve the scriptId — discover it if not provided.
if [ -z "$SCRIPT_ID" ]; then
  echo "No SCRIPT_ID passed — listing your Apps Script projects:"
  $CLASP list-scripts 2>&1 | tail -40
  echo
  echo "Re-run with the Keep In Touch project's id:  bash backend/deploy-via-clasp.sh <SCRIPT_ID>"
  exit 0
fi
echo "scriptId: $SCRIPT_ID"

# 3) Minimal manifest if missing (web app: execute as deploying user, anonymous access).
[ -f appsscript.json ] || cat > appsscript.json <<'JSON'
{ "timeZone": "America/Los_Angeles", "dependencies": {}, "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8", "webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" } }
JSON

# 4) Link this dir to the project (.clasp.json is gitignored — holds the private scriptId).
cat > .clasp.json <<JSON
{ "scriptId": "$SCRIPT_ID", "rootDir": "." }
JSON

VER="$(cat ../VERSION | tr -d '[:space:]')"
echo; echo "== push Code.gs =="
$CLASP push --force

echo; echo "== update the existing web-app deployment in place (same /exec URL) =="
DEPLOY_ID="$($CLASP list-deployments 2>/dev/null | grep -oE '[-] [A-Za-z0-9_-]{30,}' | head -1 | awk '{print $2}' || true)"
if [ -n "$DEPLOY_ID" ]; then
  echo "redeploying $DEPLOY_ID"
  $CLASP update-deployment "$DEPLOY_ID" --description "KIT $VER (email-digest fix + synced columns)" 2>&1 || \
    $CLASP redeploy "$DEPLOY_ID" --description "KIT $VER"
else
  echo "no existing deployment found — creating a NEW one (NOTE: yields a NEW /exec URL to paste into the app)."
  $CLASP create-deployment --description "KIT $VER initial"
fi

echo; echo "== DONE =="
echo "Then run the email trigger once (script editor → run 'installDailyReminder', approve perms),"
echo "and verify in-app: pull-to-refresh, confirm sync + the morning digest."
