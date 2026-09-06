import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import {
  BookOpen,
  Sparkles,
  Download,
  CheckCircle2,
  Bookmark,
  GraduationCap,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithGoogle, authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleRealGoogleLogin = async () => {
    setIsLoading(true);
    const success = await loginWithGoogle();
    setIsLoading(false);
    if (success && onSuccess) onSuccess();
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F8FAFC] relative overflow-hidden flex flex-col justify-center items-center p-4 sm:p-6 text-right font-['Tajawal',sans-serif] selection:bg-purple-600 selection:text-white"
    >
      {/* Animated Background Gradient Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.55, 0.35],
          x: [0, 20, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-20 -right-20 w-96 h-96 bg-purple-200/50 rounded-full blur-3xl pointer-events-none -z-10"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, -25, 0],
          y: [0, 25, 0]
        }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -bottom-24 -left-20 w-[28rem] h-[28rem] bg-blue-200/40 rounded-full blur-3xl pointer-events-none -z-10"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10"
      />

      {/* Floating Decorative Subject Badges */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: [0, -8, 0] }}
        transition={{ y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.6 } }}
        className="hidden md:flex absolute top-16 right-16 items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-sm border border-slate-200/80 text-xs font-bold text-slate-700"
      >
        <span className="text-base">📐</span>
        <span>رياضيات 1-1</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, opacity: { duration: 0.6, delay: 0.2 } }}
        className="hidden md:flex absolute top-24 left-20 items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-sm border border-slate-200/80 text-xs font-bold text-slate-700"
      >
        <span className="text-base">🧪</span>
        <span>كيمياء 1</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: [0, -10, 0] }}
        transition={{ y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }, opacity: { duration: 0.6, delay: 0.4 } }}
        className="hidden md:flex absolute bottom-20 right-24 items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-sm border border-slate-200/80 text-xs font-bold text-slate-700"
      >
        <span className="text-base">🌿</span>
        <span>علم البيئة</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ y: { duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }, opacity: { duration: 0.6, delay: 0.6 } }}
        className="hidden md:flex absolute bottom-24 left-28 items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-sm border border-slate-200/80 text-xs font-bold text-slate-700"
      >
        <span className="text-base">💻</span>
        <span>تقنية رقمية</span>
      </motion.div>

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6 relative z-10"
      >
        {/* Top Tag & Logo */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>منصة أول ثانوي • نظام المسارات 1446-1447هـ</span>
          </motion.div>

          <div className="relative mx-auto w-16 h-16">
            <motion.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 bg-gradient-to-tr from-purple-700 via-indigo-600 to-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-purple-500/20"
            >
              <BookOpen className="w-8 h-8 text-white" />
            </motion.div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              مقررات وملخصات أول ثانوي
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 leading-relaxed">
              منصتك التعليمية المتكاملة لتصفح المقررات الدراسية، حفظ الشروحات، وتحميل مذكرات ومراجعات الـ PDF المعتمدة.
            </p>
          </div>
        </div>

        {/* Features Highlights Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-right">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex sm:flex-col items-center sm:items-start gap-2 text-slate-700">
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold block">شروحات كاملة</span>
              <span className="text-[10px] text-slate-400 block sm:mt-0.5">دروس لجميع المواد</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex sm:flex-col items-center sm:items-start gap-2 text-slate-700">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold block">مذكرات PDF</span>
              <span className="text-[10px] text-slate-400 block sm:mt-0.5">تحميل للمذاكرة</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex sm:flex-col items-center sm:items-start gap-2 text-slate-700">
            <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Bookmark className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold block">حفظ وإنجاز</span>
              <span className="text-[10px] text-slate-400 block sm:mt-0.5">متابعة دراسية</span>
            </div>
          </div>
        </div>

        {/* Real Google Login Primary Button */}
        <div className="space-y-3 pt-2">
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 leading-relaxed font-medium text-center"
            >
              {authError}
            </motion.div>
          )}

          <button
            onClick={handleRealGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-purple-500 text-slate-800 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-xs hover:shadow-md active:scale-[0.99] group cursor-pointer disabled:opacity-60"
          >
            <svg className="w-5 h-5 transition group-hover:scale-110 shrink-0" viewBox="0 0 24 24">
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
            <span className="text-slate-800 group-hover:text-purple-700 transition">
              {isLoading ? 'جاري الاتصال بـ Google...' : 'الدخول السريع باستخدام حساب Google'}
            </span>
          </button>

          <p className="text-[11px] text-center text-slate-400 font-medium">
            يتم تسجيلك تلقائياً كـ <span className="font-bold text-slate-600">طالب</span> لحفظ تقدمك ومحفوظاتك
          </p>

          {/* WhatsApp Group Direct Button */}
          <a
            id="whatsapp-login-btn"
            href="https://chat.whatsapp.com/E8lRfoLDghq3syUGzeBfl7?s=cl&p=i&mlu=4&ilr=4"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>الدخول لقروب الواتساب</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
};

