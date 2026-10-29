'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  LogOut,
  BookOpen,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  User,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loading message="جاري تجهيز بوابة الطالب ومقرراتك..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md">
          <ErrorState
            title="تعذر الوصول لبوابة الطالب"
            message={error || 'يرجى تسجيل الدخول مجدداً'}
            onRetry={loadData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16" dir="rtl">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              د
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">منصة دَرْب — بوابة الطالب</h1>
              <p className="text-xs text-slate-500">
                {profile.activeTenant?.tenantName || 'الأكاديمية التعليمية'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 hidden sm:inline">
              مرحباً، {profile.user.displayName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4 ml-1" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome & Join Code Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Welcome Info Card */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile.user.displayName}</h2>
                <p className="text-xs text-blue-100 font-mono mt-0.5">@{profile.user.username}</p>
              </div>
              <div className="pt-2 border-t border-white/20 text-xs text-blue-100 space-y-1">
                <p>مقرراتك الدراسية النشطة: <strong className="text-white">{courses.length}</strong></p>
                <p>تسجيل الدخول: باسم المستخدم وكلمة المرور دون الحاجة لبريد إلكتروني</p>
              </div>
            </CardContent>
          </Card>

          {/* Join Course with Code Form */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-blue-600">
                <KeyRound className="w-5 h-5" />
                <CardTitle className="text-lg font-bold text-slate-800">
                  الانضمام إلى مقرر دراسي جديد
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                أدخل كود الانضمام المكون من 12 خانة الذي زوّدك به معلمك للبدء في دراسة محتوى المقرر.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {joinMessage && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
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
                  <span>{joinMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleJoinCourse} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    required
                    placeholder="مثال: DARB-A1B2-C3D4-E5F6"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="font-mono uppercase text-center sm:text-right tracking-wider text-base"
                    disabled={joining}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={joining || !joinCodeInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                >
                  {joining ? 'جاري التحقق...' : 'انضم الآن'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Courses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">مقرراتي المسجلة</h2>
              <p className="text-xs text-slate-500">تابع دروسك، نزل ملخصات المحاضرات، واختبر فهمك</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {courses.length} مقررات
            </span>
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
                  className="flex flex-col justify-between hover:shadow-md transition border-slate-200"
                >
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {course.subject || 'مقرر تعليمي'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(course.enrolledAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-800 line-clamp-1">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {course.description || 'لا يوجد وصف مضاف لهذا المقرر.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        المعلم: {course.teacherName}
                      </span>
                      <span className="font-semibold text-blue-600">
                        {course.lessonsCount} دروس
                      </span>
                    </div>

                    <Link href={`/student/courses/${course.courseId}`} className="block pt-1">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs">
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
      </main>
    </div>
  );
}
