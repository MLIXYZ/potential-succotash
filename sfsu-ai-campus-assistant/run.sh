#!/usr/bin/env bash
# Pull latest code, update deps, (re)install the systemd unit, restart, health-check.
#
#   sudo bash run.sh              # pull + update + restart
#   sudo bash run.sh --no-pull    # update + restart only
#   sudo bash run.sh --status     # show service status + recent logs
#
# Run as a sudoer (e.g. mark). Git/pip run as the `deploy` user; systemctl as root.
# The server checkout tracks the `deploy` branch, which CI fast-forwards with
# main + the built frontend once all checks pass.
set -euo pipefail

APP_USER="deploy"
SERVICE="campus-assistant"
PORT=8000
ROOT="$(cd "$(dirname "$0")" && pwd)"          # .../sfsu-ai-campus-assistant
REPO="$(cd "$ROOT/.." && pwd)"                 # .../potential-succotash
UNIT_SRC="$ROOT/deploy/$SERVICE.service"
UNIT_DST="/etc/systemd/system/$SERVICE.service"
HEALTH_URL="http://127.0.0.1:$PORT/api/health"

step() { printf '\n==> %s\n' "$*"; }
as_app() { sudo -u "$APP_USER" -H "$@"; }
logs() { journalctl -u "$SERVICE" -n "${1:-40}" --no-pager; }

[[ $EUID -eq 0 ]] || { echo "Run with sudo: sudo bash run.sh $*"; exit 1; }

case "${1:-}" in
  --status) systemctl status "$SERVICE" --no-pager || true; logs 40; exit 0 ;;
  --no-pull) PULL=false ;;
  "") PULL=true ;;
  *) echo "Unknown option: $1"; exit 1 ;;
esac

if $PULL; then
  step "Pulling latest code"
  before="$(as_app git -C "$REPO" rev-parse HEAD)"
  as_app git -C "$REPO" pull --ff-only
  after="$(as_app git -C "$REPO" rev-parse HEAD)"
  if [[ "$before" == "$after" ]]; then
    echo "Already up to date ($after)"
  else
    as_app git -C "$REPO" log --oneline "$before..$after"
  fi
fi

step "Updating venv + dependencies"
as_app bash "$ROOT/scripts/setup_venv.sh"

step "Installing systemd unit"
if ! cmp -s "$UNIT_SRC" "$UNIT_DST" 2>/dev/null; then
  install -m 644 "$UNIT_SRC" "$UNIT_DST"
  systemctl daemon-reload
  echo "Unit updated"
fi
systemctl enable "$SERVICE" >/dev/null 2>&1

step "Restarting $SERVICE"
systemctl restart "$SERVICE"

step "Waiting for $HEALTH_URL"
for _ in $(seq 1 150); do   # up to 5 min (first start downloads the model)
  if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
    echo "Healthy: $(curl -fsS "$HEALTH_URL")"
    exit 0
  fi
  if ! systemctl is-active --quiet "$SERVICE"; then
    echo "Service exited during startup:"
    logs 60
    exit 1
  fi
  sleep 2
done
echo "Timed out waiting for health check:"
logs 60
exit 1
