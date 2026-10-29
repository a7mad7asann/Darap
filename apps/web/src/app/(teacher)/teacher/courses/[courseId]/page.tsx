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
  FolderPlus,
  Folder,
  Edit2,
  Layers,
  ChevronDown,
  ChevronUp,
  FileQuestion,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { RichEditor } from '@/components/ui/rich-editor';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { TeacherAssignmentsTab } from '@/components/teacher/teacher-assignments-tab';
import { TeacherExamsTab } from '@/components/teacher/teacher-exams-tab';
import { apiClient } from '@/lib/api-client';
import {
  CourseDetailsDto,
  CourseStatus,
  LessonDto,
  SectionSummaryDto,
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
  const [activeTab, setActiveTab] = React.useState<
    'lessons' | 'codes' | 'students' | 'assignments' | 'exams'
  >('lessons');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Section modal state
  const [showSectionModal, setShowSectionModal] = React.useState(false);
  const [editingSection, setEditingSection] = React.useState<SectionSummaryDto | null>(null);
  const [sectionTitle, setSectionTitle] = React.useState('');
  const [sectionDescription, setSectionDescription] = React.useState('');
  const [submittingSection, setSubmittingSection] = React.useState(false);

  // Lesson modal state
  const [showLessonModal, setShowLessonModal] = React.useState(false);
  const [editingLessonId, setEditingLessonId] = React.useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = React.useState('');
  const [lessonContent, setLessonContent] = React.useState('');
  const [lessonSectionId, setLessonSectionId] = React.useState<string>('');
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

  // Section Handlers
  const handleOpenCreateSection = () => {
    setEditingSection(null);
    setSectionTitle('');
    setSectionDescription('');
    setShowSectionModal(true);
  };

  const handleOpenEditSection = (section: SectionSummaryDto) => {
    setEditingSection(section);
    setSectionTitle(section.title);
    setSectionDescription(section.description || '');
    setShowSectionModal(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim()) return;

    setSubmittingSection(true);
    try {
      if (editingSection) {
        const updated = await apiClient.updateSection(editingSection.id, {
          title: sectionTitle.trim(),
          description: sectionDescription.trim() || undefined,
        });
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                sections: (prev.sections || []).map((s) => (s.id === updated.id ? updated : s)),
              }
            : prev,
        );
      } else {
        const created = await apiClient.createSection(courseId, {
          title: sectionTitle.trim(),
          description: sectionDescription.trim() || undefined,
        });
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                sections: [...(prev.sections || []), created],
              }
            : prev,
        );
      }
      setShowSectionModal(false);
      setSectionTitle('');
      setSectionDescription('');
      setEditingSection(null);
    } catch (err: any) {
      alert(err.message || 'تعذر حفظ بيانات القسم');
    } finally {
      setSubmittingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (
      !confirm(
        'هل أنت متأكد من حذف هذا القسم؟ سيتم نقل الدروس التابعة له إلى الدروس العامة دون حذفها.',
      )
    ) {
      return;
    }
    try {
      await apiClient.deleteSection(sectionId);
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              sections: (prev.sections || []).filter((s) => s.id !== sectionId),
              lessons: prev.lessons.map((l) =>
                l.sectionId === sectionId ? { ...l, sectionId: null, sectionTitle: null } : l,
              ),
            }
          : prev,
      );
    } catch (err: any) {
      alert(err.message || 'تعذر حذف القسم');
    }
  };

  // Lesson Handlers
  const handleOpenCreateLesson = (defaultSectionId: string = '') => {
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonContent('');
    setLessonSectionId(defaultSectionId);
    setShowLessonModal(true);
  };

  const handleOpenEditLesson = (lesson: LessonDto) => {
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || '');
    setLessonSectionId(lesson.sectionId || '');
    setShowLessonModal(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;

    setSubmittingLesson(true);
    try {
      if (editingLessonId) {
        const updated = await apiClient.updateLesson(editingLessonId, {
          title: lessonTitle.trim(),
          content: lessonContent.trim() || undefined,
          sectionId: lessonSectionId ? lessonSectionId : null,
        });
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                lessons: prev.lessons.map((l) => (l.id === editingLessonId ? { ...l, ...updated } : l)),
              }
            : prev,
        );
      } else {
        const newLesson = await apiClient.createLesson(courseId, {
          title: lessonTitle.trim(),
          content: lessonContent.trim() || undefined,
          sectionId: lessonSectionId ? lessonSectionId : undefined,
        });
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                lessons: [...prev.lessons, newLesson],
              }
            : prev,
        );
      }
      setShowLessonModal(false);
      setLessonTitle('');
      setLessonContent('');
      setLessonSectionId('');
      setEditingLessonId(null);
    } catch (err: any) {
      alert(err.message || 'تعذر حفظ الدرس');
    } finally {
      setSubmittingLesson(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدرس؟')) return;
    try {
      await apiClient.deleteLesson(lessonId);
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              lessons: prev.lessons.filter((l) => l.id !== lessonId),
            }
          : prev,
      );
    } catch (err: any) {
      alert(err.message || 'تعذر حذف الدرس');
    }
  };

  const handlePublishLesson = async (lessonId: string) => {
    try {
      const updated = await apiClient.publishLesson(lessonId);
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              lessons: prev.lessons.map((l) =>
                l.id === lessonId ? { ...l, isPublished: updated.isPublished } : l,
              ),
            }
          : prev,
      );
    } catch (err: any) {
      alert(err.message || 'تعذر نشر الدرس');
    }
  };

  const handleArchiveLesson = async (lessonId: string) => {
    try {
      const updated = await apiClient.archiveLesson(lessonId);
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              lessons: prev.lessons.map((l) =>
                l.id === lessonId ? { ...l, isPublished: updated.isPublished } : l,
              ),
            }
          : prev,
      );
    } catch (err: any) {
      alert(err.message || 'تعذر إلغاء نشر الدرس');
    }
  };

  // Join Code Handlers
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

  // File Upload Handlers
  const handleTriggerUpload = (lessonId: string) => {
    setUploadingForLessonId(lessonId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingForLessonId) return;

    setUploading(true);
    try {
      const presign = await apiClient.presignLessonUpload(uploadingForLessonId, {
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        byteSize: file.size,
      });

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

  const sections = course.sections || [];
  const unsectionedLessons = course.lessons.filter((l) => !l.sectionId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16" dir="rtl">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
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
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {course.subject || 'عام'}
                  </span>
                  {course.gradeLevel && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      المرحلة: {course.gradeLevel}
                    </span>
                  )}
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
                <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                  {course.description || 'لا يوجد وصف تفصيلي.'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 border-t md:border-t-0 md:border-r pr-0 md:pr-6 pt-3 md:pt-0">
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{sections.length}</p>
                  <p>وحدات</p>
                </div>
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
            الهيكل والدروس ({course.lessons.length})
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
          <button
            onClick={() => setActiveTab('assignments')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'assignments'
                ? 'border-emerald-600 text-emerald-600 font-bold'
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
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            الاختبارات الإلكترونية
          </button>
        </div>

        {/* TAB 1: Sections & Lessons */}
        {activeTab === 'lessons' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">هيكل المقرر الدراسي والدروس</h2>
                <p className="text-xs text-slate-500">
                  قم بتنظيم الدروس في وحدات/أقسام تعليمية وارفق أوراق العمل ومستندات الشرح
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleOpenCreateSection}
                  variant="outline"
                  size="sm"
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                >
                  <FolderPlus className="w-4 h-4 ml-1" />
                  إضافة وحدة / قسم
                </Button>
                <Button
                  onClick={() => handleOpenCreateLesson('')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  <PlusCircle className="w-4 h-4 ml-1" />
                  إضافة درس جديد
                </Button>
              </div>
            </div>

            {/* Section Modal */}
            {showSectionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-bold text-slate-800">
                      {editingSection ? 'تعديل بيانات القسم' : 'إضافة وحدة / قسم جديد'}
                    </h3>
                    <button
                      onClick={() => setShowSectionModal(false)}
                      className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveSection} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        عنوان القسم / الوحدة <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        value={sectionTitle}
                        onChange={(e) => setSectionTitle(e.target.value)}
                        placeholder="مثال: الوحدة الأولى: الدوال والمتباينات"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        وصف موجز للقسم (اختياري)
                      </label>
                      <textarea
                        rows={3}
                        value={sectionDescription}
                        onChange={(e) => setSectionDescription(e.target.value)}
                        placeholder="أدخل ملخصاً أو أهداف هذه الوحدة التعليمية..."
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowSectionModal(false)}
                        disabled={submittingSection}
                      >
                        إلغاء
                      </Button>
                      <Button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={submittingSection}
                      >
                        {submittingSection ? 'جاري الحفظ...' : 'حفظ القسم'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Lesson Modal (Create / Edit with Rich Editor) */}
            {showLessonModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-4 my-8">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-bold text-slate-800">
                      {editingLessonId ? 'تعديل الدرس' : 'إضافة درس تعليمي جديد'}
                    </h3>
                    <button
                      onClick={() => setShowLessonModal(false)}
                      className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveLesson} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          عنوان الدرس <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          required
                          value={lessonTitle}
                          onChange={(e) => setLessonTitle(e.target.value)}
                          placeholder="مثال: خصائص الأعداد الحقيقية"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          القسم / الوحدة التابع لها
                        </label>
                        <select
                          value={lessonSectionId}
                          onChange={(e) => setLessonSectionId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="">دروس عامة (بدون قسم)</option>
                          {sections.map((sec) => (
                            <option key={sec.id} value={sec.id}>
                              {sec.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        محتوى الشرح والتوضيح (يدعم تنسيق Markdown ومعاينة حية)
                      </label>
                      <RichEditor
                        value={lessonContent}
                        onChange={setLessonContent}
                        placeholder="اكتب محتوى الشرح، المعادلات، التمارين، والنقاط الرئيسية هنا..."
                        minHeight="min-h-[260px]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
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
                        {submittingLesson ? 'جاري الحفظ...' : 'حفظ بيانات الدرس'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Curriculum Tree (Sections and Lessons) */}
            {sections.length === 0 && course.lessons.length === 0 ? (
              <EmptyState
                title="لا توجد وحدات أو دروس مضافة لهذا المقرر بعد"
                message="ابدأ بإضافة وحدة دراسية جديدة أو أضف أول درس لطلابك."
                actionLabel="إضافة وحدة / قسم"
                onAction={handleOpenCreateSection}
              />
            ) : (
              <div className="space-y-6">
                {/* 1. Render Defined Sections */}
                {sections.map((section, sIdx) => {
                  const sectionLessons = course.lessons.filter((l) => l.sectionId === section.id);
                  return (
                    <div
                      key={section.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                    >
                      {/* Section Header */}
                      <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                            {sIdx + 1}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                              <Folder className="w-4 h-4 text-emerald-600" />
                              {section.title}
                            </h3>
                            {section.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                {section.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                            {sectionLessons.length} دروس
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenCreateLesson(section.id)}
                            className="text-emerald-700 hover:bg-emerald-50 text-xs"
                          >
                            <PlusCircle className="w-3.5 h-3.5 ml-1" />
                            درس بالقسم
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditSection(section)}
                            className="text-slate-600 hover:bg-slate-200 text-xs p-1.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSection(section.id)}
                            className="text-rose-600 hover:bg-rose-50 text-xs p-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Section Lessons */}
                      <div className="p-4 space-y-3">
                        {sectionLessons.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            لا توجد دروس في هذه الوحدة حتى الآن.{' '}
                            <button
                              onClick={() => handleOpenCreateLesson(section.id)}
                              className="text-emerald-600 font-semibold underline hover:text-emerald-700"
                            >
                              أضف درساً الآن
                            </button>
                          </div>
                        ) : (
                          sectionLessons.map((lesson, lIdx) => renderLessonCard(lesson, lIdx))
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 2. Render Unsectioned Lessons (if any) */}
                {unsectionedLessons.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <h3 className="font-bold text-slate-800 text-base">دروس عامة (بدون قسم)</h3>
                        <span className="text-xs text-slate-400 mr-2">
                          ({unsectionedLessons.length} دروس)
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenCreateLesson('')}
                        className="text-emerald-700 hover:bg-emerald-50 text-xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5 ml-1" />
                        إضافة درس عام
                      </Button>
                    </div>

                    <div className="p-4 space-y-3">
                      {unsectionedLessons.map((lesson, lIdx) => renderLessonCard(lesson, lIdx))}
                    </div>
                  </div>
                )}
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

            {/* Codes List */}
            {joinCodes.length === 0 ? (
              <EmptyState
                title="لا توجد أكواد انضمام منشأة لهذا المقرر"
                message="أنشئ كود انضمام ليتمكن طلابك من التسجيل في المقرر مباشرة."
                actionLabel="توليد كود"
                onAction={() => setShowCodeModal(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {joinCodes.map((c) => {
                  const isRevoked = c.status === 'REVOKED';
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  const isFull = c.maxUses && c.currentUses >= c.maxUses;
                  const isActive = !isRevoked && !isExpired && !isFull;

                  return (
                    <Card key={c.id} className="border-slate-200">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-base font-bold bg-slate-100 px-3 py-1 rounded-md text-slate-800">
                            {c.codeHint}
                          </span>
                          {isActive ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              نشط وصالح
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {isRevoked ? 'ملغى' : isExpired ? 'منتهي الصلاحية' : 'مكتمل الاستخدام'}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 space-y-1">
                          <p>
                            الاستخدام: <strong>{c.currentUses}</strong> /{' '}
                            {c.maxUses ? c.maxUses : 'غير محدود'}
                          </p>
                          <p>
                            تاريخ الصلاحية:{' '}
                            {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ar-EG') : 'دائم'}
                          </p>
                        </div>

                        {isActive && (
                          <div className="pt-2 border-t flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeCode(c.id)}
                              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              إلغاء تفعيل الكود
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Enrolled Students */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">الطلاب المسجلون في المقرر</h2>
            {students.length === 0 ? (
              <EmptyState
                title="لا يوجد طلاب مسجلون بعد"
                message="شارك كود الانضمام مع طلابك وسيظهرون هنا فور تسجيلهم."
              />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3">اسم الطالب</th>
                      <th className="p-3">اسم المستخدم</th>
                      <th className="p-3">تاريخ الانضمام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((st) => (
                      <tr key={st.studentId} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{st.displayName}</td>
                        <td className="p-3 font-mono text-slate-500">{st.username}</td>
                        <td className="p-3 text-slate-400">
                          {new Date(st.enrolledAt).toLocaleDateString('ar-EG')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Assignments & Grading */}
        {activeTab === 'assignments' && (
          <TeacherAssignmentsTab courseId={courseId} />
        )}

        {/* TAB 5: Exams & Auto-Grading */}
        {activeTab === 'exams' && (
          <TeacherExamsTab courseId={courseId} />
        )}
      </main>
    </div>
  );

  function renderLessonCard(lesson: LessonDto, idx: number) {
    return (
      <Card key={lesson.id} className="border-slate-200 bg-white">
        <CardHeader className="py-3 px-5 flex flex-row items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
              {idx + 1}
            </span>
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">{lesson.title}</CardTitle>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span>الترتيب: {lesson.orderIndex + 1}</span>
                {lesson.sectionTitle && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                      {lesson.sectionTitle}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lesson.isPublished ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  منشور للطلاب
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleArchiveLesson(lesson.id)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                  title="إلغاء النشر"
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </div>
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

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleOpenEditLesson(lesson)}
              className="text-slate-600 hover:bg-slate-100 text-xs p-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteLesson(lesson.id)}
              className="text-rose-600 hover:bg-rose-50 text-xs p-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {lesson.content ? (
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100 text-sm">
              <MarkdownContent content={lesson.content} />
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">لا يوجد محتوى نصي مضاف.</p>
          )}

          {/* Attached Files */}
          {lesson.files && lesson.files.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                أوراق العمل والملفات المرفقة ({lesson.files.length}):
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
    );
  }
}
