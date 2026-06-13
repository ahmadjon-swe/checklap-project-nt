'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import api from '../../../lib/api';
import { Test } from '../../../types';
import { useT } from '../../../lib/i18n';

export default function TestsPage() {
  const t = useT();
  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ['tests'],
    queryFn: () => api.get('/tests').then((r) => r.data.data as Test[]),
  });

  const tests = res || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t.testsList.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t.testsList.count(tests.length)}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => refetch()} className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {t.common.refresh}
          </button>
          <Link href="/teacher/tests/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            + {t.testsList.newTest}
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">{t.testsList.emptyTitle}</p>
          <Link href="/teacher/tests/new" className="mt-3 inline-block text-indigo-600 dark:text-indigo-400 font-medium hover:underline">{t.testsList.emptyCta}</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => (
            <div key={test.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{test.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${test.isPublished ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {test.isPublished ? t.testsList.published : t.testsList.draft}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {test.timeLimitMinutes ? t.testsList.minutes(test.timeLimitMinutes) : t.testsList.noTimeLimit}
                  {test.startAt && ` · ${t.testsList.starts(format(new Date(test.startAt), 'MMM d, yyyy'))}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/teacher/tests/${test.id}/questions`} className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  {t.testsList.questions}
                </Link>
                <Link href={`/teacher/tests/${test.id}/results`} className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  {t.testsList.results}
                </Link>
                <Link href={`/teacher/tests/${test.id}`} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  {t.testsList.edit}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
