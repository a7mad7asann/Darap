import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'default';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none';

    const variantStyles = {
      default:
        'bg-[#246BFD] text-white hover:bg-[#1A56DE] focus:ring-[#246BFD] active:bg-[#1442B5] shadow-sm shadow-[#246BFD]/20',
      primary:
        'bg-[#246BFD] text-white hover:bg-[#1A56DE] focus:ring-[#246BFD] active:bg-[#1442B5] shadow-sm shadow-[#246BFD]/20',
      secondary:
        'bg-[#17264A] text-white hover:bg-[#101A35] focus:ring-[#17264A] active:bg-[#0B1226] shadow-sm',
      outline:
        'border border-[#E5EAF4] bg-white text-[#17213A] hover:bg-[#F5F7FC] hover:border-[#C2D7FF] focus:ring-[#246BFD]',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 active:bg-rose-800 shadow-sm',
      ghost:
        'bg-transparent text-[#77829A] hover:text-[#17213A] hover:bg-[#F0F5FF] focus:ring-[#246BFD]',
    };

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2 h-10 gap-2',
      lg: 'text-base px-6 py-3 h-12 gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current ml-1" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
