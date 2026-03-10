# 🚀 MenuOS - Quick Start Guide

Welcome to MenuOS! This guide will help you get the application running in minutes.

---

## ⚡ One-Click Setup (Recommended)

### **Step 1: Install PostgreSQL** (if not already installed)

Download and install from: https://www.postgresql.org/download/windows/

- Remember your `postgres` user password
- Add PostgreSQL to PATH when prompted (usually automatic)

### **Step 2: Run the Setup Script**

Double-click **`setup.bat`** or run in PowerShell/CMD:

```batch
.\setup.bat
```

The script will:
- ✅ Create the database
- ✅ Run migrations
- ✅ Install dependencies
- ✅ Configure environment

### **Step 3: Start the Application**

Double-click **`start.bat`** or run:

```batch
.\start.bat
```

This will:
- 🚀 Start backend server (port 4000)
- 🚀 Start frontend server (port 5173)
- 🌐 Open your browser automatically

**That's it!** You're ready to use MenuOS.

---

## 🔑 Default Login

**Platform Admin Account:**
- **Email:** `admin@menuos.app`
- **Password:** `Admin@123`

⚠️ **IMPORTANT:** Change this password immediately after first login!

---

## 🌐 Access URLs

Once running, access the application at:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend App** | http://localhost:5173 | Main application |
| **Backend API** | http://localhost:4000 | REST API |
| **Health Check** | http://localhost:4000/health | API status |

---

## 📋 Manual Setup (Alternative)

If you prefer manual setup, follow these steps:

### 1. Create Database
```bash
psql -U postgres -c "CREATE DATABASE menuos;"
psql -U postgres -d menuos -f ./menuos/backend/src/db/migrations/schema.sql
```

### 2. Configure Backend
```bash
cd menuos/backend
copy .env.example .env
```

Edit `.env` file:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/menuos
JWT_SECRET=your_random_256_bit_secret_string
JWT_REFRESH_SECRET=another_different_random_string
```

### 3. Install Dependencies
```bash
# Backend
cd menuos/backend
npm install

# Frontend
cd menuos/frontend
npm install
```

### 4. Start Servers

**Terminal 1 - Backend:**
```bash
cd menuos/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd menuos/frontend
npm run dev
```

---

## 🧪 Verify Installation

After setup, verify everything is working:

1. ✅ Visit http://localhost:5173 - Landing page loads
2. ✅ Click "Sign In" → Login with admin credentials
3. ✅ Dashboard loads successfully
4. ✅ Backend health check responds: http://localhost:4000/health

---

## 🐛 Troubleshooting

### PostgreSQL Not Found
**Error:** `psql: command not found`

**Solution:**
1. Install PostgreSQL from https://www.postgresql.org/download/windows/
2. During installation, ensure "Add to PATH" is checked
3. Restart your terminal/command prompt

### Database Connection Failed
**Error:** `connection refused` or `password authentication failed`

**Solution:**
- Verify PostgreSQL service is running
- Check DATABASE_URL in `menuos/backend/.env` has correct password
- Ensure PostgreSQL allows local connections

### Port Already in Use
**Error:** `Port 4000/5173 is already in use`

**Solution:**
- Close any other applications using those ports
- Or change ports in configuration files:
  - Backend: Edit `PORT` in `menuos/backend/.env`
  - Frontend: Edit `server.port` in `menuos/frontend/vite.config.js`

### npm Install Fails
**Error:** Installation errors or hanging

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### PowerShell Script Execution Blocked
**Error:** `cannot be loaded because running scripts is disabled`

**Solution:** Use the `.bat` files instead, or run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📦 What Gets Installed?

The setup process:

1. **Database Setup**
   - Creates PostgreSQL database `menuos`
   - Runs schema migrations (8 tables)
   - Seeds platform admin user

2. **Backend Setup**
   - Installs Node.js dependencies
   - Configures environment variables
   - Sets up JWT authentication

3. **Frontend Setup**
   - Installs React + Vite dependencies
   - Configures development server
   - Sets up API proxy

---

## 🎯 Next Steps After Setup

1. **Change Default Password**
   - Login as admin@menuos.app
   - Navigate to account settings
   - Update password immediately

2. **Create Your First Restaurant**
   - Visit `/signup` or click "Get Started"
   - Enter restaurant details
   - You'll be logged in as restaurant admin

3. **Explore Features**
   - Menu Management
   - Table Management with QR codes
   - Kitchen Dashboard
   - Analytics

---

## 🆘 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review error messages carefully
3. Verify all prerequisites are installed
4. Check database connectivity

**Resources:**
- Full documentation: See main `README.md`
- Architecture overview: See project structure
- API routes: Check `menuos/backend/src/routes/`

---

## 📝 Quick Reference

### Starting the App
```batch
.\start.bat
```

### Stopping the App
Close the two terminal windows that opened

### Reset Everything
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS menuos;"
psql -U postgres -c "CREATE DATABASE menuos;"

# Re-run migrations
psql -U postgres -d menuos -f ./menuos/backend/src/db/migrations/schema.sql
```

### View Logs
- Backend logs: Terminal window running backend
- Frontend logs: Terminal window running frontend
- Browser console: F12 → Console tab

---

## ✅ Setup Checklist

Before running the app, ensure:

- [ ] PostgreSQL 14+ installed and running
- [ ] Node.js 18+ installed (v22.16.0 confirmed ✓)
- [ ] Port 5432 available for PostgreSQL
- [ ] Ports 4000 and 5173 available
- [ ] Internet connection (for npm packages)

---

**Ready?** Just run `setup.bat` then `start.bat`! 🎉
