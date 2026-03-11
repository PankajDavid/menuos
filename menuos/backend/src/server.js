import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { initSocket } from './socket/index.js';
import { initDB } from './db/pool.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import restaurantRoutes from './routes/restaurant.routes.js';
import menuRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/order.routes.js';
import tableRoutes from './routes/table.routes.js';
import platformRoutes from './routes/platform.routes.js';

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
app.use('/api/platform', platformRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Error Handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Boot ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function boot() {
  // Start server first so healthcheck passes
  initSocket(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`🚀 MenuOS API running on http://localhost:${PORT}`);
  });
  
  // Initialize DB in background (don't block server startup)
  try {
    await initDB();
  } catch (err) {
    console.error('⚠️ Database connection failed:', err.message);
    console.log('Server is running but database features will not work');
  }
}

boot().catch(console.error);
