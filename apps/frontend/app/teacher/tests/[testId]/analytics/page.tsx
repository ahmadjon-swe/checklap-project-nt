'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '../../../../../lib/api';

export default function TestAnalyticsPage() {
  const { testId } = useParams<{ testId: string }>();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['test-analytics', testId],
    queryFn: () => api.get(`/analytics/tests/${testId}`).then((r) => r.data.data),
  });

  const { data: itemsRes } = useQuery({
    queryKey: ['test-item-stats', testId],
    queryFn: () => api.get(`/analytics/tests/${testId}/items`).then((r) => r.data.data),
  });

  const items = itemsRes || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Test Analytics</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Detailed performance breakdown</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Attempts', value: overview?.totalAttempts },
          { label: 'Avg Score', value: overview?.avgScore != null ? `${Number(overview.avgScore).toFixed(1)}%` : null },
          { label: 'Pass Rate', value: overview?.passRate != null ? `${Number(overview.passRate).toFixed(1)}%` : null },
          { label: 'Avg Time', value: overview?.avgTimeSecs != null ? `${Math.round(overview.avgTimeSecs / 60)}m` : null },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
              {isLoading ? <span className="animate-pulse bg-gray-200 dark:bg-slate-700 rounded w-16 h-7 inline-block" /> : value ?? '—'}
            </p>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Question Performance</h2>
          <div className="space-y-4">
            {items.map((item: any, idx: number) => (
              <div key={item.questionId}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-900 dark:text-slate-100">Q{idx + 1}: {item.questionBody}</p>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{Number(item.correctRate * 100).toFixed(0)}% correct</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.correctRate >= 0.7 ? 'bg-green-500' : item.correctRate >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${item.correctRate * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
