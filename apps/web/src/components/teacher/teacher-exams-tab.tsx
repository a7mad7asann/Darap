'use client';

import * as React from 'react';
import {
  FileQuestion,
  PlusCircle,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Send,
  Lock,
  ChevronDown,
  ChevronUp,
  User,
  Check,
  X,
  HelpCircle,
  Eye,
  Info,
  Loader2,
  Sparkles,
  ToggleLeft,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { apiClient } from '@/lib/api-client';
import {
  AttemptReviewDto,
  AttemptStatus,
  ExamAttemptSummaryDto,
  ExamDetailDto,
  ExamQuestionDto,
  ExamStatus,
  ExamSummaryDto,
  QuestionType,
} from '@darb/contracts';

interface TeacherExamsTabProps {
  courseId: string;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'primary' | 'warning';
  action: () => Promise<void>;
}

export function TeacherExamsTab({ courseId }: TeacherExamsTabProps) {
  const [exams, setExams] = React.useState<ExamSummaryDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // In-app Toast Notification
  const [toast, setToast] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Custom Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialogState | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = React.useState(false);

  // Create / Edit Exam Modal
  const [showExamModal, setShowExamModal] = React.useState(false);
  const [editingExam, setEditingExam] = React.useState<ExamSummaryDto | null>(null);
  const [title, setTitle] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const [durationMinutes, setDurationMinutes] = React.useState<number>(45);
  const [maxAttempts, setMaxAttempts] = React.useState<number>(1);
  const [passingScore, setPassingScore] = React.useState<number | ''>('');
  const [submittingExam, setSubmittingExam] = React.useState(false);

  // Question Management Modal
  const [selectedExamDetails, setSelectedExamDetails] = React.useState<ExamDetailDto | null>(null);
  const [loadingExamDetails, setLoadingExamDetails] = React.useState(false);
  const [showAddQuestion, setShowAddQuestion] = React.useState(false);
  const [questionPrompt, setQuestionPrompt] = React.useState('');
  const [questionPoints, setQuestionPoints] = React.useState<number>(1);
  const [options, setOptions] = React.useState<Array<{ content: string; isCorrect: boolean }>>([
    { content: '', isCorrect: true },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
  ]);
  const [submittingQuestion, setSubmittingQuestion] = React.useState(false);

  // Exam Submissions Modal
  const [submissionsExam, setSubmissionsExam] = React.useState<ExamSummaryDto | null>(null);
  const [submissions, setSubmissions] = React.useState<ExamAttemptSummaryDto[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = React.useState(false);

  // Attempt Review Modal
  const [reviewAttempt, setReviewAttempt] = React.useState<AttemptReviewDto | null>(null);
  const [loadingReview, setLoadingReview] = React.useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const loadExams = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTeacherExams(courseId);
      setExams(data);
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل قائمة الاختبارات');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    loadExams();
  }, [loadExams]);

  const handleOpenCreateExam = () => {
    setEditingExam(null);
    setTitle('');
    setInstructions('');
    setDurationMinutes(45);
    setMaxAttempts(1);
    setPassingScore('');
    setShowExamModal(true);
  };

  const handleOpenEditExam = (e: ExamSummaryDto) => {
    setEditingExam(e);
    setTitle(e.title);
    setInstructions(e.instructions || '');
    setDurationMinutes(e.durationMinutes);
    setMaxAttempts(e.maxAttempts);
    setPassingScore(e.passingScore !== null ? e.passingScore : '');
    setShowExamModal(true);
  };

  const handleSaveExam = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!title.trim()) return;

    setSubmittingExam(true);
    try {
      if (editingExam) {
        await apiClient.updateExam(editingExam.id, {
          title: title.trim(),
          instructions: instructions.trim() || undefined,
          durationMinutes: Number(durationMinutes),
          maxAttempts: Number(maxAttempts),
          passingScore: passingScore !== '' ? Number(passingScore) : undefined,
        });
        showNotification('success', 'تم تعديل بيانات الاختبار بنجاح');
      } else {
        await apiClient.createExam(courseId, {
          title: title.trim(),
          instructions: instructions.trim() || undefined,
          durationMinutes: Number(durationMinutes),
          maxAttempts: Number(maxAttempts),
          passingScore: passingScore !== '' ? Number(passingScore) : undefined,
        });
        showNotification('success', 'تم إنشاء الاختبار كمسودة. يمكنك الآن إضافة الأسئلة إليه.');
      }
      setShowExamModal(false);
      await loadExams();
    } catch (err: any) {
      showNotification('error', err.message || 'تعذر حفظ الاختبار');
    } finally {
      setSubmittingExam(false);
    }
  };

  const handlePublishExam = (exam: ExamSummaryDto) => {
    if (exam.questionsCount === 0) {
      showNotification('error', 'لا يمكن نشر الاختبار قبل إضافة سؤال واحد على الأقل.');
      return;
    }

    setConfirmDialog({
      title: 'نشر الاختبار الإلكتروني للطلاب',
      message: `هل أنت متأكد من نشر الاختبار "${exam.title}"؟ تأكد من أن الأسئلة والإجابات الصحيحة مكتملة تماماً، حيث سيتمكن الطلاب من بدء محاولاتهم.`,
      confirmLabel: 'نشر الاختبار الآن',
      variant: 'primary',
      action: async () => {
        await apiClient.publishExam(exam.id);
        showNotification('success', 'تم نشر الاختبار بنجاح للطلاب');
        await loadExams();
      },
    });
  };

  const handleCloseExam = (exam: ExamSummaryDto) => {
    setConfirmDialog({
      title: 'إغلاق الاختبار الإلكتروني',
      message: `هل أنت متأكد من إغلاق الاختبار "${exam.title}"؟ لن يتمكن الطلاب من بدء أي محاولة جديدة بعد الإغلاق.`,
      confirmLabel: 'إغلاق الاختبار',
      variant: 'warning',
      action: async () => {
        await apiClient.closeExam(exam.id);
        showNotification('success', 'تم إغلاق الاختبار بنجاح');
        await loadExams();
      },
    });
  };

  const handleDeleteExam = (exam: ExamSummaryDto) => {
    setConfirmDialog({
      title: 'حذف الاختبار الإلكتروني',
      message: `هل أنت متأكد من حذف الاختبار "${exam.title}"؟ سيتم حذف جميع الأسئلة والمحاولات المرتبطة به ولا يمكن استرجاعه.`,
      confirmLabel: 'حذف نهائي',
      variant: 'danger',
      action: async () => {
        await apiClient.deleteExam(exam.id);
        showNotification('success', 'تم حذف الاختبار بنجاح');
        await loadExams();
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

  // Open Question Manager
  const handleOpenQuestions = async (examId: string) => {
    setLoadingExamDetails(true);
    try {
      const details = await apiClient.getTeacherExamDetails(examId);
      setSelectedExamDetails(details);
      setShowAddQuestion(false);
      resetQuestionForm();
    } catch (err: any) {
      showNotification('error', err.message || 'تعذر تحميل تفاصيل أسئلة الاختبار');
    } finally {
      setLoadingExamDetails(false);
    }
  };

  const resetQuestionForm = () => {
    setQuestionPrompt('');
    setQuestionPoints(1);
    setOptions([
      { content: '', isCorrect: true },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
    ]);
  };

  // Template loaders
  const loadMultipleChoiceTemplate = () => {
    setOptions([
      { content: '', isCorrect: true },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
    ]);
  };

  const loadTrueFalseTemplate = () => {
    setOptions([
      { content: 'صح', isCorrect: true },
      { content: 'خطأ', isCorrect: false },
    ]);
  };

  const addOption = () => {
    if (options.length >= 6) {
      showNotification('error', 'الحد الأقصى للخيارات هو 6 خيارات');
      return;
    }
    setOptions([...options, { content: '', isCorrect: false }]);
  };

  const removeOption = (indexToRemove: number) => {
    if (options.length <= 2) {
      showNotification('error', 'يجب أن يحتوي السؤال على خيارين على الأقل');
      return;
    }
    const filtered = options.filter((_, idx) => idx !== indexToRemove);
    // If we removed the correct option, set the first option as correct
    if (options[indexToRemove].isCorrect) {
      filtered[0].isCorrect = true;
    }
    setOptions(filtered);
  };

  const setCorrectOption = (index: number) => {
    setOptions(options.map((opt, idx) => ({ ...opt, isCorrect: idx === index })));
  };

  const handleSaveQuestion = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedExamDetails || !questionPrompt.trim()) return;

    const validOptions = options.filter((o) => o.content.trim().length > 0);
    if (validOptions.length < 2) {
      showNotification('error', 'يجب إدخال خيارين صالحين على الأقل');
      return;
    }

    const hasCorrect = validOptions.some((o) => o.isCorrect);
    if (!hasCorrect) {
      showNotification('error', 'يجب تحديد إجابة صحيحة واحدة على الأقل');
      return;
    }

    setSubmittingQuestion(true);
    try {
      await apiClient.createQuestion(selectedExamDetails.id, {
        prompt: questionPrompt.trim(),
        points: Number(questionPoints),
        options: validOptions.map((o, idx) => ({
          content: o.content.trim(),
          isCorrect: o.isCorrect,
          orderIndex: idx,
        })),
      });

      // Reload exam details
      const updated = await apiClient.getTeacherExamDetails(selectedExamDetails.id);
      setSelectedExamDetails(updated);
      setShowAddQuestion(false);
      resetQuestionForm();
      await loadExams();
      showNotification('success', 'تم حفظ وإضافة السؤال إلى الاختبار بنجاح');
    } catch (err: any) {
      showNotification('error', err.message || 'تعذر حفظ السؤال');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!selectedExamDetails) return;

    setConfirmDialog({
      title: 'حذف السؤال من الاختبار',
      message: 'هل أنت متأكد من حذف هذا السؤال؟ سيتم تحديث مجموع نقاط الاختبار تلقائياً.',
      confirmLabel: 'حذف السؤال',
      variant: 'danger',
      action: async () => {
        await apiClient.deleteQuestion(selectedExamDetails.id, questionId);
        const updated = await apiClient.getTeacherExamDetails(selectedExamDetails.id);
        setSelectedExamDetails(updated);
        await loadExams();
        showNotification('success', 'تم حذف السؤال بنجاح');
      },
    });
  };

  const handleViewSubmissions = async (exam: ExamSummaryDto) => {
    setSubmissionsExam(exam);
    setLoadingSubmissions(true);
    try {
      const data = await apiClient.getTeacherExamSubmissions(exam.id);
      setSubmissions(data);
    } catch (err: any) {
      showNotification('error', err.message || 'تعذر تحميل نتائج الطلاب');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleReviewAttempt = async (attemptId: string) => {
    setLoadingReview(true);
    try {
      const review = await apiClient.getExamAttemptReview(attemptId);
      setReviewAttempt(review);
    } catch (err: any) {
      showNotification('error', err.message || 'تعذر تحميل مراجعة إجابات المحاولة');
    } finally {
      setLoadingReview(false);
    }
  };

  if (loading) {
    return <Loading message="جاري تحميل الاختبارات الإلكترونية..." />;
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
            <FileQuestion className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#17213A]">الاختبارات الإلكترونية والتصحيح التلقائي</h2>
            <p className="text-xs text-[#77829A]">
              إعداد اختبارات الاختيار من متعدد والصح والخطأ، تحديد وقت الاختبار وتوقيته، مع تصحيح فوري ورصد ذري للدرجات
            </p>
          </div>
        </div>
        <Button
          onClick={handleOpenCreateExam}
          className="flex items-center gap-2 bg-[#246BFD] hover:bg-[#1A56DE] text-white shadow-sm shadow-[#246BFD]/25 font-semibold text-xs px-4 py-2 rounded-xl"
        >
          <PlusCircle className="w-4 h-4" />
          إنشاء اختبار جديد
        </Button>
      </div>

      {/* Exams List */}
      {exams.length === 0 ? (
        <EmptyState
          title="لا توجد اختبارات إلكترونية بعد"
          message="قم بإنشاء اختبارك الأول وحدد الأسئلة والخيارات والمدة الزمنية لقياس أداء الطلاب بدقة."
          actionLabel="إنشاء اختبار جديد"
          onAction={handleOpenCreateExam}
        />
      ) : (
        <div className="grid gap-3.5">
          {exams.map((exam) => {
            const isDraft = exam.status === ExamStatus.DRAFT;
            const isPublished = exam.status === ExamStatus.PUBLISHED;
            const isClosed = exam.status === ExamStatus.CLOSED;

            return (
              <Card
                key={exam.id}
                className="overflow-hidden border-[#E5EAF4] bg-white hover:border-[#246BFD]/40 hover:shadow-sm transition-all rounded-2xl"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-[#17213A]">{exam.title}</span>
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
                      </div>

                      {exam.instructions && (
                        <p className="text-xs text-[#77829A] line-clamp-2 leading-relaxed">
                          {exam.instructions}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#77829A] pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4]">
                          <Clock className="w-3.5 h-3.5 text-[#246BFD]" />
                          المدة: <strong className="text-[#17213A]">{exam.durationMinutes} دقيقة</strong>
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4]">
                          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                          الأسئلة: <strong className="text-[#17213A]">{exam.questionsCount}</strong>
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4]">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          مجموع النقاط: <strong className="text-[#17213A]">{exam.totalPoints}</strong>
                        </span>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          أقصى محاولات: <strong className="text-[#17213A]">{exam.maxAttempts}</strong>
                        </span>

                        {exam.passingScore !== null && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4]">
                            درجة النجاح: <strong className="text-[#17213A]">{exam.passingScore}</strong>
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4]">
                          <User className="w-3.5 h-3.5 text-[#77829A]" />
                          المحاولات المقدمة: <strong className="text-[#17213A]">{exam.attemptsCount}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenQuestions(exam.id)}
                        className="text-xs flex items-center gap-1.5 border-[#246BFD]/30 bg-[#246BFD]/5 text-[#246BFD] hover:bg-[#246BFD]/10 rounded-xl px-3 font-semibold"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        إدارة الأسئلة ({exam.questionsCount})
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewSubmissions(exam)}
                        className="text-xs flex items-center gap-1.5 border-[#E5EAF4] hover:bg-[#F5F7FC] text-[#17213A] rounded-xl px-3"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        النتائج ({exam.attemptsCount})
                      </Button>

                      {isDraft && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handlePublishExam(exam)}
                            className="text-xs flex items-center gap-1.5 bg-[#246BFD] hover:bg-[#1A56DE] text-white font-semibold rounded-xl px-3"
                          >
                            <Send className="w-3.5 h-3.5" />
                            نشر الاختبار
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditExam(exam)}
                            className="text-xs flex items-center gap-1.5 border-[#E5EAF4] hover:bg-[#F5F7FC] text-[#17213A] rounded-xl px-3"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteExam(exam)}
                            className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl px-2.5"
                            title="حذف الاختبار"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}

                      {isPublished && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCloseExam(exam)}
                            className="text-xs text-amber-700 border-amber-200 hover:bg-amber-50 flex items-center gap-1.5 rounded-xl px-3"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            إغلاق
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditExam(exam)}
                            className="text-xs flex items-center gap-1.5 border-[#E5EAF4] hover:bg-[#F5F7FC] text-[#17213A] rounded-xl px-3"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            تعديل
                          </Button>
                        </>
                      )}

                      {isClosed && (
                        <span className="text-xs text-slate-400 font-medium px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          مغلق نهائياً
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Exam */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101A35]/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E5EAF4] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5EAF4] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#246BFD]/10 text-[#246BFD] flex items-center justify-center">
                  <FileQuestion className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17213A]">
                    {editingExam ? 'تعديل بيانات الاختبار الإلكتروني' : 'إنشاء اختبار إلكتروني جديد'}
                  </h3>
                  <p className="text-xs text-[#77829A]">
                    {editingExam
                      ? 'تعديل عنوان الاختبار أو المدة أو أقصى عدد للمحاولات'
                      : 'حدد العنوان ومدة الاختبار، ويمكنك إضافة بنك الأسئلة فور إنشائه'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExamModal(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4 text-xs">
              {/* Title Field */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-[#17213A]">
                  عنوان الاختبار <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الاختبار الفصلي الأول في مادة الرياضيات"
                  maxLength={150}
                  className="rounded-xl border-[#E5EAF4] text-xs h-10 focus:border-[#246BFD]"
                />
              </div>

              {/* Instructions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#17213A]">
                    تعليمات وتوجيهات الاختبار للطلاب
                  </label>
                  <span className="text-[11px] text-[#77829A]">اختياري</span>
                </div>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="مثال: اقرأ الأسئلة بعناية قبل الإجابة، يبدأ العداد التنازلي للمحاولة بمجرد الضغط على زر البدء..."
                  className="w-full rounded-xl border border-[#E5EAF4] p-3 text-xs text-[#17213A] focus:outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] transition leading-relaxed"
                />
              </div>

              {/* Duration with Presets */}
              <div className="space-y-2">
                <label className="block font-semibold text-[#17213A]">
                  مدة الاختبار (بالدقائق) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    required
                    min={1}
                    max={300}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-28 rounded-xl border-[#E5EAF4] text-xs font-bold text-center h-10 focus:border-[#246BFD]"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[15, 30, 45, 60, 90, 120].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setDurationMinutes(dur)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                          durationMinutes === dur
                            ? 'bg-[#246BFD] text-white border-[#246BFD]'
                            : 'bg-[#F5F7FC] text-[#77829A] border-[#E5EAF4] hover:bg-[#E8EEFF] hover:text-[#246BFD]'
                        }`}
                      >
                        {dur} دقيقة
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Max Attempts with Presets */}
              <div className="space-y-2">
                <label className="block font-semibold text-[#17213A]">
                  أقصى عدد محاولات مسموح بها للطالب <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-24 rounded-xl border-[#E5EAF4] text-xs font-bold text-center h-10 focus:border-[#246BFD]"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { val: 1, label: 'محاولة واحدة' },
                      { val: 2, label: 'محاولتان' },
                      { val: 3, label: '3 محاولات' },
                      { val: 5, label: '5 محاولات' },
                    ].map((att) => (
                      <button
                        key={att.val}
                        type="button"
                        onClick={() => setMaxAttempts(att.val)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                          maxAttempts === att.val
                            ? 'bg-[#246BFD] text-white border-[#246BFD]'
                            : 'bg-[#F5F7FC] text-[#77829A] border-[#E5EAF4] hover:bg-[#E8EEFF] hover:text-[#246BFD]'
                        }`}
                      >
                        {att.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Passing Score */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-[#17213A]">
                    درجة النجاح الدنيا (اختياري)
                  </label>
                  <span className="text-[11px] text-[#77829A]">اتركها فارغة إذا لم تكن مطلوبة</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={passingScore}
                  onChange={(e) =>
                    setPassingScore(e.target.value !== '' ? Number(e.target.value) : '')
                  }
                  placeholder="مثال: 50"
                  className="rounded-xl border-[#E5EAF4] text-xs h-10 focus:border-[#246BFD]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E5EAF4]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExamModal(false)}
                  disabled={submittingExam}
                  className="rounded-xl border-[#E5EAF4] text-xs h-9 px-4 text-[#77829A] hover:text-[#17213A]"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={submittingExam}
                  className="rounded-xl bg-[#246BFD] hover:bg-[#1A56DE] text-white font-semibold text-xs h-9 px-5 flex items-center gap-2 shadow-sm"
                >
                  {submittingExam ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : editingExam ? (
                    'حفظ التعديلات'
                  ) : (
                    'إنشاء الاختبار كمسودة'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Question Management (Supercharged UX!) */}
      {selectedExamDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101A35]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E5EAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header with Exam Stats */}
            <div className="p-5 border-b border-[#E5EAF4] flex items-center justify-between bg-[#F5F7FC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#246BFD]/10 text-[#246BFD] flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17213A]">
                    بنك أسئلة الاختبار: {selectedExamDetails.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-[#77829A] mt-0.5">
                    <span>
                      إجمالي الأسئلة: <strong className="text-[#17213A]">{selectedExamDetails.questions.length}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      مجموع النقاط: <strong className="text-[#246BFD]">{selectedExamDetails.totalPoints}</strong>
                    </span>
                    <span>•</span>
                    <span>المدة: {selectedExamDetails.durationMinutes} دقيقة</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExamDetails(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white flex items-center justify-center transition border border-[#E5EAF4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Questions List & Add Form */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {!showAddQuestion && (
                <div className="flex items-center justify-between bg-[#F5F7FC] p-3.5 rounded-2xl border border-[#E5EAF4]">
                  <p className="text-xs text-[#77829A]">
                    يمكنك إضافة أسئلة اختيار من متعدد أو صح وخطأ، وتحديد الإجابة الصحيحة بنقرة واحدة.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowAddQuestion(true);
                      resetQuestionForm();
                    }}
                    className="flex items-center gap-1.5 text-xs bg-[#246BFD] hover:bg-[#1A56DE] text-white font-semibold rounded-xl px-4 h-9 shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    إضافة سؤال جديد
                  </Button>
                </div>
              )}

              {/* Add Question Super Form */}
              {showAddQuestion && (
                <Card className="border-[#246BFD]/40 bg-[#F5F7FC]/70 rounded-2xl overflow-hidden shadow-sm">
                  <CardHeader className="py-3.5 px-5 border-b border-[#E5EAF4] bg-white flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-[#17213A] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#246BFD]" />
                        إضافة سؤال جديد إلى الاختبار
                      </CardTitle>
                      <p className="text-[11px] text-[#77829A] mt-0.5">
                        اختر قالباً سريعاً أو قم بتخصيص خيارات الإجابة والدرجات يدوياً
                      </p>
                    </div>

                    {/* Quick Template Switchers */}
                    <div className="flex items-center gap-1.5 bg-[#F5F7FC] p-1 rounded-xl border border-[#E5EAF4]">
                      <button
                        type="button"
                        onClick={loadMultipleChoiceTemplate}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#17213A] hover:bg-white hover:shadow-xs transition"
                      >
                        اختيار من متعدد (4)
                      </button>
                      <button
                        type="button"
                        onClick={loadTrueFalseTemplate}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#246BFD] bg-white shadow-xs transition"
                      >
                        صح أو خطأ (2)
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5">
                    <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
                      {/* Prompt */}
                      <div className="space-y-1.5">
                        <label className="block font-semibold text-[#17213A]">
                          نص صيغة السؤال <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={questionPrompt}
                          onChange={(e) => setQuestionPrompt(e.target.value)}
                          placeholder="اكتب صيغة السؤال بوضوح هنا..."
                          className="w-full rounded-xl border border-[#E5EAF4] p-3 text-xs bg-white text-[#17213A] focus:outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] leading-relaxed transition"
                        />
                      </div>

                      {/* Question Points */}
                      <div className="space-y-2">
                        <label className="block font-semibold text-[#17213A]">
                          درجة / نقاط هذا السؤال <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            required
                            min={0.5}
                            step={0.5}
                            value={questionPoints}
                            onChange={(e) => setQuestionPoints(Number(e.target.value))}
                            className="w-24 text-center font-bold text-xs bg-white rounded-xl border-[#E5EAF4] h-9 focus:border-[#246BFD]"
                          />
                          <div className="flex items-center gap-1.5">
                            {[0.5, 1, 2, 5].map((pts) => (
                              <button
                                key={pts}
                                type="button"
                                onClick={() => setQuestionPoints(pts)}
                                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                                  questionPoints === pts
                                    ? 'bg-[#246BFD] text-white border-[#246BFD]'
                                    : 'bg-white text-[#77829A] border-[#E5EAF4] hover:bg-[#E8EEFF] hover:text-[#246BFD]'
                                }`}
                              >
                                {pts} {pts === 1 ? 'درجة' : pts === 2 ? 'درجتان' : 'درجات'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Options Setup */}
                      <div className="space-y-2.5 pt-3 border-t border-[#E5EAF4]">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block font-bold text-[#17213A]">
                              خيارات الإجابة (اضغط على الخيار أو الدائرة لتحديده كإجابة صحيحة):
                            </label>
                            <span className="text-[11px] text-[#77829A]">
                              الخيار ذو الإطار الأخضر هو الإجابة النموذجية الصحيحة التي سيتم التصحيح بناءً عليها
                            </span>
                          </div>
                          {options.length < 6 && (
                            <button
                              type="button"
                              onClick={addOption}
                              className="px-2.5 py-1 rounded-xl bg-white border border-[#E5EAF4] hover:border-[#246BFD] text-[11px] font-semibold text-[#246BFD] hover:bg-[#E8EEFF] transition flex items-center gap-1"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              إضافة خيار إضافي
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {options.map((opt, idx) => (
                            <div
                              key={idx}
                              onClick={() => setCorrectOption(idx)}
                              className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                                opt.isCorrect
                                  ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/15'
                                  : 'bg-white border-[#E5EAF4] hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="correctOptionRadio"
                                checked={opt.isCorrect}
                                onChange={() => setCorrectOption(idx)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />

                              <span className="w-6 h-6 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4] flex items-center justify-center text-xs font-bold text-[#77829A] shrink-0">
                                {idx + 1}
                              </span>

                              <Input
                                value={opt.content}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setOptions(
                                    options.map((o, i) =>
                                      i === idx ? { ...o, content: e.target.value } : o,
                                    ),
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder={`اكتب نص الخيار ${idx + 1}...`}
                                className={`text-xs bg-white h-9 rounded-xl border-[#E5EAF4] focus:border-[#246BFD] ${
                                  opt.isCorrect ? 'font-semibold text-emerald-950' : 'text-[#17213A]'
                                }`}
                              />

                              {opt.isCorrect ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
                                  <Check className="w-3.5 h-3.5" />
                                  الإجابة الصحيحة
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 shrink-0 hidden sm:inline">
                                  انقر لتحديده كصحيح
                                </span>
                              )}

                              {options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeOption(idx);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                                  title="حذف هذا الخيار"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5EAF4]">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddQuestion(false)}
                          disabled={submittingQuestion}
                          className="rounded-xl border-[#E5EAF4] text-xs h-9 px-4 text-[#77829A]"
                        >
                          إلغاء
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={submittingQuestion}
                          className="rounded-xl bg-[#246BFD] hover:bg-[#1A56DE] text-white font-semibold text-xs h-9 px-5 flex items-center gap-2 shadow-sm"
                        >
                          {submittingQuestion ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              جاري الحفظ...
                            </>
                          ) : (
                            'حفظ السؤال وإضافته'
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Questions Render List */}
              {selectedExamDetails.questions.length === 0 ? (
                <EmptyState
                  title="لا توجد أسئلة مضافة بعد"
                  message="ابدأ ببناء بنك الأسئلة بالضغط على 'إضافة سؤال جديد' وتحديد الإجابات والدرجات."
                />
              ) : (
                <div className="space-y-3">
                  {selectedExamDetails.questions.map((q, idx) => (
                    <Card key={q.id} className="border-[#E5EAF4] rounded-2xl overflow-hidden bg-white hover:border-[#246BFD]/30 transition">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-[#246BFD]/10 text-[#246BFD] font-bold flex items-center justify-center text-xs shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-sm text-[#17213A] leading-relaxed">{q.prompt}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#246BFD] bg-[#246BFD]/10 px-2 py-0.5 rounded-md">
                                  <Award className="w-3 h-3" />
                                  {q.points} {q.points === 1 ? 'درجة' : 'درجات'}
                                </span>
                                <span className="text-[11px] text-[#77829A]">
                                  {q.options.length} خيارات إجابة
                                </span>
                              </div>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs rounded-xl p-2 h-8 w-8"
                            title="حذف السؤال"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Options rendered preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#E5EAF4]">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border transition ${
                                opt.isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                  : 'bg-[#F5F7FC] border-[#E5EAF4] text-[#17213A]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {opt.isCorrect ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                                )}
                                <span className="truncate">{opt.content}</span>
                              </div>
                              {opt.isCorrect && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md shrink-0">
                                  صحيح
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
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

      {/* Modal: View Submissions Results */}
      {submissionsExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101A35]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E5EAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#E5EAF4] flex items-center justify-between bg-[#F5F7FC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17213A]">
                    نتائج ومحاولات الطلاب: {submissionsExam.title}
                  </h3>
                  <p className="text-xs text-[#77829A] mt-0.5">
                    إجمالي المحاولات المقدمة: <strong>{submissions.length}</strong> | مدة الاختبار: {submissionsExam.durationMinutes} دقيقة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionsExam(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white flex items-center justify-center transition border border-[#E5EAF4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {loadingSubmissions ? (
                <Loading message="جاري تحميل نتائج الطلاب..." />
              ) : submissions.length === 0 ? (
                <EmptyState
                  title="لا توجد محاولات بعد"
                  message="لم يقم أي طالب بتقديم هذا الاختبار حتى الآن."
                />
              ) : (
                <div className="bg-white rounded-2xl border border-[#E5EAF4] overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#F5F7FC] border-b border-[#E5EAF4] text-[#77829A]">
                      <tr>
                        <th className="py-3 px-3.5">اسم الطالب</th>
                        <th className="py-3 px-3.5">اسم المستخدم</th>
                        <th className="py-3 px-3.5">المحاولة</th>
                        <th className="py-3 px-3.5">وقت التسليم</th>
                        <th className="py-3 px-3.5">الدرجة</th>
                        <th className="py-3 px-3.5">النسبة</th>
                        <th className="py-3 px-3.5">الحالة</th>
                        <th className="py-3 px-3.5">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF4]">
                      {submissions.map((sub) => {
                        const pct =
                          sub.totalPoints > 0 && sub.score !== null
                            ? Math.round((sub.score / sub.totalPoints) * 100)
                            : 0;

                        return (
                          <tr key={sub.id} className="hover:bg-[#F5F7FC]/70 transition">
                            <td className="py-3 px-3.5 font-bold text-[#17213A]">{sub.studentName}</td>
                            <td className="py-3 px-3.5 text-[#77829A]" dir="ltr">
                              @{sub.studentUsername}
                            </td>
                            <td className="py-3 px-3.5 font-semibold text-[#17213A]">
                              المحاولة {sub.attemptNumber}
                            </td>
                            <td className="py-3 px-3.5 text-[#77829A]" dir="ltr">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-SA') : 'قيد التنفيذ'}
                            </td>
                            <td className="py-3 px-3.5 font-extrabold text-[#17213A]">
                              {sub.score !== null ? `${sub.score} / ${sub.totalPoints}` : '-'}
                            </td>
                            <td className="py-3 px-3.5 font-bold text-[#246BFD]">
                              {sub.score !== null ? `${pct}%` : '-'}
                            </td>
                            <td className="py-3 px-3.5">
                              {sub.isPassed === true && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ناجح
                                </span>
                              )}
                              {sub.isPassed === false && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  راسب
                                </span>
                              )}
                              {sub.isPassed === null && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                  مكتمل
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReviewAttempt(sub.id)}
                                className="text-[11px] h-7 px-2.5 rounded-xl border-[#E5EAF4] hover:bg-[#F5F7FC]"
                              >
                                مراجعة الإجابات
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Review Attempt */}
      {reviewAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101A35]/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E5EAF4] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#E5EAF4] flex items-center justify-between bg-[#F5F7FC]">
              <div>
                <h3 className="text-base font-bold text-[#17213A]">
                  مراجعة إجابات المحاولة {reviewAttempt.attemptNumber}: {reviewAttempt.examTitle}
                </h3>
                <p className="text-xs text-[#77829A] mt-0.5">
                  الدرجة: <strong className="text-emerald-700">{reviewAttempt.score}</strong> من {reviewAttempt.totalPoints} (
                  {reviewAttempt.percentage}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewAttempt(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white flex items-center justify-center transition border border-[#E5EAF4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {reviewAttempt.questions.map((q, idx) => (
                <Card key={q.questionId} className="border-[#E5EAF4] rounded-2xl bg-white">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#F5F7FC] border border-[#E5EAF4] text-[#17213A] font-bold flex items-center justify-center text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <p className="font-bold text-xs text-[#17213A] leading-relaxed">{q.prompt}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {q.awardedPoints} / {q.points} نقطة
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#E5EAF4] text-xs">
                      {q.options.map((opt) => {
                        const isStudentChosen = opt.id === q.selectedOptionId;
                        const isTheCorrect = opt.isCorrect;

                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl flex items-center gap-2 border ${
                              isTheCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : isStudentChosen && !isTheCorrect
                                ? 'bg-rose-50 border-rose-300 text-rose-900'
                                : 'bg-[#F5F7FC] border-[#E5EAF4] text-[#77829A]'
                            }`}
                          >
                            {isTheCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            {isStudentChosen && !isTheCorrect && <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                            {!isTheCorrect && !isStudentChosen && <span className="w-3.5 h-3.5 shrink-0" />}
                            <span>{opt.content}</span>
                            {isStudentChosen && (
                              <span className="text-[10px] text-slate-500 font-bold mr-auto">
                                (إجابة الطالب)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
