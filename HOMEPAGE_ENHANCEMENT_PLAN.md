# Homepage & UX Enhancement Plan — Bong Bari
> Agent-authored plan. Execute in this exact order to avoid regressions.

---

## 1. Unique Favicon Per Page (DONE: humanizer ⚡ amber, TODO: /tools ⚙ purple)

| Page | Icon | Color | Files |
|------|------|-------|-------|
| `/tools` | ⚙ Gear (tools) | Purple/Violet `#8B5CF6` | `tools-favicon-*.png` + `.ico` |
| `/tools/humanizer` | ⚡ Lightning | Amber `#f59e0b` | `humanizer-favicon-*.png` + `.ico` ✅ |
| All other pages | 🅱 Bong Bari Logo | Yellow | `favicon-*.png` ✅ |

**Action**: Generate `tools-favicon-{16,32,48,180,192}.png` + `tools-favicon.ico` via Node+sharp.  
Change `free-tools.tsx` `faviconBase` from `/humanizer-favicon` → `/tools-favicon`.

---

## 2. Premium Glass Footer

**Current**: Flat `bg-brand-blue` minimal footer — no structure, no hierarchy, looks 2019.

**New Design**:
```
┌──────────────── glassmorphism border-top glow ─────────────────┐
│  [Logo] বং বাড়ি           [YT] [IG] [Email]                    │
│  ঘরোয়া পরিবেশের মজার গল্প                                     │
│                                                                 │
│  Navigation: Home | About | Blog | FAQ | Free Tools            │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│  © বং বাড়ি ২০২৫ কলকাতা   Privacy | Terms | team@bongbari.com  │
└─────────────────────────────────────────────────────────────── ┘
```

**CSS**: `bg-black/40 backdrop-blur-xl border-t border-white/10`  
**Glow top-edge**: `linear-gradient(to right, transparent, #F4C430/30, transparent)`  
**Mobile**: Stack columns vertically, center-align.  
**Desktop**: 3-column grid — brand left, nav center, socials right.

---

## 3. Bengali Creative Underline — "Authentic **Bengali** Comedy"

**Current**: Simple `h-[3px] bg-[#F4C430]/50 rounded-full` bar below "Bengali"

**New**: Animated SVG brush/pen stroke underline that **draws itself** on load.
- SVG `<path>` with stroke-dasharray + dashoffset animation  
- Wavy/organic shape (not a straight line) — like ink from a pen  
- Color: `#F4C430` (brand yellow) with slight blur glow  
- Duration: 0.8s ease-out, starts with 0.3s delay  
- On mobile: slightly shorter stroke

---

## 4. Scroll Indicator Fix

**Current**: Bouncing "SCROLL ↓" text+arrow with infinite Framer motion — looks distracting, cheap.

**New**: 
- Tiny animated scroll-mouse icon (SVG) — a rectangle with inner dot bobbing  
- Auto-fades out after 2s OR when user scrolls past 80px  
- `opacity-0` on mobile/touch = hide entirely (use touch, not scroll cues)  
- Or just **remove it** — video + CTA has enough visual weight

**Decision: Remove it.** Modern premium sites don't need scroll hints when above-the-fold is full.

---

## 5. Custom Scrollbar

**Current**: Browser default scrollbar — thick, ugly on right edge, very visible.

**New** (`client/src/index.css`):
```css
/* Hide scrollbar track on modern browsers */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
/* Firefox */
* { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent; }
```

---

## 6. Mobile Nav — Fix "Litchy" Scroll Feeling

**Root cause**: `fixed` element without `will-change` forces repaint on scroll.  
**Fix**: Add `will-change: transform` + `transform: translateZ(0)` + `contain: layout` to the dock div.  
Also ensure the scroll container uses `-webkit-overflow-scrolling: touch` (already on iOS by default in modern).

---

## 7. Homepage Section Spacing — Device Guide

| Section | Mobile (≤768px) | Tablet (769–1023px) | Desktop (≥1024px) |
|---------|----------------|--------------------|--------------------|
| Hero `pt-*` | `pt-20` | `pt-24` | `pt-24` |
| Hero `pb-*` | `pb-6` | `pb-8` | `pb-10` |
| Between sections | `py-12` | `py-16` | `py-24` |
| Footer top padding | `pt-10` | `pt-12` | `pt-16` |
| Footer bottom (above mobile nav) | `pb-24` | `pb-10` | `pb-10` |

---

## 8. SEO Notes (already implemented, keep as-is)

- ✅ react-helmet-async with SEOHead component  
- ✅ JSON-LD structured data per page  
- ✅ sitemap.xml with /tools + /tools/humanizer  
- ✅ Static HTML for WhatsApp crawler workaround  
- ✅ 1200×630 OG banner  

---

## Execution Order

1. `scripts/generate-tools-favicon.cjs` → generate purple gear favicon  
2. Update `free-tools.tsx` faviconBase  
3. Replace footer in `home.tsx` with glass design  
4. Update Bengali underline (SVG brush stroke)  
5. Remove scroll indicator  
6. Add scrollbar CSS to `index.css`  
7. Add `will-change: transform` to mobile navbar dock  
8. Adjust spacing + `pb-24` for footer above mobile nav  
9. Commit + push  
