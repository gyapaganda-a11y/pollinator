#!/usr/bin/env bash
# Pollinate Studio — macOS/Linux setup
set -e
if ! command -v node >/dev/null 2>&1; then
  echo
  echo "Node.js is not installed."
  echo "Opening the official download page..."
  echo "Install Node.js LTS, then re-run this script."
  echo
  URL="https://nodejs.org/en/download"
  if [[ "$OSTYPE" == "darwin"* ]]; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  else echo "Visit $URL"
  fi
  exit 1
fi
echo "Node.js detected. Launching Pollinate Studio..."
node server.mjs
