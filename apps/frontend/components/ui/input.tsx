import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-tight">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={[
            'w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
            'bg-slate-50 dark:bg-slate-800/80',
            'text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            error
              ? 'border border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400/30'
              : 'border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20',
            'focus:outline-none focus:bg-white dark:focus:bg-slate-800',
            className,
          ].join(' ')}
          {...props}
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
