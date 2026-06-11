'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import api from '../../../lib/api';
import { Test } from '../../../types';

export default function StudentTestsPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['available-tests'],
    queryFn: () => api.get('/tests').then((r) => r.data.data as Test[]),
  });

  const tests = data || [];

  const startMutation = useMutation({
    mutationFn: (testId: string) => api.post('/sessions', { testId }),
    onSuccess: (res) => router.push(`/student/exam/${res.data.data.id}`),
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Available Tests</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">{tests.length} test{tests.length !== 1 ? 's' : ''} available</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}</div>
      ) : tests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <p className="text-gray-500 dark:text-slate-400">No tests available. Join a group to see tests assigned to you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => (
            <div key={test.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex items-center justify-between hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">{test.title}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                  {test.timeLimitMinutes ? `${test.timeLimitMinutes} min` : 'No time limit'}
                  {test.endAt && ` · Due ${format(new Date(test.endAt), 'MMM d, yyyy')}`}
                </p>
                {test.description && <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">{test.description}</p>}
              </div>
              <button
                onClick={() => startMutation.mutate(test.id)}
                disabled={startMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Start
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
