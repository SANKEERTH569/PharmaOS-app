
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  Building2, Save, Bell, Shield, Mail, Phone, MapPin,
  Crown, Zap, TrendingUp, Check, Loader2, ArrowUpRight, Tag, Clock, Rocket,
} from 'lucide-react';
import api from '../utils/api';

/* ── Plan Request type ────────────────────────────────────────────────────── */
interface PlanReq {
  id: string; current_plan: string; requested_plan: string; status: string;
  coupon_code: string | null; discount_amount: number; final_amount: number;
  admin_note: string | null; created_at: string;
}

/* ── Subscription Sub-Component ───────────────────────────────────────────── */
const SubscriptionTab = ({ wholesaler, updateWholesaler }: {
  wholesaler: any; updateWholesaler: (d: any) => Promise<void>;
}) => {
  const [planLoading, setPlanLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [coupon, setCoupon] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [couponErr, setCouponErr] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [validating, setValidating] = useState(false);
  const [requests, setRequests] = useState<PlanReq[]>([]);

  useEffect(() => {
    api.get('/auth/wholesaler/plan-requests').then(r => setRequests(r.data)).catch(() => { });
  }, []);

  const pendingRequest = requests.find(r => r.status === 'PENDING');

  const validateCoupon = async (code: string, plan: string) => {
    if (!code) { setCouponResult(null); setCouponErr(''); return; }
    setValidating(true); setCouponErr('');
    try {
      const { data } = await api.post('/auth/validate-coupon', { code, plan });
      setCouponResult(data);
    } catch (err: any) {
      setCouponErr(err.response?.data?.error || 'Invalid coupon');
      setCouponResult(null);
    }
    setValidating(false);
  };

  const submitRequest = async (planKey: string) => {
    setPlanLoading(true); setMsg({ text: '', type: '' });
    try {
      await api.post('/auth/wholesaler/plan-request', {
        requested_plan: planKey,
        coupon_code: coupon || undefined,
      });
      setMsg({ text: 'Plan upgrade request submitted! Admin will review and approve it.', type: 'ok' });
      setCoupon(''); setCouponResult(null); setSelectedPlan('');
      const r = await api.get('/auth/wholesaler/plan-requests');
      setRequests(r.data);
    } catch (err: any) {
      setMsg({ text: err.response?.data?.error || 'Failed to submit request', type: 'err' });
    }
    setPlanLoading(false);
  };

  const plans = [
    {
      key: 'starter', label: 'Starter', price: 'Free', priceNote: 'Forever', priceNum: 0,
      icon: Zap, gradient: 'from-slate-600 to-slate-800', border: 'border-slate-200',
      features: ['Up to 10 retailers', 'Basic order management', 'Manual invoicing', 'Email support']
    },
    {
      key: 'growth', label: 'Growth', price: '₹999', priceNote: '/month', priceNum: 999,
      icon: TrendingUp, gradient: 'from-blue-500 to-indigo-600', border: 'border-blue-200', popular: true,
      features: ['Up to 50 retailers', 'Auto invoicing & PDF', 'Ledger & payment tracking', 'Real-time notifications', 'Priority support']
    },
    {
      key: 'pro', label: 'Pro', price: '₹2,499', priceNote: '/month', priceNum: 2499,
      icon: Crown, gradient: 'from-amber-500 to-orange-600', border: 'border-amber-200',
      features: ['Up to 100 retailers', 'Everything in Growth', 'Multi-user access', 'Advanced analytics', 'Returns management', 'Custom invoice branding', '🔍 Medicine Rack Locator']
    },
    {
      key: 'enterprise', label: 'Enterprise', price: '₹4,999', priceNote: '/month', priceNum: 4999,
      icon: Rocket, gradient: 'from-purple-500 to-violet-700', border: 'border-purple-200',
      features: ['Unlimited retailers', 'Everything in Pro', 'API integrations', 'Dedicated account manager', 'Priority onboarding', 'Custom reports & analytics']
    },
  ];

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/[0.04]" />
        <div className="absolute -right-4 -bottom-10 w-24 h-24 rounded-full bg-white/[0.03]" />
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Current Plan</p>
          <h3 className="text-2xl font-extrabold capitalize">{wholesaler?.plan || 'starter'}</h3>
          <p className="text-sm text-slate-400 mt-1">Request an upgrade — admin will verify payment and activate your plan</p>
        </div>
      </div>

      {/* Pending request alert */}
      {pendingRequest && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
          <Clock size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs font-bold text-amber-700">
            You have a pending request to upgrade to <span className="capitalize">{pendingRequest.requested_plan}</span>.
            Waiting for admin approval.
          </p>
        </div>
      )}

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl border ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-xs font-bold ${msg.type === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map(plan => {
          const isCurrent = wholesaler?.plan === plan.key;
          const isSelected = selectedPlan === plan.key;
          const Icon = plan.icon;
          return (
            <div key={plan.key}
              className={`relative bg-white rounded-2xl border-2 ${isCurrent ? 'border-blue-400 ring-2 ring-blue-100' : isSelected ? 'border-emerald-400 ring-2 ring-emerald-100' : plan.border
                } p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer`}
              onClick={() => { if (!isCurrent && !pendingRequest) { setSelectedPlan(plan.key); setCoupon(''); setCouponResult(null); setCouponErr(''); } }}
            >
              {(plan as any).popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-md">
                  Recommended
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-4 px-2.5 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-md">
                  Current
                </span>
              )}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg mb-3`}>
                <Icon size={17} className="text-white" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">{plan.label}</h3>
              <div className="flex items-baseline gap-0.5 mt-1 mb-4">
                <span className="text-xl font-black text-slate-900">{plan.price}</span>
                <span className="text-xs text-slate-400 font-medium">{plan.priceNote}</span>
              </div>
              <div className="space-y-2 mb-5">
                {plan.features.map(f => (
                  <div key={f} className="flex items-start gap-2">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Check size={8} className="text-white" strokeWidth={3} />
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
              {isCurrent ? (
                <div className="w-full py-2.5 text-center text-xs font-bold text-blue-600 bg-blue-50 rounded-xl border border-blue-200">
                  ✓ Active Plan
                </div>
              ) : isSelected ? (
                <div className="w-full py-2.5 text-center text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-200">
                  ✓ Selected
                </div>
              ) : (
                <div className="w-full py-2.5 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  {pendingRequest ? 'Pending Request' : 'Click to Select'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Coupon + Submit area */}
      {selectedPlan && !pendingRequest && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">
            Request upgrade to <span className="capitalize text-blue-600">{selectedPlan}</span>
          </h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Coupon Code (optional)</label>
              <div className="flex gap-2 mt-1">
                <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())}
                  placeholder="e.g. PHARMA20" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
                <button onClick={() => validateCoupon(coupon, selectedPlan)}
                  disabled={!coupon || validating}
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all disabled:opacity-50">
                  {validating ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                </button>
              </div>
              {couponErr && <p className="text-[11px] text-red-500 font-medium mt-1">{couponErr}</p>}
              {couponResult && (
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <Tag size={12} className="text-emerald-500" />
                  <span className="text-emerald-600 font-bold">
                    {couponResult.discount_type === 'PERCENTAGE' ? `${couponResult.discount_value}% off` : `₹${couponResult.discount_value} off`}
                    {' '}— You pay ₹{couponResult.final_amount}/mo
                  </span>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => submitRequest(selectedPlan)} disabled={planLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {planLoading ? <Loader2 size={16} className="animate-spin" /> : (
              <><ArrowUpRight size={16} /> Request Upgrade to {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}</>
            )}
          </button>
          <p className="text-[10px] text-slate-400 text-center">Admin will verify payment and approve your upgrade</p>
        </div>
      )}

      {/* Request history */}
      {requests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Request History</h3>
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${r.status === 'PENDING' ? 'bg-amber-400' : r.status === 'APPROVED' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div>
                  <span className="text-xs font-bold text-slate-700 capitalize">{r.current_plan} → {r.requested_plan}</span>
                  {r.coupon_code && <span className="text-[10px] text-blue-400 ml-2">Code: {r.coupon_code}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${r.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  }`}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-400 text-center font-medium">
        Plans require admin approval. Contact support for custom enterprise plans.
      </p>
    </div>
  );
};

/* ── Main Settings Page ───────────────────────────────────────────────────── */
export const SettingsPage = () => {
  const { wholesaler, updateWholesaler } = useAuthStore();
  const [activeTab, setActiveTab] = useState('PROFILE');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: wholesaler?.name || '',
    phone: wholesaler?.phone || '',
    address: wholesaler?.address || '',
    email: wholesaler?.email || '',
    gstin: wholesaler?.gstin || '',
    dl_number: wholesaler?.dl_number || '',
    bank_name: wholesaler?.bank_name || '',
    bank_account: wholesaler?.bank_account || '',
    ifsc: wholesaler?.ifsc || '',
    upi_id: wholesaler?.upi_id || '',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWholesaler(formData);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-400 text-sm font-medium mt-1">Manage your company profile and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-1">
          <button onClick={() => setActiveTab('PROFILE')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 ${activeTab === 'PROFILE' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Building2 size={18} /> Company Profile
          </button>
          <button onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 ${activeTab === 'NOTIFICATIONS' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Bell size={18} /> Notifications
          </button>
          <button onClick={() => setActiveTab('SECURITY')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 ${activeTab === 'SECURITY' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Shield size={18} /> Security
          </button>
          <button onClick={() => setActiveTab('SUBSCRIPTION')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-all duration-200 ${activeTab === 'SUBSCRIPTION' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Crown size={18} /> Subscription
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'PROFILE' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Basic Information</h2>
              <form onSubmit={handleSave} className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Business Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                      <input type="text" value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                        <input type="tel" value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                        <input type="email" value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="admin@example.com"
                          className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-700" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Office Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3 text-slate-400 w-5 h-5" />
                      <textarea value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={3}
                        className="w-full pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-2">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-4">Business Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">GSTIN</label>
                      <input type="text" value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                        placeholder="e.g. 22AAAAA0000A1Z5"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium uppercase" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Drug License (DL) Number</label>
                      <input type="text" value={formData.dl_number}
                        onChange={(e) => setFormData({ ...formData, dl_number: e.target.value.toUpperCase() })}
                        placeholder="e.g. MH-MZ5-123456"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium uppercase" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-2">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-4">Banking Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Name</label>
                      <input type="text" value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="e.g. HDFC Bank"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Account Number</label>
                      <input type="text" value={formData.bank_account}
                        onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                        placeholder="e.g. 50100234567890"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">IFSC Code</label>
                      <input type="text" value={formData.ifsc}
                        onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                        placeholder="e.g. HDFC0001234"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium uppercase" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">UPI ID</label>
                      <input type="text" value={formData.upi_id}
                        onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                        placeholder="e.g. business@upi"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4 border-t border-slate-100 mt-8 pt-8">
                  <button type="submit"
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
                    <Save size={18} /> Save Changes
                  </button>
                  {success && <span className="text-emerald-600 text-sm font-bold animate-in fade-in">Profile Updated!</span>}
                </div>
              </form>
            </div>
          )}

          {activeTab === 'NOTIFICATIONS' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {['New Order Received', 'Payment Confirmation', 'Low Stock Alert', 'Daily Summary Report'].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                    <span className="font-medium text-slate-700">{item}</span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={true} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center py-20">
              <Shield size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">Security Settings</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">Password management and 2FA settings are managed by your system administrator.</p>
            </div>
          )}

          {activeTab === 'SUBSCRIPTION' && (
            <SubscriptionTab wholesaler={wholesaler} updateWholesaler={updateWholesaler} />
          )}
        </div>
      </div>
    </div>
  );
};
