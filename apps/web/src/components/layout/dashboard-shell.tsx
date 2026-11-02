'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Bell,
  Search,
  User as UserIcon,
  Shield,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface NavItem {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'primary' | 'warning' | 'success';
}

export interface DashboardShellProps {
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  userDisplayName?: string;
  userUsername?: string;
  tenantName?: string;
  navItems: NavItem[];
  onLogout: () => void | Promise<void>;
  children: React.ReactNode;
  actions?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardShell({
  role,
  userDisplayName,
  userUsername,
  tenantName,
  navItems,
  onLogout,
  children,
  actions,
  title,
  subtitle,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const homeHref = role === 'ADMIN' ? '/admin' : role === 'TEACHER' ? '/teacher' : '/student';

  const roleMeta = {
    ADMIN: {
      label: 'مدير النظام',
      badgeVariant: 'warning' as const,
      icon: <Shield className="w-3.5 h-3.5" />,
    },
    TEACHER: {
      label: 'معلم',
      badgeVariant: 'primary' as const,
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
    STUDENT: {
      label: 'طالب',
      badgeVariant: 'success' as const,
      icon: <GraduationCap className="w-3.5 h-3.5" />,
    },
  }[role];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#101A35] text-[#E8EEFF] select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <Link href={homeHref} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#246BFD] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-[#246BFD]/30 group-hover:scale-105 transition-transform">
            د
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl text-white tracking-tight">دَرب</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-[#AAB6D3]">
                SaaS
              </span>
            </div>
            <p className="text-xs text-[#AAB6D3] truncate max-w-[140px]">
              {tenantName || 'المنصة التعليمية'}
            </p>
          </div>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-[#AAB6D3] hover:text-white hover:bg-white/10 transition"
          aria-label="إغلاق القائمة"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Indicator */}
      <div className="px-6 py-3.5 border-b border-white/5 bg-[#17264A]/40 flex items-center justify-between">
        <span className="text-xs text-[#AAB6D3]">نوع الحساب</span>
        <Badge variant="navy" size="sm" className="bg-[#17264A] text-[#5595FF] border-[#23345E] flex items-center gap-1">
          {roleMeta.icon}
          <span>{roleMeta.label}</span>
        </Badge>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 py-2 text-[11px] font-bold text-[#AAB6D3]/70 uppercase tracking-wider">
          القائمة الرئيسية
        </p>
        {navItems.map((item, idx) => {
          const isActive =
            item.active !== undefined
              ? item.active
              : item.href
              ? pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`))
              : false;

          const itemContent = (
            <>
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-[#AAB6D3]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#17264A] text-[#5595FF]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </>
          );

          const itemClass = `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 text-right ${
            isActive
              ? 'bg-[#246BFD] text-white shadow-md shadow-[#246BFD]/25 font-semibold'
              : 'text-[#AAB6D3] hover:bg-[#17264A] hover:text-white'
          }`;

          if (item.onClick) {
            return (
              <button
                key={item.href || `nav-btn-${idx}`}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  setMobileMenuOpen(false);
                }}
                className={itemClass}
              >
                {itemContent}
              </button>
            );
          }

          return (
            <Link
              key={item.href || `nav-lnk-${idx}`}
              href={item.href || '#'}
              onClick={() => setMobileMenuOpen(false)}
              className={itemClass}
            >
              {itemContent}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout Footer */}
      <div className="p-4 border-t border-white/10 bg-[#0B1226]/50">
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[#17264A]/60 border border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#246BFD]/20 text-[#5595FF] flex items-center justify-center font-bold text-sm shrink-0 border border-[#246BFD]/30">
              {userDisplayName ? userDisplayName[0] : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {userDisplayName || 'المستخدم'}
              </p>
              <p className="text-[11px] text-[#AAB6D3] truncate" dir="ltr">
                @{userUsername || 'user'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="تسجيل الخروج"
            className="p-2 rounded-lg text-[#AAB6D3] hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FC] flex flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-l border-[#17264A] shadow-xl fixed inset-y-0 right-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-navy-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:mr-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-[#E5EAF4] px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#77829A] hover:text-[#17213A] hover:bg-[#F5F7FC] transition"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              {title && (
                <h1 className="text-base sm:text-lg font-bold text-[#17213A] leading-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-[#77829A] hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {actions}

            {/* Quick Profile Pill */}
            <div className="hidden sm:flex items-center gap-2.5 pr-2 pl-3 py-1.5 rounded-full bg-[#F5F7FC] border border-[#E5EAF4]">
              <div className="w-7 h-7 rounded-full bg-[#246BFD] text-white flex items-center justify-center font-bold text-xs">
                {userDisplayName ? userDisplayName[0] : 'د'}
              </div>
              <span className="text-xs font-semibold text-[#17213A]">
                {userDisplayName || 'حسابي'}
              </span>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
