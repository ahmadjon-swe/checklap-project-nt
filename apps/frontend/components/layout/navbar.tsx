'use client';
import { Sun, Moon, ChevronDown, Check, Crown, Gem, Zap, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../../store/theme.store';
import { useLangStore, Lang } from '../../store/lang.store';
import { usePremiumStore, PlanTier, tierLabel } from '../../store/premium.store';
import { useSidebarStore } from '../../store/sidebar.store';

const langMeta: Record<Lang, { label: string; flag: string; full: string }> = {
  en: { label: 'EN', flag: '🇺🇸', full: 'English' },
  uz: { label: "O'Z", flag: '🇺🇿', full: "O'zbekcha" },
  ru: { label: 'RU', flag: '🇷🇺', full: 'Русский' },
};

const tierConfig: Record<PlanTier, {
  icon: React.ElementType;
  label: string;
  barClass: string;
  btnClass: string;
  badgeClass: string;
}> = {
  free: {
    icon: Zap,
    label: 'Free',
    barClass: '',
    btnClass: 'text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
    badgeClass: '',
  },
  pro: {
    icon: Crown,
    label: 'Pro',
    barClass: 'pro-bar',
    btnClass: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 border border-transparent hover:shadow-amber-500/50 hover:from-amber-300 hover:to-orange-400',
    badgeClass: 'bg-white/20',
  },
  enterprise: {
    icon: Gem,
    label: 'Enterprise',
    barClass: 'enterprise-bar',
    btnClass: 'bg-gradient-to-r from-rose-900 via-red-700 to-amber-500 text-white shadow-lg shadow-rose-900/40 border border-transparent hover:shadow-rose-700/55 hover:from-rose-800 hover:via-red-600 hover:to-amber-400',
    badgeClass: 'bg-white/20',
  },
};

export function Navbar() {
  const { theme, toggle: toggleTheme } = useThemeStore();
  const { lang, setLang } = useLangStore();
  const { tier, setPlan } = usePremiumStore();
  const { toggle: toggleSidebar } = useSidebarStore();
  const [langOpen, setLangOpen] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const tierRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (tierRef.current && !tierRef.current.contains(e.target as Node)) setTierOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = langMeta[lang];
  const currentTier = tierConfig[tier];
  const TierIcon = currentTier.icon;

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 sm:px-6 gap-2 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 relative">
      {/* Tier accent bar */}
      {tier !== 'free' && (
        <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${currentTier.barClass}`} />
      )}

      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200"
        aria-label="Toggle menu"
      >
        <Menu size={16} />
      </button>

      <div className="flex items-center gap-2 ml-auto">

      {/* Language dropdown */}
      <div className="relative" ref={langRef}>
        <button
          onClick={() => { setLangOpen((o) => !o); setTierOpen(false); }}
          className="inline-flex items-center gap-2 h-8 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
        >
          <span className="text-sm leading-none">{currentLang.flag}</span>
          <span>{currentLang.label}</span>
          <ChevronDown size={11} className={`text-slate-400 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
        </button>
        {langOpen && (
          <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/70 py-1.5 overflow-hidden">
            {(Object.entries(langMeta) as [Lang, typeof langMeta.en][]).map(([code, meta]) => (
              <button
                key={code}
                onClick={() => { setLang(code); setLangOpen(false); }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                <span className="text-base">{meta.flag}</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{meta.full}</span>
                {lang === code && <Check size={13} className="ml-auto text-indigo-500" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200 hover:scale-110 active:scale-95"
      >
        {theme === 'dark'
          ? <Sun size={15} className="text-amber-400" />
          : <Moon size={15} />
        }
      </button>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

      {/* Plan selector */}
      <div className="relative" ref={tierRef}>
        <button
          onClick={() => { setTierOpen((o) => !o); setLangOpen(false); }}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold tracking-tight transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${currentTier.btnClass}`}
        >
          <TierIcon size={13} />
          {currentTier.label}
          {tier !== 'free' && (
            <span className={`text-[10px] rounded-md px-1 py-0.5 font-bold ${currentTier.badgeClass}`}>
              {tier.toUpperCase()}
            </span>
          )}
          <ChevronDown size={11} className={`opacity-70 transition-transform duration-200 ${tierOpen ? 'rotate-180' : ''}`} />
        </button>

        {tierOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/70 py-1.5 overflow-hidden">
            <p className="px-4 pt-1 pb-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Switch plan</p>
            {(['free', 'pro', 'enterprise'] as PlanTier[]).map((t) => {
              const cfg = tierConfig[t];
              const Icon = cfg.icon;
              const isActive = tier === t;
              return (
                <button
                  key={t}
                  onClick={() => { setPlan(t); setTierOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    t === 'pro' ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                    : t === 'enterprise' ? 'bg-gradient-to-br from-violet-500 to-blue-400'
                    : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    <Icon size={12} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{tierLabel[t]}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {t === 'free' ? 'Basic features' : t === 'pro' ? '$29/month' : '$99/month'}
                    </p>
                  </div>
                  {isActive && <Check size={14} className="ml-auto text-indigo-500 flex-shrink-0" />}
                </button>
              );
            })}
            <div className="mx-3 my-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <a
                href="/teacher/subscription"
                onClick={() => setTierOpen(false)}
                className="block text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 py-1.5 transition-colors"
              >
                View all plans →
              </a>
            </div>
          </div>
        )}
      </div>

      </div>{/* end ml-auto flex */}
    </header>
  );
}
