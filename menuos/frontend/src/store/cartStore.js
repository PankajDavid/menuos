import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      restaurantSlug: null,

      addItem: (item, slug) => {
        const { items, restaurantSlug } = get();
        // Clear cart if switching restaurants
        if (restaurantSlug && restaurantSlug !== slug) {
          set({ items: [{ ...item, qty: 1 }], restaurantSlug: slug });
          return;
        }
        const existing = items.find(i => i.id === item.id);
        if (existing) {
          set({ items: items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) });
        } else {
          set({ items: [...items, { ...item, qty: 1 }], restaurantSlug: slug });
        }
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
