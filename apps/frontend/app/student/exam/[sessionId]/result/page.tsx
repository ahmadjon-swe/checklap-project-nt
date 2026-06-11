'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../../lib/api';

export default function ResultPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();

  const { data: res, isLoading } = useQuery({
    queryKey: ['result', sessionId],
    queryFn: () => api.get(`/results/${sessionId}`).then((r) => r.data.data),
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }

  const result = res;
  if (!result) return null;

  const passed = result.passed;
  const pct = Number(result.percentage).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 text-center mb-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${passed === true ? 'bg-green-100 dark:bg-green-950/60' : passed === false ? 'bg-red-100 dark:bg-red-950/60' : 'bg-indigo-100 dark:bg-indigo-950/60'}`}>
            <span className="text-3xl">{passed === true ? '🎉' : passed === false ? '😔' : '📊'}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">{pct}%</h1>
          <p className="text-gray-500 dark:text-slate-400 text-lg">{result.testTitle}</p>
          {passed != null && (
            <span className={`mt-3 inline-block px-4 py-1.5 rounded-full text-sm font-medium ${passed ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'}`}>
              {passed ? 'Passed' : 'Not Passed'}
            </span>
          )}
        </div>

        {result.correctCount != null && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.correctCount}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Correct</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-red-500 dark:text-red-400">{result.incorrectCount}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Incorrect</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-gray-400 dark:text-slate-500">{result.unansweredCount}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Unanswered</p>
            </div>
          </div>
        )}

        {result.rawScore != null && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 mb-6 flex justify-between text-sm">
            <span className="text-gray-500 dark:text-slate-400">Score</span>
            <span className="font-semibold text-gray-900 dark:text-slate-100">{result.rawScore} / {result.maxPossibleScore} pts</span>
          </div>
        )}

        {result.questions && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Review</h2>
            <div className="space-y-4">
              {result.questions.map((q: any, i: number) => (
                <div key={q.id} className={`p-4 rounded-lg border ${q.isCorrect ? 'border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-950/30' : 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30'}`}>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">{i + 1}. {q.body}</p>
                  {q.options?.map((opt: any) => (
                    <div key={opt.id} className={`text-xs py-1 px-2 rounded mt-1 ${
                      opt.isCorrect && opt.isSelected ? 'bg-green-200 dark:bg-green-900/60 text-green-800 dark:text-green-300' :
                      opt.isSelected && !opt.isCorrect ? 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-300' :
                      opt.isCorrect ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-slate-400'
                    }`}>
                      {opt.isCorrect ? '✓ ' : opt.isSelected ? '✗ ' : '  '}{opt.body}
                    </div>
                  ))}
                  {q.explanation && <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 italic">💡 {q.explanation}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link href="/student/tests" className="px-6 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Back to Tests
          </Link>
          <Link href="/student/history" className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            View History
          </Link>
        </div>
      </div>
    </div>
  );
}
