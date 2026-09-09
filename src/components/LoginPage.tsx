import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, Variants } from 'motion/react';
import { TermsModal } from './TermsModal';
import {
  BookOpen,
  Sparkles,
  Download,
  GraduationCap,
  MessageCircle,
  ClipboardCheck,
  Brain,
  ShieldCheck,
  ChevronLeft,
  Lock,
  ArrowRight,
  Zap,
  Star,
  CheckCircle2
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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F8FAFC] text-slate-800 font-['Tajawal',sans-serif] selection:bg-purple-600 selection:text-white flex flex-col relative overflow-x-hidden"
    >
      {/* Background Animated Ambient Lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top Right Orb */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
            opacity: [0.35, 0.55, 0.35]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-indigo-300/40 via-purple-300/30 to-pink-200/20 rounded-full blur-3xl"
        />

        {/* Top Left Orb */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            x: [0, -30, 0],
            y: [0, 25, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="absolute top-1/4 -left-28 w-[420px] h-[420px] bg-gradient-to-tr from-blue-300/30 via-teal-200/30 to-indigo-200/20 rounded-full blur-3xl"
        />

        {/* Bottom Ambient Glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.25, 0.45, 0.25]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-purple-200/25 via-indigo-100/25 to-blue-200/20 rounded-full blur-3xl"
        />

        {/* Subtle Geometric Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="w-full bg-white/85 backdrop-blur-md border-b border-slate-200/70 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <motion.div
              whileHover={{ rotate: 10, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-500/25 cursor-pointer"
            >
              <GraduationCap className="w-6 h-6" />
            </motion.div>
            <div>
              <span className="font-black text-slate-900 text-base sm:text-lg block leading-tight">
                منصة تفوّق
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                مسارات أول ثانوي • 1446-1447هـ
              </span>
            </div>
          </motion.div>

          {/* Quick Header Sign-In Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleRealGoogleLogin}
            disabled={isLoading}
            className="py-2 px-3.5 sm:px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
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
          </motion.button>
        </div>
      </header>

      {/* Main Introductory Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 space-y-12 relative z-10">
        {/* Hero Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center space-y-5 max-w-3xl mx-auto"
        >
          {/* Animated Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100/90 via-indigo-50 to-purple-50 text-purple-900 border border-purple-200/90 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black shadow-2xs backdrop-blur-xs hover:shadow-xs transition"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            </motion.div>
            <span>نظام المسارات المعتمد 1446-1447هـ</span>
          </motion.div>

          {/* Hero Main Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-snug sm:leading-normal"
          >
            منصة تفوّق{' '}
            <span className="text-indigo-600 inline-block">
              | مسار أول ثانوي
            </span>
          </motion.h1>

          {/* Hero Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            شروحات نموذجية لجميع المواد، مذكرات وملازم PDF معتمدة للمراجعة، متابعة وتسليم الواجبات اليومية إلكترونياً، وإشراف أكاديمي مباشر.
          </motion.p>

          {/* Registration & Login Actions */}
          <motion.div
            variants={itemVariants}
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto"
          >
            {/* Primary Google Login Button */}
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleRealGoogleLogin}
              disabled={isLoading}
              className="w-full sm:w-auto flex-1 py-3.5 px-6 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-purple-600 text-slate-900 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-3 transition-all duration-200 shadow-md hover:shadow-lg shadow-purple-500/10 cursor-pointer disabled:opacity-60 group relative overflow-hidden"
            >
              {/* Subtle shining light bar */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-purple-100/40 to-transparent pointer-events-none" />

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
            </motion.button>

            {/* WhatsApp Group Direct Button */}
            <motion.a
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              id="whatsapp-landing-btn"
              href="https://chat.whatsapp.com/E8lRfoLDghq3syUGzeBfl7?s=cl&p=i&mlu=4&ilr=4"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto py-3.5 px-5 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition active:scale-[0.99] cursor-pointer shrink-0"
            >
              <MessageCircle className="w-5 h-5 shrink-0" />
              <span>قروب الواتساب</span>
            </motion.a>
          </motion.div>

          {authError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-800 font-bold max-w-md mx-auto"
            >
              {authError}
            </motion.div>
          )}

          {/* Privacy & Terms Note */}
          <motion.div variants={itemVariants} className="max-w-md mx-auto space-y-1.5 pt-1">
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
          </motion.div>
        </motion.div>

        {/* Terms and Privacy Modal */}
        <TermsModal
          isOpen={isTermsModalOpen}
          onClose={() => setIsTermsModalOpen(false)}
        />

        {/* Platform Pillars / تعريف بمزايا المنصة */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="pt-4"
        >
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
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-white/95 backdrop-blur-xs rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-3 text-right group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                  الشروحات الدراسية
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  فهرسة منظمة لدروس المقررات مع مقاطع الشرح والتسلسل المنهجي المعتمد.
                </p>
              </div>
            </motion.div>

            {/* Pillar 2 */}
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-white/95 backdrop-blur-xs rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between space-y-3 text-right group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base group-hover:text-purple-600 transition-colors">
                  الواجبات والتسليم
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  استعراض واجبات اليوم مع إمكانية رفع حلول الـ PDF وتعديلها أو حذفها بسهولة.
                </p>
              </div>
            </motion.div>

            {/* Pillar 3 */}
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-white/95 backdrop-blur-xs rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3 text-right group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base group-hover:text-emerald-600 transition-colors">
                  مذكرات وملخصات PDF
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  ملازم مراجعة شاملة بصيغة PDF جاهزة للتحميل والاستعراض الفوري لكل فصل.
                </p>
              </div>
            </motion.div>

            {/* Pillar 4 */}
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-white/95 backdrop-blur-xs rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between space-y-3 text-right group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base group-hover:text-amber-600 transition-colors">
                  القدرات العامة
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  بنك ونماذج تدريبية للقسمين الكمي واللفظي (قريباً التفعيل).
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Subjects Preview Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/95 backdrop-blur-xs rounded-3xl p-6 border border-slate-200/90 shadow-2xs text-center space-y-4"
        >
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
            المقررات المشمولة في المنصة
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {[
              { text: '📐 رياضيات 1-1', bg: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' },
              { text: '💻 تقنية رقمية 1-1', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' },
              { text: '🔤 إنجليزي 1-1 (Mega Goal)', bg: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
              { text: '🧪 كيمياء 1', bg: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100' },
              { text: '🌿 علم البيئة', bg: 'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100' },
              { text: '💡 التفكير الناقد', bg: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100' },
            ].map((sub, i) => (
              <motion.span
                key={i}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-default shadow-2xs ${sub.bg}`}
              >
                {sub.text}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-6 text-center text-xs text-slate-400 relative z-10">
        <p>© 1446-1447هـ • منصة طلاب الصف الأول ثانوي • نظام المسارات</p>
      </footer>
    </div>
  );
};


