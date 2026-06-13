'use client';
import { HTMLAttributes } from 'react';
import { usePremiumStore, PlanTier } from '../../store/premium.store';

type CardProps = HTMLAttributes<HTMLDivElement> & { hover?: boolean };

const tierHoverClass: Record<PlanTier, string> = {
  free:       'card-free-hover',
  pro:        'card-pro-hover',
  enterprise: 'card-enterprise-hover',
};

export function Card({ className = '', hover = false, ...props }: CardProps) {
  const tier = usePremiumStore((s) => s.tier);
  const hoverClass = hover ? tierHoverClass[tier] : '';
  return (
    <div
      className={`bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm ${hoverClass} ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800 ${className}`}
      {...props}
    />
  );
}

export function CardContent({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 py-5 ${className}`} {...props} />;
}
