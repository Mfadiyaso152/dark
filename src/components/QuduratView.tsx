import React from 'react';
import { Sparkles, Target, Brain, Clock, Lock, ArrowUpRight, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export const QuduratView: React.FC = () => {
  return (
    <div className="space-y-4 md:space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Hero Card with 'قريباً التفعيل' badge */}
      <div className="bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E1B4B] text-white rounded-3xl p-6 sm:p-7 md:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs md:text-sm font-black backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>دليل واختبارات القدرات</span>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-400/30 px-3 py-1 rounded-full text-xs md:text-sm font-black backdrop-blur-xs animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>قريباً التفعيل ⏳</span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
            قسم اختبار القدرات العامة
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            يتم تجهيز تجميعات تفاعلية، اختبارات تجريبية موقوتة، وشروحات مبسطة لأهم قوانين وتكنيكات الحل السريع للقسمين الكمي واللفظي.
          </p>
        </div>
      </div>

      {/* Coming Soon Notice Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/40 rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-2xs"
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-xs border border-amber-400/30">
          <Lock className="w-6 h-6 text-amber-600" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <h4 className="font-black text-amber-900 text-sm sm:text-base">
            قريباً التفعيل الكامل للقدرات
          </h4>
          <p className="text-xs text-amber-800/80 leading-relaxed">
            يجري العمل على إدراج بنك الأسئلة الشامل ونماذج المحوسب والورقي فور اكتمال التجهيز.
          </p>
        </div>
      </motion.div>

      {/* Feature Teasers Grid with 'قريباً' status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-5">
        {/* Quantitative / القسم الكمي */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3.5 md:gap-4 relative overflow-hidden group">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Target className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h3 className="font-black text-base sm:text-lg md:text-xl text-[#1E293B]">
                القسم الكمي
              </h3>
              <p className="text-xs text-slate-400">الحساب، الهندسة، الجبر، والإحصاء والنسب</p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 shrink-0 flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            قريباً
          </span>
        </div>

        {/* Verbal / القسم اللفظي */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3.5 md:gap-4 relative overflow-hidden group">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Brain className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <h3 className="font-black text-base sm:text-lg md:text-xl text-[#1E293B]">
                القسم اللفظي
              </h3>
              <p className="text-xs text-slate-400">التناظر اللفظي، إكمال الجمل، والخطأ السياقي</p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 shrink-0 flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            قريباً
          </span>
        </div>
      </div>
    </div>
  );
};
