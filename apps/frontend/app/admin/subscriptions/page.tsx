'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../lib/api';

// ── Plan editor ──────────────────────────────────────────────────────────────

type Plan = {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  maxTestsPerDay: number | null;
  maxQuestionsPerTest: number | null;
  maxGroups: number | null;
  canExport: boolean;
  canImport: boolean;
  canUseAnalytics: boolean;
};

type PlanDraft = {
  price: string;
  maxTestsPerDay: string;
  maxQuestionsPerTest: string;
  maxGroups: string;
  canExport: boolean;
  canImport: boolean;
  canUseAnalytics: boolean;
};

function nullOrInt(v: string): number | null {
  if (v === '' || v === 'unlimited') return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function PlanEditor({ plan }: { plan: Plan }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PlanDraft>({
    price: String(plan.price),
    maxTestsPerDay: plan.maxTestsPerDay == null ? '' : String(plan.maxTestsPerDay),
    maxQuestionsPerTest: plan.maxQuestionsPerTest == null ? '' : String(plan.maxQuestionsPerTest),
    maxGroups: plan.maxGroups == null ? '' : String(plan.maxGroups),
    canExport: plan.canExport,
    canImport: plan.canImport,
    canUseAnalytics: plan.canUseAnalytics,
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<Plan>) => api.patch(`/subscriptions/plans/${plan.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-plans'] });
      setOpen(false);
    },
  });

  const save = () => {
    const price = parseFloat(draft.price);
    if (isNaN(price) || price < 0) return;
    mutation.mutate({
      price,
      maxTestsPerDay: nullOrInt(draft.maxTestsPerDay),
      maxQuestionsPerTest: nullOrInt(draft.maxQuestionsPerTest),
      maxGroups: nullOrInt(draft.maxGroups),
      canExport: draft.canExport,
      canImport: draft.canImport,
      canUseAnalytics: draft.canUseAnalytics,
    });
  };

  const cancel = () => {
    setDraft({
      price: String(plan.price),
      maxTestsPerDay: plan.maxTestsPerDay == null ? '' : String(plan.maxTestsPerDay),
      maxQuestionsPerTest: plan.maxQuestionsPerTest == null ? '' : String(plan.maxQuestionsPerTest),
      maxGroups: plan.maxGroups == null ? '' : String(plan.maxGroups),
      canExport: plan.canExport,
      canImport: plan.canImport,
      canUseAnalytics: plan.canUseAnalytics,
    });
    setOpen(false);
  };

  const tierColor: Record<string, string> = {
    free: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    pro: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
    enterprise: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300',
  };

  const tierBadge = tierColor[plan.name.split('_')[0]] ?? tierColor.free;

  const limitLabel = (v: number | null) => v == null ? <span className="text-green-600 dark:text-green-400 font-medium">Unlimited</span> : <span>{v}</span>;

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${tierBadge}`}>
            {plan.name.replace(/_/g, ' ')}
          </span>
          <span className="text-sm text-gray-500 dark:text-slate-400">{plan.billingPeriod}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-gray-900 dark:text-slate-100">${Number(plan.price).toFixed(2)}/mo</span>
          <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-500">
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            <span>{open ? 'Collapse' : 'Edit'}</span>
          </div>
        </div>
      </button>

      {/* Summary badges when collapsed */}
      {!open && (
        <div className="px-5 pb-3 pt-0 flex flex-wrap gap-2 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
            Tests/day: {plan.maxTestsPerDay == null ? '∞' : plan.maxTestsPerDay}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
            Q/test: {plan.maxQuestionsPerTest == null ? '∞' : plan.maxQuestionsPerTest}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
            Groups: {plan.maxGroups == null ? '∞' : plan.maxGroups}
          </span>
          {plan.canImport && <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">Import</span>}
          {plan.canExport && <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">Export</span>}
          {plan.canUseAnalytics && <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">Analytics</span>}
        </div>
      )}

      {/* Edit form */}
      {open && (
        <div className="px-5 py-5 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 space-y-5">
          {/* Price */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Price (USD / month)</label>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 dark:text-slate-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={e => setDraft(d => ({ ...d, price: e.target.value }))}
                className="w-32 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* Limits */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Limits <span className="normal-case text-gray-400 dark:text-slate-500">(leave blank = unlimited)</span></label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: 'maxTestsPerDay', label: 'Tests per day' },
                { key: 'maxQuestionsPerTest', label: 'Questions per test' },
                { key: 'maxGroups', label: 'Groups' },
              ] as { key: keyof Pick<PlanDraft, 'maxTestsPerDay' | 'maxQuestionsPerTest' | 'maxGroups'>; label: string }[]).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="unlimited"
                    value={draft[key]}
                    onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Feature toggles */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">Features</label>
            <div className="space-y-2">
              {([
                { key: 'canImport', label: 'Import questions from Excel / CSV' },
                { key: 'canExport', label: 'Export results to Excel / CSV' },
                { key: 'canUseAnalytics', label: 'Advanced analytics' },
              ] as { key: keyof Pick<PlanDraft, 'canImport' | 'canExport' | 'canUseAnalytics'>; label: string }[]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setDraft(d => ({ ...d, [key]: !d[key] }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${draft[key] ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${draft[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={mutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Check size={14} />
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-600 dark:text-red-400">Save failed. Please try again.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSubscriptionsPage() {
  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => api.get('/admin/subscriptions').then((r) => r.data.data?.data ?? r.data.data ?? []),
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => api.get('/subscriptions/plans').then((r) => r.data.data ?? []),
  });

  const subs = subsData || [];
  const plans: Plan[] = plansData || [];

  return (
    <div className="space-y-10">
      {/* Plan configuration */}
      <div>
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Tariff Plans</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Configure pricing, usage limits, and features for each subscription tier.
          </p>
        </div>

        {plansLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}</div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">No plans found.</p>
        ) : (
          <div className="space-y-3">
            {plans.map(plan => <PlanEditor key={plan.id} plan={plan} />)}
          </div>
        )}
      </div>

      {/* Subscriptions list */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Active Subscriptions</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{subs.length} total</p>
        </div>
        {subsLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}</div>
        ) : subs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
            <p className="text-gray-500 dark:text-slate-400">No subscriptions yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="grid grid-cols-5 px-5 py-3 border-b border-gray-100 dark:border-slate-800 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              <span className="col-span-2">User</span>
              <span>Plan</span>
              <span>Status</span>
              <span>Expires</span>
            </div>
            {subs.map((s: any) => (
              <div key={s.id} className="grid grid-cols-5 px-5 py-3 border-b border-gray-100 dark:border-slate-800 last:border-0 text-sm items-center">
                <div className="col-span-2">
                  <p className="font-medium text-gray-900 dark:text-slate-100">{s.user?.firstName} {s.user?.lastName}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{s.user?.email}</p>
                </div>
                <span className="text-gray-700 dark:text-slate-300 capitalize">{s.plan?.name?.replace(/_/g, ' ') || '—'}</span>
                <span className={`text-xs font-medium capitalize ${s.status === 'active' ? 'text-green-600 dark:text-green-400' : s.status === 'cancelled' ? 'text-red-500 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {s.status}
                </span>
                <span className="text-gray-400 dark:text-slate-500 text-xs">{s.endsAt ? format(new Date(s.endsAt), 'MMM d, yyyy') : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
