
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Store, ShoppingCart, ClipboardList, RotateCcw, Wallet,
  User, LogOut, Bell, CreditCard, Building2, Pill, Search, AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useDataStore } from '../store/dataStore';
import { cn } from '../utils/cn';

interface SideNavItem { icon: any; label: string; path: string; badge?: number; group: string; }

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const SidebarItem: React.FC<{ item: SideNavItem; active: boolean }> = ({ item, active }) => (
  <Link to={item.path} className="block">
      <motion.div whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
      className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative",
        active ? "text-primary shadow-sm" : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900")}
      style={active ? { background: 'linear-gradient(90deg, #EEF2FF 0%, #F8FAFC 100%)', border: '1px solid rgba(79,70,229,0.18)' } : {}}>
      {active && <motion.div layoutId="sidebar-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full" style={{ background: 'linear-gradient(180deg, #4F46E5, #3730A3)' }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200", active ? "text-white shadow-md" : "bg-slate-100 text-slate-500")}
        style={active ? { background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)', boxShadow: '0 4px 10px rgba(79,70,229,0.30)' } : {}}>
        <item.icon size={16} strokeWidth={active ? 2.2 : 1.8} />
      </div>
      <span className={cn(active && "font-semibold")}>{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
          style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)', boxShadow: '0 2px 6px rgba(249,115,22,0.35)' }}>
          {item.badge}
        </motion.span>
      ) : null}
    </motion.div>
  </Link>
);

const BottomTab: React.FC<{ icon: any; label: string; path: string; active: boolean; badge?: number; isCenter?: boolean }> = ({ icon: Icon, label, path, active, badge, isCenter }) => (
  <Link to={path} className={cn("flex flex-col items-center justify-center relative transition-all duration-200", isCenter ? "w-16" : "flex-1", active ? "text-teal-600" : "text-slate-400")}>
    {isCenter ? (
      <motion.div whileTap={{ scale: 0.9 }} className={cn("w-13 h-13 -mt-5 rounded-2xl flex items-center justify-center shadow-lg relative", active ? "text-white" : "bg-white text-slate-600 shadow-slate-200/60 border border-slate-100")}
        style={active ? { background: 'linear-gradient(135deg, #14B8A6, #059669)', boxShadow: '0 8px 20px rgba(20,184,166,0.40)' } : {}}>
        <Icon size={22} strokeWidth={2} />
        {badge && badge > 0 ? (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1.5 -right-1.5 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)' }}>
            {badge > 9 ? '9+' : badge}
          </motion.span>
        ) : null}
      </motion.div>
    ) : (
      <div className="relative p-1">
        <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
        {badge && badge > 0 ? <span className="absolute -top-0.5 -right-1 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#F97316' }}>{badge > 9 ? '9+' : badge}</span> : null}
      </div>
    )}
    <span className={cn("text-[10px] mt-0.5 font-medium", active ? "text-teal-600 font-semibold" : "text-slate-400", isCenter && "mt-1")}>{label}</span>
    {active && !isCenter && <motion.div layoutId="bottom-tab-indicator" className="absolute -bottom-1 w-5 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg, #14B8A6, #059669)' }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
  </Link>
);

export const RetailerLayout = ({ children }: { children?: React.ReactNode }) => {
  const { logout, retailer } = useAuthStore();
  const { items } = useCartStore();
  const { notifications } = useDataStore();
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const cartCount = items.length;

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems: SideNavItem[] = [
    { icon: Store, label: 'Marketplace', path: '/shop', group: 'Shopping' },
    { icon: ShoppingCart, label: 'Cart', path: '/shop/cart', badge: cartCount, group: 'Shopping' },
    { icon: ClipboardList, label: 'My Orders', path: '/shop/orders', group: 'Orders' },
    { icon: RotateCcw, label: 'Returns', path: '/shop/returns', group: 'Orders' },
    { icon: Wallet, label: 'Accounts', path: '/shop/ledger', group: 'Account' },
    { icon: CreditCard, label: 'Payments', path: '/shop/payments', group: 'Account' },
    { icon: Building2, label: 'Agencies', path: '/shop/setup-agencies', group: 'Account' },
    { icon: User, label: 'Profile', path: '/shop/profile', group: 'Account' },
  ];

  const grouped = navItems.reduce<Record<string, SideNavItem[]>>((acc, item) => { (acc[item.group] = acc[item.group] || []).push(item); return acc; }, {});

  return (
    <div className="flex h-screen" style={{ background: 'linear-gradient(150deg, #F0FDFB 0%, #FFFFFF 50%, #F0FDF4 100%)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[260px] z-40 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shrink-0">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-teal-100/60 shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #059669 100%)', boxShadow: '0 4px 12px rgba(20,184,166,0.30)' }}
          >
            <Pill size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-900 leading-none tracking-tight">Pharma Head</p>
            <p className="text-[10px] font-semibold mt-0.5 tracking-wide uppercase" style={{ color: '#4F46E5' }}>Retail Portal</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
          {Object.entries(grouped).map(([group, groupItems]) => (
            <div key={group} className="mb-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-3 mb-2">{group}</p>
              <div className="space-y-1">{groupItems.map(item => <SidebarItem key={item.path} item={item} active={location.pathname === item.path} />)}</div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100/60 shrink-0">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl border" style={{ background: 'linear-gradient(90deg, #F0FDFB 0%, #ECFDF5 100%)', borderColor: 'rgba(20,184,166,0.15)' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #059669 100%)', boxShadow: '0 4px 10px rgba(20,184,166,0.28)' }}
            >
              {retailer?.shop_name?.charAt(0).toUpperCase() || 'R'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight">{retailer?.shop_name}</p>
              <p className="text-[11px] text-slate-400 truncate">{retailer?.name}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all duration-200" title="Sign Out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-[260px]">
      {/* Drug License Warning Banner */}
      {retailer && !retailer.drug_license_number && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 z-40">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={15} className="shrink-0 text-amber-500" />
            <span className="text-xs font-semibold">Drug License Number is required to place orders. Please update your profile.</span>
          </div>
          <button onClick={() => navigate('/shop/profile')} className="shrink-0 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded-lg transition-all">
            Update Now →
          </button>
        </div>
      )}

      {/* Desktop Header */}
        <header className="hidden lg:flex h-16 shrink-0 items-center justify-between px-8 bg-white/80 backdrop-blur-xl border-b border-slate-100/60 sticky top-0 z-30">
          <div>
            <h1 className="text-sm font-bold text-slate-800">{navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}</h1>
            <p className="text-[10px] text-slate-400">{getGreeting()}, {retailer?.name?.split(' ')[0] || 'there'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/shop/notifications')} className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200 group">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white" />
                </span>
              )}
            </button>
            <div className="w-px h-6 bg-slate-200/80 mx-1" />
            <button onClick={() => navigate('/shop/profile')} className="flex items-center gap-2.5 hover:bg-slate-50 pl-2 pr-3 py-1.5 rounded-xl transition-all duration-200">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #059669 100%)', boxShadow: '0 3px 8px rgba(20,184,166,0.28)' }}>{retailer?.shop_name?.charAt(0).toUpperCase() || 'R'}</div>
              <div className="text-right"><p className="text-xs font-semibold text-slate-700">{retailer?.shop_name}</p><p className="text-[10px] text-slate-400">{retailer?.name}</p></div>
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden bg-white/90 backdrop-blur-xl h-14 shrink-0 z-30 flex items-center justify-between px-4 sticky top-0 border-b border-slate-100/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14B8A6 0%, #059669 100%)', boxShadow: '0 4px 10px rgba(20,184,166,0.28)' }}
            ><Pill size={16} className="text-white" /></div>
            <div>
              <span className="text-[14px] font-bold text-slate-900 tracking-tight block leading-tight">Pharma Head</span>
              <span className="text-[9px] font-semibold tracking-wide uppercase" style={{ color: '#4F46E5' }}>{getGreeting()}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate('/shop/notifications')} className="relative p-2 text-slate-500 hover:text-slate-700 rounded-xl transition-colors">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white" />
                </span>
              )}
            </button>
            <button onClick={() => navigate('/shop/profile')} className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #14B8A6, #059669)', boxShadow: '0 3px 8px rgba(20,184,166,0.28)' }}>{retailer?.shop_name?.charAt(0).toUpperCase() || 'R'}</button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth pb-24 lg:pb-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="max-w-6xl mx-auto p-4 lg:p-6">
            {children}
          </motion.div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100/60 z-50 flex items-end justify-around px-2 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden shadow-[0_-8px_30px_-8px_rgba(0,0,0,0.08)]">
          <BottomTab icon={Store} label="Shop" path="/shop" active={location.pathname === '/shop'} />
          <BottomTab icon={ClipboardList} label="Orders" path="/shop/orders" active={location.pathname === '/shop/orders'} />
          <BottomTab icon={ShoppingCart} label="Cart" path="/shop/cart" active={location.pathname === '/shop/cart'} badge={cartCount} isCenter />
          <BottomTab icon={Wallet} label="Accounts" path="/shop/ledger" active={location.pathname === '/shop/ledger'} />
          <BottomTab icon={User} label="Profile" path="/shop/profile" active={location.pathname === '/shop/profile'} />
        </nav>
      </div>
    </div>
  );
};
