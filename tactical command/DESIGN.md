# Design System: Tactical Command Architecture

## 1. Overview & Creative North Star
**Creative North Star: "The Obsidian Lens"**
This design system is engineered for high-stakes, real-time proxy management. It moves beyond the "web dashboard" aesthetic into a "Tactical HUD" (Heads-Up Display) experience. The goal is to transform a data-heavy environment into a single-viewport cockpit that feels precise, expensive, and authoritative.

We break the "template" look by using a **Hyper-Compact Information Density** strategy. By utilizing intentional asymmetry and varying the "visual weight" of data clusters, we guide the eye toward anomalies (Red/Hunting) and away from the noise of steady states (Emerald/Healthy). The layout is a single, non-scrolling viewport where every pixel is an intentional asset.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep space blacks and neon-infused semantic triggers. We use the Material Design token logic but apply it through a high-end, editorial lens.

### Core Palette
- **Primary (Cyan):** `#4cd7f6` — Use for platinum-tier status and high-level navigation anchors.
- **Secondary (Emerald):** `#4edea3` — The pulse of the system. Indicates healthy proxy streams.
- **Tertiary (Red):** `#ffb3ad` — Reserved for "Hunting" or "Danger" states. This must pierce the dark background.
- **Background:** `#0a0a0f` — A "true-black" variant that provides the infinite depth required for glassmorphism.

### The "No-Line" Rule
Traditional 1px solid borders for sectioning are strictly prohibited for structural separation. Boundaries must be defined through **Tonal Transitions**. Use `surface_container_lowest` for the main background and `surface_container` for primary panels. If a visual break is needed, use a `0.2rem` (Spacing-1) gutter rather than a line.

### The Glass & Gradient Rule
All primary panels must utilize **Atmospheric Layering**:
- **Background:** `rgba(255, 255, 255, 0.03)`
- **Backdrop-Blur:** `20px` to `40px`
- **Ghost Border:** Use `outline_variant` at 6% opacity (`rgba(255, 255, 255, 0.06)`) ONLY to define the panel edge against the dark background, never to separate internal content.

---

## 3. Typography: The Mono-Precision Scale
We leverage a dual-font strategy to balance human readability with machine-like precision.

- **Data & Metrics (JetBrains Mono):** All numerical values, IP addresses, and latency metrics. This provides a "terminal" feel that resonates with technical users.
- **Labels & UI (Inter/Sans-Serif):** Clean, utilitarian sans-serif for functional labels.
- **The "Editorial Label" Rule:** All functional labels (e.g., "CONNECTION UPTIME") must be **9px, All-Caps, with 0.05em tracking**.
- **Opacity Hierarchy:** 
    - **Primary Text:** 90% Opacity (`on_surface`).
    - **Labels/Secondary:** 40% Opacity (`on_surface_variant`).
    - **Tertiary/De-emphasized:** 20% Opacity.

---

## 4. Elevation & Depth
In a single-viewport command center, depth replaces the need for scrolling. We use a **Tonal Layering Principle**.

- **Level 0 (Base):** `surface_dim` (#0a0a0f) - The void.
- **Level 1 (Panels):** `surface_container_low` with glassmorphism. These are the main "Proxy Command" containers.
- **Level 2 (Active Widgets):** `surface_container_highest`. Use this for active selection or hovering over a specific proxy line.

### Ambient Shadows
Avoid "Drop Shadows." Instead, use **Outer Glows**. For a high-priority "Hunting" alert, use a Red shadow with a `24px` blur at `8%` opacity. It should feel like the panel is emitting light, not sitting on a table.

---

## 5. Components & Interface Patterns

### Tactical Data Cards
*Forbid the use of divider lines.* Use vertical white space (`Spacing 4` or `0.9rem`) to group related proxy sets. 
- **Header:** Label at 9px (40% opacity).
- **Metric:** JetBrains Mono at `title-lg` scale (90% opacity).
- **Trend:** A subtle gradient sparkline transitioning from `secondary` to `secondary_container`.

### Command Buttons
- **Primary (Action):** Ghost-style. No solid fill. `1px` border at 20% opacity of the `primary` color. On hover, the fill becomes 10% opacity.
- **Status Chips:** Small, pill-shaped. No background. Use a leading 4px dot of the semantic color (Emerald/Cyan/Red) to indicate status.

### Input Fields (Terminal Style)
- **State:** No background. A single underline using `outline_variant` at 20% opacity.
- **Focus:** The underline transitions to `primary` (Cyan) with a subtle `2px` glow.

### Proxy Grid
- **Compactness:** Use `Spacing 1.5` (0.3rem) for row padding.
- **Interactive Layers:** On row hover, shift the background to `rgba(255, 255, 255, 0.05)`. Do not use a border.

---

## 6. Do's and Don'ts

### Do:
- **Use Micro-Interactions:** A subtle 1% scale-up when hovering over a tactical panel.
- **Embrace Asymmetry:** If the left column is data-heavy, leave the right column with more "breath" (surface-container-lowest) to prevent visual fatigue.
- **Stick to the Grid:** Every panel must align to the `0.2rem` spacing increments to maintain the "engineered" feel.

### Don't:
- **Don't use pure white (#FFFFFF):** It breaks the glass effect. Always use `on_surface` at 90% opacity.
- **Don't use standard icons:** Use thin-stroke (1px or 1.5px) technical icons. Avoid filled or "playful" iconography.
- **Don't Scroll:** If content exceeds the viewport, use internal tabbed "Blades" or nested containers. The "Command Center" must always be visible in its entirety.