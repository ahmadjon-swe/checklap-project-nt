'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import api from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AuthControls } from '../../../components/layout/auth-controls';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'teacher']),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();
  const [registered, setRegistered] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/register', data);
      setRegistered(true);
    } catch (err: any) {
      setError('root', { message: err.response?.data?.message || 'Registration failed' });
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative">
        <div className="absolute top-5 right-5 z-20">
          <AuthControls />
        </div>
        <div className="w-full max-w-sm bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/80 p-10 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30">
            <Mail size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">{t.register.checkEmail}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-7 leading-relaxed">{t.register.checkEmailSub}</p>
          <Link href="/verify-email">
            <Button size="lg" className="w-full">{t.register.enterCode}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Language + theme controls */}
      <div className="absolute top-5 right-5 z-20">
        <AuthControls />
      </div>

      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-14 bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950">
        {/* Aurora blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 w-80 h-80 rounded-full bg-violet-600/25 blur-[80px]" />
          <div className="absolute top-1/2 -right-10 w-64 h-64 rounded-full bg-indigo-500/20 blur-[70px]" />
          <div className="absolute -bottom-10 left-0 w-72 h-72 rounded-full bg-indigo-800/30 blur-[80px]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <span className="text-white text-sm font-bold tracking-tight">Q</span>
          </div>
          <span className="text-white text-lg font-bold tracking-tight">CheckLab</span>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-violet-300 text-xs font-medium">Free to get started</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
            {t.register.tagline}
          </h2>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed max-w-sm">
            {t.register.taglineSub}
          </p>
          <ul className="mt-8 space-y-3.5">
            {t.register.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-slate-300 text-sm">
                <CheckCircle2 size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <span className="text-white text-xs font-bold">Q</span>
            </div>
            <span className="text-slate-900 dark:text-slate-100 text-base font-bold">CheckLab</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t.register.title}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">{t.register.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Input
                {...register('firstName')}
                id="firstName"
                label={t.register.firstName}
                error={errors.firstName?.message}
              />
              <Input
                {...register('lastName')}
                id="lastName"
                label={t.register.lastName}
                error={errors.lastName?.message}
              />
            </div>

            <Input
              {...register('email')}
              id="email"
              label={t.register.email}
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
            />

            <Input
              {...register('password')}
              id="password"
              label={t.register.password}
              type="password"
              placeholder={t.register.passwordPlaceholder}
              error={errors.password?.message}
            />

            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5 tracking-tight">{t.register.iAm}</p>
              <div className="grid grid-cols-2 gap-3">
                {(['student', 'teacher'] as const).map((role) => (
                  <label key={role} className="relative flex cursor-pointer">
                    <input {...register('role')} type="radio" value={role} className="sr-only peer" />
                    <div className="w-full py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-center text-sm font-semibold text-slate-600 dark:text-slate-300 capitalize peer-checked:border-indigo-500 peer-checked:bg-indigo-50 dark:peer-checked:bg-indigo-950/60 peer-checked:text-indigo-700 dark:peer-checked:text-indigo-300 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600">
                      {role === 'student' ? t.register.student : t.register.teacher}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {errors.root && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                {errors.root.message}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full mt-2">
              {isSubmitting ? t.register.creatingAccount : t.register.createAccount}
            </Button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-400">
              <span className="bg-white dark:bg-slate-950 px-3">{t.common.or}</span>
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
            {t.register.googleSignUp}
          </a>

          <p className="mt-7 text-sm text-center text-slate-500 dark:text-slate-400">
            {t.register.alreadyHave}{' '}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
              {t.register.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
