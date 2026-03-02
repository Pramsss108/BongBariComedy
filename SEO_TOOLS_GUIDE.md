# 🔍 SEO Guide — BongBari Tools Pages
> **For vibe coders & non-coders alike.** This doc explains how SEO works on the tools pages, what was implemented, and how to add SEO to any new page in the future.

---

## 🎯 Why Tools Pages Need Special SEO

The homepage already has meta tags in `client/index.html`. But those are **static** — they never change no matter which page you're on. When someone shares `www.bongbari.com/tools/humanizer` on WhatsApp or searches for it on Google, without per-page SEO:

- ❌ The title shows "Bong Bari - Bengali Comedy Channel" (irrelevant)
- ❌ The description is about comedy, not the humanizer tool
- ❌ Google doesn't know this is a free software tool
- ❌ No link preview icon when pasting URL in WhatsApp/Telegram

With per-page SEO now implemented:
- ✅ The humanizer page title is: **"Free AI Text Humanizer — Bypass ZeroGPT & TurnItIn | Bong Bari"**
- ✅ Searchable for: "AI text humanizer", "bypass ZeroGPT", "bypass TurnItIn" etc.
- ✅ Google sees this as a **SoftwareApplication** (gets rich results)
- ✅ WhatsApp/Telegram link previews show the tool description

---

## ✅ What Was Implemented (March 2026)

### Files Changed
| File | What Changed |
|---|---|
| `client/src/main.tsx` | Wrapped app with `<HelmetProvider>` — required for react-helmet-async |
| `client/src/components/SEOHead.tsx` | **NEW** — reusable SEO component (import this on any page) |
| `client/src/pages/free-tools.tsx` | Added `<SEOHead>` + JSON-LD CollectionPage schema |
| `client/src/pages/free-tools-humanizer.tsx` | Added `<SEOHead>` + JSON-LD SoftwareApplication schema |
| `client/public/sitemap.xml` | Added `/tools` (priority 0.9) and `/tools/humanizer` (priority 0.95) |

### Package Added
```
react-helmet-async  — manages <head> tags dynamically per page in an SPA
```

---

## 🏗️ Architecture: How It Works

```
SPA (React) → each route renders a page component
                         ↓
          <SEOHead> component calls react-helmet-async
                         ↓
          Injects correct <title>, <meta>, <link canonical>,
          og: tags, twitter: tags, JSON-LD into <head>
                         ↓
          Social crawlers (WhatsApp, Telegram, LinkedIn) read these tags
          Search engines (Google) read JSON-LD for rich results
```

> **Note for devs:** This is a SPA on GitHub Pages. Google CAN crawl and execute JavaScript, so per-page meta injected by React works for SEO. Social link previewers (WhatsApp etc.) only read static HTML though — so OG tags need to be present when the page first loads, which `react-helmet-async` handles.

---

## 🛠️ How to Add SEO to a New Page (Vibe Coder Guide)

**Step 1 — Import the component**
```tsx
import { SEOHead } from '@/components/SEOHead';
```

**Step 2 — Add it at the top of your page's JSX return**
```tsx
return (
  <>
    <SEOHead
      title="Your Page Title | Bong Bari"
      description="120–155 char description. What does this page do? Who is it for?"
      url="https://www.bongbari.com/your-page-url"
      keywords="keyword 1, keyword 2, keyword 3"
    />
    <div>...rest of your page...</div>
  </>
);
```

**That's it.** The component handles OG tags, Twitter cards, canonical URL, and all the rest automatically. 

### All Available Props
| Prop | Required? | What it does |
|---|---|---|
| `title` | ✅ Yes | Browser tab + Google search title (50–60 chars ideal) |
| `description` | ✅ Yes | Google/social snippet (120–155 chars ideal) |
| `url` | ✅ Yes | Full canonical URL (`https://www.bongbari.com/page`) |
| `image` | Optional | OG image URL — defaults to bongbari.com/logo.png |
| `keywords` | Optional | Comma-separated keywords for meta keywords tag |
| `structuredData` | Optional | JSON-LD object(s) for Google Rich Results |
| `type` | Optional | og:type — default `"website"`, use `"article"` for blog posts |
| `twitterCard` | Optional | `"summary"` or `"summary_large_image"` (default) |
| `noIndex` | Optional | Set `true` on admin/login pages to prevent indexing |

---

## 🎨 OG Image (Link Preview Icon)

The current OG image for all tools is the Bong Bari logo (`/logo.png`).

**Ideal dimensions:** 1200 × 630 px (16:9 ratio)

**How to add a custom OG image for the humanizer:**
1. Create a 1200×630 PNG image (tool logo, dark background with text)
2. Save it to `client/public/humanizer-og.png`
3. Update `SEOHead` in humanizer page to: `image="https://www.bongbari.com/humanizer-og.png"`
4. Build + deploy

> **Tip:** For best WhatsApp previews, keep the main visual element centered and avoid text / logos near the edges (they get cropped on small screens).

---

## 📊 Sitemap Priority Guide

| Priority | Use for |
|---|---|
| `1.0` | Homepage only |
| `0.95` | Best tool pages (high search traffic potential) |
| `0.9` | Tools hub, blog, important sections |
| `0.8` | About, Work with us, FAQ |
| `0.5–0.7` | Community, secondary pages |
| `0.1–0.3` | Legal pages, robots.txt |

Current tools priorities:
- `/tools` → `0.9`
- `/tools/humanizer` → `0.95` ← highest after homepage

---

## 🔑 Target Keywords (Humanizer Tool)

These are the keywords the humanizer page is now optimized for:

**Primary:**
- `AI text humanizer`
- `bypass ZeroGPT`
- `bypass TurnItIn`
- `AI to human text converter`
- `free humanizer tool`

**Secondary:**
- `ChatGPT humanizer`
- `AI detection remover`
- `humanize AI writing`
- `GPTZero bypass`

**Intent:** People searching these want a free tool that makes AI text undetectable. Our tool does exactly that — the keywords match the intent perfectly.

---

## 🚨 Important Rules (Don't Break This)

1. **Always wrap SEOHead in a Fragment `<>...</>`** if the page returns a single root div. The Fragment lets SEOHead and the page div coexist as siblings.

2. **Never change the canonical URL after a page goes live** — it resets Google's indexing of that URL.

3. **Never duplicate titles** — each page must have a unique title. Check existing pages before writing new ones.

4. **sitemap.xml lives in `client/public/`** — NOT in the repo root. Files in `client/public/` are served as static assets. Files in the repo root are not served by GitHub Pages.

5. **After adding a new sitemap URL**, resubmit the sitemap in Google Search Console at `https://search.google.com/search-console` (domain: `www.bongbari.com`).

---

## 📈 Expected SEO Results (Timeline)

| Week | Expected outcome |
|---|---|
| 1–2 | Google recrawls and indexes `/tools` and `/tools/humanizer` |
| 2–4 | Pages start appearing in search results for brand queries |
| 4–8 | Tool page starts ranking for "AI humanizer" related keywords |
| 2–6 months | Organic traffic from tool-related searches begins growing |

> Free tools are gold for SEO. People share them, link to them, and search for them. The humanizer page has high SEO potential because it solves a specific real problem.
