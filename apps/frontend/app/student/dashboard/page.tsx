'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import { Trophy, Target, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { useT } from '../../../lib/i18n';
import { usePremiumStore, PlanTier } from '../../../store/premium.store';
import { Result } from '../../../types';
import { Card, CardHeader, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

const tierNameClass: Record<PlanTier, string> = {
  free:       'bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent',
  pro:        'text-gold',
  enterprise: 'text-platinum',
};

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const { tier } = usePremiumStore();
  const t = useT();

  const { data: resultsRes } = useQuery({
    queryKey: ['my-results'],
    queryFn: () => api.get('/results/my').then((r) => r.data.data as Result[]),
    enabled: !!user,
  });
  const { data: testsRes } = useQuery({
    queryKey: ['available-tests'],
    queryFn: () => api.get('/tests').then((r) => r.data.data),
  });

  const results = resultsRes || [];
  const tests = testsRes || [];
  const avgScore = results.length
    ? (results.reduce((s, r) => s + Number(r.percentage), 0) / results.length).toFixed(1)
    : null;

  const stats = [
    {
      label: t.studentDash.testsTaken,
      value: results.length,
      icon: Trophy,
      gradient: tier === 'pro' ? 'from-amber-400 to-orange-500' : tier === 'enterprise' ? 'from-rose-900 via-red-700 to-amber-400' : 'from-amber-400 to-orange-500',
      glow: tier === 'enterprise' ? 'shadow-rose-900/40' : 'shadow-amber-500/25',
    },
    {
      label: t.studentDash.avgScore,
      value: avgScore ? `${avgScore}%` : '—',
      icon: Target,
      gradient: tier === 'pro' ? 'from-orange-400 to-rose-500' : tier === 'enterprise' ? 'from-rose-900 via-red-700 to-amber-400' : 'from-indigo-500 to-violet-600',
      glow: 'shadow-indigo-500/25',
    },
    {
      label: t.studentDash.availableTests,
      value: tests.length,
      icon: BookOpen,
      gradient: 'from-emerald-400 to-teal-500',
      glow: 'shadow-emerald-500/25',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Student Portal</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.studentDash.welcome},{' '}
          <span className={tierNameClass[tier]}>{user?.firstName}</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">{t.studentDash.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, gradient, glow }) => (
          <Card key={label} hover className="group">
            <CardContent className="flex items-center gap-4 py-5">
              <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${glow} group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 tracking-tight">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {results.length > 0 && (
        <Card hover>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.studentDash.recentResults}</h2>
              <Link href="/student/history" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors group">
                {t.studentDash.viewAll} <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="py-0 divide-y divide-slate-100 dark:divide-slate-800">
            {results.slice(0, 4).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-0 -mx-0 transition-colors rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.testTitle || 'Test'}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{format(new Date(r.computedAt), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{Number(r.percentage).toFixed(1)}%</span>
                  {r.passed != null && (
                    <Badge variant={r.passed ? 'success' : 'destructive'}>{r.passed ? 'Passed' : 'Failed'}</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card hover>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.studentDash.availableTests}</h2>
            <Link href="/student/tests" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors group">
              {t.studentDash.seeAll} <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="py-0 divide-y divide-slate-100 dark:divide-slate-800">
          {tests.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-sm py-5">{t.studentDash.noTests}</p>}
          {tests.slice(0, 4).map((test: any) => (
            <div key={test.id} className="flex items-center justify-between py-3.5">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{test.title}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{test.timeLimitMinutes ? `${test.timeLimitMinutes} min` : 'No time limit'}</p>
              </div>
              <Link href="/student/tests"><Button size="sm">{t.studentDash.start}</Button></Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
