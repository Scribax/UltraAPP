import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  stock: number; // para validar antes de cobrar
}

interface CartState {
  items: CartItem[];
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia';
  discount: number;
  employeeId: string | null;

  addItem:         (product: { id: string; name: string; sell_price: number; stock: number }) => void;
  removeItem:      (productId: string) => void;
  updateQty:       (productId: string, qty: number) => void;
  setPayment:      (method: CartState['paymentMethod']) => void;
  setDiscount:     (amount: number) => void;
  setEmployee:     (id: string | null) => void;
  clear:           () => void;
  getSubtotal:     () => number;
  getTotal:        () => number;
  getItemCount:    () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  paymentMethod: 'efectivo',
  discount: 0,
  employeeId: null,

  addItem: (product) => set((state) => {
    const existing = state.items.find(i => i.productId === product.id);
    if (existing) {
      // No superar stock disponible
      if (existing.qty >= existing.stock) return state;
      return { items: state.items.map(i =>
        i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
      )};
    }
    return { items: [...state.items, {
      productId: product.id,
      name: product.name,
      price: typeof product.sell_price === 'string' ? parseFloat(product.sell_price) : product.sell_price,
      qty: 1,
      stock: product.stock,
    }]};
  }),

  removeItem: (productId) => set(state => ({
    items: state.items.filter(i => i.productId !== productId)
  })),

  updateQty: (productId, qty) => set(state => ({
    items: qty <= 0
      ? state.items.filter(i => i.productId !== productId)
      : state.items.map(i => i.productId === productId ? { ...i, qty: Math.min(qty, i.stock) } : i)
  })),

  setPayment:  (method) => set({ paymentMethod: method }),
  setDiscount: (amount) => set({ discount: Math.max(0, amount) }),
  setEmployee: (id)     => set({ employeeId: id }),
  clear: () => set({ items: [], discount: 0, employeeId: null }),

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
  getTotal:    () => Math.max(0, get().getSubtotal() - get().discount),
  getItemCount:() => get().items.reduce((sum, i) => sum + i.qty, 0),
}));
