# 🌩️ Railway Deployment Guide for MenuOS

Complete guide to deploy MenuOS on Railway.app with zero DevOps experience.

---

## 🎯 What You'll Get

✅ Live URL: `https://your-app.up.railway.app`  
✅ PostgreSQL database (managed, automatic backups)  
✅ Auto-deploy on every git push  
✅ Free $5/month credit (enough for hobby project)  
✅ SSL certificate (HTTPS automatically)  

---

## 📋 Prerequisites

- [ ] GitHub account
- [ ] Node.js installed (you have v22.16.0 ✓)
- [ ] 10 minutes of time
- [ ] **NO PostgreSQL needed locally!**

---

## 🚀 Quick Start (Choose Your Path)

### **Path 1: Cloud Database Only** ⭐ RECOMMENDED

**Best if:** You don't want to install PostgreSQL locally

**Steps:**
1. Create free Neon.tech database (2 minutes)
2. Update `.env` with cloud database URL
3. Test locally
4. Deploy to Railway

👉 **Start here:** See "Cloud Database Setup" section below

---

### **Path 2: Test Locally First**

**Best if:** You want to test everything locally before deploying

**Steps:**
1. Install PostgreSQL locally
2. Run `setup.bat`
3. Test the app
4. Deploy to Railway

👉 **Start here:** See "Local Testing + Railway Deploy" section

---

## ☁️ Cloud Database Setup (No Local PostgreSQL)

### Step 1: Create Neon Database (FREE)

1. Go to https://neon.tech
2. Click "Sign Up" → Use GitHub login
3. Create new project:
   - Name: `menuos`
   - Region: Choose closest to you
   - Click "Create"

4. Copy the **Connection String** (looks like):
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/menuos?sslmode=require
   ```

5. Save this string - you'll need it!

### Step 2: Configure MenuOS Backend

```bash
cd menuos/backend
copy .env.example .env
```

Edit `menuos/backend/.env`:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/menuos?sslmode=require
JWT_SECRET=your_random_secret_here_abc123
JWT_REFRESH_SECRET=another_random_secret_xyz789
FRONTEND_URL=http://localhost:5173
QR_BASE_URL=http://localhost:5173
PAYMENT_MODE=mock
```

### Step 3: Install Dependencies & Test

```bash
cd menuos/backend
npm install

cd ../frontend
npm install

# Start both servers
# Terminal 1:
cd ../backend
npm run dev

# Terminal 2:
cd ../frontend
npm run dev
```

Visit http://localhost:5173 - should work! 🎉

---

## 🏗️ Deploy to Railway (The Fun Part!)

### Step 1: Push to GitHub

```bash
# Initialize git repo (if not already done)
git init
git add .
git commit -m "Initial commit - MenuOS ready for Railway"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/menuos.git
git push -u origin main
```

### Step 2: Connect Railway to GitHub

1. Go to https://railway.app
2. Click "Sign In" → Use GitHub login
3. Click "New Project"
4. Select **"Deploy from GitHub repo"**
5. Find and select your `menuos` repository

### Step 3: Add PostgreSQL Database

1. In your Railway project dashboard
2. Click "+ New"
3. Select **"Database"** → **"Add PostgreSQL"**
4. Wait 30 seconds for database to provision

### Step 4: Configure Environment Variables

1. Click on your **Node.js service** (not the database)
2. Go to **"Variables"** tab
3. Add these variables:

```
NODE_ENV=production
FRONTEND_URL=https://your-app.up.railway.app
QR_BASE_URL=https://your-app.up.railway.app
PAYMENT_MODE=mock
```

**Important:** Railway automatically provides `DATABASE_URL` from the PostgreSQL service!

### Step 5: Deploy!

1. Railway automatically starts building
2. Watch the build logs in real-time
3. Wait for "Deployed" status (2-3 minutes)
4. Click **"Open Domain"** to see your live app!

🎉 **You're live!**

---

## 🔧 Post-Deployment Tasks

### 1. Run Database Migrations

Railway deployed your code, but you need to create tables:

**Option A: Automatic (Recommended)**

Create `menuos/backend/railway-migrate.js`:
```javascript
import { query } from './src/db/pool.js';
import fs from 'fs';

async function runMigrations() {
  const sql = fs.readFileSync('./src/db/migrations/schema.sql', 'utf8');
  await query(sql);
  console.log('✅ Migrations completed!');
  process.exit(0);
}

runMigrations().catch(console.error);
```

Add to `package.json`:
```json
"scripts": {
  "migrate": "node railway-migrate.js"
}
```

In Railway dashboard:
- Go to your service
- Click "Deployments"
- Add to "Start Command": `npm run migrate && npm start`

**Option B: Manual via Railway Shell**

1. Railway Dashboard → Your service
2. Click "Shell" tab
3. Run:
```bash
psql $DATABASE_URL -f backend/src/db/migrations/schema.sql
```

### 2. Update Frontend API Calls

Edit `menuos/frontend/vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { 
        target: 'http://localhost:4000', 
        changeOrigin: false, // Important for production
      },
      '/socket.io': { 
        target: 'http://localhost:4000', 
        ws: true,
        changeOrigin: false,
      },
    },
  },
});
```

Update `menuos/frontend/src/api/axios.js`:
```javascript
const API_URL = import.meta.env.VITE_API_URL || '/api';
```

Create `menuos/frontend/.env`:
```env
VITE_API_URL=https://your-backend.up.railway.app/api
```

### 3. Set Up Custom Domain (Optional)

Railway gives you: `https://your-app.up.railway.app`

For custom domain:
1. Railway Dashboard → Settings → Domains
2. Add your domain
3. Update DNS records as instructed

---

## 💰 Railway Pricing

**Free Tier:**
- $5 credit/month
- ~500 hours of runtime (enough for 1 app 24/7)
- PostgreSQL database included
- Perfect for hobby projects

**Paid Plans:**
- Starts at $5/month
- More compute power
- Priority support

**Your MenuOS will easily fit in the free tier!** ✅

---

## 🐛 Troubleshooting

### Build Fails
**Error:** `Cannot find module`
- Ensure all dependencies are in `package.json`
- Check Node version compatibility

### Database Connection Error
**Error:** `connection refused`
- Verify DATABASE_URL is set in Railway variables
- Check PostgreSQL service is running (green dot)

### Socket.IO Not Connecting
**Error:** WebSocket connection failed
- Ensure you're using HTTPS in production
- Check CORS settings in backend

### Port Issues
Railway automatically sets `PORT` environment variable. Your code already uses:
```javascript
const PORT = process.env.PORT || 4000;
```
This is perfect! ✅

---

## 📊 Railway vs Other Options

| Platform | Ease | Cost | Best For |
|----------|------|------|----------|
| **Railway** | ⭐⭐⭐⭐⭐ | Free-$5 | Full-stack apps (YOU!) |
| Vercel | ⭐⭐ | Free | Static sites, Next.js |
| Heroku | ⭐⭐⭐⭐ | $7+ | Simple apps |
| DigitalOcean | ⭐⭐ | $6+ | Advanced users |
| AWS | ⭐ | Complex | Enterprise |

---

## 🎓 What You Learned

✅ How Railway works  
✅ Cloud databases vs local  
✅ GitHub-based deployments  
✅ Environment variables  
✅ Production deployment  

---

## 🚀 Next Steps

1. **Test locally** with cloud database
2. **Push to GitHub**
3. **Deploy on Railway**
4. **Share your live URL** with friends!

---

## 🆘 Need Help?

**Railway Documentation:** https://docs.railway.app  
**Railway Discord:** Active community support  
**Neon Docs:** https://neon.tech/docs  

**Common Questions:**
- Q: Can I use my own domain?  
  A: Yes! Railway supports custom domains on paid plan

- Q: How do I backup data?  
  A: Railway auto-backs up PostgreSQL daily

- Q: Can I scale later?  
  A: Yes! Just upgrade Railway plan

---

**Ready to deploy?** Let's get started! 🎉
