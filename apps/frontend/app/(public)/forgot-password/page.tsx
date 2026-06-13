'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { KeyRound } from 'lucide-react';
import api from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AuthControls } from '../../../components/layout/auth-controls';

const emailSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const onSendOtp = async (data: EmailForm) => {
    try {
      await api.post('/auth/forgot-password', data);
      setEmail(data.email);
      setStep('reset');
    } catch (err: any) {
      emailForm.setError('root', { message: err.response?.data?.message || 'Failed to send code' });
    }
  };

  const onReset = async (data: ResetForm) => {
    try {
      await api.post('/auth/reset-password', { email, ...data });
      router.push('/login?reset=success');
    } catch (err: any) {
      resetForm.setError('root', { message: err.response?.data?.message || 'Failed to reset password' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-6">
      <div className="absolute top-5 right-5 z-20">
        <AuthControls />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white shadow-md flex items-center justify-center flex-shrink-0">
            <Image src="/logo-icon.png" alt="CheckLab" width={36} height={36} className="w-full h-full object-contain" />
          </div>
          <span className="text-slate-900 dark:text-slate-100 text-lg font-bold">CheckLab</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {step === 'email' ? t.forgotPassword.title : t.forgotPassword.resetTitle}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            {step === 'email'
              ? t.forgotPassword.subtitle
              : t.forgotPassword.resetSubtitle(email)}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={emailForm.handleSubmit(onSendOtp)} className="space-y-5">
            <Input
              {...emailForm.register('email')}
              id="email"
              label={t.forgotPassword.email}
              type="email"
              placeholder="you@example.com"
              error={emailForm.formState.errors.email?.message}
            />
            {emailForm.formState.errors.root && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                {emailForm.formState.errors.root.message}
              </div>
            )}
            <Button type="submit" disabled={emailForm.formState.isSubmitting} size="lg" className="w-full mt-2">
              {emailForm.formState.isSubmitting ? t.forgotPassword.sending : t.forgotPassword.send}
            </Button>
          </form>
        ) : (
          <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-5">
            <Input
              {...resetForm.register('code')}
              id="code"
              label={t.forgotPassword.code}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              error={resetForm.formState.errors.code?.message}
            />
            <Input
              {...resetForm.register('newPassword')}
              id="newPassword"
              label={t.forgotPassword.newPassword}
              type="password"
              placeholder="••••••••"
              error={resetForm.formState.errors.newPassword?.message}
            />
            {resetForm.formState.errors.root && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                {resetForm.formState.errors.root.message}
              </div>
            )}
            <Button type="submit" disabled={resetForm.formState.isSubmitting} size="lg" className="w-full mt-2">
              {resetForm.formState.isSubmitting ? t.forgotPassword.resetting : t.forgotPassword.reset}
            </Button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              {t.forgotPassword.differentEmail}
            </button>
          </form>
        )}

        <div className="mt-8 text-sm text-center">
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            ← {t.forgotPassword.backToSignIn}
          </Link>
        </div>
      </div>
    </div>
  );
}
