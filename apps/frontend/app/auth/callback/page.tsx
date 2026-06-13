'use client';
import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/auth.store';
import api from '../../../lib/api';

function decodeJwtPayload(token: string): any {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return JSON.parse(atob(padded));
}

function CallbackHandler() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const finalize = async () => {
      try {
        // Tokens are handed off via short-lived httpOnly cookies set by the
        // backend during the OAuth redirect — exchange them here (single use).
        const exchange = await api.post('/auth/oauth/session');
        const { accessToken, refreshToken } = exchange.data.data;

        const payload = decodeJwtPayload(accessToken);
        // Store minimal info from JWT first so the API interceptor has a token
        setAuth(
          { id: payload.sub, email: payload.email, firstName: '', lastName: '', role: payload.role, isVerified: true },
          accessToken,
          refreshToken,
        );
        // Fetch full profile to get firstName, lastName, avatarUrl, telegramId, etc.
        const res = await api.get('/users/me');
        const fullUser = res.data.data;
        setAuth(fullUser, accessToken, refreshToken);

        if (payload.role === 'teacher') router.replace('/teacher/dashboard');
        else if (payload.role === 'admin') router.replace('/admin/dashboard');
        else router.replace('/student/dashboard');
      } catch {
        router.replace('/login?error=oauth_failed');
      }
    };

    void finalize();
  }, [router, setAuth]);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
        <p className="text-gray-500">Completing sign-in...</p>
      </div>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
