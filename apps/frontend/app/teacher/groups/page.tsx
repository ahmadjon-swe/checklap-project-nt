'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Group } from '../../../types';

export default function GroupsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then((r) => r.data.data as Group[]),
  });

  const groups = data || [];

  const createMutation = useMutation({
    mutationFn: () => api.post('/groups', { name, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      setShowForm(false);
      setName('');
      setDescription('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/groups/${id}/regenerate-invite`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Groups</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + New Group
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Create Group</h2>
          <div className="space-y-3">
            <input
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate()}
                disabled={!name || createMutation.isPending}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <p className="text-gray-500 dark:text-slate-400">No groups yet.</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Create your first group
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-5 flex items-center justify-between hover:border-gray-300 dark:hover:border-slate-600 transition-colors">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100">{group.name}</h3>
                {group.description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{group.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 dark:text-slate-500">Invite code:</span>
                  <code className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono">{group.inviteCode}</code>
                  <button
                    onClick={() => regenerateMutation.mutate(group.id)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Regenerate
                  </button>
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(group.id)}
                className="px-3 py-1.5 text-sm border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
