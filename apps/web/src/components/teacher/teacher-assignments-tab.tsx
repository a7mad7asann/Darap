'use client';

import * as React from 'react';
import {
  FileText,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Edit2,
  Trash2,
  Send,
  Lock,
  ChevronDown,
  ChevronUp,
  User,
  ExternalLink,
  Award,
  X,
  Check,
  Sparkles,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { apiClient } from '@/lib/api-client';
import {
  AssignmentDetailDto,
  AssignmentStatus,
  AssignmentSummaryDto,
  SubmissionStatus,
} from '@darb/contracts';

interface TeacherAssignmentsTabProps {
  courseId: string;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'primary' | 'warning';
  action: () => Promise<void>;
}

export function TeacherAssignmentsTab({ courseId }: TeacherAssignmentsTabProps) {
  const [assignments, setAssignments] = React.useState<AssignmentSummaryDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Notifications
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Custom Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialogState | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = React.useState(false);

  // Create / Edit modal state
  const [showModal, setShowModal] = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState<AssignmentSummaryDto | null>(null);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [maxScore, setMaxScore] = React.useState<number>(100);
  const [dueDate, setDueDate] = React.useState('');
  const [publishImmediately, setPublishImmediately] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Submissions review drawer / modal state
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] =
    React.useState<AssignmentDetailDto | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = React.useState(false);
  const [scoresMap, setScoresMap] = React.useState<Record<string, number>>({});
  const [feedbackMap, setFeedbackMap] = React.useState<Record<string, string>>({});
  const [savingGradeId, setSavingGradeId] = React.useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = React.useState<string | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const loadAssignments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTeacherAssignments(courseId);
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل الواجبات والتكليفات');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleOpenCreate = () => {
    setEditingAssignment(null);
    setTitle('');
    setDescription('');
    setMaxScore(100);
    setDueDate('');
    setPublishImmediately(false);
    setShowModal(true);
  };

  const handleOpenEdit = (a: AssignmentSummaryDto) => {
    setEditingAssignment(a);
    setTitle(a.title);
    setDescription(a.description || '');
    setMaxScore(a.maxScore);
    if (a.dueDate) {
      const d = new Date(a.dueDate);
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setDueDate(iso);
    } else {
      setDueDate('');
    }
    setPublishImmediately(false);
    setShowModal(true);
  };

  const setRelativeDueDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 0, 0);
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setDueDate(iso);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      if (editingAssignment) {
        await apiClient.updateAssignment(editingAssignment.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          maxScore: Number(maxScore),
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        });
        showNotification('success', 'تم تعديل بيانات الواجب بنجاح');
      } else {
        const created = await apiClient.createAssignment(courseId, {
          title: title.trim(),
          description: description.trim() || undefined,
          maxScore: Number(maxScore),
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        });

        if (publishImmediately) {
          await apiClient.publishAssignment(created.id);
          showNotification('success', 'تم إنشاء الواجب ونشره مباشرة للطلاب');
        } else {
          showNotification('success', 'تم حفظ الواجب كمسودة بنجاح');
        }
      }
      setShowModal(false);
      await loadAssignments();
    } catch (err: any) {
      showNotification('error', err.message || 'تعذر حفظ الواجب');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = (assignmentId: string, assignmentTitle: string) => {
    setConfirmDialog({
      title: 'نشر التكليف للطلاب',
      message: `هل أنت متأكد من نشر التكليف "${assignmentTitle}"؟ سيتمكن جميع الطلاب المسجلين في المقرر من الاطلاع على التكليف وإرسال حلولهم.`,
      confirmLabel: 'نشر الآن',
      variant: 'primary',
      action: async () => {
        await apiClient.publishAssignment(assignmentId);
        showNotification('success', 'تم نشر التكليف بنجاح لجميع طلاب المقرر');
        await loadAssignments();
      },
    });
  };

  const handleClose = (assignmentId: string, assignmentTitle: string) => {
    setConfirmDialog({
      title: 'إغلاق استقبال التسليمات',
      message: `هل أنت متأكد من إغلاق التكليف "${assignmentTitle}"؟ لن يتمكن الطلاب بعد الإغلاق من تقديم أي تسليمات جديدة.`,
      confirmLabel: 'إغلاق التكليف',
      variant: 'warning',
      action: async () => {
        await apiClient.closeAssignment(assignmentId);
        showNotification('success', 'تم إغلاق التكليف بنجاح');
        await loadAssignments();
      },
    });
  };

  const handleDelete = (assignmentId: string, assignmentTitle: string) => {
    setConfirmDialog({
      title: 'حذف التكليف الدراسي',
      message: `هل أنت متأكد من حذف التكليف "${assignmentTitle}"؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.`,
      confirmLabel: 'حذف نهائي',
      variant: 'danger',
      action: async () => {
        await apiClient.deleteAssignment(assignmentId);
        showNotification('success', 'تم حذف التكليف بنجاح');
        await loadAssignments();
      },
    });
  };

  const handleExecuteConfirm = async () => {
    if (!confirmDialog) return;
    setConfirmSubmitting(true);
    try {
      await confirmDialog.action();
      setConfirmDialog(null);
    } catch (err: any) {
      showNotification('error', err.message || 'تعذر تنفيذ الإجراء');
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const handleViewSubmissions = async (assignmentId: string) => {
    setLoadingSubmissions(true);
    try {
      const details = await apiClient.getTeacherAssignmentDetails(assignmentId);
      setSelectedAssignmentDetails(details);
      const scores: Record<string, number> = {};
      const fbs: Record<string, string> = {};
      for (const s of details.submissions || []) {
        if (s.score !== null && s.score !== undefined) {
          scores[s.id] = s.score;
        }
        if (s.feedback) {
          fbs[s.id] = s.feedback;
        }
      }
      setScoresMap(scores);
      setFeedbackMap(fbs);
    } catch (err: any) {
      showNotification('error', err.message || 'تعذر تحميل بيانات التسليمات');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGradeSubmission = async (submissionId: string) => {
    const score = scoresMap[submissionId];
    if (score === undefined || isNaN(score)) {
      showNotification('error', 'الرجاء إدخال درجة صالحة');
      return;
    }
    if (selectedAssignmentDetails && (score < 0 || score > selectedAssignmentDetails.maxScore)) {
      showNotification('error', `الدرجة يجب أن تكون بين 0 و ${selectedAssignmentDetails.maxScore}`);
      return;
    }

    setSavingGradeId(submissionId);
    try {
      const res = await apiClient.gradeSubmission(submissionId, {
        score,
        feedback: feedbackMap[submissionId] || undefined,
      });

      setSelectedAssignmentDetails((prev) => {
        if (!prev) return prev;
        const subs = prev.submissions || [];
        return {
          ...prev,
          submissions: subs.map((s) => (s.id === submissionId ? res : s)),
          gradedCount: subs.filter((s) => s.id === submissionId || s.status === SubmissionStatus.GRADED).length,
        };
      });

      await loadAssignments();
      showNotification('success', 'تم حفظ الدرجة والتقييم بنجاح');
    } catch (err: any) {
      showNotification('error', err.message || 'تعذر حفظ الدرجة');
    } finally {
      setSavingGradeId(null);
    }
  };

  const handleDownloadAttachment = async (fileId: string) => {
    setDownloadingFileId(fileId);
    try {
      const res = await apiClient.presignTeacherSubmissionDownload(fileId);
      window.open(res.downloadUrl, '_blank');
    } catch (err: any) {
      showNotification('error', err.message || 'تعذر تحميل الملف المرفق');
    } finally {
      setDownloadingFileId(null);
    }
  };

  if (loading) {
    return <Loading message="جاري تحميل الواجبات والتكليفات..." />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-xs font-medium animate-in fade-in duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E5EAF4] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#246BFD]/10 flex items-center justify-center text-[#246BFD]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#17213A]">الواجبات والتكليفات الدراسية</h2>
            <p className="text-xs text-[#77829A]">
              إنشاء الواجبات، تحديد مواعيد الاستحقاق والدرجات القصوى، وتصحيح تسليمات الطلاب ورصد التقييمات
            </p>
          </div>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-[#246BFD] hover:bg-[#1A56DE] text-white shadow-sm shadow-[#246BFD]/25 font-semibold text-xs px-4 py-2 rounded-xl"
        >
          <PlusCircle className="w-4 h-4" />
          إنشاء واجب جديد
        </Button>
      </div>

      {/* Assignment List */}
      {assignments.length === 0 ? (
        <EmptyState
          title="لا توجد واجبات دراسية بعد"
          message="قم بإنشاء أول تكليف أو واجب لطلاب المقرر لقياس مدى استيعابهم للمحتوى التعليمي وتحديد مواعيد التسليم."
          actionLabel="إنشاء واجب جديد"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid gap-3.5">
          {assignments.map((assignment) => {
            const isDraft = assignment.status === AssignmentStatus.DRAFT;
            const isPublished = assignment.status === AssignmentStatus.PUBLISHED;
            const isClosed = assignment.status === AssignmentStatus.CLOSED;

            return (
              <Card
                key={assignment.id}
                className="overflow-hidden border-[#E5EAF4] bg-white hover:border-[#246BFD]/40 hover:shadow-sm transition-all rounded-2xl"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-[#17213A]">{assignment.title}</span>
                        {isDraft && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            مسودة
                          </span>
                        )}
                        {isPublished && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            منشور للطلاب
                          </span>
                        )}
                        {isClosed && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            مغلق
                          </span>
                        )}
                        {assignment.isOverdue && isPublished && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            انتهى موعد التسليم
                          </span>
                        )}
                      </div>

                      {assignment.description && (
                        <p className="text-xs text-[#77829A] line-clamp-2 leading-relaxed">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#77829A] pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4]">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          الدرجة القصوى: <strong className="text-[#17213A]">{assignment.maxScore}</strong>
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4]">
                          <Calendar className="w-3.5 h-3.5 text-[#246BFD]" />
                          تاريخ الاستحقاق:{' '}
                          {assignment.dueDate ? (
                            <strong className="text-[#17213A]" dir="ltr">
                              {new Date(assignment.dueDate).toLocaleString('ar-SA')}
                            </strong>
                          ) : (
                            <span className="text-slate-400">غير محدد</span>
                          )}
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4]">
                          <User className="w-3.5 h-3.5 text-[#246BFD]" />
                          التسليمات: <strong className="text-[#17213A]">{assignment.submissionsCount}</strong>
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          تم التصحيح: <strong className="text-[#17213A]">{assignment.gradedCount}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                      {isDraft && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handlePublish(assignment.id, assignment.title)}
                            className="text-xs flex items-center gap-1.5 bg-[#246BFD] hover:bg-[#1A56DE] text-white font-semibold rounded-xl px-3"
                          >
                            <Send className="w-3.5 h-3.5" />
                            نشر التكليف
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(assignment)}
                            className="text-xs flex items-center gap-1.5 border-[#E5EAF4] hover:bg-[#F5F7FC] text-[#17213A] rounded-xl px-3"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(assignment.id, assignment.title)}
                            className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl px-2.5"
                            title="حذف الواجب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}

                      {isPublished && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleViewSubmissions(assignment.id)}
                            className="text-xs flex items-center gap-1.5 bg-[#246BFD] hover:bg-[#1A56DE] text-white font-semibold rounded-xl px-3"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            التسليمات والتصحيح ({assignment.submissionsCount})
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleClose(assignment.id, assignment.title)}
                            className="text-xs text-amber-700 border-amber-200 hover:bg-amber-50 flex items-center gap-1.5 rounded-xl px-3"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            إغلاق
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(assignment)}
                            className="text-xs flex items-center gap-1.5 border-[#E5EAF4] hover:bg-[#F5F7FC] text-[#17213A] rounded-xl px-3"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            تعديل
                          </Button>
                        </>
                      )}

                      {isClosed && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleViewSubmissions(assignment.id)}
                            className="text-xs flex items-center gap-1.5 bg-[#246BFD] hover:bg-[#1A56DE] text-white font-semibold rounded-xl px-3"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            عرض التسليمات ({assignment.submissionsCount})
                          </Button>
                          <span className="text-xs text-slate-400 font-medium px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            مغلق نهائياً
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Create or Edit Assignment */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101A35]/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E5EAF4] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5EAF4] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#246BFD]/10 text-[#246BFD] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17213A]">
                    {editingAssignment ? 'تعديل بيانات الواجب الدراسي' : 'إنشاء واجب دراسي جديد'}
                  </h3>
                  <p className="text-xs text-[#77829A]">
                    {editingAssignment
                      ? 'تحديث التوجيهات، الموعد النهائي أو الدرجة القصوى'
                      : 'حدد تفاصيل الواجب والدرجات وموعد التسليم لطلابك'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
              {/* Title Field */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#17213A]">
                  عنوان الواجب أو التكليف <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: واجب الدرس الثاني - حل المعادلات الخطية"
                  maxLength={150}
                  className="rounded-xl border-[#E5EAF4] text-xs h-10 focus:border-[#246BFD] focus:ring-[#246BFD]/20"
                />
              </div>

              {/* Instructions / Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#17213A]">
                    تعليمات الواجب وتفاصيل المطلوب
                  </label>
                  <span className="text-[11px] text-[#77829A]">اختياري</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="اكتب التوجيهات والأسئلة المطلوبة من الطلاب بالتفصيل، والشروط الواجب مراعاتها عند الحل..."
                  className="w-full rounded-xl border border-[#E5EAF4] p-3 text-xs text-[#17213A] focus:outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] transition leading-relaxed"
                />
              </div>

              {/* Max Score with Quick Presets */}
              <div className="space-y-2">
                <label className="block font-semibold text-[#17213A]">
                  الدرجة القصوى للواجب <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    required
                    min={1}
                    max={1000}
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-32 rounded-xl border-[#E5EAF4] text-xs font-bold text-center h-10 focus:border-[#246BFD]"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[10, 20, 50, 100].map((scorePreset) => (
                      <button
                        key={scorePreset}
                        type="button"
                        onClick={() => setMaxScore(scorePreset)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                          maxScore === scorePreset
                            ? 'bg-[#246BFD] text-white border-[#246BFD]'
                            : 'bg-[#F5F7FC] text-[#77829A] border-[#E5EAF4] hover:bg-[#E8EEFF] hover:text-[#246BFD]'
                        }`}
                      >
                        {scorePreset} درجة
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Due Date with Quick Shortcuts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#17213A]">
                    تاريخ ووقت الاستحقاق (الموعد النهائي)
                  </label>
                  <span className="text-[11px] text-[#77829A]">اختياري</span>
                </div>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  dir="ltr"
                  className="rounded-xl border-[#E5EAF4] text-xs h-10 focus:border-[#246BFD]"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] text-[#77829A] ml-1">تحديد سريع:</span>
                  <button
                    type="button"
                    onClick={() => setRelativeDueDate(3)}
                    className="px-2.5 py-1 rounded-lg border border-[#E5EAF4] bg-[#F5F7FC] hover:bg-[#E8EEFF] hover:text-[#246BFD] text-[11px] text-[#77829A] transition"
                  >
                    بعد 3 أيام
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDueDate(7)}
                    className="px-2.5 py-1 rounded-lg border border-[#E5EAF4] bg-[#F5F7FC] hover:bg-[#E8EEFF] hover:text-[#246BFD] text-[11px] text-[#77829A] transition"
                  >
                    بعد أسبوع
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDueDate(14)}
                    className="px-2.5 py-1 rounded-lg border border-[#E5EAF4] bg-[#F5F7FC] hover:bg-[#E8EEFF] hover:text-[#246BFD] text-[11px] text-[#77829A] transition"
                  >
                    بعد أسبوعين
                  </button>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate('')}
                      className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] text-rose-700 transition"
                    >
                      إلغاء الموعد
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#77829A] flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                  أي تسليم يتم بعد هذا التوقيت سيتم وسمه تلقائياً كـ &ldquo;تسليم متأخر&rdquo;.
                </p>
              </div>

              {/* Publish option for new assignments */}
              {!editingAssignment && (
                <div className="p-3.5 rounded-2xl bg-[#F5F7FC] border border-[#E5EAF4] flex items-center justify-between cursor-pointer hover:bg-[#E8EEFF]/40 transition">
                  <div className="flex items-center gap-2.5">
                    <input
                      id="publishImmediatelyCheckbox"
                      type="checkbox"
                      checked={publishImmediately}
                      onChange={(e) => setPublishImmediately(e.target.checked)}
                      className="w-4 h-4 rounded text-[#246BFD] focus:ring-[#246BFD] cursor-pointer"
                    />
                    <label
                      htmlFor="publishImmediatelyCheckbox"
                      className="text-xs font-semibold text-[#17213A] cursor-pointer"
                    >
                      نشر التكليف فوراً للطلاب بعد الحفظ
                    </label>
                  </div>
                  <span className="text-[11px] text-[#77829A]">
                    {publishImmediately ? 'سيكون متاحاً للحل مباشرة' : 'سيُحفظ كمسودة أولاً'}
                  </span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E5EAF4]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="rounded-xl border-[#E5EAF4] text-xs h-9 px-4 text-[#77829A] hover:text-[#17213A]"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#246BFD] hover:bg-[#1A56DE] text-white font-semibold text-xs h-9 px-5 flex items-center gap-2 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : editingAssignment ? (
                    'حفظ التعديلات'
                  ) : publishImmediately ? (
                    'إنشاء ونشر الآن'
                  ) : (
                    'حفظ كمسودة'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101A35]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E5EAF4] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-50 text-rose-600'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-[#246BFD]/10 text-[#246BFD]'
                }`}
              >
                {confirmDialog.variant === 'danger' ? (
                  <Trash2 className="w-5 h-5" />
                ) : confirmDialog.variant === 'warning' ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </div>
              <h3 className="text-base font-bold text-[#17213A]">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-[#77829A] leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EAF4]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog(null)}
                disabled={confirmSubmitting}
                className="rounded-xl border-[#E5EAF4] text-xs text-[#77829A]"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteConfirm}
                disabled={confirmSubmitting}
                className={`rounded-xl text-xs font-semibold px-4 flex items-center gap-1.5 ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-[#246BFD] hover:bg-[#1A56DE] text-white'
                }`}
              >
                {confirmSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {confirmDialog.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Submissions & Grade */}
      {selectedAssignmentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101A35]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E5EAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-[#E5EAF4] flex items-center justify-between bg-[#F5F7FC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#246BFD]/10 text-[#246BFD] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17213A]">
                    تسليمات الواجب: {selectedAssignmentDetails.title}
                  </h3>
                  <p className="text-xs text-[#77829A] mt-0.5">
                    الدرجة القصوى: <strong className="text-[#17213A]">{selectedAssignmentDetails.maxScore}</strong> | إجمالي التسليمات:{' '}
                    <strong className="text-[#17213A]">{(selectedAssignmentDetails.submissions || []).length}</strong> | تم التصحيح:{' '}
                    <strong className="text-emerald-700">{selectedAssignmentDetails.gradedCount}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssignmentDetails(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white flex items-center justify-center transition border border-[#E5EAF4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Submissions List */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {(selectedAssignmentDetails.submissions || []).length === 0 ? (
                <EmptyState
                  title="لا توجد تسليمات بعد"
                  message="لم يقم أي طالب بتقديم حل لهذا الواجب حتى الآن."
                />
              ) : (
                (selectedAssignmentDetails.submissions || []).map((sub) => {
                  const isGraded = sub.status === SubmissionStatus.GRADED;
                  const isLate = sub.status === SubmissionStatus.LATE;

                  return (
                    <Card key={sub.id} className="border-[#E5EAF4] rounded-2xl overflow-hidden bg-white">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5EAF4] pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#17213A]">{sub.studentName}</span>
                            <span className="text-xs text-[#77829A]">(@{sub.studentUsername})</span>
                            {isLate && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                تسليم متأخر
                              </span>
                            )}
                            {isGraded && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                تم الرصد والتصحيح
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#77829A]" dir="ltr">
                            {new Date(sub.submittedAt).toLocaleString('ar-SA')}
                          </span>
                        </div>

                        {/* Text Answer */}
                        {sub.textContent && (
                          <div className="bg-[#F5F7FC] p-3.5 rounded-xl border border-[#E5EAF4] text-xs">
                            <span className="font-semibold text-[#17213A] block mb-1">إجابة الطالب:</span>
                            <div className="whitespace-pre-wrap text-[#17213A] leading-relaxed">
                              {sub.textContent}
                            </div>
                          </div>
                        )}

                        {/* Attachments */}
                        {sub.attachments && sub.attachments.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="font-semibold text-[#17213A] text-xs block">الملفات المرفقة:</span>
                            <div className="flex flex-wrap gap-2">
                              {sub.attachments.map((att) => (
                                <button
                                  key={att.id}
                                  type="button"
                                  onClick={() => handleDownloadAttachment(att.fileId)}
                                  disabled={downloadingFileId === att.fileId}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E5EAF4] bg-white hover:bg-[#F5F7FC] text-xs text-[#17213A] transition"
                                >
                                  {downloadingFileId === att.fileId ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#246BFD]" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5 text-[#246BFD]" />
                                  )}
                                  <span className="truncate max-w-[200px]">{att.originalName}</span>
                                  <span className="text-[10px] text-[#77829A]">
                                    ({(att.byteSize / (1024 * 1024)).toFixed(2)} ميجابايت)
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Grading Form */}
                        <div className="mt-3 pt-3 border-t border-[#E5EAF4] bg-[#F5F7FC] p-3.5 rounded-2xl border border-[#E5EAF4]">
                          <div className="flex flex-wrap items-center gap-3 mb-2.5">
                            <label className="text-xs font-bold text-[#17213A] flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-amber-500" />
                              الدرجة المستحقة (من {selectedAssignmentDetails.maxScore}):
                            </label>
                            <Input
                              type="number"
                              min={0}
                              max={selectedAssignmentDetails.maxScore}
                              value={scoresMap[sub.id] ?? ''}
                              onChange={(e) =>
                                setScoresMap({ ...scoresMap, [sub.id]: Number(e.target.value) })
                              }
                              className="w-24 text-center font-bold text-xs bg-white rounded-xl border-[#E5EAF4] h-9 focus:border-[#246BFD]"
                              placeholder="الدرجة"
                            />
                            {isGraded && (
                              <span className="text-xs text-emerald-700 font-medium">
                                (تم الرصد مسبقاً بواسطة {sub.graderName || 'المعلم'})
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[#77829A] block">
                              ملاحظات وتوجيهات المعلم للطالب:
                            </label>
                            <textarea
                              rows={2}
                              value={feedbackMap[sub.id] ?? ''}
                              onChange={(e) =>
                                setFeedbackMap({ ...feedbackMap, [sub.id]: e.target.value })
                              }
                              placeholder="أحسنت في الحل، ولكن انتبه إلى..."
                              className="w-full rounded-xl border border-[#E5EAF4] bg-white p-2.5 text-xs text-[#17213A] focus:outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] transition"
                            />
                          </div>

                          <div className="flex justify-end pt-2.5">
                            <Button
                              size="sm"
                              onClick={() => handleGradeSubmission(sub.id)}
                              disabled={savingGradeId === sub.id}
                              className="text-xs flex items-center gap-1.5 bg-[#246BFD] hover:bg-[#1A56DE] text-white font-semibold rounded-xl px-4 h-9"
                            >
                              {savingGradeId === sub.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  جاري الحفظ...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  حفظ الدرجة والملاحظات
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
