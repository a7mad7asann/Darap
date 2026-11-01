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
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white/70 space-y-3',
        className,
      )}
      {...props}
    >
      <div className="p-3.5 bg-[#F0F5FF] rounded-2xl text-[#246BFD]">
        {icon || <Inbox className="w-8 h-8 stroke-[1.5]" />}
      </div>
      <h4 className="text-base font-bold text-[#17213A]">{title}</h4>
      {desc && <p className="text-sm text-[#77829A] max-w-sm">{desc}</p>}
      {action ? (
        <div className="pt-2">{action}</div>
      ) : actionLabel && onAction ? (
        <div className="pt-2">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
