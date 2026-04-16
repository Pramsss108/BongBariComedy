# 🎬 Scroll Animation Restoration & Netflix-Style Polish

> **Problem**: The FPS optimization pass (commit `bacda7c8`) over-killed animations.
> "Welcome to Our World" bridge section is now static. Section titles don't animate.
> Cards lost their premium scroll entrance feel. Everything feels flat.
>
> **Goal**: Restore all scroll-triggered animations with a PREMIUM Netflix feel
> while keeping them performance-safe (compositor-only, no JS per frame).

---

## DIAGNOSIS: What Broke and Why

### 1. "Welcome to Our World" is Static
**Root Cause**: The bridge section (`v4 Phase 1`) has `once: true` on viewport — so it animates ONCE and never again. But the issue is the FIRST animation relies on large viewport margins that may already be satisfied on initial render (the section is close to the fold).
```tsx
// Line 655 — once: true means it fired during initial paint
viewport={{ margin: device.isMobile ? '-10px' : '-30px', once: true }}
```
**Fix needed**: Change `once: true` to `once: false` for the bridge section specifically, OR increase the negative margin so it triggers only when the section is actually scrolled into view (e.g., `margin: '-100px'`).

### 2. SectionRevealTitle Animates Once, Not Per-Scroll
**Root Cause**: In the v5 rewrite, all SectionRevealTitle elements use `viewport={{ once: true }}`. This means:
- "Latest Comedy" and "Most Loved" titles animate once and never re-trigger
- When you scroll back up and down again, they're already visible — no re-animation
**Netflix pattern**: Netflix re-triggers row title animations each time they enter the viewport. This creates a "living" feel.
**Fix needed**: Change to `once: false` for section titles on desktop.

### 3. Card Grid Entrance is Muted on Mobile
**Root Cause**: `once: device.isMobile` means cards animate once on mobile, never re-trigger. On desktop they DO re-trigger.
**Netflix pattern**: Cards should cascade in with staggered opacity+translateY on every scroll pass — quick (200-300ms), subtle (12-20px), never resets to hidden.

### 4. Hero CTA Parallax Disabled on Mobile
**Root Cause**: The FPS fix added `device.isMobile` checks to unbind all scroll-linked styles. This is correct for FPS but removes parallax depth cue.
**Fix needed**: Hero parallax should stay disabled on mobile (FPS is king), but the ENTRANCE animation should still be premium.

---

## BATCH 1 — Bridge "Welcome to Our World" Fix

### Phase 1.1: Restore Bridge Animation to Re-Triggerable
```
CHANGE: viewport={{ once: true }} → viewport={{ once: false, margin: '-80px' }}
FILE: client/src/pages/home.tsx (bridge section ~line 653-680)
```
- The bridge h2 ("Welcome to Our World") should fade + scale in every time it enters the viewport
- The underline bar should draw every time
- The "Discover Our World" label should slide in every time
- Use `margin: '-80px'` so it doesn't trigger until actually visible

### Phase 1.2: Add Staggered Animation to Bridge Sub-Elements
Currently all bridge children animate independently. Netflix pattern: the parent triggers, then children stagger.
```
CHANGE: Remove separate whileInView from h2 and divider
ADD: Use variants with staggerChildren on the parent motion.div
```
- Parent: `staggerChildren: 0.08`
- Label: `delay 0`
- H2: `delay 0.08`
- Divider: `delay 0.16`

### Phase 1.3: Premium Spring Physics
Replace the linear easing with spring physics for a bouncy, expensive feel:
```
CHANGE: Replace { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
WITH: { type: 'spring', stiffness: 200, damping: 20, mass: 0.6 }
```

---

## BATCH 2 — Section Titles Re-Animation

### Phase 2.1: SectionRevealTitle `once: false` (Desktop)
```
CHANGE: viewport={{ once: true }} → viewport={{ once: false, margin: '-40px' }}
FILE: SectionRevealTitle component in home.tsx
```
- Badge, title, and subtitle all re-animate when scrolled into view
- Keep `once: true` on mobile (FPS protection) — use `device.isMobile` check

### Phase 2.2: Badge Entrance — Pop-Scale
Instead of just fade+translate, add a tiny scale bounce:
```
CHANGE: Badge initial: { opacity: 0, y: 8 }
TO: { opacity: 0, y: 10, scale: 0.85 }
whileInView: { opacity: 1, y: 0, scale: 1 }
transition: { type: 'spring', stiffness: 400, damping: 25 }
```

### Phase 2.3: Title Text — Typewriter Underline Draw
After the title fades in, draw a subtle underline using SVG stroke animation (like the hero Bengali underline). This creates a "written" feeling.

### Phase 2.4: Subtitle — Blur-to-Clear Reveal
```
CHANGE: initial: { opacity: 0 }
TO: initial: { opacity: 0, filter: 'blur(4px)' }
whileInView: { opacity: 1, filter: 'blur(0px)' }
```
**IMPORTANT**: Only on desktop. On mobile, skip blur (it's a paint operation).

---

## BATCH 3 — Card Grid Netflix Cascade

### Phase 3.1: Card Entrance — Stagger Cascade from Left
Netflix shows browse cards cascading from left to right with ~50ms stagger:
```
KEEP: staggerChildren: 0.1 (desktop) / 0.04 (mobile)
CHANGE: Card hidden: { opacity: 0, y: 24, scale: 0.96 }
TO (desktop): { opacity: 0, y: 30, scale: 0.92, rotateX: 8 }
TO (mobile): { opacity: 0, y: 16, scale: 0.97 }
```
This creates a slight "tilt into view" effect on desktop that looks premium.

### Phase 3.2: Card Grid Re-Trigger (Desktop Only)
```
CHANGE: viewport once: device.isMobile → once: device.isMobile
This is already correct. Verify it's working.
```
On desktop, cards should re-animate every scroll pass (they already should with `once: false`).
On mobile, cards animate once (to save FPS).

### Phase 3.3: Card Hover — Lift + Shadow + Glow (Desktop)
When hovering a card on desktop, it should:
1. `transform: translateY(-6px) scale(1.02)` — lift up
2. `box-shadow: 0 20px 40px rgba(0,0,0,0.4)` — deep shadow
3. Border glow intensifies

This is mostly CSS — no JS per frame.

### Phase 3.4: Most Loved Section — Reverse Cascade Direction
Keep the existing pattern: Most Loved cards cascade from the right (x: 15 → 0 on desktop).
This differentiates the two sections visually.

---

## BATCH 4 — Micro-Interactions (Premium Polish)

### Phase 4.1: Breathing Spacer Animation
The dotted spacer between sections should pulse subtly:
```css
.spacer-dot {
  animation: breathe 3s ease-in-out infinite;
}
@keyframes breathe {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.3); }
}
```

### Phase 4.2: Section Divider Line Draw
The horizontal line spacers should "draw" from center outward when they enter the viewport:
```css
.spacer-line {
  transform: scaleX(0);
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.spacer-line.in-view {
  transform: scaleX(1);
}
```

### Phase 4.3: "View All on Instagram" Link — Slide In
The "View All" link should slide in from the right with a slight delay after the section title:
```
transition: { duration: 0.4, delay: 0.3 }
initial: { opacity: 0, x: 20 }
whileInView: { opacity: 1, x: 0 }
```

### Phase 4.4: Work With Us CTA — Parallax Tilt on Mobile
The mobile "Work With Us" CTA row should have a slight spring upward on enter:
```
initial: { opacity: 0, y: 30, scale: 0.94 }
whileInView: { opacity: 1, y: 0, scale: 1 }
transition: { type: 'spring', stiffness: 300, damping: 22 }
```

---

## BATCH 5 — Scroll-Triggered Background Effects

### Phase 5.1: Background Glow Blobs Opacity Shift
As user scrolls, the background glow blobs should subtly shift opacity:
- Top of page: yellow blob at 100%
- Middle: blend to indigo
- Bottom: fade both

**Implementation**: CSS `animation-timeline: scroll()` (compositor-only, no JS).
**Fallback**: Static opacity (current behavior) for unsupported browsers.

### Phase 5.2: Hero Exit — Cinematic Fade
When scrolling past the hero, the hero should:
1. Scale down slightly (already done: `heroVideoScale`)
2. Fade to black (already done: `heroVideoOpacity`)
3. The blur transition zone should smoothly blend hero into content

These are ALREADY implemented via `useTransform` — verify they're working on desktop.

---

## PROFILE PIC STATUS

### Current Code (instagram-reel.tsx)
```tsx
const PROFILE_PIC_URL = '/data/profile-pic.jpg';
// ...
{pfpError < 1 ? (
  <img src={PROFILE_PIC_URL} alt="thebongbari" ... onError={() => setPfpError(1)} />
) : (
  <div> {/* IG icon gradient fallback */} </div>
)}
```

### File Status
- ✅ `client/public/data/profile-pic.jpg` exists (7,579 bytes)
- ✅ Variable correctly set to `/data/profile-pic.jpg`
- ✅ JSX references `PROFILE_PIC_URL` (not old `PROFILE_PIC_B64`)
- ✅ Fallback chain: file → gradient IG icon

### Things to Verify on Live Site
1. Open DevTools → Network tab → filter "profile-pic"
2. Confirm the image loads with 200 status (not 404)
3. If 404: the file may not be deployed yet — run `npm run build:client` and verify `dist/public/data/profile-pic.jpg` exists
4. Profile pic appears on EVERY card (all 8 reels show the same pic in sidebar bottom)

### Potential Issues
- **GitHub Pages cache**: Old deployed version may not have the file. Need a fresh deploy.
- **Vite public folder**: Files in `client/public/` are copied to `dist/public/` during build — this should work.
- **If still broken**: Check if the image file is valid JPEG (open it locally in a browser).

---

## 🚨 CRITICAL RULES (Don't Break Anything)

1. **NEVER add `once: true` to bridge section** — it must re-animate
2. **Mobile FPS protections STAY**: No scroll-linked transforms on mobile, no backdrop-filter, no bokeh, no Ken Burns
3. **Desktop can have premium animations** — the budget is 16.6ms/frame (60fps) or 8.3ms (120fps)
4. **Test on both desktop AND mobile** before deploying
5. **`npm run check` + `npm run build:client`** before every commit
6. **All animations must use `transform` and `opacity` ONLY** — no `filter`, `blur()`, `box-shadow` transitions

---

## EXECUTION ORDER

| Batch | Description | Phases | Priority |
|-------|-------------|--------|----------|
| **1** | Bridge "Welcome to Our World" fix | 1.1, 1.2, 1.3 | **URGENT — DO FIRST** |
| **2** | Section titles re-animation | 2.1, 2.2, 2.3, 2.4 | **HIGH** |
| **3** | Card grid Netflix cascade | 3.1, 3.2, 3.3, 3.4 | **HIGH** |
| **4** | Micro-interactions | 4.1, 4.2, 4.3, 4.4 | **MEDIUM** |
| **5** | Background scroll effects | 5.1, 5.2 | **LOW** |

---

*All changes must pass `npm run check` and `npm run build:client` before deployment.*
