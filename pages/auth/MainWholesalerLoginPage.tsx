import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Lock, Eye, EyeOff,
  User, Phone, MapPin, CheckCircle2, Building2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

type Mode = 'LOGIN' | 'REGISTER';

export const MainWholesalerLoginPage = () => {
  const navigate = useNavigate();
  const { loginMainWholesaler, registerMainWholesaler, isLoading, authError } = useAuthStore();

  const [mode, setMode] = useState<Mode>('LOGIN');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [reg, setReg] = useState({
    name: '', username: '', phone: '', address: '', gstin: '', password: '', confirm: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!loginId || !loginPass) { setLocalError('Please enter username and password.'); return; }
    setLoading(true);
    try {
      await loginMainWholesaler(loginId.trim(), loginPass);
      navigate('/wholesaler');
    } catch { } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!reg.name || !reg.username || !reg.phone || !reg.password) {
      setLocalError('Business name, username, phone and password are required.'); return;
    }
    if (reg.password.length < 6) { setLocalError('Password must be at least 6 characters.'); return; }
    if (reg.password !== reg.confirm) { setLocalError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await registerMainWholesaler({
        username: reg.username.trim(),
        password: reg.password,
        name: reg.name.trim(),
        phone: reg.phone.trim(),
        address: reg.address.trim() || undefined,
        gstin: reg.gstin.trim() || undefined,
      });
      navigate('/wholesaler');
    } catch { } finally { setLoading(false); }
  };

  const error = localError || authError;

  const inputBase =
    'w-full px-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 outline-none transition-all text-slate-800 placeholder-slate-300 text-sm font-medium shadow-sm';

  const labelBase = 'text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 block';

  return (
    <div className="min-h-screen flex">

      {/* ─── Left: Branding Panel ─── */}
      <div
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #200D40 40%, #3B0764 70%, #1E293B 100%)' }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] rounded-full bg-violet-500/[0.10] blur-[100px]" />
        <div className="absolute bottom-[5%] right-[-5%] w-[45%] h-[45%] rounded-full bg-purple-500/[0.08] blur-[100px]" />
        <div className="absolute top-[40%] left-[20%] w-[25%] h-[25%] rounded-full bg-fuchsia-500/[0.06] blur-[80px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <span className="text-white font-black text-xl leading-none">P</span>
            </div>
            <span className="text-white font-extrabold text-2xl tracking-tight">PharmaOS</span>
          </div>
          <p className="text-violet-300/60 text-xs font-semibold tracking-[0.3em] uppercase mt-1">
            Wholesale Distribution OS
          </p>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Power the entire<br />pharma supply chain.{' '}
            <span className="text-violet-400">From the top.</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed font-medium">
            Accept orders from sub-wholesalers, manage dispatch, and track deliveries — all in one command centre.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { n: 'Supply Orders', l: 'Accept & dispatch' },
              { n: 'Live Pipeline', l: 'Pending → Delivered' },
              { n: 'Sub-wholesalers', l: 'Who orders from you' },
              { n: 'Full Visibility', l: 'End-to-end tracking' },
            ].map(({ n, l }) => (
              <div key={n} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4">
                <p className="text-white font-extrabold text-sm">{n}</p>
                <p className="text-slate-500 text-xs font-semibold mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-600 text-[10px] font-medium tracking-[0.2em]">
            A product of <span className="text-violet-400 font-bold">leeep dev</span>
          </p>
        </div>
      </div>

      {/* ─── Right: Form Panel ─── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#FAFBFC]">
        <div className="w-full max-w-md">

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md">
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
                ? 'Sign in to your wholesale dashboard'
                : 'Register your wholesale business on PharmaOS'
              }
            </p>
          </div>

          {/* ──── LOGIN ──── */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className={labelBase}>Username / Business ID</label>
                <div className="relative">
                  <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text" value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    className={cn(inputBase, 'pl-11')}
                    placeholder="your_business_id" required autoFocus
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

              {error && (
                <p className="text-rose-600 text-xs font-semibold text-center bg-rose-50 border border-rose-100 rounded-xl py-2.5 px-4">{error}</p>
              )}

              <button type="submit" disabled={loading || isLoading}
                className={cn(
                  'w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3 group mt-2',
                  (loading || isLoading)
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:shadow-xl hover:shadow-violet-600/20 hover:scale-[1.01]'
                )}
              >
                {(loading || isLoading) ? 'Signing in...' : 'Sign In'}
                {!(loading || isLoading) && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>

              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <p className="text-center text-slate-400 text-xs">
                New here?{' '}
                <button type="button"
                  onClick={() => { setMode('REGISTER'); setLocalError(''); }}
                  className="text-violet-600 font-bold hover:text-violet-700 hover:underline transition-colors">
                  Register your business →
                </button>
              </p>
              <p className="text-center text-slate-400 text-xs mt-2">
                Are you a sub-wholesaler?{' '}
                <button type="button" onClick={() => navigate('/login/wholesaler')}
                  className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors">
                  Sub-wholesale login →
                </button>
              </p>
            </form>
          )}

          {/* ──── REGISTER ──── */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Business Name</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" value={reg.name}
                      onChange={e => setReg({ ...reg, name: e.target.value })}
                      className={cn(inputBase, 'pl-10 text-xs')} placeholder="Apex Pharma Dist." required />
                  </div>
                </div>
                <div>
                  <label className={labelBase}>Username / ID</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" value={reg.username}
                      onChange={e => setReg({ ...reg, username: e.target.value.replace(/\s/g, '') })}
                      className={cn(inputBase, 'pl-10 text-xs')} placeholder="apex_dist" required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Mobile Number</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="tel" value={reg.phone}
                      onChange={e => setReg({ ...reg, phone: e.target.value.replace(/\D/g, '') })}
                      className={cn(inputBase, 'pl-10 text-xs')} placeholder="9999999999" maxLength={10} required />
                  </div>
                </div>
                <div>
                  <label className={labelBase}>GSTIN (optional)</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" value={reg.gstin}
                      onChange={e => setReg({ ...reg, gstin: e.target.value.toUpperCase() })}
                      className={cn(inputBase, 'pl-10 text-xs')} placeholder="27AAAAA0000A1Z5" />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelBase}>Business Address (optional)</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="text" value={reg.address}
                    onChange={e => setReg({ ...reg, address: e.target.value })}
                    className={cn(inputBase, 'pl-10 text-xs')} placeholder="12-5, Pharma Plaza, Hyderabad" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type={showPass ? 'text' : 'password'} value={reg.password}
                      onChange={e => setReg({ ...reg, password: e.target.value })}
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
                      onChange={e => setReg({ ...reg, confirm: e.target.value })}
                      className={cn(inputBase, 'pl-10 pr-9 text-xs')} placeholder="Repeat" required />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                      {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-rose-600 text-xs font-semibold text-center bg-rose-50 border border-rose-100 rounded-xl py-2 px-4">{error}</p>
              )}

              <button type="submit" disabled={loading || isLoading}
                className={cn(
                  'w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3 group',
                  (loading || isLoading) ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:shadow-xl hover:shadow-violet-600/20 hover:scale-[1.01]'
                )}
              >
                {(loading || isLoading) ? 'Creating account...' : 'Register & Start'}
                {!(loading || isLoading) && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
              </button>

              <p className="text-center text-slate-400 text-xs">
                Already registered?{' '}
                <button type="button"
                  onClick={() => { setMode('LOGIN'); setLocalError(''); }}
                  className="text-violet-600 font-bold hover:underline transition-colors">Sign in</button>
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
