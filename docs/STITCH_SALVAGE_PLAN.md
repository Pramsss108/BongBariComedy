# Stitch Salvage Plan v2 — Match Production Aesthetic (No Gold)

**Decision:** Production `NglDashboard` already uses a **violet → fuchsia → pink** gradient palette with a rounded ✓ PRO badge that has a sweeping shimmer animation. We will **keep that aesthetic** and just borrow the *structural* badge ideas from Stitch — translated into our existing color system.

> Forget gold (`#D4AF37`, `#F8DB82`, `#CFA144`). Production uses fuchsia (`#d946ef`), violet (`#8b5cf6`), pink (`#ec4899`). Everything we salvage gets recolored to match.

---

## Files to Delete

| Path | Type |
|------|------|
| `client/src/pages/NglStitchDashboard.tsx` | React component |
| `client/src/pages/NglStitchDashboard.css` | Stylesheet |
| `client/src/pages/NglStitchPreview.tsx` | iframe wrapper |
| `client/public/stitch-preview.html` | Raw Stitch HTML (Home) |
| `docs/stitch/inbox.html` | Raw Stitch HTML (Inbox) |
| `docs/STITCH_NGL_INTEGRATION_PLAN.md` | Old 30-phase plan |
| `stitch1.html`, `stitch2.html`, `stitch_export.html` | Root scratch |

**Routes to remove from `client/src/App.tsx`:**
- `/ngl/stitch-preview` + `lazy()` import
- `/ngl/stitch-dashboard/:username` + `lazy()` import

---

## What Production Already Has (Don't Replace)

The existing PRO badge at line ~1352 of `NglDashboard.tsx`:

```tsx
<span className="relative overflow-hidden text-[9px] font-extrabold text-white
                 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500
                 px-2 py-[3px] rounded-full tracking-[0.05em]
                 shadow-sm shadow-fuchsia-500/30">
  <span className="relative z-10">✓ PRO</span>
  <motion.span animate={{ x: ['-120%', '220%'] }} ... />  {/* shimmer sweep */}
</span>
```

Already excellent — pill shape, gradient, shimmer animation. We do NOT replace it.

---

## What's Worth Borrowing from Stitch (Recolored)

### 1. Bold Italic "PRO" Word‑Mark — typography upgrade only
Stitch idea: `font-black italic letter-spacing:-0.05em` so PRO reads like a luxury brand mark.

Apply in our palette (1‑line change to existing badge):

```tsx
{/* CURRENT */}
<span className="relative z-10">✓ PRO</span>

{/* PROPOSED — same fuchsia colors, bolder personality */}
<span className="relative z-10 font-black italic tracking-tighter">✓ PRO</span>
```

Risk: zero.

---

### 2. "Ribbon Strip" Layout for the Upgrade CTA (free users)
Stitch idea: a small accent strip glued to the **left edge** of a card so the eye reads it as a "tag" — gives any container an instant premium‑product feel.

Apply in fuchsia/violet/pink (NOT gold):

```tsx
<div className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 p-3 pl-16">
  {/* Left ribbon */}
  <div className="absolute left-0 top-1/2 -translate-y-1/2
                  bg-gradient-to-b from-violet-500 via-fuchsia-500 to-pink-500
                  px-3 py-2 rounded-r-lg
                  shadow-[0_4px_20px_rgba(217,70,239,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]">
    <span className="text-white font-black italic text-base tracking-tighter">PRO</span>
  </div>
  <p className="text-white text-sm font-bold">Unlock all themes & inbox hints</p>
  <p className="text-white/50 text-xs mt-0.5">₹98/month · cancel anytime</p>
</div>
```

Where: replaces the plain `setShowUpgrade(true)` button site for non‑premium users.

Risk: low — additive component.

---

### 3. Glossy Diagonal Sweep on Cards (decorative, palette‑neutral)
Stitch idea: subtle white diagonal sweep `::after` to make glass cards look polished. **It's white, not gold** — works with any palette.

```css
.glossy-sweep { position: relative; overflow: hidden; }
.glossy-sweep::after {
  content: '';
  position: absolute;
  inset: -50%;
  background: linear-gradient(
    to bottom right,
    rgba(255,255,255,0)    0%,
    rgba(255,255,255,0)    45%,
    rgba(255,255,255,0.04) 50%,
    rgba(255,255,255,0)    55%,
    rgba(255,255,255,0)    100%
  );
  transform: rotate(30deg);
  pointer-events: none;
}
```

Where: add the class to existing glass cards (profile card, settings card). Pure decoration.

Risk: zero.

---

### 4. Fuchsia Pulse Dot for "New Lead" / unread counter
Tailwind already has `animate-pulse` — no new CSS:

```tsx
<span className="inline-flex items-center gap-1.5">
  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
  <span className="text-[9px] font-extrabold text-fuchsia-300">3 new</span>
</span>
```

Where: inbox unread badge. Risk: zero.

---

## What We're NOT Taking

- ❌ Gold gradient (`#F8DB82 → #CFA144`) — clashes with production fuchsia palette
- ❌ Single‑viewport `100dvh` layout — production needs scrollable forms
- ❌ Material Symbols / Font Awesome — production uses lucide-react
- ❌ Stitch tab switcher — production has its own pattern that works
- ❌ Stitch share grid (4‑column) — production already has share UI

---

## Execution Order (after approval)

1. **Delete** all stitch files + 2 routes + 2 lazy imports.
2. **Add** `.glossy-sweep` (~12 lines) to `client/src/index.css`.
3. **Patch** existing PRO badge: add `font-black italic tracking-tighter` (1‑line edit).
4. **Optional**: replace plain upgrade button with the fuchsia ribbon card pattern.
5. **Optional**: add fuchsia pulse dot to inbox unread counter.
6. Test at `http://localhost:5173/ngl/at/<username>`.
7. Commit & push.

---

**Bottom line:** Three additive tweaks, all in production's existing fuchsia/violet/pink palette. No gold anywhere. No structural changes. Maybe ~30 lines of code total.
