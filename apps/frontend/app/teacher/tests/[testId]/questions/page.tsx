'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../../../../lib/api';
import { usePremiumStore } from '../../../../../store/premium.store';
import { Question } from '../../../../../types';

export default function QuestionsPage() {
  const { testId } = useParams<{ testId: string }>();
  const qc = useQueryClient();
  const { tier } = usePremiumStore();
  const canImport = tier === 'pro' || tier === 'enterprise';
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ body: '', difficulty: 'medium', score: 1, topic: '', options: [{ body: '', isCorrect: false }, { body: '', isCorrect: false }, { body: '', isCorrect: false }, { body: '', isCorrect: false }] });
  const [showImport, setShowImport] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['questions', testId],
    queryFn: () => api.get(`/tests/${testId}/questions`).then((r) => r.data.data as Question[]),
  });

  const questions = data || [];

  const resetForm = () => {
    setForm({ body: '', difficulty: 'medium', score: 1, topic: '', options: [{ body: '', isCorrect: false }, { body: '', isCorrect: false }, { body: '', isCorrect: false }, { body: '', isCorrect: false }] });
    setEditingId(null);
    setShowForm(false);
  };

  const createMutation = useMutation({
    mutationFn: () => api.post(`/tests/${testId}/questions`, { ...form, options: form.options.filter(o => o.body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['questions', testId] }); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tests/${testId}/questions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', testId] }),
  });

  const setOption = (i: number, key: string, value: any) => {
    setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? { ...o, [key]: value } : key === 'isCorrect' && value ? { ...o, isCorrect: false } : o) }));
  };

  const handleImportFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      setImportStatus({ type: 'error', msg: 'Only .xlsx, .xls, or .csv files are supported.' });
      return;
    }
    setImportFile(file);
    setImportStatus(null);
  };

  const submitImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportStatus(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.post(`/import/questions?testId=${testId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const count = res.data.data?.imported ?? res.data.data?.count ?? '?';
      setImportStatus({ type: 'success', msg: `Successfully imported ${count} question${count !== 1 ? 's' : ''}.` });
      setImportFile(null);
      qc.invalidateQueries({ queryKey: ['questions', testId] });
    } catch (err: any) {
      setImportStatus({ type: 'error', msg: err.response?.data?.message || 'Import failed. Check your file format.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Questions</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {canImport && (
            <button
              onClick={() => { setShowImport(v => !v); setImportStatus(null); setImportFile(null); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
            >
              <FileSpreadsheet size={15} />
              Import Excel
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            + Add Question
          </button>
        </div>
      </div>

      {/* Excel import panel — Pro / Enterprise only */}
      {canImport && showImport && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet size={17} className="text-emerald-600 dark:text-emerald-400" />
                Import questions from Excel / CSV
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Columns: <span className="font-mono">question | explanation | difficulty | score | topic | option1 | correct1 | option2 | correct2 …</span>
              </p>
            </div>
            <button onClick={() => { setShowImport(false); setImportFile(null); setImportStatus(null); }} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
              <X size={16} />
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : importFile ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-gray-200 dark:border-slate-700 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }}
            />
            {importFile ? (
              <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400">
                <FileSpreadsheet size={20} />
                <span className="text-sm font-medium">{importFile.name}</span>
                <button onClick={(e) => { e.stopPropagation(); setImportFile(null); }} className="ml-1 text-gray-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto text-gray-400 dark:text-slate-500 mb-2" />
                <p className="text-sm text-gray-600 dark:text-slate-300">Drag & drop or <span className="text-emerald-600 dark:text-emerald-400 font-medium">browse</span></p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">.xlsx, .xls, .csv — max 10 MB</p>
              </>
            )}
          </div>

          {/* Status */}
          {importStatus && (
            <div className={`mt-3 flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 ${importStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50'}`}>
              {importStatus.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {importStatus.msg}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <a
              href="/templates/questions-template.xlsx"
              download
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              onClick={(e) => e.preventDefault()}
            >
              Download template
            </a>
            <button
              onClick={submitImport}
              disabled={!importFile || importing}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {importing ? 'Importing…' : 'Import'}
              {!importing && <Upload size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Upsell banner for free users */}
      {!canImport && (
        <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Import from Excel / CSV</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Upload hundreds of questions at once. Available on Pro and Enterprise plans.</p>
            </div>
          </div>
          <a href="/teacher/subscription" className="text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors whitespace-nowrap">
            Upgrade →
          </a>
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">New Question</h2>
          <textarea
            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Question text"
            rows={2}
            value={form.body}
            onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Difficulty</label>
              <select className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" value={form.difficulty} onChange={(e) => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Score</label>
              <input type="number" className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" value={form.score} onChange={(e) => setForm(f => ({ ...f, score: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Topic</label>
              <input className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" value={form.topic} onChange={(e) => setForm(f => ({ ...f, topic: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-slate-400">Options (check the correct answer)</p>
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-3">
                <input type="radio" name="correct" checked={opt.isCorrect} onChange={() => setOption(i, 'isCorrect', true)} className="w-4 h-4 text-indigo-600" />
                <input
                  className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Option ${i + 1}`}
                  value={opt.body}
                  onChange={(e) => setOption(i, 'body', e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate()} disabled={!form.body || createMutation.isPending} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {createMutation.isPending ? 'Saving...' : 'Save Question'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}</div>
      ) : questions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <p className="text-gray-500 dark:text-slate-400">No questions yet.</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Add your first question</button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex items-start justify-between hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400 dark:text-slate-500">#{idx + 1}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${q.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400' : q.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-400'}`}>{q.difficulty}</span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">{q.score} pt{q.score !== 1 ? 's' : ''}</span>
                  {q.topic && <span className="text-xs text-gray-400 dark:text-slate-500">{q.topic}</span>}
                </div>
                <p className="text-sm text-gray-900 dark:text-slate-100">{q.body}</p>
                <div className="mt-2 space-y-1">
                  {q.options?.map(o => (
                    <p key={o.id} className={`text-xs ${o.isCorrect ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-slate-500'}`}>
                      {o.isCorrect ? '+ ' : '- '}{o.body}
                    </p>
                  ))}
                </div>
              </div>
              <button onClick={() => deleteMutation.mutate(q.id)} className="ml-4 px-3 py-1.5 text-sm border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
