'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  FileText,
  KeyRound,
  Users,
  PlusCircle,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Paperclip,
  Upload,
  Send,
  Archive,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { apiClient } from '@/lib/api-client';
import {
  CourseDetailsDto,
  CourseStatus,
  LessonDto,
  JoinCodeSummaryDto,
  EnrolledStudentSummaryDto,
} from '@darb/contracts';

export default function TeacherCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;

  const [course, setCourse] = React.useState<CourseDetailsDto | null>(null);
  const [joinCodes, setJoinCodes] = React.useState<JoinCodeSummaryDto[]>([]);
  const [students, setStudents] = React.useState<EnrolledStudentSummaryDto[]>([]);
  const [activeTab, setActiveTab] = React.useState<'lessons' | 'codes' | 'students'>('lessons');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Lesson modal state
  const [showLessonModal, setShowLessonModal] = React.useState(false);
  const [lessonTitle, setLessonTitle] = React.useState('');
  const [lessonContent, setLessonContent] = React.useState('');
  const [submittingLesson, setSubmittingLesson] = React.useState(false);

  // Join code modal state
  const [showCodeModal, setShowCodeModal] = React.useState(false);
  const [maxUses, setMaxUses] = React.useState<number | ''>('');
  const [expiresInDays, setExpiresInDays] = React.useState<number | ''>(14);
  const [submittingCode, setSubmittingCode] = React.useState(false);
  const [newRawCode, setNewRawCode] = React.useState<string | null>(null);
  const [copiedCode, setCopiedCode] = React.useState(false);

  // File upload state
  const [uploadingForLessonId, setUploadingForLessonId] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const loadCourseData = React.useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const [courseData, codesData, studentsData] = await Promise.all([
        apiClient.getTeacherCourse(courseId),
        apiClient.getCourseJoinCodes(courseId),
        apiClient.getCourseStudents(courseId),
      ]);
      setCourse(courseData);
      setJoinCodes(codesData);
      setStudents(studentsData);
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل بيانات المقرر');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;

    setSubmittingLesson(true);
    try {
      const newLesson = await apiClient.createLesson(courseId, {
        title: lessonTitle.trim(),
        content: lessonContent.trim() || undefined,
      });
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              lessons: [...prev.lessons, newLesson],
            }
          : prev,
      );
      setShowLessonModal(false);
      setLessonTitle('');
      setLessonContent('');
    } catch (err: any) {
      alert(err.message || 'تعذر إنشاء الدرس');
    } finally {
      setSubmittingLesson(false);
    }
  };

  const handlePublishLesson = async (lessonId: string) => {
    try {
      const updated = await apiClient.publishLesson(lessonId);
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              lessons: prev.lessons.map((l) => (l.id === lessonId ? updated : l)),
            }
          : prev,
      );
    } catch (err: any) {
      alert(err.message || 'تعذر نشر الدرس');
    }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCode(true);
    try {
      const res = await apiClient.generateJoinCode(courseId, {
        maxUses: maxUses ? Number(maxUses) : undefined,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      });
      setNewRawCode(res.rawCode || null);
      setJoinCodes((prev) => [
        {
          id: res.id,
          codeHint: res.codeHint,
          maxUses: res.maxUses,
          currentUses: res.currentUses,
          expiresAt: res.expiresAt,
          status: res.status,
          createdAt: res.createdAt,
        },
        ...prev,
      ]);
      setShowCodeModal(false);
      setMaxUses('');
      setExpiresInDays(14);
    } catch (err: any) {
      alert(err.message || 'تعذر توليد كود الانضمام');
    } finally {
      setSubmittingCode(false);
    }
  };

  const handleRevokeCode = async (codeId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء كود الانضمام هذا؟ لن يتمكن أي طالب جديد من استخدامه.')) return;
    try {
      await apiClient.revokeJoinCode(codeId);
      setJoinCodes((prev) =>
        prev.map((c) => (c.id === codeId ? { ...c, status: 'REVOKED' as any } : c)),
      );
    } catch (err: any) {
      alert(err.message || 'تعذر إلغاء الكود');
    }
  };

  const handleTriggerUpload = (lessonId: string) => {
    setUploadingForLessonId(lessonId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingForLessonId) return;

    setUploading(true);
    try {
      // 1. Request presigned upload URL
      const presign = await apiClient.presignLessonUpload(uploadingForLessonId, {
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        byteSize: file.size,
      });

      // 2. Upload file to presigned URL
      const uploadRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/pdf',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('فشل رفع الملف إلى وحدة التخزين');
      }

      // 3. Complete and link file to lesson
      await apiClient.completeUpload(uploadingForLessonId, {
        storageKey: presign.storageKey,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        byteSize: file.size,
        uploadTicket: presign.uploadTicket,
      });

      await loadCourseData();
      alert('تم إرفاق الملف بالدرس بنجاح');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setUploading(false);
      setUploadingForLessonId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (lessonId: string, fileId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الملف المرفق؟')) return;
    try {
      await apiClient.deleteLessonFile(lessonId, fileId);
      await loadCourseData();
    } catch (err: any) {
      alert(err.message || 'تعذر حذف الملف');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loading message="جاري تحميل تفاصيل المقرر والدروس..." />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md">
          <ErrorState
            title="تعذر تحميل المقرر"
            message={error || 'المقرر غير موجود'}
            onRetry={loadCourseData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16" dir="rtl">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/teacher"
              className="text-slate-500 hover:text-slate-800 flex items-center text-sm font-medium"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              المقررات
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-800 line-clamp-1">{course.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {course.status === CourseStatus.DRAFT && (
              <Button
                size="sm"
                onClick={async () => {
                  await apiClient.publishCourse(course.id);
                  setCourse((prev) =>
                    prev ? { ...prev, status: CourseStatus.PUBLISHED, isActive: true } : prev,
                  );
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="w-4 h-4 ml-1" />
                نشر المقرر للطلاب
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Prominent One-Time Join Code Banner */}
        {newRawCode && (
          <div className="p-5 rounded-2xl bg-amber-500 text-slate-950 shadow-lg border border-amber-600 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-6 h-6 text-slate-950" />
                <h3 className="font-bold text-lg">تم إنشاء كود انضمام جديد بنجاح!</h3>
              </div>
              <button
                onClick={() => setNewRawCode(null)}
                className="text-xs bg-black/10 hover:bg-black/20 px-2.5 py-1 rounded-md font-semibold"
              >
                إغلاق الإشعار
              </button>
            </div>
            <p className="text-sm">
              شارك هذا الكود مع طلابك الآن للانضمام إلى المقرر. <strong>تنبيه أمني هام:</strong> لن يتم عرض الكود الخام مرة أخرى وسيحفظ في النظام كـ Hash مشفر فقط.
            </p>
            <div className="flex items-center gap-3 bg-white/90 p-3 rounded-xl border border-amber-400">
              <span className="font-mono text-xl font-bold tracking-wider text-slate-900 select-all">
                {newRawCode}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(newRawCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2500);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white ml-auto"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 ml-1" />
                    تم النسخ!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 ml-1" />
                    نسخ الكود
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Course Header Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {course.subject || 'عام'}
                  </span>
                  {course.status === CourseStatus.PUBLISHED ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      منشور للطلاب
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      مسودة
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-slate-800">{course.title}</h1>
                <p className="text-sm text-slate-600 max-w-3xl">
                  {course.description || 'لا يوجد وصف تفصيلي.'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 border-t md:border-t-0 md:border-r pr-0 md:pr-6 pt-3 md:pt-0">
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{course.lessons.length}</p>
                  <p>دروس</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{students.length}</p>
                  <p>طلاب</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{joinCodes.length}</p>
                  <p>أكواد</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('lessons')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'lessons'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            الدروس والمحتوى ({course.lessons.length})
          </button>
          <button
            onClick={() => setActiveTab('codes')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'codes'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            رموز الانضمام ({joinCodes.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'students'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            الطلاب المسجلون ({students.length})
          </button>
        </div>

        {/* TAB 1: Lessons & Content */}
        {activeTab === 'lessons' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">قائمة دروس المقرر</h2>
              <Button
                onClick={() => setShowLessonModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                <PlusCircle className="w-4 h-4 ml-1" />
                إضافة درس جديد
              </Button>
            </div>

            {/* Create Lesson Modal */}
            {showLessonModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-bold text-slate-800">إضافة درس جديد</h3>
                    <button
                      onClick={() => setShowLessonModal(false)}
                      className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateLesson} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        عنوان الدرس <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        value={lessonTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        placeholder="مثال: مقدمة في حساب التفاضل والتكامل"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        محتوى الشرح (نصي)
                      </label>
                      <textarea
                        rows={6}
                        value={lessonContent}
                        onChange={(e) => setLessonContent(e.target.value)}
                        placeholder="أدخل نص المحاضرة والشروحات التعليمية هنا..."
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowLessonModal(false)}
                        disabled={submittingLesson}
                      >
                        إلغاء
                      </Button>
                      <Button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={submittingLesson}
                      >
                        {submittingLesson ? 'جاري الحفظ...' : 'حفظ الدرس'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Lessons List */}
            {course.lessons.length === 0 ? (
              <EmptyState
                title="لا توجد دروس مضافة لهذا المقرر بعد"
                message="أضف أول درس وارفق ملفات الشرح والمستندات التعليمية."
                actionLabel="إضافة درس"
                onAction={() => setShowLessonModal(true)}
              />
            ) : (
              <div className="space-y-4">
                {course.lessons.map((lesson, idx) => (
                  <Card key={lesson.id} className="border-slate-200">
                    <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm">
                          {idx + 1}
                        </span>
                        <div>
                          <CardTitle className="text-base font-bold text-slate-800">
                            {lesson.title}
                          </CardTitle>
                          <span className="text-xs text-slate-400">
                            الترتيب: {lesson.orderIndex + 1}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {lesson.isPublished ? (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            منشور
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePublishLesson(lesson.id)}
                            className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          >
                            <Send className="w-3.5 h-3.5 ml-1" />
                            نشر الدرس
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTriggerUpload(lesson.id)}
                          disabled={uploading}
                          className="text-xs"
                        >
                          <Upload className="w-3.5 h-3.5 ml-1" />
                          إرفاق ملف
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-4">
                      {lesson.content ? (
                        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          {lesson.content}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">لا يوجد محتوى نصي مضاف.</p>
                      )}

                      {/* Attached files */}
                      {lesson.files && lesson.files.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                            الملفات المرفقة ({lesson.files.length}):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {lesson.files.map((file: any) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="font-medium truncate">{file.originalName}</span>
                                  <span className="text-slate-400 shrink-0">
                                    ({(file.byteSize / 1024 / 1024).toFixed(1)} MB)
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteFile(lesson.id, file.id)}
                                  className="text-rose-500 hover:text-rose-700 p-1 h-auto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Join Codes */}
        {activeTab === 'codes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">رموز الانضمام للمقرر</h2>
                <p className="text-xs text-slate-500">
                  توليد رموز آمنة ومحمية بتشفير SHA-256 مع تحكم بالصلاحية وعدد الاستخدامات
                </p>
              </div>
              <Button
                onClick={() => setShowCodeModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                <PlusCircle className="w-4 h-4 ml-1" />
                توليد كود انضمام جديد
              </Button>
            </div>

            {/* Generate Code Modal */}
            {showCodeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-bold text-slate-800">توليد كود انضمام جديد</h3>
                    <button
                      onClick={() => setShowCodeModal(false)}
                      className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleGenerateCode} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        الحد الأقصى لعدد مرات الاستخدام
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="اتركه فارغاً لاستخدام غير محدود"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : '')}
                      />
                      <span className="text-xs text-slate-400">
                        مثال: 30 طالب للفصل الدراسي
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        مدة الصلاحية (بالأيام)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={expiresInDays}
                        onChange={(e) =>
                          setExpiresInDays(e.target.value ? Number(e.target.value) : '')
                        }
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCodeModal(false)}
                        disabled={submittingCode}
                      >
                        إلغاء
                      </Button>
                      <Button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={submittingCode}
                      >
                        {submittingCode ? 'جاري التوليد...' : 'توليد الكود'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Codes List Table */}
            {joinCodes.length === 0 ? (
              <EmptyState
                title="لا توجد رموز انضمام لهذا المقرر حتى الآن"
                message="قم بتوليد كود انضمام لتزويده لطلابك ليتمكنوا من التسجيل في المقرر."
                actionLabel="توليد كود انضمام"
                onAction={() => setShowCodeModal(true)}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                    <tr>
                      <th className="py-3 px-4">تلميح الرمز (Hint)</th>
                      <th className="py-3 px-4">مرات الاستخدام</th>
                      <th className="py-3 px-4">تاريخ الانتهاء</th>
                      <th className="py-3 px-4">الحالة</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {joinCodes.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {c.codeHint}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {c.currentUses} / {c.maxUses ?? 'غير محدود'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ar-EG') : 'دائم'}
                        </td>
                        <td className="py-3 px-4">
                          {c.status === 'ACTIVE' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              نشط
                            </span>
                          )}
                          {c.status === 'EXPIRED' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                              منتهي الصلاحية
                            </span>
                          )}
                          {c.status === 'REVOKED' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              ملغي
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {c.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeCode(c.id)}
                              className="text-rose-600 hover:bg-rose-50 text-xs"
                            >
                              إلغاء الكود
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Enrolled Students */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">قائمة الطلاب المسجلين بالمقرر</h2>

            {students.length === 0 ? (
              <EmptyState
                title="لم ينضم أي طالب للمقرر حتى الآن"
                message="شارك كود الانضمام مع طلابك وسيظهرون في هذا السجل فور انضمامهم."
                actionLabel="توليد كود انضمام"
                onAction={() => {
                  setActiveTab('codes');
                  setShowCodeModal(true);
                }}
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                    <tr>
                      <th className="py-3 px-4">اسم الطالب</th>
                      <th className="py-3 px-4">اسم المستخدم</th>
                      <th className="py-3 px-4">تاريخ الانضمام</th>
                      <th className="py-3 px-4">كود الانضمام المستخدم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr key={s.enrollmentId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-800">{s.displayName}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{s.username}</td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {new Date(s.enrolledAt).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">
                          {s.joinedViaCodeHint || 'تسجيل مباشر'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
