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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { MarkdownContent } from '@/components/ui/markdown-content';
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

export function TeacherAssignmentsTab({ courseId }: TeacherAssignmentsTabProps) {
  const [assignments, setAssignments] = React.useState<AssignmentSummaryDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create / Edit modal state
  const [showModal, setShowModal] = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState<AssignmentSummaryDto | null>(null);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [maxScore, setMaxScore] = React.useState<number>(100);
  const [dueDate, setDueDate] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Submissions review drawer / modal state
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] =
    React.useState<AssignmentDetailDto | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = React.useState(false);
  const [gradingSubmissionId, setGradingSubmissionId] = React.useState<string | null>(null);
  const [scoresMap, setScoresMap] = React.useState<Record<string, number>>({});
  const [feedbackMap, setFeedbackMap] = React.useState<Record<string, string>>({});
  const [savingGradeId, setSavingGradeId] = React.useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = React.useState<string | null>(null);

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
    setShowModal(true);
  };

  const handleOpenEdit = (a: AssignmentSummaryDto) => {
    setEditingAssignment(a);
    setTitle(a.title);
    setDescription(a.description || '');
    setMaxScore(a.maxScore);
    if (a.dueDate) {
      const d = new Date(a.dueDate);
      const iso = d.toISOString().slice(0, 16);
      setDueDate(iso);
    } else {
      setDueDate('');
    }
    setShowModal(true);
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
      } else {
        await apiClient.createAssignment(courseId, {
          title: title.trim(),
          description: description.trim() || undefined,
          maxScore: Number(maxScore),
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        });
      }
      setShowModal(false);
      await loadAssignments();
    } catch (err: any) {
      alert(err.message || 'تعذر حفظ الواجب');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (assignmentId: string) => {
    if (!confirm('هل أنت متأكد من نشر هذا التكليف؟ سيتمكن جميع الطلاب المسجلين من الاطلاع عليه وتسليمه.')) {
      return;
    }
    try {
      await apiClient.publishAssignment(assignmentId);
      await loadAssignments();
    } catch (err: any) {
      alert(err.message || 'تعذر نشر الواجب');
    }
  };

  const handleClose = async (assignmentId: string) => {
    if (!confirm('هل أنت متأكد من إغلاق هذا التكليف؟ لن يتمكن الطلاب من إرسال تسليمات جديدة.')) {
      return;
    }
    try {
      await apiClient.closeAssignment(assignmentId);
      await loadAssignments();
    } catch (err: any) {
      alert(err.message || 'تعذر إغلاق الواجب');
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الواجب؟')) {
      return;
    }
    try {
      await apiClient.deleteAssignment(assignmentId);
      await loadAssignments();
    } catch (err: any) {
      alert(err.message || 'تعذر حذف الواجب');
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
      alert(err.message || 'تعذر تحميل بيانات التسليمات');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGradeSubmission = async (submissionId: string) => {
    const score = scoresMap[submissionId];
    if (score === undefined || isNaN(score)) {
      alert('الرجاء إدخال درجة صالحة');
      return;
    }
    if (selectedAssignmentDetails && (score < 0 || score > selectedAssignmentDetails.maxScore)) {
      alert(`الدرجة يجب أن تكون بين 0 و ${selectedAssignmentDetails.maxScore}`);
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
      alert('تم حفظ الدرجة والتقييم بنجاح');
    } catch (err: any) {
      alert(err.message || 'تعذر حفظ الدرجة');
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
      alert(err.message || 'تعذر تحميل الملف المرفق');
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">الواجبات والتكليفات الدراسية</h2>
          <p className="text-xs text-slate-500">
            إنشاء الواجبات، تحديد مواعيد الاستحقاق والدرجات القصوى، وتقييم وتصحيح تسليمات الطلاب يدوياً
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          إنشاء واجب جديد
        </Button>
      </div>

      {/* Assignment List */}
      {assignments.length === 0 ? (
        <EmptyState
          title="لا توجد واجبات دراسية بعد"
          message="قم بإنشاء أول تكليف أو واجب لطلاب المقرر لقياس مدى استيعابهم للمحتوى التعليمي."
          actionLabel="إنشاء واجب جديد"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const isDraft = assignment.status === AssignmentStatus.DRAFT;
            const isPublished = assignment.status === AssignmentStatus.PUBLISHED;
            const isClosed = assignment.status === AssignmentStatus.CLOSED;

            return (
              <Card key={assignment.id} className="overflow-hidden border-slate-200 hover:shadow-sm transition">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-slate-900">{assignment.title}</span>
                        {isDraft && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            مسودة
                          </span>
                        )}
                        {isPublished && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            منشور
                          </span>
                        )}
                        {isClosed && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            مغلق
                          </span>
                        )}
                        {assignment.isOverdue && isPublished && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            انتهى موعد التسليم
                          </span>
                        )}
                      </div>

                      {assignment.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          الدرجة القصوى: <strong className="text-slate-800">{assignment.maxScore}</strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          تاريخ الاستحقاق:{' '}
                          {assignment.dueDate ? (
                            <strong className="text-slate-800" dir="ltr">
                              {new Date(assignment.dueDate).toLocaleString('ar-SA')}
                            </strong>
                          ) : (
                            'غير محدد'
                          )}
                        </span>

                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-500" />
                          التسليمات: <strong className="text-slate-800">{assignment.submissionsCount}</strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          تم التصحيح: <strong className="text-slate-800">{assignment.gradedCount}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                      {isDraft && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handlePublish(assignment.id)}
                            className="text-xs flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Send className="w-3.5 h-3.5" />
                            نشر التكليف
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(assignment)}
                            className="text-xs flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(assignment.id)}
                            className="text-xs text-rose-600 hover:bg-rose-50"
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
                            className="text-xs flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            التسليمات والتصحيح ({assignment.submissionsCount})
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleClose(assignment.id)}
                            className="text-xs text-amber-700 border-amber-200 hover:bg-amber-50 flex items-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            إغلاق
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(assignment)}
                            className="text-xs flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            تعديل
                          </Button>
                        </>
                      )}

                      {isClosed && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleViewSubmissions(assignment.id)}
                            className="text-xs flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            عرض التسليمات ({assignment.submissionsCount})
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(assignment)}
                            disabled
                            className="text-xs opacity-50 cursor-not-allowed"
                            title="لا يمكن تعديل واجب مغلق"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            مغلق
                          </Button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingAssignment ? 'تعديل بيانات الواجب' : 'إنشاء واجب دراسي جديد'}
            </h3>

            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  عنوان الواجب أو التكليف <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: واجب الدرس الثاني - حل المعادلات الخطية"
                  maxLength={150}
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  تعليمات الواجب وتفاصيل المطلوب
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="اكتب التوجيهات والأسئلة المطلوبة من الطلاب بالتفصيل..."
                  className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    الدرجة القصوى <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    required
                    min={1}
                    max={1000}
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    تاريخ ووقت الاستحقاق (اختياري)
                  </label>
                  <Input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    dir="ltr"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    التسليم بعد هذا الموعد سيُصنف كتسليم متأخر
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'جاري الحفظ...' : editingAssignment ? 'حفظ التعديلات' : 'إنشاء كمسودة'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer: View Submissions & Grade */}
      {selectedAssignmentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  تسليمات الواجب: {selectedAssignmentDetails.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  الدرجة القصوى: <strong>{selectedAssignmentDetails.maxScore}</strong> | إجمالي التسليمات:{' '}
                  <strong>{(selectedAssignmentDetails.submissions || []).length}</strong> | تم التصحيح:{' '}
                  <strong className="text-emerald-700">{selectedAssignmentDetails.gradedCount}</strong>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAssignmentDetails(null)}
              >
                إغلاق
              </Button>
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
                    <Card key={sub.id} className="border-slate-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{sub.studentName}</span>
                            <span className="text-xs text-slate-400">(@{sub.studentUsername})</span>
                            {isLate && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                تسليم متأخر
                              </span>
                            )}
                            {isGraded && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                تم الرصد والتصحيح
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500" dir="ltr">
                            {new Date(sub.submittedAt).toLocaleString('ar-SA')}
                          </span>
                        </div>

                        {/* Text Answer */}
                        {sub.textContent && (
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                            <span className="font-semibold text-slate-600 block mb-1">إجابة الطالب:</span>
                            <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                              {sub.textContent}
                            </div>
                          </div>
                        )}

                        {/* Attachments */}
                        {sub.attachments && sub.attachments.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-600 text-xs block">الملفات المرفقة:</span>
                            <div className="flex flex-wrap gap-2">
                              {sub.attachments.map((att) => (
                                <button
                                  key={att.id}
                                  type="button"
                                  onClick={() => handleDownloadAttachment(att.fileId)}
                                  disabled={downloadingFileId === att.fileId}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 transition"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="truncate max-w-[200px]">{att.originalName}</span>
                                  <span className="text-[10px] text-slate-400">
                                    ({(att.byteSize / (1024 * 1024)).toFixed(2)} ميجابايت)
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Grading Form */}
                        <div className="mt-3 pt-3 border-t border-slate-100 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/60">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <Award className="w-4 h-4 text-emerald-600" />
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
                              className="w-24 text-center font-bold text-sm bg-white"
                              placeholder="الدرجة"
                            />
                            {isGraded && (
                              <span className="text-xs text-emerald-700 font-medium">
                                (تم الرصد مسبقاً بواسطة {sub.graderName || 'المعلم'})
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700 block">
                              ملاحظات وتوجيهات المعلم للطالب:
                            </label>
                            <textarea
                              rows={2}
                              value={feedbackMap[sub.id] ?? ''}
                              onChange={(e) =>
                                setFeedbackMap({ ...feedbackMap, [sub.id]: e.target.value })
                              }
                              placeholder="أحسنت في الحل، ولكن انتبه إلى..."
                              className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleGradeSubmission(sub.id)}
                              disabled={savingGradeId === sub.id}
                              className="text-xs flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {savingGradeId === sub.id ? 'جاري الحفظ...' : 'حفظ الدرجة والملاحظات'}
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
