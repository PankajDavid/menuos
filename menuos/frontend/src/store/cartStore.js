import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      restaurantSlug: null,

      addItem: (item, slug) => {
        console.log('CartStore: Adding item', item.name, 'for restaurant', slug);
        const { items, restaurantSlug } = get();
        console.log('CartStore: Current items:', items.length, 'Current restaurant:', restaurantSlug);
        // Clear cart if switching restaurants
        if (restaurantSlug && restaurantSlug !== slug) {
          console.log('CartStore: Switching restaurants, clearing cart');
          set({ items: [{ ...item, qty: 1 }], restaurantSlug: slug });
          return;
        }
        const existing = items.find(i => i.id === item.id);
        let newItems;
        if (existing) {
          newItems = items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
        } else {
          newItems = [...items, { ...item, qty: 1 }];
        }
        console.log('CartStore: New items count:', newItems.length);
        set({ items: newItems, restaurantSlug: slug });
      },

      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),

      updateQty: (id, qty) => {
        if (qty <= 0) { get().removeItem(id); return; }
        set(s => ({ items: s.items.map(i => i.id === id ? { ...i, qty } : i) }));
      },

      clearCart: () => set({ items: [], restaurantSlug: null }),

      get total() {
        return get().items.reduce((s, i) => s + parseFloat(i.price) * i.qty, 0);
      },

      get count() {
        return get().items.reduce((s, i) => s + i.qty, 0);
      },
    }),
    { name: 'menuos-cart' }
  )
);
