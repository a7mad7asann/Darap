'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  LogOut,
  Users,
  School,
  KeyRound,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { apiClient } from '@/lib/api-client';
import { AuthMeResponseDto, AdminUsersListDto, AdminUserItemDto } from '@darb/contracts';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<AuthMeResponseDto | null>(null);
  const [usersData, setUsersData] = React.useState<AdminUsersListDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'users' | 'add-teacher' | 'add-student'>('users');

  // Teacher creation form state
  const [tUsername, setTUsername] = React.useState('');
  const [tPassword, setTPassword] = React.useState('');
  const [tDisplayName, setTDisplayName] = React.useState('');
  const [tSchoolName, setTSchoolName] = React.useState('');
  const [tSlug, setTSlug] = React.useState('');
  const [tSpec, setTSpec] = React.useState('');
  const [submittingTeacher, setSubmittingTeacher] = React.useState(false);
  const [teacherMsg, setTeacherMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Student creation form state
  const [sUsername, setSUsername] = React.useState('');
  const [sPassword, setSPassword] = React.useState('');
  const [sDisplayName, setSDisplayName] = React.useState('');
  const [sTenantId, setSTenantId] = React.useState('');
  const [sGrade, setSGrade] = React.useState('');
  const [submittingStudent, setSubmittingStudent] = React.useState(false);
  const [studentMsg, setStudentMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reset password modal state
  const [resetTargetUser, setResetTargetUser] = React.useState<AdminUserItemDto | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = React.useState('');
  const [resetReason, setResetReason] = React.useState('');
  const [submittingReset, setSubmittingReset] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiClient.getMe();
      if (me.user.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      setProfile(me);

      const users = await apiClient.listUsers(1, 100);
      setUsersData(users);

      if (me.activeTenant?.tenantId) {
        setSTenantId(me.activeTenant.tenantId);
      }
    } catch (e: any) {
      setError(e.message || 'تعذر تحميل بيانات الإدارة');
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await apiClient.logout();
    router.push('/login');
  };

  const handleToggleUserStatus = async (userId: string, currentActive: boolean) => {
    try {
      await apiClient.updateUserStatus(userId, !currentActive);
      setUsersData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((u) =>
                u.id === userId ? { ...u, isActive: !currentActive } : u,
              ),
            }
          : prev,
      );
    } catch (err: any) {
      alert(err.message || 'تعذر تحديث حالة المستخدم');
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTeacher(true);
    setTeacherMsg(null);
    try {
      await apiClient.createTeacher({
        username: tUsername.trim(),
        password: tPassword,
        displayName: tDisplayName.trim(),
        schoolName: tSchoolName.trim(),
        slug: tSlug.trim().toLowerCase(),
        specialization: tSpec.trim() || undefined,
      });
      setTeacherMsg({
        type: 'success',
        text: `تم إنشاء حساب المعلم ${tDisplayName} ومساحة المدرسة بنجاح!`,
      });
      setTUsername('');
      setTPassword('');
      setTDisplayName('');
      setTSchoolName('');
      setTSlug('');
      setTSpec('');
      const users = await apiClient.listUsers(1, 100);
      setUsersData(users);
    } catch (err: any) {
      setTeacherMsg({ type: 'error', text: err.message || 'فشل إنشاء المعلم' });
    } finally {
      setSubmittingTeacher(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sTenantId) {
      alert('يرجى تحديد معرف المدرسة / مساحة العمل للطالب');
      return;
    }
    setSubmittingStudent(true);
    setStudentMsg(null);
    try {
      await apiClient.createStudent({
        username: sUsername.trim(),
        password: sPassword,
        displayName: sDisplayName.trim(),
        tenantId: sTenantId,
        gradeLevel: sGrade.trim() || undefined,
      });
      setStudentMsg({
        type: 'success',
        text: `تم إنشاء حساب الطالب ${sDisplayName} بنجاح (تسجيل الدخول باسم المستخدم دون بريد إلكتروني)!`,
      });
      setSUsername('');
      setSPassword('');
      setSDisplayName('');
      setSGrade('');
      const users = await apiClient.listUsers(1, 100);
      setUsersData(users);
    } catch (err: any) {
      setStudentMsg({ type: 'error', text: err.message || 'فشل إنشاء الطالب' });
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setSubmittingReset(true);
    try {
      await apiClient.resetPassword(resetTargetUser.id, {
        newPassword: resetPasswordVal,
        reason: resetReason.trim() || 'Admin-assisted recovery',
      });
      alert('تمت إعادة تعيين كلمة المرور بنجاح وتسجيل العملية في سجل التدقيق.');
      setResetTargetUser(null);
      setResetPasswordVal('');
      setResetReason('');
    } catch (err: any) {
      alert(err.message || 'تعذر إعادة تعيين كلمة المرور');
    } finally {
      setSubmittingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loading message="جاري التحقق من صلاحيات إدارة المنصة..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md">
          <ErrorState
            title="تعذر الوصول للوحة الإدارة"
            message={error || 'يرجى تسجيل الدخول مجدداً'}
            onRetry={loadData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16" dir="rtl">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight">منصة دَرْب — إدارة النظام</h1>
              <p className="text-xs text-slate-500">لوحة تحكم المشرف العام وتعيين الصلاحيات</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 hidden sm:inline">
              المدير: {profile.user.displayName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4 ml-1" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'users'
                ? 'border-purple-600 text-purple-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            سجل المستخدمين ({usersData?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('add-teacher')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'add-teacher'
                ? 'border-purple-600 text-purple-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <School className="w-4 h-4" />
            إضافة معلم ومدرسة
          </button>
          <button
            onClick={() => setActiveTab('add-student')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'add-student'
                ? 'border-purple-600 text-purple-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            إضافة طالب جديد
          </button>
        </div>

        {/* TAB 1: Users Table */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">حسابات المعلمين والطلاب في النظام</h2>
              <span className="text-xs text-slate-500">
                إجمالي المسجلين: {usersData?.total || 0} مستخدم
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4">الاسم الكامل</th>
                    <th className="py-3 px-4">اسم المستخدم</th>
                    <th className="py-3 px-4">الدور</th>
                    <th className="py-3 px-4">المدرسة / الأكاديمية</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersData?.items.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">{u.displayName}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">@{u.username}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : u.role === 'TEACHER'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {u.role === 'ADMIN' ? 'مدير' : u.role === 'TEACHER' ? 'معلم' : 'طالب'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{u.tenantName || 'عام'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.isActive ? 'مفعل' : 'معطل'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                            className="text-xs"
                            title={u.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                          >
                            {u.isActive ? (
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-rose-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResetTargetUser(u)}
                            className="text-xs text-slate-600 hover:text-purple-600"
                            title="إعادة تعيين كلمة المرور (مدعوم بسجل تدقيق)"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Add Teacher Form */}
        {activeTab === 'add-teacher' && (
          <Card className="max-w-2xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">
                إنشاء حساب معلم جديد ومساحة عمل مدرسة
              </CardTitle>
              <CardDescription className="text-xs">
                يقوم بإنشاء حساب معلم معزول مع مساحة مدرسة خاصة به ورابط مخصص (Slug) وفق معايير عزل المستأجرين.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {teacherMsg && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    teacherMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {teacherMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{teacherMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateTeacher} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      اسم المستخدم <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="teacher.name"
                      value={tUsername}
                      onChange={(e) => setTUsername(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      كلمة المرور المؤقتة <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      type="password"
                      placeholder="كلمة مرور قوية (8+ خانات)"
                      value={tPassword}
                      onChange={(e) => setTPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الاسم الكامل للمعلم <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="مثال: أ. محمود عبد الله"
                    value={tDisplayName}
                    onChange={(e) => setTDisplayName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      اسم المدرسة / الأكاديمية <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="مثال: أكاديمية النور التعليمية"
                      value={tSchoolName}
                      onChange={(e) => setTSchoolName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      المعرف الإنجليزي (Slug) <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="al-noor"
                      value={tSlug}
                      onChange={(e) => setTSlug(e.target.value.toLowerCase())}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    التخصص التدريسي
                  </label>
                  <Input
                    placeholder="مثال: فيزياء وكيمياء"
                    value={tSpec}
                    onChange={(e) => setTSpec(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={submittingTeacher}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {submittingTeacher ? 'جاري الإنشاء...' : 'إنشاء حساب المعلم والمدرسة'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: Add Student Form */}
        {activeTab === 'add-student' && (
          <Card className="max-w-2xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">
                تسجيل طالب جديد (بدون بريد إلكتروني)
              </CardTitle>
              <CardDescription className="text-xs">
                يسجل الطالب باستخدام اسم المستخدم وكلمة المرور فقط، لتمكينه من الانضمام للمقررات الدراسية.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {studentMsg && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    studentMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {studentMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{studentMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      اسم المستخدم <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="student.name"
                      value={sUsername}
                      onChange={(e) => setSUsername(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      كلمة المرور <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      type="password"
                      placeholder="كلمة المرور للطالب"
                      value={sPassword}
                      onChange={(e) => setSPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اسم الطالب الرباعي <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="مثال: أحمد سامي خليل"
                    value={sDisplayName}
                    onChange={(e) => setSDisplayName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      معرف المدرسة / مساحة العمل <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="UUID الخاص بمدرسة الطالب"
                      value={sTenantId}
                      onChange={(e) => setSTenantId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الصف الدراسي
                    </label>
                    <Input
                      placeholder="مثال: الصف الثاني الثانوي"
                      value={sGrade}
                      onChange={(e) => setSGrade(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={submittingStudent}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {submittingStudent ? 'جاري التسجيل...' : 'تسجيل حساب الطالب'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reset Password Modal */}
        {resetTargetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold text-slate-800">
                  إعادة تعيين كلمة المرور: {resetTargetUser.displayName}
                </h3>
                <button
                  onClick={() => setResetTargetUser(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500">
                سيتم تشفير كلمة المرور وتعيينها فوراً، وسيتم تسجيل العملية رسمياً في سجل تدقيق النظام (Audit Log) لأغراض الأمان والمساءلة.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    كلمة المرور الجديدة <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    type="password"
                    placeholder="كلمة مرور جديدة (8+ خانات)"
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    سبب إعادة التعيين (مطلوب للتدقيق) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="مثال: طلب ولي الأمر عبر إدارة المدرسة بعد نسيان الطالب لكلمة المرور"
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResetTargetUser(null)}
                    disabled={submittingReset}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={submittingReset}
                  >
                    {submittingReset ? 'جاري التعيين...' : 'تأكيد وحفظ التغيير'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
