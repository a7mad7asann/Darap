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

export function TeacherExamsTab({ courseId }: TeacherExamsTabProps) {
  const [exams, setExams] = React.useState<ExamSummaryDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
      } else {
        await apiClient.createExam(courseId, {
          title: title.trim(),
          instructions: instructions.trim() || undefined,
          durationMinutes: Number(durationMinutes),
          maxAttempts: Number(maxAttempts),
          passingScore: passingScore !== '' ? Number(passingScore) : undefined,
        });
      }
      setShowExamModal(false);
      await loadExams();
    } catch (err: any) {
      alert(err.message || 'تعذر حفظ الاختبار');
    } finally {
      setSubmittingExam(false);
    }
  };

  const handlePublishExam = async (examId: string) => {
    if (!confirm('هل أنت متأكد من نشر هذا الاختبار للطلاب؟ تأكد من إضافة جميع الأسئلة والإجابات الصحيحة.')) {
      return;
    }
    try {
      await apiClient.publishExam(examId);
      await loadExams();
      alert('تم نشر الاختبار بنجاح');
    } catch (err: any) {
      alert(err.message || 'تعذر نشر الاختبار');
    }
  };

  const handleCloseExam = async (examId: string) => {
    if (!confirm('هل أنت متأكد من إغلاق هذا الاختبار؟ لن يتمكن الطلاب من بدء أي محاولة جديدة.')) {
      return;
    }
    try {
      await apiClient.closeExam(examId);
      await loadExams();
    } catch (err: any) {
      alert(err.message || 'تعذر إغلاق الاختبار');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟')) {
      return;
    }
    try {
      await apiClient.deleteExam(examId);
      await loadExams();
    } catch (err: any) {
      alert(err.message || 'تعذر حذف الاختبار');
    }
  };

  // Open Question Manager
  const handleOpenQuestions = async (examId: string) => {
    setLoadingExamDetails(true);
    try {
      const details = await apiClient.getTeacherExamDetails(examId);
      setSelectedExamDetails(details);
      setShowAddQuestion(false);
      setQuestionPrompt('');
      setQuestionPoints(1);
      setOptions([
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
      ]);
    } catch (err: any) {
      alert(err.message || 'تعذر تحميل تفاصيل أسئلة الاختبار');
    } finally {
      setLoadingExamDetails(false);
    }
  };

  const handleSaveQuestion = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!selectedExamDetails || !questionPrompt.trim()) return;

    const validOptions = options.filter((o) => o.content.trim().length > 0);
    if (validOptions.length < 2) {
      alert('يجب إدخال خيارين صالحين على الأقل');
      return;
    }

    const hasCorrect = validOptions.some((o) => o.isCorrect);
    if (!hasCorrect) {
      alert('يجب تحديد إجابة صحيحة واحدة على الأقل');
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
      setQuestionPrompt('');
      setQuestionPoints(1);
      setOptions([
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
      ]);
      await loadExams();
    } catch (err: any) {
      alert(err.message || 'تعذر حفظ السؤال');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedExamDetails) return;
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;

    try {
      await apiClient.deleteQuestion(selectedExamDetails.id, questionId);
      const updated = await apiClient.getTeacherExamDetails(selectedExamDetails.id);
      setSelectedExamDetails(updated);
      await loadExams();
    } catch (err: any) {
      alert(err.message || 'تعذر حذف السؤال');
    }
  };

  const handleViewSubmissions = async (exam: ExamSummaryDto) => {
    setSubmissionsExam(exam);
    setLoadingSubmissions(true);
    try {
      const data = await apiClient.getTeacherExamSubmissions(exam.id);
      setSubmissions(data);
    } catch (err: any) {
      alert(err.message || 'تعذر تحميل نتائج الطلاب');
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
      alert(err.message || 'تعذر تحميل مراجعة إجابات المحاولة');
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">الاختبارات الإلكترونية والتصحيح التلقائي</h2>
          <p className="text-xs text-slate-500">
            إعداد اختبارات الاختيار من متعدد، تحديد وقت الاختبار وتوقيته، مع تصحيح فوري ورصد ذري للدرجات
          </p>
        </div>
        <Button onClick={handleOpenCreateExam} className="flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          إنشاء اختبار جديد
        </Button>
      </div>

      {/* Exams List */}
      {exams.length === 0 ? (
        <EmptyState
          title="لا توجد اختبارات إلكترونية بعد"
          message="قم بإنشاء اختبارك الأول وحدد الأسئلة والخيارات والمدة الزمنية."
          actionLabel="إنشاء اختبار جديد"
          onAction={handleOpenCreateExam}
        />
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => {
            const isDraft = exam.status === ExamStatus.DRAFT;
            const isPublished = exam.status === ExamStatus.PUBLISHED;
            const isClosed = exam.status === ExamStatus.CLOSED;

            return (
              <Card key={exam.id} className="border-slate-200 hover:shadow-sm transition">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-slate-900">{exam.title}</span>
                        {isDraft && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            مسودة
                          </span>
                        )}
                        {isPublished && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            منشور للطلاب
                          </span>
                        )}
                        {isClosed && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            مغلق
                          </span>
                        )}
                      </div>

                      {exam.instructions && (
                        <p className="text-xs text-slate-600 line-clamp-2">{exam.instructions}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          المدة: <strong className="text-slate-800">{exam.durationMinutes} دقيقة</strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                          الأسئلة: <strong className="text-slate-800">{exam.questionsCount}</strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          مجموع النقاط: <strong className="text-slate-800">{exam.totalPoints}</strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          أقصى محاولات: <strong className="text-slate-800">{exam.maxAttempts}</strong>
                        </span>

                        {exam.passingScore !== null && (
                          <span className="flex items-center gap-1">
                            درجة النجاح: <strong className="text-slate-800">{exam.passingScore}</strong>
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          المحاولات المقدمة: <strong className="text-slate-800">{exam.attemptsCount}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenQuestions(exam.id)}
                        className="text-xs flex items-center gap-1"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        إدارة الأسئلة ({exam.questionsCount})
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewSubmissions(exam)}
                        className="text-xs flex items-center gap-1 text-blue-700 hover:bg-blue-50 border-blue-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        النتائج ({exam.attemptsCount})
                      </Button>

                      {isDraft && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handlePublishExam(exam.id)}
                            className="text-xs flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Send className="w-3.5 h-3.5" />
                            نشر الاختبار
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditExam(exam)}
                            className="text-xs flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteExam(exam.id)}
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
                            variant="outline"
                            onClick={() => handleCloseExam(exam.id)}
                            className="text-xs text-amber-700 border-amber-200 hover:bg-amber-50 flex items-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            إغلاق
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditExam(exam)}
                            className="text-xs flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            تعديل
                          </Button>
                        </>
                      )}

                      {isClosed && (
                        <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded">
                          مغلق
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingExam ? 'تعديل بيانات الاختبار' : 'إنشاء اختبار إلكتروني جديد'}
            </h3>

            <form onSubmit={handleSaveExam} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  عنوان الاختبار <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الاختبار الفصلي الأول في مادة الأحياء"
                  maxLength={150}
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  تعليمات وتوجيهات الاختبار للطلاب
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="مثال: يُمنع استخدام الآلة الحاسبة، لديك 45 دقيقة من لحظة البدء..."
                  className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    المدة (بالدقائق) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    required
                    min={1}
                    max={300}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    أقصى محاولات <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    درجة النجاح (اختياري)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={passingScore}
                    onChange={(e) =>
                      setPassingScore(e.target.value !== '' ? Number(e.target.value) : '')
                    }
                    placeholder="مثال: 50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExamModal(false)}
                  disabled={submittingExam}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={submittingExam}>
                  {submittingExam ? 'جاري الحفظ...' : editingExam ? 'حفظ التعديلات' : 'إنشاء الاختبار كمسودة'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Question Management */}
      {selectedExamDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-purple-600" />
                  أسئلة الاختبار: {selectedExamDetails.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إجمالي الأسئلة: <strong>{selectedExamDetails.questions.length}</strong> | مجموع النقاط:{' '}
                  <strong>{selectedExamDetails.totalPoints}</strong> | المدة: {selectedExamDetails.durationMinutes} دقيقة
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedExamDetails(null)}>
                إغلاق
              </Button>
            </div>

            {/* Questions List & Add Form */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {!showAddQuestion && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setShowAddQuestion(true)}
                    className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <PlusCircle className="w-4 h-4" />
                    إضافة سؤال اختيار من متعدد
                  </Button>
                </div>
              )}

              {/* Add Question Form */}
              {showAddQuestion && (
                <Card className="border-purple-200 bg-purple-50/20">
                  <CardHeader className="py-3 px-4 border-b border-purple-100">
                    <CardTitle className="text-sm font-bold text-purple-900">إضافة سؤال جديد</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <form onSubmit={handleSaveQuestion} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          نص السؤال <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={questionPrompt}
                          onChange={(e) => setQuestionPrompt(e.target.value)}
                          placeholder="اكتب صيغة السؤال بوضوح..."
                          className="w-full rounded-md border border-slate-200 p-2 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="w-36">
                        <label className="block font-medium text-slate-700 mb-1">
                          درجة السؤال <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="number"
                          required
                          min={0.5}
                          step={0.5}
                          value={questionPoints}
                          onChange={(e) => setQuestionPoints(Number(e.target.value))}
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-2 pt-2 border-t border-purple-100">
                        <label className="block font-bold text-slate-800">
                          خيارات الإجابة (اختر الإجابة الصحيحة بالضغط على الدائرة):
                        </label>

                        {options.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={opt.isCorrect}
                              onChange={() =>
                                setOptions(
                                  options.map((o, i) => ({ ...o, isCorrect: i === idx })),
                                )
                              }
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                              title="تحديد كإجابة صحيحة"
                            />
                            <Input
                              value={opt.content}
                              onChange={(e) =>
                                setOptions(
                                  options.map((o, i) =>
                                    i === idx ? { ...o, content: e.target.value } : o,
                                  ),
                                )
                              }
                              placeholder={`الخيار ${idx + 1}`}
                              className={`bg-white text-xs ${
                                opt.isCorrect ? 'border-emerald-500 ring-1 ring-emerald-500 font-semibold' : ''
                              }`}
                            />
                            {opt.isCorrect && (
                              <span className="text-[10px] text-emerald-700 font-bold whitespace-nowrap">
                                (الإجابة الصحيحة)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddQuestion(false)}
                          disabled={submittingQuestion}
                        >
                          إلغاء
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={submittingQuestion}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          {submittingQuestion ? 'جاري الحفظ...' : 'حفظ السؤال'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Questions Render */}
              {selectedExamDetails.questions.length === 0 ? (
                <EmptyState
                  title="لا توجد أسئلة مضافة بعد"
                  message="أضف السؤال الأول لاختبارك مع تحديد خيارات الإجابة والدرجة."
                />
              ) : (
                <div className="space-y-3">
                  {selectedExamDetails.questions.map((q, idx) => (
                    <Card key={q.id} className="border-slate-200">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-sm text-slate-900 leading-relaxed">{q.prompt}</p>
                              <span className="text-[11px] text-slate-500">
                                الدرجة: <strong className="text-slate-800">{q.points}</strong>
                              </span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-lg text-xs flex items-center gap-2 border ${
                                opt.isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              {opt.isCorrect ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                              )}
                              <span>{opt.content}</span>
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

      {/* Modal: View Submissions */}
      {submissionsExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  نتائج الطلاب: {submissionsExam.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إجمالي المحاولات المقدمة: <strong>{submissions.length}</strong>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSubmissionsExam(null)}>
                إغلاق
              </Button>
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
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3">اسم الطالب</th>
                        <th className="py-2.5 px-3">اسم المستخدم</th>
                        <th className="py-2.5 px-3">رقم المحاولة</th>
                        <th className="py-2.5 px-3">وقت التسليم</th>
                        <th className="py-2.5 px-3">الدرجة</th>
                        <th className="py-2.5 px-3">النسبة</th>
                        <th className="py-2.5 px-3">الحالة</th>
                        <th className="py-2.5 px-3">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submissions.map((sub) => {
                        const pct =
                          sub.totalPoints > 0 && sub.score !== null
                            ? Math.round((sub.score / sub.totalPoints) * 100)
                            : 0;

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{sub.studentName}</td>
                            <td className="py-2.5 px-3 text-slate-500" dir="ltr">
                              @{sub.studentUsername}
                            </td>
                            <td className="py-2.5 px-3 font-semibold">المحاولة {sub.attemptNumber}</td>
                            <td className="py-2.5 px-3 text-slate-500" dir="ltr">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-SA') : 'قيد التنفيذ'}
                            </td>
                            <td className="py-2.5 px-3 font-extrabold text-slate-900">
                              {sub.score !== null ? `${sub.score} / ${sub.totalPoints}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-blue-700">{sub.score !== null ? `${pct}%` : '-'}</td>
                            <td className="py-2.5 px-3">
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
                            <td className="py-2.5 px-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReviewAttempt(sub.id)}
                                className="text-[11px] h-7 px-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  مراجعة إجابات المحاولة {reviewAttempt.attemptNumber}: {reviewAttempt.examTitle}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  الدرجة: <strong className="text-emerald-700">{reviewAttempt.score}</strong> من {reviewAttempt.totalPoints} (
                  {reviewAttempt.percentage}%)
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setReviewAttempt(null)}>
                إغلاق
              </Button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {reviewAttempt.questions.map((q, idx) => (
                <Card key={q.questionId} className="border-slate-200">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <p className="font-bold text-xs text-slate-900 leading-relaxed">{q.prompt}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {q.awardedPoints} / {q.points} نقطة
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      {q.options.map((opt) => {
                        const isStudentChosen = opt.id === q.selectedOptionId;
                        const isTheCorrect = opt.isCorrect;

                        return (
                          <div
                            key={opt.id}
                            className={`p-2 rounded-lg flex items-center gap-2 border ${
                              isTheCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                                : isStudentChosen && !isTheCorrect
                                ? 'bg-rose-50 border-rose-300 text-rose-900'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
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
