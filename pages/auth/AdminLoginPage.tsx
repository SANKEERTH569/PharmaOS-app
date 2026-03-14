import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { PremiumAnimatedLogo } from '../../components/ui/PremiumAnimatedLogo';

export const AdminLoginPage = () => {
    const navigate = useNavigate();
    const { loginAdmin, isLoading, authError } = useAuthStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        if (!username || !password) { setLocalError('Please fill in all fields'); return; }
        try {
            await loginAdmin(username, password);
            navigate('/admin');
        } catch (err: any) {
            setLocalError(err.message || 'Login failed');
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0D0D1A 0%, #1A0A2E 40%, #0D0D1A 100%)' }}
        >
            {/* Decorative */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[15%] right-[10%] w-[40%] h-[40%] rounded-full bg-rose-500/[0.06] blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[5%] w-[35%] h-[35%] rounded-full bg-orange-500/[0.05] blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Back */}
                <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 text-slate-500 hover:text-white text-sm font-medium mb-8 transition-colors group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to role selection
                </button>

                {/* Card */}
                <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
                    {/* Brand */}
                    <div className="flex justify-center mb-6">
                        <div style={{ '--color-text-primary': '#ffffff' } as React.CSSProperties}>
                            <PremiumAnimatedLogo size="lg" autoPlay playDelay={350} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-extrabold text-white text-center tracking-tight mb-1">Admin Console</h1>
                    <p className="text-sm text-slate-500 text-center mb-8 font-medium">Platform administration access</p>

                    {/* Error */}
                    {(localError || authError) && (
                        <div className="mb-5 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            <p className="text-xs font-semibold text-rose-400">{localError || authError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500/40 transition-all"
                                placeholder="admin"
                                autoComplete="username"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500/40 transition-all pr-12"
                                    placeholder="••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-orange-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-rose-500/25 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                            ) : (
                                <>
                                    <Shield size={15} />
                                    Sign in to Admin Console
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-slate-600 text-[10px] font-medium tracking-[0.2em] text-center mt-8">
                    A product of <span className="text-rose-400 font-bold">leeep dev</span>
                </p>
            </div>
        </div>
    );
};
