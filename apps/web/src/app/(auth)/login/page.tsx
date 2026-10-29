'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, KeyRound, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { FormField, FormLabel, FormMessage } from '@/components/ui/form';
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
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-emerald-600/20">
              د
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">دَرب</span>
          </Link>
          <p className="text-sm text-slate-500">بوابة الدخول الموحدة للمعلمين والطلاب</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
            <CardDescription>
              أدخل اسم المستخدم المسجل وكلمة المرور للمتابعة
            </CardDescription>
          </CardHeader>

          <CardContent>
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
                    className="pl-3 pr-10 text-right"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                </div>
              </FormField>

              <FormField>
                <div className="flex items-center justify-between">
                  <FormLabel htmlFor="password">كلمة المرور</FormLabel>
                </div>
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
                    className="pl-3 pr-10 text-right"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                </div>
              </FormField>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full text-base font-bold h-11"
                  isLoading={isLoading}
                >
                  دخول
                </Button>
              </div>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2 text-center">
                حسابات تجريبية للمعاينة (المرحلة الأولى):
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleFillDemo('teacher.ahmed')}
                  className="p-2 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-right"
                >
                  👨‍🏫 معلم: أحمد منصور
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('teacher.layla')}
                  className="p-2 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-right"
                >
                  👩‍🏫 معلمة: ليلى محمود
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('student.tariq')}
                  className="p-2 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-right"
                >
                  🎒 طالب: طارق زياد
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('admin.darb')}
                  className="p-2 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition text-right"
                >
                  🛡️ مدير المنصة
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-center text-xs text-slate-500">
            <Link href="/" className="inline-flex items-center gap-1 hover:text-emerald-700 transition">
              <ArrowRight className="w-3.5 h-3.5" />
              العودة للصفحة الرئيسية
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
