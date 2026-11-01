import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
}

export function Loading({
  className,
  message = 'جاري التحميل...',
  ...props
}: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center p-8 space-y-3 text-[#77829A]',
        className,
      )}
      {...props}
    >
      <Loader2 className="w-8 h-8 animate-spin text-[#246BFD]" />
      {message && <p className="text-sm font-medium text-[#17213A]">{message}</p>}
      <span className="sr-only">جاري تحميل المحتوى</span>
    </div>
  );
}
