# FAQ Modern Revamp — One-View Architecture (20 Phases)

> **Goal:** Transform the current scrollable FAQ page into a premium, single-viewport (one-view) experience — everything visible without scrolling, Apple/CapCut-level polish.
> **No coding until plan is approved.**

---

## Current State Analysis

### What Exists
- 5 categories: About, Content, Collaboration, Audience, Contact
- 21 FAQ items with accordion expand/collapse
- Sidebar category filter + search bar
- "Show More/Less" pagination (6 at a time)
- CTA block at bottom ("Still have questions?")
- Long scrollable page — user must scroll heavily to find answers

### Problems
1. **Too much scrolling** — defeats the "instant answer" purpose of FAQ
2. **Generic accordion layout** — looks like every other FAQ page
3. **Wasted space** — sidebar takes 272px on desktop for just 5 buttons
4. **No visual hierarchy** — all questions look the same weight
5. **CTA buried** at the very bottom — most users never see it
6. **No Bengali support** — English only, doesn't match homepage toggle

---

## Architecture: One-View Design

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER BAR (compact)                              [EN / বাং]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   "FAQ" title + subtitle          [ 🔍 Search field ]          │
│                                                                 │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│  CAT     │   QUESTIONS PANEL (right 70%)                       │
│  TABS    │   ┌──────────────────────────────────────────────┐  │
│  (left   │   │  Q: What is Bong Bari Comedy?         [▸]   │  │
│   30%)   │   ├──────────────────────────────────────────────┤  │
│          │   │  Q: Who is behind Bong Bari?           [▸]   │  │
│  ○ All   │   ├──────────────────────────────────────────────┤  │
│  ● About │   │  Q: What makes us unique?              [▸]   │  │
│  ○ Video │   ├──────────────────────────────────────────────┤  │
│  ○ Collab│   │  Q: When did we start?                 [▸]   │  │
│  ○ Fans  │   └──────────────────────────────────────────────┘  │
│  ○ Help  │                                                      │
│          │   ── Scrollable ONLY inside this panel ──           │
│──────────│──────────────────────────────────────────────────────│
│          │                                                      │
│  QUICK   │   ANSWER PANEL (slides in from right when Q tapped) │
│  CTA     │   ┌──────────────────────────────────────────────┐  │
│  ────    │   │  Answer text with rich formatting...         │  │
│  💬 Chat │   │  May include links, emphasis, etc.           │  │
│  📞 Help │   └──────────────────────────────────────────────┘  │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### Mobile (< 768px) — Stacked One-View
```
┌─────────────────────────────┐
│  FAQ + subtitle    [🔍]    │
├─────────────────────────────┤
│  [All][About][Video][...]  │  ← horizontal pill scroll
├─────────────────────────────┤
│                             │
│  Q: What is Bong Bari?  ▾  │
│  ─────────────────────────  │
│  A: Bong Bari Comedy is... │  ← inline expand (no panel)
│  ─────────────────────────  │
│  Q: Who is behind...?   ▸  │
│  Q: What makes unique?  ▸  │
│  Q: When did we start?  ▸  │
│                             │
│  ── scrollable list ──      │
│                             │
├─────────────────────────────┤
│  [💬 Chat] [📞 Support]   │
└─────────────────────────────┘
```

### Core Principle
- **Viewport-locked layout** — `h-screen` container, NO page-level scroll
- **Internal scroll** only inside the questions list panel
- **Split-pane** on desktop: categories left, questions+answers right
- **Inline accordion** on mobile: compact stacked cards

---

## 20 Phases

### PHASE A — Layout Foundation (Phases 1–4)

| # | Phase | Description | Risk |
|---|-------|-------------|------|
| 1 | **Viewport Lock** | Replace scrollable page with `h-[100dvh]` flex container. Remove `pt-32 pb-24` padding. Add `overflow-hidden` to outer wrapper. Navbar stays fixed above. | Low |
| 2 | **Desktop Split-Pane** | Left panel (280px fixed) for categories + CTA. Right panel (`flex-1`) for search + questions. Use CSS Grid: `grid-cols-[280px_1fr]` at `lg:`. | Low |
| 3 | **Mobile Stack** | Below `lg:` breakpoint — full-width stacked: compact header → horizontal category pills → scrollable question list. Category sidebar becomes horizontal scroll strip. | Low |
| 4 | **Internal Scroll Zone** | Questions panel gets `overflow-y-auto` with custom thin scrollbar (matching homepage style). Everything else stays fixed. Max visible area = `calc(100dvh - header - search - padding)`. | Low |

### PHASE B — Header & Search (Phases 5–7)

| # | Phase | Description | Risk |
|---|-------|-------------|------|
| 5 | **Compact Header** | Shrink hero from `text-5xl mb-12` to `text-2xl mb-0`. Inline layout: title left, search right on desktop. Single row, no wasted vertical space. Bengali subtitle with `bengali-subtitle-glow` class. | Low |
| 6 | **Premium Search** | Glassmorphism search input — `bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]`. Gold accent on focus. Debounced 200ms filter. Compact height `py-2.5`. Search icon animates to ✕ when active. | Low |
| 7 | **Live Filter Feedback** | Show result count badge next to search: "4 results". If zero results → inline "No matches" with suggestion to clear. Instant, no loading states needed. | Low |

### PHASE C — Category Navigation (Phases 8–10)

| # | Phase | Description | Risk |
|---|-------|-------------|------|
| 8 | **Vertical Tab Rail (Desktop)** | Left sidebar: vertical pill buttons with icon + label + count badge. Active = gold border + subtle gold bg. Inactive = glass surface. Slim design, `py-2 px-3 text-sm`. | Low |
| 9 | **Horizontal Pill Strip (Mobile)** | Horizontal scrollable category pills at top. `overflow-x-auto`, snap scrolling, hide scrollbar. Active pill glows gold. Touch-friendly `min-h-[40px]`. | Low |
| 10 | **Category Transition** | When switching categories: questions list does a quick `opacity 0→1` + `y: 4→0` transition (150ms). No jarring content jump. AnimatePresence wraps the list. | Low |

### PHASE D — Questions List (Phases 11–14)

| # | Phase | Description | Risk |
|---|-------|-------------|------|
| 11 | **Compact Question Cards** | Each question = slim card: `py-3 px-4`. Category color dot (4px circle) left of text. Chevron right. No gradient borders (too heavy for dense list). Just `border-b border-white/[0.04]` separator. | Low |
| 12 | **Desktop: Detail Panel** | Clicking a question on desktop → answer appears in a right-side detail sub-panel (40% width) with slide-in animation. Question list stays visible (60%). Split inside the right panel. | Medium |
| 13 | **Mobile: Inline Expand** | Clicking a question on mobile → answer expands below with `AnimatePresence` height animation. Only one answer open at a time (auto-collapse previous). | Low |
| 14 | **Answer Rich Content** | Answer text uses `prose` styling: proper line-height, links styled in gold, bold keywords. Category accent color for the left border line. Fade-in animation on reveal. | Low |

### PHASE E — Premium Polish (Phases 15–18)

| # | Phase | Description | Risk |
|---|-------|-------------|------|
| 15 | **Keyboard Navigation** | Arrow keys to navigate questions. Enter to expand/collapse. Escape to close detail panel. `/` to focus search. Tab cycles through categories. ARIA roles for accessibility. | Medium |
| 16 | **Active Question Highlight** | Selected question gets subtle gold left border + slightly brighter bg. Smooth transition. On desktop, the detail panel has a connecting visual line to the active question. | Low |
| 17 | **Empty States** | No results → centered emoji + text + "Clear search" button. Category empty → "No questions in this category yet" with suggestion pill. All within the fixed viewport. | Low |
| 18 | **Bengali Language Support** | Integrate with homepage `lang` toggle (from localStorage `bbc.lang`). All category names, header, search placeholder, CTA text switch between EN/BN. FAQ Q&A data stays English (content is English). Use `bengali-subtitle-glow` for Bengali UI text. | Medium |

### PHASE F — CTA & Final Touches (Phases 19–20)

| # | Phase | Description | Risk |
|---|-------|-------------|------|
| 19 | **Sidebar CTA (Desktop)** | Move "Still have questions?" CTA into the left sidebar below categories. Two compact buttons: "💬 Chat with AI" + "📞 Contact Support". Always visible — no more buried CTA. On mobile: sticky bottom bar with same buttons. | Low |
| 20 | **Performance & QA** | Verify `h-[100dvh]` works on all devices (iOS Safari, Android Chrome). Test with 21 FAQ items that the internal scroll is smooth. Confirm no page-level scroll leak. Check language toggle, search, category filter, keyboard nav all work together. Run TS check + build. | Low |

---

## Design Tokens (Reference)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#050505` | Page bg |
| Card surface | `bg-white/[0.03]` | Question cards, search |
| Gold accent | `#F4C430` / `brand-yellow` | Active states, borders |
| Text primary | `text-white` | Questions |
| Text secondary | `text-gray-400` | Answers, subtitles |
| Border | `border-white/[0.06]` | Card outlines |
| Glassmorphism | `backdrop-blur-xl bg-black/60` | Panels, search |
| Category colors | orange/blue/emerald/violet/rose | Per-category accents |

## Key Constraints
- **100dvh viewport** — absolutely no page scroll, only internal panel scroll
- **No new dependencies** — use existing Framer Motion + Tailwind + Lucide
- **Language toggle reads** from `localStorage('bbc.lang')` (set by homepage)
- **Mobile-first** — stacked layout works perfectly, desktop enhances with split-pane
- **Footer is NOT shown** on FAQ — one-view means no footer (or tiny inline links)
- **Preserve all 21 FAQ items** — data stays identical, only layout/UX changes

---

## Success Criteria
1. Entire FAQ fits in one viewport on desktop (1080p) without any page scroll
2. Category switching is instant (<150ms visual transition)
3. Search filters in real-time with zero lag
4. Desktop detail panel feels like a native app (macOS Finder / Apple Help style)
5. Mobile inline expand is buttery smooth
6. Language toggle works for all UI chrome (not FAQ content)
7. TS check + build pass clean
8. No layout shift, no scroll jank, no overflow leak
