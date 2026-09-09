import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { TermsModal } from './TermsModal';
import {
  BookOpen,
  Sparkles,
  Download,
  GraduationCap,
  MessageCircle,
  ClipboardCheck,
  CheckCircle2,
  Brain,
  ShieldCheck,
  Users,
  ChevronLeft,
  Lock
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithGoogle, authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const handleRealGoogleLogin = async () => {
    setIsLoading(true);
    const success = await loginWithGoogle();
    setIsLoading(false);
    if (success && onSuccess) onSuccess();
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F8FAFC] text-slate-800 font-['Tajawal',sans-serif] selection:bg-purple-600 selection:text-white flex flex-col"
    >
      {/* Top Navigation Bar */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-slate-900 text-base sm:text-lg block leading-tight">
                منصة تفوّق
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                مسارات أول ثانوي • 1446-1447هـ
              </span>
            </div>
          </div>

          {/* Quick Header Sign-In Button */}
          <button
            onClick={handleRealGoogleLogin}
            disabled={isLoading}
            className="py-2 px-3.5 sm:px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>دخول سريع</span>
          </button>
        </div>
      </header>

      {/* Main Introductory Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-900 border border-purple-200/80 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>نظام المسارات 1446-1447هـ</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight"
          >
            منصة تفوّق | مسار أول ثانوي
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            شروحات نموذجية لجميع المواد، مذكرات وملازم PDF معتمدة للمراجعة، متابعة وتسليم الواجبات اليومية إلكترونياً، وإشراف أكاديمي مباشر.
          </motion.p>

          {/* Registration & Login Actions */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto"
          >
            {/* Primary Google Login Button */}
            <button
              onClick={handleRealGoogleLogin}
              disabled={isLoading}
              className="w-full sm:w-auto flex-1 py-3.5 px-6 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-purple-600 text-slate-900 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-60 group"
            >
              <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'جاري الاتصال بـ Google...' : 'التسجيل بواسطة حساب Google'}</span>
            </button>

            {/* WhatsApp Group Direct Button */}
            <a
              id="whatsapp-landing-btn"
              href="https://chat.whatsapp.com/E8lRfoLDghq3syUGzeBfl7?s=cl&p=i&mlu=4&ilr=4"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-3.5 px-5 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] cursor-pointer shrink-0"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>قروب الواتساب</span>
            </a>
          </motion.div>

          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-800 font-bold max-w-md mx-auto">
              {authError}
            </div>
          )}

          {/* Privacy & Terms Note */}
          <div className="max-w-md mx-auto space-y-1.5 pt-1">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              بالمتابعة أو تسجيل الدخول، فإنك توافق على{' '}
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(true)}
                className="text-blue-600 hover:text-blue-700 font-bold underline decoration-blue-300 hover:decoration-blue-600 underline-offset-2 transition cursor-pointer"
              >
                الشروط والأحكام وسياسة الخصوصية
              </button>
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-bold">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>جميع بياناتك الشخصية وحلولك محفوظة ومشفرة ولن يتم تسريبها إطلاقاً</span>
            </div>
          </div>
        </div>

        {/* Terms and Privacy Modal */}
        <TermsModal
          isOpen={isTermsModalOpen}
          onClose={() => setIsTermsModalOpen(false)}
        />

        {/* Platform Pillars / تعريف بمزايا المنصة */}
        <div className="pt-4">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              ماذا تقدم لك المنصة؟
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              خدمات تعليمية متكاملة مصممة خصيصاً لطلاب المرحلة الثانوية
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pillar 1 */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3 text-right">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  الشروحات الدراسية
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  فهرسة منظمة لدروس المقررات مع مقاطع الشرح والتسلسل المنهجي المعتمد.
                </p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3 text-right">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  الواجبات والتسليم
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  استعراض واجبات اليوم مع إمكانية رفع حلول الـ PDF وتعديلها أو حذفها بسهولة.
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3 text-right">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  مذكرات وملخصات PDF
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  ملازم مراجعة شاملة بصيغة PDF جاهزة للتحميل والاستعراض الفوري لكل فصل.
                </p>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3 text-right">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  القدرات العامة
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  بنك ونماذج تدريبية للقسمين الكمي واللفظي (قريباً التفعيل).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Preview Bar */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs text-center space-y-4">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
            المقررات المشمولة في المنصة
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              📐 رياضيات 1-1
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
              💻 تقنية رقمية 1-1
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              🔤 إنجليزي 1-1 (Mega Goal)
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
              🧪 كيمياء 1
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold border border-teal-100">
              🌿 علم البيئة
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">
              💡 التفكير الناقد
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-400">
        <p>© 1446-1447هـ • منصة طلاب الصف الأول ثانوي • نظام المسارات</p>
      </footer>
    </div>
  );
};


