#!/bin/bash
cd "$(dirname "$0")"
PROJECT="$(pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed or not on PATH."
  echo "Install Node.js 18 or newer from https://nodejs.org/ and run this installer again."
  read -r -p "Press Enter to close."
  exit 1
fi

echo "Installing BidBoard dependencies..."
npm install || { echo "Install failed."; read -r -p "Press Enter to close."; exit 1; }

echo
echo "Building BidBoard..."
npm run build || { echo "Build failed."; read -r -p "Press Enter to close."; exit 1; }

install_app() {
  local dest="$1"
  local app="$dest/BidBoard.app"
  mkdir -p "$app/Contents/MacOS"
  cat > "$app/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>BidBoard</string>
  <key>CFBundleDisplayName</key>
  <string>BidBoard</string>
  <key>CFBundleIdentifier</key>
  <string>com.bidboard.operator</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleExecutable</key>
  <string>BidBoard</string>
  <key>CFBundleIconFile</key>
  <string>BidBoard</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
</dict>
</plist>
EOF
  cat > "$app/Contents/MacOS/BidBoard" <<EOF
#!/bin/bash
osascript - "$PROJECT" <<'APPLESCRIPT'
on run argv
  set projectPath to item 1 of argv
  tell application "Terminal"
    activate
    do script "cd " & quoted form of projectPath & " && export BIDBOARD_OPEN=1 && printf '\\nBidBoard is starting. Leave this window open for the whole event.\\nClosing this window stops BidBoard.\\n\\n' && npm start"
  end tell
end run
APPLESCRIPT
EOF
  chmod +x "$app/Contents/MacOS/BidBoard"
  mkdir -p "$app/Contents/Resources"
  cp "$PROJECT/src/assets/bidboard.icns" "$app/Contents/Resources/BidBoard.icns"
  set_logo "$app"
}

set_logo() {
  LOGO="$PROJECT/src/assets/bidboard-logo.png" TARGET="$1" osascript -l JavaScript <<'EOF' >/dev/null
ObjC.import('Foundation')
ObjC.import('AppKit')
var env = $.NSProcessInfo.processInfo.environment
var logo = ObjC.unwrap(env.objectForKey('LOGO'))
var target = ObjC.unwrap(env.objectForKey('TARGET'))
var img = $.NSImage.alloc.initWithContentsOfFile(logo)
$.NSWorkspace.sharedWorkspace.setIconForFileOptions(img, target, 0)
EOF
}

echo
echo "Adding BidBoard to the Desktop and Applications..."
install_app "$HOME/Desktop"
mkdir -p "$HOME/Applications"
install_app "$HOME/Applications"
set_logo "$PROJECT/Install BidBoard.command"
set_logo "$PROJECT/Start BidBoard.command"

echo
echo "BidBoard is installed."
echo "Open the BidBoard app on the Desktop or in Applications to run an event."
echo "Leave the Terminal window open while BidBoard is running."
echo
read -r -p "Press Enter to close."
