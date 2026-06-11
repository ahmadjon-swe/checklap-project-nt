'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';

export default function AdminUsersPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data.data?.data ?? r.data.data ?? []),
  });

  const users = data || [];

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}/status`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Users</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">{users.length} total users</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="grid grid-cols-5 px-5 py-3 border-b border-gray-100 dark:border-slate-800 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            <span className="col-span-2">User</span>
            <span>Role</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {users.map((u: any) => (
            <div key={u.id} className="grid grid-cols-5 px-5 py-3 border-b border-gray-100 dark:border-slate-800 last:border-0 text-sm items-center">
              <div className="col-span-2">
                <p className="font-medium text-gray-900 dark:text-slate-100">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{u.email}</p>
              </div>
              <select
                className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded px-2 py-1 text-xs w-28"
                value={u.role}
                onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <span className={`text-xs font-medium ${u.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {u.isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => statusMutation.mutate({ id: u.id, isActive: !u.isActive })}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${u.isActive ? 'border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40' : 'border-green-200 dark:border-green-800/50 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30'}`}
              >
                {u.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
