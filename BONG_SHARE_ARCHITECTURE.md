# Bong Share — Architecture & Link Generation Flow
> *Vibe Coder Breakdown — How the magic works under the hood*

---

## 🎯 What is Bong Share?

A **free, unlimited file transfer tool** built into Bong Bari's website. Users drag-drop any file (up to 10GB), get a shareable download link instantly. Zero storage cost for us. Comedy-branded with rotating Bengali jokes.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 USER'S BROWSER                       │
│                                                      │
│  1. User drops file on BongShare page               │
│  2. React calls GoFile API to get best server       │
│  3. XHR uploads file directly to GoFile CDN         │
│  4. GoFile returns download link                    │
│  5. User copies link & shares with friend           │
│                                                      │
│  ┌──────────┐     ┌──────────────┐                  │
│  │ BongShare│────>│ GoFile API   │                  │
│  │ React UI │<────│ (Free, Public│                  │
│  └──────────┘     │  REST API)   │                  │
│                   └──────────────┘                  │
│                                                      │
│  💡 OUR SERVER NEVER TOUCHES THE FILE               │
│     (Zero bandwidth, zero storage cost)             │
└─────────────────────────────────────────────────────┘
```

---

## 🔗 How Link Generation Works (Step-by-Step)

### Phase 1: Server Discovery
```
GET https://api.gofile.io/getServer
→ Response: { "status": "ok", "data": { "server": "store14" } }
```
GoFile has many storage nodes worldwide. This call finds the **least-loaded server** for fastest upload.

### Phase 2: File Upload (XHR with Progress)
```
POST https://store14.gofile.io/uploadFile
Content-Type: multipart/form-data
Body: { file: <the actual file bytes> }
```
- We use `XMLHttpRequest` (not fetch) because XHR gives us **real-time upload progress** via `xhr.upload.onprogress`
- The file goes **directly from the user's browser to GoFile's CDN** — our Render backend is never involved
- Works for files up to **10GB+** (GoFile has no practical limit for free uploads)

### Phase 3: Link Received
```json
{
  "status": "ok",
  "data": {
    "downloadPage": "https://gofile.io/d/abc123",
    "code": "abc123",
    "fileName": "my_video.mp4",
    "md5": "a1b2c3d4...",
    "fileId": "xxxxx"
  }
}
```
The `downloadPage` URL is what we show to the user. Anyone with this link can download the file.

### Phase 4: User Shares the Link
The link is displayed in the glass panel UI. User can:
- **Copy to clipboard** (one click)
- **Open in new tab** to verify it works
- Send the link via WhatsApp, email, anywhere

---

## ⏱️ File Lifecycle & Auto-Delete

| Event | What Happens |
|-------|-------------|
| Upload complete | File is live on GoFile CDN |
| Someone downloads | 10-day timer resets |
| No downloads for 10 days | File auto-deleted by GoFile |

**This is actually perfect for Bong Bari** — we're a transfer tool, not a storage service. No legal liability for hosting files permanently.

---

## 💰 Cost Breakdown

| Resource | Cost |
|----------|------|
| GoFile API | **$0 forever** (free public API) |
| GoFile storage | **$0** (they monetize via ads on download page) |
| Our server bandwidth | **$0** (file never touches our backend) |
| CDN/hosting | **$0** (already on GitHub Pages) |
| **Total** | **$0/month** |

---

## 🛡️ Security Model

- **No server-side storage** → nothing to hack on our end
- **GoFile handles encryption** → files encrypted at rest on their CDN
- **No authentication required** → anyone can upload (keeps it friction-free)
- **Links are unguessable** → random codes like `abc123` with high entropy
- **Auto-delete** → files don't persist forever (reduces liability)

---

## 📁 Code Map

| File | Purpose |
|------|---------|
| `client/src/pages/BongShare.tsx` | Main UI — drop zone, progress, link display, jokes |
| `client/src/lib/gofile-engine.ts` | GoFile API client — server discovery + XHR upload |
| `client/src/App.tsx` | Route `/tools/share` → BongShare (nav hidden) |

---

## 🎭 Comedy Integration

The page rotates Bengali jokes contextually:
- **Idle state**: Jokes about file sizes, WhatsApp limits, pendrive hunting
- **Uploading**: Jokes about internet speed, patience, server strength  
- **Success**: Victory jokes, tech-savvy flexing, sharing karma

Jokes rotate every 5 seconds with smooth fade animations.

---

## 🚀 Future: P2P WebRTC (Path B)

If we ever want **zero-server file transfer** (no GoFile dependency):

```
┌──────────┐   WebRTC DataChannel   ┌──────────┐
│ Sender's │ ◄═══════════════════► │ Receiver │
│ Browser  │   (direct P2P pipe)    │ Browser  │
└──────────┘                        └──────────┘
     │                                    │
     └── PeerJS signaling server ─────────┘
         (just for initial handshake)
```

**How P2P link generation would work:**
1. Sender opens BongShare → PeerJS generates a unique peer ID (e.g., `bb-x82k9sh2`)
2. App creates shareable link: `bongbari.com/tools/share?p=bb-x82k9sh2`
3. Receiver opens that link → PeerJS connects browsers directly
4. File streams through WebRTC DataChannel — **never touches any server**
5. **Catch**: Sender must keep tab open until transfer completes

**When to use P2P vs GoFile:**
| Feature | GoFile (Current) | WebRTC P2P (Future) |
|---------|-----------------|-------------------|
| Sender can close tab? | ✅ Yes | ❌ Must stay open |
| Works behind strict NAT? | ✅ Always | ⚠️ Sometimes needs TURN |
| File size limit | ~10GB | Unlimited |
| Download link shareable? | ✅ Anyone, anytime | ❌ Only while sender online |
| Cost | $0 | $0 (or small TURN cost) |

**Recommendation**: GoFile is the right choice for Bong Bari. Users want "upload → get link → close tab → walk away." P2P is great for power users but bad UX for casual comedy fans.

---

*Built with ❤️ by Bong Bari's Vibe Coder army. "Churi emon koro jate na dhoro poro."*
