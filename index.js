#!/usr/bin/env node

/**
 * wave-zoom-mute-sync
 *
 * Connects to the Wave Link local WebSocket API and toggles Zoom's mute
 * whenever the physical mute button on the Elgato Wave 3 is pressed.
 *
 * Requires:
 *   - Elgato Wave Link app running (exposes ws://127.0.0.1:1824)
 *   - Zoom installed
 *   - Zoom's global mute shortcut enabled (Shift+Cmd+A, default)
 */

const WebSocket = require('ws');
const { execFile } = require('child_process');

const WAVELINK_URL = 'ws://127.0.0.1:1824';
const RECONNECT_DELAY_MS = 5000;

function toggleZoomMute() {
  console.log('[wave-zoom-sync] Mute button pressed — toggling Zoom mute');
  execFile('osascript', [
    '-e', 'tell application "System Events"',
    '-e', 'if exists (processes where name is "zoom.us") then keystroke "a" using {shift down, command down}',
    '-e', 'end tell',
  ], (err) => {
    if (err) console.error('[wave-zoom-sync] Failed to toggle Zoom mute:', err.message);
  });
}

function connect() {
  console.log('[wave-zoom-sync] Connecting to Wave Link...');
  const ws = new WebSocket(WAVELINK_URL);

  ws.on('open', () => {
    console.log('[wave-zoom-sync] Ready. Listening for mute button presses...');
  });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    // Wave Link fires microphoneConfigChanged with property "Microphone Mute"
    // whenever the physical mute button is pressed.
    if (
      msg.method === 'microphoneConfigChanged' &&
      msg.params?.property === 'Microphone Mute'
    ) {
      toggleZoomMute();
    }
  });

  ws.on('close', () => {
    console.log(`[wave-zoom-sync] Wave Link disconnected. Retrying in ${RECONNECT_DELAY_MS / 1000}s...`);
    setTimeout(connect, RECONNECT_DELAY_MS);
  });

  ws.on('error', (err) => {
    console.error('[wave-zoom-sync] WebSocket error:', err.message);
    ws.terminate();
  });
}

connect();
