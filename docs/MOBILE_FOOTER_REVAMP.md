# Mobile Footer Nuclear Revamp — Final Fix

## Problem Analysis
The mobile footer has accumulated layers of conflicting CSS hacks:
- `marginBottom`, `paddingBottom`, `::after` pseudo-elements, `min-height`, `flex`
- Each "fix" breaks something else (scrolling, gaps, violet bleed, layout)
- Desktop footer is **perfect** — we need to learn from it

## Root Cause (Why Violet Appears)
The dock is `position: fixed; bottom: 0` — it floats OVER content. When the user
scrolls to the very bottom, the last content (copyright) is at the viewport bottom.
Below the content, the **browser canvas** shows through. On Chrome DevTools responsive
mode, this canvas is a reddish/violet color. On real devices, overscroll bounce can
reveal it.

**Desktop doesn't have this problem** because there's no fixed bottom dock — the
footer-root gradient (`#050505 → #080808 → #0a0a0a`) fills to the edge.

## The Permanent Fix (3 Phases)

### Phase 1: Clean All Accumulated Hacks
Delete from `mobile-overrides.css`:
- `box-shadow: 0 0 0 9999px` on html
- `scroll-padding-bottom` on html (not needed if we handle clearance properly)

Delete from `footer.tsx` mobile footer:
- `marginBottom` calc
- `marginTop: -1px`
- Any `paddingBottom` calc
- The footer simply has `background: #050505` and no margin tricks

### Phase 2: Footer Gets Proper Dock Clearance
The **correct** approach used by every major app (Instagram, Twitter, Arc):
- The footer **content** has a `pb-16` (64px) so the last visible content clears
  the dock naturally — this is INSIDE the footer-grid-bg so it shares the same
  background gradient. No seam.
- The footer-root itself extends its background below via a simple CSS trick:
  `margin-bottom: -200vh; padding-bottom: 200vh;` — this paints the footer
  gradient infinitely downward. The browser canvas is BEHIND this paint.
  Nothing violet can ever show. This is the same trick used for "sticky footer"
  patterns that extend backgrounds below the fold.

### Phase 3: Verify
- Scrolling works
- Copyright visible above dock
- No violet anywhere
- Desktop unchanged

## Execution Tracker
- [ ] Phase 1: Clean all hacks
- [ ] Phase 2: Proper dock clearance
- [ ] Phase 3: Verify
