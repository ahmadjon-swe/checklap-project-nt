'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FileText, CheckCircle, BarChart2, TrendingUp, Users, ArrowRight, Plus, Sparkles } from 'lucide-react';
import api from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { usePremiumStore, PlanTier } from '../../../store/premium.store';
import { Card, CardHeader, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

const tierHeadingClass: Record<PlanTier, string> = {
  free:       'text-slate-900 dark:text-slate-100',
  pro:        'text-gold',
  enterprise: 'text-platinum',
};

export default function TeacherDashboard() {
  const t = useT();
  const { tier } = usePremiumStore();
  const { data: overviewRes, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data.data),
  });
  const stats = overviewRes || {};

  const kpis = [
    {
      label: t.teacherDash.totalTests,
      value: stats.totalTests ?? '—',
      icon: FileText,
      gradient: tier === 'pro' ? 'from-amber-400 to-orange-500' : tier === 'enterprise' ? 'from-rose-900 via-red-700 to-amber-400' : 'from-indigo-500 to-indigo-600',
      glow: tier === 'pro' ? 'shadow-amber-500/25' : tier === 'enterprise' ? 'shadow-rose-900/40' : 'shadow-indigo-500/25',
    },
    {
      label: t.teacherDash.published,
      value: stats.publishedTests ?? '—',
      icon: CheckCircle,
      gradient: 'from-emerald-400 to-teal-500',
      glow: 'shadow-emerald-500/25',
    },
    {
      label: t.teacherDash.totalAttempts,
      value: stats.totalAttempts ?? '—',
      icon: BarChart2,
      gradient: 'from-amber-400 to-orange-500',
      glow: 'shadow-amber-500/25',
    },
    {
      label: t.teacherDash.avgScore,
      value: stats.avgScore != null ? `${stats.avgScore}%` : '—',
      icon: TrendingUp,
      gradient: 'from-sky-400 to-blue-500',
      glow: 'shadow-sky-500/25',
    },
  ];

  const quickLinks = [
    { href: '/teacher/tests',    label: t.teacherDash.myTests,    description: t.teacherDash.myTestsDesc,    icon: FileText },
    { href: '/teacher/groups',   label: t.teacherDash.groups,     description: t.teacherDash.groupsDesc,     icon: Users },
    { href: '/teacher/analytics',label: t.teacherDash.analytics,  description: t.teacherDash.analyticsDesc, icon: BarChart2 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Overview</span>
          </div>
          <h1 className={`text-3xl font-bold tracking-tight ${tierHeadingClass[tier]}`}>
            {t.teacherDash.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">{t.teacherDash.subtitle}</p>
        </div>
        <Link href="/teacher/tests/new">
          <Button size="md"><Plus size={15} />{t.teacherDash.newTest}</Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, gradient, glow }) => (
          <Card key={label} hover className="group overflow-hidden">
            <CardContent className="flex items-center gap-4 py-5">
              <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${glow} group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 tracking-tight">
                  {isLoading ? <span className="block w-12 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" /> : value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <Card hover>
        <CardHeader>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.teacherDash.quickLinks}</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickLinks.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-start gap-3.5 p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-800/60 hover:bg-gradient-to-br hover:from-indigo-50/80 hover:to-violet-50/40 dark:hover:from-indigo-950/40 dark:hover:to-violet-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-100 dark:hover:shadow-indigo-950/30"
              >
                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:shadow-indigo-500/25 group-hover:scale-110">
                  <Icon size={15} className="text-slate-500 dark:text-slate-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 mt-0.5 transition-all flex-shrink-0" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
