import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { errorHandler } from './middleware/errorHandler.js';

// Import routes synchronously to ensure they're available immediately
import { initSocket } from './socket/index.js';
import { initDB } from './db/pool.js';
import { migrate } from './db/migrate.js';

import authRoutes from './routes/auth.routes.js';
import restaurantRoutes from './routes/restaurant.routes.js';
import menuRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/order.routes.js';
import tableRoutes from './routes/table.routes.js';
import platformRoutes from './routes/platform.routes.js';
import billingRoutes from './routes/billing.routes.js';
import reportsRoutes from './routes/reports.routes.js';

const app = express();
const httpServer = createServer(app);

// ── Early Healthcheck (before any other middleware) ─────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Basic Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ── Routes (synchronously loaded) ──────────────────────────────────────────
console.log('🚀 Starting MenuOS API...');
console.log(`📡 PORT: ${process.env.PORT || 4000}`);
console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Apply routes immediately
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/restaurants/:slug/menu', menuRoutes);
app.use('/api/restaurants/:slug/orders', orderRoutes);
app.use('/api/restaurants/:slug/tables', tableRoutes);
app.use('/api/restaurants/:slug/reports', reportsRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api', billingRoutes);

console.log('✅ Routes loaded successfully');

// Redirect root and restaurant paths to frontend
app.get('/', (req, res) => {
  res.redirect(process.env.FRONTEND_URL || 'https://soothing-embrace-production.up.railway.app');
});

app.get('/r/:slug/*', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://soothing-embrace-production.up.railway.app';
  res.redirect(`${frontendUrl}${req.originalUrl}`);
});

// Error handler (must be last)
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MenuOS API server listening on port ${PORT}`);
  console.log(`🩺 Health check available at: http://0.0.0.0:${PORT}/health`);
});

// ── Initialize Socket.IO and Database (async, non-blocking) ────────────────
async function initializeServices() {
  try {
    // Initialize Socket.IO
    try {
      initSocket(httpServer);
      console.log('✅ Socket.IO initialized');
    } catch (err) {
      console.error('⚠️ Socket initialization failed:', err.message);
    }

    // Initialize database
    try {
      await initDB();
      console.log('✅ Database pool initialized');
      await migrate();
      console.log('✅ Database migrations completed');
    } catch (err) {
      console.error('⚠️ Database initialization failed:', err.message);
    }
  } catch (err) {
    console.error('💥 Service initialization error:', err);
  }
}

// Start services in background
initializeServices();
