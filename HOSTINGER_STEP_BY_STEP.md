# Step-by-Step Hostinger DNS Setup for www.bongbari.com

## 🔒 SSL Certificate: YES, Completely FREE!
**GitHub Pages provides FREE SSL certificate automatically** - no extra cost, no configuration needed!

## 📋 Step-by-Step Instructions for Hostinger

### Step 1: Login to Hostinger
1. Go to **https://hostinger.com**
2. Click **"Login"** (top right)
3. Enter your **email** and **password**
4. Click **"Log In"**

### Step 2: Access DNS Management
1. After login, you'll see your **Dashboard**
2. Find your domain **"bongbari.com"** in the list
3. Click **"Manage"** next to bongbari.com
4. Look for **"DNS / Name Servers"** or **"DNS Zone"**
5. Click on **"DNS records"** or **"Advanced DNS"**

### Step 3: Delete Existing Records (IMPORTANT!)
**Before adding new records, delete these if they exist:**
- Any **A record** with Name **"@"**
- Any **CNAME record** with Name **"www"** 
- Any **AAAA records** (IPv6)

### Step 4: Add New DNS Records
**Add these records exactly as shown:**

#### Record 1:
- **Type**: A
- **Name**: @
- **Value**: 185.199.108.153
- **TTL**: 14400 (or leave default)
- Click **"Add Record"**

#### Record 2:
- **Type**: A
- **Name**: @
- **Value**: 185.199.109.153
- **TTL**: 14400
- Click **"Add Record"**

#### Record 3:
- **Type**: A
- **Name**: @
- **Value**: 185.199.110.153
- **TTL**: 14400
- Click **"Add Record"**

#### Record 4:
- **Type**: A
- **Name**: @
- **Value**: 185.199.111.153
- **TTL**: 14400
- Click **"Add Record"**

#### Record 5 (WWW):
- **Type**: CNAME
- **Name**: www
- **Value**: pramsss108.github.io
- **TTL**: 14400
- Click **"Add Record"**

### Step 5: Save Changes
1. Click **"Save Changes"** or **"Apply"**
2. Wait for confirmation message

## Step 6: Configure GitHub Pages (I'll help you)
1. Go to: https://github.com/Pramsss108/BongBariComedy/settings/pages
2. Scroll down to **"Custom domain"**
3. Enter: **www.bongbari.com**
4. Click **"Save"**
5. Wait 2-10 minutes for green checkmark ✅
6. Check **"Enforce HTTPS"** ✅

## ⏰ Timeline:
- **DNS changes**: 5-30 minutes to propagate
- **GitHub verification**: 2-10 minutes after DNS works
- **SSL certificate**: Automatic (FREE!)

## 🔍 How to Check if Working:
1. **Test DNS**: Go to https://dnschecker.org
   - Enter: **www.bongbari.com**
   - Should show GitHub's IP addresses
2. **Test website**: Visit **https://www.bongbari.com**
   - Should load your site with 🔒 (secure)

## 🚨 Common Mistakes to Avoid:
- ❌ Don't use **"bongbari.com"** in CNAME (use **www**)
- ❌ Don't mix A and CNAME records for same name
- ❌ Don't forget to delete old records first
- ❌ Don't use IP addresses in CNAME (use domain)

## 💡 What You'll Get:
- ✅ **Free SSL certificate** (https://)
- ✅ **Professional domain** (www.bongbari.com)
- ✅ **Fast loading** (global CDN)
- ✅ **Free hosting** (GitHub Pages)
- ✅ **Automatic updates** (when you push code)

## 📱 Mobile-Friendly:
Your site will automatically work on phones, tablets, and desktops!

## 🆘 If You Need Help:
Tell me:
1. What screen you see in Hostinger
2. Any error messages
3. Screenshot if possible

**The SSL certificate is completely FREE and automatic - no extra steps needed!**