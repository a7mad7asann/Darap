import * as React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'حدث خطأ غير متوقع',
  message,
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-center space-y-3',
        className,
      )}
      {...props}
    >
      <AlertCircle className="w-8 h-8 text-rose-600" />
      <div>
        <h4 className="text-base font-bold text-rose-950">{title}</h4>
        <p className="text-sm text-rose-800 mt-1">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-rose-300 text-rose-900 hover:bg-rose-100"
        >
          <RotateCcw className="w-3.5 h-3.5 ml-1" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}
