# 🔧 HUMANIZER BLANK SCREEN — DIAGNOSIS REPORT
**Date:** March 1, 2026  
**Symptom:** `/tools/humanizer` shows blank yellow screen  
**Severity:** 🔴 CRITICAL — Page completely broken  

---

## 🔍 ROOT CAUSE FOUND

**2 missing `useState` declarations** in `client/src/pages/free-tools-humanizer.tsx`

The following variables are **used** in the code but were **never declared**:

| Variable | Used At (Lines) | Purpose |
|---|---|---|
| `showDeviceOverride` / `setShowDeviceOverride` | Lines 398, 501, 763, 786 | Netflix-style device conflict popup |
| `lastPrompt` / `setLastPrompt` | Lines 396, 505 | Stores prompt for retry after device override |

### What Happens at Runtime:
1. ✅ React lazy-loads `FreeToolsHumanizer` correctly
2. ✅ Component starts rendering
3. ❌ **Line 763**: JSX hits `{showDeviceOverride && (` → **`ReferenceError: showDeviceOverride is not defined`**
4. 💥 React crashes the entire component tree
5. 🟡 The parent `bg-brand-yellow` div survives → **blank yellow screen**

---

## 🛠️ PROPOSED FIX (2 lines — SAFE, adds only, changes nothing)

**File:** `client/src/pages/free-tools-humanizer.tsx`  
**Location:** After line 314 (after `const [bootMsgIndex, setBootMsgIndex] = useState(0);`)  

**Add these 2 lines:**
```tsx
const [showDeviceOverride, setShowDeviceOverride] = useState(false);
const [lastPrompt, setLastPrompt] = useState('');
```

### Why This Is Safe:
- ✅ Only ADDS 2 new state declarations — changes NOTHING existing
- ✅ These are the exact variables already used on lines 396, 398, 501, 505, 763, 786
- ✅ Default values (`false` and `''`) are safe — popup stays hidden, prompt starts empty
- ✅ No imports needed — `useState` is already imported on line 1
- ✅ The Device Override popup (lines 763-797) and `handleDeviceOverride` function (lines 500-516) are already fully coded and will work once states exist

---

## 🟡 BONUS FIX (RECOMMENDED but not urgent)

**No Error Boundary exists anywhere in the app.** If any lazy-loaded page crashes, the entire app goes blank with no recovery. Recommend adding one later (not needed for this fix).

---

## ✅ NOTHING ELSE WRONG

| Check | Status |
|---|---|
| Route `/tools/humanizer` in App.tsx | ✅ Correct (line 36) |
| Lazy import of FreeToolsHumanizer | ✅ Correct |
| Default export in the file | ✅ Exists |
| `framer-motion` installed | ✅ Yes |
| `firebase` installed | ✅ Yes |  
| Server routes (`humanizer.ts`) | ✅ Working |
| NLP utils (`nlp.ts`) | ✅ Working |
| All other state variables | ✅ Declared correctly |

---

## ⏭️ ACTION NEEDED

**Please reply "YES" or "GO" and I will add ONLY the 2 missing lines. Nothing else will be touched.**
