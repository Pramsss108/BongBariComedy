# Facebook Story Tutorial — 20-Phase Production Plan

> **Goal:** Build a pixel-perfect, premium FB Story tutorial that teaches users to cross-post their NGL link from Instagram → Facebook Story.  
> **Key insight:** Facebook Story sharing goes THROUGH Instagram (not native FB app). The real flow is: IG Story → long-press share → check "Your Facebook Story" → Share.  
> **IG Tutorial is LOCKED** — do not touch. FB tutorial reuses the same visual flow but adds the FB cross-post steps.

---

## Phase 1: Prerequisites Screen — Account Center Connection ✅
- **Step 0** of tutorial
- Show Meta Account Center with Instagram (connected ✓) and Facebook (needs linking)
- Premium glass card design, Meta branding, animated "Link account" CTA
- Tip box: "Settings → Account Center → Accounts → Link Facebook"

## Phase 2: IG Story Creation — Open Camera
- **Step 1** mimics IG step 0 (Instagram home → tap profile pic / + → Story)
- Pixel-perfect IG dark mode home feed
- Story ring around profile pic with pulsing tap indicator
- This teaches: "Open Instagram first, not Facebook"

## Phase 3: Sticker Icon Tap
- **Step 2** mimics IG step 1 (tap sticker icon in story editor toolbar)
- IG story camera/editor UI with top toolbar
- Highlighted sticker icon (□😊) with GlowRing + bouncing finger
- Background shows camera/gallery UI dimmed

## Phase 4: Select Link Sticker
- **Step 3** mimics IG step 2 (find Link sticker in tray)
- Sticker tray bottom sheet with grid of stickers
- "Link" sticker highlighted with blue glow
- Other stickers (Poll, Questions, Music, etc.) dimmed

## Phase 5: Paste NGL Link + Done
- **Step 4** mimics IG step 3 ("Add link" screen → paste URL → Done)
- iOS-style "Add link" modal with URL field
- Clipboard fly-in animation (📋 → URL field)
- "Done" button highlighted with GlowRing + bouncing arrow

## Phase 6: Story Editor with Link Placed
- **Step 5** — Story editor showing the NGL card with link sticker placed
- Full story preview with story card image or gradient background
- Link sticker pill on the story
- **KEY:** Hint overlay: "👆 Long-press 'Your Stories' to share to Facebook!"
- Bottom bar shows "Your stories" + "Close Friends" + arrow

## Phase 7: Long-Press Animation on "Your Stories"
- Show the "Your stories" button with an animated long-press indicator
- Pulsing hold ring (like iOS force touch ripple)
- Text hint: "Hold for 2 seconds..."
- This is the critical step most users miss

## Phase 8: "Share This To" Bottom Sheet
- **Step 6** — The white iOS bottom sheet appears
- "Share this to" header
- Row 1: Your story (IG avatar + "Always shared to Instagram" + blue check ✓)
- Row 2: Your Facebook Story (FB avatar + account name + animated check appearing)
- Purple "Share" button at bottom
- Bouncing finger pointing at FB checkbox
- Sheet handle at top

## Phase 9: Share Confirmation + Dual Platform Badges
- **Step 7** — Posting animation
- Spinner with IG gradient + FB blue
- Platform badges appear sequentially: Instagram ✓ → Facebook ✓
- Success message: "Posted on both!"

## Phase 10: Live FB Story Preview
- **Step 8** — Facebook story viewer
- FB dark mode story UI with progress bar, username, "Just now"
- NGL story card as background with link sticker visible
- Bottom: "No viewers yet" + Add story / Instagram / Highlight icons
- Swipe-up arrows animation
- Blue success badge: "🎉 Facebook Story is live!"

## Phase 11: Fallback Sync Step (If FB Story Doesn't Appear)
- Optional help step: "If story doesn't show on Facebook..."
- Show IG story → Facebook icon at bottom → tap to sync
- This covers the edge case from the video tutorial

## Phase 12: Premium Animations Pass
- Add micro-interactions to every step:
  - Step transitions: smooth slide with spring physics
  - Checkbox animations: satisfying bounce on check
  - Platform badges: staggered scale-in with spring
  - Success confetti: small particle burst on final step
- All animations use framer-motion, 60fps

## Phase 13: Bengali Localization Polish
- Review all Bengali text for natural phrasing
- Ensure Bengali renders correctly in small sizes
- Test line-clamp and overflow with Bengali text (wider characters)
- Add Bengali tooltips for technical terms

## Phase 14: Dark Mode Color Calibration
- Match exact IG dark mode colors: #0a0a0a bg, #262626 cards
- Match exact FB dark mode: #18191a bg, #242526 cards, #3a3b3c borders
- Ensure glass-morphism effects (backdrop-blur) don't cause performance issues
- All text opacity levels: 90% primary, 60% secondary, 40% tertiary, 25% hint

## Phase 15: Mobile-First Responsive Polish
- Test on 320px, 375px, 414px, 768px widths
- Ensure phone mockup scales correctly at all breakpoints
- Touch targets are 44px minimum
- No horizontal overflow on any step

## Phase 16: Step Timing & Auto-Advance
- Each step auto-advances after 6s (matching IG tutorial)
- Pause on interaction, resume on timeout
- Progress bar animation syncs with step duration
- Step 8 (final) doesn't auto-advance

## Phase 17: Keyboard & Accessibility
- Arrow keys navigate steps
- Space pauses/resumes
- Escape closes modal
- All interactive elements have focus rings
- Screen reader labels for phone mockup content

## Phase 18: Analytics Events
- Track: `ngl_fb_tutorial_start`, `_step_N`, `_complete`, `_skip`
- Track: `ngl_fb_share_method` (app vs card)
- Track: time spent per step (engagement metric)

## Phase 19: Edge Case Handling
- Handle: no storyPreviewUrl (show gradient fallback)
- Handle: very long usernames (truncate with ellipsis)
- Handle: very long share links (truncate in sticker pill)
- Handle: user hasn't copied link yet (show copy button inline)

## Phase 20: Production QA & Ship
- Cross-browser test: Chrome, Safari, Firefox, Samsung Internet
- Performance audit: no layout shifts (CLS), fast paint (FCP < 1s)
- Build clean: `npm run build:client` zero errors
- Deploy: `npm run deploy:safe`
- Verify on `www.bongbari.com` — all 5+ steps render perfectly
- Lock FB tutorial (mark as done in this plan)

---

## Step Summary (Final Tutorial Flow)

| Step | Screen | What User Sees |
|------|--------|---------------|
| 0 | Account Center | Link IG ↔ FB prerequisite |
| 1 | IG Home Feed | Open Instagram → tap + → Story |
| 2 | Story Editor + Stickers | Tap sticker icon → Link sticker |
| 3 | Add Link Screen | Paste NGL link → tap Done |
| 4 | Story with Link | Link placed on story, long-press hint |
| 5 | "Share this to" Sheet | Check Facebook Story ✓ → Share |
| 6 | Posting Animation | Both platforms confirmed ✓ |
| 7 | Live FB Story | Facebook story is live! |

> **Total steps: 8** (was 5, expanded for proper education)  
> **Deep link on final step:** Opens Instagram app (since that's where the flow starts)
