'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { Share2, Copy, Check } from 'lucide-react';
import api from '../../../../lib/api';
import { useT } from '../../../../lib/i18n';

export default function EditTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const router = useRouter();
  const t = useT();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: res } = useQuery({
    queryKey: ['test', testId],
    queryFn: () => api.get(`/tests/${testId}`).then((r) => r.data.data),
  });

  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (res) setForm(res);
  }, [res]);

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/tests/${testId}`, form),
    onSuccess: () => router.push('/teacher/tests'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tests/${testId}`),
    onSuccess: () => router.push('/teacher/tests'),
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/tests/${testId}/publish`).then((r) => r.data.data),
    onSuccess: (data) => {
      setForm((f: any) => ({ ...f, isPublished: true, accessCode: data.accessCode }));
      queryClient.invalidateQueries({ queryKey: ['test', testId] });
    },
  });

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const shareUrl =
    form?.accessCode && typeof window !== 'undefined'
      ? `${window.location.origin}/t/${form.accessCode}`
      : '';

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!form) return <div className="animate-pulse h-96 bg-slate-100 dark:bg-slate-800 rounded-xl" />;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Edit Test</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">{form.title}</p>
        </div>
        <button
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          className="px-4 py-2 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 transition-colors"
        >
          Delete test
        </button>
      </div>

      {/* Publish & share */}
      {!form.isPublished ? (
        <div className="mb-6 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Share2 size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <p className="text-sm text-indigo-800 dark:text-indigo-200">{t.testsList.shareDesc}</p>
          </div>
          <button
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            className="whitespace-nowrap bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {publishMutation.isPending ? t.testsList.publishing : t.testsList.publish}
          </button>
        </div>
      ) : form.accessCode ? (
        <div className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Share2 size={16} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.testsList.shareTitle}</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t.testsList.shareDesc}</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-400 uppercase tracking-wide">{t.testsList.shareCode}</span>
              <span className="font-mono text-2xl font-bold tracking-[0.2em] text-slate-900 dark:text-slate-100">{form.accessCode}</span>
            </div>
            <div className="flex-1 min-w-[200px] flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 font-mono"
              />
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? t.testsList.copied : t.testsList.copyLink}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title</label>
          <input
            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
          <textarea
            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Time Limit (minutes)</label>
            <input
              type="number"
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.timeLimitMinutes || ''}
              onChange={(e) => set('timeLimitMinutes', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Passing Threshold (%)</label>
            <input
              type="number"
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.passingThreshold || ''}
              onChange={(e) => set('passingThreshold', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Result Visibility</label>
          <select
            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.resultVisibility}
            onChange={(e) => set('resultVisibility', e.target.value)}
          >
            <option value="percentage_only">Percentage only</option>
            <option value="correct_incorrect">Correct / Incorrect</option>
            <option value="full_review">Full review</option>
          </select>
        </div>

        <div className="space-y-2">
          {[
            { key: 'randomizeQuestions', label: 'Randomize question order' },
            { key: 'shuffleOptions', label: 'Shuffle answer options' },
            { key: 'enforceFullscreen', label: 'Enforce fullscreen mode' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-indigo-600 rounded"
                checked={!!form[key]}
                onChange={(e) => set(key, e.target.checked)}
              />
              <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save changes'}
          </button>
          <button onClick={() => router.push('/teacher/tests')} className="px-5 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}