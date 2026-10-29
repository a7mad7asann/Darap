import * as React from 'react';
import { cn } from '@/lib/utils';

export function FormField({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1.5', className)} {...props} />;
}

export function FormLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'block text-sm font-semibold text-slate-800 select-none text-right',
        className,
      )}
      {...props}
    />
  );
}

export function FormMessage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;
  return (
    <p
      className={cn('text-xs font-medium text-rose-600 text-right', className)}
      {...props}
    >
      {children}
    </p>
  );
}
