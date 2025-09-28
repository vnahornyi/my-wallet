#!/usr/bin/env sh
set -euo pipefail

CONFIG_PATH="${SUPABASE_CONFIG_PATH:-./supabase/config.toml}"

cleanup() {
  echo "Stopping Supabase stack..."
  supabase stop --config "$CONFIG_PATH" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo "Starting Supabase stack with config: $CONFIG_PATH"
supabase start --config "$CONFIG_PATH" --disable-telemetry

echo "Supabase stack is running. Tail the log to keep container alive."
tail -f /dev/null &
wait $!
