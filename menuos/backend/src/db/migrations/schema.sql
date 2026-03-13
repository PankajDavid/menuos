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

-- Add password_reset_token column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_reset_token') THEN
        ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_reset_expires') THEN
        ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMPTZ;
    END IF;
END $$;

-- Add subscription management columns (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurants' AND column_name = 'subscription_status') THEN
        ALTER TABLE restaurants ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurants' AND column_name = 'payment_status') THEN
        ALTER TABLE restaurants ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurants' AND column_name = 'last_payment_date') THEN
        ALTER TABLE restaurants ADD COLUMN last_payment_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurants' AND column_name = 'next_payment_date') THEN
        ALTER TABLE restaurants ADD COLUMN next_payment_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurants' AND column_name = 'grace_period_end_date') THEN
        ALTER TABLE restaurants ADD COLUMN grace_period_end_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurants' AND column_name = 'platform_fee_amount') THEN
        ALTER TABLE restaurants ADD COLUMN platform_fee_amount DECIMAL(10,2) DEFAULT 0;
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

-- ── INVOICES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  invoice_number        VARCHAR(50) UNIQUE NOT NULL,
  amount                DECIMAL(10,2) NOT NULL,
  discount_amount       DECIMAL(10,2) DEFAULT 0,
  final_amount          DECIMAL(10,2) NOT NULL,
  plan                  subscription_plan NOT NULL,
  status                VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, cancelled
  due_date              TIMESTAMPTZ NOT NULL,
  paid_date             TIMESTAMPTZ,
  payment_method        VARCHAR(50), -- manual, online, etc.
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── DISCOUNTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  VARCHAR(50) UNIQUE NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  discount_type         VARCHAR(20) NOT NULL, -- percentage, fixed, extension
  discount_value        DECIMAL(10,2) NOT NULL, -- percentage value or fixed amount or days
  max_uses              INTEGER,
  used_count            INTEGER DEFAULT 0,
  valid_from            TIMESTAMPTZ NOT NULL,
  valid_until           TIMESTAMPTZ NOT NULL,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  type                  VARCHAR(50) NOT NULL, -- subscription_expiry, payment_reminder, etc.
  title                 VARCHAR(255) NOT NULL,
  message               TEXT NOT NULL,
  is_read               BOOLEAN DEFAULT FALSE,
  email_sent            BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── ACTIVITY LOGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name             VARCHAR(255),
  user_role             VARCHAR(50),
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  restaurant_name       VARCHAR(255),
  action                VARCHAR(100) NOT NULL, -- login, logout, order_created, etc.
  entity_type           VARCHAR(50), -- order, menu_item, user, etc.
  entity_id             UUID,
  details               JSONB,
  ip_address            INET,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── PLAN LIMITS CONFIGURATION ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_limits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan                  subscription_plan UNIQUE NOT NULL,
  max_menu_items        INTEGER DEFAULT 50,
  max_tables            INTEGER DEFAULT 10,
  max_staff_users       INTEGER DEFAULT 3,
  max_photos_per_month  INTEGER DEFAULT 0,
  max_videos_per_month  INTEGER DEFAULT 0,
  allows_custom_domain  BOOLEAN DEFAULT FALSE,
  allows_white_label    BOOLEAN DEFAULT FALSE,
  allows_api_access     BOOLEAN DEFAULT FALSE,
  support_level         VARCHAR(20) DEFAULT 'basic', -- basic, priority, dedicated
  monthly_price         DECIMAL(10,2) DEFAULT 0,
  yearly_price          DECIMAL(10,2) DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plan limits
INSERT INTO plan_limits (plan, max_menu_items, max_tables, max_staff_users, max_photos_per_month, max_videos_per_month, allows_custom_domain, allows_white_label, allows_api_access, support_level, monthly_price, yearly_price)
VALUES 
  ('free', 50, 10, 2, 0, 0, FALSE, FALSE, FALSE, 'basic', 0, 0),
  ('basic', 999999, 50, 5, 0, 0, FALSE, FALSE, FALSE, 'basic', 999, 9990),
  ('pro', 999999, 100, 10, 100, 0, TRUE, FALSE, FALSE, 'priority', 2499, 24990),
  ('premium', 999999, 999999, 999999, 999999, 100, TRUE, TRUE, TRUE, 'dedicated', 4999, 49990)
ON CONFLICT (plan) DO UPDATE SET
  max_menu_items = EXCLUDED.max_menu_items,
  max_tables = EXCLUDED.max_tables,
  max_staff_users = EXCLUDED.max_staff_users,
  updated_at = NOW();

-- ── FEATURE FLAGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                   VARCHAR(100) UNIQUE NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  is_enabled            BOOLEAN DEFAULT TRUE,
  allowed_plans         TEXT[], -- NULL means all plans
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default feature flags
INSERT INTO feature_flags (key, name, description, is_enabled, allowed_plans)
VALUES 
  ('qr_code', 'QR Code Ordering', 'Enable QR code based ordering', TRUE, NULL),
  ('online_payments', 'Online Payments', 'Enable online payment processing', TRUE, ARRAY['basic', 'pro', 'premium']),
  ('kitchen_display', 'Kitchen Display', 'Enable kitchen dashboard display', TRUE, ARRAY['pro', 'premium']),
  ('table_management', 'Table Management', 'Enable table and QR management', TRUE, ARRAY['basic', 'pro', 'premium']),
  ('staff_management', 'Staff Management', 'Enable staff user management', TRUE, ARRAY['pro', 'premium']),
  ('analytics', 'Advanced Analytics', 'Enable detailed analytics dashboard', TRUE, ARRAY['pro', 'premium']),
  ('api_access', 'API Access', 'Enable API access for integrations', FALSE, ARRAY['premium']),
  ('white_label', 'White Label', 'Enable white-label branding', FALSE, ARRAY['premium'])
ON CONFLICT (key) DO NOTHING;

-- ── EMAIL TEMPLATES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                   VARCHAR(100) UNIQUE NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  subject               VARCHAR(500) NOT NULL,
  body_html             TEXT NOT NULL,
  body_text             TEXT,
  variables             JSONB DEFAULT '[]',
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (key, name, subject, body_html, body_text, variables)
VALUES 
  ('welcome', 'Welcome Email', 'Welcome to {{restaurantName}}!', 
   '<h1>Welcome {{userName}}!</h1><p>Thank you for joining {{restaurantName}}. We''re excited to have you!</p><p>Your account is now active and ready to use.</p>',
   'Welcome {{userName}}! Thank you for joining {{restaurantName}}. Your account is now active.',
   '["userName", "restaurantName"]'),
   
  ('order_confirmation', 'Order Confirmation', 'Order #{{orderId}} Confirmed',
   '<h1>Order Confirmed</h1><p>Hi {{customerName}},</p><p>Your order #{{orderId}} has been received and is being prepared.</p><p>Total: ₹{{total}}</p>',
   'Hi {{customerName}}, Your order #{{orderId}} has been received. Total: ₹{{total}}',
   '["customerName", "orderId", "total"]'),
   
  ('password_reset', 'Password Reset', 'Reset Your Password',
   '<h1>Password Reset Request</h1><p>Hi {{userName}},</p><p>Click the link below to reset your password:</p><p><a href="{{resetUrl}}">Reset Password</a></p><p>This link expires in 1 hour.</p>',
   'Hi {{userName}}, Reset your password: {{resetUrl}} (expires in 1 hour)',
   '["userName", "resetUrl"]'),
   
  ('subscription_expiring', 'Subscription Expiring', 'Your Subscription Expires Soon',
   '<h1>Subscription Expiring</h1><p>Hi {{userName}},</p><p>Your {{plan}} plan expires on {{expiryDate}}.</p><p><a href="{{renewUrl}}">Renew Now</a></p>',
   'Hi {{userName}}, Your {{plan}} plan expires on {{expiryDate}}. Renew: {{renewUrl}}',
   '["userName", "plan", "expiryDate", "renewUrl"]'),
   
  ('new_staff_invite', 'Staff Invitation', 'You''ve Been Invited to {{restaurantName}}',
   '<h1>Welcome to the Team!</h1><p>Hi {{userName}},</p><p>You''ve been invited to join {{restaurantName}} as {{role}}.</p><p><a href="{{inviteUrl}}">Accept Invitation</a></p>',
   'Hi {{userName}}, You''ve been invited to join {{restaurantName}} as {{role}}. Accept: {{inviteUrl}}',
   '["userName", "restaurantName", "role", "inviteUrl"]')
ON CONFLICT (key) DO NOTHING;

-- ── SEED PLATFORM ADMIN (change password after first run!) ────────────────
-- Password: Admin@123 (bcrypt hash below)
INSERT INTO users (restaurant_id, name, email, password_hash, role)
VALUES (NULL, 'Platform Admin', 'admin@menuos.app',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iB5i',
  'platform_admin')
ON CONFLICT (email) DO NOTHING;
