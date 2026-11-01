import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-[#E5EAF4] bg-white px-3.5 py-2.5 text-sm text-[#17213A] placeholder:text-[#9DA8BE] focus:outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] disabled:cursor-not-allowed disabled:opacity-50 transition duration-150 shadow-xs',
          error && 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
