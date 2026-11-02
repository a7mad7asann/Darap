'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  User,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { apiClient } from '@/lib/api-client';
import { AuthMeResponseDto, StudentCourseSummaryDto } from '@darb/contracts';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<AuthMeResponseDto | null>(null);
  const [courses, setCourses] = React.useState<StudentCourseSummaryDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Join code input state
  const [joinCodeInput, setJoinCodeInput] = React.useState('');
  const [joining, setJoining] = React.useState(false);
  const [joinMessage, setJoinMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiClient.getMe();
      if (me.user.role !== 'STUDENT') {
        router.push('/');
        return;
      }
      setProfile(me);

      const enrolledCourses = await apiClient.getStudentCourses();
      setCourses(enrolledCourses);
    } catch (e: any) {
      setError(e.message || 'تعذر تحميل بيانات الطالب ومقرراته');
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await apiClient.logout();
    router.push('/login');
  };

  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setJoining(true);
    setJoinMessage(null);
    try {
      const res = await apiClient.joinCourse({ code: joinCodeInput.trim() });
      setJoinMessage({
        type: 'success',
        text: `تهانينا! لقد انضممت بنجاح إلى مقرر: ${res.courseTitle}`,
      });
      setJoinCodeInput('');
      // Reload enrolled courses list
      const updatedCourses = await apiClient.getStudentCourses();
      setCourses(updatedCourses);
    } catch (err: any) {
      setJoinMessage({
        type: 'error',
        text: err.message || 'رمز الانضمام غير صالح أو منتهي الصلاحية',
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FC]">
        <Loading message="جاري تجهيز بوابة الطالب ومقرراتك..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F7FC]">
        <div className="w-full max-w-md space-y-3">
          <ErrorState
            title="تعذر الوصول لبوابة الطالب"
            message={error || 'يرجى تسجيل الدخول مجدداً'}
            onRetry={loadData}
          />
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" onClick={() => router.push('/login')}>
              الانتقال إلى صفحة الدخول
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalLessons = courses.reduce((sum, c) => sum + (c.lessonsCount || 0), 0);

  const navItems = [
    {
      label: 'مقرراتي الدراسية',
      href: '/student',
      icon: <BookOpen className="w-4 h-4" />,
      badge: courses.length,
    },
  ];

  return (
    <DashboardShell
      role="STUDENT"
      userDisplayName={profile.user.displayName}
      userUsername={profile.user.username}
      tenantName={profile.activeTenant?.tenantName || 'بوابة الطالب'}
      navItems={navItems}
      onLogout={handleLogout}
      title="بوابة الطالب التعليمية"
      subtitle="متابعة المقررات، إنجاز المهام الدراسية، والوصول للدروس"
    >
      <div className="space-y-8">
        {/* KPI Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            title="المقررات الملتحق بها"
            value={courses.length}
            subtitle="مقررات دراسية نشطة"
            icon={<BookOpen className="w-6 h-6" />}
            iconBgColor="bg-[#F0F5FF]"
            iconColor="text-[#246BFD]"
          />
          <StatCard
            title="الدروس المتاحة"
            value={totalLessons}
            subtitle="درس وملف تعليمي"
            icon={<FileText className="w-6 h-6" />}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
          />
          <StatCard
            title="حالة الحساب"
            value="نشط ومؤكد"
            subtitle="دخول سريع باسم المستخدم"
            icon={<CheckCircle2 className="w-6 h-6" />}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
        </div>

        {/* Join Course Banner */}
        <Card className="border-[#E5EAF4] shadow-card bg-white overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0F5FF] text-[#246BFD] text-xs font-bold">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>رمز الانضمام</span>
                </div>
                <h3 className="text-xl font-bold text-[#17213A]">
                  هل لديك رمز انضمام لمقرر دراسي جديد؟
                </h3>
                <p className="text-xs text-[#77829A] leading-relaxed">
                  أدخل رمز الانضمام المكون من مقاطع (مثل DARB-XXXX) المقدم من معلمك للالتحاق بالمقرر فوراً والاطلاع على المحتوى.
                </p>
              </div>

              <div className="w-full md:w-auto min-w-[320px]">
                {joinMessage && (
                  <div
                    className={`p-3 mb-3 rounded-xl text-xs flex items-center gap-2 ${
                      joinMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {joinMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    )}
                    <span className="font-medium">{joinMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleJoinCourse} className="flex gap-2.5">
                  <Input
                    required
                    placeholder="مثال: DARB-A1B2-C3D4"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="font-mono uppercase text-center sm:text-right tracking-wider text-sm h-11"
                    disabled={joining}
                  />
                  <Button
                    type="submit"
                    disabled={joining || !joinCodeInput.trim()}
                    isLoading={joining}
                    className="shrink-0 font-bold px-5"
                  >
                    انضم الآن
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </Card>

        {/* Enrolled Courses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5EAF4] pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#17213A]">مقرراتي الدراسية</h2>
              <p className="text-xs text-[#77829A] mt-0.5">
                تابع دروسك، أرسل واجباتك، واختبر فهمك
              </p>
            </div>
            <Badge variant="primary" size="md">
              {courses.length} مقررات
            </Badge>
          </div>

          {courses.length === 0 ? (
            <EmptyState
              title="لم تنضم إلى أي مقرر دراسي بعد"
              message="احصل على كود الانضمام من معلمك وأدخله في الخانة أعلاه للوصول للمقررات والدروس."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card
                  key={course.enrollmentId}
                  className="flex flex-col justify-between hover:shadow-floating transition-all duration-200 border-[#E5EAF4]"
                >
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="primary" size="sm">
                        {course.subject || 'مقرر تعليمي'}
                      </Badge>
                      <span className="text-xs text-[#77829A]">
                        {new Date(course.enrolledAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>

                    <CardTitle className="text-lg font-bold text-[#17213A] line-clamp-1 hover:text-[#246BFD] transition-colors">
                      <Link href={`/student/courses/${course.courseId}`}>
                        {course.title}
                      </Link>
                    </CardTitle>

                    <CardDescription className="line-clamp-2 text-xs text-[#77829A] min-h-[32px]">
                      {course.description || 'لا يوجد وصف مضاف لهذا المقرر.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="flex items-center justify-between text-xs text-[#77829A] py-3 border-t border-[#E5EAF4]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <User className="w-3.5 h-3.5 text-[#246BFD]" />
                        المعلم: {course.teacherName}
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-[#246BFD]">
                        <FileText className="w-3.5 h-3.5" />
                        {course.lessonsCount} دروس
                      </span>
                    </div>

                    <Link href={`/student/courses/${course.courseId}`} className="block pt-1">
                      <Button className="w-full font-bold text-xs">
                        دخول المقرر ومتابعة الدروس
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
