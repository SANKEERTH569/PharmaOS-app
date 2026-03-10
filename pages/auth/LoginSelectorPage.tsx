import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Store, ArrowRight, Building, Warehouse } from 'lucide-react';

const ROLES = [
    {
        key: 'depot',
        label: 'Depot',
        desc: 'Large-scale distribution hub for regional supply',
        icon: Warehouse,
        accent: '#7C3AED',
        comingSoon: true,
    },
    {
        key: 'wholesaler',
        label: 'Wholesaler',
        desc: 'Manage large inventory & supply to sub-wholesalers',
        icon: Building,
        accent: '#2563EB',
        path: '/login/main-wholesaler',
    },
    {
        key: 'sub-wholesaler',
        label: 'Sub-Wholesaler',
        desc: 'Manage orders, inventory, retailers & payments',
        icon: Briefcase,
        accent: '#4F46E5',
        path: '/login/wholesaler',
    },
    {
        key: 'retailer',
        label: 'Retailer',
        desc: 'Browse medicines, place orders & track deliveries',
        icon: Store,
        accent: '#059669',
        path: '/login/retailer',
    },
] as const;

export const LoginSelectorPage = () => {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState<string | null>(null);

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
            style={{
                background: '#060A14',
                backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)
                `,
                backgroundSize: '64px 64px',
            }}
        >
            {/* Ambient glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                <div
                    className="absolute rounded-full"
                    style={{
                        top: '-18%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '720px',
                        height: '420px',
                        background: 'radial-gradient(ellipse, rgba(79,70,229,0.11) 0%, transparent 68%)',
                    }}
                />
                <div
                    className="absolute rounded-full"
                    style={{
                        bottom: '-12%',
                        right: '8%',
                        width: '420px',
                        height: '320px',
                        background: 'radial-gradient(ellipse, rgba(5,150,105,0.07) 0%, transparent 70%)',
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-3xl">

                {/* ── Brand ── */}
                <div className="text-center mb-12">
                    <div
                        className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-[14px] mb-5"
                        style={{
                            background: 'linear-gradient(145deg, #5B54F5 0%, #2563EB 100%)',
                            boxShadow: '0 0 0 1px rgba(91,84,245,0.35), 0 8px 28px rgba(79,70,229,0.35)',
                        }}
                    >
                        <span className="text-white font-black text-[22px] leading-none tracking-tight">P</span>
                    </div>
                    <h1 className="text-[2.2rem] font-bold text-white tracking-tight leading-none mb-2.5">
                        PharmaOS
                    </h1>
                    <p className="text-[13px] font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>
                        Choose your role to continue
                    </p>
                </div>

                {/* ── Role cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {ROLES.map((role) => {
                        const { key, label, desc, icon: Icon, accent, comingSoon } = role;
                        const path = 'path' in role ? role.path : undefined;
                        const active = hovered === key && !comingSoon;

                        return (
                            <button
                                key={key}
                                onClick={() => !comingSoon && path && navigate(path)}
                                onMouseEnter={() => !comingSoon && setHovered(key)}
                                onMouseLeave={() => setHovered(null)}
                                disabled={comingSoon}
                                className="relative text-left rounded-2xl p-5 transition-all duration-200"
                                style={{
                                    background: active ? `${accent}0F` : 'rgba(255,255,255,0.025)',
                                    border: `1px solid ${active ? `${accent}35` : 'rgba(255,255,255,0.07)'}`,
                                    transform: active ? 'translateY(-3px)' : 'translateY(0)',
                                    boxShadow: active
                                        ? `0 20px 48px rgba(0,0,0,0.45), 0 0 0 1px ${accent}25`
                                        : 'none',
                                    opacity: comingSoon ? 0.36 : 1,
                                    cursor: comingSoon ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {comingSoon && (
                                    <span
                                        className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            color: 'rgba(255,255,255,0.22)',
                                            border: '1px solid rgba(255,255,255,0.07)',
                                        }}
                                    >
                                        Soon
                                    </span>
                                )}

                                {/* Icon */}
                                <div
                                    className="w-[42px] h-[42px] rounded-xl flex items-center justify-center mb-5"
                                    style={{
                                        background: `${accent}14`,
                                        border: `1px solid ${accent}28`,
                                        transform: active ? 'scale(1.07)' : 'scale(1)',
                                        transition: 'transform 0.2s',
                                    }}
                                >
                                    <Icon size={17} style={{ color: accent }} />
                                </div>

                                <h3 className="text-[13.5px] font-semibold text-white mb-1.5 tracking-tight">
                                    {label}
                                </h3>
                                <p className="text-[11px] leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                    {desc}
                                </p>

                                <span
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold"
                                    style={{ color: comingSoon ? 'rgba(255,255,255,0.18)' : accent }}
                                >
                                    {comingSoon ? 'Coming soon' : (
                                        <>
                                            Sign in
                                            <ArrowRight
                                                size={11}
                                                style={{
                                                    transform: active ? 'translateX(3px)' : 'translateX(0)',
                                                    transition: 'transform 0.2s',
                                                }}
                                            />
                                        </>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Footer ── */}
                <div className="text-center mt-10 flex flex-col items-center gap-2.5">
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.13)' }}>
                        A product of{' '}
                        <span className="font-semibold" style={{ color: 'rgba(99,102,241,0.65)' }}>
                            leeep dev
                        </span>
                    </p>
                    <button
                        onClick={() => navigate('/login/admin')}
                        className="text-[11px] font-medium transition-colors duration-150"
                        style={{ color: 'rgba(255,255,255,0.15)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#F43F5E')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
                    >
                        Admin Login →
                    </button>
                </div>

            </div>
        </div>
    );
};
