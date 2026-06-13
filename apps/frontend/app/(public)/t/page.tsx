'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../../../lib/i18n';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AuthControls } from '../../../components/layout/auth-controls';

export default function EnterCodePage() {
  const router = useRouter();
  const t = useT();
  const [code, setCode] = useState('');

  const go = () => {
    const clean = code.trim().toUpperCase();
    if (clean) router.push(`/t/${clean}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12 relative">
      <div className="absolute top-5 right-5 z-20">
        <AuthControls />
      </div>

      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
            <span className="text-white text-sm font-bold">Q</span>
          </div>
          <span className="text-slate-900 dark:text-slate-100 text-lg font-bold">CheckLab</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/70 p-8">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">{t.guest.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{t.guest.enterCodeTitle}</p>
          <div className="space-y-4">
            <Input
              id="code"
              placeholder={t.guest.enterCodePlaceholder}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              className="text-center tracking-[0.3em] font-mono text-lg uppercase"
            />
            <Button onClick={go} disabled={!code.trim()} size="lg" className="w-full">
              {t.guest.continue}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
