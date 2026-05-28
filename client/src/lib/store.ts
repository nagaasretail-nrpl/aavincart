import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem } from '@shared/schema';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      
      addItem: (newItem) => set((state) => {
        console.log('addItem called with:', newItem);
        console.log('current state.items:', state.items);
        const existingItem = state.items.find(item => item.id === newItem.id);
        if (existingItem) {
          console.log('existing item found, updating quantity');
          const updatedState = {
            items: state.items.map(item =>
              item.id === newItem.id
                ? { ...item, quantity: item.quantity + newItem.quantity }
                : item
            )
          };
          console.log('updated state:', updatedState);
          return updatedState;
        }
        console.log('new item, adding to cart');
        const newState = { items: [...state.items, newItem] };
        console.log('new state:', newState);
        return newState;
      }),
      
      removeItem: (itemId) => set((state) => ({
        items: state.items.filter(item => item.id !== itemId)
      })),
      
      updateQuantity: (itemId, quantity) => set((state) => {
        const existingItem = state.items.find(item => item.id === itemId);
        const step = existingItem?.unitsPerPackage || 1;
        if (quantity < step) {
          return { items: state.items.filter(item => item.id !== itemId) };
        }
        const clampedQty = step > 1 ? Math.round(quantity / step) * step : quantity;
        return {
          items: state.items.map(item =>
            item.id === itemId ? { ...item, quantity: clampedQty } : item
          )
        };
      }),
      
      clearCart: () => set({ items: [] }),
      
      toggleCart: () => set((state) => {
        console.log('toggleCart called, current isOpen:', state.isOpen);
        console.log('current cart items:', state.items);
        return { isOpen: !state.isOpen };
      }),
      
      getTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
      },
      
      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      }
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
