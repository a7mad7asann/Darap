import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  message,
  icon,
  action,
  actionLabel,
  onAction,
  className,
  ...props
}: EmptyStateProps) {
  const desc = description || message;

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
      {desc && <p className="text-sm text-slate-500 max-w-sm">{desc}</p>}
      {action ? (
        <div className="pt-2">{action}</div>
      ) : actionLabel && onAction ? (
        <div className="pt-2">
          <Button size="sm" onClick={onAction} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
