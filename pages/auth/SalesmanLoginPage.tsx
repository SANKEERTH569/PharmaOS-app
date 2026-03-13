import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ArrowRight, Lock, Eye, EyeOff, User, Briefcase } from 'lucide-react';
import { cn } from '../../utils/cn';

export const SalesmanLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const { loginSalesman, authError } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginSalesman(username.trim(), password);
      navigate('/salesman');
    } catch {
      // auth error is handled by store and shown on screen
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full px-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-300 outline-none transition-all text-slate-800 placeholder-slate-300 text-sm font-medium shadow-sm';

  const labelBase = 'text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 block';

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(140deg, #082f49 0%, #0f766e 45%, #115e59 70%, #134e4a 100%)' }}
      >
        <div className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] rounded-full bg-cyan-400/[0.10] blur-[100px]" />
        <div className="absolute bottom-[5%] right-[-5%] w-[45%] h-[45%] rounded-full bg-emerald-400/[0.10] blur-[100px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <span className="text-white font-black text-xl leading-none">P</span>
            </div>
            <span className="text-white font-extrabold text-2xl tracking-tight">PharmaOS</span>
          </div>
          <p className="text-cyan-200/60 text-xs font-semibold tracking-[0.3em] uppercase mt-1">MR Field App</p>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Salesman login for<br />
            <span className="text-cyan-300">field execution.</span>
          </h2>
          <p className="text-cyan-100/70 text-base leading-relaxed font-medium">
            Access your beat routes, place retailer orders, and submit call reports from one MR dashboard.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { n: 'Beat Routes', l: 'Daily planning' },
              { n: 'Order Taking', l: 'Fast billing support' },
              { n: 'Collections', l: 'Track recoveries' },
              { n: 'Call Reports', l: 'Daily reporting' },
            ].map(({ n, l }) => (
              <div key={l} className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4">
                <p className="text-white font-extrabold text-sm">{n}</p>
                <p className="text-cyan-100/50 text-xs font-semibold mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-cyan-100/30 text-[10px] font-medium tracking-[0.2em]">MR OPERATIONS PORTAL</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#F8FAFC]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-600 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-lg leading-none">P</span>
            </div>
            <span className="text-slate-900 font-extrabold text-xl tracking-tight">PharmaOS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Salesman Sign In</h1>
            <p className="text-slate-400 text-sm font-medium mt-1.5">Login to access your MR dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className={labelBase}>Username</label>
              <div className="relative">
                <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cn(inputBase, 'pl-11')}
                  placeholder="mr_username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className={labelBase}>Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(inputBase, 'pl-11 pr-12')}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {authError && (
              <p className="text-rose-600 text-xs font-semibold text-center bg-rose-50 border border-rose-100 rounded-xl py-2.5 px-4">{authError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3 group mt-2',
                loading
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white hover:shadow-xl hover:shadow-cyan-600/20 hover:scale-[1.01]'
              )}
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
            </button>

            <button
              type="button"
              onClick={() => navigate('/register/salesman')}
              className="w-full py-3.5 rounded-2xl border border-cyan-200 bg-cyan-50/60 text-cyan-700 font-bold text-sm hover:bg-cyan-100/70 transition-colors"
            >
              New MR? Create account
            </button>

            <p className="text-center text-slate-400 text-xs mt-2">
              Are you a sub-wholesaler?{' '}
              <button
                type="button"
                onClick={() => navigate('/login/wholesaler')}
                className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors"
              >
                Sub-wholesaler login →
              </button>
            </p>

            <p className="text-center text-slate-400 text-xs mt-1">
              Back to{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-slate-600 font-bold hover:text-slate-800 hover:underline transition-colors"
              >
                role selection
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
