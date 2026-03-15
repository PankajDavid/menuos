import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const httpServer = createServer(app);

// ── Early Healthcheck (before any other middleware) ─────────────────────────
// This ensures Railway healthcheck passes even if other parts fail
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Basic Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ── Import and Initialize Routes (with error handling) ─────────────────────
async function initializeApp() {
  console.log('🚀 Starting MenuOS API...');
  console.log(`📡 PORT: ${process.env.PORT || 4000}`);
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

  try {
    // Dynamically import routes to catch any import errors
    const [{ initSocket }, { initDB }, { migrate }] = await Promise.all([
      import('./socket/index.js'),
      import('./db/pool.js'),
      import('./db/migrate.js'),
    ]);

    const [
      { default: authRoutes },
      { default: restaurantRoutes },
      { default: menuRoutes },
      { default: orderRoutes },
      { default: tableRoutes },
      { default: platformRoutes },
      { default: billingRoutes },
      { default: reportsRoutes },
    ] = await Promise.all([
      import('./routes/auth.routes.js'),
      import('./routes/restaurant.routes.js'),
      import('./routes/menu.routes.js'),
      import('./routes/order.routes.js'),
      import('./routes/table.routes.js'),
      import('./routes/platform.routes.js'),
      import('./routes/billing.routes.js'),
      import('./routes/reports.routes.js'),
    ]);

    // Apply routes
    app.use('/api/auth', authRoutes);
    app.use('/api/restaurants', restaurantRoutes);
    app.use('/api/restaurants/:slug/menu', menuRoutes);
    app.use('/api/restaurants/:slug/orders', orderRoutes);
    app.use('/api/restaurants/:slug/tables', tableRoutes);
    app.use('/api/restaurants/:slug/reports', reportsRoutes);
    app.use('/api/platform', platformRoutes);
    app.use('/api', billingRoutes);

    console.log('✅ Routes loaded successfully');

    // Initialize Socket.IO
    try {
      initSocket(httpServer);
      console.log('✅ Socket.IO initialized');
    } catch (err) {
      console.error('⚠️ Socket initialization failed:', err.message);
    }

    // Initialize database in background
    initDB().then(() => {
      console.log('✅ Database pool initialized');
      return migrate();
    }).then(() => {
      console.log('✅ Database migrations completed');
    }).catch(err => {
      console.error('⚠️ Database initialization failed:', err.message);
    });

  } catch (err) {
    console.error('💥 Failed to initialize routes:', err.message);
    console.error(err.stack);
  }

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
}

// ── Start Server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MenuOS API server listening on port ${PORT}`);
  console.log(`🩺 Health check available at: http://0.0.0.0:${PORT}/health`);
});

// Initialize the rest of the app
initializeApp().catch(err => {
  console.error('💥 Fatal error during initialization:', err);
});
