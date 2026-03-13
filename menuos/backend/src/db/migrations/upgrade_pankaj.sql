-- Upgrade davidpankaj@gmail.com to Premium and Platform Admin
-- Run this in your Neon database SQL editor

-- First, find the user and restaurant
SELECT u.id as user_id, u.email, u.role, u.restaurant_id,
       r.id as restaurant_id, r.name, r.subscription_plan
FROM users u
JOIN restaurants r ON u.restaurant_id = r.id
WHERE u.email = 'davidpankaj@gmail.com';

-- Update user to platform_admin
UPDATE users 
SET role = 'platform_admin'
WHERE email = 'davidpankaj@gmail.com';

-- Update restaurant to premium plan
UPDATE restaurants
SET subscription_plan = 'premium'
WHERE id = (SELECT restaurant_id FROM users WHERE email = 'davidpankaj@gmail.com');

-- Verify the changes
SELECT u.id as user_id, u.email, u.role, u.restaurant_id,
       r.id as restaurant_id, r.name, r.subscription_plan
FROM users u
JOIN restaurants r ON u.restaurant_id = r.id
WHERE u.email = 'davidpankaj@gmail.com';
