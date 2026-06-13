'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../../lib/api';
import { useT } from '../../../../lib/i18n';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';

interface OptionDraft { body: string; isCorrect: boolean; }
interface QuestionDraft {
  body: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  topic: string;
  options: OptionDraft[];
}

function blankQuestion(): QuestionDraft {
  return {
    body: '',
    difficulty: 'medium',
    score: 1,
    topic: '',
    options: [
      { body: '', isCorrect: true },
      { body: '', isCorrect: false },
      { body: '', isCorrect: false },
      { body: '', isCorrect: false },
    ],
  };
}

function parseBulk(text: string): QuestionDraft[] {
  const blocks = text.trim().split(/\n{2,}/);
  const questions: QuestionDraft[] = [];
  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const body = lines[0].replace(/^[*-]\s*/, '');
    const options: OptionDraft[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('*')) {
        options.push({ body: line.replace(/^\*\s*/, ''), isCorrect: true });
      } else if (line.startsWith('-')) {
        options.push({ body: line.replace(/^-\s*/, ''), isCorrect: false });
      }
    }
    if (body && options.length >= 2) {
      // Ensure at least one correct
      if (!options.some((o) => o.isCorrect)) options[0].isCorrect = true;
      questions.push({ body, difficulty: 'medium', score: 1, topic: '', options });
    }
  }
  return questions;
}

export default function NewTestPage() {
  const router = useRouter();
  const t = useT();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('');
  const [passingThreshold, setPassingThreshold] = useState('');
  const [resultVisibility, setResultVisibility] = useState('percentage_only');
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [enforceFullscreen, setEnforceFullscreen] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([blankQuestion()]);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkMsg, setBulkMsg] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const testRes = await api.post('/tests', {
        title,
        description: description || undefined,
        timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
        passingThreshold: passingThreshold ? Number(passingThreshold) : null,
        resultVisibility,
        randomizeQuestions,
        shuffleOptions,
        enforceFullscreen,
      });
      const testId = testRes.data.data.id;

      const validQuestions = questions.filter((q) => q.body.trim() && q.options.some((o) => o.body.trim()));
      if (validQuestions.length) {
        const bulkPayload = validQuestions.map((q) => ({
          body: q.body,
          difficulty: q.difficulty,
          score: q.score,
          topic: q.topic || undefined,
          options: q.options.filter((o) => o.body.trim()).map((o) => ({ body: o.body, isCorrect: o.isCorrect })),
        }));
        await api.post(`/tests/${testId}/questions/bulk`, { questions: bulkPayload });
      }

      await api.post(`/tests/${testId}/publish`);
      return testId;
    },
    onSuccess: (testId) => {
      router.push(`/teacher/tests/${testId}`);
    },
  });

  const handleCreate = () => {
    if (!title.trim()) { setError(t.newTest.titleRequired); return; }
    const valid = questions.filter((q) => q.body.trim() && q.options.some((o) => o.body.trim()));
    if (!valid.length) { setError(t.newTest.noQuestionsWarning); return; }
    setError('');
    createMutation.mutate();
  };

  const addQuestion = () => setQuestions((qs) => [...qs, blankQuestion()]);
  const removeQuestion = (i: number) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  const setQ = (i: number, key: keyof QuestionDraft, value: any) =>
    setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, [key]: value } : q));
  const setOpt = (qi: number, oi: number, key: keyof OptionDraft, value: any) =>
    setQuestions((qs) => qs.map((q, idx) =>
      idx !== qi ? q : {
        ...q,
        options: q.options.map((o, j) =>
          j !== oi ? (key === 'isCorrect' && value ? { ...o, isCorrect: false } : o)
            : { ...o, [key]: value }
        ),
      }
    ));

  const applyBulk = () => {
    const parsed = parseBulk(bulkText);
    if (!parsed.length) { setBulkMsg(t.newTest.bulkError); return; }
    setQuestions((qs) => {
      const nonEmpty = qs.filter((q) => q.body.trim());
      return [...nonEmpty, ...parsed];
    });
    setBulkMsg(t.newTest.bulkParsed(parsed.length));
    setBulkText('');
    setTimeout(() => { setShowBulk(false); setBulkMsg(''); }, 1200);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t.newTest.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t.newTest.subtitle}</p>
      </div>

      {/* Settings card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 mb-6">
        <Input
          id="title"
          label={t.newTest.testTitle}
          placeholder={t.newTest.testTitlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.newTest.description}</label>
          <textarea
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            placeholder={t.newTest.descriptionPlaceholder}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="timeLimit"
            label={t.newTest.timeLimit}
            type="number"
            placeholder={t.newTest.timeLimitPlaceholder}
            value={timeLimitMinutes}
            onChange={(e) => setTimeLimitMinutes(e.target.value)}
          />
          <Input
            id="passing"
            label={t.newTest.passingScore}
            type="number"
            placeholder={t.newTest.passingScorePlaceholder}
            value={passingThreshold}
            onChange={(e) => setPassingThreshold(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{t.newTest.resultVisibility}</label>
          <select
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={resultVisibility}
            onChange={(e) => setResultVisibility(e.target.value)}
          >
            <option value="percentage_only">{t.newTest.visibilityPercentage}</option>
            <option value="correct_incorrect">{t.newTest.visibilityCorrect}</option>
            <option value="full_review">{t.newTest.visibilityFull}</option>
          </select>
        </div>

        <div className="space-y-2">
          {([
            ['randomizeQuestions', t.newTest.randomize, randomizeQuestions, setRandomizeQuestions],
            ['shuffleOptions', t.newTest.shuffle, shuffleOptions, setShuffleOptions],
            ['enforceFullscreen', t.newTest.fullscreen, enforceFullscreen, setEnforceFullscreen],
          ] as [string, string, boolean, (v: boolean) => void][]).map(([key, label, val, setter]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600"
                checked={val}
                onChange={(e) => setter(e.target.checked)}
              />
              <span className="text-sm text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t.newTest.questions} <span className="text-slate-400 font-normal text-base">({questions.filter(q => q.body.trim()).length})</span>
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowBulk((v) => !v); setBulkMsg(''); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ClipboardList size={14} />
              {t.newTest.bulkPaste}
              {showBulk ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus size={14} />
              {t.newTest.addQuestion}
            </button>
          </div>
        </div>

        {/* Bulk paste panel */}
        {showBulk && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800/50 p-5 mb-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">{t.newTest.bulkPasteTitle}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.newTest.bulkPasteDesc}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-pre leading-relaxed">
              {t.newTest.bulkPasteExample}
            </div>
            <textarea
              className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
              rows={8}
              placeholder={t.newTest.bulkPasteExample}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            {bulkMsg && (
              <p className={`text-sm font-medium ${bulkMsg === t.newTest.bulkError ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>{bulkMsg}</p>
            )}
            <button
              type="button"
              onClick={applyBulk}
              disabled={!bulkText.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {t.newTest.bulkPasteBtn}
            </button>
          </div>
        )}

        {/* Question cards */}
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center mt-0.5">{qi + 1}</span>
                <textarea
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                  placeholder={t.newTest.questionPlaceholder}
                  rows={2}
                  value={q.body}
                  onChange={(e) => setQ(qi, 'body', e.target.value)}
                />
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(qi)} className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors mt-1">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="pl-9 space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpt(qi, oi, 'isCorrect', true)}
                      className={`flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors ${opt.isCorrect ? 'border-green-500 bg-green-500' : 'border-slate-300 dark:border-slate-600 hover:border-green-400'}`}
                      title={t.newTest.markCorrect}
                    />
                    <input
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      placeholder={t.newTest.option(oi + 1)}
                      value={opt.body}
                      onChange={(e) => setOpt(qi, oi, 'body', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="pl-9 flex gap-3">
                <select
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  value={q.difficulty}
                  onChange={(e) => setQ(qi, 'difficulty', e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input
                  type="number"
                  className="w-20 px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  placeholder="Score"
                  value={q.score}
                  onChange={(e) => setQ(qi, 'score', Number(e.target.value) || 1)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {createMutation.isError && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
          {(createMutation.error as any)?.response?.data?.message || 'Failed to create test.'}
        </div>
      )}

      <div className="flex gap-3">
        <Button size="lg" onClick={handleCreate} disabled={createMutation.isPending}>
          {createMutation.isPending ? t.newTest.creating : t.newTest.createAndPublish}
        </Button>
        <Button size="lg" variant="outline" onClick={() => router.back()}>
          {t.newTest.cancel}
        </Button>
      </div>
    </div>
  );
}
