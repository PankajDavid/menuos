import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { initSocket } from './socket/index.js';
import { initDB } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { seedMenu } from './db/seed-menu.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Routes
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

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/restaurants/:slug/menu', menuRoutes);
app.use('/api/restaurants/:slug/orders', orderRoutes);
app.use('/api/restaurants/:slug/tables', tableRoutes);
app.use('/api/restaurants/:slug/reports', reportsRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api', billingRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// Redirect root and restaurant paths to frontend
app.get('/', (req, res) => {
  res.redirect(process.env.FRONTEND_URL || 'https://soothing-embrace-production.up.railway.app');
});

app.get('/r/:slug/*', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://soothing-embrace-production.up.railway.app';
  res.redirect(`${frontendUrl}${req.originalUrl}`);
});

// ── Error Handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Boot ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function boot() {
  console.log('🚀 Starting MenuOS API...');
  console.log(`📡 PORT: ${PORT}`);
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  
  // Start server first so healthcheck passes
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ MenuOS API running on port ${PORT}`);
    console.log(`🩺 Health check available at: http://0.0.0.0:${PORT}/health`);
  });
  
  // Initialize Socket.IO after server is listening
  try {
    initSocket(httpServer);
    console.log('✅ Socket.IO initialized');
  } catch (err) {
    console.error('⚠️ Socket initialization failed:', err.message);
  }
  
  // Initialize DB and run migrations in background (don't block server startup)
  try {
    await initDB();
    await migrate();
    console.log('✅ Database initialized');
    
    // Seed sample menu for Panky's restaurant
    if (process.env.SEED_MENU === 'true') {
      await seedMenu().catch(err => console.log('Menu seeding skipped:', err.message));
    }
  } catch (err) {
    console.error('⚠️ Database initialization failed:', err.message);
    console.log('Server is running but database features will not work');
  }
}

boot().catch((err) => {
  console.error('💥 Fatal error during startup:', err);
  process.exit(1);
});
