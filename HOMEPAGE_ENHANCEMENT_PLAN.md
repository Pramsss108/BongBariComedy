#  Bong Bari Homepage: Vibe Coder Enhancement Masterplan

##  Objective Note
Create a radical, glitch-free, premium homepage experience that looks absolutely stunning ("rad") on both desktop and mobile. This document serves as the absolute source of truth for all AI agents. Read carefully. **DO NOT CODE WITHOUT REFERENCING THIS PLAN. NEVER HALLUCINATE.**

---

##  Phase 1: Environment & Cleanup Housekeeping
- **Action 1:** Empty out trash or bugged static assets (e.g., recursive user folders accidentally inserted into client/public). *(COMPLETED)*
- **Action 2:** Verify zero console errors on root load. Ensure scrollbar CSS doesn't bleed white on browsers. 

##  Phase 2: Mobile Header & Glass Dock Synergy (The Core Fix)
- **Action 1:** **Diagnose Header Independence:** Currently, when scrolling on phones, the top header unhooks or clashes with the overall viewport intent while the bottom glass dock floats. We need a fluid, unified aesthetic.
- **Action 2:** **Sync the Sticky Header:** Refactor the top Navbar to stick smoothly with a frosted backdrop-blur on scroll. It must never jump, jitter, or leave the structure behind.
- **Action 3:** **Z-Index Harmonization:** Ensure the mobile-navbar.tsx (bottom glass dock) and the top navigation share a harmonious z-index stack so one doesn't swallow the page while the other vanishes.
- **Action 4:** Adjust the viewport heights and bottom-padding so the fixed mobile dock never eclipses the page footer.

##  Phase 3: The "Rad" Footer Redesign
- **Action 1:** The ultra-slim footer was made *too* dull. It needs to look sexy and minimalist without losing its identity.
- **Action 2:** **Desktop Layout:** Center the logo, inject a super subtle breathing glow behind the Bong Bari copyright, and use elegant, airy spacing for social media icons. Make it feel like an Apple-level product footer.
- **Action 3:** **Mobile Layout:** Make sure the footer gracefully sits *above* the mobile glass dock. Add a pb-24 or similar bottom padding explicitly on mobile so users can scroll down enough to see the footer without the floating dock blocking it.

##  Phase 4: Desktop Homepage Visuals (Hero & Upgrades)
- **Action 1:** Fine-tune video boundaries. The video header must capture attention immediately without squishing content beneath the fold.
- **Action 2:** Audit call-to-actions (CTAs: Subscribe, Bong Kahini, Collab). Ensure they immediately draw the eye with hover-state elegance.
- **Action 3:** Tighten up "Work with Us" Section on Desktop. Reduce gaps, but keep it breathing naturally�no more massive voids of dead space.

##  Phase 5: Mobile Content Safe-Area Formatting
- **Action 1:** Audit all mobile section padding (px-4, px-6). Ensure elements hug the edge tastefully. Standardize a premium 16px to 20px safe area.
- **Action 2:** Ensure typography scales flawlessly�prevent giant hero text from breaking awkwardly on narrow mobile screens (e.g., iPhone SE).

##  Phase 6: Micro-Interactions & Flair
- **Action 1:** Refine the SVG brush-stroke underline animation for "Bong Bari". Let it paint beautifully every time.
- **Action 2:** Add luxurious hover states for all the new ultra-slim footer links. Focus on buttery smooth color transitions instead of abrupt hard switches.

##  Phase 7: Extensive QA Checks
- **Action 1:** Emulate Mobile rendering. Scroll rapidly up and down. Evaluate if the top menu hides properly or sticks smoothly.
- **Action 2:** Emulate Desktop standard (1080p+). Ensure the ultra-slim footer stretches perfectly and feels deliberate.

##  Phase 8: Safe Deployment Protocol
- **Action 1:** Type-checking check npm run check.
- **Action 2:** Git pipeline through npm run deploy:safe with FORCE_PAGES_DEPLOY. Wait 2 minutes for edge networks to clear cache before giving the user the green light.

---
**Protocol For AI Agents:** You are to execute this sequentially. Move deliberately, phase by phase. Keep the vibes high. Do not hallucinate code. Plan it, build it, ship it.
