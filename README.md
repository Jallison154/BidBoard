# BidBoard

BidBoard is a control room for live auctions, charity galas, and paddle raises. An operator types a bidder's paddle number, and the matching bidder number and name appear full-screen on a separate audience display (a second monitor, projector, or LED wall). An optional local server lets phones and tablets act as extra remote controls on the same network.

The core app runs entirely in the browser: no account, no cloud service, no required backend. Bidder lists, display branding, and event history are saved locally and persist across refreshes, so it keeps working through the whole event even without an internet connection. The mobile-remote feature is the one addition that needs a small local server — see [Mobile & Tablet Remote](#mobile--tablet-remote) below — but everything else keeps working normally with or without it.

## What it does

- **Operator Control** — a dark, keyboard-first console for looking up bidders and sending them to the screen, with a live output preview of exactly what the audience sees.
- **Audience Display** — a distraction-free, full-screen view (opened in its own window) showing just the bidder number and name, styled to be readable from across a room.
- **Mobile Remote** *(optional)* — a phone/tablet-friendly keypad that submits bidder numbers to the operator over the local network, with configurable approval modes and per-device permissions.

The operator and audience windows talk to each other instantly over `BroadcastChannel` (same computer, no server needed), with a live connection indicator and automatic resync if the audience window is reopened.

## Installation

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
```

## Development commands

```bash
npm run dev
```

Opens the app with hot reload at `http://localhost:5173`. This alone is enough to use BidBoard on a single computer (operator + audience display via `BroadcastChannel`) — no server required.

To also test the mobile remote during development, run the local server alongside Vite:

```bash
npm run dev:all
```

This starts the Vite dev server (port 5173) and the remote-control server (port 3001) together. Other useful commands:

```bash
npm run lint        # oxlint
npm run test        # run the test suite once
npm run test:watch  # run tests in watch mode
```

## Production build & deployment

```bash
npm run build
npm start
```

`npm run build` type-checks the project and builds the static frontend into `dist/`. `npm start` runs the local Node server, which serves that build **and** hosts the WebSocket server the mobile remotes connect to, both on the same port (`3001` by default; override with the `PORT` environment variable).

Open `http://localhost:3001/` on the operator computer — that's the full app, working exactly as it does in `npm run dev`, with the remote feature available if you choose to turn it on.

### Running it live at an event (Windows & macOS)

1. **Start BidBoard.** On the operator's laptop, open a terminal in the project folder and run `npm run build` once, then `npm start`. Leave that terminal window open for the whole event.
2. **Allow it through the firewall.** The first time you run it, your OS will likely prompt to allow incoming network connections for Node — click **Allow** (this is what lets phones on the same Wi-Fi reach it).
   - *Windows:* if you miss the prompt, open **Windows Defender Firewall → Allow an app through firewall**, find Node.js, and check both Private and Public.
   - *macOS:* if you miss the prompt, open **System Settings → Network → Firewall → Options**, find Node, and set it to Allow.
3. **Put every device on the same network.** The operator computer and every phone/tablet remote must join the same Wi-Fi network (a simple travel router or hotspot is enough — no internet connection is required, only a shared local network).
4. **Open the remote page.** In BidBoard's Settings → Remote tab, turn on **Remote Access**, then either read out the **Remote URL** or have each device scan the **QR code**.
5. **Enter the session PIN** on the device (skipped automatically if it joined via the QR code).
6. **Test it before doors open.** Submit a test bidder number from the remote and confirm it reaches the operator and (in Direct Show mode) the audience display.

A startup script isn't required — `npm start` is the whole production entry point — but you can wrap it in a shortcut/`.command` file if you'd like a one-click launch.

## First launch (operator app)

On first launch, BidBoard walks you through:

1. Naming your event.
2. Starting with a demo bidder list, importing a file, or starting empty.
3. Picking a display preset.

You can skip this at any time and set things up manually from the header and side panels.

## Importing a bidder list

From the **Bidder List** panel, click **Import**, then either drag a file onto the drop zone or choose one manually.

- Supported formats: **CSV**, **XLSX**, and **XLS**.
- BidBoard tries to auto-detect the bidder number and name columns from common headers (`Bidder Number`, `Paddle Number`, `Card Number`, `Guest Name`, `Display Name`, `First Name`/`Last Name`, `Company`, `Organization`, etc.). You can override any of these before importing.
- If your file has separate first/last name columns, check "Combine separate First Name / Last Name columns" to merge them.
- If a company/organization column exists, choose whether the display name uses the person's name, the company name, or both.
- Rows missing a bidder number are skipped and reported. Rows missing a name are still imported (so you can fix them later) and reported. Duplicate bidder numbers are flagged, never silently merged.
- Choose whether to **add** the imported bidders to the current list or **replace** it entirely.

### Example CSV format

```csv
Bidder Number,Display Name
101,Alex Johnson
154,Mountain View Construction
203,Maria Garcia
254,John & Sarah Smith
312,Billings Community Foundation
```

Bidder numbers are always treated as text, so values like `007`, `A254`, or `VIP-12` keep their exact formatting.

You can also add, edit, delete, and search bidders manually at any time, and export the current list back to CSV from the same panel.

## Running the show

1. Type a bidder number into the large input and press **Enter**.
2. The match appears in the **preview** area — check (and correct, if needed) the name before it goes on screen. This is a *staged* preview only; the audience display and the Live Output panel don't change yet.
3. Press **Enter** again, or click **Show**, to send it live. A red **LIVE** badge appears, the Live Output preview updates immediately, and the input clears and refocuses automatically.

Toggle **Auto Show** to skip the preview step: a single **Enter** on a unique match sends it straight to the screen. Auto Show is visually unmistakable (a pulsing amber pill) so it's never left on by accident.

If a number isn't found, the audience display is left untouched, a warning appears, and you can type a name manually and display it anyway. If a number matches more than one bidder, you're asked to pick the correct one — BidBoard never guesses.

## Live Output preview

The operator screen includes a **Live Output** panel showing exactly what the audience display is currently showing — same component, same settings, live-synced over the same channel, so it can never drift out of sync with the real screen. It works even if no external audience window is open yet.

- A colored status dot shows **green** (a real external audience window is connected), **yellow** (the preview is live but no external window is connected yet — normal before you open one), or **red** (this browser doesn't support the messaging BidBoard relies on).
- The detected resolution of the connected external display is shown when available.
- **Safe-area guides** (checkbox above the preview) overlay reference margins on the *operator's* preview only — they never appear on the real audience screen.

## Opening the audience display

Click **Open Audience Display** (or press `F`). This opens BidBoard's audience view in a new browser window.

**To put it on a second monitor, projector, or LED wall:**

1. Drag the new window onto the target screen.
2. Click into that window and enter full-screen mode:
   - **Windows/Linux/Chrome OS:** `F11`
   - **macOS (Chrome/Edge/Firefox):** `Cmd + Ctrl + F` (or the green fullscreen button)
   - **Safari:** the green traffic-light button, or `Cmd + Ctrl + F`

The operator window shows a live **Connected / Not Connected** indicator for the audience display, and warns you if it can't be reached (for example, if it was closed). Reopening it with the same button resyncs everything automatically — no need to touch the bidder list or settings again.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Any letter/number | Focus the bidder input and start typing |
| `Enter` | Look up the number, or show the previewed bidder |
| `Escape` | Clear the current input/preview |
| `Space` | Show the previewed bidder (when the input is empty) |
| `C` | Clear the audience display (when the input is empty) |
| `F` | Open or focus the audience display window |
| `↑` / `↓` | Cycle through recently displayed bidders |

Shortcuts are automatically disabled while you're typing in any other text field (settings, event names, bidder edits), so they never interrupt normal editing.

## Display customization

Open **Settings** (gear icon) to adjust:

- **Presets:** BidBoard Dark, Clean White, Event Gold, High Contrast, or Custom.
- **Display:** colors, font, weights, alignment, sizing, spacing, transitions, and waiting/clear behavior.
- **Branding:** upload a logo (PNG/JPG/SVG/WebP), and choose its size and position.
- **Event:** the title/subtitle shown on the audience screen.
- **Safety:** confirmation prompts, Auto Show restrictions, and locks for display settings or the bidder list during a live event.
- **Remote:** everything related to mobile remotes — see below.

Changes apply to the audience display (and the Live Output preview) immediately, even if it's already open.

## Events

BidBoard can hold multiple saved events (each with its own bidder list, display settings, logo, and history). From the event menu (event name in the header) you can create, duplicate, rename, delete, export, and import events. Exported events are portable `.bidboard.json` files with no cloud dependency.

## Mobile & Tablet Remote

A phone or tablet can act as an additional keypad for entering bidder numbers, over the venue's local Wi-Fi — no internet connection required. This needs the local server described above (`npm start`, or `npm run dev:all` in development); everything else in BidBoard keeps working normally whether or not the server is running or any remotes are connected.

### Setting it up

In **Settings → Remote**:

- **Remote Access** — off by default. Turn it on to let devices connect.
- **Session PIN** — a random 6-digit code remotes type in to connect. **Regenerate PIN** invalidates the old one instantly.
- **QR code** — scanning it opens the remote page and connects automatically with a temporary token, skipping manual PIN entry. Regenerating the PIN also issues a fresh token.
- **Remote URL / detected addresses** — shown for reading aloud or typing manually if a device can't scan the code. If no address is detected automatically, find the operator computer's IP manually:
  - *Windows:* open Command Prompt and run `ipconfig`, look for "IPv4 Address".
  - *macOS:* open **System Settings → Network**, select the active connection, and read the IP address (or run `ipconfig getifaddr en0` in Terminal).
- **Stop accepting new connections** — keeps already-connected remotes working while blocking any new device from joining.
- **Remote Mode** — controls what happens when a remote submits a bidder:
  - **Approval Required** *(default, safest)* — the operator sees the request and must tap **Approve and Show**, **Preview**, or **Reject** before anything changes.
  - **Send to Preview** — the submission stages into the operator's own preview; the operator still presses Show.
  - **Direct Show** — a valid, unique bidder number goes live immediately.
- **Allow Operator Remote devices to clear the display** — off by default; only devices with the *Operator Remote* permission can clear, and only when this is on.
- **Connected Remotes** — shows each device's name, connection/activity time, and a permission dropdown, plus a Disconnect button. **Disconnect All** drops every remote at once.

### Remote permissions

Every new device defaults to **Keypad Only**. The operator can change any connected device's permission at any time:

| Permission | Can do |
| --- | --- |
| Keypad Only | Submit bidder numbers, view the current live bidder |
| Operator Remote | Everything above, plus clear the display (if allowed) |
| View Only | View the current live bidder only — cannot submit anything |

A Keypad Only or View Only remote never receives the full bidder list or event data — only the bidder it submitted, the current live bidder, and status messages. The bidder list and event configuration always stay under the operator's browser; remotes can't view or change them directly.

### Using the remote

1. Open the remote URL on a phone or tablet (or scan the QR code).
2. Enter a name (e.g. "Auctioneer", "Spotter") — this is what the operator sees for that device.
3. Enter the PIN (skipped if joined via QR code) and tap **Connect**.
4. Use the on-screen keypad to enter a bidder number, then tap **Show**.
5. Depending on the remote mode, you'll see the bidder go live immediately, get staged into the operator's preview, or show "Waiting for operator approval…" until the operator responds.
6. A **Currently Live** section always shows what's actually on the audience screen right now, updating instantly no matter who changed it.

If a device has the *Operator Remote* permission and clearing is allowed, a **Clear Display** button appears — it requires a deliberate press-and-hold to avoid accidental taps.

### Reliability

- The remote shows **Connected**, **Reconnecting…**, or **Disconnected** and reconnects automatically after a Wi-Fi hiccup.
- Every submission gets a unique ID; the number you typed stays on screen (not cleared) until the server confirms what happened, and a resubmitted request after a reconnect is deduplicated rather than processed twice.
- If the remote loses its connection completely, the operator app and the audience display keep working normally — the remote is purely an input device, never a dependency.
- If the *operator's* browser isn't connected to the server, remote submissions fail clearly ("The main BidBoard operator is not connected") instead of hanging silently.

### Security notes

This is designed for a trusted local event network, not the public internet:

- Remote access is off by default and must be explicitly enabled per event.
- Remotes must supply the current session PIN or a short-lived QR token; repeated incorrect PIN attempts are rate-limited.
- The PIN and QR token can be regenerated at any time, instantly invalidating the old ones (existing connected devices are unaffected until disconnected).
- All server state (PIN, connected devices, pending requests) lives only in memory for the current run — nothing is written to a database, and restarting the server clears it.
- The server accepts connections from any device on the network that presents its current PIN/token — don't expose port 3001 to the public internet (e.g. via port forwarding).

## Manual bidder management

Allow the operator to add, edit, delete, and search bidders directly from the Bidder List panel, and export the corrected list as CSV — all changes are saved locally in the browser automatically.

## Recent history

The **Recently Displayed** panel keeps at least the last 20 bidders shown, each with a **Redisplay** button, and a **Clear History** action (with confirmation). Rapid accidental repeats of the same bidder within a few seconds collapse into a single entry; explicit redisplay always registers.

## Automated tests

```bash
npm run test
```

Covers:

- Bidder-number normalization and leading-zero preservation
- Bidder lookup and duplicate detection
- CSV import, column mapping, and missing-field warnings
- Recent-history de-duplication and capping
- Event save/load persistence
- Operator↔audience display message synchronization (including the embedded live-preview role)
- Remote server: PIN/token authentication, rate limiting, Direct/Preview/Approval submission flows, duplicate-request protection, permission enforcement, clear-display permission, and multi-remote/disconnect handling

## Manual test checklist

Some behavior can only be verified by hand:

**Core app**
- [ ] Dual-display operation: open the audience window, move it to a second monitor, and confirm bidders sent from the operator appear instantly.
- [ ] Full-screen audience display on an external screen/projector.
- [ ] Refresh the operator window mid-event and confirm the bidder list, settings, and history are all still there.
- [ ] Display a bidder with a very long name and confirm it shrinks to fit without wrapping past two lines.
- [ ] Look up a bidder number that doesn't exist and confirm the display doesn't change.
- [ ] Import a list with a duplicate bidder number and confirm looking it up asks you to choose.
- [ ] Close the audience window, confirm the operator shows "Not Connected," then reopen it and confirm it resyncs without touching the bidder list.
- [ ] Import both a CSV and an XLSX file with the same data and confirm identical results.
- [ ] Disconnect from the network after loading the app and confirm normal operation continues.

**Mobile remote**
- [ ] Connect a remote from iPhone Safari, Android Chrome, and iPad Safari.
- [ ] Connect the desktop operator browser as a second, separate device to confirm multiple remotes work simultaneously.
- [ ] Submit an unknown bidder number from a remote and confirm the audience display doesn't change.
- [ ] Submit a duplicate bidder number from a remote and confirm it tells the user to resolve it on the main screen.
- [ ] Test all three remote modes (Approval Required, Send to Preview, Direct Show).
- [ ] Turn Wi-Fi off and back on on the remote device mid-session and confirm it reconnects and doesn't double-submit.
- [ ] Close the audience window while a remote is connected and confirm the remote and operator keep working.
- [ ] Refresh the main operator browser and confirm connected remotes reconnect on their own.
- [ ] Restart the server (`npm start`) and confirm the operator and remote both recover after reconnecting.
- [ ] Block port 3001 in the firewall temporarily and confirm the remote clearly shows it can't connect.

## Supported browsers

Any recent evergreen browser: Chrome, Edge, Firefox, or Safari (desktop and mobile). The audience display and live preview rely on `BroadcastChannel`, supported in all of these; the operator UI shows a warning if it's unavailable. The mobile remote needs WebSocket support, also standard in all modern mobile browsers.

## Offline-use notes

The core app (bidder list, operator console, audience display) needs no network connection once the page has loaded — everything lives in local browser storage and cross-window messaging happens directly in the browser. The mobile remote is the exception: it needs the local server and a shared local network (not the internet) to reach the operator computer.

## Troubleshooting

- **Audience display shows "Not Connected":** Make sure the audience window is still open (browsers may fully unload closed windows). Click **Open Audience Display** again — it will resync instantly. If it's been unfocused/minimized a long time, some browsers slow its background timers; bringing it into view resolves this.
- **Bidder list disappeared after a refresh:** Bidder lists save to local browser storage automatically. If it does happen, check that your browser isn't in a private/incognito mode that clears storage on close, and that site storage hasn't been cleared.
- **Import says a file has no bidders:** Confirm the file has a header row and at least one data row, and that a bidder number column was selected correctly in the import preview.
- **Logo looks blurry or is cut off:** Upload a higher-resolution image, or adjust the logo size/position in Settings — logos always preserve their aspect ratio.
- **Numbers with leading zeros aren't matching:** Bidder numbers are matched exactly as entered (after trimming whitespace and ignoring case), so `007` and `7` are treated as different bidders by design.
- **A phone can't reach the remote page:** Confirm both devices are on the same Wi-Fi network, the server is running (`npm start`), and the firewall is allowing Node (see the deployment steps above). Try the IP address shown in Settings → Remote instead of the QR code as a fallback.
- **The remote says "Incorrect PIN" or is rate-limited:** Double-check the PIN currently shown in Settings → Remote — it changes whenever regenerated. After several wrong attempts, wait for the cooldown shown in the error message.
- **Remote submissions never resolve:** Confirm the operator's browser tab is open and connected (Settings → Remote shows the server as reachable). If the operator's browser was closed, submissions fail with a clear "operator not connected" message rather than hanging forever.

## Project structure

```
src/
  types.ts                    Shared TypeScript types (bidders, events, display settings)
  shared/socketTypes.ts       Client↔server WebSocket contract (used by both src/ and server/)
  lib/                        Business logic (normalization, lookup, import, storage, channel)
  hooks/                      React hooks (operator console, display channel, remote server/connection)
  context/AppContext.tsx      Event/bidder/settings state, persisted to localStorage
  components/operator/        Operator Control UI, including Live Output preview and Remote settings
  components/audience/        Audience Display UI
  components/remote/          Mobile remote UI
server/
  index.ts                    Express + Socket.IO entry point; serves the built frontend in production
  socketServer.ts             All WebSocket event handling
  state.ts                    In-memory session state (PIN, remotes, pending requests) — no database
  rateLimiter.ts, network.ts, qr.ts   Supporting utilities
```

## What BidBoard intentionally doesn't do

No accounts, no logins, no payments, no cloud sync, and no external database — bidder lists and event data stay on the operator's machine unless explicitly exported, and the remote server's own state is purely in-memory for the current run.
