'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users, FileText, BarChart2, CreditCard,
  ArrowRight, ShieldCheck, Wallet, Sparkles, TrendingUp,
} from 'lucide-react';
import api from '../../../lib/api';
import { Card, CardHeader, CardContent } from '../../../components/ui/card';

export default function AdminDashboard() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r: any) => r.data.data),
  });
  const stats = res || {};

  const kpis = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      gradient: 'from-indigo-500 to-violet-600',
      glow: 'shadow-indigo-500/25',
      href: '/admin/users',
    },
    {
      label: 'Total Tests',
      value: stats.totalTests,
      icon: FileText,
      gradient: 'from-emerald-400 to-teal-500',
      glow: 'shadow-emerald-500/25',
      href: null,
    },
    {
      label: 'Total Attempts',
      value: stats.totalResults,
      icon: BarChart2,
      gradient: 'from-amber-400 to-orange-500',
      glow: 'shadow-amber-500/25',
      href: null,
    },
    {
      label: 'Active Subscriptions',
      value: stats.activeSubscriptions,
      icon: CreditCard,
      gradient: 'from-sky-400 to-blue-500',
      glow: 'shadow-sky-500/25',
      href: '/admin/subscriptions',
    },
  ];

  const quickActions = [
    {
      href: '/admin/payments',
      label: 'Pending Payments',
      description: 'Review and approve manual payment requests',
      icon: Wallet,
    },
    {
      href: '/admin/users',
      label: 'Manage Users',
      description: 'Activate, deactivate or change user roles',
      icon: Users,
    },
    {
      href: '/admin/subscriptions',
      label: 'Subscriptions',
      description: 'Monitor active and expired plan subscriptions',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Admin</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Overview
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
          Platform-wide stats and quick actions
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, gradient, glow, href }) => (
          <Card key={label} hover className="group overflow-hidden">
            <CardContent className="flex items-center gap-4 py-5">
              <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${glow} group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 tracking-tight">
                  {isLoading
                    ? <span className="block w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                    : (value ?? '—')}
                </p>
                {href && (
                  <Link href={href} className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 mt-0.5 block transition-colors">
                    View all →
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform health */}
      <Card hover>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Platform Health
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map(({ href, label, description, icon: Icon }) => (
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
