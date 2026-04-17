# 🔧 DNS Fix Guide (Non-Coder Friendly)
## তোর জন্য — Step by step, ছবির মতো করে

---

## ✅ তুই এখন Cloudflare-এ আছিস — Perfect!

এখন এই steps follow কর:

---

## Step 1 — বাঁদিকে "Domains" তে click কর

Cloudflare-এর বাঁদিকে মেনুতে দেখবি **"Domains"** লেখা আছে।  
সেটায় click কর।

---

## Step 2 — "bongbari.com" তে click কর

Domain list-এ **bongbari.com** দেখতে পাবি।  
সেটায় click কর।

---

## Step 3 — বাঁদিকে "DNS" তে click কর

bongbari.com এর ভেতরে ঢোকার পর বাঁদিকে মেনুতে **"DNS"** দেখবি।  
তারপর **"Records"** দেখবি। সেটায় click কর।

---

## Step 4 — "api" record খুঁজে বের কর

একটা লম্বা table দেখবি। সেখানে **Name** column-এ **`api`** লেখা একটা row খুঁজে বের কর।

> এটা দেখতে এরকম হবে:
> | Type | Name | Content |
> |------|------|---------|
> | A | api | 78.47.104.43 |

---

## Step 5 — "Edit" করো

সেই `api` row-এর একদম ডানদিকে **"Edit"** বা **pencil icon** দেখবি।  
সেটায় click কর।

---

## Step 6 — IP address বদলাও

**Content / IPv4 address** বক্সে এখন আছে:
```
78.47.104.43
```

সেটা মুছে এটা লিখে দাও:
```
158.101.175.37
```

---

## Step 7 — Save করো

নিচে **"Save"** বাটনে click কর।

---

## ⏳ Step 8 — 5 মিনিট অপেক্ষা কর

এরপর 5 মিনিট অপেক্ষা কর। তারপর www.bongbari.com খুলে test কর।

---

## ✅ কাজ হয়েছে কিনা test করতে VS Code terminal-এ এটা paste কর:

```powershell
$env:DEV_API_BASE="http://158.101.175.37:5000"
node scripts/dev-pro.cjs status pramsss108
```

যদি `PRO: YES` দেখায় — সব ঠিক আছে! 🎉

---

## 🆘 কোনো সমস্যা হলে

Cloudflare-এ যদি `api` নামের record না দেখিস, screenshot তুলে দে।  
আমি দেখে নেব।
