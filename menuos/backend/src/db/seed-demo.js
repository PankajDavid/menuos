import 'dotenv/config';
import { query } from './pool.js';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

// Demo account credentials
const DEMO_EMAIL = 'demo@gmail.com';
const DEMO_PASSWORD = 'demo@0852';
const DEMO_RESTAURANT_NAME = "Panky's Kitchen";
const DEMO_SLUG = 'demo';

// Menu items to copy from Panky's
const menuItems = [
  // Burgers
  { name: 'Classic Veg Burger', category: 'Burgers', description: 'Fresh veggie patty with lettuce, tomato, cheese & special sauce', price: 89, tags: ['veg', 'best-seller'] },
  { name: 'Paneer Tikka Burger', category: 'Burgers', description: 'Grilled paneer tikka with mint mayo & veggies', price: 129, tags: ['veg', 'spicy'] },
  { name: 'Chicken Tikka Burger', category: 'Burgers', description: 'Juicy chicken tikka with spicy mayo', price: 149, tags: ['non-veg', 'spicy'] },
  { name: 'Double Chicken Burger', category: 'Burgers', description: 'Double chicken patty with cheese & caramelized onions', price: 199, tags: ['non-veg'] },
  
  // Wraps
  { name: 'Veg Wrap', category: 'Wraps', description: 'Mixed veggies with hummus & tahini in a soft wrap', price: 79, tags: ['veg', 'healthy'] },
  { name: 'Paneer Wrap', category: 'Wraps', description: 'Crispy paneer strips with mint chutney', price: 119, tags: ['veg'] },
  { name: 'Chicken Shawarma Wrap', category: 'Wraps', description: 'Classic chicken shawarma with garlic sauce', price: 139, tags: ['non-veg', 'best-seller'] },
  { name: 'Egg Wrap', category: 'Wraps', description: 'Scrambled eggs with veggies & cheese', price: 99, tags: ['egg'] },
  
  // Pizza
  { name: 'Margherita Pizza', category: 'Pizza', description: 'Classic cheese & tomato pizza', price: 149, tags: ['veg'] },
  { name: 'Veggie Supreme Pizza', category: 'Pizza', description: 'Loaded with bell peppers, onions, corn & olives', price: 199, tags: ['veg'] },
  { name: 'Paneer Tikka Pizza', category: 'Pizza', description: 'Tandoori paneer with onions & capsicum', price: 229, tags: ['veg', 'spicy'] },
  { name: 'Chicken Pepperoni Pizza', category: 'Pizza', description: 'Classic pepperoni with mozzarella', price: 249, tags: ['non-veg'] },
  
  // Chinese
  { name: 'Veg Chowmein', category: 'Chinese', description: 'Hakka noodles with mixed vegetables', price: 89, tags: ['veg'] },
  { name: 'Chicken Chowmein', category: 'Chinese', description: 'Hakka noodles with chicken & veggies', price: 129, tags: ['non-veg'] },
  { name: 'Veg Manchurian', category: 'Chinese', description: 'Crispy veg balls in spicy sauce', price: 109, tags: ['veg', 'spicy'] },
  { name: 'Chilli Chicken', category: 'Chinese', description: 'Indo-Chinese style spicy chicken', price: 169, tags: ['non-veg', 'spicy', 'best-seller'] },
  { name: 'Spring Rolls (4 pcs)', category: 'Chinese', description: 'Crispy rolls with veg filling', price: 79, tags: ['veg', 'starter'] },
  
  // Beverages
  { name: 'Cold Coffee', category: 'Beverages', description: 'Chilled coffee with ice cream', price: 79, tags: ['cold', 'best-seller'] },
  { name: 'Fresh Lime Soda', category: 'Beverages', description: 'Refreshing sweet or salted lime soda', price: 49, tags: ['cold', 'refreshing'] },
  { name: 'Mango Shake', category: 'Beverages', description: 'Thick mango milkshake', price: 89, tags: ['cold', 'seasonal'] },
  { name: 'Masala Chai', category: 'Beverages', description: 'Hot spiced tea', price: 29, tags: ['hot'] },
  
  // Desserts
  { name: 'Chocolate Brownie', category: 'Desserts', description: 'Warm chocolate brownie with vanilla ice cream', price: 99, tags: ['sweet', 'best-seller'] },
  { name: 'Gulab Jamun (2 pcs)', category: 'Desserts', description: 'Soft fried dumplings in sugar syrup', price: 49, tags: ['sweet', 'indian'] },
];

export async function seedDemoAccount() {
  try {
    console.log('🎭 Creating Demo Account...');
    
    // Check if demo account already exists
    const existingUser = await query('SELECT id, restaurant_id FROM users WHERE email = $1', [DEMO_EMAIL]);
    if (existingUser.rows.length > 0) {
      console.log('✅ Demo account already exists');
      
      // Ensure it's premium
      if (existingUser.rows[0].restaurant_id) {
        await query(`
          UPDATE restaurants 
          SET subscription_plan = 'premium', 
              subscription_status = 'active',
              is_active = true
          WHERE id = $1
        `, [existingUser.rows[0].restaurant_id]);
        console.log('✅ Ensured premium subscription');
      }
      return;
    }
    
    // Create restaurant
    const restaurantResult = await query(`
      INSERT INTO restaurants (name, slug, owner_email, subscription_plan, subscription_status, is_active)
      VALUES ($1, $2, $3, 'premium', 'active', true)
      RETURNING id
    `, [DEMO_RESTAURANT_NAME, DEMO_SLUG, DEMO_EMAIL]);
    
    const restaurantId = restaurantResult.rows[0].id;
    console.log(`✅ Created restaurant: ${DEMO_RESTAURANT_NAME} (${restaurantId})`);
    
    // Create user with hashed password
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    await query(`
      INSERT INTO users (restaurant_id, name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, 'admin', true)
    `, [restaurantId, 'Demo User', DEMO_EMAIL, passwordHash]);
    console.log(`✅ Created user: ${DEMO_EMAIL}`);
    
    // Create some tables for demo
    const tableNumbers = ['1', '2', '3', '4', '5', '6', '7', '8'];
    for (const tableNum of tableNumbers) {
      await query(`
        INSERT INTO restaurant_tables (restaurant_id, table_number, capacity, is_active)
        VALUES ($1, $2, 4, true)
      `, [restaurantId, tableNum]);
    }
    console.log(`✅ Created ${tableNumbers.length} tables`);
    
    // Add menu items
    let added = 0;
    for (const item of menuItems) {
      try {
        await query(
          `INSERT INTO menu_items (restaurant_id, name, category, description, price, tags, is_available)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [restaurantId, item.name, item.category, item.description, item.price, item.tags]
        );
        added++;
      } catch (err) {
        console.error(`❌ Failed to add ${item.name}:`, err.message);
      }
    }
    console.log(`✅ Added ${added}/${menuItems.length} menu items`);
    
    console.log('\n🎉 Demo account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${DEMO_EMAIL}`);
    console.log(`🔑 Password: ${DEMO_PASSWORD}`);
    console.log(`🏪 Restaurant: ${DEMO_RESTAURANT_NAME}`);
    console.log(`🔗 URL: /r/${DEMO_SLUG}/menu`);
    console.log(`⭐ Plan: Premium`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (err) {
    console.error('💥 Demo account creation failed:', err.message);
    throw err;
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDemoAccount().then(() => process.exit(0)).catch(() => process.exit(1));
}
