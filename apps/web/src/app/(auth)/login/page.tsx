'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, KeyRound, User, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { FormField, FormLabel } from '@/components/ui/form';
import { ErrorState } from '@/components/ui/error-state';
import { apiClient } from '@/lib/api-client';
import { UserRole } from '@darb/contracts';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.login({
        username: username.trim(),
        password,
      });

      // Role-based routing
      if (response.user.role === UserRole.TEACHER) {
        router.push('/teacher');
      } else if (response.user.role === UserRole.STUDENT) {
        router.push('/student');
      } else if (response.user.role === UserRole.ADMIN) {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل تسجيل الدخول. يرجى التحقق من البيانات المدخلة.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoUser: string) => {
    setUsername(demoUser);
    setPassword('Darap123456!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F5F7FC] text-[#17213A] selection:bg-[#246BFD] selection:text-white">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#246BFD] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-[#246BFD]/30 group-hover:scale-105 transition-transform">
              د
            </div>
            <span className="text-3xl font-black text-[#17213A] tracking-tight">دَرب</span>
          </Link>
          <p className="text-sm text-[#77829A] font-medium">بوابة الدخول الموحدة للمعلمين والطلاب</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-floating border-[#E5EAF4]">
          <CardHeader className="text-center pb-4 pt-8">
            <CardTitle className="text-2xl font-black text-[#17213A]">تسجيل الدخول</CardTitle>
            <CardDescription className="text-[#77829A]">
              أدخل اسم المستخدم المسجل وكلمة المرور للمتابعة
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {errorMessage && (
              <div className="mb-5">
                <ErrorState message={errorMessage} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField>
                <FormLabel htmlFor="username">اسم المستخدم</FormLabel>
                <div className="relative">
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="مثال: teacher.ahmed أو student.tariq"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pr-10 text-right"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#77829A]">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </FormField>

              <FormField>
                <FormLabel htmlFor="password">كلمة المرور</FormLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pr-10 text-right"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#77829A]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                </div>
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full text-base font-bold shadow-md shadow-[#246BFD]/25 mt-2"
                isLoading={isLoading}
              >
                دخول
              </Button>
            </form>

            {/* Demo Quick Fill Shortcuts */}
            <div className="mt-8 pt-6 border-t border-[#E5EAF4]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#77829A] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#246BFD]" />
                  حسابات تجريبية سريعة
                </span>
                <span className="text-[11px] text-[#9DA8BE]">(نقرة واحدة للتعبئة)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleFillDemo('teacher.ahmed')}
                  className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-[#E5EAF4] bg-[#F8FAFC] text-[#17213A] hover:bg-[#F0F5FF] hover:border-[#C2D7FF] hover:text-[#246BFD] transition text-center"
                >
                  معلم (أحمد)
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('student.tariq')}
                  className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-[#E5EAF4] bg-[#F8FAFC] text-[#17213A] hover:bg-[#F0F5FF] hover:border-[#C2D7FF] hover:text-[#246BFD] transition text-center"
                >
                  طالب (طارق)
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('admin')}
                  className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-[#E5EAF4] bg-[#F8FAFC] text-[#17213A] hover:bg-[#F0F5FF] hover:border-[#C2D7FF] hover:text-[#246BFD] transition text-center"
                >
                  مدير النظام
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-center border-t border-[#E5EAF4] bg-[#F8FAFC]/60 py-3.5">
            <div className="flex items-center gap-1.5 text-xs text-[#77829A]">
              <ShieldCheck className="w-4 h-4 text-[#246BFD]" />
              <span>اتصال آمن ومشفر بأعلى معايير الحماية</span>
            </div>
          </CardFooter>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs font-semibold text-[#77829A] hover:text-[#246BFD] inline-flex items-center gap-1 transition"
          >
            العودة إلى الصفحة الرئيسية
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
