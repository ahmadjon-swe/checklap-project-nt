'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../../lib/api';

export default function AdminPaymentsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: () => api.get('/admin/payments/pending').then((r) => r.data.data?.data ?? r.data.data ?? []),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/payments/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-payments'] }),
  });

  const payments = data || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Pending Payments</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">{payments.length} pending approval</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}</div>
      ) : payments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
          <p className="text-gray-500 dark:text-slate-400">No pending payments.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="grid grid-cols-5 px-5 py-3 border-b border-gray-100 dark:border-slate-800 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            <span className="col-span-2">User</span>
            <span>Plan</span>
            <span>Date</span>
            <span>Action</span>
          </div>
          {payments.map((p: any) => (
            <div key={p.id} className="grid grid-cols-5 px-5 py-3 border-b border-gray-100 dark:border-slate-800 last:border-0 text-sm items-center">
              <div className="col-span-2">
                <p className="font-medium text-gray-900 dark:text-slate-100">{p.user?.firstName} {p.user?.lastName}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{p.user?.email}</p>
              </div>
              <span className="text-gray-700 dark:text-slate-300">{p.plan?.name || '—'}</span>
              <span className="text-gray-400 dark:text-slate-500 text-xs">{p.createdAt ? format(new Date(p.createdAt), 'MMM d, yyyy') : '—'}</span>
              <button
                onClick={() => approveMutation.mutate(p.id)}
                disabled={approveMutation.isPending}
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors w-fit"
              >
                Approve
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
