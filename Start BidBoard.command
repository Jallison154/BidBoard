#!/bin/bash
cd "$(dirname "$0")"
export BIDBOARD_OPEN=1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed or not on PATH."
  echo "Install Node.js 18 or newer from https://nodejs.org/, then run Install BidBoard.command."
  read -r -p "Press Enter to close."
  exit 1
fi

if [ ! -d node_modules ] || [ ! -f dist/index.html ]; then
  echo "BidBoard is not installed yet."
  echo "Double-click Install BidBoard.command first."
  read -r -p "Press Enter to close."
  exit 1
fi

echo "BidBoard is starting. Leave this window open for the whole event."
echo "Closing this window stops BidBoard."
echo
npm start
echo
echo "BidBoard stopped."
read -r -p "Press Enter to close."
