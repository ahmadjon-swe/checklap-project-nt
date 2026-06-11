'use client';
import { Button } from '../components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">
        Something went wrong
      </p>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        An unexpected error occurred
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
        Please try again. If the problem persists, contact support.
        {error.digest && (
          <span className="block mt-1 text-xs text-slate-400">Ref: {error.digest}</span>
        )}
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
