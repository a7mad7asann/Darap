'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  FileText,
  CheckCircle2,
  Download,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User,
  School,
  Folder,
  Layers,
  FileQuestion,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { StudentAssignmentsView } from '@/components/student/student-assignments-view';
import { StudentExamsView } from '@/components/student/student-exams-view';
import { apiClient } from '@/lib/api-client';
import { StudentLessonDto } from '@darb/contracts';

export default function StudentCourseLearningPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;

  const [courseInfo, setCourseInfo] = React.useState<any>(null);
  const [lessons, setLessons] = React.useState<StudentLessonDto[]>([]);
  const [selectedLessonId, setSelectedLessonId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'lessons' | 'assignments' | 'exams'>('lessons');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingProgress, setUpdatingProgress] = React.useState(false);
  const [downloadingFileId, setDownloadingFileId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const [details, publishedLessons] = await Promise.all([
        apiClient.getStudentCourse(courseId),
        apiClient.getStudentLessons(courseId),
      ]);
      setCourseInfo(details);
      setLessons(publishedLessons);

      if (publishedLessons.length > 0 && !selectedLessonId) {
        setSelectedLessonId(publishedLessons[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل بيانات المقرر أو لست مسجلاً به');
    } finally {
      setLoading(false);
    }
  }, [courseId, selectedLessonId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const activeIndex = lessons.findIndex((l) => l.id === selectedLessonId);
  const activeLesson = activeIndex >= 0 ? lessons[activeIndex] : null;
  const prevLesson = activeIndex > 0 ? lessons[activeIndex - 1] : null;
  const nextLesson = activeIndex >= 0 && activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null;

  const handleToggleProgress = async (lessonId: string, currentStatus: boolean) => {
    setUpdatingProgress(true);
    try {
      const res = await apiClient.markLessonProgress(lessonId, !currentStatus);
      setLessons((prev) =>
        prev.map((l) =>
          l.id === lessonId
            ? { ...l, isCompleted: res.isCompleted, completedAt: res.completedAt }
            : l,
        ),
      );
    } catch (err: any) {
      alert(err.message || 'تعذر تحديث حالة إكمال الدرس');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleDownloadFile = async (fileId: string) => {
    setDownloadingFileId(fileId);
    try {
      const res = await apiClient.presignStudentDownload(fileId);
      window.open(res.downloadUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'تعذر الحصول على رابط تحميل الملف');
    } finally {
      setDownloadingFileId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loading message="جاري تجهيز محتوى الدروس والملفات التعليمية..." />
      </div>
    );
  }

  if (error || !courseInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md">
          <ErrorState
            title="تعذر الوصول لمحتوى المقرر"
            message={error || 'المقرر غير متوفر أو لست مسجلاً به'}
            onRetry={loadData}
          />
        </div>
      </div>
    );
  }

  const completedCount = lessons.filter((l) => l.isCompleted).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // Group lessons by sections
  const sectionsList: Array<{ id: string | null; title: string; lessons: StudentLessonDto[] }> = [];
  const registeredSections = courseInfo.sections || [];

  // 1. Add defined sections
  for (const sec of registeredSections) {
    const secLessons = lessons.filter((l) => l.sectionId === sec.id);
    if (secLessons.length > 0) {
      sectionsList.push({
        id: sec.id,
        title: sec.title,
        lessons: secLessons,
      });
    }
  }

  // 2. Add unsectioned lessons (if any)
  const unsectioned = lessons.filter((l) => !l.sectionId || !registeredSections.some((s: any) => s.id === l.sectionId));
  if (unsectioned.length > 0) {
    sectionsList.push({
      id: null,
      title: sectionsList.length > 0 ? 'دروس عامة' : 'جميع الدروس',
      lessons: unsectioned,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16" dir="rtl">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="text-slate-500 hover:text-slate-800 flex items-center text-sm font-medium"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              بوابة الطالب
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-800 line-clamp-1">{courseInfo.title}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-left hidden sm:block">
              <span className="text-xs text-slate-500 font-medium">
                إنجاز المقرر: {completedCount} من {lessons.length} ({progressPercent}%)
              </span>
              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Course Header Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {courseInfo.subject || 'مقرر دراسي'}
              </span>
              {courseInfo.gradeLevel && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {courseInfo.gradeLevel}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{courseInfo.title}</h1>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              {courseInfo.description || 'لا يوجد وصف مضاف لهذا المقرر.'}
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 border-t md:border-t-0 md:border-r pr-0 md:pr-6 pt-3 md:pt-0">
            <div>
              <p className="flex items-center gap-1 font-medium text-slate-700">
                <User className="w-3.5 h-3.5 text-blue-600" />
                {courseInfo.teacherName}
              </p>
              <p className="flex items-center gap-1 text-slate-400 mt-1">
                <School className="w-3.5 h-3.5" />
                {courseInfo.academyName}
              </p>
            </div>
          </div>
        </div>

        {/* Course Tabs Navigation */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-medium mb-6">
          <button
            onClick={() => setActiveTab('lessons')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'lessons'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            الدروس والمحتوى التعليمي ({lessons.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            الواجبات والتكليفات
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'exams'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            الاختبارات الإلكترونية
          </button>
        </div>

        {activeTab === 'exams' ? (
          <StudentExamsView courseId={courseId} />
        ) : activeTab === 'assignments' ? (
          <StudentAssignmentsView courseId={courseId} />
        ) : lessons.length === 0 ? (
          <EmptyState
            title="لم يتم نشر دروس في هذا المقرر بعد"
            message="المعلم يعد الدروس وسيقوم بنشرها قريباً."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar Sectioned Lessons Navigation */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  منهاج المقرر ({lessons.length} دروس)
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  {completedCount}/{lessons.length} مكتمل
                </span>
              </div>

              <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                {sectionsList.map((sec, sIdx) => (
                  <div key={sec.id || `sec-${sIdx}`} className="space-y-1">
                    <div className="text-xs font-bold text-slate-700 px-2 py-1 bg-slate-50 rounded-lg flex items-center gap-1.5 border border-slate-100">
                      {sec.id ? (
                        <Folder className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{sec.title}</span>
                      <span className="text-[10px] text-slate-400 mr-auto font-normal">
                        ({sec.lessons.length})
                      </span>
                    </div>

                    <div className="space-y-1 pr-2">
                      {sec.lessons.map((lesson) => {
                        const isSelected = lesson.id === selectedLessonId;
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setSelectedLessonId(lesson.id)}
                            className={`w-full text-right p-2.5 rounded-xl text-xs transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-50 text-blue-900 border border-blue-200 font-bold shadow-xs'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {lesson.orderIndex + 1}
                              </span>
                              <span className="truncate">{lesson.title}</span>
                            </div>

                            {lesson.isCompleted && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mr-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Lesson Reader & Files */}
            <div className="lg:col-span-8 space-y-6">
              {activeLesson ? (
                <Card className="border-slate-200 shadow-sm bg-white">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <span>الدرس {activeLesson.orderIndex + 1}</span>
                          {activeLesson.sectionTitle && (
                            <>
                              <span>•</span>
                              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                                {activeLesson.sectionTitle}
                              </span>
                            </>
                          )}
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-900 mt-1">
                          {activeLesson.title}
                        </CardTitle>
                      </div>

                      <Button
                        size="sm"
                        variant={activeLesson.isCompleted ? 'outline' : 'default'}
                        onClick={() =>
                          handleToggleProgress(activeLesson.id, !!activeLesson.isCompleted)
                        }
                        disabled={updatingProgress}
                        className={
                          activeLesson.isCompleted
                            ? 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }
                      >
                        <CheckCircle2 className="w-4 h-4 ml-1.5" />
                        {activeLesson.isCompleted ? 'مكتمل (اضغط للإلغاء)' : 'وضع علامة مكتمل'}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Lesson Rich Content with Safe Markdown */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 mb-3">شرح وتفاصيل الدرس</h3>
                      {activeLesson.content ? (
                        <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 text-sm">
                          <MarkdownContent content={activeLesson.content} />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">لا يوجد محتوى نصي مضاف لهذا الدرس.</p>
                      )}
                    </div>

                    {/* Lesson Attached Worksheets / Files */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        أوراق العمل والمستندات التعليمية ({activeLesson.files.length})
                      </h3>

                      {activeLesson.files.length === 0 ? (
                        <p className="text-xs text-slate-400">لا توجد ملفات مرفقة لهذا الدرس.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeLesson.files.map((file) => (
                            <div
                              key={file.id}
                              className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs shadow-xs hover:border-slate-300 transition"
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 truncate">
                                    {file.originalName}
                                  </p>
                                  <p className="text-slate-400 text-[10px]">
                                    {(file.byteSize / 1024 / 1024).toFixed(1)} ميجابايت
                                  </p>
                                </div>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadFile(file.id)}
                                disabled={downloadingFileId === file.id}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 shrink-0 text-xs"
                              >
                                <Download className="w-3.5 h-3.5 ml-1" />
                                {downloadingFileId === file.id ? 'جاري التحميل...' : 'تحميل'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lesson Footer Navigation Buttons (Previous / Next) */}
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                      {prevLesson ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLessonId(prevLesson.id)}
                          className="text-xs text-slate-700"
                        >
                          <ChevronRight className="w-4 h-4 ml-1" />
                          الدرس السابق: {prevLesson.title}
                        </Button>
                      ) : (
                        <span />
                      )}

                      {nextLesson ? (
                        <Button
                          size="sm"
                          onClick={() => setSelectedLessonId(nextLesson.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs mr-auto"
                        >
                          الدرس التالي: {nextLesson.title}
                          <ChevronLeft className="w-4 h-4 mr-1" />
                        </Button>
                      ) : (
                        <span />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState
                  title="اختر درساً للبدء"
                  message="اختر أحد الدروس من القائمة الجانبية لقراءة الشرح وتنزيل الملفات المرفقة."
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
