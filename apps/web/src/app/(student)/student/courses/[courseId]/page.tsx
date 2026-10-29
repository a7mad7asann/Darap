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
  User,
  School,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { apiClient } from '@/lib/api-client';
import { StudentLessonDto } from '@darb/contracts';

export default function StudentCourseLearningPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;

  const [courseInfo, setCourseInfo] = React.useState<any>(null);
  const [lessons, setLessons] = React.useState<StudentLessonDto[]>([]);
  const [selectedLessonId, setSelectedLessonId] = React.useState<string | null>(null);
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

  const activeLesson = lessons.find((l) => l.id === selectedLessonId);

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
      // Open secure pre-signed download URL in new tab / download
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
          <div className="space-y-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {courseInfo.subject || 'مقرر دراسي'}
            </span>
            <h1 className="text-2xl font-bold text-slate-800">{courseInfo.title}</h1>
            <p className="text-sm text-slate-600 max-w-3xl">
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

        {lessons.length === 0 ? (
          <EmptyState
            title="لم يتم نشر دروس في هذا المقرر بعد"
            message="المعلم يعد الدروس وسيقوم بنشرها قريباً."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar Lessons Navigation */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  دروس المقرر ({lessons.length})
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  {completedCount}/{lessons.length} مكتمل
                </span>
              </div>

              <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                {lessons.map((lesson, idx) => {
                  const isSelected = lesson.id === selectedLessonId;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`w-full text-right p-3 rounded-xl text-xs transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-50 text-blue-900 border border-blue-200 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
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

            {/* Active Lesson Reader & Files */}
            <div className="lg:col-span-8 space-y-6">
              {activeLesson ? (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">
                          الدرس {activeLesson.orderIndex + 1}
                        </span>
                        <CardTitle className="text-xl font-bold text-slate-800 mt-0.5">
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
                    {/* Lesson Text Content */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 mb-2">شرح الدرس</h3>
                      {activeLesson.content ? (
                        <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                          {activeLesson.content}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">لا يوجد محتوى نصي مضاف لهذا الدرس.</p>
                      )}
                    </div>

                    {/* Lesson Attached Files */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        المستندات والملفات المرفقة ({activeLesson.files.length})
                      </h3>

                      {activeLesson.files.length === 0 ? (
                        <p className="text-xs text-slate-400">لا توجد ملفات مرفقة لهذا الدرس.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeLesson.files.map((file) => (
                            <div
                              key={file.id}
                              className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs shadow-xs"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                                <div>
                                  <p className="font-bold text-slate-800 truncate">
                                    {file.originalName}
                                  </p>
                                  <p className="text-slate-400 text-[10px]">
                                    {(file.byteSize / 1024 / 1024).toFixed(1)} MB
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
