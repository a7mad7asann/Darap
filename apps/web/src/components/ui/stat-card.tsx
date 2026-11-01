import * as React from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    text: string;
    positive?: boolean;
  };
  className?: string;
  iconBgColor?: string;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  iconBgColor = 'bg-[#F0F5FF]',
  iconColor = 'text-[#246BFD]',
}: StatCardProps) {
  return (
    <Card className={cn('p-6 hover:shadow-floating transition-shadow duration-200', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#77829A] uppercase tracking-wider">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#17213A]">{value}</p>
          {subtitle && <p className="text-xs text-[#77829A] mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded',
                  trend.positive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700',
                )}
              >
                {trend.text}
              </span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-2xl flex items-center justify-center shrink-0', iconBgColor, iconColor)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
