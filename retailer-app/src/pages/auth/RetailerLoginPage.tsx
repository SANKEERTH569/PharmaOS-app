import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
    ArrowRight, Lock, Eye, EyeOff,
    Store, User, Phone, MapPin, CheckCircle2, Building2,
    ShoppingBag, Truck, CreditCard, Shield,
} from 'lucide-react';
import { cn } from '../../utils/cn';

type Mode = 'LOGIN' | 'REGISTER';

export const RetailerLoginPage = () => {
    const [mode, setMode] = useState<Mode>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loginPhone, setLoginPhone] = useState('');
    const [loginPass, setLoginPass] = useState('');

    const [reg, setReg] = useState({
        name: '', shop_name: '', phone: '', address: '', gstin: '', password: '', confirm: '',
    });

    const { loginRetailer, registerRetailer, authError } = useAuthStore();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await loginRetailer(loginPhone.trim(), loginPass);
            navigate('/shop');
        } catch { } finally { setLoading(false); }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (reg.password !== reg.confirm) {
            useAuthStore.setState({ authError: 'Passwords do not match' });
            return;
        }
        setLoading(true);
        try {
            await registerRetailer({
                name: reg.name.trim(), shop_name: reg.shop_name.trim(),
                phone: reg.phone.trim(), password: reg.password,
                address: reg.address.trim() || undefined, gstin: reg.gstin.trim() || undefined,
            });
            navigate('/shop/setup-agencies');
        } catch { } finally { setLoading(false); }
    };

    const inputBase =
        'w-full px-4 py-3.5 bg-white/[0.06] border border-white/[0.08] rounded-2xl focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/20 text-sm font-medium';

    const labelBase = 'text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2 block';

    const features = [
        { icon: ShoppingBag, label: 'Browse 2.5L+ medicines' },
        { icon: Truck, label: 'Track orders in real-time' },
        { icon: CreditCard, label: 'Digital payment records' },
        { icon: Shield, label: 'Secure & reliable' },
    ];

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 sm:p-6"
            style={{ background: 'linear-gradient(160deg, #042F2E 0%, #064E3B 30%, #065F46 50%, #0D9488 80%, #042F2E 100%)' }}
        >
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[20%] -right-[10%] w-[55%] h-[55%] rounded-full bg-emerald-400/[0.06] blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full bg-teal-400/[0.06] blur-[120px]" />
                <div className="absolute top-[30%] left-[10%] w-[20%] h-[20%] rounded-full bg-emerald-300/[0.04] blur-[80px]" />

                {/* Grid pattern */}
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }} />
            </div>

            <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

                {/* ─── Left: Brand + Features ─── */}
                <div className="w-full lg:w-auto lg:flex-1 text-center lg:text-left">
                    <div className="flex items-center gap-3 justify-center lg:justify-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
                            <Store size={22} className="text-emerald-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-white tracking-tight leading-none">Shop Connect</p>
                            <p className="text-emerald-400/60 text-[10px] font-bold tracking-[0.3em] uppercase mt-0.5">B2B Ordering Portal</p>
                        </div>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight mb-4 max-w-md mx-auto lg:mx-0">
                        Order medicines from <span className="text-emerald-400">your wholesaler,</span> digitally.
                    </h1>
                    <p className="text-white/40 text-sm font-medium leading-relaxed max-w-sm mx-auto lg:mx-0 mb-8">
                        Connect with your wholesale partners, browse their catalog, place orders, and track everything in real-time.
                    </p>

                    <div className="hidden sm:grid grid-cols-2 gap-3 max-w-sm mx-auto lg:mx-0">
                        {features.map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
                                <Icon size={16} className="text-emerald-400 shrink-0" />
                                <span className="text-white/60 text-xs font-semibold">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── Right: Form Card ─── */}
                <div className="w-full max-w-[420px] bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] rounded-[28px] shadow-2xl shadow-black/20 overflow-hidden animate-scale-in">
                    <div className="p-7 sm:p-8">

                        <div className="mb-6">
                            <h2 className="text-xl font-extrabold text-white tracking-tight">
                                {mode === 'LOGIN' ? 'Welcome back' : 'Create your shop'}
                            </h2>
                            <p className="text-white/35 text-xs font-medium mt-1">
                                {mode === 'LOGIN' ? 'Sign in with your mobile number' : 'Register your retail pharmacy'}
                            </p>
                        </div>

                        {/* ──── LOGIN ──── */}
                        {mode === 'LOGIN' && (
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className={labelBase}>Mobile Number</label>
                                    <div className="relative">
                                        <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                        <input type="tel" value={loginPhone}
                                            onChange={e => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                                            className={cn(inputBase, 'pl-11')}
                                            placeholder="99999 99999" maxLength={10} required autoFocus
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelBase}>Password</label>
                                    <div className="relative">
                                        <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                                        <input type={showPass ? 'text' : 'password'} value={loginPass}
                                            onChange={e => setLoginPass(e.target.value)}
                                            className={cn(inputBase, 'pl-11 pr-12')}
                                            placeholder="••••••••" required
                                        />
                                        <button type="button" onClick={() => setShowPass(v => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors">
                                            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {authError && (
                                    <p className="text-red-400 text-xs font-semibold text-center bg-red-400/10 border border-red-400/10 rounded-xl py-2.5 px-4">{authError}</p>
                                )}

                                <button type="submit" disabled={loading}
                                    className={cn(
                                        'w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3 group mt-1',
                                        loading
                                            ? 'bg-white/10 text-white/40'
                                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.01]'
                                    )}
                                >
                                    {loading ? 'Signing in...' : 'Sign In'}
                                    {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                                </button>

                                <p className="text-center text-white/30 text-[11px]">
                                    New here?{' '}
                                    <button type="button"
                                        onClick={() => { setMode('REGISTER'); useAuthStore.setState({ authError: null }); }}
                                        className="text-emerald-400 font-bold hover:text-emerald-300 hover:underline transition-colors">
                                        Register your shop →
                                    </button>
                                </p>

                                <p className="text-center text-white/25 text-[11px]">
                                    Sub-Wholesaler?{' '}
                                    <button type="button" onClick={() => navigate('/login/wholesaler')}
                                        className="text-indigo-400 font-bold hover:text-indigo-300 hover:underline transition-colors">
                                        Sub-Wholesale login →
                                    </button>
                                </p>
                            </form>
                        )}

                        {/* ──── REGISTER ──── */}
                        {mode === 'REGISTER' && (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelBase}>Shop Name</label>
                                        <div className="relative">
                                            <Store size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input type="text" value={reg.shop_name}
                                                onChange={e => setReg({ ...reg, shop_name: e.target.value })}
                                                className={cn(inputBase, 'pl-10 text-xs')} placeholder="Sri Medical Store" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelBase}>Owner Name</label>
                                        <div className="relative">
                                            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input type="text" value={reg.name}
                                                onChange={e => setReg({ ...reg, name: e.target.value })}
                                                className={cn(inputBase, 'pl-10 text-xs')} placeholder="Ramesh Kumar" required />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelBase}>Mobile Number</label>
                                        <div className="relative">
                                            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input type="tel" value={reg.phone}
                                                onChange={e => setReg({ ...reg, phone: e.target.value.replace(/\D/g, '') })}
                                                className={cn(inputBase, 'pl-10 text-xs')} placeholder="9999999999" maxLength={10} required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelBase}>GSTIN (optional)</label>
                                        <div className="relative">
                                            <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input type="text" value={reg.gstin}
                                                onChange={e => setReg({ ...reg, gstin: e.target.value.toUpperCase() })}
                                                className={cn(inputBase, 'pl-10 text-xs')} placeholder="36XXXXX1234X1ZX" maxLength={15} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelBase}>Shop Address (optional)</label>
                                    <div className="relative">
                                        <MapPin size={14} className="absolute left-3.5 top-3.5 text-white/20" />
                                        <input type="text" value={reg.address}
                                            onChange={e => setReg({ ...reg, address: e.target.value })}
                                            className={cn(inputBase, 'pl-10 text-xs')} placeholder="12-3, Main Road, Hyderabad" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelBase}>Password</label>
                                        <div className="relative">
                                            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input type={showPass ? 'text' : 'password'} value={reg.password}
                                                onChange={e => setReg({ ...reg, password: e.target.value })}
                                                className={cn(inputBase, 'pl-10 pr-9 text-xs')} placeholder="Min 6 chars" minLength={6} required />
                                            <button type="button" onClick={() => setShowPass(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60">
                                                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelBase}>Confirm Password</label>
                                        <div className="relative">
                                            <CheckCircle2 size={14} className={cn(
                                                'absolute left-3.5 top-1/2 -translate-y-1/2',
                                                reg.confirm && reg.confirm === reg.password ? 'text-emerald-400' : 'text-white/20',
                                            )} />
                                            <input type={showConfirm ? 'text' : 'password'} value={reg.confirm}
                                                onChange={e => setReg({ ...reg, confirm: e.target.value })}
                                                className={cn(inputBase, 'pl-10 pr-9 text-xs')} placeholder="Repeat" required />
                                            <button type="button" onClick={() => setShowConfirm(v => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60">
                                                {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {authError && (
                                    <p className="text-red-400 text-xs font-semibold text-center bg-red-400/10 border border-red-400/10 rounded-xl py-2 px-4">{authError}</p>
                                )}

                                <button type="submit" disabled={loading}
                                    className={cn(
                                        'w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3 group',
                                        loading ? 'bg-white/10 text-white/40' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.01]'
                                    )}
                                >
                                    {loading ? 'Creating account...' : 'Register & Select Agencies'}
                                    {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                                </button>

                                <p className="text-center text-white/30 text-[11px]">
                                    Already registered?{' '}
                                    <button type="button"
                                        onClick={() => { setMode('LOGIN'); useAuthStore.setState({ authError: null }); }}
                                        className="text-emerald-400 font-bold hover:underline transition-colors">Sign in</button>
                                </p>
                            </form>
                        )}

                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center w-full z-10">
                <p className="text-white/15 text-[10px] font-medium tracking-[0.3em]">
                    PharmaOS · leeep dev
                </p>
            </div>
        </div>
    );
};
