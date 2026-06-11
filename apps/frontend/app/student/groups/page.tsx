'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Group } from '../../../types';

export default function StudentGroupsPage() {
  const qc = useQueryClient();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => api.get('/groups').then((r) => r.data.data as Group[]),
  });

  const groups = data || [];

  const joinMutation = useMutation({
    mutationFn: () => api.post('/groups/join', { inviteCode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-groups'] });
      setInviteCode('');
      setError('');
    },
    onError: () => setError('Invalid invite code or already a member.'),
  });

  const leaveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}/leave`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-groups'] }),
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Groups</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Groups you have joined</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Join a Group</h2>
        <div className="flex gap-3">
          <input
            className="flex-1 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <button
            onClick={() => joinMutation.mutate()}
            disabled={!inviteCode || joinMutation.isPending}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {joinMutation.isPending ? 'Joining...' : 'Join'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}</div>
      ) : groups.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <p className="text-gray-500 dark:text-slate-400">You have not joined any groups yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex items-center justify-between hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">{g.name}</h3>
                {g.description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{g.description}</p>}
              </div>
              <button onClick={() => leaveMutation.mutate(g.id)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                Leave
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
