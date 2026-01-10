pls # PROJECT UI/UX REVAMP (Agent-Led)

## The Objective
Create a **"Bulletproof Production Foundation"** where AI agents can systematically debug, verify responsiveness, and enhance UI/UX without relying on "guesswork" or user screenshots. We want a "No-Coder" friendly system where the AI takes the lead in visual quality assurance.

## 1. Visual Debugging Infrastructure
To let the AI "see" the site without screenshots, we will implement a robust **Layout Debugger**.

### A. The "Ghost Grid" System
- **Usage**: Press `Ctrl + Shift + D` on the live site (Local or Prod).
- **Effect**:
  - Highlights grids in Lime Green.
  - Highlights images in Magenta.
  - Highlights potential overflows in Red.
  - Logs a full "Layout Audit" to the console immediately.
- **AI Action**: When things look broken, Agent asks: "Please press Ctrl+Shift+D and paste the console logs."

### B. "Sentry Mode" for Responsiveness
- **Auto-Run**: Automatically imported in `App.tsx`.
- **Manual Trigger**: Open Console (`F12`) -> Type `runLayoutAudit()` -> Enter.
- **What is logged**:
  - `overflow`: Elements wider than the screen (e.g., `Right edge at 400px (Viewport: 390px)`).
  - `small-text`: Fonts smaller than 10px.
  - `small-target`: Buttons smaller than 44x44px.

## 2. Phrase-Based Workflow (AI Trigger System)
Define specific "Phrases" that trigger complex agent workflows.

| Phrase | Agent Action |
| :--- | :--- |
| **"Analyze Mobile Layout"** | Runs the "Sentry Mode" check, reads the logs, and fixes overflow/padding issues. |
| **"Revamp Hero Section"** | Fetches current hero code, compares against "God-Tier" patterns (Blinkit/Uber), and proposes 3 variants. |
| **"Check Visual Hierarchy"** | Scans text sizes (`h1` vs `p`), contrast ratios, and whitespace. Suggests Tailwind class adjustments. |
| **"Bulletproof Deploy"** | Runs the Production Build → Serves locally → Checks 404s/Console Errors → Commits only if green. |

## 3. Tech Stack for "Viewing" (No-Coder Friendly)
Since the agent cannot visually "see" pixels, we use **DOM Proxies**:

1.  **Computed Style Dump**: A script tool the agent can run to get the *exact* pixel dimensions of an element on the user's screen (requires user to paste output or console log).
2.  **Snapshot Testing**: Use Vitest to render components and verify that critical HTML structures (like the Video Banner) are present and have correct classes for visibility (`block` vs `hidden`).

## 4. The "Responsiveness App" Integration plan
If using an external app (like "Responsively"):
1.  **Setup**: Configure specific viewports (iPhone 12, iPad Air, Laptop).
2.  **Workflow**:
    - User: "I see a bug on Mobile."
    - Agent: "Running Component Scan..." (Reads `home.tsx` + `mobile-overrides.css`).
    - Agent: "I detect a conflict between `w-screen` and your parent flex container. Applying Fix..."
    - User: Refreshes Responsively App to confirm.

## 5. Next Steps (Immediate Action Plan)
1.  **Standardize Grids**: Move all manual grids to `grid-cols-X` (Completed).
2.  **Fix Hiding Elements**: Ensure no critical content relies on fragile tricks like `calc(50% - 50vw)`. (Fixed Hero Video).
3.  **Implement "Ghost Grid"**: (Optional) Add a debug overlay component if requested.

---
*This document serves as the "Constitution" for future AI Agents working on this repo. Refer to it when asking for UI/UX stability.*
