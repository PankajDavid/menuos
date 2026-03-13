-- Add 'premium' to subscription_plan ENUM
-- Run this in Neon SQL Editor

-- First, add the new value to the ENUM type
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'premium';

-- Verify the change
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'subscription_plan'::regtype ORDER BY enumsortorder;
