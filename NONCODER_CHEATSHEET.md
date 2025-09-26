# Bong Bari Non-Coder Cheat Sheet

## 1. Make Local Changes
- Open VS Code.
- Edit any file (text, chatbot, etc.).

## 2. Run Everything Locally
```powershell
npm run dev:live
```
- This starts both the backend (API) and frontend.
- Open http://localhost:5173 in your browser.

## 3. Test Your Changes
- Use the site as normal.
- Admin panel changes update Neon DB (shared with live site).

## 4. Save & Push to GitHub
```powershell
git add .
git commit -m "your message"
git push origin main
```
- This updates the live site (frontend + backend) automatically.

## 5. No Database Files Needed
- All data is in Neon/Postgres (cloud).
- No need to copy, push, or pull any database file.

## 6. What Runs Where?
- **Local:** Your computer runs backend (API) and frontend.
- **Live:** Render runs backend (API), GitHub Pages runs frontend.

## 7. If Stuck
- Restart with:
```powershell
npm run start:clean
npm run dev:live
```
- Ask for help if you see errors!

---
**That’s it! Edit, test, push. No database files. No Render needed for local.**
