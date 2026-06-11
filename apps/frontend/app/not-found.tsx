import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-indigo-600 dark:text-indigo-400">404</p>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-4">
        Page not found
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
