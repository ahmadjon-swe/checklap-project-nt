import { HTMLAttributes } from 'react';

type Variant = 'default' | 'success' | 'destructive' | 'warning' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
  success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  destructive: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  outline: 'bg-transparent border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300',
};

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
