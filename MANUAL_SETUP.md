# 📝 Manual Setup Instructions for MenuOS

## Prerequisites
- Node.js v18+ (✓ Already installed: v22.16.0)
- PostgreSQL 14+
- Git (optional, for version control)

---

## Step-by-Step Setup

### 1️⃣ Install PostgreSQL (if not already installed)

**Download:** https://www.postgresql.org/download/windows/

During installation:
- Remember the password you set for the `postgres` user
- Default port: 5432
- Add to PATH when prompted

**Verify installation:**
```powershell
psql --version
```

---

### 2️⃣ Create Database

Open PowerShell and run:
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE menuos;"

# Run migrations
psql -U postgres -d menuos -f ".\menuos\backend\src\db\migrations\schema.sql"
```

---

### 3️⃣ Setup Backend

```powershell
cd menuos\backend

# Copy environment file
cp .env.example .env

# Edit .env file with your settings:
# - DATABASE_URL (update with your postgres password)
# - JWT_SECRET (generate a random 256-bit string)
# - JWT_REFRESH_SECRET (generate another random string)
```

**Example .env configuration:**
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/menuos
JWT_SECRET=your_super_secret_256_bit_random_string_here
JWT_REFRESH_SECRET=another_different_256_bit_random_string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
QR_BASE_URL=http://localhost:5173
PAYMENT_MODE=mock
```

**Install dependencies:**
```powershell
npm install
```

---

### 4️⃣ Setup Frontend

```powershell
cd menuos\frontend

# Install dependencies
npm install
```

---

### 5️⃣ Start the Application

**Option A: Start both servers in separate terminals (Recommended)**

Terminal 1 - Backend:
```powershell
cd menuos\backend
npm run dev
```

Terminal 2 - Frontend:
```powershell
cd menuos\frontend
npm run dev
```

**Option B: Use the automated startup script**
```powershell
.\start.ps1
```

---

### 6️⃣ Access the Application

🌐 **Frontend:** http://localhost:5173
🔧 **Backend API:** http://localhost:4000
🏥 **Health Check:** http://localhost:4000/health

---

### 🔑 Default Login Credentials

**Platform Admin Account:**
- Email: `admin@menuos.app`
- Password: `Admin@123`

⚠️ **IMPORTANT:** Change this password immediately after first login!

---

### 📋 Verification Checklist

- [ ] PostgreSQL is running on port 5432
- [ ] Database `menuos` exists with all tables
- [ ] Backend starts successfully on port 4000
- [ ] Frontend starts successfully on port 5173
- [ ] Can access landing page at http://localhost:5173
- [ ] Can login with admin credentials

---

### 🐛 Troubleshooting

**PostgreSQL connection error:**
- Check if PostgreSQL service is running: `Get-Service -Name postgresql*`
- Verify DATABASE_URL in .env has correct password
- Ensure PostgreSQL allows local connections (pg_hba.conf)

**Port already in use:**
- Backend (4000): Change PORT in backend/.env
- Frontend (5173): Change server.port in frontend/vite.config.js

**npm install fails:**
- Clear cache: `npm cache clean --force`
- Delete node_modules and package-lock.json
- Try again with verbose logging: `npm install --verbose`

---

### 🎯 Quick Test

After setup, test the application:

1. Visit http://localhost:5173
2. Click "Sign In"
3. Login with admin credentials
4. You should see the Platform Admin dashboard

---

### 📞 Need Help?

Check the main README.md for more details:
- Architecture overview
- API documentation
- Feature list
