import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Lock, Building2, MapPin, Briefcase, ChevronDown, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const SalesmanRegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    username: '',
    password: '',
    company_name: '',
    employee_id: '',
    territory: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { salesmanRegister } = useAuthStore();
  const navigate = useNavigate();
  
  const [companies, setCompanies] = useState<string[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  React.useEffect(() => {
    fetch('/companies.json')
      .then(res => res.json())
      .then(data => setCompanies(data))
      .catch(err => console.error('Failed to load companies dataset', err));
  }, []);

  const filteredCompanies = companies.filter(c => 
    c.toLowerCase().includes(companySearch.toLowerCase())
  ).slice(0, 50); // limit to 50 for performance

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await salesmanRegister({
        ...formData,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        username: formData.username.trim(),
        company_name: formData.company_name.trim(),
        employee_id: formData.employee_id.trim(),
        territory: formData.territory.trim(),
      });
      navigate('/salesman/connect');
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-600 rounded-b-[4rem] opacity-10" />
      <div className="absolute top-20 right-10 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20" />
      <div className="absolute bottom-20 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-20" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
            <User size={32} className="text-white" />
          </div>
          <h2 className="text-center text-3xl font-black text-slate-900 tracking-tight">
            Field Force Rep
          </h2>
          <p className="mt-2 text-center text-sm font-bold text-slate-500 tracking-wide uppercase">
            Platform Registration
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-xl py-8 px-6 shadow-xl rounded-3xl border border-white sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-bold text-rose-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input required name="name" type="text"
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-0 focus:border-blue-600 focus:bg-white transition-colors"
                    placeholder="John Doe" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Phone *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input required name="phone" type="tel"
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-0 focus:border-blue-600 focus:bg-white transition-colors"
                    placeholder="10-digit number" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Username *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold text-lg leading-none mt-0.5">@</span>
                  </div>
                  <input required name="username" type="text"
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-0 focus:border-blue-600 focus:bg-white transition-colors"
                    placeholder="johndoe" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input required name="password" type="password"
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-0 focus:border-blue-600 focus:bg-white transition-colors"
                    placeholder="••••••••" />
                </div>
              </div>
            </div>

            <div className="my-6 border-b border-slate-200" />

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Pharma Company *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <Building2 className="h-4 w-4 text-slate-400" />
                </div>
                <input required type="text"
                  value={companySearch}
                  onChange={e => {
                    setCompanySearch(e.target.value);
                    setFormData({ ...formData, company_name: e.target.value });
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
                  className="appearance-none block w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-0 focus:border-blue-600 focus:bg-white transition-colors"
                  placeholder="Search and select company..." />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none z-10">
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
                
                {showCompanyDropdown && companySearch.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredCompanies.length > 0 ? (
                      <ul className="py-1">
                        {filteredCompanies.map(comp => (
                          <li key={comp}
                            onMouseDown={() => {
                              setCompanySearch(comp);
                              setFormData({ ...formData, company_name: comp });
                              setShowCompanyDropdown(false);
                            }}
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between group"
                          >
                            <span className="text-sm font-semibold text-slate-700">{comp}</span>
                            {formData.company_name === comp && <Check size={14} className="text-blue-600" />}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500 font-medium">
                        No companies found matching "{companySearch}". You can still proceed with this custom name.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5 ml-1">Dataset loaded from 250k medicines registry.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Employee / MR Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                  </div>
                  <input name="employee_id" type="text"
                    onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-0 focus:border-blue-600 focus:bg-white transition-colors"
                    placeholder="Optional" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Territory</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <input name="territory" type="text"
                    onChange={e => setFormData({ ...formData, territory: e.target.value })}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border-2 border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:ring-0 focus:border-blue-600 focus:bg-white transition-colors"
                    placeholder="e.g. City North" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-base font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {loading ? 'Creating Account...' : 'Register & Continue'}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-sm font-semibold text-slate-600">
                Already have an account?{' '}
                <Link to="/login/salesman" className="font-black text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
