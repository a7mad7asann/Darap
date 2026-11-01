import Link from 'next/link';
import {
  BookOpen,
  GraduationCap,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Layers,
  Lock,
  CheckCircle,
  FileText,
  BarChart3,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F5F7FC] text-[#17213A] selection:bg-[#246BFD] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#E5EAF4] bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#246BFD] flex items-center justify-center text-white shadow-md shadow-[#246BFD]/25 font-extrabold text-xl">
              د
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl text-[#17213A] tracking-tight">دَرب</span>
              <span className="text-[11px] bg-[#F0F5FF] text-[#246BFD] border border-[#C2D7FF] font-bold px-2 py-0.5 rounded-full">
                SaaS التعليمي
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center text-sm font-semibold text-white bg-[#246BFD] hover:bg-[#1A56DE] px-5 py-2.5 rounded-xl transition shadow-md shadow-[#246BFD]/20 focus:outline-none focus:ring-2 focus:ring-[#246BFD] focus:ring-offset-2"
            >
              تسجيل الدخول
              <ArrowLeft className="w-4 h-4 mr-1.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center justify-center text-center">
        {/* Security Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#E5EAF4] text-[#246BFD] text-xs sm:text-sm font-semibold shadow-soft mb-8">
          <ShieldCheck className="w-4 h-4 text-[#246BFD]" />
          <span>عزل تام ومحكم لمساحات المعلمين والبيانات التعليمية</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#17213A] leading-[1.25] tracking-tight max-w-4xl">
          منصة تعليمية عربية متكاملة للمعلمين وطلابهم
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-[#77829A] max-w-2xl leading-relaxed">
          صُممت درب لتمنح المعلم مساحته المستقلة لإدارة المقررات، الواجبات، والاختبارات الإلكترونية، مع إمكانية وصول ميسرة للطلاب دون الحاجة لبريد إلكتروني شخصي.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#246BFD] text-white font-bold text-base hover:bg-[#1A56DE] shadow-xl shadow-[#246BFD]/25 hover:shadow-2xl hover:shadow-[#246BFD]/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#246BFD] focus:ring-offset-2"
          >
            الدخول إلى لوحة التحكم
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Visual SaaS Preview Card */}
        <div className="mt-16 w-full max-w-4xl rounded-2xl border border-[#E5EAF4] bg-white p-3 shadow-floating text-right">
          <div className="rounded-xl bg-[#101A35] p-6 text-white flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="space-y-2 text-right">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#17264A] text-[#5595FF] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>تجربة المستخدم الحديثة</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">لوحة تحكم ذكية تجمع السرعة والأمان</h3>
              <p className="text-sm text-[#AAB6D3] max-w-md">
                شريط جانبي متطور بلون كحلي داكن مع مساحة عمل بيضاء نقية تدعم اللغة العربية بنسبة 100%.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <div className="bg-[#17264A] p-4 rounded-xl text-center border border-white/5">
                <p className="text-2xl font-extrabold text-[#5595FF]">100%</p>
                <p className="text-xs text-[#AAB6D3]">خصوصية وعزل تام</p>
              </div>
              <div className="bg-[#17264A] p-4 rounded-xl text-center border border-white/5">
                <p className="text-2xl font-extrabold text-emerald-400">0</p>
                <p className="text-xs text-[#AAB6D3]">إيميل مطلوب للطلاب</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-right w-full">
          <div className="p-7 rounded-2xl bg-white border border-[#E5EAF4] shadow-card hover:shadow-floating transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-[#F0F5FF] text-[#246BFD] flex items-center justify-center mb-5">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17213A] mb-2.5">مساحات عمل مستقلة</h3>
            <p className="text-sm text-[#77829A] leading-relaxed">
              يمتلك كل معلم مساحة عمل خاصة به معزولة تماماً على مستوى قاعدة البيانات مع دعم كامل للدروس والمرفقات.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white border border-[#E5EAF4] shadow-card hover:shadow-floating transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17213A] mb-2.5">دخول مبسط للطلاب</h3>
            <p className="text-sm text-[#77829A] leading-relaxed">
              تسجيل دخول مباشر لطلاب المدارس باسم المستخدم ورمز المقرر دون اشتراط حساب بريد إلكتروني خارجي.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white border border-[#E5EAF4] shadow-card hover:shadow-floating transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#17213A] mb-2.5">حماية وموثوقية</h3>
            <p className="text-sm text-[#77829A] leading-relaxed">
              تشفير كلمات المرور عبر Argon2id وجلسات آمنة مع تخزين سحابي معزول بالكامل للملفات والوسائط.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5EAF4] py-8 bg-white text-center text-xs text-[#77829A]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#246BFD] text-white flex items-center justify-center font-bold text-xs">
              د
            </div>
            <span className="font-bold text-[#17213A]">دَرب التعليمية</span>
          </div>
          <p>جميع الحقوق محفوظة لمنصة دَرب © {new Date().getFullYear()} — المنصة السحابية المتقدمة</p>
        </div>
      </footer>
    </div>
  );
}
