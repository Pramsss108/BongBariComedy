# 🏴‍☠️ BLACK OPS: USER MANUAL (NO-CODER EDITION)

Welcome to the **Black Ops** panel. This is the "Dark Mode" of Word Hacker 404. It gives you access to advanced network tools usually reserved for cybersecurity experts, but simplified into single buttons.

## ⚠️ IMPORTANT: READ BEFORE USE
**These tools are powerful.** Only use them on networks you own or have permission to test.

---

## 🛠️ THE TOOLS EXPLAINED

### 1. ⚡ THE SNIPER (Visual Disconnect)
**What it does:**
It scans your Wi-Fi network and shows you a list of everyone connected (iPhones, Laptops, Smart TVs).
**How to use:**
1. Click **ACTIVATE**.
2. Wait for the scan to finish.
3. You will see a list of devices.
4. (Coming Soon) You can click a device to "kick" it off the Wi-Fi temporarily.

### 2. 📶 THE VACUUM (Password Hunter)
**What it does:**
It listens to the airwaves *without connecting* to any Wi-Fi. It waits for someone else to connect, grabs the "handshake" (a digital key), and tries to figure out the password.
**How to use:**
1. Click **ACTIVATE**.
2. It will listen for 10-60 seconds.
3. If it catches a handshake, it will try to crack it.
4. Look at the logs for `KEY_FOUND: 'password123'`.

### 3. 👻 THE GHOST (Identity Hider)
**What it does:**
Every device has a digital fingerprint called a MAC Address. "The Ghost" changes yours randomly.
**Why use it?**
- To hide your real identity on public Wi-Fi.
- To bypass time limits on free Wi-Fi (e.g., "30 minutes free" -> Change ID -> Get 30 more minutes).
**How to use:**
1. Click **ACTIVATE**.
2. Your computer will briefly disconnect and reconnect as a "new" device.

### 4. 👁️ THE CHAMELEON (Social Engineer)
**What it does:**
It pretends to be a trusted network (like "Starbucks WiFi") to trick devices into connecting to *you* instead of the real one.
**How to use:**
1. Click **ACTIVATE**.
2. It scans for popular networks and clones them.

### 5. ⏳ THE TIME TRAVELER (Downgrade Attack)
**What it does:**
Modern Wi-Fi (WPA3) is very hard to hack. This tool forces routers to use older, weaker security (WPA2) so they can be tested with other tools.
**How to use:**
1. Click **ACTIVATE** to weaken nearby security protocols.

---

## ❓ FAQ

**Q: Why does it say "INITIALIZE" or "ACTIVATE"?**
A: These are heavy tools running inside a Linux engine. "Activate" means you are starting up that specific engine.

**Q: Why do I need a USB Adapter?**
A: Your laptop's built-in Wi-Fi card is designed to *connect* to Wi-Fi, not *hack* it. To "listen" to everyone else (Monitor Mode), you need a special USB antenna (like an Alfa or TP-Link).

**Q: Nothing is happening!**
A: 
1. Make sure you are running the **Desktop App** (`npm run tauri:dev`), not the website.
2. Check the logs at the bottom of the screen.
3. If it says "Command not found", run the `SETUP_BLACK_OPS.ps1` script again.
