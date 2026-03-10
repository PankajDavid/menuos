# 🍽 MenuOS — Multi-Tenant SaaS Restaurant Platform

A full-stack SaaS platform where any restaurant can sign up, manage their menu, 
generate QR codes, receive real-time kitchen orders, and view analytics.

---

## 🗂 Project Structure

```
menuos/
├── backend/     Node.js + Express + PostgreSQL + Socket.IO
└── frontend/    React + Vite + Zustand + TanStack Query
```

---

## 🚀 Quick Start

### 1. Database Setup

```bash
psql -U postgres -c "CREATE DATABASE menuos;"
psql -U postgres -d menuos -f backend/src/db/migrations/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env       # fill in DATABASE_URL + JWT secrets
npm install
npm run dev                # runs on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                # runs on http://localhost:5173
```

---

## 🌐 Key URLs

| Route | Description |
|-------|-------------|
| `http://localhost:5173/` | Landing page |
| `/signup` | Restaurant owner signup |
| `/login` | Login |
| `/r/{slug}/menu` | Customer menu (QR target) |
| `/r/{slug}/checkout` | Cart checkout + payment |
| `/r/{slug}/kitchen` | Kitchen Kanban dashboard |
| `/r/{slug}/admin` | Restaurant admin panel |
| `/platform-admin` | Super admin (platform owner) |

---

## 🔑 Default Platform Admin

```
Email:    admin@menuos.app
Password: Admin@123
```
**Change this password immediately after first login!**

---

## 🏗 Architecture

### Multi-Tenancy
Every database query is automatically scoped to `restaurant_id` via the
`tenantResolver` middleware. A restaurant can only access its own data.

### Authentication
- JWT access tokens (15 min expiry)
- Refresh tokens (7 days, stored in DB)
- Roles: `platform_admin`, `admin`, `staff`, `kitchen`

### Real-Time Orders
Socket.IO rooms are namespaced per restaurant: `kitchen:{restaurantId}`.
New orders are emitted instantly to all kitchen staff connected to that room.

### Subscription Enforcement
Plan limits are checked in middleware before write operations:
- `checkMenuItemLimit` — blocks item creation if plan limit hit
- `checkOrderLimit` — blocks orders if monthly quota exceeded

---

## 💳 Payment

Currently uses a **mock payment service** (`backend/src/services/payment.service.js`).

To switch to Razorpay:
```js
// Replace mockPayment() with:
import Razorpay from 'razorpay';
const rzp = new Razorpay({ key_id, key_secret });
const order = await rzp.orders.create({ amount: amount * 100, currency: 'INR' });
```

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, React Router v6, Zustand, TanStack Query |
| Backend | Node.js, Express, Socket.IO |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| QR Codes | `qrcode` npm package |
| Real-Time | Socket.IO |

---

## 🔒 Environment Variables

See `backend/.env.example` for all required variables.

Required:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — 256-bit random string
- `JWT_REFRESH_SECRET` — different 256-bit random string
