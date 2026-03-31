# Bong Bot Mascot — AI Research & Creation Prompts

> **Goal:** Get a premium animated robot mascot for BongShare landing page
> **Character:** Cute robot holding chai cup (left hand), gesturing "pick a mode" (right hand)
> **Style:** Dark charcoal body, gold #f0c12c accent eyes/lines, soft glow
> **Output needed:** Lottie JSON, Rive .riv, or animated SVG

---

## 🎯 PROMPT 1: Generate Robot Design (Image AI)

Use this in **Midjourney / DALL-E / Flux / Ideogram / Leonardo AI**:

```
Cute friendly robot mascot character, front-facing, standing pose.
Left hand holding a steaming chai tea cup. Right hand open palm gesturing to the right side.
Round head with large expressive gold glowing eyes (#f0c12c).
Dark charcoal/gunmetal body with gold accent lines and subtle glow.
Flat vector illustration style, clean lines, suitable for web animation.
Dark background (#0c0c0e). No text. Character only.
Style: modern tech mascot, like WALL-E meets Baymax, cute not scary.
Aspect ratio 1:1, high detail.
```

### Variations to try:
```
// More cute/kawaii:
Adorable kawaii robot character, chibi proportions, big round gold eyes,
holding chai cup, dark theme, flat vector, suitable for Lottie animation

// More techy/premium:
Sleek premium robot assistant mascot, minimal design, floating,
gold accent lines on dark body, holding tea cup, gesture hand,
Apple-style product render, dark background, vector art

// With WiFi waves:
Cute robot mascot surrounded by WiFi signal waves and floating file icons
(document, video, music, image), holding chai cup, dark theme,
gold accents, flat illustration for web animation
```

---

## 🎯 PROMPT 2: Remove Background & Isolate Character

After generating the image, use these tools to get a clean transparent PNG:

| Tool | Link | Notes |
|------|------|-------|
| **remove.bg** | https://remove.bg | Best auto-remove, free |
| **Clipdrop** | https://clipdrop.co/remove-background | Adobe-quality AI |
| **Photopea** | https://photopea.com | Free Photoshop clone, manual refine |
| **Canva BG Remover** | https://canva.com | Drag image → click "Remove background" |

---

## 🎯 PROMPT 3: Convert Static Image → Animated Lottie

### Option A: Use SVGator (AI-assisted animation)
1. Trace your PNG to SVG: https://vectorizer.ai or Figma auto-trace
2. Upload SVG to https://www.svgator.com
3. Add keyframe animations (bob, blink, steam, wave)
4. Export as Lottie JSON

### Option B: Use LottieFiles AI
1. Go to https://lottiefiles.com/ai
2. Describe: 
```
Cute dark robot mascot with gold eyes, gently bobbing up and down,
steam rising from a chai cup in left hand, right hand gesturing,
eyes blink occasionally, dark theme
```
3. Download as .json

### Option C: Use Rive (Interactive States)
1. Go to https://rive.app
2. Import SVG of your robot
3. Set up State Machine:
   - State 1: "Idle" — gentle bob + chai steam + blink
   - State 2: "Hover" — eyes glow brighter, slight lean
   - State 3: "Excited" — raises chai cup, bounces
4. Export as .riv file
5. Use `@rive-app/react-canvas` in React

---

## 🎯 PROMPT 4: Animate Body Parts Separately (Advanced)

If you want the BEST result, split the robot into separate SVG layers:

```
Layer 1: Body (static, dark charcoal)
Layer 2: Head (subtle bob animation, Y transform)  
Layer 3: Eyes (blink: scaleY 1→0→1 every 3-4 seconds)
Layer 4: Left arm + chai cup (slight float, steam particles)
Layer 5: Right arm (gentle wave/gesture loop)
Layer 6: Gold accent lines (pulse glow opacity 0.5→1→0.5)
Layer 7: Steam from chai (rising particles, fade out)
```

### CSS Animation keyframes for each layer:
```css
@keyframes robotBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes eyeBlink {
  0%, 90%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}
@keyframes chaiSteam {
  0% { opacity: 0; transform: translateY(0) scale(0.8); }
  50% { opacity: 0.6; }
  100% { opacity: 0; transform: translateY(-20px) scale(1.2); }
}
@keyframes accentPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; filter: drop-shadow(0 0 8px #f0c12c); }
}
@keyframes armWave {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(5deg); }
}
```

---

## 🎯 PROMPT 5: Find Pre-Made Robot on LottieFiles

Search these on https://lottiefiles.com:

```
robot waving
cute robot assistant  
robot character dark
bot mascot animation
robot greeting
tech assistant character
friendly AI robot
```

**After downloading**, customize in LottieFiles Editor:
1. Open https://lottiefiles.com/editor
2. Upload the .json
3. Change body color → dark charcoal (#1a1a2e)
4. Change accent/eyes → gold (#f0c12c)
5. Export customized .json

---

## 🎯 PROMPT 6: Codex/Copilot Iteration Prompt

After you have a base animation (Lottie JSON or SVG), use this prompt in VS Code Copilot to integrate:

```
I have a Lottie JSON animation file at attached_assets/bong-bot.json.
Create a React component called BongBot that:
1. Renders the Lottie animation centered, w-48 h-48 on mobile, w-64 h-64 on desktop  
2. Has a subtle WiFi wave background behind it (CSS-only, pulsing arcs)
3. Below the animation, shows text: "Send files over WiFi, Internet, or generate a link. No signup."
4. The component should use lottie-react package
5. On hover, speed up the animation slightly (speed: 1.5)
6. Dark background, gold #f0c12c text accents
```

---

## 🎯 PROMPT 7: Spline 3D Robot (Ultra-Premium, Optional)

If you want a 3D robot instead of 2D:

1. Go to https://spline.design
2. Search community: "robot" or "assistant" or "mascot"
3. Fork a robot model → edit materials:
   - Body: dark metallic (#1a1a2e)
   - Eyes: emissive gold (#f0c12c)
   - Add a chai cup prop
4. Export → embed in React with `@splinetool/react-spline`

Or generate 3D from text: https://meshy.ai (text-to-3D, free tier)
```
Cute friendly robot character, rounded body, large gold eyes,
holding a tea cup, dark metallic material, stylized cartoon
```

---

## 📋 Quick Workflow Summary

```
Step 1: Generate robot image (Midjourney/DALL-E/Flux) → PROMPT 1
Step 2: Remove background → PROMPT 2  
Step 3: Convert to SVG (vectorizer.ai or Figma trace)
Step 4: Animate (SVGator / Rive / LottieFiles) → PROMPT 3/4
Step 5: Export as Lottie .json → save to attached_assets/bong-bot.json
Step 6: Integrate in React with Copilot → PROMPT 6
Step 7: Iterate design with Codex in VS Code
```

**Fastest path (5 min):** Search LottieFiles → download robot → customize colors → done
**Best quality (30 min):** AI generate → trace SVG → animate in Rive → export
**Ultra-premium (1 hr):** Spline 3D → embed interactive model

---

## 🔗 All Resource Links

| Resource | What | Link |
|----------|------|------|
| LottieFiles Search | Pre-made robot animations | https://lottiefiles.com/search?q=robot |
| LottieFiles AI | Generate from description | https://lottiefiles.com/ai |
| LottieFiles Editor | Customize colors/timing | https://lottiefiles.com/editor |
| Rive App | Interactive animation tool | https://rive.app |
| Rive Community | Pre-made characters | https://rive.app/community |
| SVGator | SVG→Lottie animation | https://www.svgator.com |
| Spline 3D | Free 3D design tool | https://spline.design |
| Spline Community | Pre-made 3D models | https://spline.design/community |
| Vectorizer.ai | Image→SVG trace | https://vectorizer.ai |
| remove.bg | Background removal | https://remove.bg |
| Clipdrop | AI background removal | https://clipdrop.co/remove-background |
| Meshy AI | Text-to-3D | https://meshy.ai |
| IconScout | Free Lottie animations | https://iconscout.com/lottie-animations/robot |
| Lordicon | Animated icons | https://lordicon.com |
| Storyset | Illustrated scenes | https://storyset.com |
