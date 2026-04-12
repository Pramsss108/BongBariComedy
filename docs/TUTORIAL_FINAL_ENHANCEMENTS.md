# IG Story Tutorial — Final Enhancement Plan

> Status: **Active** | Created: April 9, 2026
> All previous problem docs (V1, V2) are resolved and deleted.

---

## Current State (What Works)

| Feature | Status |
|---|---|
| 5-step tutorial with progress bar | ✅ |
| PhoneFrame consistent across all 5 steps | ✅ |
| Fullscreen uses real larger PhoneFrame (not CSS scale) | ✅ |
| IG toolbar (✕, Aa, ☺, ♪, ⋯) visible inline + fullscreen | ✅ |
| Bottom bar ("Your stories", "Close Friends") fullscreen only | ✅ |
| Link sticker is **draggable** + saves position to localStorage | ✅ |
| Story card image with `object-center` crop | ✅ |
| Arrow navigation (no hover dance) | ✅ |
| Auto-advance (6s) + keyboard nav + swipe gestures | ✅ |
| Double-tap fullscreen | ✅ |
| Copy link pill on Step 4 | ✅ |
| Celebration confetti on last step | ✅ |
| Bengali/English bilingual | ✅ |

---

## Final Enhancements (Polish Pass) — ALL COMPLETE ✅

### E1 — Sticker drag position reset button ✅
- "↺ Reset sticker" button shows below phone on Step 5 (inline only)
- Clears both `ig_sticker_pos` and `ig_sticker_pos_exp` from localStorage
- Reloads page to reset sticker to default position

### E2 — Sticker "placed" glow feedback ✅
- On drag end, sticker gets a green glow (500ms) confirming placement
- `boxShadow: '0 0 15px rgba(34,197,94,0.6), 0 0 0 2px rgba(34,197,94,0.4)'`

### E3 — Step 5 instruction text update ✅
- EN: "Drag the 🔗 sticker onto your link → tap 'Your stories'"
- BN: "🔗 স্টিকারটা টেনে link-এ রাখো → 'Your stories' ট্যাপ করো"

### E4 — Fullscreen bottom bar "Your stories" pulse ✅
- "Your stories" button has scale pulse (1→1.04→1, 2s loop)
- Inside GlowRing, draws attention to the post action

### E5 — Mobile touch optimization ✅
- `touchAction: 'none'` on phone container (already done)
- `draggable={false}` on story card image
- framer-motion drag with `dragMomentum={false}` + `dragElastic={0}`

### E6 — Compact progress bar step icons ✅
- 📷 → 🎯 → 🔗 → 📋 → 🎉 icons under progress bar
- Active step at 60% opacity, others at 15%

---

## Non-Coder Debug Guide

### "Sticker is in wrong position"
```
Open browser DevTools Console → type:
localStorage.removeItem('ig_sticker_pos')
localStorage.removeItem('ig_sticker_pos_exp')
```
Then refresh. Sticker resets to center-ish default.

### "Fullscreen looks weird"
- Double-tap the phone on Step 5 to enter fullscreen
- The phone should be ~340px wide with all elements (toolbar + bottom bar + sticker)
- If it clips, the `expanded` prop might not be passing — check console for errors

### "Tutorial not loading"
- Make sure you're on the share modal → picked Instagram → see "Instagram Story" header
- Steps auto-advance every 6 seconds, or click arrows / swipe

---

## Implementation Priority
1. **E1** (reset button) — highest value, prevents user frustration
2. **E3** (text update) — quick copy fix
3. **E2** (glow feedback) — nice polish
4. **E4** (fullscreen pulse) — already half-done with GlowRing
5. **E5** (mobile touch) — verify only
6. **E6** (progress labels) — lowest priority, optional
