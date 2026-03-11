import { query } from './pool.js';
import { fileURLToPath } from 'url';

const restaurantSlug = 'pankys';

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

export async function seedMenu() {
  try {
    // Get restaurant ID
    const restaurantResult = await query('SELECT id FROM restaurants WHERE slug = $1', [restaurantSlug]);
    if (restaurantResult.rows.length === 0) {
      console.error('Restaurant not found:', restaurantSlug);
      return;
    }
    
    const restaurantId = restaurantResult.rows[0].id;
    console.log(`🍽 Seeding menu for restaurant: ${restaurantSlug} (${restaurantId})`);
    
    // Check if menu already exists
    const existingMenu = await query('SELECT COUNT(*) FROM menu_items WHERE restaurant_id = $1', [restaurantId]);
    if (parseInt(existingMenu.rows[0].count) > 0) {
      console.log('Menu already exists, skipping seed');
      return;
    }
    
    let added = 0;
    for (const item of menuItems) {
      try {
        await query(
          `INSERT INTO menu_items (restaurant_id, name, category, description, price, tags, is_available)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [restaurantId, item.name, item.category, item.description, item.price, item.tags]
        );
        console.log(`✅ Added: ${item.name}`);
        added++;
      } catch (err) {
        console.error(`❌ Failed to add ${item.name}:`, err.message);
      }
    }
    
    console.log(`\n🎉 Successfully added ${added}/${menuItems.length} menu items!`);
  } catch (err) {
    console.error('💥 Seeding failed:', err.message);
    throw err;
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedMenu().then(() => process.exit(0)).catch(() => process.exit(1));
}
