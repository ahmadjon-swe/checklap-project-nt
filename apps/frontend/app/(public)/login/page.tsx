'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, ChevronDown, FlaskConical, ShieldCheck } from 'lucide-react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { useT } from '../../../lib/i18n';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AuthControls } from '../../../components/layout/auth-controls';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@demo.com', password: 'Admin1234!', color: 'from-red-500 to-orange-500', desc: 'Full platform control' },
  { label: 'Moderator', email: 'moderator@demo.com', password: 'Moderator1234!', color: 'from-amber-500 to-orange-500', desc: 'Stats & user management' },
  { label: 'Support', email: 'support@demo.com', password: 'Support1234!', color: 'from-sky-500 to-blue-600', desc: 'Users & subscriptions' },
  { label: 'Teacher', email: 'teacher@demo.com', password: 'Teacher1234!', color: 'from-indigo-500 to-violet-600', desc: 'Create tests & groups' },
  { label: 'Student', email: 'student@demo.com', password: 'Student1234!', color: 'from-emerald-500 to-teal-600', desc: 'Take exams & view results' },
] as const;

const isDev = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const t = useT();
  const [devOpen, setDevOpen] = useState(isDev);
  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data);
      const payload = res.data.data;
      if (payload.requires2FA) {
        setTwoFactorEmail(payload.email);
        return;
      }
      const { accessToken, refreshToken, user } = payload;
      setAuth(user, accessToken, refreshToken);
      if (user.role === 'teacher') router.push('/teacher/dashboard');
      else if (['admin', 'moderator', 'support'].includes(user.role)) router.push('/admin/dashboard');
      else router.push('/student/dashboard');
    } catch (err: any) {
      setError('root', { message: err.response?.data?.message || 'Login failed' });
    }
  };

  const onVerify2FA = async () => {
    if (!twoFactorEmail) return;
    setOtpSubmitting(true);
    setOtpError('');
    try {
      const res = await api.post('/auth/verify-2fa', { email: twoFactorEmail, code: otpCode });
      const { accessToken, refreshToken, user } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      if (user.role === 'teacher') router.push('/teacher/dashboard');
      else if (['admin', 'moderator', 'support'].includes(user.role)) router.push('/admin/dashboard');
      else router.push('/student/dashboard');
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Invalid code');
    } finally {
      setOtpSubmitting(false);
    }
  };

  const fillAccount = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('password', password, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setDevOpen(false);
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Language + theme controls */}
      <div className="absolute top-5 right-5 z-20">
        <AuthControls />
      </div>

      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-14 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-20 w-96 h-96 rounded-full bg-indigo-600/20 blur-[80px]" />
          <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-violet-600/20 blur-[80px]" />
          <div className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full bg-indigo-800/30 blur-[80px]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }}
        />

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white shadow-lg shadow-white/20 flex items-center justify-center flex-shrink-0">
            <Image src="/logo-icon.png" alt="CheckLab" width={36} height={36} className="w-full h-full object-contain" />
          </div>
          <span className="text-white text-lg font-bold tracking-tight">CheckLab</span>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-indigo-300 text-xs font-medium">Trusted by 10,000+ educators</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
            {t.login.tagline}
          </h2>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed max-w-sm">
            {t.login.taglineSub}
          </p>
          <ul className="mt-8 space-y-3.5">
            {t.login.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-slate-300 text-sm">
                <CheckCircle2 size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-slate-600 text-xs">{t.common.copyright(new Date().getFullYear())}</p>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white dark:bg-slate-950 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-white shadow-md flex items-center justify-center flex-shrink-0">
              <Image src="/logo-icon.png" alt="CheckLab" width={32} height={32} className="w-full h-full object-contain" />
            </div>
            <span className="text-slate-900 dark:text-slate-100 text-base font-bold">CheckLab</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {twoFactorEmail ? t.profile.twoFactorStep : t.login.title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              {twoFactorEmail ? t.profile.twoFactorStepDesc(twoFactorEmail) : t.login.subtitle}
            </p>
          </div>

          {/* 2FA panel */}
          {twoFactorEmail && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50">
                <ShieldCheck size={20} className="text-indigo-500 flex-shrink-0" />
                <p className="text-sm text-indigo-700 dark:text-indigo-300">{t.profile.twoFactorDesc}</p>
              </div>
              <Input
                id="otp"
                label={t.profile.verificationCode}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="000000"
              />
              {otpError && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                  {otpError}
                </div>
              )}
              <Button type="button" onClick={onVerify2FA} disabled={otpSubmitting || otpCode.length < 6} size="lg" className="w-full">
                {otpSubmitting ? t.profile.verifying : t.profile.verify}
              </Button>
              <button type="button" onClick={() => { setTwoFactorEmail(null); setOtpCode(''); setOtpError(''); }} className="w-full text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                ← {t.forgotPassword.differentEmail}
              </button>
            </div>
          )}

          {/* Demo accounts panel + login form — hidden during 2FA step */}
          <div className={twoFactorEmail ? 'hidden' : ''}>
          {/* Demo-credentials panel: dev-only. Tree-shaken out of prod builds
              (NEXT_PUBLIC_DEV_MODE is never set in the production image), and
              the demo accounts themselves no longer exist in a prod seed. */}
          {isDev && (
          <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800/50 overflow-hidden bg-white dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setDevOpen((o) => !o)}
              aria-expanded={devOpen}
              className="w-full flex items-center gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors"
            >
              <FlaskConical size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex-1 text-left">
                {t.login.dev.title}
              </span>
              <ChevronDown
                size={13}
                className={`text-amber-500 transition-transform duration-300 ${devOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${devOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="overflow-hidden">
                <div className="px-3 py-2.5 border-t border-amber-100 dark:border-amber-800/30 flex flex-col gap-1.5">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      tabIndex={devOpen ? 0 : -1}
                      onClick={() => fillAccount(acc.email, acc.password)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 hover:shadow-sm transition-all duration-200 text-left group"
                    >
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${acc.color} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                        <span className="text-white text-[10px] font-bold">{acc.label[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{acc.label}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{acc.desc}</p>
                      </div>
                      <span className="ml-auto text-[10px] text-indigo-500 dark:text-indigo-400 font-medium opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0">
                        {t.login.dev.fill} →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              {...register('email')}
              id="email"
              label={t.login.email}
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
            />

            <div className="space-y-1.5">
              <Input
                {...register('password')}
                id="password"
                label={t.login.password}
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
              />
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                  {t.login.forgotPassword}
                </Link>
              </div>
            </div>

            {errors.root && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                {errors.root.message}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full mt-2">
              {isSubmitting ? t.login.signingIn : t.login.signIn}
            </Button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-400">
              <span className="bg-white dark:bg-slate-950 px-3">{t.login.orContinueWith}</span>
            </div>
          </div>

          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/google`}
            className="flex items-center justify-center gap-2.5 w-full border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900/60 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t.login.googleSignIn}
          </a>

          <p className="mt-7 text-sm text-center text-slate-500 dark:text-slate-400">
            {t.login.noAccount}{' '}
            <Link href="/register" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
              {t.login.createOne}
            </Link>
          </p>

          <p className="mt-3 text-sm text-center">
            <Link href="/t" className="text-slate-500 dark:text-slate-400 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {t.guest.haveCode} →
            </Link>
          </p>
          </div>{/* end login form wrapper */}
        </div>
      </div>
    </div>
  );
}
