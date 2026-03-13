import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Package, CreditCard, AlertTriangle, Truck, CheckCircle2,
  Building2, Check, ChevronRight,
} from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';
import { NotificationType } from '../../types';

const notifConfig: Record<string, { icon: any; color: string; bg: string }> = {
  NEW_ORDER: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
  ORDER_STATUS: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ORDER_STATUS_CHANGED: { icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ORDER_DELIVERED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  PAYMENT_RECEIVED: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
  CREDIT_LIMIT_ALERT: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  OVERDUE_REMINDER: { icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
  AGENCY_ACCEPTED: { icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  AGENCY_REJECTED: { icon: Building2, color: 'text-rose-600', bg: 'bg-rose-50' },
};

export const NotificationsPage: React.FC = () => {
  const { notifications, fetchNotifications, markNotificationRead, markAllNotificationsRead } = useDataStore();
  const { retailer } = useAuthStore();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  useEffect(() => { fetchNotifications(); }, []);

  const myNotifications = notifications.filter(n => n.retailer_id === retailer?.id);
  const unreadCount = myNotifications.filter(n => !n.is_read).length;
  const filtered = filter === 'ALL' ? myNotifications : myNotifications.filter(n => !n.is_read);

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Notifications</h1>
          <p className="text-xs text-slate-500">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
        {unreadCount > 0 && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => markAllNotificationsRead('')}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all">
            <Check size={14} /> Mark all read
          </motion.button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['ALL', 'UNREAD'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("text-[10px] font-bold px-3.5 py-1.5 rounded-lg border whitespace-nowrap transition-all",
              filter === f ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")}>
            {f === 'ALL' ? `All (${myNotifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-14 bg-white rounded-2xl border border-slate-100/80 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Bell size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No notifications</p>
            <p className="text-xs text-slate-400 mt-1">You'll be notified about order updates here</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filtered.map((notif, idx) => {
              const cfg = notifConfig[notif.type] || notifConfig.NEW_ORDER;
              const Icon = cfg.icon;
              return (
                <motion.div key={notif.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                  onClick={() => !notif.is_read && markNotificationRead(notif.id)}
                  className={cn("flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer",
                    notif.is_read ? "bg-white border-slate-100/80 hover:bg-slate-50 shadow-sm" : "bg-blue-50/40 border-blue-100/80 hover:bg-blue-50/60 shadow-sm shadow-blue-100/30")}>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border", cfg.bg, cfg.bg.replace('bg-', 'border-').replace('50', '100/50'))}>
                    <Icon size={16} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm", notif.is_read ? "text-slate-700" : "font-bold text-slate-800")}>{notif.title}</p>
                      {!notif.is_read && <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1.5 ring-2 ring-blue-200" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{getTimeAgo(notif.created_at)}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
