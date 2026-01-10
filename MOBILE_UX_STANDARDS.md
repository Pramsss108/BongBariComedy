# Mobile UX/UI Standards — BongBari Comedy

This document defines the strict styling rules for mobile devices to ensure readability, accessibility, and a "non-chi-chi" (professional) look.

## 📱 Typography Hierarchy (Mobile Portrait)
*Base Device Width: 320px - 428px*

### Headings
| Element | Scale | CSS Size | Tailwind | Notes |
|:---:|:---:|:---:|:---:|:---|
| **H1 (Hero)** | XXL | `32px` - `40px` | `text-4xl` | Main impact, typically Bengali + English |
| **H2 (Section)** | XL | `24px` - `28px` | `text-2xl` | "Latest Comedy", "Meme Zone" |
| **H3 (Card Title)** | LG | `18px` - `20px` | `text-lg` | Video titles, "Most Loved" |
| **H4 (Subheader)** | MD | `16px` | `text-base` | Metadata, Dates |

### Body Copy
| Element | Scale | CSS Size | Tailwind | Notes |
|:---:|:---:|:---:|:---:|:---|
| **Body (Main)** | Base | `16px` | `text-base` | **Never** go below 16px for readability |
| **Body (Small)** | SM | `14px` | `text-sm` | Secondary info, footers |
| **Caption** | XS | `12px` | `text-xs` | Timestamps, extremely minor tags only |

**🚫 PROHIBITED:** Avoid `10px` or `9px` text anywhere. It is illegible on mobile.

---

## 📐 Spacing & Layout

### Grid Systems
*   **Video Feeds**: **2 Columns** (Fixed).
    *   Gap: `12px` (0.75rem).
    *   Padding X: `16px` (1rem) — Prevent edge-to-edge touching.
*   **Hero Section**:
    *   Top Padding: `100px` (Ensure header clearance).
    *   Video Container: aspect-ratio `16/9` or `4/5`. Width `100%`. Corner Radius `16px`.

### Touch Targets (Interactive Elements)
*   **Buttons**: Min-height `48px`.
*   **Inputs**: Min-height `48px`. Font-size `16px` (prevents iOS zoom).
*   **Icons**: Tap area min `44x44px`.

---

## 🎨 Visual Containers
*   **Shadows**: Soft, diffuse shadows (`box-shadow: 0 4px 20px rgba(0,0,0,0.08)`).
*   **Borders**: Thin, subtle borders (`1px solid #e2e8f0`).
*   **Backgrounds**: Pure White (`#ffffff`) for cards to pop against colored backgrounds.

---

## 🔧 Implementation Plan
1.  **Reset Mobile Fonts**: Force all `h2`, `h3` in `mobile-overrides.css` to meet min-sizes.
2.  **Fix Hero**: Restore the "Video Container" look (border, shadow, radius).
3.  **Grid**: Enforce 2-col layout with proper spacing.
