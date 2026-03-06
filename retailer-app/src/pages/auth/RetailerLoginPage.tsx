import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Lock, Eye, EyeOff, Store, User, Phone,
  MapPin, ShoppingBag, Truck, CreditCard, Shield, FileText, ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { cn } from '../../utils/cn';

type Mode = 'LOGIN' | 'REGISTER';

export const RetailerLoginPage = () => {
  const [mode, setMode] = useState<Mode>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [reg, setReg] = useState({
    name: '', shop_name: '', phone: '', address: '', gstin: '', password: '', confirm: '',
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
        address: reg.address.trim() || undefined, gstin: reg.gstin.trim() || undefined,
      });
      navigate('/shop/setup-agencies');
    } catch {} finally { setLoading(false); }
  };

  const features = [
    { icon: ShoppingBag, label: 'Browse 2.5L+ medicines', desc: 'Largest pharmaceutical catalog' },
    { icon: Truck, label: 'Real-time tracking', desc: 'Know exactly where your order is' },
    { icon: CreditCard, label: 'Credit management', desc: 'Track balances & payments' },
    { icon: Shield, label: 'Secure platform', desc: 'Your data is always safe' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel — Features (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Store size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">PharmaBridge</span>
          </div>
          <p className="text-blue-200 text-sm mt-1">Retailer Portal</p>
        </div>

        <div className="relative space-y-6 my-auto">
          <h2 className="text-3xl font-bold text-white leading-tight">Order medicines<br />with confidence</h2>
          <div className="space-y-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
                  className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-blue-200" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.label}</p>
                    <p className="text-xs text-blue-200">{f.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <p className="relative text-xs text-blue-300">&copy; {new Date().getFullYear()} PharmaBridge. All rights reserved.</p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Store size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">PharmaBridge</span>
          </div>

          {/* No back button on mobile standalone app */}

          <AnimatePresence mode="wait">
            {mode === 'LOGIN' ? (
              <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
                <p className="text-sm text-slate-500 mt-1 mb-6">Sign in to your retailer account</p>

                {authError && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs px-3 py-2 rounded-xl mb-4">{authError}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Phone size={10} /> Phone</label>
                    <input value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="Enter phone number" required
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Lock size={10} /> Password</label>
                    <div className="relative">
                      <input value={loginPass} onChange={e => setLoginPass(e.target.value)} type={showPass ? 'text' : 'password'} placeholder="Enter password" required
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-3 pr-10 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Sign In <ArrowRight size={16} /></>}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                  Don't have an account?{' '}
                  <button onClick={() => { setMode('REGISTER'); useAuthStore.setState({ authError: null }); }}
                    className="text-blue-600 font-semibold hover:text-blue-800 transition-colors">Create Account</button>
                </p>
              </motion.div>
            ) : (
              <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="text-2xl font-bold text-slate-800">Create Account</h1>
                <p className="text-sm text-slate-500 mt-1 mb-6">Register your pharmacy to start ordering</p>

                {authError && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs px-3 py-2 rounded-xl mb-4">{authError}</div>}

                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><User size={10} /> Name</label>
                      <input value={reg.name} onChange={e => setReg(p => ({ ...p, name: e.target.value }))} placeholder="Full name" required
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Store size={10} /> Shop Name</label>
                      <input value={reg.shop_name} onChange={e => setReg(p => ({ ...p, shop_name: e.target.value }))} placeholder="Shop name" required
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Phone size={10} /> Phone</label>
                    <input value={reg.phone} onChange={e => setReg(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" required
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={10} /> Address</label>
                    <input value={reg.address} onChange={e => setReg(p => ({ ...p, address: e.target.value }))} placeholder="Business address (optional)"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><FileText size={10} /> GSTIN</label>
                    <input value={reg.gstin} onChange={e => setReg(p => ({ ...p, gstin: e.target.value }))} placeholder="GST number (optional)"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Lock size={10} /> Password</label>
                      <input value={reg.password} onChange={e => setReg(p => ({ ...p, password: e.target.value }))} type="password" placeholder="Password" required
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Lock size={10} /> Confirm</label>
                      <input value={reg.confirm} onChange={e => setReg(p => ({ ...p, confirm: e.target.value }))} type="password" placeholder="Confirm" required
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" />
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm mt-2">
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-4">
                  Already have an account?{' '}
                  <button onClick={() => { setMode('LOGIN'); useAuthStore.setState({ authError: null }); }}
                    className="text-blue-600 font-semibold hover:text-blue-800 transition-colors">Sign In</button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
