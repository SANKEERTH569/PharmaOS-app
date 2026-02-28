
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Store,
  ShoppingCart,
  History,
  LogOut,
  User,
  Wallet,
  RotateCcw,
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
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* ══ Desktop Sidebar ══ */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[240px] z-40 bg-gradient-to-b from-[#042F2E] via-[#064E3B] to-[#042F2E] shadow-xl shrink-0">

        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-20 border-b border-white/[0.06] shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Store size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[18px] font-extrabold text-white leading-none tracking-tight">Shop Connect</p>
            <p className="text-[10px] text-emerald-400/80 font-semibold mt-1 tracking-widest uppercase">Retail Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-hide">
          <Link
            to="/shop"
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav",
              location.pathname === '/shop' ? "bg-white/[0.08] text-white shadow-inner" : "text-emerald-100/60 hover:text-white hover:bg-white/[0.04]")}
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
              location.pathname === '/shop' ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20" : "bg-white/[0.05] group-hover/nav:bg-white/[0.08]")}>
              <Store size={16} strokeWidth={location.pathname === '/shop' ? 2.2 : 1.8} />
            </div>
            <span className={cn(location.pathname === '/shop' && "font-semibold")}>Marketplace</span>
          </Link>

          <Link
            to="/shop/cart"
            className={cn("flex items-center justify-between px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav",
              location.pathname === '/shop/cart' ? "bg-white/[0.08] text-white shadow-inner" : "text-emerald-100/60 hover:text-white hover:bg-white/[0.04]")}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                location.pathname === '/shop/cart' ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20" : "bg-white/[0.05] group-hover/nav:bg-white/[0.08]")}>
                <ShoppingCart size={16} strokeWidth={location.pathname === '/shop/cart' ? 2.2 : 1.8} />
              </div>
              <span className={cn(location.pathname === '/shop/cart' && "font-semibold")}>Cart</span>
            </div>
            {items.length > 0 && (
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center leading-tight shadow-sm",
                location.pathname === '/shop/cart' ? "bg-white/20 text-white" : "bg-emerald-500/30 text-emerald-300")}>
                {items.length}
              </span>
            )}
          </Link>

          <Link
            to="/shop/orders"
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav",
              location.pathname === '/shop/orders' ? "bg-white/[0.08] text-white shadow-inner" : "text-emerald-100/60 hover:text-white hover:bg-white/[0.04]")}
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
              location.pathname === '/shop/orders' ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20" : "bg-white/[0.05] group-hover/nav:bg-white/[0.08]")}>
              <History size={16} strokeWidth={location.pathname === '/shop/orders' ? 2.2 : 1.8} />
            </div>
            <span className={cn(location.pathname === '/shop/orders' && "font-semibold")}>My Orders</span>
          </Link>

          <Link
            to="/shop/returns"
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav",
              location.pathname === '/shop/returns' ? "bg-white/[0.08] text-white shadow-inner" : "text-emerald-100/60 hover:text-white hover:bg-white/[0.04]")}
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
              location.pathname === '/shop/returns' ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20" : "bg-white/[0.05] group-hover/nav:bg-white/[0.08]")}>
              <RotateCcw size={16} strokeWidth={location.pathname === '/shop/returns' ? 2.2 : 1.8} />
            </div>
            <span className={cn(location.pathname === '/shop/returns' && "font-semibold")}>Returns</span>
          </Link>

          <Link
            to="/shop/ledger"
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav",
              location.pathname === '/shop/ledger' ? "bg-white/[0.08] text-white shadow-inner" : "text-emerald-100/60 hover:text-white hover:bg-white/[0.04]")}
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
              location.pathname === '/shop/ledger' ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20" : "bg-white/[0.05] group-hover/nav:bg-white/[0.08]")}>
              <Wallet size={16} strokeWidth={location.pathname === '/shop/ledger' ? 2.2 : 1.8} />
            </div>
            <span className={cn(location.pathname === '/shop/ledger' && "font-semibold")}>Accounts</span>
          </Link>

          <Link
            to="/shop/profile"
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav",
              location.pathname === '/shop/profile' ? "bg-white/[0.08] text-white shadow-inner" : "text-emerald-100/60 hover:text-white hover:bg-white/[0.04]")}
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
              location.pathname === '/shop/profile' ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20" : "bg-white/[0.05] group-hover/nav:bg-white/[0.08]")}>
              <User size={16} strokeWidth={location.pathname === '/shop/profile' ? 2.2 : 1.8} />
            </div>
            <span className={cn(location.pathname === '/shop/profile' && "font-semibold")}>Profile</span>
          </Link>
        </nav>

        {/* User Card bottom */}
        <div className="p-4 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 bg-white/[0.04] rounded-xl border border-white/[0.06]">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
              {retailer?.shop_name?.charAt(0).toUpperCase() || 'R'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-white truncate leading-tight">{retailer?.shop_name}</p>
              <p className="text-[10px] text-emerald-100/60 truncate mt-0.5">{retailer?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold tracking-wide text-emerald-100/50 hover:text-emerald-300 hover:bg-white/[0.04] rounded-lg transition-all duration-200"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ══ Main Column ══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-[240px]">

        {/* Mobile Top Header (only visible on mobile) */}
        <header className="lg:hidden bg-gradient-to-r from-[#042F2E] via-[#064E3B] to-[#0D9488] h-16 shrink-0 z-30 flex items-center justify-between px-4 sticky top-0 shadow-lg shadow-emerald-900/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Store size={18} className="text-emerald-100" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white leading-none">Shop Connect</h1>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-emerald-100/70 hover:text-white rounded-xl transition-all"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Desktop Top Header (glassmorphic, matches Wholesaler) */}
        <header className="hidden lg:flex h-20 shrink-0 items-center justify-between px-8 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 sticky top-0 z-30">
          <div>
            <h1 className="text-[15px] font-extrabold text-slate-800 tracking-tight">Retailer Dashboard</h1>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Welcome back, {retailer?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 mr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold tracking-wide">Live Updates</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth pb-24 lg:pb-0 bg-[linear-gradient(110deg,#F8FAFC,45%,#F1F5F9,55%,#F8FAFC)] bg-[length:200%_100%] animate-[gradient-shift_12s_ease-in-out_infinite]">
          <div className="max-w-6xl mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 pb-safe z-50 px-6 py-2 flex justify-between items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.08)] lg:hidden">
          <NavItem icon={Store} label="Market" path="/shop" active={location.pathname === '/shop'} />
          <NavItem icon={ShoppingCart} label="Cart" path="/shop/cart" active={location.pathname === '/shop/cart'} badge={items.length > 0 ? items.length : undefined} />
          <NavItem icon={History} label="Orders" path="/shop/orders" active={location.pathname === '/shop/orders'} />
          <NavItem icon={RotateCcw} label="Returns" path="/shop/returns" active={location.pathname === '/shop/returns'} />
          <NavItem icon={Wallet} label="Accounts" path="/shop/ledger" active={location.pathname === '/shop/ledger'} />
        </nav>
      </div>
    </div>
  );
};

