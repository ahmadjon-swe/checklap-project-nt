'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import api from '../../../lib/api';

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Code must be 6 digits'),
});
type FormData = z.infer<typeof schema>;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/verify-email', data);
      setVerified(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError('root', { message: err.response?.data?.message || 'Verification failed' });
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-slate-100">Email verified!</h2>
          <p className="text-gray-500 dark:text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Verify your email</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-6">Enter the 6-digit code we sent to your email.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Verification code</label>
            <input
              {...register('code')}
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
            />
            {errors.code && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.code.message}</p>}
          </div>

          {errors.root && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm rounded-lg p-3">
              {errors.root.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Verifying...' : 'Verify email'}
          </button>
        </form>

        <div className="mt-4 text-sm text-center text-gray-500 dark:text-slate-400">
          Already verified?{' '}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
