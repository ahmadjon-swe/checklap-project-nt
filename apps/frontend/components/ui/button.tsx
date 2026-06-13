import { forwardRef, ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  default:
    'bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_auto] bg-left hover:bg-right hover:from-indigo-500 hover:via-violet-500 hover:to-indigo-500 dark:from-indigo-500 dark:via-violet-500 dark:to-indigo-500 text-white border border-transparent shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/40',
  outline:
    'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm',
  ghost:
    'bg-transparent text-slate-700 dark:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
  destructive:
    'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 bg-[length:200%_auto] bg-left hover:bg-right text-white border border-transparent shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/40',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={[
          'inline-flex items-center justify-center gap-2 font-semibold tracking-tight',
          'transition-all duration-200',
          'hover:scale-[1.03] active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
