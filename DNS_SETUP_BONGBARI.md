# DNS Configuration for www.bongbari.com

## ✅ GitHub Pages Setup Complete
Your site is deployed and ready at: **GitHub Pages with custom domain**

## 🔧 Hostinger DNS Configuration

### Step 1: Login to Hostinger
1. Go to **Hostinger control panel**
2. Navigate to **DNS / Name Servers**
3. Find **DNS records** or **Advanced DNS**

### Step 2: Add GitHub Pages DNS Records

**Delete any existing A/CNAME records for @ and www, then add these:**

#### For the root domain (bongbari.com):
```
Type: A
Name: @
Value: 185.199.108.153
TTL: 14400
```
```
Type: A  
Name: @
Value: 185.199.109.153
TTL: 14400
```
```
Type: A
Name: @  
Value: 185.199.110.153
TTL: 14400
```
```
Type: A
Name: @
Value: 185.199.111.153  
TTL: 14400
```

#### For www subdomain (www.bongbari.com):
```
Type: CNAME
Name: www
Value: pramsss108.github.io
TTL: 14400
```

### Step 3: Enable GitHub Pages Custom Domain

1. **Go to**: https://github.com/Pramsss108/BongBariComedy/settings/pages
2. **Custom domain**: Enter `www.bongbari.com`
3. **Save**
4. **Wait** for DNS check (green checkmark)
5. **Enable** "Enforce HTTPS" ✅

### Step 4: Test Your Setup

After 5-15 minutes (DNS propagation), test:
- ✅ https://www.bongbari.com (should load your site)
- ✅ https://bongbari.com (should redirect to www)
- ✅ Community feed should work
- ✅ API calls should connect to Render backend

## 🔍 Troubleshooting

### If domain doesn't work:
1. **Check DNS**: Use https://dnschecker.org
2. **Wait longer**: DNS can take up to 48 hours
3. **Clear browser cache**: Ctrl+Shift+R

### If API calls fail:
1. **Check browser console** for CORS errors
2. **Verify Render backend** is running
3. **Test API directly**: https://bongbaricomedy.onrender.com/api/health

## 📊 Final Architecture

```
User visits www.bongbari.com
         ↓
   GitHub Pages (FREE hosting)
         ↓ 
   API calls → bongbaricomedy.onrender.com
         ↓
   Neon Database (Postgres)
```

## ✅ Benefits Achieved

- 🆓 **Free hosting** (GitHub Pages)
- 🌍 **Custom domain** (www.bongbari.com)  
- 🔒 **HTTPS included** (automatic)
- ⚡ **Fast loading** (global CDN)
- 💾 **Persistent data** (Neon database)
- 💰 **Cost effective** (~$10/year for domain only)

Your site will be live at **www.bongbari.com** once DNS propagates!