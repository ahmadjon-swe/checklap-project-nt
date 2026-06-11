'use client';
import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { useExamStore } from '../../../../store/exam.store';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ExamPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { session, questions, currentIndex, answers, timeLeft, setSession, setAnswer, setTimeLeft, nextQuestion, prevQuestion, reset } = useExamStore();

  const { isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const res = await api.get(`/sessions/${sessionId}`);
      const { session: s, questions: q } = res.data.data;
      setSession(s, q);
      return res.data.data;
    },
    enabled: !!sessionId,
    staleTime: Infinity,
  });

  const saveAnswer = useMutation({
    mutationFn: (data: { questionId: string; optionIds: string[] }) =>
      api.put(`/sessions/${sessionId}/answers`, data),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/sessions/${sessionId}/submit`),
    onSuccess: (res) => {
      reset();
      router.push(`/student/exam/${sessionId}/result`);
    },
  });

  const heartbeat = useCallback(async () => {
    try {
      const tabVisible = !document.hidden;
      const isFullscreen = !!document.fullscreenElement;
      const res = await api.post(`/sessions/${sessionId}/heartbeat`, { tabVisible, isFullscreen });
      const data = res.data.data;
      if (data.remainingSeconds != null) setTimeLeft(data.remainingSeconds);
      if (data.autoSubmitted) { reset(); router.push(`/student/exam/${sessionId}/result`); }
    } catch {}
  }, [sessionId, router, reset, setTimeLeft]);

  // countdown timer
  useEffect(() => {
    if (timeLeft == null) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(Math.max(0, (useExamStore.getState().timeLeft ?? 1) - 1));
      if ((useExamStore.getState().timeLeft ?? 1) <= 0) { clearInterval(timerRef.current!); }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft != null, setTimeLeft]);

  // heartbeat every 30s
  useEffect(() => {
    heartbeatRef.current = setInterval(heartbeat, 30000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [heartbeat]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    const current = answers[questionId] || [];
    const newIds = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
    setAnswer(questionId, newIds);
    saveAnswer.mutate({ questionId, optionIds: newIds });
  };

  if (isLoading || !session) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }

  const question = questions[currentIndex];
  if (!question) return null;

  const isTimeLow = timeLeft != null && timeLeft < 120;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="font-semibold text-gray-900 dark:text-slate-100">Question {currentIndex + 1} of {questions.length}</span>
        <div className="flex items-center gap-4">
          {timeLeft != null && (
            <span className={`font-mono text-lg font-bold ${isTimeLow ? 'text-red-600 animate-pulse' : 'text-gray-900 dark:text-slate-100'}`}>
              {formatTime(timeLeft)}
            </span>
          )}
          <button
            onClick={() => { if (confirm('Submit the test now?')) submitMutation.mutate(); }}
            disabled={submitMutation.isPending}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Submit
          </button>
        </div>
      </header>

      <div className="flex flex-1 max-w-5xl mx-auto w-full gap-6 p-6">
        {/* Question panel */}
        <div className="flex-1">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 mb-4">
            {question.imageUrl && <img src={question.imageUrl} alt="" className="mb-4 rounded-lg max-h-64 w-full object-contain" />}
            <p className="text-gray-900 dark:text-slate-100 font-medium text-lg leading-relaxed">{question.body}</p>
          </div>

          <div className="space-y-3">
            {question.options.map((option) => {
              const selected = (answers[question.id] || []).includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(question.id, option.id)}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100'
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  {option.body}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={prevQuestion}
              disabled={currentIndex === 0}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={nextQuestion}
              disabled={currentIndex === questions.length - 1}
              className="px-4 py-2 bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-slate-200 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Question grid navigator */}
        <div className="w-56">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sticky top-24">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wide">Progress</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => {
                const answered = (answers[q.id] || []).length > 0;
                return (
                  <button
                    key={q.id}
                    onClick={() => useExamStore.setState({ currentIndex: i })}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                      i === currentIndex ? 'bg-indigo-600 text-white' :
                      answered ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400' :
                      'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400">
              <p>{Object.keys(answers).length} / {questions.length} answered</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
