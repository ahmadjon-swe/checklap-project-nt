'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Calendar } from 'lucide-react';
import api from '../../../../../lib/api';
import { useT } from '../../../../../lib/i18n';
import { Group } from '../../../../../types';

export default function TestGroupsPage() {
  const { testId } = useParams<{ testId: string }>();
  const qc = useQueryClient();
  const t = useT();

  // Per-group schedule state (for assigning with a window)
  const [schedule, setSchedule] = useState<Record<string, { startAt: string; endAt: string }>>({});

  const { data: assignedRes, isLoading } = useQuery({
    queryKey: ['test-groups', testId],
    queryFn: () => api.get(`/tests/${testId}/groups`).then((r) => r.data.data as Group[]),
  });

  const { data: allGroupsRes } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then((r) => r.data.data as Group[]),
  });

  const assigned = assignedRes || [];
  const allGroups = allGroupsRes || [];
  const assignedIds = new Set(assigned.map((g) => g.id));
  const unassigned = allGroups.filter((g) => !assignedIds.has(g.id));

  const getSchedule = (id: string) => schedule[id] || { startAt: '', endAt: '' };
  const setS = (id: string, key: 'startAt' | 'endAt', val: string) =>
    setSchedule((s) => ({ ...s, [id]: { ...getSchedule(id), [key]: val } }));

  const addMutation = useMutation({
    mutationFn: (groupId: string) => {
      const s = getSchedule(groupId);
      return api.post(`/tests/${testId}/groups`, {
        groupIds: [groupId],
        startAt: s.startAt || undefined,
        endAt: s.endAt || undefined,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-groups', testId] }),
  });

  const removeMutation = useMutation({
    mutationFn: (groupId: string) => api.delete(`/tests/${testId}/groups/${groupId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-groups', testId] }),
  });

  const inputCls = 'w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all';

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Assign Groups</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Control which groups can access this test</p>
      </div>

      {/* Assigned groups */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Assigned Groups</h2>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />)}</div>
        ) : assigned.length === 0 ? (
          <p className="text-sm text-slate-400">No groups assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assigned.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{g.name}</span>
                <button
                  onClick={() => removeMutation.mutate(g.id)}
                  disabled={removeMutation.isPending}
                  className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available groups — with optional schedule */}
      {unassigned.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Available Groups</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">{t.groupAssign.scheduleHint}</p>
          <div className="space-y-4">
            {unassigned.map((g) => {
              const s = getSchedule(g.id);
              return (
                <div key={g.id} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{g.name}</span>
                    <button
                      onClick={() => addMutation.mutate(g.id)}
                      disabled={addMutation.isPending}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <Calendar size={11} />{t.groupAssign.availableFrom}
                      </label>
                      <input
                        type="datetime-local"
                        className={inputCls}
                        value={s.startAt}
                        onChange={(e) => setS(g.id, 'startAt', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <Calendar size={11} />{t.groupAssign.availableUntil}
                      </label>
                      <input
                        type="datetime-local"
                        className={inputCls}
                        value={s.endAt}
                        onChange={(e) => setS(g.id, 'endAt', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
