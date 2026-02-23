
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  ArrowRight, Lock, Eye, EyeOff, Store, Briefcase,
  User, Phone, Mail, MapPin, CheckCircle2, Building2,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { UserRole } from '../types';

type PageMode = 'LOGIN' | 'REGISTER';

export const LoginPage = () => {
  // ── shared ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<PageMode>('LOGIN');
  const [role, setRole] = useState<UserRole>('WHOLESALER');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── LOGIN fields ─────────────────────────────────────────────────────
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // ── REGISTER fields (wholesaler) ────────────────────────────────────
  const [reg, setReg] = useState({
    name: '', username: '', phone: '', email: '', address: '', password: '', confirm: '',
  });

  // ── REGISTER fields (retailer) ────────────────────────────────────
  const [rtReg, setRtReg] = useState({
    name: '', shop_name: '', phone: '', address: '', gstin: '', password: '', confirm: '',
  });

  const { loginWholesaler, loginRetailer, register, registerRetailer, authError } = useAuthStore();
  const navigate = useNavigate();

  // ── helpers ──────────────────────────────────────────────────────────
  const isWholesaler = role === 'WHOLESALER';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (role === 'WHOLESALER') {
        await loginWholesaler(loginId.trim(), loginPass);
        navigate('/');
      } else {
        await loginRetailer(loginId.trim(), loginPass);
        navigate('/shop');
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reg.password !== reg.confirm) {
      useAuthStore.setState({ authError: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      await register({
        username: reg.username.trim(), password: reg.password,
        name: reg.name.trim(), phone: reg.phone.trim(),
        email: reg.email.trim() || undefined, address: reg.address.trim() || undefined,
      });
      navigate('/');
    } catch { } finally { setLoading(false); }
  };

  const handleRetailerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rtReg.password !== rtReg.confirm) {
      useAuthStore.setState({ authError: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      await registerRetailer({
        name: rtReg.name.trim(), shop_name: rtReg.shop_name.trim(),
        phone: rtReg.phone.trim(), password: rtReg.password,
        address: rtReg.address.trim() || undefined, gstin: rtReg.gstin.trim() || undefined,
      });
      navigate('/shop/setup-agencies');
    } catch { } finally { setLoading(false); }
  };

  const inputBase =
    'w-full px-4 py-3.5 bg-white/[0.06] border border-white/[0.08] rounded-2xl focus:ring-2 focus:ring-white/25 focus:border-white/20 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/20 text-sm font-medium';

  const labelBase = 'text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2 block';

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-6"
      style={{
        background: isWholesaler
          ? 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 40%, #0F172A 70%, #1E293B 100%)'
          : 'linear-gradient(135deg, #042F2E 0%, #064E3B 40%, #0F172A 70%, #1E293B 100%)',
      }}
    >
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/[0.06] blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-violet-500/[0.05] blur-[100px]" />
      </div>

      <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/[0.1] rounded-[32px] shadow-2xl shadow-black/20 w-full max-w-lg overflow-hidden z-10 flex flex-col animate-scale-in">
        <div className="p-8 pb-0">

          {/* Role toggle */}
          {mode === 'LOGIN' && (
            <div className="flex bg-white/[0.06] p-1 rounded-2xl mb-6 border border-white/[0.05]">
              <button
                onClick={() => setRole('WHOLESALER')}
                className={cn(
                  'flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all duration-300',
                  role === 'WHOLESALER'
                    ? 'bg-white text-slate-900 shadow-lg shadow-white/10'
                    : 'text-white/40 hover:text-white/70',
                )}
              >
                <Briefcase size={14} /> Wholesaler
              </button>
              <button
                onClick={() => setRole('RETAILER')}
                className={cn(
                  'flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all duration-300',
                  role === 'RETAILER'
                    ? 'bg-white text-emerald-900 shadow-lg shadow-white/10'
                    : 'text-white/40 hover:text-white/70',
                )}
              >
                <Store size={14} /> Retailer
              </button>
            </div>
          )}

          {/* Title */}
          <div className="text-center mb-6">
            <div className="mb-1">
              {mode === 'LOGIN' && role === 'WHOLESALER' ? (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                    <span className="text-white font-black text-2xl leading-none">P</span>
                  </div>
                  <p className="text-3xl font-extrabold text-white leading-none tracking-tight">PharmaOS</p>
                </>
              ) : (
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  {mode === 'REGISTER'
                    ? (role === 'WHOLESALER' ? 'Create Account' : 'Register Shop')
                    : 'Shop Connect'}
                </h2>
              )}
            </div>
            <p className="text-white/40 font-medium tracking-wide text-xs mt-2">
              {mode === 'REGISTER'
                ? (role === 'WHOLESALER' ? 'Register your wholesale business' : 'Create your retail shop account')
                : role === 'WHOLESALER'
                  ? 'Distribution Management System'
                  : 'B2B Ordering Portal'}
            </p>
          </div>
        </div>

        {/* ──── LOGIN FORM ──── */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLogin} className="px-8 pb-8 space-y-5">
            <div>
              <label className={labelBase}>
                {role === 'WHOLESALER' ? 'Username / Business ID' : 'Mobile Number'}
              </label>
              <div className="relative">
                <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                <input
                  type={role === 'RETAILER' ? 'tel' : 'text'}
                  value={loginId}
                  onChange={(e) => setLoginId(role === 'RETAILER' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                  className={cn(inputBase, 'pl-10')}
                  placeholder={role === 'WHOLESALER' ? 'your_business_id' : '99999 99999'}
                  maxLength={role === 'RETAILER' ? 10 : undefined}
                  required autoFocus
                />
              </div>
            </div>

            <div>
              <label className={labelBase}>Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className={cn(inputBase, 'pl-10 pr-12')}
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {authError && (
              <p className="text-red-400 text-xs font-semibold text-center bg-red-400/10 rounded-xl py-2.5 px-4 border border-red-400/10">
                {authError}
              </p>
            )}

            <button
              type="submit" disabled={loading}
              className={cn(
                'w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 group mt-2',
                loading
                  ? 'bg-white/10 text-white/40'
                  : 'bg-white text-slate-900 hover:shadow-xl hover:shadow-white/10 hover:scale-[1.01]',
              )}
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
            </button>

            <p className="text-center text-white/30 text-[11px]">
              New here?{' '}
              <button type="button"
                onClick={() => { setMode('REGISTER'); useAuthStore.setState({ authError: null }); }}
                className="text-white/80 font-bold hover:text-white hover:underline transition-colors"
              >
                {role === 'WHOLESALER' ? 'Register your business' : 'Register your shop'}
              </button>
            </p>
          </form>
        )}

        {/* ──── WHOLESALER REGISTER FORM ──── */}
        {mode === 'REGISTER' && role === 'WHOLESALER' && (
          <form onSubmit={handleRegister} className="px-8 pb-8 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Business Name</label>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="text" value={reg.name}
                    onChange={(e) => setReg({ ...reg, name: e.target.value })}
                    className={cn(inputBase, 'pl-9 text-xs')} placeholder="Sai Ram Agencies" required />
                </div>
              </div>
              <div>
                <label className={labelBase}>Username / ID</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="text" value={reg.username}
                    onChange={(e) => setReg({ ...reg, username: e.target.value.replace(/\s/g, '') })}
                    className={cn(inputBase, 'pl-9 text-xs')} placeholder="sairam_dist" required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Mobile Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="tel" value={reg.phone}
                    onChange={(e) => setReg({ ...reg, phone: e.target.value.replace(/\D/g, '') })}
                    className={cn(inputBase, 'pl-9 text-xs')} placeholder="9999999999" maxLength={10} required />
                </div>
              </div>
              <div>
                <label className={labelBase}>Email (optional)</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="email" value={reg.email}
                    onChange={(e) => setReg({ ...reg, email: e.target.value })}
                    className={cn(inputBase, 'pl-9 text-xs')} placeholder="you@business.com" />
                </div>
              </div>
            </div>

            <div>
              <label className={labelBase}>Business Address (optional)</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-3.5 text-white/20" />
                <input type="text" value={reg.address}
                  onChange={(e) => setReg({ ...reg, address: e.target.value })}
                  className={cn(inputBase, 'pl-9 text-xs')} placeholder="12-5, Pharma Plaza, Hyderabad" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type={showPass ? 'text' : 'password'} value={reg.password}
                    onChange={(e) => setReg({ ...reg, password: e.target.value })}
                    className={cn(inputBase, 'pl-9 pr-8 text-xs')} placeholder="Min 6 chars" minLength={6} required />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60">
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelBase}>Confirm Password</label>
                <div className="relative">
                  <CheckCircle2 size={14} className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2',
                    reg.confirm && reg.confirm === reg.password ? 'text-emerald-400' : 'text-white/20',
                  )} />
                  <input type={showConfirm ? 'text' : 'password'} value={reg.confirm}
                    onChange={(e) => setReg({ ...reg, confirm: e.target.value })}
                    className={cn(inputBase, 'pl-9 pr-8 text-xs')} placeholder="Repeat password" required />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60">
                    {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {authError && (
              <p className="text-red-400 text-xs font-semibold text-center bg-red-400/10 rounded-xl py-2 px-4 border border-red-400/10">{authError}</p>
            )}

            <button type="submit" disabled={loading}
              className={cn(
                'w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 group',
                loading ? 'bg-white/10 text-white/40' : 'bg-white text-slate-900 hover:shadow-xl hover:shadow-white/10 hover:scale-[1.01]',
              )}
            >
              {loading ? 'Creating account...' : 'Register & Start Business'}
              {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
            </button>

            <p className="text-center text-white/30 text-[11px]">
              Already registered?{' '}
              <button type="button"
                onClick={() => { setMode('LOGIN'); useAuthStore.setState({ authError: null }); }}
                className="text-white/80 font-bold hover:text-white hover:underline transition-colors">Sign in</button>
            </p>
          </form>
        )}

        {/* ──── RETAILER REGISTER FORM ──── */}
        {mode === 'REGISTER' && role === 'RETAILER' && (
          <form onSubmit={handleRetailerRegister} className="px-8 pb-8 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Shop Name</label>
                <div className="relative">
                  <Store size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="text" value={rtReg.shop_name}
                    onChange={(e) => setRtReg({ ...rtReg, shop_name: e.target.value })}
                    className={cn(inputBase, 'pl-9 text-xs')} placeholder="Sri Medical Store" required />
                </div>
              </div>
              <div>
                <label className={labelBase}>Owner Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="text" value={rtReg.name}
                    onChange={(e) => setRtReg({ ...rtReg, name: e.target.value })}
                    className={cn(inputBase, 'pl-9 text-xs')} placeholder="Ramesh Kumar" required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Mobile Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="tel" value={rtReg.phone}
                    onChange={(e) => setRtReg({ ...rtReg, phone: e.target.value.replace(/\D/g, '') })}
                    className={cn(inputBase, 'pl-9 text-xs')} placeholder="9999999999" maxLength={10} required />
                </div>
              </div>
              <div>
                <label className={labelBase}>GSTIN (optional)</label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="text" value={rtReg.gstin}
                    onChange={(e) => setRtReg({ ...rtReg, gstin: e.target.value.toUpperCase() })}
                    className={cn(inputBase, 'pl-9 text-xs')} placeholder="36XXXXX1234X1ZX" maxLength={15} />
                </div>
              </div>
            </div>

            <div>
              <label className={labelBase}>Shop Address (optional)</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-3.5 text-white/20" />
                <input type="text" value={rtReg.address}
                  onChange={(e) => setRtReg({ ...rtReg, address: e.target.value })}
                  className={cn(inputBase, 'pl-9 text-xs')} placeholder="12-3, Main Road, Hyderabad" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type={showPass ? 'text' : 'password'} value={rtReg.password}
                    onChange={(e) => setRtReg({ ...rtReg, password: e.target.value })}
                    className={cn(inputBase, 'pl-9 pr-8 text-xs')} placeholder="Min 6 chars" minLength={6} required />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60">
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelBase}>Confirm Password</label>
                <div className="relative">
                  <CheckCircle2 size={14} className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2',
                    rtReg.confirm && rtReg.confirm === rtReg.password ? 'text-emerald-400' : 'text-white/20',
                  )} />
                  <input type={showConfirm ? 'text' : 'password'} value={rtReg.confirm}
                    onChange={(e) => setRtReg({ ...rtReg, confirm: e.target.value })}
                    className={cn(inputBase, 'pl-9 pr-8 text-xs')} placeholder="Repeat password" required />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60">
                    {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {authError && (
              <p className="text-red-400 text-xs font-semibold text-center bg-red-400/10 rounded-xl py-2 px-4 border border-red-400/10">{authError}</p>
            )}

            <button type="submit" disabled={loading}
              className={cn(
                'w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 group',
                loading ? 'bg-white/10 text-white/40' : 'bg-white text-emerald-900 hover:shadow-xl hover:shadow-white/10 hover:scale-[1.01]',
              )}
            >
              {loading ? 'Creating your account...' : 'Register & Select Agencies'}
              {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
            </button>

            <p className="text-center text-white/30 text-[11px]">
              Already registered?{' '}
              <button type="button"
                onClick={() => { setMode('LOGIN'); useAuthStore.setState({ authError: null }); }}
                className="text-white/80 font-bold hover:text-white hover:underline transition-colors">Sign in</button>
            </p>
          </form>
        )}
      </div>

      <div className="absolute bottom-8 text-center w-full">
        <p className="text-white/15 text-[10px] font-medium tracking-[0.3em]">
          leeep dev · Wholesale Distribution
        </p>
      </div>
    </div>
  );
};
