'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, AlertCircle } from 'lucide-react';
import api from '../../../../lib/api';
import { useT } from '../../../../lib/i18n';
import { useAuthStore } from '../../../../store/auth.store';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { AuthControls } from '../../../../components/layout/auth-controls';

interface TestMeta {
  id: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  questionCount: number;
  hasNotStarted: boolean;
  hasEnded: boolean;
}

export default function GuestTakePage() {
  const { code } = useParams() as { code: string };
  const router = useRouter();
  const t = useT();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const { data: meta, isLoading, isError } = useQuery({
    queryKey: ['public-test', code],
    queryFn: () => api.get(`/sessions/public/${code}`).then((r) => r.data.data as TestMeta),
    retry: false,
  });

  const start = async () => {
    if (!name.trim()) { setError(t.guest.nameRequired); return; }
    setError('');
    setStarting(true);
    try {
      const res = await api.post(`/sessions/public/${code}/start`, { name: name.trim() });
      const { accessToken, guest, session } = res.data.data;
      setAuth({ ...guest, role: 'student' }, accessToken, '');
      router.push(`/student/exam/${session.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || t.guest.notFound);
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12 relative">
      <div className="absolute top-5 right-5 z-20">
        <AuthControls />
      </div>

      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
            <span className="text-white text-sm font-bold">Q</span>
          </div>
          <span className="text-slate-900 dark:text-slate-100 text-lg font-bold">CheckLab</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/70 p-8">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-11 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mt-6" />
            </div>
          ) : isError || !meta ? (
            <div className="text-center py-6">
              <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
              <p className="text-slate-600 dark:text-slate-300">{t.guest.notFound}</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{meta.title}</h1>
              {meta.description && (
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">{meta.description}</p>
              )}

              <div className="flex items-center gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <FileText size={15} />{t.guest.questions(meta.questionCount)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={15} />
                  {meta.timeLimitMinutes ? t.guest.minutes(meta.timeLimitMinutes) : t.guest.noTimeLimit}
                </span>
              </div>

              {meta.hasNotStarted ? (
                <div className="mt-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 text-sm rounded-xl px-4 py-3">
                  {t.guest.notStarted}
                </div>
              ) : meta.hasEnded ? (
                <div className="mt-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
                  {t.guest.ended}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <Input
                    id="name"
                    label={t.guest.yourName}
                    placeholder={t.guest.yourNamePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && start()}
                    error={error || undefined}
                  />
                  <Button onClick={start} disabled={starting} size="lg" className="w-full">
                    {starting ? t.guest.starting : t.guest.start}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
