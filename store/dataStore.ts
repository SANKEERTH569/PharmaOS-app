
import { create } from 'zustand';
import api from '../utils/api';
import { getSocket } from '../utils/socket';
import { Order, Retailer, Medicine, LedgerEntry, Payment, PaymentMethod, OrderStatus, AppNotification, ReturnRequest, ReturnReason } from '../types';


interface DataState {
  retailers: Retailer[];
  medicines: Medicine[];
  orders: Order[];
  ledgerEntries: LedgerEntry[];
  payments: Payment[];
  notifications: AppNotification[];
  retailerLedgerSummary: { global_credit_limit: number, global_current_balance: number, agencies: any[] } | null;
  retailerLedgerHistory: Record<string, LedgerEntry[]>;
  returns: ReturnRequest[];
  isLoading: boolean;

  // Init
  initData: (id: string, role?: 'WHOLESALER' | 'RETAILER') => Promise<void>;

  // Fetchers
  fetchRetailers: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchMedicines: () => Promise<void>;
  fetchLedger: (retailerId?: string) => Promise<void>;
  fetchPayments: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchRetailerLedgerSummary: () => Promise<void>;
  fetchRetailerLedgerHistory: (wholesalerId: string) => Promise<void>;
  fetchReturns: () => Promise<void>;

  // Mutations
  updateOrderStatus: (orderId: string, status: OrderStatus, wholesalerId: string, paymentData?: { amount: number; method: PaymentMethod } | null) => Promise<void>;
  addRetailer: (retailer: Omit<Retailer, 'id' | 'current_balance' | 'is_active'>) => Promise<void>;
  updateRetailer: (id: string, updates: Partial<Retailer>) => Promise<void>;
  recordPayment: (retailerId: string, amount: number, method: PaymentMethod, wholesalerId: string, notes?: string) => Promise<void>;
  addMedicine: (medicine: Omit<Medicine, 'id'>) => Promise<void>;
  updateMedicine: (id: string, updates: Partial<Medicine>) => Promise<void>;
  toggleMedicineStatus: (id: string) => Promise<void>;
  placeOrder: (order: Omit<Order, 'id' | 'invoice_no' | 'created_at' | 'updated_at'>) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (wholesalerId: string) => Promise<void>;
  submitReturn: (data: { wholesaler_id: string; reason: ReturnReason; notes?: string; items: any[] }) => Promise<void>;
  updateReturnStatus: (returnId: string, status: 'APPROVED' | 'REJECTED', rejection_note?: string) => Promise<void>;

  // Getters
  getRetailer: (id: string) => Retailer | undefined;
  getWholesalerRetailerBalance: (retailerId: string, wholesalerId: string) => number;
}

export const useDataStore = create<DataState>()((set, get) => ({
  retailers: [],
  medicines: [],
  orders: [],
  ledgerEntries: [],
  payments: [],
  notifications: [],
  retailerLedgerSummary: null,
  retailerLedgerHistory: {},
  returns: [],
  isLoading: false,

  // ─── Init ──────────────────────────────────────────────────────────────
  initData: async (_id, role = 'WHOLESALER') => {
    set({ isLoading: true });
    try {
      if (role === 'RETAILER') {
        // Retailers only need their own orders — other endpoints require WHOLESALER role
        const [o, n] = await Promise.all([
          api.get('/orders'),
          api.get('/notifications').catch(() => ({ data: [] })),
        ]);
        set({ orders: o.data, notifications: n.data, isLoading: false });
      } else {
        // Wholesaler — fetch all relevant data
        const [r, m, o, l, p, n] = await Promise.all([
          api.get('/retailers'),
          api.get('/medicines'),
          api.get('/orders'),
          api.get('/ledger'),
          api.get('/payments'),
          api.get('/notifications'),
        ]);
        set({
          retailers: r.data,
          medicines: m.data,
          orders: o.data,
          ledgerEntries: l.data,
          payments: p.data,
          notifications: n.data,
          isLoading: false,
        });
      }
    } catch (e) {
      console.error('initData failed', e);
      set({ isLoading: false });
    }

    // Socket.io realtime listeners
    const socket = getSocket();
    if (!socket) return;

    socket.off('new_order').on('new_order', (order: Order) => {
      set((s) => ({ orders: [order, ...s.orders] }));
    });

    socket.off('order_updated').on('order_updated', (updated: Order) => {
      set((s) => ({ orders: s.orders.map(o => o.id === updated.id ? updated : o) }));
    });

    socket.off('payment_received').on('payment_received', (payment: Payment) => {
      set((s) => ({
        payments: [payment, ...s.payments],
        retailers: s.retailers.map(r =>
          r.id === payment.retailer_id ? { ...r, current_balance: Math.max(0, r.current_balance - payment.amount) } : r
        ),
      }));
    });

    socket.off('notification').on('notification', (notif: AppNotification) => {
      set((s) => ({ notifications: [notif, ...s.notifications] }));
    });
  },

  // ─── Fetchers ──────────────────────────────────────────────────────────
  fetchRetailers: async () => { const { data } = await api.get('/retailers'); set({ retailers: data }); },
  fetchOrders: async () => { const { data } = await api.get('/orders'); set({ orders: data }); },
  fetchMedicines: async () => { const { data } = await api.get('/medicines'); set({ medicines: data }); },
  fetchLedger: async (retailerId) => {
    const url = retailerId ? `/ledger?retailer_id=${retailerId}` : '/ledger';
    const { data } = await api.get(url);
    set({ ledgerEntries: data });
  },
  fetchPayments: async () => { const { data } = await api.get('/payments'); set({ payments: data }); },
  fetchNotifications: async () => { const { data } = await api.get('/notifications'); set({ notifications: data }); },
  fetchRetailerLedgerSummary: async () => {
    const { data } = await api.get('/retailer/ledger/summary');
    set({ retailerLedgerSummary: data });
  },
  fetchRetailerLedgerHistory: async (wholesalerId) => {
    const { data } = await api.get(`/retailer/ledger/history/${wholesalerId}`);
    set((s) => ({ retailerLedgerHistory: { ...s.retailerLedgerHistory, [wholesalerId]: data } }));
  },
  fetchReturns: async () => {
    const { data } = await api.get('/returns');
    set({ returns: data });
  },

  // ─── Mutations ─────────────────────────────────────────────────────────
  updateOrderStatus: async (orderId, status, _wholesalerId, paymentData) => {
    const body: any = { status };
    if (paymentData) body.paymentData = paymentData;
    const { data: updated } = await api.patch(`/orders/${orderId}/status`, body);
    set((s) => ({ orders: s.orders.map(o => o.id === orderId ? updated : o) }));
    // Refresh medicines stock after ACCEPTED (stock deducted) or REJECTED (stock restored)
    if (status === 'ACCEPTED' || status === 'REJECTED') {
      get().fetchMedicines();
    }
    // Refresh ledger & payments after delivery
    if (status === 'DELIVERED') {
      get().fetchMedicines();
      get().fetchLedger();
      get().fetchPayments();
      get().fetchRetailers();
      get().fetchNotifications();
    }
  },

  addRetailer: async (data) => {
    const { data: created } = await api.post('/retailers', data);
    set((s) => ({ retailers: [created, ...s.retailers] }));
  },

  updateRetailer: async (id, updates) => {
    const { data: updated } = await api.patch(`/retailers/${id}`, updates);
    set((s) => ({ retailers: s.retailers.map(r => r.id === id ? updated : r) }));
  },

  recordPayment: async (retailerId, amount, method, _wholesalerId, notes) => {
    const { data } = await api.post('/payments/cash', { retailer_id: retailerId, amount, method, notes });
    set((s) => ({
      payments: [data.payment, ...s.payments],
      ledgerEntries: [data.ledgerEntry, ...s.ledgerEntries],
      retailers: s.retailers.map(r =>
        r.id === retailerId ? { ...r, current_balance: Math.max(0, r.current_balance - amount), last_payment_date: new Date().toISOString() } : r
      ),
    }));
  },

  addMedicine: async (data) => {
    const { data: created } = await api.post('/medicines', data);
    set((s) => ({ medicines: [created, ...s.medicines] }));
  },

  updateMedicine: async (id, updates) => {
    const { data: updated } = await api.patch(`/medicines/${id}`, updates);
    set((s) => ({ medicines: s.medicines.map(m => m.id === id ? updated : m) }));
  },

  toggleMedicineStatus: async (id) => {
    const { data: updated } = await api.patch(`/medicines/${id}/toggle`);
    set((s) => ({ medicines: s.medicines.map(m => m.id === id ? updated : m) }));
  },

  placeOrder: async (order) => {
    const { data: created } = await api.post('/orders', order);
    set((s) => ({ orders: [created, ...s.orders] }));
  },

  cancelOrder: async (orderId) => {
    const { data: updated } = await api.post(`/orders/${orderId}/cancel`);
    set((s) => ({ orders: s.orders.map(o => o.id === orderId ? updated : o) }));
  },

  markNotificationRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);
    set((s) => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, is_read: true } : n) }));
  },

  markAllNotificationsRead: async (_wholesalerId) => {
    await api.patch('/notifications/read-all');
    set((s) => ({ notifications: s.notifications.map(n => ({ ...n, is_read: true })) }));
  },

  submitReturn: async (returnData) => {
    const { data: created } = await api.post('/returns', returnData);
    set((s) => ({ returns: [created, ...s.returns] }));
  },

  updateReturnStatus: async (returnId, status, rejection_note) => {
    const { data: updated } = await api.patch(`/returns/${returnId}/status`, { status, rejection_note });
    set((s) => ({ returns: s.returns.map(r => r.id === returnId ? updated : r) }));
    // Refresh ledger & retailers after approval
    if (status === 'APPROVED') {
      get().fetchLedger();
      get().fetchRetailers();
    }
  },

  // ─── Getters ───────────────────────────────────────────────────────────
  getRetailer: (id) => get().retailers.find(r => r.id === id),

  getWholesalerRetailerBalance: (retailerId, _wholesalerId) => {
    const retailer = get().retailers.find(r => r.id === retailerId);
    return retailer?.current_balance ?? 0;
  },
}));
