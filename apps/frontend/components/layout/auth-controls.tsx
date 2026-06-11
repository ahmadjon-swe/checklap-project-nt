'use client';
import { Sun, Moon, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../../store/theme.store';
import { useLangStore, Lang } from '../../store/lang.store';

const langMeta: Record<Lang, { label: string; flag: string; full: string }> = {
  en: { label: 'EN', flag: '🇺🇸', full: 'English' },
  uz: { label: "O'Z", flag: '🇺🇿', full: "O'zbekcha" },
  ru: { label: 'RU', flag: '🇷🇺', full: 'Русский' },
};

export function AuthControls() {
  const { theme, toggle: toggleTheme } = useThemeStore();
  const { lang, setLang } = useLangStore();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = langMeta[lang];

  return (
    <div className="flex items-center gap-2">
      {/* Language dropdown */}
      <div className="relative" ref={langRef}>
        <button
          type="button"
          onClick={() => setLangOpen((o) => !o)}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 backdrop-blur hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
        >
          <span className="text-sm leading-none">{currentLang.flag}</span>
          <span>{currentLang.label}</span>
          <ChevronDown size={11} className={`text-slate-400 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
        </button>
        <div
          className={`absolute right-0 top-full mt-2 w-44 origin-top-right bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/70 py-1.5 overflow-hidden transition-all duration-200 ${langOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
        >
          {(Object.entries(langMeta) as [Lang, typeof langMeta.en][]).map(([code, meta]) => (
            <button
              key={code}
              type="button"
              onClick={() => { setLang(code); setLangOpen(false); }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
            >
              <span className="text-base">{meta.flag}</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{meta.full}</span>
              {lang === code && <Check size={13} className="ml-auto text-indigo-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 hover:scale-110 active:scale-95"
      >
        {theme === 'dark'
          ? <Sun size={15} className="text-amber-400" />
          : <Moon size={15} />
        }
      </button>
    </div>
  );
}
