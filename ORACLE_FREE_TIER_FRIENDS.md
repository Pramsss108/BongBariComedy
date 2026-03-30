# ☁️ Oracle Cloud Free Tier — বন্ধুদের জন্য পরিষ্কার ব্যাখ্যা
> Version: 1.0 | March 2026 | BongBari Media Group

---

## 🔴 সবচেয়ে গুরুত্বপূর্ণ কথা (TL;DR)

**"Credit card দিলেই charge হয় না।"**

Oracle Cloud-এ PAYG (Pay As You Go) account খুললে credit card লাগে —  
কিন্তু **তুমি manually যদি paid resource না কিনো, একটা টাকাও কাটবে না।**  
Always Free মানে **সত্যিই চিরকাল ফ্রি** — কোনো trial period নেই।

---

## 💳 Credit Card কেন চায়? (ভয়ের কিছু নেই)

Oracle দুই ধরনের account দেয়:

| Account Type | Credit Card লাগে? | Charge হয়? |
|---|---|---|
| **Free Tier Only** | না | না |
| **Pay As You Go (PAYG)** | হ্যাঁ | শুধু paid resource কিনলে |

PAYG account-এ credit card verify করে শুধু **identity confirm** করতে —  
ঠিক যেভাবে Swiggy account বানাতে card add করো কিন্তু charge তখনই হয় যখন order করো।

**Oracle Always Free basket থেকে কোনো টাকা কাটার কোনো mechanism নেই।**  
System-ই allow করে না।

---

## 🆓 Always Free — কী কী পাবে চিরকাল?

এগুলো **expire হয় না, trial না, permanent:**

### 🖥️ Compute (সার্ভার)
| Resource | Free Amount | AWS এ দাম |
|---|---|---|
| **AMD VM** (x86) | 2টা VM, প্রতিটা 1 OCPU + 1GB RAM | $15–20/month each |
| **Ampere ARM VM** | মোট **4 OCPU + 24GB RAM** (যেকোনো combination এ ভাগ করো) | $80–120/month |
| **Block Storage** | 200GB total | $20/month |
| **Outbound Data** | 10TB/month | $900/month (AWS এ!) |

### 🗄️ Database & Storage
| Resource | Free Amount |
|---|---|
| Autonomous Database | 2টা, 20GB each |
| Object Storage | 20GB |
| Archive Storage | 10GB |

### 🌐 Networking
| Resource | Free Amount |
|---|---|
| Load Balancer | 1টা (10Mbps) |
| Public IP | Compute এর সাথে free |
| VPN | Site-to-Site VPN (2 tunnels) |

---

## 📊 AWS vs Oracle — Real Cost Comparison

**আমাদের setup equivalent AWS-এ কত লাগতো:**

```
Oracle Always Free (আমাদের config):
  ├── 4 OCPU ARM Ampere VM        → $0/month  (AWS: $80-120/month)
  ├── 24GB RAM                    → $0/month  (included above)
  ├── 200GB Block Storage         → $0/month  (AWS: $20/month)
  ├── 10TB Outbound Transfer      → $0/month  (AWS: $900/month!)
  └── 1 Load Balancer             → $0/month  (AWS: $18/month)
  
  TOTAL Oracle:      ₹0/month
  TOTAL AWS equiv:  ~$1,038–1,158/month = ₹86,000–97,000/month
```

**আমরা actually কত খরচ করছি:**
```
  Oracle Cloud VM (backend API):    ₹0/month  ✅ Always Free
  Hetzner VPS (Cobalt downloader):  €4.5/month ≈ ₹420/month
  Neon Postgres (database):         ₹0/month  ✅ Free tier
  Cloudflare Workers:               ₹0/month  ✅ 100k req/day free
  GitHub Pages (frontend):          ₹0/month  ✅ Free
  
  TOTAL:  ₹420/month (~€4.5)
  
  Same setup on AWS/GCP/Azure:  ₹90,000+/month
```

---

## ⏰ "Trial Period" আছে কি? — উত্তর: না

Oracle এ দুটো আলাদা জিনিস আছে:

```
1. FREE TRIAL CREDITS (প্রথম 30 দিন):
   → $300 USD credit পাবে যেকোনো resource try করতে
   → 30 দিন পরে expire হয়
   → এটা bonus — এটা শেষ হলে শুধু Always Free তে ফিরে আসবে

2. ALWAYS FREE RESOURCES:
   → কোনো expiry নেই
   → কোনো time limit নেই  
   → AWS এর "free tier" এর মত 12-month limit নেই
   → Oracle নিজেই বলে: "Indefinitely — as long as Oracle offers them"
```

**AWS Free Tier vs Oracle Always Free — পার্থক্য:**
```
AWS Free Tier:      12 মাস পরে charge শুরু → ভয়ের কারণ আছে
Oracle Always Free: কোনো limit নেই → সত্যিকারের ফ্রি
```

---

## 🤔 তাহলে Charge কখন হবে?

**শুধুমাত্র তখন যখন তুমি নিজে manually:**
- Always Free limit এর বাইরে নতুন VM বানাবে
- Paid database tier upgrade করবে
- Extra storage কিনবে
- Reserved instance purchase করবে

**কীভাবে বুঝবো accidentally কিছু কিনে ফেলিনি?**
```
Oracle Console → Billing → Cost Analysis দেখো
সবসময় $0.00 দেখাবে যদি শুধু Always Free use করো
```

**Budget Alert set করো (Extra safety):**
```
Oracle Console → Billing → Budgets → Create Budget
Amount: $1  →  Alert এ email পাবে যদি কোনো charge হয়
এটা set করলে কোনো surprise charge never possible
```

---

## 🚀 আমাদের Scaling Plan

**এখন (Phase 1):**
```
Current Oracle VM:
  1 OCPU + 1GB RAM (Always Free standard tier)
  Purpose: BongBari backend API (bongbari.com)
  Status: ✅ Running
```

**ভবিষ্যৎ (Phase 2 — যখন traffic বাড়বে):**
```
Upgrade করবো Oracle Ampere ARM এ:
  4 OCPU + 24GB RAM
  Cost: ₹0 (Always Free)
  Purpose: Full backend + downloader engine + AI features
  
  Same Oracle account থেকেই করবো:
  → পুরানো VM delete করি
  → নতুন Ampere VM create করি (free allocation এর মধ্যে)
  → Done — কোনো extra cost নেই
```

**কেন 24GB RAM দরকার হবে?**
```
1. yt-dlp + FFmpeg concurrent downloads → RAM hungry
2. Bengali TTS (AI voice generation) → 4-8GB per model
3. Video trimmer preview → in-memory processing
4. Redis cache (proxy pool) → 1-2GB
5. Node.js + all microservices → 2-3GB

1GB RAM এ: সব ঠিকঠাক কিন্তু slow হতে পারে heavy load এ
24GB RAM এ: সব blazing fast, 100+ concurrent users handle করতে পারবো
```

---

## 📱 বন্ধুদের বলার জন্য Simple Version

```
প্রশ্ন: "Credit card দিলে automatic charge হবে না তো?"
উত্তর: "একদম না। Always Free মানে চিরকাল ফ্রি।
        Charge হয় শুধু যদি তুমি নিজে paid service কিনো।
        Budget Alert set করে রাখো — $1 হলেও email আসবে।
        আমরা AWS এ যা পেলে $1000+/month লাগতো,
        Oracle এ সেটা ₹0 তে পাচ্ছি।"

প্রশ্ন: "এটা কি 12 মাস পরে শেষ হয়ে যাবে?"
উত্তর: "না। Oracle Always Free = AWS Free Tier না।
        AWS এর 12 মাস limit নেই এখানে।
        Official Oracle page বলে: 'No time limit.'"

প্রশ্ন: "তাহলে Oracle লস করছে না?"
উত্তর: "করছে — কিন্তু এটা তাদের strategy।
        আমরা বড় হলে paid tier এ upgrade করবো বলে তারা আশা রাখে।
        আমরা কোনোদিন না করলেও তারা কিচ্ছু করতে পারবে না।
        Contract এ clearly লেখা আছে।"
```

---

## 🔗 Official Sources (নিজে verify করো)

- Oracle Always Free docs: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Oracle pricing page: https://www.oracle.com/cloud/free/

---

## ✅ আমাদের Current Stack Summary

```
BongBari Media Group — Infrastructure Cost Sheet (March 2026)

Service              | Provider        | Cost/month | Equivalent AWS
---------------------|-----------------|------------|---------------
Frontend hosting     | GitHub Pages    | ₹0         | $20 (S3+CloudFront)
Backend API server   | Oracle Cloud    | ₹0         | $40 (t3.small)
Database (Postgres)  | Neon.tech       | ₹0         | $30 (RDS micro)
CDN/Edge functions   | Cloudflare      | ₹0         | $50 (Lambda@Edge)
Video downloader VPS | Hetzner         | ₹420       | $120 (EC2 t3.medium)
Redis cache          | Upstash         | ₹0         | $15 (ElastiCache)
File storage/CDN     | GoFile/Catbox   | ₹0         | $50 (S3+Transfer)
---------------------|-----------------|------------|---------------
TOTAL                |                 | ₹420/month | $325+/month
                     |                 | (€4.5)     | (₹27,000+/month)
```

**আমরা ₹26,580/month বাঁচাচ্ছি প্রতি মাসে।**  
বছরে: **₹3,18,960 savings** (approximately $3,800 USD)

---

> *"AWS e $120/month → Oracle e ₹0 — eta shotti. Ekta coin o jabena."*  
> — BongBari Engineering, March 2026
