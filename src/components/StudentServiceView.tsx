import React from 'react';
import {
  GraduationCap,
  Sparkles,
  Clock,
  Compass,
  FileCheck,
  Award,
  BookOpen,
  MessageCircle,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';

export const StudentServiceView: React.FC = () => {
  return (
    <div className="space-y-4 md:space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Top Banner: Experimental Service Announcement */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-l from-indigo-900 via-purple-900 to-slate-900 text-white rounded-3xl p-5 md:p-7 shadow-xl border border-indigo-800/40 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>خدمة الطلاب (نسخة تجريبية)</span>
              </div>

              <div className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-400/30 px-3 py-1 rounded-full text-xs font-black animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>إطلاق 10 سبتمبر ⏳</span>
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white">
              بوابة خدمات وشؤون الطلاب
            </h2>

            <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed font-medium">
              منصة متكاملة لتقديم الخدمات الطلابية، متابعة التحصيل، استشارات المرشد الطلابي، وسجل الأنشطة والمشاريع المدرسية.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 backdrop-blur-md shadow-inner">
              <GraduationCap className="w-7 h-7 md:w-8 md:h-8" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Prominent Official Alert Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-300/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 border border-amber-400/40">
            <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-black text-amber-950 text-sm sm:text-base">
              هذه الخدمة تجريبية وسيتم إطلاقها 10 سبتمبر
            </h3>
            <p className="text-xs text-amber-800/90 leading-relaxed font-medium">
              يجري حالياً إعداد وربط كافة أدوات التوجيه والإرشاد الأكاديمي والطلابي لتكون متاحة للجميع بالكامل في الموعد المحدد.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-amber-400/25 text-amber-950 border border-amber-400/50 text-xs font-black shrink-0">
          <Calendar className="w-4 h-4 text-amber-800" />
          <span>موعد الإطلاق: 10 سبتمبر 🚀</span>
        </div>
      </motion.div>

      {/* Feature Teaser Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-4">
        {/* Feature 1: Guidance Counseling */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              10 سبتمبر
            </span>
          </div>
          <div>
            <h4 className="text-sm md:text-base font-black text-slate-900 mb-1">
              التواصل مع المرشد الطلابي
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              جلسات استشارية فردية وتوجيه أكاديمي وتربوي لمساعدتك على تجاوز الصعوبات الدراسية وتنظيم جدول المذاكرة.
            </p>
          </div>
        </motion.div>

        {/* Feature 2: Academic Progress & Submissions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              10 سبتمبر
            </span>
          </div>
          <div>
            <h4 className="text-sm md:text-base font-black text-slate-900 mb-1">
              سجل التحصيل والواجبات
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              متابعة تسليمات الواجبات وملاحظات المعلمين والدرجات والتقييمات الخاصة بكل مادة أولاً بأول.
            </p>
          </div>
        </motion.div>

        {/* Feature 3: Student Certificates & Badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              10 سبتمبر
            </span>
          </div>
          <div>
            <h4 className="text-sm md:text-base font-black text-slate-900 mb-1">
              شهادات التميز والشكر
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              استعراض شهادات التقدير الصادرة من إدارة المرحلة والمعلمين للطلاب المتفوقين والمشاركين بالأنشطة.
            </p>
          </div>
        </motion.div>

        {/* Feature 4: Academic Resources */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              10 سبتمبر
            </span>
          </div>
          <div>
            <h4 className="text-sm md:text-base font-black text-slate-900 mb-1">
              بنك النماذج والملفات الطلابية
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              تحميل نماذج الإجابات، الخطط الأسبوعية، ودليل المذاكرة الفعالة لاختبارات مسار أول ثانوي.
            </p>
          </div>
        </motion.div>
      </div>

      {/* WhatsApp Direct Group Button */}
      <a
        id="whatsapp-students-service-btn"
        href="https://chat.whatsapp.com/E8lRfoLDghq3syUGzeBfl7?s=cl&p=i&mlu=4&ilr=4"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 md:py-3.5 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-2xl font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] cursor-pointer"
      >
        <MessageCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
        <span>للاستفسارات العاجلة: الدخول لقروب الواتساب</span>
      </a>
    </div>
  );
};
