import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, ShoppingCart, ClipboardList, RotateCcw, User, Bell } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { cn } from '../utils/cn';

const navItems = [
  { path: '/shop', icon: Store, label: 'Shop' },
  { path: '/shop/orders', icon: ClipboardList, label: 'Orders' },
  { path: '/shop/cart', icon: ShoppingCart, label: 'Cart', isCart: true },
  { path: '/shop/returns', icon: RotateCcw, label: 'Returns' },
  { path: '/shop/profile', icon: User, label: 'Account' },
];

export const RetailerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const cartCount = useCartStore(s => s.items.reduce((a, i) => a + i.qty, 0));
  const { notifications } = useDataStore();
  const { retailer } = useAuthStore();
  const unreadCount = notifications.filter(n => n.retailer_id === retailer?.id && !n.is_read).length;

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between safe-area-top sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Store size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold text-slate-800">PharmaBridge</span>
        </div>
        <button onClick={() => navigate('/shop/notifications')} className="relative p-2 rounded-lg hover:bg-slate-50">
          <Bell size={18} className="text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Page Content */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          {children}
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 safe-area-bottom z-40">
        <div className="flex items-center justify-around py-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.path === '/shop' ? currentPath === '/shop' : currentPath.startsWith(item.path);
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={cn("flex flex-col items-center gap-0.5 px-3 py-1 relative", isActive ? "text-blue-600" : "text-slate-400")}>
                {item.isCart ? (
                  <div className="relative -mt-4 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                    <Icon size={20} className="text-white" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                    {isActive && <motion.div layoutId="mobile-tab" className="absolute -bottom-1.5 w-5 h-0.5 rounded-full bg-blue-600" />}
                  </>
                )}
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
