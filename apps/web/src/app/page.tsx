import Link from 'next/link';
import { BookOpen, GraduationCap, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 font-bold text-xl">
              د
            </div>
            <div>
              <span className="font-extrabold text-xl text-slate-900 tracking-tight">دَرب</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full mr-2">
                النسخة التجريبية (MVP)
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              تسجيل الدخول
              <ArrowLeft className="w-4 h-4 mr-1.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>عزل تام ومحكم لمساحات المعلمين والبيانات التعليمية</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.25] tracking-tight max-w-3xl">
          منصة تعليمية عربية متكاملة للمعلمين وطلابهم
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
          صُممت درب لتمنح المعلم مساحته المستقلة لإدارة المقررات، الواجبات، والاختبارات الإلكترونية، مع إمكانية وصول ميسرة للطلاب دون الحاجة لبريد إلكتروني شخصي.
        </p>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            الدخول إلى لوحة التحكم
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-right w-full">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">مساحات عمل مستقلة</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              يمتلك كل معلم مساحة عمل خاصة به معزولة تماماً على مستوى قاعدة البيانات (PostgreSQL RLS).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">دخول مبسط للطلاب</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              تسجيل دخول مباشر لطلاب المدارس باسم المستخدم وكلمة المرور دون اشتراط بريد إلكتروني شخصي.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">حماية وموثوقية</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              تشفير كلمات المرور عبر خوارزمية Argon2id وجلسات آمنة عبر ملفات تعريف ارتباط HTTP-only.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        <p>جميع الحقوق محفوظة لمنصة دَرب © {new Date().getFullYear()} — المرحلة الأولى: البنية التحتية والأساس البرمجي</p>
      </footer>
    </div>
  );
}
