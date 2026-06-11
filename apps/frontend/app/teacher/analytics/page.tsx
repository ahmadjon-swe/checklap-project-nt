'use client';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';

export default function AnalyticsPage() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data.data),
  });

  const data = res || {};

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Analytics</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Performance overview across all your tests</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Attempts', value: data.totalAttempts },
          { label: 'Avg Score', value: data.avgScore != null ? `${Number(data.avgScore).toFixed(1)}%` : null },
          { label: 'Pass Rate', value: data.passRate != null ? `${Number(data.passRate).toFixed(1)}%` : null },
          { label: 'Unique Students', value: data.uniqueStudents },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
              {isLoading ? <span className="animate-pulse bg-gray-200 dark:bg-slate-700 rounded w-16 h-7 inline-block" /> : value ?? '—'}
            </p>
          </div>
        ))}
      </div>

      {data.testBreakdown && data.testBreakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Per-Test Breakdown</h2>
          <div className="space-y-3">
            {data.testBreakdown.map((t: any) => (
              <div key={t.testId} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-800 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100 text-sm">{t.title}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{t.attempts} attempt{t.attempts !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-slate-100">{Number(t.avgScore).toFixed(1)}%</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">avg score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !data.testBreakdown?.length && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <p className="text-gray-500 dark:text-slate-400">No data yet. Publish a test and have students take it to see analytics.</p>
        </div>
      )}
    </div>
  );
}
