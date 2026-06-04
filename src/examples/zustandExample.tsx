import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Example 1: User store
interface UserState {
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
  } | null;
  isAuthenticated: boolean;
  login: (userData: { id: string; name: string; email: string }) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserState['user']>) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        login: (userData) =>
          set({
            user: userData,
            isAuthenticated: true,
          }),
        logout: () =>
          set({
            user: null,
            isAuthenticated: false,
          }),
        updateProfile: (updates) =>
          set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
          })),
      }),
      {
        name: 'user-storage',
      }
    )
  )
);

// Example 2: Cart store
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  devtools(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          let newItems: CartItem[];

          if (existingItem) {
            newItems = state.items.map((i) =>
              i.id === item.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            );
          } else {
            newItems = [...state.items, { ...item, quantity: 1 }];
          }

          const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalPrice = newItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          return { items: newItems, totalItems, totalPrice };
        }),
      removeItem: (id) =>
        set((state) => {
          const newItems = state.items.filter((item) => item.id !== id);
          const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalPrice = newItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          return { items: newItems, totalItems, totalPrice };
        }),
      updateQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            return get().removeItem(id);
          }

          const newItems = state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          );

          const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalPrice = newItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          return { items: newItems, totalItems, totalPrice };
        }),
      clearCart: () =>
        set({
          items: [],
          totalItems: 0,
          totalPrice: 0,
        }),
    })
  )
);

// Example usage:
// const { user, login, logout } = useUserStore();
// const { items, addItem, removeItem } = useCartStore();

export { useUserStore, useCartStore };