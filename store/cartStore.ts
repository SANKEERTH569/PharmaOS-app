
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Medicine } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (medicine: Medicine, qty: number) => void;
  removeItem: (medicineId: string) => void;
  updateQty: (medicineId: string, qty: number) => void;
  clearCart: () => void;
  totalAmount: () => number;
}

export const useCartStore = create<CartState>()(persist((set, get) => ({
  items: [],

  addItem: (medicine, qty) => set((state) => {
    const existing = state.items.find(i => i.medicine.id === medicine.id);
    if (existing) {
      return {
        items: state.items.map(i => 
          i.medicine.id === medicine.id 
            ? { ...i, qty: i.qty + qty }
            : i
        )
      };
    }
    return { items: [...state.items, { medicine, qty }] };
  }),

  removeItem: (medicineId) => set((state) => ({
    items: state.items.filter(i => i.medicine.id !== medicineId)
  })),

  updateQty: (medicineId, qty) => set((state) => ({
    items: state.items.map(i => 
      i.medicine.id === medicineId 
        ? { ...i, qty: Math.max(0, qty) }
        : i
    ).filter(i => i.qty > 0)
  })),

  clearCart: () => set({ items: [] }),

  totalAmount: () => {
    return get().items.reduce((acc, item) => acc + (item.medicine.price * item.qty), 0);
  }
}), { name: 'pharma-cart-store', version: 1 }));
