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
  subtotal          DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_type     VARCHAR(20), -- 'percentage' or 'fixed'
  discount_value    DECIMAL(10,2) DEFAULT 0,
  discount_amount   DECIMAL(10,2) DEFAULT 0,
  discount_code     VARCHAR(50),
  total_amount      DECIMAL(10,2) NOT NULL,
  payment_status    payment_status DEFAULT 'pending',
  payment_tx_id     VARCHAR(100),
  order_status      order_status DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, order_number)
);

-- Add discount columns if they don't exist (for existing databases)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'subtotal') THEN
        ALTER TABLE orders ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'discount_type') THEN
        ALTER TABLE orders ADD COLUMN discount_type VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'discount_value') THEN
        ALTER TABLE orders ADD COLUMN discount_value DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'discount_amount') THEN
        ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'discount_code') THEN
        ALTER TABLE orders ADD COLUMN discount_code VARCHAR(50);
    END IF;
END $$;

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

-- ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 VARCHAR(255) NOT NULL,
  content               TEXT NOT NULL,
  type                  VARCHAR(20) DEFAULT 'info', -- info, warning, success, error
  target_audience       VARCHAR(20) DEFAULT 'all', -- all, restaurants, customers, platform_admins
  is_active             BOOLEAN DEFAULT TRUE,
  starts_at             TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample announcement
INSERT INTO announcements (title, content, type, target_audience, is_active)
VALUES 
  ('Welcome to MenuOS!', 'Thank you for using MenuOS. We''re constantly improving to serve you better.', 'success', 'all', TRUE)
ON CONFLICT DO NOTHING;

-- ── SUPPORT TICKETS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number         VARCHAR(20) UNIQUE NOT NULL,
  user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  subject               VARCHAR(255) NOT NULL,
  description           TEXT NOT NULL,
  category              VARCHAR(50) DEFAULT 'general', -- general, billing, technical, feature_request, bug
  priority              VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  status                VARCHAR(20) DEFAULT 'open', -- open, in_progress, waiting, resolved, closed
  assigned_to           UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes      TEXT,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Support ticket messages/replies
CREATE TABLE IF NOT EXISTS support_messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id             UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
  message               TEXT NOT NULL,
  is_internal           BOOLEAN DEFAULT FALSE, -- internal notes vs customer-facing
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);

-- ── ONBOARDING CHECKLIST ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_checklist_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key                   VARCHAR(100) UNIQUE NOT NULL,
  title                 VARCHAR(255) NOT NULL,
  description           TEXT,
  category              VARCHAR(50) DEFAULT 'setup', -- setup, menu, staff, launch
  order_index           INTEGER DEFAULT 0,
  is_required           BOOLEAN DEFAULT TRUE,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurant onboarding progress
CREATE TABLE IF NOT EXISTS restaurant_onboarding (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  checklist_item_id     UUID REFERENCES onboarding_checklist_items(id) ON DELETE CASCADE,
  is_completed          BOOLEAN DEFAULT FALSE,
  completed_at          TIMESTAMPTZ,
  completed_by          UUID REFERENCES users(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, checklist_item_id)
);

-- Insert default onboarding items
INSERT INTO onboarding_checklist_items (key, title, description, category, order_index, is_required)
VALUES 
  ('restaurant_profile', 'Complete Restaurant Profile', 'Add restaurant name, address, contact info, and logo', 'setup', 1, TRUE),
  ('upload_logo', 'Upload Restaurant Logo', 'Upload your restaurant logo for branding', 'setup', 2, FALSE),
  ('add_menu_categories', 'Create Menu Categories', 'Set up categories like Starters, Main Course, Desserts', 'menu', 3, TRUE),
  ('add_menu_items', 'Add Menu Items', 'Add at least 5 items to your menu with photos', 'menu', 4, TRUE),
  ('set_pricing', 'Configure Pricing', 'Set prices for all menu items', 'menu', 5, TRUE),
  ('add_tables', 'Set Up Tables', 'Create table numbers for QR code ordering', 'setup', 6, TRUE),
  ('generate_qr_codes', 'Generate QR Codes', 'Generate and print QR codes for tables', 'launch', 7, TRUE),
  ('add_staff', 'Add Staff Members', 'Invite kitchen staff and waiters', 'staff', 8, FALSE),
  ('test_order', 'Place Test Order', 'Test the complete ordering flow', 'launch', 9, TRUE),
  ('go_live', 'Go Live!', 'Enable your restaurant for customers', 'launch', 10, TRUE)
ON CONFLICT (key) DO NOTHING;

-- ── TRIAL MANAGEMENT ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trial_conversions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  started_at            TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL,
  converted_at          TIMESTAMPTZ,
  converted_to_plan     subscription_plan,
  converted_by_user_id  UUID REFERENCES users(id),
  trial_duration_days   INTEGER DEFAULT 14,
  source                VARCHAR(50) DEFAULT 'organic', -- organic, referral, campaign
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Trial engagement tracking
CREATE TABLE IF NOT EXISTS trial_engagement (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type            VARCHAR(50) NOT NULL, -- login, menu_view, order_placed, staff_added, etc.
  event_data            JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trial_conversions_restaurant ON trial_conversions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_trial_conversions_expires ON trial_conversions(expires_at);
CREATE INDEX IF NOT EXISTS idx_trial_engagement_restaurant ON trial_engagement(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_trial_engagement_event ON trial_engagement(event_type);

-- ── REVENUE ANALYTICS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type            VARCHAR(50) NOT NULL, -- subscription_started, subscription_upgraded, subscription_downgraded, subscription_cancelled, payment_succeeded, payment_failed
  previous_plan         subscription_plan,
  new_plan              subscription_plan,
  amount                DECIMAL(10,2),
  currency              VARCHAR(3) DEFAULT 'INR',
  event_date            DATE DEFAULT CURRENT_DATE,
  metadata              JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- MRR snapshots (monthly recurring revenue)
CREATE TABLE IF NOT EXISTS mrr_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date         DATE NOT NULL,
  total_mrr             DECIMAL(12,2) DEFAULT 0,
  total_customers       INTEGER DEFAULT 0,
  new_customers         INTEGER DEFAULT 0,
  churned_customers     INTEGER DEFAULT 0,
  upgrades              INTEGER DEFAULT 0,
  downgrades            INTEGER DEFAULT 0,
  by_plan               JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_revenue_events_restaurant ON revenue_events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_type ON revenue_events(event_type);
CREATE INDEX IF NOT EXISTS idx_revenue_events_date ON revenue_events(event_date);
CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_date ON mrr_snapshots(snapshot_date);

-- ── REFERRAL PROGRAM ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  VARCHAR(50) UNIQUE NOT NULL,
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  created_by_user_id    UUID REFERENCES users(id),
  discount_percent      INTEGER DEFAULT 20, -- discount for referred customer
  reward_amount         DECIMAL(10,2) DEFAULT 500, -- reward for referrer (in INR)
  max_uses              INTEGER, -- NULL = unlimited
  used_count            INTEGER DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Referral tracking
CREATE TABLE IF NOT EXISTS referrals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id      UUID REFERENCES referral_codes(id) ON DELETE SET NULL,
  referrer_restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  referred_restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  status                VARCHAR(20) DEFAULT 'pending', -- pending, converted, expired
  discount_applied      BOOLEAN DEFAULT FALSE,
  reward_paid           BOOLEAN DEFAULT FALSE,
  reward_paid_at        TIMESTAMPTZ,
  reward_paid_amount    DECIMAL(10,2),
  converted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_restaurant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_restaurant ON referral_codes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_restaurant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ── IN-APP MESSAGING ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id),
  subject               VARCHAR(200) NOT NULL,
  status                VARCHAR(20) DEFAULT 'open', -- open, closed, archived
  priority              VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  last_message_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id       UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id             UUID REFERENCES users(id),
  sender_type           VARCHAR(20) NOT NULL, -- user, platform_admin, system
  content               TEXT NOT NULL,
  is_read               BOOLEAN DEFAULT FALSE,
  read_at               TIMESTAMPTZ,
  attachments           JSONB, -- array of {name, url, type}
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_restaurant ON conversations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON conversations(priority);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ── FAILED PAYMENTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS failed_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  amount                DECIMAL(10,2) NOT NULL,
  currency              VARCHAR(3) DEFAULT 'INR',
  plan                  subscription_plan NOT NULL,
  failure_reason        VARCHAR(200),
  error_code            VARCHAR(50),
  retry_count           INTEGER DEFAULT 0,
  max_retries           INTEGER DEFAULT 3,
  next_retry_at         TIMESTAMPTZ,
  status                VARCHAR(20) DEFAULT 'pending', -- pending, resolved, cancelled, dunning
  resolved_at           TIMESTAMPTZ,
  resolved_by           UUID REFERENCES users(id),
  resolution_notes      TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_failed_payments_restaurant ON failed_payments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_failed_payments_status ON failed_payments(status);
CREATE INDEX IF NOT EXISTS idx_failed_payments_created ON failed_payments(created_at);

-- ── RESTAURANT HEALTH MONITORING ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_health_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  snapshot_date         DATE DEFAULT CURRENT_DATE,
  menu_item_count       INTEGER DEFAULT 0,
  menu_item_limit       INTEGER DEFAULT 0,
  menu_item_usage_pct   DECIMAL(5,2) DEFAULT 0,
  category_count        INTEGER DEFAULT 0,
  category_limit        INTEGER DEFAULT 0,
  category_usage_pct    DECIMAL(5,2) DEFAULT 0,
  staff_count           INTEGER DEFAULT 0,
  staff_limit           INTEGER DEFAULT 0,
  staff_usage_pct       DECIMAL(5,2) DEFAULT 0,
  table_count           INTEGER DEFAULT 0,
  table_limit           INTEGER DEFAULT 0,
  table_usage_pct       DECIMAL(5,2) DEFAULT 0,
  media_usage_mb        DECIMAL(10,2) DEFAULT 0,
  media_limit_mb        DECIMAL(10,2) DEFAULT 0,
  media_usage_pct       DECIMAL(5,2) DEFAULT 0,
  overall_health_score  INTEGER DEFAULT 100, -- 0-100
  warnings              JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_health_snapshots_restaurant ON restaurant_health_snapshots(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_date ON restaurant_health_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_health_score ON restaurant_health_snapshots(overall_health_score);

-- ── SEED PLATFORM ADMIN (change password after first run!) ────────────────
-- Password: Admin@123 (bcrypt hash below)
INSERT INTO users (restaurant_id, name, email, password_hash, role)
VALUES (NULL, 'Platform Admin', 'admin@menuos.app',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iB5i',
  'platform_admin')
ON CONFLICT (email) DO NOTHING;
