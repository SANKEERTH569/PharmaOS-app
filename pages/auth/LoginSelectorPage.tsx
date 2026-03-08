import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Store, ArrowRight, Building, Warehouse } from 'lucide-react';

export const LoginSelectorPage = () => {
    const navigate = useNavigate();

    const roles = [
        {
            key: 'depot',
            label: 'Depot',
            desc: 'Large-scale distribution hub for regional supply',
            icon: Warehouse,
            gradient: 'from-violet-500 to-purple-600',
            shadow: 'shadow-violet-500/20',
            accent: 'text-violet-400',
            hoverBorder: 'hover:border-violet-500/30',
            hoverShadow: 'hover:shadow-violet-500/10',
            comingSoon: true,
        },
        {
            key: 'wholesaler',
            label: 'Wholesaler',
            desc: 'Manage large inventory & supply to sub-wholesalers',
            icon: Building,
            gradient: 'from-blue-500 to-cyan-600',
            shadow: 'shadow-blue-500/20',
            accent: 'text-blue-400',
            hoverBorder: 'hover:border-blue-500/30',
            hoverShadow: 'hover:shadow-blue-500/10',
            path: '/login/main-wholesaler',
        },
        {
            key: 'sub-wholesaler',
            label: 'Sub-Wholesaler',
            desc: 'Manage orders, inventory, retailers, payments & more',
            icon: Briefcase,
            gradient: 'from-indigo-500 to-blue-600',
            shadow: 'shadow-indigo-500/20',
            accent: 'text-indigo-400',
            hoverBorder: 'hover:border-indigo-500/30',
            hoverShadow: 'hover:shadow-indigo-500/10',
            path: '/login/wholesaler',
        },
        {
            key: 'retailer',
            label: 'Retailer',
            desc: 'Browse medicines, place orders & track deliveries',
            icon: Store,
            gradient: 'from-emerald-500 to-teal-600',
            shadow: 'shadow-emerald-500/20',
            accent: 'text-emerald-400',
            hoverBorder: 'hover:border-emerald-500/30',
            hoverShadow: 'hover:shadow-emerald-500/10',
            path: '/login/retailer',
        },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 40%, #0F172A 100%)' }}
        >
            {/* Decorative */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[15%] right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/[0.06] blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[5%] w-[35%] h-[35%] rounded-full bg-emerald-500/[0.05] blur-[100px]" />
                <div className="absolute top-[50%] left-[40%] w-[20%] h-[20%] rounded-full bg-violet-500/[0.04] blur-[80px]" />
            </div>

            <div className="relative z-10 text-center max-w-3xl w-full">
                {/* Brand */}
                <div className="flex items-center gap-3 justify-center mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <span className="text-white font-black text-2xl leading-none">P</span>
                    </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">PharmaOS</h1>
                <p className="text-slate-500 text-sm font-medium mb-10">Choose how you want to sign in</p>

                {/* Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {roles.map(({ key, label, desc, icon: Icon, gradient, shadow, accent, hoverBorder, hoverShadow, comingSoon, path }) => (
                        <button
                            key={key}
                            onClick={() => path ? navigate(path) : null}
                            disabled={comingSoon}
                            className={`group bg-white/[0.05] ${comingSoon ? 'opacity-60 cursor-not-allowed' : `hover:bg-white/[0.08] ${hoverBorder} hover:-translate-y-1 hover:shadow-xl ${hoverShadow}`} border border-white/[0.08] rounded-2xl p-5 sm:p-6 text-left transition-all duration-300 relative`}
                        >
                            {comingSoon && (
                                <span className="absolute top-3 right-3 text-[8px] font-black uppercase tracking-widest text-white/25 bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.06]">
                                    Soon
                                </span>
                            )}
                            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 ${shadow} shadow-md ${comingSoon ? '' : 'group-hover:scale-110'} transition-transform`}>
                                <Icon size={18} className="text-white" />
                            </div>
                            <h3 className="text-sm sm:text-base font-extrabold text-white mb-1 tracking-tight">{label}</h3>
                            <p className="text-white/30 text-[10px] sm:text-[11px] font-medium leading-relaxed mb-3">
                                {desc}
                            </p>
                            <span className={`inline-flex items-center gap-1.5 ${accent} text-[10px] sm:text-xs font-bold ${comingSoon ? 'opacity-40' : `group-hover:brightness-125`} transition-colors`}>
                                {comingSoon ? 'Coming soon' : <>Sign in <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" /></>}
                            </span>
                        </button>
                    ))}
                </div>

                <p className="text-slate-600 text-[10px] font-medium tracking-[0.2em] mt-10">
                    A product of <span className="text-indigo-400 font-bold">leeep dev</span>
                </p>
                <button
                    onClick={() => navigate('/login/admin')}
                    className="mt-3 text-[10px] text-slate-600 hover:text-rose-400 font-medium transition-colors"
                >
                    Admin Login →
                </button>
            </div>
        </div>
    );
};
