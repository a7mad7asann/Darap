'use client';

import * as React from 'react';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Upload,
  Send,
  Lock,
  Paperclip,
  Award,
  Sparkles,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { apiClient } from '@/lib/api-client';
import {
  AssignmentDetailDto,
  AssignmentStatus,
  SubmissionAttachmentDto,
  SubmissionStatus,
} from '@darb/contracts';

interface StudentAssignmentsViewProps {
  courseId: string;
}

export function StudentAssignmentsView({ courseId }: StudentAssignmentsViewProps) {
  const [assignments, setAssignments] = React.useState<AssignmentDetailDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Submission state per assignment
  const [textAnswers, setTextAnswers] = React.useState<Record<string, string>>({});
  const [uploadedFilesMap, setUploadedFilesMap] = React.useState<
    Record<string, Array<{ id: string; name: string; size: number }>>
  >({});
  const [uploadingForAssignment, setUploadingForAssignment] = React.useState<string | null>(null);
  const [submittingAssignmentId, setSubmittingAssignmentId] = React.useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const activeUploadAssignmentRef = React.useRef<string | null>(null);

  const loadAssignments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getStudentAssignments(courseId);
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل قائمة التكليفات والواجبات');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleTriggerUpload = (assignmentId: string) => {
    activeUploadAssignmentRef.current = assignmentId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const assignmentId = activeUploadAssignmentRef.current;
    if (!file || !assignmentId) return;

    setUploadingForAssignment(assignmentId);
    try {
      // 1. Presign upload URL
      const presign = await apiClient.presignSubmissionUpload(assignmentId, {
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        byteSize: file.size,
      });

      // 2. Direct PUT to S3 / MinIO
      const uploadRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/pdf',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('تعذر رفع الملف إلى وحدة التخزين');
      }

      // 3. Complete upload and create FileObject
      const completed = await apiClient.completeSubmissionUpload(assignmentId, {
        storageKey: presign.storageKey,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        byteSize: file.size,
        uploadTicket: presign.uploadTicket,
      });

      // Store in local attached files map
      setUploadedFilesMap((prev) => ({
        ...prev,
        [assignmentId]: [
          ...(prev[assignmentId] || []),
          { id: completed.id, name: completed.originalName, size: completed.byteSize },
        ],
      }));
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء رفع ملف الحل');
    } finally {
      setUploadingForAssignment(null);
      activeUploadAssignmentRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachedFile = (assignmentId: string, fileId: string) => {
    setUploadedFilesMap((prev) => ({
      ...prev,
      [assignmentId]: (prev[assignmentId] || []).filter((f) => f.id !== fileId),
    }));
  };

  const handleSubmitSolution = async (assignmentId: string) => {
    const text = textAnswers[assignmentId]?.trim();
    const attachedFiles = uploadedFilesMap[assignmentId] || [];

    if (!text && attachedFiles.length === 0) {
      alert('يجب إدخال إجابة نصية أو إرفاق ملف حل واحد على الأقل قبل التسليم');
      return;
    }

    if (!confirm('هل أنت متأكد من تسليم الحل؟ لا يمكن تعديل أو إعادة تسليم الواجب بعد إرساله.')) {
      return;
    }

    setSubmittingAssignmentId(assignmentId);
    try {
      await apiClient.submitAssignment(assignmentId, {
        textContent: text || undefined,
        fileIds: attachedFiles.map((f) => f.id),
      });

      await loadAssignments();
      alert('تم تسليم الواجب بنجاح!');
    } catch (err: any) {
      alert(err.message || 'تعذر تسليم الواجب');
    } finally {
      setSubmittingAssignmentId(null);
    }
  };

  const handleDownloadAttachment = async (fileId: string) => {
    setDownloadingFileId(fileId);
    try {
      const res = await apiClient.presignStudentSubmissionDownload(fileId);
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
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">الواجبات والتكليفات الدراسية</h2>
          <p className="text-xs text-slate-500">
            استعرض التكليفات المطلوبة، وقدم حلولك مع إمكانية إرفاق ملفات، واطلع على درجاتك وملاحظات المعلم
          </p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          title="لا توجد واجبات دراسية حالياً"
          message="لم يقم المعلم بنشر أي تكليفات أو واجبات في هذا المقرر بعد."
        />
      ) : (
        <div className="space-y-5">
          {assignments.map((assignment) => {
            const isClosed = assignment.status === AssignmentStatus.CLOSED;
            const sub = assignment.mySubmission;
            const isSubmitted = !!sub;
            const isGraded = sub?.status === SubmissionStatus.GRADED;
            const isLate = sub?.status === SubmissionStatus.LATE;
            const attachedFiles = uploadedFilesMap[assignment.id] || [];

            return (
              <Card key={assignment.id} className="border-slate-200 overflow-hidden shadow-sm">
                <CardContent className="p-5 space-y-4">
                  {/* Top Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-slate-900">{assignment.title}</span>
                        {isClosed && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            مغلق
                          </span>
                        )}
                        {assignment.isOverdue && !isSubmitted && !isClosed && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            انتهى موعد التسليم
                          </span>
                        )}
                        {isSubmitted && !isGraded && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            تم التسليم - بانتظار التصحيح
                          </span>
                        )}
                        {isSubmitted && isLate && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            تسليم متأخر
                          </span>
                        )}
                        {isGraded && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            تم الرصد والتصحيح
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          الدرجة القصوى: <strong className="text-slate-800">{assignment.maxScore}</strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          موعد الاستحقاق:{' '}
                          {assignment.dueDate ? (
                            <strong className="text-slate-800" dir="ltr">
                              {new Date(assignment.dueDate).toLocaleString('ar-SA')}
                            </strong>
                          ) : (
                            'غير محدد'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description / Instructions */}
                  {assignment.description && (
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      <span className="font-bold text-slate-800 block mb-1">المطلوب من التكليف:</span>
                      {assignment.description}
                    </div>
                  )}

                  {/* Submission Status Section */}
                  {!isSubmitted ? (
                    isClosed ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400" />
                        هذا التكليف مغلق حالياً من قِبل المعلم ولا يستقبل أي تسليمات جديدة.
                      </div>
                    ) : (
                      /* Active submission form */
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <h4 className="font-bold text-xs text-slate-800">تقديم حل الواجب:</h4>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            نص الإجابة أو الشرح:
                          </label>
                          <textarea
                            rows={3}
                            value={textAnswers[assignment.id] || ''}
                            onChange={(e) =>
                              setTextAnswers({ ...textAnswers, [assignment.id]: e.target.value })
                            }
                            placeholder="اكتب إجابتك أو ملخص حلك هنا..."
                            className="w-full rounded-md border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* File upload section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-slate-700">
                              الملفات المرفقة (PDF، مستندات، صور - حد أقصى 25 ميجابايت):
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleTriggerUpload(assignment.id)}
                              disabled={uploadingForAssignment === assignment.id}
                              className="text-xs flex items-center gap-1.5"
                            >
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              {uploadingForAssignment === assignment.id ? 'جاري الرفع...' : 'إرفاق ملف حل'}
                            </Button>
                          </div>

                          {attachedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {attachedFiles.map((f) => (
                                <div
                                  key={f.id}
                                  className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  <span className="truncate max-w-[180px]">{f.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAttachedFile(assignment.id, f.id)}
                                    className="text-rose-500 hover:text-rose-700 font-bold ml-1 text-sm"
                                    title="حذف الملف"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={() => handleSubmitSolution(assignment.id)}
                            disabled={submittingAssignmentId === assignment.id}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Send className="w-4 h-4" />
                            {submittingAssignmentId === assignment.id ? 'جاري التسليم...' : 'تسليم الحل'}
                          </Button>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Already submitted section */
                    <div className="space-y-4 pt-2 border-t border-slate-100">
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-xs text-emerald-900">
                              تم تسليم هذا الواجب بنجاح
                            </span>
                            {isLate && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                تسليم متأخر
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-emerald-700" dir="ltr">
                            {new Date(sub.submittedAt).toLocaleString('ar-SA')}
                          </span>
                        </div>

                        {sub.textContent && (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-700 block mb-1">إجابتك المسلمة:</span>
                            <div className="bg-white p-3 rounded-lg border border-emerald-100 text-slate-800 whitespace-pre-wrap">
                              {sub.textContent}
                            </div>
                          </div>
                        )}

                        {sub.attachments && sub.attachments.length > 0 && (
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-700 text-xs block">الملفات التي أرفقتها:</span>
                            <div className="flex flex-wrap gap-2">
                              {sub.attachments.map((att: SubmissionAttachmentDto) => (
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
                      </div>

                      {/* Grades & Feedback Card */}
                      {isGraded ? (
                        <div className="bg-gradient-to-l from-emerald-500/10 via-emerald-50/50 to-white p-4 rounded-xl border border-emerald-200 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Award className="w-5 h-5 text-amber-500" />
                              <span className="font-bold text-sm text-slate-900">
                                درجة الواجب:{' '}
                                <span className="text-emerald-700 font-extrabold text-base">
                                  {sub.score}
                                </span>{' '}
                                / {assignment.maxScore}
                              </span>
                            </div>
                            {sub.gradedAt && (
                              <span className="text-[11px] text-slate-500" dir="ltr">
                                رُصدت في: {new Date(sub.gradedAt).toLocaleDateString('ar-SA')}
                              </span>
                            )}
                          </div>

                          {sub.feedback && (
                            <div className="pt-2 border-t border-emerald-100">
                              <span className="font-bold text-xs text-slate-700 block mb-1">
                                ملاحظات وتوجيهات المعلم:
                              </span>
                              <div className="bg-white/80 p-3 rounded-lg border border-emerald-100 text-xs text-slate-800 leading-relaxed">
                                {sub.feedback}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          لم يقم المعلم برصد درجة هذا الواجب بعد. ستظهر درجتك وملاحظات المعلم هنا فور اكتمال التصحيح.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
