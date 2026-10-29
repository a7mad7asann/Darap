'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, LogOut, ShieldCheck, Users, PlusCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { apiClient } from '@/lib/api-client';
import { AuthMeResponseDto } from '@darb/contracts';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [data, setData] = React.useState<AuthMeResponseDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchProfile = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getMe();
      if (res.user.role !== 'TEACHER' && res.user.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      setData(res);
    } catch (e: any) {
      setError(e.message || 'يرجى تسجيل الدخول للوصول لهذه الصفحة');
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = async () => {
    await apiClient.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loading message="جاري التحقق من مساحة عمل المعلم..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md">
          <ErrorState
            title="تعذر الوصول لمساحة العمل"
            message={error || 'انتهت الجلسة أو لم يتم تسجيل الدخول'}
            onRetry={() => router.push('/login')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                د
              </div>
              <span className="font-extrabold text-lg text-slate-900">دَرب</span>
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                مساحة المعلم
              </span>
              <span className="text-sm font-semibold text-slate-700 hidden sm:inline">
                {data.activeTenant?.tenantName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 font-medium hidden sm:inline">
              مرحباً، {data.user.displayName}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 ml-1.5" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Workspace Info Banner */}
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-emerald-950">
                مساحة العمل النشطة: {data.activeTenant?.tenantName}
              </h2>
              <p className="text-xs text-emerald-800">
                معرف المساحة (Tenant ID): <span className="font-mono">{data.activeTenant?.tenantId}</span> — معزولة بواسطة RLS
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-md">
            مالك المساحة
          </span>
        </div>

        {/* Phase 1 Foundation Notice */}
        <Card>
          <CardHeader>
            <CardTitle>لوحة تحكم المقررات التعليمية</CardTitle>
            <CardDescription>
              المرحلة الأولى: تم إرساء بنية البيانات وقواعد العزل الأمني وتوثيق الجلسات.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="لم يتم إنشاء مقررات دراسية بعد في هذه المساحة"
              description="سيكون بإمكانك في المرحلة الثانية إضافة المقررات، رفع الملفات، وتوليد أكواد الانضمام للطلاب."
              icon={<BookOpen className="w-8 h-8" />}
              action={
                <Button variant="primary" disabled className="cursor-not-allowed opacity-60">
                  <PlusCircle className="w-4 h-4 ml-1" />
                  إضافة مقرر جديد (مُجدول للمرحلة الثانية)
                </Button>
              }
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
