# dsh-task-completion-notify

English | [中文](README.zh.md)

A task-completion notifier plugin for the DeepSeek Harness (dsh) Web GUI: when an agent finishes a task (turn) in a session, a toast pops up at the bottom-right of the window and a short chime plays.

## Features

- **Completion toast** — a card at the bottom-right showing the session title; auto-dismisses after 6 s, click to dismiss early, up to 3 stacked
- **Chime** — a short two-note tone (E5 → A5) synthesized on the fly with Web Audio; no audio assets in the bundle
- **Covers every session** — the current session, background sessions, subagent sessions, and agent-team sessions
- **Localized** — English and Chinese UI copy; styling uses host theme tokens, so light/dark mode follows the app automatically
- **Client-only** — the Host half is a no-op; no session-log or model-behavior changes

## Installation

Install this directory (or the published npm package) through the agent's `plugin_manager` tool or the Web plugin management UI:

```text
plugin_manager action=install_bundle target=<absolute path to this directory>
```

Once installed, the plugin is live for every session in the current profile and survives restarts.

## How it triggers

A notification fires when a session-list row's `running` state flips from `true` to `false`. That state source already merges the Host's live `api-session/status` events with connection-baseline refreshes, so reconnects and page reloads stay correct, and the initial baseline never false-alarms.

## Files

| File | Purpose |
|---|---|
| `package.json` | Package manifest: `dsh.bundle.patch` and `dsh.client` declarations |
| `cordis.patch.yml` | Loader patch that inserts the plugin row |
| `index.js` | Host half (no-op) |
| `client.js` | Client half: state detection, toast rendering, chime synthesis |
| `locale/*.json` | Plugin-inventory display metadata (title/description) |
| `icon.svg` | Plugin icon |

## Notes

- In the desktop app (Electron) the chime plays directly; in an ordinary browser, autoplay policy may require one user interaction with the page first.
- The package installs as a local directory link; `files` does not filter a linked directory.
