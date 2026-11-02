'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  School,
  KeyRound,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Search,
  Filter,
  GraduationCap,
  Sparkles,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { apiClient } from '@/lib/api-client';
import { AuthMeResponseDto, AdminUsersListDto, AdminUserItemDto } from '@darb/contracts';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<AuthMeResponseDto | null>(null);
  const [usersData, setUsersData] = React.useState<AdminUsersListDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'users' | 'add-teacher' | 'add-student'>('users');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'ALL' | 'TEACHER' | 'STUDENT' | 'ADMIN'>('ALL');

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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FC]">
        <Loading message="جاري التحقق من صلاحيات إدارة المنصة..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F7FC]">
        <div className="w-full max-w-md space-y-3">
          <ErrorState
            title="تعذر الوصول للوحة الإدارة"
            message={error || 'يرجى تسجيل الدخول مجدداً'}
            onRetry={loadData}
          />
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" onClick={() => router.push('/login')}>
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate KPIs
  const allUsers = usersData?.items || [];
  const teachersCount = allUsers.filter((u) => u.role === 'TEACHER').length;
  const studentsCount = allUsers.filter((u) => u.role === 'STUDENT').length;
  const activeCount = allUsers.filter((u) => u.isActive).length;

  // Filtered users for table
  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.tenantName && u.tenantName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const navItems = [
    {
      label: 'سجل المستخدمين',
      icon: <Users className="w-4 h-4" />,
      active: activeTab === 'users',
      onClick: () => setActiveTab('users'),
      badge: usersData?.total,
    },
    {
      label: 'إضافة معلم ومدرسة',
      icon: <School className="w-4 h-4" />,
      active: activeTab === 'add-teacher',
      onClick: () => setActiveTab('add-teacher'),
    },
    {
      label: 'إضافة طالب جديد',
      icon: <UserPlus className="w-4 h-4" />,
      active: activeTab === 'add-student',
      onClick: () => setActiveTab('add-student'),
    },
  ];

  return (
    <DashboardShell
      role="ADMIN"
      userDisplayName={profile.user.displayName}
      userUsername={profile.user.username}
      tenantName={profile.activeTenant?.tenantName || 'إدارة النظام'}
      navItems={navItems}
      onLogout={handleLogout}
      title="لوحة تحكم المشرف العام"
      subtitle="إدارة مستأجري النظام، وتوزيع الصلاحيات، وحسابات المعلمين والطلاب"
    >
      <div className="space-y-8">
        {/* KPI Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="إجمالي المستخدمين"
            value={usersData?.total || 0}
            subtitle="حسابات مسجلة في المنصة"
            icon={<Users className="w-6 h-6" />}
            iconBgColor="bg-[#F0F5FF]"
            iconColor="text-[#246BFD]"
          />
          <StatCard
            title="المعلمون والمدارس"
            value={teachersCount}
            subtitle="مساحات تدريسية مستقلة"
            icon={<School className="w-6 h-6" />}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
          />
          <StatCard
            title="الطلاب النشطون"
            value={studentsCount}
            subtitle="دخول بدون بريد إلكتروني"
            icon={<GraduationCap className="w-6 h-6" />}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            title="الحسابات المفعلة"
            value={activeCount}
            subtitle={`من أصل ${usersData?.total || 0} مستخدم`}
            icon={<CheckCircle className="w-6 h-6" />}
            iconBgColor="bg-teal-50"
            iconColor="text-teal-600"
          />
        </div>

        {/* Action Tabs Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-[#E5EAF4] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'users'
                  ? 'bg-[#246BFD] text-white shadow-sm shadow-[#246BFD]/25'
                  : 'bg-white text-[#77829A] hover:bg-[#F5F7FC] hover:text-[#17213A] border border-[#E5EAF4]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>سجل المستخدمين ({usersData?.total || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('add-teacher')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'add-teacher'
                  ? 'bg-[#246BFD] text-white shadow-sm shadow-[#246BFD]/25'
                  : 'bg-white text-[#77829A] hover:bg-[#F5F7FC] hover:text-[#17213A] border border-[#E5EAF4]'
              }`}
            >
              <School className="w-4 h-4" />
              <span>إضافة معلم ومدرسة</span>
            </button>
            <button
              onClick={() => setActiveTab('add-student')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'add-student'
                  ? 'bg-[#246BFD] text-white shadow-sm shadow-[#246BFD]/25'
                  : 'bg-white text-[#77829A] hover:bg-[#F5F7FC] hover:text-[#17213A] border border-[#E5EAF4]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة طالب جديد</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Users Table */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5EAF4] shadow-soft">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute inset-y-0 right-3.5 my-auto text-[#77829A] pointer-events-none" />
                <Input
                  type="text"
                  placeholder="ابحث بالاسم، اسم المستخدم، أو المدرسة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-10 text-xs sm:text-sm bg-[#F8FAFC] border-[#E5EAF4]"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
                {(['ALL', 'TEACHER', 'STUDENT', 'ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      roleFilter === r
                        ? 'bg-[#101A35] text-white'
                        : 'bg-[#F1F5F9] text-[#77829A] hover:bg-[#E2E8F0] hover:text-[#17213A]'
                    }`}
                  >
                    {r === 'ALL'
                      ? 'الكل'
                      : r === 'TEACHER'
                      ? 'معلمون'
                      : r === 'STUDENT'
                      ? 'طلاب'
                      : 'مدراء'}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table Card */}
            <Card className="border-[#E5EAF4] shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-[#E5EAF4] text-[#77829A] text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-5">المستخدم</th>
                      <th className="py-3.5 px-5">اسم الدخول</th>
                      <th className="py-3.5 px-5">الدور والصلاحية</th>
                      <th className="py-3.5 px-5">المدرسة / الأكاديمية</th>
                      <th className="py-3.5 px-5">الحالة</th>
                      <th className="py-3.5 px-5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF4]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#77829A]">
                          لا توجد نتائج مطابقة لبحثك
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                          <td className="py-3.5 px-5 font-bold text-[#17213A]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#F0F5FF] text-[#246BFD] flex items-center justify-center font-bold text-xs shrink-0">
                                {u.displayName[0]}
                              </div>
                              <span>{u.displayName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-xs text-[#77829A]">
                            @{u.username}
                          </td>
                          <td className="py-3.5 px-5">
                            <Badge
                              variant={
                                u.role === 'ADMIN'
                                  ? 'warning'
                                  : u.role === 'TEACHER'
                                  ? 'primary'
                                  : 'success'
                              }
                              size="sm"
                            >
                              {u.role === 'ADMIN' ? 'مدير' : u.role === 'TEACHER' ? 'معلم' : 'طالب'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-5 text-xs text-[#77829A]">
                            {u.tenantName || 'عام'}
                          </td>
                          <td className="py-3.5 px-5">
                            <Badge
                              variant={u.isActive ? 'success' : 'danger'}
                              size="sm"
                            >
                              {u.isActive ? 'مفعل' : 'معطل'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                                className="h-8 w-8 p-0"
                                title={u.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                              >
                                {u.isActive ? (
                                  <ToggleRight className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5 text-rose-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setResetTargetUser(u)}
                                className="h-8 w-8 p-0 text-[#77829A] hover:text-[#246BFD]"
                                title="إعادة تعيين كلمة المرور (مدعوم بسجل تدقيق)"
                              >
                                <KeyRound className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: Add Teacher Form */}
        {activeTab === 'add-teacher' && (
          <Card className="max-w-2xl border-[#E5EAF4] shadow-card">
            <CardHeader className="border-b border-[#E5EAF4] pb-5">
              <CardTitle className="text-xl font-bold text-[#17213A] flex items-center gap-2">
                <School className="w-5 h-5 text-[#246BFD]" />
                <span>إنشاء حساب معلم جديد ومساحة عمل مدرسة</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#77829A]">
                يقوم بإنشاء حساب معلم معزول مع مساحة مدرسة خاصة به ورابط مخصص (Slug) وفق معايير عزل المستأجرين.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {teacherMsg && (
                <div
                  className={`p-4 rounded-xl text-xs flex items-center gap-3 ${
                    teacherMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {teacherMsg.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                  )}
                  <span className="font-medium">{teacherMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateTeacher} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                    <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                  <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                    <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                    <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                  <label className="block text-xs font-bold text-[#17213A] mb-1.5">
                    التخصص التدريسي
                  </label>
                  <Input
                    placeholder="مثال: فيزياء وكيمياء"
                    value={tSpec}
                    onChange={(e) => setTSpec(e.target.value)}
                  />
                </div>

                <div className="pt-3">
                  <Button
                    type="submit"
                    disabled={submittingTeacher}
                    isLoading={submittingTeacher}
                    className="w-full sm:w-auto px-6 font-bold"
                  >
                    إنشاء حساب المعلم والمدرسة
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: Add Student Form */}
        {activeTab === 'add-student' && (
          <Card className="max-w-2xl border-[#E5EAF4] shadow-card">
            <CardHeader className="border-b border-[#E5EAF4] pb-5">
              <CardTitle className="text-xl font-bold text-[#17213A] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#246BFD]" />
                <span>تسجيل طالب جديد (بدون بريد إلكتروني)</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#77829A]">
                يسجل الطالب باستخدام اسم المستخدم وكلمة المرور فقط، لتمكينه من الانضمام للمقررات الدراسية.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {studentMsg && (
                <div
                  className={`p-4 rounded-xl text-xs flex items-center gap-3 ${
                    studentMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {studentMsg.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                  )}
                  <span className="font-medium">{studentMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                    <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                  <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                    <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                    <label className="block text-xs font-bold text-[#17213A] mb-1.5">
                      الصف الدراسي
                    </label>
                    <Input
                      placeholder="مثال: الصف الثاني الثانوي"
                      value={sGrade}
                      onChange={(e) => setSGrade(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <Button
                    type="submit"
                    disabled={submittingStudent}
                    isLoading={submittingStudent}
                    className="w-full sm:w-auto px-6 font-bold"
                  >
                    تسجيل حساب الطالب
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reset Password Modal */}
        {resetTargetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1226]/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-floating border border-[#E5EAF4] w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5EAF4] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0F5FF] text-[#246BFD] flex items-center justify-center font-bold">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-[#17213A]">
                    إعادة تعيين كلمة المرور: {resetTargetUser.displayName}
                  </h3>
                </div>
                <button
                  onClick={() => setResetTargetUser(null)}
                  className="text-[#77829A] hover:text-[#17213A] text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#77829A] leading-relaxed">
                سيتم تشفير كلمة المرور وتعيينها فوراً، وسيتم تسجيل العملية رسمياً في سجل تدقيق النظام (Audit Log) لأغراض الأمان والمساءلة.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#17213A] mb-1.5">
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
                  <label className="block text-xs font-bold text-[#17213A] mb-1.5">
                    سبب إعادة التعيين (مطلوب للتدقيق) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="مثال: طلب ولي الأمر عبر إدارة المدرسة بعد نسيان الطالب لكلمة المرور"
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    className="w-full rounded-xl border border-[#E5EAF4] p-3 text-xs text-[#17213A] focus:border-[#246BFD] focus:ring-2 focus:ring-[#246BFD]/20 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5EAF4]">
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
                    disabled={submittingReset}
                    isLoading={submittingReset}
                    className="font-bold"
                  >
                    تأكيد وحفظ التغيير
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
