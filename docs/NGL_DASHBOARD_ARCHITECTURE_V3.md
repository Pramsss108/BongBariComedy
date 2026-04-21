# NGL Dashboard — Identity Header v3 (Architecture Reset)

**Date:** April 2026  
**Status:** Plan → Execute in one shot  
**Problem:** Identity row keeps breaking. PRO CTA, username, stats, share icon — too many things competing in 32px of vertical space. Every "fix" makes it worse.

---

## Competitor Research (How the pros do it)

| App | Identity Row Pattern | PRO/Upgrade Placement |
|---|---|---|
| **NGL.link** | Big centered avatar, handle below, super clean | Gold crown icon top-right (floating), opens upgrade modal |
| **Sendit (Snap)** | Just avatar + handle in a pill | NO upgrade in face — hidden in settings |
| **Tellonym** | Avatar + name + tagline, no clutter | "Tellonym+" link in settings menu |
| **Spotify** | Tiny "Premium" pill next to name when subscribed | Upgrade button in side drawer, never inline |
| **Twitter/X** | Handle + tiny blue check ✓ for premium | Subscribe page, separate flow |
| **Discord** | Avatar + username + tiny role badges | Nitro icon in nav rail, never in profile row |

**Key insight:** None of the top apps stuff the upgrade CTA inside the identity row. They use a **separate floating icon** (crown) or a **drawer menu**. Identity row stays sacred and clean.

---

## 20-Phrase Plan

1. **Identity row = sacred.** Only avatar + handle + one ✓ if premium. Nothing else.
2. **Kill the inline "Get PRO" button.** It breaks the row, looks like spam.
3. **Replace it with a crown icon (👑)** — small floating button on the right, beside share.
4. **Crown icon styling:** gradient bg (violet→fuchsia→pink), 32px square, gentle pulse animation.
5. **Crown only renders when `!isPremium`** — premium users never see an upgrade icon.
6. **Premium state:** tiny gradient "✓" or "PRO" text right after handle, ultra-subtle.
7. **Stats (streak, msgs) leave the identity row entirely.** They were noise.
8. **Stats move to a single tiny line below prompt card** — "🔥 5d streak · 12 msgs" centered, low opacity.
9. **Share icon stays** — same ghost style, top-right.
10. **Single horizontal row:** `[avatar] @handle [PRO✓?]                    [👑 if free] [⬆ share]`
11. **Avatar size:** keep 48px (w-12), it's the anchor.
12. **Handle size:** 17px font-black white, leading-none — same as before, it works.
13. **PRO inline mark (when premium):** 10px italic gradient text, baseline-aligned, no bg.
14. **Crown CTA (when free):** 32px square, rounded-xl, gradient, white crown SVG icon, scale on hover.
15. **Crown tooltip:** "Upgrade to PRO ₹98/mo" — rich info on hover, not visible by default.
16. **No second row in identity.** If stats need to show, they go in the strip below.
17. **Mobile guarantee:** all 4 elements (avatar, handle, crown, share) fit in one row on 360px width.
18. **Animation:** crown gets a subtle gradient shimmer every 4s to draw eye without being annoying.
19. **Click behavior:** Crown → `setShowUpgrade(true)` + `gEvent('ngl_pro_cta_click', { source: 'crown' })`.
20. **Result:** Clean, professional, competitive-grade. Free users can't miss the crown. Premium users feel rewarded.

---

## Before vs After

**Before (current — broken):**
```
[avatar] @test44
         [Get PRO ₹98/mo]      ← chunky button, breaks row
         5d streak · 12 msgs   ← exceeds width
                          [⬆]
```

**After (v3):**
```
[avatar] @test44 ✓PRO            [👑] [⬆]    ← clean single row
              ↑ tiny gradient    ↑ free only
```

Stats moved to subtle strip under the prompt card (separate concern).

---

## Files Changed

- `client/src/pages/NglDashboard.tsx` — identity row only (lines ~1349-1395)

That's it. One section, one shot.
