'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import api from '../../../lib/api';
import { Result } from '../../../types';

export default function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-results'],
    queryFn: () => api.get('/results/my').then((r) => r.data.data as Result[]),
  });

  const results = data || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">History</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">{results.length} completed test{results.length !== 1 ? 's' : ''}</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}</div>
      ) : results.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <p className="text-gray-500 dark:text-slate-400">No completed tests yet.</p>
          <Link href="/student/tests" className="mt-3 inline-block text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Browse available tests</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <Link key={r.id} href={`/student/exam/${r.sessionId}/result`} className="block bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100">{r.testTitle || 'Test'}</h3>
                  <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">{format(new Date(r.computedAt), 'MMM d, yyyy · HH:mm')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{Number(r.percentage).toFixed(1)}%</p>
                  {r.passed != null && (
                    <span className={`text-xs font-medium ${r.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {r.passed ? 'Passed' : 'Failed'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
