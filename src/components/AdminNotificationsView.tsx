import React from 'react';
import {
  Bell,
  Sparkles,
  Clock,
  ShieldCheck,
  Megaphone,
  Calendar,
  FileCheck,
  Compass,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

export const AdminNotificationsView: React.FC = () => {
  return (
    <div className="space-y-4 md:space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Top Banner: Coming Soon Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-l from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-5 md:p-7 shadow-xl border border-indigo-800/40 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>قريباً التفعيل ⏳</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              الإشعارات والتعاميم الإدارية
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
              مركز رسمي للإعلانات المدرسية المباشرة والتعاميم الصادرة من إدارة المرحلة والمعلمين والمرشد الطلابي لتصلك أولاً بأول.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 backdrop-blur-md shadow-inner">
              <Bell className="w-7 h-7 md:w-8 md:h-8 animate-pulse" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-4">
        {/* Card 1: Official Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              قريباً
            </span>
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-slate-900 mb-1">
              التعاميم والتنبيهات المدرسية
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              استقبال الأخبار الرسمية المباشرة من المشرف الأساسي وإدارة الثانوية بخصوص الأنشطة والمواعيد المدرسية.
            </p>
          </div>
        </motion.div>

        {/* Card 2: Exams & Schedules */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              قريباً
            </span>
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-slate-900 mb-1">
              جداول الاختبارات والمراجعات
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              إشعارات فورية بجداول الاختبارات الشهرية والنهائية، وجلسات المراجعة المباشرة قبل الامتحانات.
            </p>
          </div>
        </motion.div>

        {/* Card 3: Homework & Submissions Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              قريباً
            </span>
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-slate-900 mb-1">
              تنبيهات الواجبات والمذكرات
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              تذكير بالمواعيد النهائية لتسليم الواجبات ونزول المذكرات والشروحات الجديدة لكل مادة.
            </p>
          </div>
        </motion.div>

        {/* Card 4: Guidance Counseling */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              قريباً
            </span>
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-slate-900 mb-1">
              توجيهات المرشد الطلابي
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              نصائح وإرشادات دراسية وتربوية لرفع مستوى التحصيل الدراسي وتنظيم الوقت وإدارة المذاكرة.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Info Notice Box */}
      <div className="bg-slate-100/90 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 text-slate-600 text-xs font-medium">
        <Clock className="w-4 h-4 text-slate-500 shrink-0" />
        <span>يتم حالياً ربط نظام البث المباشر للإشعارات السحابية مع تطبيق المدرسة وسيتوفر قريباً لكافة الطلاب.</span>
      </div>

      {/* WhatsApp Group Direct Button */}
      <a
        id="whatsapp-notifications-btn"
        href="https://chat.whatsapp.com/E8lRfoLDghq3syUGzeBfl7?s=cl&p=i&mlu=4&ilr=4"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 md:py-3.5 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-2xl font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] cursor-pointer"
      >
        <MessageCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
        <span>الدخول لقروب الواتساب للتنبيهات الفورية</span>
      </a>
    </div>
  );
};
