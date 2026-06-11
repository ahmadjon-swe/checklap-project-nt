'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import {
  LayoutDashboard, FileText, Users, BarChart2, CreditCard,
  History, BookOpen, LogOut, MessageCircle, ShieldCheck, Wallet,
  Crown, Gem, UserCog,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { usePremiumStore, PlanTier } from '../../store/premium.store';
import { useT } from '../../lib/i18n';
import { useSidebarStore } from '../../store/sidebar.store';

const tierLogoClass: Record<PlanTier, string> = {
  free:       'from-indigo-400 to-violet-500 shadow-indigo-500/30',
  pro:        'from-amber-400 to-orange-500 shadow-amber-500/40',
  enterprise: 'from-rose-900 via-red-700 to-amber-500 shadow-rose-900/50',
};
const tierDotClass: Record<PlanTier, string> = {
  free:       'bg-emerald-400',
  pro:        'bg-amber-400',
  enterprise: 'bg-rose-500',
};
const tierAccentBar: Record<PlanTier, string> = {
  free:       'from-indigo-400 to-violet-500',
  pro:        'from-amber-400 to-orange-500',
  enterprise: 'from-rose-900 via-red-600 to-amber-500',
};
const tierIconActive: Record<PlanTier, string> = {
  free:       'from-indigo-500 to-violet-600 shadow-indigo-500/30',
  pro:        'from-amber-400 to-orange-500 shadow-amber-500/30',
  enterprise: 'from-rose-800 via-red-600 to-amber-500 shadow-rose-800/35',
};
const tierUserCard: Record<PlanTier, string> = {
  free:       'bg-white/[0.03] border-white/[0.05]',
  pro:        'bg-amber-500/[0.07] border-amber-500/[0.15]',
  enterprise: 'bg-rose-900/[0.12] border-rose-700/[0.25]',
};
const tierAvatar: Record<PlanTier, string> = {
  free:       'from-indigo-500 to-violet-600 shadow-indigo-500/20',
  pro:        'from-amber-400 to-orange-500 shadow-amber-500/20',
  enterprise: 'from-rose-800 via-red-700 to-amber-500 shadow-rose-800/25',
};

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { tier } = usePremiumStore();
  const t = useT();

  const teacherNav = [
    { href: '/teacher/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { href: '/teacher/tests',     label: t.nav.tests,     icon: FileText },
    { href: '/teacher/groups',    label: t.nav.groups,    icon: Users },
    { href: '/teacher/analytics', label: t.nav.analytics, icon: BarChart2 },
    { href: '/teacher/subscription', label: t.nav.subscription, icon: CreditCard },
  ];
  const studentNav = [
    { href: '/student/dashboard', label: t.nav.dashboard,      icon: LayoutDashboard },
    { href: '/student/groups',    label: t.nav.myGroups,       icon: Users },
    { href: '/student/tests',     label: t.nav.availableTests, icon: BookOpen },
    { href: '/student/history',   label: t.nav.history,        icon: History },
  ];
  const adminNav = [
    { href: '/admin/dashboard',     label: t.nav.overview,     icon: LayoutDashboard },
    { href: '/admin/users',         label: t.nav.users,        icon: Users },
    { href: '/admin/subscriptions', label: t.nav.subscriptions,icon: ShieldCheck },
    { href: '/admin/payments',      label: t.nav.payments,     icon: Wallet },
  ];

  const nav = user?.role === 'teacher' ? teacherNav : user?.role === 'admin' ? adminNav : studentNav;
  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : '?';

  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 bg-gradient-to-br transition-all duration-500 ${tierLogoClass[tier]}`}>
            <span className="text-white text-xs font-bold tracking-tight">Q</span>
          </div>
          <span className="text-white text-base font-bold tracking-tight">CheckLab</span>
          {tier === 'pro' && (
            <div className="ml-auto flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
              <Crown size={10} className="text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400">PRO</span>
            </div>
          )}
          {tier === 'enterprise' && (
            <div className="ml-auto flex items-center gap-1 bg-violet-500/10 border border-violet-400/20 rounded-full px-2 py-0.5">
              <Gem size={10} className="text-violet-400" />
              <span className="text-[10px] font-bold text-violet-300">ENT</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${tierDotClass[tier]}`} />
          <p className="text-slate-500 text-xs capitalize">{user?.role}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                active ? 'bg-white/[0.08] text-white shadow-sm' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
              }`}
            >
              <div className={`flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-300 flex-shrink-0 ${
                active
                  ? `bg-gradient-to-br shadow-md ${tierIconActive[tier]}`
                  : 'bg-transparent group-hover:bg-white/[0.07]'
              }`}>
                <Icon size={14} className={active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
              </div>
              {label}
              {active && (
                <div className={`ml-auto w-1 h-4 rounded-full bg-gradient-to-b ${tierAccentBar[tier]}`} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
        <Link
          href="/profile"
          onClick={onNavClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01] ${
            pathname.startsWith('/profile') ? 'bg-white/[0.08] text-white'
            : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
          }`}
        >
          <UserCog size={15} />
          {t.nav.profile}
        </Link>

        <Link
          href="/settings/telegram"
          onClick={onNavClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01] ${
            pathname.startsWith('/settings/telegram') ? 'bg-white/[0.08] text-white'
            : user?.telegramId ? 'text-sky-400 hover:bg-white/[0.05]'
            : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
          }`}
        >
          <MessageCircle size={15} />
          {user?.telegramId ? t.nav.telegramLinked : t.nav.telegram}
        </Link>

        <button
          onClick={() => { clearAuth(); router.push('/login'); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all hover:scale-[1.01] active:scale-[0.98]"
        >
          <LogOut size={15} />
          {t.nav.signOut}
        </button>

        {/* User pill */}
        <div className={`flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl border transition-all duration-500 ${tierUserCard[tier]}`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md bg-gradient-to-br transition-all duration-500 ${tierAvatar[tier]}`}>
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const { isOpen, close } = useSidebarStore();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col min-h-screen bg-slate-950 dark:bg-[#070b14] border-r border-white/[0.04] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 flex flex-col bg-slate-950 dark:bg-[#070b14] border-r border-white/[0.04] transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={close}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <SidebarContent onNavClick={close} />
      </aside>
    </>
  );
}
