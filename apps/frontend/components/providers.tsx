'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryClient } from '../lib/query-client';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { usePremiumStore, PlanTier } from '../store/premium.store';
import api from '../lib/api';

function AppEffects() {
  const theme = useThemeStore((s) => s.theme);
  const tier = usePremiumStore((s) => s.tier);
  const setPlan = usePremiumStore((s) => s.setPlan);
  const user = useAuthStore((s) => s.user);

  // Sync tier class on <html> whenever tier changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('tier-pro', 'tier-enterprise');
    if (tier === 'pro') root.classList.add('tier-pro');
    else if (tier === 'enterprise') root.classList.add('tier-enterprise');
  }, [tier]);

  // After login, fetch real subscription and sync tier so the UI reflects
  // the actual plan rather than whatever was last stored in localStorage.
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'teacher') return; // only teachers have subscriptions
    api.get('/subscriptions/me')
      .then((r) => {
        const sub = r.data?.data;
        if (!sub || sub.status !== 'active') { setPlan('free'); return; }
        const name: string = sub.plan?.name?.toLowerCase() ?? '';
        if (name.includes('enterprise')) setPlan('enterprise' as PlanTier);
        else if (name.includes('premium') || name.includes('pro')) setPlan('pro' as PlanTier);
        else setPlan('free');
      })
      .catch(() => { /* unauthenticated or no sub — leave as-is */ });
  }, [user, setPlan]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppEffects />
      {children}
    </QueryClientProvider>
  );
}
