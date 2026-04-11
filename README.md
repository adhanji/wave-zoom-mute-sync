# wave-zoom-mute-sync

Syncs the physical mute button on an Elgato Wave 3 microphone with Zoom's mute state on macOS. Press the hardware button — Zoom mutes. Press it again — Zoom unmutes.

Inspired by [nicvenegas/wave-mute-sync](https://github.com/nicvenegas/wave-mute-sync). This version replaces the dependency on Keyboard Maestro (a paid macOS automation tool) with a direct `osascript` call, so it works with no paid software required. Built with Claude Code.

---

## How it works

Elgato's Wave Link app exposes a local WebSocket API on `ws://127.0.0.1:1824`. When the physical mute button is pressed, Wave Link broadcasts a `microphoneConfigChanged` event with `property: "Microphone Mute"`. This script listens for that event and sends Zoom's global mute keyboard shortcut (`Shift+Cmd+A`) via AppleScript.

```
Physical mute button
  → Wave Link (local WebSocket on port 1824)
    → wave-zoom-mute-sync daemon
      → osascript sends Shift+Cmd+A
        → Zoom mute toggled
```

### Sync scope

| Action | Works? |
|--------|--------|
| Wave 3 button → Zoom mute | ✅ |
| Zoom keyboard shortcut (`Shift+Cmd+A`) → Wave 3 LED | ✅ (OS-level sync) |
| Zoom UI mute button → Wave 3 LED | ❌ (Zoom exposes no API for this) |

**Recommendation:** use the Wave 3 physical button as your single source of truth for muting. Avoid clicking the mute button inside Zoom's UI to keep states in sync.

---

## Requirements

- macOS
- [Elgato Wave Link](https://www.elgato.com/us/en/s/wave-link) installed and running
- [Node.js](https://nodejs.org) (v18+)
- Zoom installed with the global mute shortcut enabled (`Shift+Cmd+A`)

---

## Installation

**1. Clone the repo**
```bash
git clone https://github.com/aleemdhanji/wave-zoom-mute-sync.git
cd wave-zoom-mute-sync
```

**2. Install dependencies**
```bash
npm install
```

**3. Enable Zoom's global mute shortcut**

In Zoom: `Settings → Keyboard Shortcuts → Mute/Unmute My Audio` → check **Enable Global Shortcut**.

**4. Load the launchd service (auto-starts on login)**
```bash
cp com.user.wave-zoom-mute-sync.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.user.wave-zoom-mute-sync.plist
```

> **Note:** The plist file references Node.js at `/usr/local/bin/node` (Homebrew default on Intel Macs). If your Node.js is at a different path, update the `ProgramArguments` entry in the plist before loading it. Run `which node` to check.

---

## Shell aliases (recommended)

Add these to your `~/.zshrc` for easy control:

```bash
alias wave-start='launchctl load ~/Library/LaunchAgents/com.user.wave-zoom-mute-sync.plist'
alias wave-stop='launchctl unload ~/Library/LaunchAgents/com.user.wave-zoom-mute-sync.plist'
alias wave-restart='wave-stop; wave-start'
```

Then reload your shell:
```bash
source ~/.zshrc
```

### Commands

| Command | Description |
|---------|-------------|
| `wave-start` | Start the daemon (also runs automatically at login) |
| `wave-stop` | Stop the daemon |
| `wave-restart` | Stop and restart the daemon (useful after updating the script) |

---

## Troubleshooting

**Check if the daemon is running:**
```bash
launchctl list | grep wave-zoom
# A PID in the first column means it's running
```

**Watch live logs:**
```bash
tail -f ~/wave-zoom-mute-sync/output.log
# Should show "Ready. Listening for mute button presses..."
```

**Mute got out of sync** (button mutes when you expect unmute):
Press the Wave 3 button once to toggle both back into alignment.

**Wave Link wasn't open when the daemon started:**
The daemon retries every 5 seconds — it will reconnect automatically once Wave Link is running.

**Nuclear reset:**
```bash
wave-stop
pkill -f wave-zoom-mute-sync
wave-start
```

---

## Credits

Based on the approach from [nicvenegas/wave-mute-sync](https://github.com/nicvenegas/wave-mute-sync). The original project required Keyboard Maestro to handle the Zoom keystroke. This version removes that dependency by calling `osascript` directly, and uses the `microphoneConfigChanged` WebSocket event (discovered by inspecting the live Wave Link API) instead of the settings-comparison approach.
