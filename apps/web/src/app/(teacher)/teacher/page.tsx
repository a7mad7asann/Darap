'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Archive,
  Eye,
  Send,
  Users,
  Sparkles,
  FileText,
  Layers,
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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FC]">
        <Loading message="جاري تحميل مقررات المعلم..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F7FC]">
        <div className="w-full max-w-md space-y-3">
          <ErrorState
            title="تعذر الوصول لمساحة العمل"
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

  const publishedCount = courses.filter((c) => c.status === CourseStatus.PUBLISHED).length;
  const totalStudents = courses.reduce((sum, c) => sum + (c.enrolledStudentsCount || 0), 0);

  const navItems = [
    {
      label: 'مقرراتي الدراسية',
      href: '/teacher',
      icon: <BookOpen className="w-4 h-4" />,
      badge: courses.length,
    },
  ];

  return (
    <DashboardShell
      role="TEACHER"
      userDisplayName={profile.user.displayName}
      userUsername={profile.user.username}
      tenantName={profile.activeTenant?.tenantName || 'الأكاديمية التعليمية'}
      navItems={navItems}
      onLogout={handleLogout}
      title="مساحة تدريس المعلم"
      subtitle={profile.activeTenant?.tenantName || 'لوحة إدارة المقررات والدروس'}
      actions={
        <Button
          onClick={() => setShowCreateModal(true)}
          className="shadow-sm shadow-[#246BFD]/25 font-bold"
        >
          <PlusCircle className="w-4 h-4 ml-2" />
          إنشاء مقرر جديد
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Statistics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            title="إجمالي المقررات"
            value={courses.length}
            subtitle="مقررات دراسية مسجلة"
            icon={<BookOpen className="w-6 h-6" />}
            iconBgColor="bg-[#F0F5FF]"
            iconColor="text-[#246BFD]"
          />
          <StatCard
            title="المقررات المنشورة"
            value={publishedCount}
            subtitle="متاحة لانضمام الطلاب"
            icon={<CheckCircle2 className="w-6 h-6" />}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            title="إجمالي الطلاب المسجلين"
            value={totalStudents}
            subtitle="طالب ملتحق بالمقررات"
            icon={<Users className="w-6 h-6" />}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
          />
        </div>

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5EAF4] pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#17213A]">المقررات الدراسية الحالية</h2>
            <p className="text-xs text-[#77829A] mt-0.5">
              إدارة المناهج والوحدات، تعيين الدروس، وتوليد رموز الانضمام للطلاب
            </p>
          </div>
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <EmptyState
            title="لا توجد مقررات دراسية حتى الآن"
            message="ابدأ بإنشاء أول مقرر دراسي وإضافة الدروس والواجبات للطلاب."
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
                <Card
                  key={course.id}
                  className="flex flex-col justify-between hover:shadow-floating transition-all duration-200 border-[#E5EAF4]"
                >
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="primary" size="sm">
                        {course.subject || 'عام'}
                      </Badge>

                      {isDraft && (
                        <Badge variant="warning" size="sm">
                          مسودة
                        </Badge>
                      )}
                      {isPublished && (
                        <Badge variant="success" size="sm">
                          منشور للطلاب
                        </Badge>
                      )}
                      {isArchived && (
                        <Badge variant="secondary" size="sm">
                          مؤرشف
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-lg font-bold text-[#17213A] line-clamp-1 hover:text-[#246BFD] transition-colors">
                      <Link href={`/teacher/courses/${course.id}`}>
                        {course.title}
                      </Link>
                    </CardTitle>

                    <CardDescription className="line-clamp-2 text-xs text-[#77829A] min-h-[32px]">
                      {course.description || 'لا يوجد وصف مضاف لهذا المقرر الدراسي.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="flex items-center justify-between text-xs text-[#77829A] py-3 border-t border-[#E5EAF4]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <FileText className="w-3.5 h-3.5 text-[#246BFD]" />
                        {course.lessonsCount || 0} دروس
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        {course.enrolledStudentsCount || 0} طلاب مسجلين
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Link href={`/teacher/courses/${course.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full font-semibold">
                          <Eye className="w-4 h-4 ml-1.5 text-[#246BFD]" />
                          إدارة المقرر
                        </Button>
                      </Link>

                      {isDraft && (
                        <Button
                          size="sm"
                          onClick={() => handlePublishCourse(course.id)}
                          className="font-semibold shadow-xs"
                          title="نشر المقرر ليتمكن الطلاب من الانضمام"
                        >
                          <Send className="w-3.5 h-3.5 ml-1" />
                          نشر
                        </Button>
                      )}

                      {!isArchived && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveCourse(course.id)}
                          className="text-[#77829A] hover:text-rose-600 px-2.5"
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

        {/* Create Course Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1226]/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-floating border border-[#E5EAF4] w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5EAF4] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F0F5FF] text-[#246BFD] flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#17213A]">إنشاء مقرر دراسي جديد</h3>
                    <p className="text-xs text-[#77829A]">أضف بيانات المقرر الأساسية للبدء ببناء المنهج</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#77829A] hover:text-[#17213A] text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                  <label className="block text-xs font-bold text-[#17213A] mb-1.5">
                    المادة التعليمية
                  </label>
                  <Input
                    value={createSubject}
                    onChange={(e) => setCreateSubject(e.target.value)}
                    placeholder="مثال: رياضيات، فيزياء، كيمياء"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#17213A] mb-1.5">
                    وصف المقرر
                  </label>
                  <textarea
                    rows={3}
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="وصف مختصر لمحتوى المقرر وأهدافه التعليمية..."
                    className="w-full rounded-xl border border-[#E5EAF4] p-3 text-xs text-[#17213A] focus:border-[#246BFD] focus:ring-2 focus:ring-[#246BFD]/20 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5EAF4]">
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
                    disabled={creating}
                    isLoading={creating}
                    className="font-bold"
                  >
                    حفظ المقرر
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
