import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: inyectar JWT + business_id ────────
api.interceptors.request.use(async (config) => {
  const token      = await SecureStore.getItemAsync('access_token');
  const businessId = await SecureStore.getItemAsync('business_id');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (businessId) {
    config.headers['X-Business-Id'] = businessId;
  }
  return config;
});

// ── Response interceptor: refresh token automático ─────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { token: refresh });
        await SecureStore.setItemAsync('access_token', data.access);
        original.headers.set('Authorization', `Bearer ${data.access}`);
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // Navegar a login — se maneja en el store de auth
      }
    }
    return Promise.reject(error);
  }
);

// ── Endpoints helpers ──────────────────────────────────────
export const authAPI = {
  register: (d: any) => api.post('/auth/register', d),
  login:    (d: any) => api.post('/auth/login', d),
  me:       ()       => api.get('/auth/me'),
};

export const businessAPI = {
  create:  (d: any) => api.post('/business', d),
  list:    ()       => api.get('/business'),
  getOne:  (id: string) => api.get(`/business/${id}`),
  update:  (id: string, d: any) => api.put(`/business/${id}`, d),
};

export const productsAPI = {
  list:       (params?: any) => api.get('/products', { params }),
  create:     (d: any)       => api.post('/products', d),
  update:     (id: string, d: any) => api.put(`/products/${id}`, d),
  remove:     (id: string)   => api.delete(`/products/${id}`),
  byBarcode:  (code: string) => api.get(`/products/barcode/${code}`),
  search:     (q: string, category_id?: string) => api.get('/products', { params: { search: q, category_id } }),
  importExcel:(file: FormData) => api.post('/products/import', file, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadImage:(file: FormData) => api.post('/products/upload-image', file, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const salesAPI = {
  create:  (d: any)    => api.post('/sales', d),
  list:    (params?: any) => api.get('/sales', { params }),
  getOne:  (id: string) => api.get(`/sales/${id}`),
  cancel:  (id: string) => api.patch(`/sales/${id}/cancel`),
};

export const reportsAPI = {
  dashboard:  () => api.get('/reports/dashboard'),
  byPeriod:   (period: 'day'|'week'|'month'|'year') => api.get('/reports/sales', { params: { period } }),
  topProducts: (params?: any) => api.get('/reports/top-products', { params }),
  exportExcel: (params?: any) => api.get('/reports/export/excel', { params, responseType: 'blob' }),
};

export const categoriesAPI = {
  list:   ()              => api.get('/categories'),
  create: (d: any)        => api.post('/categories', d),
  update: (id: string, d: any) => api.put(`/categories/${id}`, d),
  remove: (id: string)    => api.delete(`/categories/${id}`),
};

export const employeesAPI = {
  list:       ()          => api.get('/employees'),
  create:     (d: any)    => api.post('/employees', d),
  pinLogin:   (pin: string) => api.post('/employees/pin-login', { pin_code: pin }),
};

export const subscriptionAPI = {
  getCurrent: () => api.get('/subscription'),
};

export const cashAPI = {
  register: (data: any) => api.post('/cash', data),
  getStatus: () => api.get('/cash/status'),
  getShiftReport: () => api.get('/cash/shift-report'),
};

export const expenseAPI = {
  create: (data: any) => api.post('/expenses', data),
  list: (params: any) => api.get('/expenses', { params }),
  remove: (id: string) => api.delete(`/expenses/${id}`),
};
