# 🍼 Fix Cloudflare → Oracle Port (Baby Steps)

## ❓ What's The Problem?
- `api.bongbari.com` goes through Cloudflare
- Cloudflare connects to your server on **port 80** (default)
- But Oracle VM runs on **port 5000** (no port 80!)
- So we need to tell Cloudflare: "Hey, use port 5000 instead of 80"

---

## 🔧 THE FIX: Create an Origin Rule in Cloudflare

### Step 1: Open Cloudflare Dashboard
1. Open your browser
2. Go to: **https://dash.cloudflare.com**
3. Log in if needed
4. Click on **bongbari.com** (your domain)

✅ You should see the Overview page for bongbari.com

---

### Step 2: Go to Rules → Origin Rules
1. Look at the **left sidebar** (left side of the page)
2. Scroll down until you see **"Rules"** — click it
3. A sub-menu will open
4. Click **"Origin Rules"**

✅ You should see a page that says "Origin Rules" with a blue button

---

### Step 3: Create a New Rule
1. Click the blue button: **"+ Create rule"**

✅ You should see a form to fill in

---

### Step 4: Fill In the Rule Name
1. Find the field that says **"Rule name"** (at the top)
2. Type: **`API Port 5000`**

✅ The name box should show: API Port 5000

---

### Step 5: Set the "When" Condition (IF)
1. Look for section called **"When incoming requests match..."** or **"If..."**
2. In the **Field** dropdown, select: **`Hostname`**
3. In the **Operator** dropdown, select: **`equals`**
4. In the **Value** field, type: **`api.bongbari.com`**

✅ It should read: "Hostname equals api.bongbari.com"

---

### Step 6: Set the "Then" Action (Destination Port)
1. Scroll down to the **"Then..."** section
2. Look for **"Destination port"** — there may be a toggle or checkbox
3. **Enable/check** the Destination port option
4. In the port number field, type: **`5000`**

✅ It should show: Destination port → 5000

---

### Step 7: Save the Rule
1. Scroll to the bottom of the page
2. Click the blue **"Deploy"** button (or "Save")

✅ You should see your new rule listed: "API Port 5000" — Active

---

### Step 8: Wait 30 Seconds, Then Tell Me "Done"
Cloudflare applies Origin Rules almost instantly (under 1 minute).

Come back here and say **"done"** — I will test everything automatically!

---

## 🧪 What I Will Test After You Say "Done"
1. `https://api.bongbari.com/api/version` → should show `nodeVersion: v22` (Oracle)
2. `POST /api/ngl/payment/dev-grant` → should return `200 OK`
3. Frontend `www.bongbari.com` → should load normally

---

## 📸 Screenshots Reference

### What the Origin Rule should look like when done:
```
Rule name:     API Port 5000
When:          Hostname equals api.bongbari.com
Then:          Destination port = 5000
Status:        Active ✅
```

---

## ⚠️ Troubleshooting

### "I don't see Origin Rules"
- Make sure you clicked **Rules** first (not DNS or Security)
- Origin Rules is a sub-item under Rules
- Free plan includes Origin Rules (10 rules)

### "I don't see Destination port option"
- After enabling the rule condition (the IF part), scroll down
- Look for "Destination port" with a toggle/checkbox next to it
- Click the toggle to enable it, then type 5000

### "Deploy button is grayed out"
- Make sure you filled in ALL fields:
  - Rule name ✅
  - Hostname equals api.bongbari.com ✅  
  - Destination port 5000 ✅

---

## 🔒 DO NOT TOUCH (Already Done)
- ✅ DNS record `api` → `158.101.175.37` (Oracle IP) — CORRECT
- ✅ Proxy status: 🟠 Proxied — CORRECT
- ✅ Cloudflare nameservers active — CORRECT
- ✅ SSL/TLS mode: Full — CORRECT
