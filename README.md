# Research Notes Lite

A local-first, markdown-based research note application. Single-page editor with folder organization, live preview, math (KaTeX), diagrams (Mermaid), and dark mode.

---

## Requirements

- **Node.js** 20+
- **pnpm** 9+

---

## Installation

### macOS

```bash
# 1. Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install Node.js
brew install node

# 3. Install pnpm
npm install -g pnpm

# 4. Clone and install dependencies
git clone <repo-url> research-note
cd research-note
pnpm install
```

### Linux (Ubuntu / Debian)

```bash
# 1. Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install pnpm
npm install -g pnpm

# 3. Clone and install dependencies
git clone <repo-url> research-note
cd research-note
pnpm install
```

### Windows

```powershell
# 1. Install Node.js — download installer from https://nodejs.org
#    Or use winget:
winget install OpenJS.NodeJS.LTS

# 2. Install pnpm (run in PowerShell)
npm install -g pnpm

# 3. Clone and install dependencies
git clone <repo-url> research-note
cd research-note
pnpm install
```

---

## Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The server binds to `0.0.0.0` so it's accessible from other devices on the same network.

---

## Production Build

```bash
pnpm build
pnpm start
```

---

## Running as a Daemon

For always-on background operation, use **PM2** — a cross-platform Node.js process manager.

### Install PM2

```bash
npm install -g pm2
```

### macOS / Linux

```bash
# Build first
pnpm build

# Start with PM2
pm2 start "pnpm start" --name research-note

# Auto-start on system boot
pm2 startup        # follow the printed command
pm2 save
```

Useful PM2 commands:

```bash
pm2 status          # list running processes
pm2 logs research-note   # tail logs
pm2 restart research-note
pm2 stop research-note
pm2 delete research-note
```

### Linux — systemd (alternative)

Create `/etc/systemd/system/research-note.service`:

```ini
[Unit]
Description=Research Notes Lite
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/research-note
ExecStart=/usr/bin/node node_modules/.bin/next start
Restart=on-failure
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable research-note
sudo systemctl start research-note

# Check status
sudo systemctl status research-note
sudo journalctl -u research-note -f
```

### macOS — launchd (alternative)

Create `~/Library/LaunchAgents/com.research-note.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.research-note</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>node_modules/.bin/next</string>
    <string>start</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/path/to/research-note</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key>
    <string>production</string>
    <key>PORT</key>
    <string>3000</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/research-note.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/research-note.err</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.research-note.plist

# Stop / unload
launchctl unload ~/Library/LaunchAgents/com.research-note.plist
```

### Windows — PM2 (recommended)

```powershell
pnpm build
pm2 start "pnpm start" --name research-note

# Auto-start on login (run in Administrator PowerShell)
pm2 startup
pm2 save
```

---

## Port Configuration

The default port is `3000`. To change it:

```bash
# One-time
PORT=4000 pnpm start

# In PM2
pm2 start "pnpm start" --name research-note -- --port 4000
```

---

## Notes Directory

All notes are stored in the `notes/` directory inside the project root. Back this up to preserve your data.
