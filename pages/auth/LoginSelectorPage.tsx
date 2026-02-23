import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Store, ArrowRight } from 'lucide-react';

export const LoginSelectorPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1E1B4B 40%, #0F172A 100%)' }}
        >
            {/* Decorative */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[15%] right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/[0.06] blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[5%] w-[35%] h-[35%] rounded-full bg-emerald-500/[0.05] blur-[100px]" />
            </div>

            <div className="relative z-10 text-center max-w-xl w-full">
                {/* Brand */}
                <div className="flex items-center gap-3 justify-center mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <span className="text-white font-black text-2xl leading-none">P</span>
                    </div>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">PharmaOS</h1>
                <p className="text-slate-500 text-sm font-medium mb-10">Choose how you want to sign in</p>

                {/* Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Wholesaler */}
                    <button
                        onClick={() => navigate('/login/wholesaler')}
                        className="group bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] hover:border-indigo-500/30 rounded-2xl p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-5 shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                            <Briefcase size={20} className="text-white" />
                        </div>
                        <h3 className="text-lg font-extrabold text-white mb-1.5 tracking-tight">Wholesaler</h3>
                        <p className="text-white/35 text-xs font-medium leading-relaxed mb-4">
                            Manage orders, inventory, retailers, payments & more
                        </p>
                        <span className="inline-flex items-center gap-2 text-indigo-400 text-xs font-bold group-hover:text-indigo-300 transition-colors">
                            Sign in as wholesaler <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>

                    {/* Retailer */}
                    <button
                        onClick={() => navigate('/login/retailer')}
                        className="group bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] hover:border-emerald-500/30 rounded-2xl p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10"
                    >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5 shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                            <Store size={20} className="text-white" />
                        </div>
                        <h3 className="text-lg font-extrabold text-white mb-1.5 tracking-tight">Retailer</h3>
                        <p className="text-white/35 text-xs font-medium leading-relaxed mb-4">
                            Browse medicines, place orders & track deliveries
                        </p>
                        <span className="inline-flex items-center gap-2 text-emerald-400 text-xs font-bold group-hover:text-emerald-300 transition-colors">
                            Sign in as retailer <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>

                </div>

                <p className="text-slate-600 text-[10px] font-medium tracking-[0.2em] mt-10">
                    A product of <span className="text-indigo-400 font-bold">leeep dev</span>
                </p>
            </div>
        </div>
    );
};
