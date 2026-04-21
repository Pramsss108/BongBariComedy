# 🔥 Vibe Code From Anywhere — BongBari Remote Setup Guide

## TWO Different URLs (Don't Mix Them Up!)

| URL | What It Is | What You'll See |
|---|---|---|
| `vscode.dev/tunnel/dopamine` | **VS Code Editor** (where you CODE) | Full VS Code with Copilot, files, terminal |
| `ht0d2xqt-5173.inc1.devtunnels.ms` | **Site Preview** (port forward) | The actual BongBari website running |

**To code remotely → always use `vscode.dev/tunnel/dopamine`**

---

## 🚀 One-Time Setup (Already Done!)

The startup file is saved at:
```
C:\Users\guita\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\bongbari-tunnel.bat
```

This means:
- Every time Windows boots or you log in → tunnel starts automatically
- No manual action needed ever again
- If tunnel crashes → it retries every 5 seconds automatically

---

## 📱 Save This to Your Phone / Browser Bookmarks

### 👨‍💻 VS Code Editor (For Coding)
```
https://vscode.dev/tunnel/dopamine/d%3A%2Fbarir%20Mashla%2Fwebsite%2FBongBariComedy%2FBongBariComedy
```
> Or just: `https://vscode.dev/tunnel/dopamine` then it opens your workspace

### 🌐 Site Preview (To See The Running Site)
```
https://ht0d2xqt-5173.inc1.devtunnels.ms
```
> This URL may change each session. Get the current one from VS Code → Ports tab.

---

## 🖥️ What Happens Each Time You Open VS Code (PC)

1. VS Code opens → **tunnel auto-starts** (startup task runs silently)
2. Dev servers also auto-start (the "Start dev servers" task runs on folder open)
3. You can immediately go to `vscode.dev/tunnel/dopamine` from any device

**You don't need to do anything manually.**

---

## 🍎 iOS / iPhone "Pro" Setup (No App Required!)

You **do not need to install any app** from the App Store. VS Code runs entirely inside Safari! 

For the ultimate full-screen Vibe Coding setup on iOS:
1. Open **Safari** and go to `https://vscode.dev/tunnel/dopamine`
2. Tap the **Share icon** (the square with an arrow pointing up at the bottom of Safari)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add** in the top right.

Now you have a "VS Code" app icon on your iPhone home screen! When you open it from there, it hides the Safari URL bar and gives you 100% full-screen native-app coding space.

**Pro-Tip for iOS Keys:** 
Since you don't have `Ctrl + Alt + I` on a phone keyboard:
- To open Copilot Chat: Tap the **Chat Icon** in the left sidebar.
- To open the Command Palette: Tap the **Search Bar area** at the very top middle of the screen, or tap the three dots `...` or gear icon ⚙️ at the bottom left.

---

## 📲 How To Access From Phone/iPad/Any Browser

1. Open browser → go to `https://vscode.dev/tunnel/dopamine`
2. Sign in with your **GitHub account** (same one as the repo: `Pramsss108`)
3. VS Code loads in the browser — full editor, Copilot, terminal, everything
4. You have full access to `D:\barir Mashla\website\BongBariComedy\BongBariComedy`

---

## 💬 Getting Copilot/AI Chat in Browser VS Code

In the browser VS Code:
- Press `Ctrl + Alt + I` → Opens Copilot Chat
- Press `Ctrl + Shift + P` → Command Palette (run any command)
- Click the chat icon in the left sidebar → "Build with Agent"

**This is where you vibe code remotely** — same Copilot, same codebase.

---

## ⚠️ Troubleshooting

### Tunnel not connecting?
Your PC must be ON and logged in. The tunnel only works when your Windows PC is running.

### "Tunnel offline" error?
Open VS Code on your PC and run in terminal:
```
code tunnel --name dopamine
```

### Port preview URL changed?
In VS Code → bottom bar → click **"Ports"** tab → copy the forwarded URL for port 5173.

### Want to manually start tunnel right now?
```powershell
Start-Process "cmd.exe" -ArgumentList '/c "C:\Users\guita\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd" tunnel --accept-server-license-terms --name dopamine'
```

---

## 🔒 Security Note

The tunnel is secured by GitHub OAuth — only **you** can access it (whoever is logged into GitHub in the browser).

---

## ✅ Quick Checklist

- [ ] PC is ON and logged into Windows
- [ ] Go to `vscode.dev/tunnel/dopamine`  
- [ ] Sign in with GitHub (`Pramsss108`)
- [ ] Press `Ctrl + Alt + I` for Copilot
- [ ] Open terminal → `npm run dev:live` → start coding 🔥

---

## ?? How to "Sync" Your Chat History (The Agentic Way)

Currently, GitHub Copilot **does not sync actual chat bubbles** between your PC and your phone/browser. The chat window is local to whichever device you are holding.

But as a Vibe Coder, you don't need the chat history! You use the **Agentic Handoff** method.

### The "Handoff" Workflow:
1. **Before leaving your PC:** Tell the agent to write down what it just did and what's next. 
   *(Example: "Write our current progress and next steps into HANDOFF.md")*
2. **When you open your phone:** Start a fresh chat and tell the agent: 
   *(Example: "Read HANDOFF.md and continue where we left off.")*

Because the **files** sync perfectly through the tunnel, the agent on your phone will instantly know exactly what to do, without needing the old chat history!
