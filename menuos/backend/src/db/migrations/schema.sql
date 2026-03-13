-- MenuOS Database Schema
-- Run: psql $DATABASE_URL -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── RESTAURANTS ───────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'pro', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add 'premium' to existing ENUM if it doesn't exist
DO $$
BEGIN
    ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'premium';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS restaurants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  slug                  VARCHAR(100) UNIQUE NOT NULL,
  owner_email           VARCHAR(255) UNIQUE NOT NULL,
  phone                 VARCHAR(20),
  address               TEXT,
  gst_number            VARCHAR(50),
  logo_url              TEXT,
  subscription_plan     subscription_plan DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  is_active             BOOLEAN DEFAULT TRUE,
  settings              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Add gst_number column if it doesn't exist (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurants' AND column_name = 'gst_number') THEN
        ALTER TABLE restaurants ADD COLUMN gst_number VARCHAR(50);
    END IF;
END $$;

-- ── USERS ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'staff', 'kitchen', 'platform_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,
  role              user_role DEFAULT 'staff',
  is_active         BOOLEAN DEFAULT TRUE,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── MENU ITEMS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100) NOT NULL,
  description     TEXT,
  price           DECIMAL(10,2) NOT NULL,
  image_url       TEXT,
  video_url       TEXT,
  tags            TEXT[] DEFAULT '{}',
  allergens       TEXT[] DEFAULT '{}',
  is_available    BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add video_url column if it doesn't exist (for existing databases)
DO $$
BEGIN
    ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS video_url TEXT;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- ── TABLES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number    VARCHAR(20) NOT NULL,
  capacity        INTEGER DEFAULT 4,
  qr_token        VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active       BOOLEAN DEFAULT TRUE,
  UNIQUE(restaurant_id, table_number)
);

-- ── ORDERS ────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'served', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     UUID NOT NULL REFERENCES restaurants(id),
  order_number      VARCHAR(20) NOT NULL,
  mobile_number     VARCHAR(20) NOT NULL,
  table_number      VARCHAR(20) NOT NULL,
  total_amount      DECIMAL(10,2) NOT NULL,
  payment_status    payment_status DEFAULT 'pending',
  payment_tx_id     VARCHAR(100),
  order_status      order_status DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, order_number)
);

-- ── ORDER ITEMS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    UUID REFERENCES menu_items(id),
  name_snapshot   VARCHAR(255) NOT NULL,
  price_snapshot  DECIMAL(10,2) NOT NULL,
  quantity        INTEGER NOT NULL CHECK (quantity > 0)
);

-- ── REFRESH TOKENS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id, is_available);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_date ON orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_restaurant ON users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ── AUTO-UPDATE updated_at ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── SEED PLATFORM ADMIN (change password after first run!) ────────────────
-- Password: Admin@123 (bcrypt hash below)
INSERT INTO users (restaurant_id, name, email, password_hash, role)
VALUES (NULL, 'Platform Admin', 'admin@menuos.app',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iB5i',
  'platform_admin')
ON CONFLICT (email) DO NOTHING;
