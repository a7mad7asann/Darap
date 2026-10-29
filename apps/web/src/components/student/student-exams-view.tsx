'use client';

import * as React from 'react';
import {
  FileQuestion,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Send,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { apiClient } from '@/lib/api-client';
import {
  ActiveAttemptDto,
  AttemptReviewDto,
  ExamResultDto,
  ExamStatus,
  StudentExamSummaryDto,
} from '@darb/contracts';

interface StudentExamsViewProps {
  courseId: string;
}

export function StudentExamsView({ courseId }: StudentExamsViewProps) {
  const [exams, setExams] = React.useState<StudentExamSummaryDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Active attempt taking mode
  const [activeAttempt, setActiveAttempt] = React.useState<ActiveAttemptDto | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = React.useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(0);
  const [savingAnswer, setSavingAnswer] = React.useState(false);
  const [submittingAttempt, setSubmittingAttempt] = React.useState(false);

  // Completed result state
  const [completedResult, setCompletedResult] = React.useState<ExamResultDto | null>(null);
  const [reviewData, setReviewData] = React.useState<AttemptReviewDto | null>(null);
  const [loadingReview, setLoadingReview] = React.useState(false);

  const loadExams = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getStudentExams(courseId);
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

  // Server countdown timer countdown effect
  React.useEffect(() => {
    if (!activeAttempt || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmitOnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAttempt, secondsRemaining]);

  const handleStartExam = async (examId: string) => {
    if (!confirm('هل أنت مستعد لبدء الاختبار؟ سيبدأ العد التنازلي للوقت فوراً ولن يتوقف.')) {
      return;
    }

    setLoading(true);
    try {
      const startRes = await apiClient.startExamAttempt(examId);
      const attemptDetails = await apiClient.getActiveAttemptQuestions(startRes.attemptId);

      setActiveAttempt(attemptDetails);
      setSelectedAnswers(attemptDetails.savedAnswers || {});
      setSecondsRemaining(attemptDetails.remainingSeconds);
      setActiveQuestionIndex(0);
      setCompletedResult(null);
      setReviewData(null);
    } catch (err: any) {
      alert(err.message || 'تعذر بدء الاختبار');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = async (questionId: string, optionId: string) => {
    if (!activeAttempt) return;

    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setSavingAnswer(true);

    try {
      await apiClient.saveAnswer(activeAttempt.attemptId, {
        questionId,
        selectedOptionId: optionId,
      });
    } catch (err: any) {
      console.error('Failed to save answer incrementally:', err);
    } finally {
      setSavingAnswer(false);
    }
  };

  const handleSubmitAttempt = async () => {
    if (!activeAttempt) return;

    const unansweredCount =
      activeAttempt.questions.length - Object.keys(selectedAnswers).length;

    let confirmMsg = 'هل أنت متأكد من إنهاء وتسليم الاختبار؟ سيتم تصحيح إجاباتك فورياً.';
    if (unansweredCount > 0) {
      confirmMsg = `تنبيه: يوجد ${unansweredCount} سؤال لم تقم بالإجابة عليها بعد. هل تريد تسليم الاختبار الآن؟`;
    }

    if (!confirm(confirmMsg)) return;

    setSubmittingAttempt(true);
    try {
      const result = await apiClient.submitExamAttempt(activeAttempt.attemptId);
      setCompletedResult(result);
      setActiveAttempt(null);
      await loadExams();
    } catch (err: any) {
      alert(err.message || 'تعذر تسليم الاختبار');
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const handleAutoSubmitOnTimeout = async () => {
    if (!activeAttempt || submittingAttempt) return;
    alert('انتهى الوقت المحدد للاختبار! سيتم تسليم إجاباتك تلقائياً الآن.');
    setSubmittingAttempt(true);
    try {
      const result = await apiClient.submitExamAttempt(activeAttempt.attemptId);
      setCompletedResult(result);
      setActiveAttempt(null);
      await loadExams();
    } catch (err: any) {
      console.error('Auto-submit failed:', err);
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const handleLoadReview = async (attemptId: string) => {
    setLoadingReview(true);
    try {
      const review = await apiClient.getStudentAttemptReview(attemptId);
      setReviewData(review);
    } catch (err: any) {
      alert(err.message || 'تعذر تحميل مراجعة الإجابات');
    } finally {
      setLoadingReview(false);
    }
  };

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !activeAttempt) {
    return <Loading message="جاري تحميل الاختبارات الإلكترونية..." />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {error}
      </div>
    );
  }

  // Active attempt taking view
  if (activeAttempt) {
    const currentQ = activeAttempt.questions[activeQuestionIndex];
    const isLastQuestion = activeQuestionIndex === activeAttempt.questions.length - 1;
    const isFirstQuestion = activeQuestionIndex === 0;
    const isLowTime = secondsRemaining < 300; // less than 5 minutes

    return (
      <div className="space-y-6">
        {/* Sticky Timer Bar */}
        <div className="sticky top-16 z-20 bg-white border border-slate-200 shadow-md rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">{activeAttempt.examTitle}</h3>
            <span className="text-xs text-slate-500">
              السؤال {activeQuestionIndex + 1} من {activeAttempt.questions.length} | المحاولة{' '}
              {activeAttempt.attemptNumber}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {savingAnswer && (
              <span className="text-[11px] text-slate-400 font-medium">جاري حفظ الإجابة...</span>
            )}

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-base ${
                isLowTime
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}
              dir="ltr"
            >
              <Clock className={`w-4 h-4 ${isLowTime ? 'text-rose-600' : 'text-slate-500'}`} />
              {formatTime(secondsRemaining)}
            </div>

            <Button
              size="sm"
              onClick={handleSubmitAttempt}
              disabled={submittingAttempt}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {submittingAttempt ? 'جاري التسليم...' : 'إنهاء وتسليم الاختبار'}
            </Button>
          </div>
        </div>

        {/* Question Pager Numbers */}
        <div className="flex flex-wrap gap-2 justify-center py-2">
          {activeAttempt.questions.map((q, idx) => {
            const isAnswered = !!selectedAnswers[q.id];
            const isCurrent = idx === activeQuestionIndex;

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setActiveQuestionIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                  isCurrent
                    ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                    : isAnswered
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Current Question Card */}
        {currentQ && (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                السؤال {activeQuestionIndex + 1} ({currentQ.points} درجات)
              </span>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <p className="font-bold text-base text-slate-900 leading-relaxed">{currentQ.prompt}</p>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isChecked = selectedAnswers[currentQ.id] === opt.id;

                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-sm cursor-pointer transition ${
                        isChecked
                          ? 'border-purple-500 bg-purple-50/40 text-purple-950 font-bold shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question_${currentQ.id}`}
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="flex-1">{opt.content}</span>
                    </label>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={isFirstQuestion}
                  className="flex items-center gap-1 text-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                  السؤال السابق
                </Button>

                {!isLastQuestion ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      setActiveQuestionIndex((prev) =>
                        Math.min(activeAttempt.questions.length - 1, prev + 1),
                      )
                    }
                    className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    السؤال التالي
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSubmitAttempt}
                    disabled={submittingAttempt}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send className="w-3.5 h-3.5" />
                    إنهاء وتسليم الاختبار
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Graded Result Modal / Card
  if (completedResult) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="border-slate-200 overflow-hidden shadow-md text-center">
          <div
            className={`p-6 ${
              completedResult.isPassed === true
                ? 'bg-emerald-50 border-b border-emerald-100'
                : 'bg-purple-50 border-b border-purple-100'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {completedResult.isPassed === true ? 'مبروك! لقد اجتزت الاختبار بنجاح' : 'تم تسليم وتصحيح الاختبار'}
            </h2>
            <p className="text-xs text-slate-500">تم احتساب نتيجتك ورصدها تلقائياً في سجل درجاتك</p>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-0.5">درجتك</span>
                <span className="font-extrabold text-lg text-slate-900">
                  {completedResult.score} / {completedResult.totalPoints}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-0.5">النسبة المئوية</span>
                <span className="font-extrabold text-lg text-blue-700">{completedResult.percentage}%</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-0.5">الحالة</span>
                {completedResult.isPassed === true && (
                  <span className="font-bold text-sm text-emerald-700">ناجح</span>
                )}
                {completedResult.isPassed === false && (
                  <span className="font-bold text-sm text-rose-700">لم يجتز</span>
                )}
                {completedResult.isPassed === null && (
                  <span className="font-bold text-sm text-slate-700">مكتمل</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLoadReview(completedResult.attemptId)}
                className="flex items-center gap-1.5 text-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                مراجعة الإجابات الصحيحة
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setCompletedResult(null);
                  loadExams();
                }}
                className="text-xs"
              >
                العودة لقائمة الاختبارات
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inline Review if requested */}
        {reviewData && renderReview(reviewData)}
      </div>
    );
  }

  // Normal List View
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">الاختبارات الإلكترونية</h2>
        <p className="text-xs text-slate-500">
          اختر أحد الاختبارات المتاحة لبدء المحاولة مع تصحيح تلقائي فوري بعد الإرسال
        </p>
      </div>

      {exams.length === 0 ? (
        <EmptyState
          title="لا توجد اختبارات إلكترونية حالياً"
          message="لم يقم المعلم بنشر أي اختبارات لهذا المقرر بعد."
        />
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => {
            const isClosed = exam.status === ExamStatus.CLOSED;
            const canAttempt = !isClosed && exam.remainingAttempts > 0;

            return (
              <Card key={exam.id} className="border-slate-200 overflow-hidden shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-slate-900">{exam.title}</span>
                        {isClosed && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            مغلق
                          </span>
                        )}
                        {exam.bestScore !== null && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            أعلى درجة: {exam.bestScore} / {exam.totalPoints}
                          </span>
                        )}
                        {exam.isPassed === true && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            تم الاجتياز
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
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          الدرجة الكلية: <strong className="text-slate-800">{exam.totalPoints}</strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
                          المحاولات المتبقية:{' '}
                          <strong className="text-slate-800">{exam.remainingAttempts}</strong> من {exam.maxAttempts}
                        </span>
                      </div>
                    </div>

                    <div>
                      {exam.hasActiveAttempt && (
                        <Button
                          size="sm"
                          onClick={() => handleStartExam(exam.id)}
                          className="text-xs flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Play className="w-3.5 h-3.5" />
                          استئناف المحاولة الجارية
                        </Button>
                      )}

                      {!exam.hasActiveAttempt && canAttempt && (
                        <Button
                          size="sm"
                          onClick={() => handleStartExam(exam.id)}
                          className="text-xs flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Play className="w-3.5 h-3.5" />
                          بدء الاختبار
                        </Button>
                      )}

                      {!canAttempt && !exam.hasActiveAttempt && (
                        <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded">
                          {isClosed ? 'الاختبار مغلق' : 'استنفدت المحاولات'}
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

      {/* Review Modal if opened from list */}
      {reviewData && !completedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">مراجعة إجابات الاختبار</h3>
              <Button variant="outline" size="sm" onClick={() => setReviewData(null)}>
                إغلاق
              </Button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">{renderReview(reviewData)}</div>
          </div>
        </div>
      )}
    </div>
  );

  function renderReview(review: AttemptReviewDto) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-900">{review.examTitle}</h4>
            <span className="text-xs text-slate-500">المحاولة {review.attemptNumber}</span>
          </div>
          <span className="font-extrabold text-base text-emerald-700">
            {review.score} / {review.totalPoints} ({review.percentage}%)
          </span>
        </div>

        {review.questions.map((q, idx) => (
          <Card key={q.questionId} className="border-slate-200 text-right">
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
                          (إجابتك)
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
    );
  }
}
