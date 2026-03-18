# 🎒 THE NO-CODER'S GUIDE TO RENTING & PREPPING THE VPS (HETZNER)

As a Vibe Coder, you shouldn't have to guess what buttons to click or how much it costs. This is your exact, literal step-by-step roadmap to renting the server for pennies, setting it up, and preparing the Engine Room.

## 🛑 STEP 1: Create the Account & Verification
1. Go to **[Hetzner.com](https://www.hetzner.com/cloud/)**.
2. Click **Sign Up** (top right).
3. Fill in your email and create a password.
4. **The Payment Verification:** Hetzner will ask for a Credit Card or PayPal. 
   * *Don't panic:* They do this to stop crypto-miners from creating fake accounts. 
   * **CRITICAL TRAP:** Ensure the name on your account perfectly matches the name on your card. They will likely ask for a photo of your ID (Aadhaar or Passport) to prove you aren't a bot. It is standard for them.
   * They might do a $1 temporary authorization charge, or ask you to preload $5. This goes directly to your account credit. 
   * Remember: You are billed **by the hour**. If we destroy the server after 2 hours, it only deducts 1 penny from your balance.

## 🏗️ STEP 2: Building the Server (Click exactly these)
Once you are logged into the Cloud Console (console.hetzner.cloud), click **+ New Project**, name it "Bong Bari Engine", click into it, and click **Add Server**.

**Select THESE exact options so you don't overpay:**
* **Location:** Pick **Singapore**. If Singapore isn't available for this exact plan, pick **Falkenstein, Germany**. *(Do not pick America; keep the server physically closer to India for faster video downloading).*
* **Image (OS):** Select **Ubuntu** (Version 22.04 or 24.04). *This is the operating system.*
* **Type:** Select **Shared vCPU**, then click **x86**.
* **Filter/Plan:** Choose the cheapest one: **CX22** (2 vCPUs, 4GB RAM). It will say `~€3.20 / mo`.
* **Networking:** Make sure **IPv4 and IPv6** are BOTH checked. *(This is where our 18 quintillion IP addresses come from).*
* **SSH Keys / Authentication:** Select **Password**. This will literally email you the password so you don't have to do complex developer setups.
* **Name:** Call it `bong-bari-engine`.
* **Click: "Create & Buy Now"**

## ✉️ STEP 3: Check Your Email
Wait 60 seconds. Hetzner will email you. The email will contain:
1. Your **IP Address** (e.g., `198.51.100.22`)
2. Your **Username** (it is always `root`)
3. Your **Password** (a random string of letters/numbers).

## 💻 STEP 4: The "Vibe Coder" Login
You do not need to install complex developer tools. Your Windows computer already has everything.
1. Open your Windows **PowerShell**.
2. Type exactly this and press Enter:
   `ssh root@YOUR_IP_ADDRESS` *(replace with the IP from the email)*
3. It will say "Are you sure you want to continue connecting?". Type `yes` and press Enter.
4. It will ask for your password. **Copy it from your email.**
5. **Right-click** in PowerShell to paste it. *(Note: The password will be INVISIBLE as you paste/type it for security. Just right-click once and hit Enter).*
6. It will ask you to change your password immediately. Type the emailed password once more, then type your *own* new password twice. 
   * **CRITICAL TRAP:** The second your server is online, bot-snipers will try to guess your root password. Your new password MUST be massive. e.g. `BongBariEngineIsLive2026!@#`.

🔥 **BOOM. You are now inside a computer sitting in a datacenter.**

## 🪄 STEP 5: The "One-Click" Docker Install
Now, we prepare the canvas. You need to install Docker (the engine room). Just copy and paste this single line of code into your PowerShell window and press Enter:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

Wait 2 minutes while lines of text scroll by. When it stops, type `docker -v` to see if it installed. 

**🎉 YOU ARE DONE WITH THE MANUAL VPS SETUP.**

*The server is now idling, costing you $0.005 per hour, waiting for us to deploy the Cobalt Engine in Phase 6.*
