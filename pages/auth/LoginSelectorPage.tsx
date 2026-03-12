import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Store, ArrowRight, Building, Warehouse } from 'lucide-react';

const ROLES = [
    {
        key: 'depot',
        label: 'Depot',
        sublabel: 'Regional Hub',
        desc: 'Large-scale distribution hub for regional supply chains',
        icon: Warehouse,
        bg: 'linear-gradient(135deg,rgba(124,58,237,0.18),rgba(109,40,217,0.08))',
        hoverBg: 'linear-gradient(135deg,rgba(124,58,237,0.32),rgba(109,40,217,0.18))',
        border: 'rgba(124,58,237,0.25)',
        hoverBorder: 'rgba(167,139,250,0.55)',
        iconBg: 'linear-gradient(135deg,#7C3AED,#6D28D9)',
        glow: 'rgba(124,58,237,0.55)',
        accent: '#A78BFA',
        comingSoon: true,
    },
    {
        key: 'wholesaler',
        label: 'Wholesaler',
        sublabel: 'Distribution OS',
        desc: 'Manage catalog, supply orders & sub-wholesaler network',
        icon: Building,
        bg: 'linear-gradient(135deg,rgba(37,99,235,0.18),rgba(29,78,216,0.08))',
        hoverBg: 'linear-gradient(135deg,rgba(37,99,235,0.32),rgba(29,78,216,0.18))',
        border: 'rgba(37,99,235,0.25)',
        hoverBorder: 'rgba(96,165,250,0.55)',
        iconBg: 'linear-gradient(135deg,#1D4ED8,#2563EB)',
        glow: 'rgba(37,99,235,0.55)',
        accent: '#60A5FA',
        path: '/login/main-wholesaler',
    },
    {
        key: 'sub-wholesaler',
        label: 'Sub\u2011Wholesaler',
        sublabel: 'Business OS',
        desc: 'Orders, inventory, retailers, payments & GST — all in one',
        icon: Briefcase,
        bg: 'linear-gradient(135deg,rgba(79,70,229,0.18),rgba(67,56,202,0.08))',
        hoverBg: 'linear-gradient(135deg,rgba(79,70,229,0.32),rgba(67,56,202,0.18))',
        border: 'rgba(79,70,229,0.25)',
        hoverBorder: 'rgba(129,140,248,0.55)',
        iconBg: 'linear-gradient(135deg,#4338CA,#4F46E5)',
        glow: 'rgba(79,70,229,0.55)',
        accent: '#818CF8',
        path: '/login/wholesaler',
    },
    {
        key: 'retailer',
        label: 'Retailer',
        sublabel: 'Pharmacy Portal',
        desc: 'Browse 2.5L+ medicines, place orders & track deliveries',
        icon: Store,
        bg: 'linear-gradient(135deg,rgba(5,150,105,0.18),rgba(4,120,87,0.08))',
        hoverBg: 'linear-gradient(135deg,rgba(5,150,105,0.32),rgba(4,120,87,0.18))',
        border: 'rgba(5,150,105,0.25)',
        hoverBorder: 'rgba(52,211,153,0.55)',
        iconBg: 'linear-gradient(135deg,#047857,#059669)',
        glow: 'rgba(5,150,105,0.55)',
        accent: '#34D399',
        path: '/login/retailer',
    },
] as const;

export const LoginSelectorPage = () => {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 80);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 50% 0%,#0f1729 0%,#070c18 55%,#030508 100%)' }}
        >
            {/* ── Background orbs ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute rounded-full" style={{
                    top: '-18%', left: '50%', transform: 'translateX(-50%)',
                    width: '1000px', height: '700px',
                    background: 'radial-gradient(ellipse,rgba(79,70,229,0.13) 0%,rgba(37,99,235,0.05) 45%,transparent 70%)',
                    animation: 'orb1 9s ease-in-out infinite',
                }} />
                <div className="absolute rounded-full" style={{
                    bottom: '-20%', right: '-8%',
                    width: '700px', height: '600px',
                    background: 'radial-gradient(ellipse,rgba(5,150,105,0.09) 0%,transparent 60%)',
                    animation: 'orb2 12s ease-in-out infinite 2s',
                }} />
                <div className="absolute rounded-full" style={{
                    top: '25%', left: '-10%',
                    width: '600px', height: '500px',
                    background: 'radial-gradient(ellipse,rgba(124,58,237,0.08) 0%,transparent 60%)',
                    animation: 'orb2 14s ease-in-out infinite 5s',
                }} />
                {/* Dot grid */}
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px,transparent 1px)',
                    backgroundSize: '30px 30px',
                }} />
                {/* Noise vignette */}
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse at center,transparent 40%,rgba(3,5,8,0.6) 100%)',
                }} />
            </div>

            {/* ── Content ── */}
            <div className="relative z-10 w-full max-w-5xl px-6 py-10 flex flex-col items-center"
                style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'opacity 0.55s ease, transform 0.55s ease',
                }}
            >
                {/* ── Logo ── */}
                <div className="mb-2 relative">
                    <div className="absolute inset-0 rounded-[20px] blur-2xl opacity-60"
                        style={{ background: 'linear-gradient(145deg,rgba(91,84,245,0.7),rgba(37,99,235,0.5))' }} />
                    <div className="relative w-[64px] h-[64px] rounded-[20px] flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(145deg,#5B54F5 0%,#2563EB 100%)',
                            boxShadow: '0 0 0 1px rgba(91,84,245,0.5),0 16px 48px rgba(79,70,229,0.6),inset 0 1px 0 rgba(255,255,255,0.15)',
                        }}
                    >
                        <span className="text-white font-black text-[28px] leading-none tracking-tighter">P</span>
                    </div>
                </div>

                {/* ── Brand name ── */}
                <h1 className="text-[3.5rem] font-black text-white tracking-[-0.03em] leading-none mt-5 mb-2"
                    style={{ textShadow: '0 0 60px rgba(99,102,241,0.35)' }}
                >
                    PharmaOS
                </h1>
                <p className="text-[15px] font-medium text-center mb-1" style={{ color: 'rgba(148,163,184,0.65)' }}>
                    India's pharma distribution operating system
                </p>
                <p className="text-[13px] font-medium mb-10" style={{ color: 'rgba(100,116,139,0.6)' }}>
                    Choose your role to continue
                </p>

                {/* ── Role cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                    {ROLES.map((role, idx) => {
                        const { key, label, sublabel, desc, icon: Icon, bg, hoverBg, border, hoverBorder, iconBg, glow, accent, comingSoon } = role;
                        const path = 'path' in role ? role.path : undefined;
                        const isHov = hovered === key && !comingSoon;

                        return (
                            <button
                                key={key}
                                onClick={() => !comingSoon && path && navigate(path)}
                                onMouseEnter={() => !comingSoon && setHovered(key)}
                                onMouseLeave={() => setHovered(null)}
                                disabled={comingSoon}
                                className="relative text-left rounded-3xl p-6 flex flex-col"
                                style={{
                                    background: isHov ? hoverBg : bg,
                                    border: `1px solid ${isHov ? hoverBorder : border}`,
                                    transform: isHov ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                                    boxShadow: isHov
                                        ? `0 24px 60px rgba(0,0,0,0.5),0 0 0 1px ${hoverBorder},0 0 50px ${glow.replace('0.55','0.15')}`
                                        : '0 4px 20px rgba(0,0,0,0.3)',
                                    cursor: comingSoon ? 'not-allowed' : 'pointer',
                                    opacity: mounted ? (comingSoon ? 0.45 : 1) : 0,
                                    backdropFilter: 'blur(12px)',
                                    WebkitBackdropFilter: 'blur(12px)',
                                    transition: `opacity 0.5s ease ${0.1 + idx * 0.08}s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease`,
                                    minHeight: '220px',
                                }}
                            >
                                {/* Coming soon */}
                                {comingSoon && (
                                    <span className="absolute top-4 right-4 text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
                                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)' }}
                                    >Soon</span>
                                )}

                                {/* Icon */}
                                <div className="mb-5 relative w-fit">
                                    {isHov && (
                                        <div className="absolute -inset-2 rounded-2xl blur-lg opacity-80"
                                            style={{ background: glow }} />
                                    )}
                                    <div className="relative w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
                                        style={{
                                            background: isHov ? iconBg : 'rgba(255,255,255,0.07)',
                                            border: `1px solid ${isHov ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                                            boxShadow: isHov ? `0 8px 28px ${glow}` : 'none',
                                            transform: isHov ? 'scale(1.08)' : 'scale(1)',
                                            transition: 'all 0.25s ease',
                                        }}
                                    >
                                        <Icon size={22} style={{ color: isHov ? '#ffffff' : accent }} />
                                    </div>
                                </div>

                                {/* Text */}
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5"
                                        style={{ color: isHov ? accent : `${accent}99` }}>
                                        {sublabel}
                                    </p>
                                    <h3 className="text-[17px] font-extrabold text-white mb-2 tracking-tight leading-tight">
                                        {label}
                                    </h3>
                                    <p className="text-[12px] leading-relaxed"
                                        style={{ color: isHov ? 'rgba(203,213,225,0.65)' : 'rgba(148,163,184,0.4)' }}>
                                        {desc}
                                    </p>
                                </div>

                                {/* CTA */}
                                <div className="mt-5 pt-4 flex items-center justify-between"
                                    style={{ borderTop: `1px solid ${isHov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}` }}
                                >
                                    <span className="text-[12px] font-bold transition-colors duration-200"
                                        style={{ color: comingSoon ? 'rgba(255,255,255,0.2)' : isHov ? accent : 'rgba(255,255,255,0.3)' }}>
                                        {comingSoon ? 'Coming soon' : 'Sign in'}
                                    </span>
                                    {!comingSoon && (
                                        <ArrowRight size={14}
                                            style={{
                                                color: isHov ? accent : 'rgba(255,255,255,0.2)',
                                                transform: isHov ? 'translateX(4px)' : 'translateX(0)',
                                                transition: 'transform 0.2s ease, color 0.2s ease',
                                            }}
                                        />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ── Footer ── */}
                <div className="mt-10 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.1)' }}>
                            PharmaOS
                        </span>
                        <div className="w-16 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
                        A product of{' '}
                        <span className="font-bold" style={{ color: 'rgba(99,102,241,0.55)' }}>leeep dev</span>
                        {' '}· Digital OS for pharma India
                    </p>
                    <button
                        onClick={() => navigate('/login/admin')}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
                        style={{ color: 'rgba(255,255,255,0.18)', background: 'transparent' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#F43F5E'; e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.18)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                        Admin Access →
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes orb1 {
                    0%,100%{opacity:1;transform:translateX(-50%) scale(1);}
                    50%{opacity:0.7;transform:translateX(-50%) scale(1.08);}
                }
                @keyframes orb2 {
                    0%,100%{opacity:1;transform:scale(1);}
                    50%{opacity:0.6;transform:scale(1.1);}
                }
            `}</style>
        </div>
    );
};
