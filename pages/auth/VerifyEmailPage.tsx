import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailWarning, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmail } = useAuthStore();

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token') || '';
  const roleParam = (searchParams.get('role') || '').toUpperCase();
  const role = useMemo(() => {
    if (roleParam === 'WHOLESALER' || roleParam === 'MAIN_WHOLESALER') {
      return roleParam as 'WHOLESALER' | 'MAIN_WHOLESALER';
    }
    return null;
  }, [roleParam]);

  useEffect(() => {
    const run = async () => {
      if (!token || !role) {
        setStatus('error');
        setMessage('Invalid verification link.');
        return;
      }

      setStatus('loading');
      try {
        await verifyEmail(token, role);
        setStatus('success');
        setMessage('Email verified successfully. You can now log in.');
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Verification failed. The link may be expired.');
      }
    };

    run();
  }, [token, role, verifyEmail]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center">
        {status === 'loading' && (
          <div className="space-y-3">
            <Loader2 className="mx-auto animate-spin text-indigo-600" size={26} />
            <h1 className="text-lg font-bold text-slate-900">Verifying your email...</h1>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
            <h1 className="text-lg font-bold text-slate-900">Email verified</h1>
            <p className="text-sm text-slate-600">{message}</p>
            <button
              type="button"
              onClick={() => navigate(role === 'MAIN_WHOLESALER' ? '/login/main-wholesaler' : '/login/wholesaler')}
              className="w-full mt-2 rounded-xl bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 transition-colors"
            >
              Go to login
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <MailWarning className="mx-auto text-rose-600" size={28} />
            <h1 className="text-lg font-bold text-slate-900">Verification failed</h1>
            <p className="text-sm text-slate-600">{message}</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full mt-2 rounded-xl bg-slate-800 text-white font-semibold py-2.5 hover:bg-black transition-colors"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
