'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  LogOut,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Archive,
  Eye,
  Send,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { apiClient } from '@/lib/api-client';
import { AuthMeResponseDto, CourseSummaryDto, CourseStatus } from '@darb/contracts';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<AuthMeResponseDto | null>(null);
  const [courses, setCourses] = React.useState<CourseSummaryDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // New course modal state
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [createTitle, setCreateTitle] = React.useState('');
  const [createDescription, setCreateDescription] = React.useState('');
  const [createSubject, setCreateSubject] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiClient.getMe();
      if (me.user.role !== 'TEACHER' && me.user.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      setProfile(me);

      const teacherCourses = await apiClient.getTeacherCourses();
      setCourses(teacherCourses);
    } catch (e: any) {
      setError(e.message || 'تعذر تحميل بيانات المعلم');
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

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;

    setCreating(true);
    setActionError(null);
    try {
      const newCourse = await apiClient.createCourse({
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        subject: createSubject.trim() || undefined,
      });
      setCourses((prev) => [newCourse, ...prev]);
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreateSubject('');
    } catch (err: any) {
      setActionError(err.message || 'تعذر إنشاء المقرر الدراسي');
    } finally {
      setCreating(false);
    }
  };

  const handlePublishCourse = async (courseId: string) => {
    try {
      await apiClient.publishCourse(courseId);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId ? { ...c, status: CourseStatus.PUBLISHED, isActive: true } : c,
        ),
      );
    } catch (err: any) {
      alert(err.message || 'تعذر نشر المقرر الدراسي');
    }
  };

  const handleArchiveCourse = async (courseId: string) => {
    if (!confirm('هل أنت متأكد من أرشفة هذا المقرر؟ لن يتمكن الطلاب الجدد من الوصول إليه.')) return;
    try {
      await apiClient.archiveCourse(courseId);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId ? { ...c, status: CourseStatus.ARCHIVED, isActive: false } : c,
        ),
      );
    } catch (err: any) {
      alert(err.message || 'تعذر أرشفة المقرر الدراسي');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loading message="جاري تحميل مقررات المعلم..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md">
          <ErrorState
            title="تعذر الوصول لمساحة العمل"
            message={error || 'يرجى تسجيل الدخول مجدداً'}
            onRetry={loadData}
          />
        </div>
      </div>
    );
  }

  const publishedCount = courses.filter((c) => c.status === CourseStatus.PUBLISHED).length;
  const totalStudents = courses.reduce((sum, c) => sum + (c.enrolledStudentsCount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12" dir="rtl">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              د
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">منصة دَرْب — مساحة المعلم</h1>
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
        {/* Statistics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">إجمالي المقررات</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{courses.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">المقررات المنشورة</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{publishedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">إجمالي الطلاب المسجلين</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{totalStudents}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">مقرراتي الدراسية</h2>
            <p className="text-sm text-slate-500">إدارة المقررات، إعداد الدروس، وتوليد رموز الانضمام</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PlusCircle className="w-4 h-4 ml-2" />
            إنشاء مقرر جديد
          </Button>
        </div>

        {/* Create Course Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold text-slate-800">إنشاء مقرر دراسي جديد</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    عنوان المقرر <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="مثال: الرياضيات المتقدمة - الصف الثالث الثانوي"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المادة</label>
                  <Input
                    value={createSubject}
                    onChange={(e) => setCreateSubject(e.target.value)}
                    placeholder="مثال: رياضيات، فيزياء، كيمياء"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">الوصف</label>
                  <textarea
                    rows={3}
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="وصف مختصر لمحتوى المقرر وأهدافه التعليمية..."
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    disabled={creating}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={creating}
                  >
                    {creating ? 'جاري الإنشاء...' : 'حفظ المقرر'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <EmptyState
            title="لا توجد مقررات دراسية حتى الآن"
            message="ابدأ بإنشاء أول مقرر دراسي وإضافة الدروس للطلاب."
            actionLabel="إنشاء أول مقرر"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const isDraft = course.status === CourseStatus.DRAFT;
              const isPublished = course.status === CourseStatus.PUBLISHED;
              const isArchived = course.status === CourseStatus.ARCHIVED;

              return (
                <Card key={course.id} className="flex flex-col justify-between hover:shadow-md transition">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        {course.subject || 'عام'}
                      </span>
                      {isDraft && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          مسودة
                        </span>
                      )}
                      {isPublished && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          منشور للطلاب
                        </span>
                      )}
                      {isArchived && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                          مؤرشف
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-800 line-clamp-1">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {course.description || 'لا يوجد وصف مضاف لهذا المقرر.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
                      <span>{course.lessonsCount || 0} دروس</span>
                      <span>{course.enrolledStudentsCount || 0} طلاب مسجلين</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Link href={`/teacher/courses/${course.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="w-4 h-4 ml-1" />
                          إدارة المقرر
                        </Button>
                      </Link>

                      {isDraft && (
                        <Button
                          size="sm"
                          onClick={() => handlePublishCourse(course.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          title="نشر المقرر ليتمكن الطلاب من الانضمام"
                        >
                          <Send className="w-4 h-4 ml-1" />
                          نشر
                        </Button>
                      )}

                      {!isArchived && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveCourse(course.id)}
                          className="text-slate-400 hover:text-slate-700"
                          title="أرشفة المقرر"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
