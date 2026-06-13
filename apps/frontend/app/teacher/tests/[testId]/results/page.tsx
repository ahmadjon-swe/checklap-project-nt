'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import api from '../../../../../lib/api';
import { useT } from '../../../../../lib/i18n';

export default function TestResultsPage() {
  const { testId } = useParams<{ testId: string }>();
  const t = useT();

  const { data, isLoading } = useQuery({
    queryKey: ['test-results', testId],
    queryFn: () => api.get(`/analytics/tests/${testId}`).then((r) => r.data.data),
  });

  const results = data?.results || [];

  const exportCsv = async () => {
    const token = localStorage.getItem('accessToken');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    const res = await fetch(`${baseUrl}/analytics/tests/${testId}/export-csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-${testId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t.results.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t.results.count(results.length)}</p>
        </div>
        {results.length > 0 && (
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={15} />
            {t.results.exportCsv}
          </button>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {([
            [t.results.avgScore, data.avgScore != null ? `${Number(data.avgScore).toFixed(1)}%` : '—'],
            [t.results.passRate, data.passRate != null ? `${Number(data.passRate).toFixed(1)}%` : '—'],
            [t.results.totalAttempts, data.totalAttempts ?? '—'],
          ] as [string, string | number][]).map(([label, value]) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
        ))}</div>
      ) : results.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">{t.results.noSubmissions}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-5 px-5 py-3 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>{t.results.student}</span>
            <span>{t.results.score}</span>
            <span>{t.results.correct}</span>
            <span>{t.results.status}</span>
            <span>{t.results.date}</span>
          </div>
          {results.map((r: any) => (
            <div key={r.id} className="grid grid-cols-5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className="text-slate-900 dark:text-slate-100 font-medium truncate">
                {r.studentName || r.studentEmail || '—'}
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {Number(r.percentage).toFixed(1)}%
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                {r.correctCount != null ? `${r.correctCount}/${(r.correctCount || 0) + (r.incorrectCount || 0) + (r.unansweredCount || 0)}` : '—'}
              </span>
              <span className={`font-medium ${r.passed === true ? 'text-green-600 dark:text-green-400' : r.passed === false ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
                {r.passed != null ? (r.passed ? t.results.passed : t.results.failed) : '—'}
              </span>
              <span className="text-slate-400 text-xs">
                {r.computedAt ? format(new Date(r.computedAt), 'MMM d, yyyy') : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
