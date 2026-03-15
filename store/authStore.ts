import { create } from 'zustand';
import api from '../utils/api';
import { connectSocket, disconnectSocket } from '../utils/socket';
import { Wholesaler, Retailer, Admin, MainWholesaler, Salesman, UserRole } from '../types';

interface AuthState {
  token: string | null;
  userRole: UserRole | null;
  wholesaler: Wholesaler | null;
  retailer: Retailer | null;
  admin: Admin | null;
  mainWholesaler: MainWholesaler | null;
  salesman: Salesman | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;

  login: (identifier: string, password: string, role: UserRole) => Promise<void>;
  loginWholesaler: (username: string, password: string) => Promise<void>;
  loginRetailer: (phone: string, password: string) => Promise<void>;
  loginMainWholesaler: (username: string, password: string) => Promise<void>;
  loginSalesman: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; password: string; name: string; phone: string; email: string; address?: string; firebase_id_token?: string }) => Promise<{ requires_email_verification: boolean; email: string }>;
  registerMainWholesaler: (data: { username: string; password: string; name: string; phone: string; email: string; address?: string; gstin?: string; firebase_id_token?: string }) => Promise<{ requires_email_verification: boolean; email: string }>;
  verifyEmail: (token: string, role: 'WHOLESALER' | 'MAIN_WHOLESALER') => Promise<void>;
  resendVerificationEmail: (email: string, role: 'WHOLESALER' | 'MAIN_WHOLESALER') => Promise<void>;
  registerRetailer: (data: { name: string; shop_name: string; phone: string; password: string; address?: string; gstin?: string; dl_number?: string }) => Promise<void>;
  logout: () => void;
  initFromStorage: () => void;
  updateWholesaler: (data: Partial<Wholesaler>) => Promise<void>;
  updateRetailerProfile: (data: Partial<Retailer>) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  salesmanRegister: (formData: any) => Promise<void>;
}

// 5 Mock Sub-Wholesalers (kept for MarketplacePage compatibility)
export const MOCK_WHOLESALERS: Wholesaler[] = [
  { id: 'ws-1', name: 'Sai Ram Agencies', phone: '9876543210', address: '12-5-189/A, Pharma Plaza, Moosapet, Hyderabad', plan: 'pro', gstin: '36AABCS1234A1Z5', dl_number: 'HYD-DL-12345/2022', bank_name: 'HDFC Bank', bank_account: '50200012345678', ifsc: 'HDFC0001234', email: 'sairam@agencies.com' },
  { id: 'ws-2', name: 'Mahaveer Distributors', phone: '9876543211', address: '45-2, Market Street, Sultan Bazar, Hyderabad', plan: 'growth', gstin: '36AABCM5678B2Z6', dl_number: 'HYD-DL-23456/2022', bank_name: 'SBI', bank_account: '30012345678901', ifsc: 'SBIN0012345', email: 'mahaveer@dist.com' },
  { id: 'ws-3', name: 'Balaji Pharma', phone: '9876543212', address: '88-1, Industrial Estate, Jeedimetla, Hyderabad', plan: 'starter', gstin: '36AABCB9012C3Z7', dl_number: 'HYD-DL-34567/2022', bank_name: 'Axis Bank', bank_account: '91801234567890', ifsc: 'UTIB0003456', email: 'balaji@pharma.com' },
  { id: 'ws-4', name: 'Sri Krishna Enterprises', phone: '9876543213', address: '102, Emerald House, Abids, Hyderabad', plan: 'pro', gstin: '36AABCK3456D4Z8', dl_number: 'HYD-DL-45678/2022', bank_name: 'ICICI Bank', bank_account: '123456789012', ifsc: 'ICIC0001234', email: 'srikrishna@ent.com' },
  { id: 'ws-5', name: 'Venkateshwara Agencies', phone: '9876543214', address: 'Plot 45, Auto Nagar, Hyderabad', plan: 'growth', gstin: '36AABCV7890E5Z9', dl_number: 'HYD-DL-56789/2022', bank_name: 'Kotak Bank', bank_account: '7812345678', ifsc: 'KKBK0001234', email: 'venkatesh@agencies.com' }
];

// Read auth from localStorage synchronously at store creation time
// so the very first render already has the correct isAuthenticated state.
function getInitialAuthState() {
  const token = localStorage.getItem('pharma_token');
  const raw = localStorage.getItem('pharma_auth');
  if (!token || !raw) return {};
  try {
    const { role, user } = JSON.parse(raw) as { role: UserRole; user: any };
    return {
      token,
      userRole: role,
      wholesaler: role === 'WHOLESALER' ? user : null,
      retailer: role === 'RETAILER' ? user : null,
      admin: role === 'ADMIN' ? user : null,
      mainWholesaler: role === 'MAIN_WHOLESALER' ? user : null,
      salesman: role === 'SALESMAN' ? user : null,
      isAuthenticated: true,
    };
  } catch {
    localStorage.removeItem('pharma_token');
    localStorage.removeItem('pharma_auth');
    return {};
  }
}
const initialAuth = getInitialAuthState();

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: initialAuth.token ?? null,
  userRole: (initialAuth.userRole as UserRole) ?? null,
  wholesaler: initialAuth.wholesaler ?? null,
  retailer: initialAuth.retailer ?? null,
  admin: initialAuth.admin ?? null,
  mainWholesaler: (initialAuth as any).mainWholesaler ?? null,
  salesman: (initialAuth as any).salesman ?? null,
  isAuthenticated: initialAuth.isAuthenticated ?? false,
  isLoading: false,
  authError: null,

  initFromStorage: () => {
    const token = localStorage.getItem('pharma_token');
    const raw = localStorage.getItem('pharma_auth');
    if (!token || !raw) return;
    try {
      const { role, user } = JSON.parse(raw) as { role: UserRole; user: any };
      set({
        token, userRole: role,
        wholesaler: role === 'WHOLESALER' ? user : null,
        retailer: role === 'RETAILER' ? user : null,
        admin: role === 'ADMIN' ? user : null,
        mainWholesaler: role === 'MAIN_WHOLESALER' ? user : null,
        salesman: role === 'SALESMAN' ? user : null,
        isAuthenticated: true,
      });
      if (role !== 'ADMIN') connectSocket(`${role.toLowerCase()}_${user.id}`);
    } catch {
      localStorage.removeItem('pharma_token');
      localStorage.removeItem('pharma_auth');
    }
  },

  login: async (identifier, password, role) => {
    set({ isLoading: true, authError: null });
    try {
      const payload = role === 'RETAILER'
        ? { phone: identifier, password, role }
        : { username: identifier, password, role };
      const { data } = await api.post('/auth/login', payload);
      localStorage.setItem('pharma_token', data.token);
      localStorage.setItem('pharma_auth', JSON.stringify({ role: data.role, user: data.user }));
      set({
        token: data.token,
        userRole: data.role as UserRole,
        wholesaler: data.role === 'WHOLESALER' ? data.user : null,
        retailer: data.role === 'RETAILER' ? data.user : null,
        admin: data.role === 'ADMIN' ? data.user : null,
        mainWholesaler: data.role === 'MAIN_WHOLESALER' ? data.user : null,
        salesman: data.role === 'SALESMAN' ? data.user : null,
        isAuthenticated: true,
        isLoading: false,
      });
      if (data.role !== 'ADMIN') connectSocket(`${(data.role as string).toLowerCase()}_${data.user.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed. Check your connection.';
      const error: any = new Error(msg);
      error.code = err.response?.data?.code;
      error.email = err.response?.data?.email;
      error.role = err.response?.data?.role;
      set({ isLoading: false, authError: msg });
      throw error;
    }
  },

  loginWholesaler: async (username, password) => { await get().login(username, password, 'WHOLESALER'); },
  loginRetailer: async (phone, password) => { await get().login(phone, password, 'RETAILER'); },
  loginMainWholesaler: async (username, password) => { await get().login(username, password, 'MAIN_WHOLESALER'); },
  loginSalesman: async (username, password) => { await get().login(username, password, 'SALESMAN'); },

  registerRetailer: async (formData) => {
    set({ isLoading: true, authError: null });
    try {
      const { data } = await api.post('/auth/retailer-register', formData);
      localStorage.setItem('pharma_token', data.token);
      localStorage.setItem('pharma_auth', JSON.stringify({ role: data.role, user: data.user }));
      set({
        token: data.token,
        userRole: 'RETAILER',
        wholesaler: null,
        retailer: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      connectSocket(`retailer_${data.user.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      set({ isLoading: false, authError: msg });
      throw new Error(msg);
    }
  },

  register: async (formData) => {
    set({ isLoading: true, authError: null });
    try {
      const { data } = await api.post('/auth/register', formData);
      set({ isLoading: false, authError: null });
      return {
        requires_email_verification: !!data.requires_email_verification,
        email: data.user?.email || formData.email,
      };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      set({ isLoading: false, authError: msg });
      throw new Error(msg);
    }
  },

  registerMainWholesaler: async (formData) => {
    set({ isLoading: true, authError: null });
    try {
      const { data } = await api.post('/auth/register/main-wholesaler', formData);
      set({ isLoading: false, authError: null });
      return {
        requires_email_verification: !!data.requires_email_verification,
        email: data.user?.email || formData.email,
      };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      set({ isLoading: false, authError: msg });
      throw new Error(msg);
    }
  },

  verifyEmail: async (token, role) => {
    set({ isLoading: true, authError: null });
    try {
      await api.post('/auth/verify-email', { token, role });
      set({ isLoading: false, authError: null });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Email verification failed. Please try again.';
      set({ isLoading: false, authError: msg });
      throw new Error(msg);
    }
  },

  resendVerificationEmail: async (email, role) => {
    set({ isLoading: true, authError: null });
    try {
      await api.post('/auth/resend-verification', { email, role });
      set({ isLoading: false, authError: null });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to resend verification email.';
      set({ isLoading: false, authError: msg });
      throw new Error(msg);
    }
  },

  salesmanRegister: async (formData) => {
    set({ isLoading: true, authError: null });
    try {
      const { data } = await api.post('/auth/salesman/register', formData);
      localStorage.setItem('pharma_token', data.token);
      localStorage.setItem('pharma_auth', JSON.stringify({ role: data.role, user: data.salesman }));
      set({
        token: data.token,
        userRole: 'SALESMAN',
        salesman: data.salesman,
        isAuthenticated: true,
        isLoading: false,
      });
      connectSocket(`salesman_${data.salesman.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      set({ isLoading: false, authError: msg });
      throw new Error(msg);
    }
  },

  logout: () => {
    const { wholesaler, retailer, mainWholesaler, userRole } = get();
    if (userRole === 'WHOLESALER' && wholesaler) disconnectSocket(`wholesaler_${wholesaler.id}`);
    if (userRole === 'RETAILER' && retailer) disconnectSocket(`retailer_${retailer.id}`);
    if (userRole === 'MAIN_WHOLESALER' && mainWholesaler) disconnectSocket(`main_wholesaler_${mainWholesaler.id}`);
    localStorage.removeItem('pharma_token');
    localStorage.removeItem('pharma_auth');
    set({ token: null, userRole: null, wholesaler: null, retailer: null, admin: null, mainWholesaler: null, salesman: null, isAuthenticated: false, authError: null });
  },

  updateWholesaler: async (data) => {
    const { data: updated } = await api.patch('/auth/wholesaler', data);
    localStorage.setItem('pharma_auth', JSON.stringify({ role: 'WHOLESALER', user: updated }));
    set((s) => ({ wholesaler: s.wholesaler ? { ...s.wholesaler, ...updated } : null }));
  },

  updateRetailerProfile: async (data) => {
    const { retailer } = get();
    if (!retailer) return;
    const { data: updated } = await api.patch(`/retailers/${retailer.id}/profile`, data);
    localStorage.setItem('pharma_auth', JSON.stringify({ role: 'RETAILER', user: updated }));
    set((s) => ({ retailer: s.retailer ? { ...s.retailer, ...updated } : null }));
  },

  loginAdmin: async (username, password) => {
    await get().login(username, password, 'ADMIN');
  },
}));
