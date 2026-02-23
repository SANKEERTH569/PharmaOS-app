
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Store,
  ShoppingCart,
  History,
  LogOut,
  User,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { cn } from '../utils/cn';

const NavItem: React.FC<{ icon: any, label: string, path: string, active: boolean, badge?: number }> = ({ icon: Icon, label, path, active, badge }) => (
  <Link
    to={path}
    className={cn(
      "flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 active:scale-95",
      active
        ? "text-emerald-600"
        : "text-slate-400 hover:text-slate-600"
    )}
  >
    <div className="relative p-1">
      <Icon size={22} className={cn(active && "fill-emerald-100 stroke-emerald-600")} strokeWidth={active ? 2.5 : 1.8} />
      {badge ? (
        <span className="absolute -top-1 -right-1.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white shadow-sm">
          {badge}
        </span>
      ) : null}
    </div>
    <span className={cn("text-[10px] font-bold mt-1 tracking-wide", active ? "text-emerald-700" : "text-slate-500")}>{label}</span>
  </Link>
);

export const RetailerLayout = ({ children }: { children?: React.ReactNode }) => {
  const { logout, retailer } = useAuthStore();
  const { items } = useCartStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      {/* Retailer Top Header */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 h-16 shrink-0 z-30 flex items-center justify-between px-4 lg:px-8 sticky top-0 shadow-lg shadow-emerald-900/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white border border-white/10">
            <Store size={20} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white leading-none">Shop Connect</h1>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mt-0.5">{retailer?.shop_name || 'Retail Portal'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-white">{retailer?.shop_name}</p>
            <p className="text-[10px] text-white/60 font-medium">{retailer?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth pb-24 lg:pb-0">
        <div className="max-w-5xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 pb-safe z-50 px-6 py-2 flex justify-between items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.08)] lg:hidden">
        <NavItem icon={Store} label="Market" path="/shop" active={location.pathname === '/shop'} />
        <NavItem icon={ShoppingCart} label="Cart" path="/shop/cart" active={location.pathname === '/shop/cart'} badge={items.length > 0 ? items.length : undefined} />
        <NavItem icon={History} label="Orders" path="/shop/orders" active={location.pathname === '/shop/orders'} />
        <NavItem icon={User} label="Profile" path="/shop/profile" active={location.pathname === '/shop/profile'} />
      </nav>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col fixed left-0 top-16 bottom-0 w-20 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 items-center py-8 gap-5 z-20">
        <Link
          to="/shop"
          className={cn("p-3.5 rounded-2xl transition-all duration-200 hover:scale-105", location.pathname === '/shop' ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50")}
          title="Marketplace"
        >
          <Store size={22} />
        </Link>
        <div className="relative">
          <Link
            to="/shop/cart"
            className={cn("p-3.5 rounded-2xl transition-all duration-200 block hover:scale-105", location.pathname === '/shop/cart' ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50")}
            title="Cart"
          >
            <ShoppingCart size={22} />
          </Link>
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white shadow-sm">
              {items.length}
            </span>
          )}
        </div>
        <Link
          to="/shop/orders"
          className={cn("p-3.5 rounded-2xl transition-all duration-200 hover:scale-105", location.pathname === '/shop/orders' ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50")}
          title="My Orders"
        >
          <History size={22} />
        </Link>
        <Link
          to="/shop/profile"
          className={cn("p-3.5 rounded-2xl transition-all duration-200 hover:scale-105", location.pathname === '/shop/profile' ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50")}
          title="My Profile"
        >
          <User size={22} />
        </Link>
      </div>
    </div>
  );
};
