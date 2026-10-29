import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-300 bg-white/50 space-y-3',
        className,
      )}
      {...props}
    >
      <div className="p-3 bg-slate-100 rounded-full text-slate-500">
        {icon || <Inbox className="w-8 h-8 stroke-[1.5]" />}
      </div>
      <h4 className="text-base font-bold text-slate-800">{title}</h4>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
