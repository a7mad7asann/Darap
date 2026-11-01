import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'navy' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full select-none';

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    primary: 'bg-[#F0F5FF] text-[#246BFD] border border-[#C2D7FF]',
    secondary: 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]',
    success: 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]',
    warning: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
    danger: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
    navy: 'bg-[#17264A] text-[#E8EEFF] border border-[#23345E]',
    outline: 'bg-transparent text-[#77829A] border border-[#E5EAF4]',
  };

  return (
    <span
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    />
  );
}
