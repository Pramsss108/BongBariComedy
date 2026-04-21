# NGL Dashboard — Settings Cleanup v4

**Date:** April 2026  
**Problem:** WhatsApp verification card, phone status text, and logout clutter the dashboard. The Play tab has too much noise. Non-premium users see warnings inline that break the clean flow.

---

## Competitor Research

| App | Settings Pattern | Verification/Phone | Logout |
|---|---|---|---|
| **NGL.link** | Gear icon top-right → opens settings drawer | Phone verified badge only, setup hidden in settings | Inside settings drawer |
| **Instagram** | ☰ hamburger top-right → Settings page | Phone/email verified in Settings > Security | Deep in Settings > Log Out |
| **Tellonym** | Gear icon top-right → Settings page | Verified badge next to name, setup inside settings | Inside settings |
| **Snapchat** | Bitmoji (avatar) → profile page → gear icon | Phone verification inside Settings > Mobile Number | Inside Settings |
| **Discord** | Gear icon bottom-left → User Settings | Phone in User Settings > My Account | At bottom of settings page |

**Universal pattern:** 
1. Settings = gear icon ⚙️ in top bar
2. Verification/phone = HIDDEN inside settings, not on main dashboard
3. Logout = inside settings, never in top bar
4. Red badge on gear = pending action needed (like unverified phone)
5. Only AFTER verification is complete does a subtle ✓ appear on the main dashboard

---

## 20-Phrase Plan

1. **Add `showSettings` state** — boolean, controls a slide-in settings drawer/panel.
2. **Gear icon replaces logout** in top bar — 24px, white/40, position where logout was.
3. **Red dot badge on gear** — when `phoneStatus !== 'verified'`, show a 6px pulsing red dot on top-right of gear.
4. **Settings drawer** — slide-in from right, dark glass panel, covers ~60% width on mobile.
5. **Inside settings drawer:** WhatsApp verification card (moved from Play tab).
6. **Inside settings drawer:** Phone status line (moved from Play tab).
7. **Inside settings drawer:** Theme picker button.
8. **Inside settings drawer:** Language toggle.
9. **Inside settings drawer:** Sound mute toggle.
10. **Inside settings drawer:** Logout button — red, bottom of drawer.
11. **Inside settings drawer:** Delete account — ghost, very bottom.
12. **Remove WhatsApp verification card from Play tab** — it was at lines 1487-1516.
13. **Remove phone status text from Play tab** — it was at lines 1557-1572.
14. **Remove logout from top bar** — it was at line 1277.
15. **Keep "Verified ✓" badge** — when `phoneStatus === 'verified'`, show a tiny green ✓ dot on avatar in identity row as reward.
16. **Verified phone number display** — stays in settings drawer, not dashboard.
17. **Remove the "Remove" phone button** from dashboard — move to settings.
18. **Settings drawer has a backdrop** — click outside to close.
19. **Transition:** drawer slides from right with framer-motion, `x: '100%' → 0`.
20. **Result:** Play tab = clean. Only prompt + share link + action grid. All admin noise in settings.

---

## What Moves Where

### FROM Play Tab → TO Settings Drawer:
- WhatsApp verification card (lines 1487-1516)
- Verified phone display (lines 1518-1556)
- Phone status text (lines 1557-1572)
- Delete account button (lines 1641-1653) — ghost, bottom of settings

### FROM Top Bar → TO Settings Drawer:
- Logout button
- LangToggle

### TOP BAR After:
```
[← Back]      [@username avatar]      [⚙️ (red dot if unverified)]
```

### Settings Drawer Contents:
```
━━━ Settings ━━━━━━━━━━━━━━━━━  [✕]

👤 @username
   ✓ Verified / ⚠️ Verify WhatsApp  [→]

🎨 Theme
   [theme dots]

🔊 Sound  [toggle]
🌐 Language [EN/BN toggle]

─────────────────────────
[Log Out]
[Delete Account]
```

---

## Files Changed
- `client/src/pages/NglDashboard.tsx` only
