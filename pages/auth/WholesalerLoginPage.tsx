import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import {
    ArrowRight, Lock, Eye, EyeOff,
    User, Phone, Mail, MapPin, CheckCircle2, Briefcase,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { PremiumAnimatedLogo } from '../../components/ui/PremiumAnimatedLogo';
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { firebaseAuth, isFirebasePhoneAuthConfigured, toE164Phone } from '../../utils/firebase';

type Mode = 'LOGIN' | 'REGISTER';

export const WholesalerLoginPage = () => {
    const recaptchaContainerId = 'wholesaler-register-recaptcha';
    const [mode, setMode] = useState<Mode>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [localError, setLocalError] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [firebaseIdToken, setFirebaseIdToken] = useState('');
    const [verificationNotice, setVerificationNotice] = useState('');
    const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
    const [isResendingVerification, setIsResendingVerification] = useState(false);
    const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
    const confirmationRef = useRef<ConfirmationResult | null>(null);

    const [loginId, setLoginId] = useState('');
    const [loginPass, setLoginPass] = useState('');

    const [reg, setReg] = useState({
        name: '', username: '', phone: '', email: '', address: '', password: '', confirm: '',
    });

    const { loginWholesaler, register, resendVerificationEmail, authError } = useAuthStore();
    const { initData } = useDataStore();
    const navigate = useNavigate();

    const clearRecaptcha = () => {
        if (recaptchaRef.current) {
            recaptchaRef.current.clear();
            recaptchaRef.current = null;
        }

        const container = document.getElementById(recaptchaContainerId);
        if (container) {
            container.innerHTML = '';
        }
    };

    const formatFirebaseError = (e: any, fallback: string) => {
        const code = e?.code ? String(e.code) : '';
        const message = e?.message ? String(e.message) : '';
        if (code || message) {
            return `${fallback} (${code || 'unknown'}${message ? `: ${message}` : ''})`;
        }
        return fallback;
    };

    useEffect(() => {
        return () => {
            clearRecaptcha();
        };
    }, []);

    const ensureRecaptcha = async () => {
        if (!firebaseAuth || !isFirebasePhoneAuthConfigured) {
            throw new Error('Phone verification is not configured. Contact support.');
        }

        const container = document.getElementById(recaptchaContainerId);
        if (!container) {
            throw new Error('reCAPTCHA container is missing. Reload the page and try again.');
        }

        if (!recaptchaRef.current) {
            recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, container, {
                size: 'normal',
            });
            await recaptchaRef.current.render();
        }

        return recaptchaRef.current;
    };

    const resetPhoneVerification = () => {
        setOtpCode('');
        setOtpSent(false);
        setPhoneVerified(false);
        setFirebaseIdToken('');
        confirmationRef.current = null;
    };

    const sendOtp = async () => {
        setLocalError('');
        useAuthStore.setState({ authError: null });

        if (!reg.phone || reg.phone.replace(/\D/g, '').length !== 10) {
            setLocalError('Enter a valid 10-digit mobile number first.');
            return;
        }

        setIsSendingOtp(true);
        try {
            const verifier = await ensureRecaptcha();
            const confirmation = await signInWithPhoneNumber(firebaseAuth!, toE164Phone(reg.phone), verifier);
            confirmationRef.current = confirmation;
            setOtpSent(true);
            setPhoneVerified(false);
            setFirebaseIdToken('');
            setLocalError('');
        } catch (e: any) {
            const code = e?.code as string | undefined;
            if (code === 'auth/invalid-app-credential' || code === 'auth/captcha-check-failed') {
                clearRecaptcha();
                setLocalError(formatFirebaseError(e, 'Captcha verification failed. Solve captcha and tap Send OTP again.'));
            } else if (code === 'auth/argument-error') {
                clearRecaptcha();
                setLocalError(formatFirebaseError(e, 'Captcha session expired. Tap Send OTP again.'));
            } else if (code === 'auth/too-many-requests') {
                setLocalError('Too many OTP attempts. Wait a few minutes and try again.');
            } else {
                setLocalError(formatFirebaseError(e, 'Failed to send OTP. Please try again.'));
            }
        } finally {
            setIsSendingOtp(false);
        }
    };

    const verifyOtp = async () => {
        setLocalError('');
        useAuthStore.setState({ authError: null });

        if (!confirmationRef.current) {
            setLocalError('Send OTP first.');
            return;
        }
        if (!otpCode || otpCode.length < 6) {
            setLocalError('Enter the 6-digit OTP.');
            return;
        }

        setIsVerifyingOtp(true);
        try {
            const credential = await confirmationRef.current.confirm(otpCode.trim());
            const idToken = await credential.user.getIdToken();
            setFirebaseIdToken(idToken);
            setPhoneVerified(true);
            await signOut(firebaseAuth!);
        } catch (e: any) {
            setLocalError(e?.message || 'Invalid OTP. Please try again.');
            setPhoneVerified(false);
            setFirebaseIdToken('');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        setVerificationNotice('');
        setLoading(true);
        try {
            await loginWholesaler(loginId.trim(), loginPass);
            const w = useAuthStore.getState().wholesaler;
            initData(w?.id || '', 'WHOLESALER');
            navigate('/app');
        } catch (e: any) {
            if (e?.code === 'EMAIL_NOT_VERIFIED' && e?.email) {
                setPendingVerificationEmail(e.email);
            }
        } finally { setLoading(false); }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        setVerificationNotice('');
        if (reg.password !== reg.confirm) {
            setLocalError('Passwords do not match');
            return;
        }
        if (!reg.email.trim()) {
            setLocalError('Email is required for account verification.');
            return;
        }
        setLoading(true);
        try {
            const result = await register({
                username: reg.username.trim(), password: reg.password,
                name: reg.name.trim(), phone: reg.phone.trim(),
                email: reg.email.trim(), address: reg.address.trim() || undefined,
                firebase_id_token: firebaseIdToken,
            });
            if (result.requires_email_verification) {
                setMode('LOGIN');
                setLoginId(reg.username.trim());
                setPendingVerificationEmail(result.email || reg.email.trim());
                setVerificationNotice(`Verification email sent to ${result.email || reg.email.trim()}. Verify your email, then sign in.`);
            }
        } catch { } finally { setLoading(false); }
    };

    const handleResendVerification = async () => {
        if (!pendingVerificationEmail) return;
        setIsResendingVerification(true);
        setLocalError('');
        setVerificationNotice('');
        try {
            await resendVerificationEmail(pendingVerificationEmail, 'WHOLESALER');
            setVerificationNotice(`Verification email resent to ${pendingVerificationEmail}.`);
        } catch { } finally {
            setIsResendingVerification(false);
        }
    };

    const inputBase =
        'w-full px-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 outline-none transition-all text-slate-800 placeholder-slate-300 text-sm font-medium shadow-sm';

    const labelBase = 'text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 block';

    const verificationState = (() => {
        if (!isFirebasePhoneAuthConfigured) {
            return {
                title: 'Phone OTP unavailable',
                subtitle: 'Firebase phone auth env is missing.',
                className: 'bg-amber-50 text-amber-800 border-amber-200',
            };
        }
        if (phoneVerified) {
            return {
                title: 'Phone verified',
                subtitle: 'You can now register this account.',
                className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            };
        }
        if (isVerifyingOtp) {
            return {
                title: 'Verifying OTP',
                subtitle: 'Please wait while we confirm your code.',
                className: 'bg-sky-50 text-sky-800 border-sky-200',
            };
        }
        if (otpSent) {
            return {
                title: 'OTP sent',
                subtitle: 'Enter the 6-digit code to verify your phone.',
                className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
            };
        }
        if (isSendingOtp) {
            return {
                title: 'Sending OTP',
                subtitle: 'Please wait while we send a verification code.',
                className: 'bg-sky-50 text-sky-800 border-sky-200',
            };
        }
        return {
            title: 'Phone not verified',
            subtitle: 'Verify your number before creating the account.',
            className: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    })();

    return (
        <div className="min-h-screen flex">

            {/* ─── Left: Branding Panel ─── */}
            <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
                style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 40%, #312E81 70%, #1E293B 100%)' }}
            >
                {/* Decorative orbs */}
                <div className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/[0.08] blur-[100px]" />
                <div className="absolute bottom-[5%] right-[-5%] w-[45%] h-[45%] rounded-full bg-blue-500/[0.08] blur-[100px]" />
                <div className="absolute top-[40%] left-[20%] w-[25%] h-[25%] rounded-full bg-violet-500/[0.06] blur-[80px]" />

                <div className="relative z-10">
                    <div style={{ '--color-text-primary': '#ffffff' } as React.CSSProperties}>
                        <PremiumAnimatedLogo size="lg" autoPlay playDelay={500} />
                    </div>
                    <p className="text-indigo-300/60 text-xs font-semibold tracking-[0.3em] uppercase mt-1">Sub-Wholesale Distribution OS</p>
                </div>

                <div className="relative z-10 max-w-md">
                    <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
                        Manage your sub-wholesale<br />distribution, <span className="text-indigo-400">effortlessly.</span>
                    </h2>
                    <p className="text-slate-400 text-base leading-relaxed font-medium">
                        Orders, inventory, payments, retailers — everything you need to run your pharma sub-distribution business, in one place.
                    </p>

                    <div className="mt-10 grid grid-cols-2 gap-4">
                        {[
                            { n: '2.5L+', l: 'Medicines in catalog' },
                            { n: 'Real-time', l: 'Order tracking' },
                            { n: '100%', l: 'Digital ledger' },
                            { n: 'Free', l: 'Forever plan' },
                        ].map(({ n, l }) => (
                            <div key={l} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4">
                                <p className="text-white font-extrabold text-lg">{n}</p>
                                <p className="text-slate-500 text-xs font-semibold mt-0.5">{l}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-slate-600 text-[10px] font-medium tracking-[0.2em]">
                        A product of <span className="text-indigo-400 font-bold">leeep dev</span>
                    </p>
                </div>
            </div>

            {/* ─── Right: Form Panel ─── */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#FAFBFC]">
                <div className="w-full max-w-md">

                    {/* Mobile brand */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <PremiumAnimatedLogo size="md" autoPlay playDelay={250} />
                    </div>

                    <div className="mb-8">
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            {mode === 'LOGIN' ? 'Welcome back' : 'Create your account'}
                        </h1>
                        <p className="text-slate-400 text-sm font-medium mt-1.5">
                            {mode === 'LOGIN'
                                ? 'Sign in to your sub-wholesale dashboard'
                                : 'Register your sub-wholesale business'
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
                                    <input type="text" value={loginId}
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
                                    <input type={showPass ? 'text' : 'password'} value={loginPass}
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
                                <div className="space-y-2">
                                    <p className="text-rose-600 text-xs font-semibold text-center bg-rose-50 border border-rose-100 rounded-xl py-2.5 px-4">{authError}</p>
                                    {pendingVerificationEmail && (
                                        <button
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={isResendingVerification}
                                            className="w-full py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 disabled:opacity-60"
                                        >
                                            {isResendingVerification ? 'Resending verification email...' : `Resend verification email to ${pendingVerificationEmail}`}
                                        </button>
                                    )}
                                </div>
                            )}

                            {verificationNotice && (
                                <p className="text-emerald-700 text-xs font-semibold text-center bg-emerald-50 border border-emerald-100 rounded-xl py-2.5 px-4">{verificationNotice}</p>
                            )}

                            <button type="submit" disabled={loading}
                                className={cn(
                                    'w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3 group mt-2',
                                    loading
                                        ? 'bg-slate-100 text-slate-400'
                                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-xl hover:shadow-indigo-600/20 hover:scale-[1.01]'
                                )}
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
                                    className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors">
                                    Register your business →
                                </button>
                            </p>

                            <p className="text-center text-slate-400 text-xs mt-2">
                                Are you a retailer?{' '}
                                <button type="button" onClick={() => navigate('/login/retailer')}
                                    className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline transition-colors">
                                    Shop login →
                                </button>
                            </p>
                        </form>
                    )}

                    {/* ──── REGISTER ──── */}
                    {mode === 'REGISTER' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className={cn('rounded-xl border px-3 py-2.5', verificationState.className)}>
                                <p className="text-xs font-bold tracking-wide">{verificationState.title}</p>
                                <p className="text-[11px] font-medium mt-0.5 opacity-90">{verificationState.subtitle}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelBase}>Business Name</label>
                                    <div className="relative">
                                        <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input type="text" value={reg.name}
                                            onChange={e => setReg({ ...reg, name: e.target.value })}
                                            className={cn(inputBase, 'pl-10 text-xs')} placeholder="Sai Ram Agencies" required />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelBase}>Username / ID</label>
                                    <div className="relative">
                                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input type="text" value={reg.username}
                                            onChange={e => setReg({ ...reg, username: e.target.value.replace(/\s/g, '') })}
                                            className={cn(inputBase, 'pl-10 text-xs')} placeholder="sairam_dist" required />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelBase}>Mobile Number</label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input type="tel" value={reg.phone}
                                            onChange={e => {
                                                setReg({ ...reg, phone: e.target.value.replace(/\D/g, '') });
                                                resetPhoneVerification();
                                            }}
                                            className={cn(inputBase, 'pl-10 text-xs')} placeholder="9999999999" maxLength={10} required />
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={sendOtp}
                                            disabled={isSendingOtp || !isFirebasePhoneAuthConfigured}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 disabled:opacity-50"
                                        >
                                            {isSendingOtp ? 'Sending OTP...' : (otpSent ? 'Resend OTP' : 'Send OTP')}
                                        </button>
                                        {phoneVerified && <span className="text-[11px] font-semibold text-emerald-600">Phone verified</span>}
                                    </div>
                                    {!isFirebasePhoneAuthConfigured && (
                                        <p className="mt-1 text-[11px] text-amber-600 font-semibold">Firebase phone auth env is missing.</p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelBase}>Email</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input type="email" value={reg.email}
                                            onChange={e => setReg({ ...reg, email: e.target.value })}
                                            className={cn(inputBase, 'pl-10 text-xs')} placeholder="you@business.com" required />
                                    </div>
                                </div>
                            </div>

                            {otpSent && (
                                <div>
                                    <label className={labelBase}>OTP Verification</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className={cn(inputBase, 'text-xs')}
                                            placeholder="Enter 6-digit OTP"
                                            maxLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={verifyOtp}
                                            disabled={isVerifyingOtp || phoneVerified}
                                            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 disabled:opacity-50"
                                        >
                                            {phoneVerified ? 'Verified' : (isVerifyingOtp ? 'Verifying...' : 'Verify OTP')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className={labelBase}>Business Address (optional)</label>
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3.5 top-3.5 text-slate-300" />
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

                            {(localError || authError) && (
                                <p className="text-rose-600 text-xs font-semibold text-center bg-rose-50 border border-rose-100 rounded-xl py-2 px-4">{localError || authError}</p>
                            )}

                            <button type="submit" disabled={loading}
                                className={cn(
                                    'w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3 group',
                                    loading ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-xl hover:shadow-indigo-600/20 hover:scale-[1.01]'
                                )}
                            >
                                {loading ? 'Creating account...' : 'Register & Start'}
                                {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                            </button>

                            <p className="text-center text-slate-400 text-xs">
                                Already registered?{' '}
                                <button type="button"
                                    onClick={() => { setMode('LOGIN'); useAuthStore.setState({ authError: null }); }}
                                    className="text-indigo-600 font-bold hover:underline transition-colors">Sign in</button>
                            </p>
                        </form>
                    )}

                </div>
            </div>
            <div id={recaptchaContainerId} className="mt-3 flex justify-center" />
        </div>
    );
};
