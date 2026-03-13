
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, Briefcase, ShoppingCart, TrendingUp,
    CreditCard, Activity, LogOut, Menu, X, Shield, Ticket, ShieldAlert, Wallet, Users2, PackageSearch, FileCheck2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '../utils/cn';

const navGroups = [
    {
        label: 'Overview',
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        ],
    },
    {
        label: 'Management',
        items: [
            { icon: Briefcase, label: 'Wholesalers', path: '/admin/wholesalers' },
            { icon: Users, label: 'Retailers', path: '/admin/retailers' },
        ],
    },
    {
        label: 'Finance',
        items: [
            { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
            { icon: TrendingUp, label: 'Revenue', path: '/admin/revenue' },
        ],
    },
    {
        label: 'System',
        items: [
            { icon: CreditCard, label: 'Plans & Billing', path: '/admin/plans' },
            { icon: Ticket, label: 'Coupons', path: '/admin/coupons' },
            { icon: Activity, label: 'Activity Log', path: '/admin/activity' },
        ],
    },
    {
        label: 'Control Center',
        items: [
            { icon: ShieldAlert, label: 'Issues', path: '/admin/issues' },
            { icon: Wallet, label: 'Collections', path: '/admin/collections' },
            { icon: Users2, label: 'Salesforce', path: '/admin/salesforce' },
            { icon: PackageSearch, label: 'Inventory', path: '/admin/inventory' },
            { icon: FileCheck2, label: 'Compliance', path: '/admin/compliance' },
        ],
    },
];

const PAGE_TITLES: Record<string, string> = {
    '/admin': 'Platform Dashboard',
    '/admin/wholesalers': 'Wholesaler Management',
    '/admin/retailers': 'Retailer Management',
    '/admin/orders': 'All Orders',
    '/admin/revenue': 'Revenue Analytics',
    '/admin/plans': 'Plans & Billing',
    '/admin/coupons': 'Coupons & Plan Requests',
    '/admin/activity': 'Activity Log',
    '/admin/issues': 'Issues Control Center',
    '/admin/collections': 'Collections Control',
    '/admin/salesforce': 'Salesforce Control',
    '/admin/inventory': 'Inventory Control',
    '/admin/compliance': 'Compliance Control',
};

export const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
    const { logout, admin } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = React.useState(false);

    const pageTitle = PAGE_TITLES[location.pathname] || 'Admin';
    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className="flex h-screen">

            {/* Mobile overlay */}
            {menuOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" onClick={() => setMenuOpen(false)} />
            )}

            {/* ═══ SIDEBAR ═══ */}
            <aside className={cn(
                'fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-[260px] shrink-0 transition-transform duration-300',
                'bg-gradient-to-b from-[#0D0D1A] via-[#12122B] to-[#1A1A3E]',
                menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            )}>

                {/* Brand */}
                <div className="flex items-center justify-between px-5 h-[72px] border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                            <Shield size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[18px] font-extrabold text-white leading-none tracking-tight">PharmaOS</p>
                            <p className="text-[10px] text-rose-400/70 font-semibold mt-0.5 tracking-wider uppercase">Admin Console</p>
                        </div>
                    </div>
                    <button onClick={() => setMenuOpen(false)} className="lg:hidden p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-hide">
                    {navGroups.map(group => (
                        <div key={group.label}>
                            <p className="px-3 mb-2 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {group.items.map(({ icon: Icon, label, path }) => {
                                    const active = location.pathname === path;
                                    return (
                                        <Link
                                            key={path}
                                            to={path}
                                            onClick={() => setMenuOpen(false)}
                                            className={cn(
                                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group/nav',
                                                active
                                                    ? 'bg-white/[0.08] text-white'
                                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                            )}
                                        >
                                            <div className={cn(
                                                'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                                                active
                                                    ? 'bg-gradient-to-br from-rose-500 to-orange-600 shadow-md shadow-rose-500/20'
                                                    : 'bg-white/[0.05] group-hover/nav:bg-white/[0.08]'
                                            )}>
                                                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                                            </div>
                                            <span className={cn(active && 'font-semibold')}>{label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User / logout */}
                <div className="p-3 border-t border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                            {admin?.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate leading-tight">{admin?.name || 'Admin'}</p>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">Platform Administrator</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-white/[0.04] rounded-lg transition-all duration-200"
                    >
                        <LogOut size={13} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ═══ MAIN ═══ */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Top bar */}
                <header className="h-16 shrink-0 flex items-center justify-between px-5 lg:px-7 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setMenuOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                            <Menu size={19} />
                        </button>
                        <div className="flex items-center gap-2">
                            <h1 className="text-[15px] font-bold text-slate-800 tracking-tight">{pageTitle}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full border border-rose-100">
                            <Shield size={11} />
                            <span className="text-[10px] font-bold tracking-wide">Admin Mode</span>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto p-5 lg:p-7">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
