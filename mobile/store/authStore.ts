import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authAPI, businessAPI, subscriptionAPI } from '../services/api';

interface User { id: string; name: string; email: string; }
interface Business { id: string; name: string; slug: string; currency: string; }
interface Subscription { plan: 'free'|'pro'; isPro: boolean; features: Record<string, any>; }
interface Employee { id: string; name: string; role: 'owner'|'manager'|'cashier'; }

interface AuthState {
  user: User | null;
  business: Business | null;
  subscription: Subscription | null;
  activeEmployee: Employee | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login:          (email: string, password: string) => Promise<void>;
  register:       (name: string, email: string, password: string) => Promise<void>;
  logout:         () => Promise<void>;
  selectBusiness: (b: Business) => Promise<void>;
  loadSession:    () => Promise<void>;
  refreshSub:     () => Promise<void>;
  
  employeeLogin:  (pin: string) => Promise<void>;
  employeeLogout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  business: null,
  subscription: null,
  activeEmployee: null,
  isLoading: true,
  isAuthenticated: false,

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) return set({ isLoading: false });
      const { data: user } = await authAPI.me();
      const bizStr = await SecureStore.getItemAsync('current_business');
      const business = bizStr ? JSON.parse(bizStr) : null;
      set({ user, business, isAuthenticated: true });
      if (business) {
        const { data: sub } = await subscriptionAPI.getCurrent();
        set({ subscription: sub });
      }
      const empStr = await SecureStore.getItemAsync('active_employee');
      if (empStr) set({ activeEmployee: JSON.parse(empStr) });
    } catch {
      await SecureStore.deleteItemAsync('access_token');
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    await SecureStore.setItemAsync('access_token', data.access);
    await SecureStore.setItemAsync('refresh_token', data.refresh);
    set({ user: data.user, isAuthenticated: true });
  },

  register: async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    await SecureStore.setItemAsync('access_token', data.access);
    await SecureStore.setItemAsync('refresh_token', data.refresh);
    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('business_id');
    await SecureStore.deleteItemAsync('current_business');
    await SecureStore.deleteItemAsync('active_employee');
    set({ user: null, business: null, subscription: null, activeEmployee: null, isAuthenticated: false });
  },

  selectBusiness: async (b) => {
    await SecureStore.setItemAsync('business_id', b.id);
    await SecureStore.setItemAsync('current_business', JSON.stringify(b));
    set({ business: b });
    await get().refreshSub();
  },

  refreshSub: async () => {
    try {
      const { data } = await subscriptionAPI.getCurrent();
      set({ subscription: data });
    } catch {}
  },

  employeeLogin: async (pin: string) => {
    const { employeesAPI } = require('../services/api');
    const { data } = await employeesAPI.pinLogin(pin);
    await SecureStore.setItemAsync('active_employee', JSON.stringify(data.employee));
    set({ activeEmployee: data.employee });
  },

  employeeLogout: async () => {
    await SecureStore.deleteItemAsync('active_employee');
    set({ activeEmployee: null });
  },
}));
