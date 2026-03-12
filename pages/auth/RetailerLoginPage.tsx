import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Lock, Eye, EyeOff, Store, User, Phone,
  MapPin, ShoppingBag, Truck, CreditCard, Shield, FileText, CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
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
    name: '', shop_name: '', phone: '', drug_license_number: '', address: '', gstin: '', password: '', confirm: '',
  });

  const { loginRetailer, registerRetailer, authError } = useAuthStore();
  const { initData } = useDataStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginRetailer(loginPhone.trim(), loginPass);
      const r = useAuthStore.getState().retailer;
      initData(r?.id || '', 'RETAILER');
      navigate('/shop');
    } catch {} finally { setLoading(false); }
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
        dl_number: reg.drug_license_number.trim(),
        address: reg.address.trim() || undefined, gstin: reg.gstin.trim() || undefined,
      });
      navigate('/shop/setup-agencies');
    } catch {} finally { setLoading(false); }
  };

  const inputBase =
    'w-full px-4 py-3.5 bg-white border border-slate-200/60 rounded-2xl focus:ring-2 focus:ring-teal-400/30 focus:border-teal-300 outline-none transition-all text-slate-800 placeholder-slate-300 text-sm font-medium shadow-sm';
  const labelBase = 'text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 block';

  return (
    <div className="min-h-screen flex">

      {/* ─── Left: Branding Panel ─── */}
      <div
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(145deg, #042F2E 0%, #065F46 35%, #0D6E5C 65%, #052E27 100%)' }}
      >
        {/* Grid texture */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        {/* Ambient glows */}
        <div className="absolute -top-[10%] -left-[5%] w-[55%] h-[55%] rounded-full blur-[120px]" style={{ background: 'rgba(20,184,166,0.14)' }} />
        <div className="absolute bottom-[5%] right-[-5%] w-[45%] h-[45%] rounded-full blur-[100px]" style={{ background: 'rgba(16,185,129,0.10)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, #14B8A6, #059669)', boxShadow: '0 8px 24px rgba(20,184,166,0.35)' }}
            >
              <span className="text-white font-black text-xl leading-none">P</span>
            </div>
            <span className="text-white font-extrabold text-2xl tracking-tight">PharmaOS</span>
          </div>
          <p className="text-teal-300/50 text-xs font-semibold tracking-[0.3em] uppercase mt-1">
            Retailer Portal
          </p>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Order medicines<br />with{' '}
            <span style={{ color: '#5EEAD4' }}>confidence.</span>
          </h2>
          <p className="text-white/40 text-base leading-relaxed font-medium">
            Browse thousands of medicines, place orders with your wholesaler, and track every delivery in real time.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { icon: ShoppingBag, label: '2.5L+ Medicines',    desc: 'Largest catalog' },
              { icon: Truck,       label: 'Live Tracking',      desc: 'Every order' },
              { icon: CreditCard,  label: 'Credit Ledger',      desc: 'Track balances' },
              { icon: Shield,      label: 'Secure Platform',    desc: 'Always safe' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: 'rgba(20,184,166,0.18)' }}>
                  <Icon size={15} style={{ color: '#5EEAD4' }} />
                </div>
                <p className="text-white font-extrabold text-sm">{label}</p>
                <p className="text-white/30 text-xs font-semibold mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/20 text-[10px] font-medium tracking-[0.2em]">
            A product of <span className="font-bold" style={{ color: 'rgba(94,234,212,0.6)' }}>leeep dev</span>
          </p>
        </div>
      </div>

      {/* ─── Right: Form Panel ─── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10" style={{ background: '#F7FFFE' }}>
        <div className="w-full max-w-md">

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(145deg, #14B8A6, #059669)', boxShadow: '0 6px 18px rgba(20,184,166,0.30)' }}>
              <span className="text-white font-black text-lg leading-none">P</span>
            </div>
            <span className="text-slate-900 font-extrabold text-xl tracking-tight">PharmaOS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {mode === 'LOGIN' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-1.5">
              {mode === 'LOGIN'
                ? 'Sign in to your retailer account'
                : 'Register your pharmacy on PharmaOS'
              }
            </p>
          </div>

          {/* ──── LOGIN ──── */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={labelBase}>Phone Number</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="tel" value={loginPhone}
                    onChange={e => setLoginPhone(e.target.value)}
                    className={cn(inputBase, 'pl-11')}
                    placeholder="9999999999" required autoFocus
                  />
                </div>
              </div>

              <div>
                <label className={labelBase}>Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type={showPass ? 'text' : 'password'} value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                    className={cn(inputBase, 'pl-11 pr-12')}
                    placeholder="••••••••" required
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {authError && (
                <p className="text-rose-600 text-xs font-semibold text-center bg-rose-50 border border-rose-100 rounded-xl py-2.5 px-4">{authError}</p>
              )}

              <button type="submit" disabled={loading}
                className={cn(
                  'w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3 group mt-2',
                  loading ? 'bg-slate-100 text-slate-400' : 'text-white hover:shadow-xl hover:scale-[1.01]',
                )}
                style={loading ? {} : { background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)', boxShadow: '0 8px 24px rgba(13,148,136,0.30)' }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>

              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <p className="text-center text-slate-400 text-xs">
                New here?{' '}
                <button type="button"
                  onClick={() => { setMode('REGISTER'); useAuthStore.setState({ authError: null }); }}
                  className="text-teal-600 font-bold hover:text-teal-700 hover:underline transition-colors">
                  Create Account →
                </button>
              </p>
            </form>
          )}

          {/* ──── REGISTER ──── */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Your Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" value={reg.name}
                      onChange={e => setReg(p => ({ ...p, name: e.target.value }))}
                      className={cn(inputBase, 'pl-10 text-xs')} placeholder="Full name" required />
                  </div>
                </div>
                <div>
                  <label className={labelBase}>Shop Name</label>
                  <div className="relative">
                    <Store size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" value={reg.shop_name}
                      onChange={e => setReg(p => ({ ...p, shop_name: e.target.value }))}
                      className={cn(inputBase, 'pl-10 text-xs')} placeholder="Ravi Medical" required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Phone Number</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="tel" value={reg.phone}
                      onChange={e => setReg(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                      className={cn(inputBase, 'pl-10 text-xs')} placeholder="9999999999" maxLength={10} required />
                  </div>
                </div>
                <div>
                  <label className={labelBase}>GSTIN (optional)</label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" value={reg.gstin}
                      onChange={e => setReg(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                      className={cn(inputBase, 'pl-10 text-xs')} placeholder="27AAAAA0000A1Z5" />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelBase}>Drug License Number <span className="text-rose-400 lowercase normal-case font-bold">(required)</span></label>
                <div className="relative">
                  <Shield size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="text" value={reg.drug_license_number}
                    onChange={e => setReg(p => ({ ...p, drug_license_number: e.target.value.toUpperCase() }))}
                    className={cn(inputBase, 'pl-10 text-xs')} placeholder="MH-MUM-123456" required />
                </div>
              </div>

              <div>
                <label className={labelBase}>Address (optional)</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="text" value={reg.address}
                    onChange={e => setReg(p => ({ ...p, address: e.target.value }))}
                    className={cn(inputBase, 'pl-10 text-xs')} placeholder="Shop address" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type={showPass ? 'text' : 'password'} value={reg.password}
                      onChange={e => setReg(p => ({ ...p, password: e.target.value }))}
                      className={cn(inputBase, 'pl-10 pr-9 text-xs')} placeholder="Min 6 chars" minLength={6} required />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                      {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelBase}>Confirm Password</label>
                  <div className="relative">
                    <CheckCircle2 size={14} className={cn(
                      'absolute left-3.5 top-1/2 -translate-y-1/2',
                      reg.confirm && reg.confirm === reg.password ? 'text-emerald-500' : 'text-slate-300',
                    )} />
                    <input type={showConfirm ? 'text' : 'password'} value={reg.confirm}
                      onChange={e => setReg(p => ({ ...p, confirm: e.target.value }))}
                      className={cn(inputBase, 'pl-10 pr-9 text-xs')} placeholder="Repeat" required />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                      {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {authError && (
                <p className="text-rose-600 text-xs font-semibold text-center bg-rose-50 border border-rose-100 rounded-xl py-2 px-4">{authError}</p>
              )}

              <button type="submit" disabled={loading}
                className={cn(
                  'w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3 group',
                  loading ? 'bg-slate-100 text-slate-400' : 'text-white hover:shadow-xl hover:scale-[1.01]',
                )}
                style={loading ? {} : { background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)', boxShadow: '0 8px 24px rgba(13,148,136,0.30)' }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
                {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>

              <p className="text-center text-slate-400 text-xs">
                Already have an account?{' '}
                <button type="button"
                  onClick={() => { setMode('LOGIN'); useAuthStore.setState({ authError: null }); }}
                  className="text-teal-600 font-bold hover:underline transition-colors">Sign in</button>
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
