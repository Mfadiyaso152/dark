import React from 'react';
import { Sparkles, Target, Brain } from 'lucide-react';

export const QuduratView: React.FC = () => {
  return (
    <div className="space-y-4 md:space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white rounded-3xl p-6 sm:p-7 md:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs md:text-sm font-black">
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>دليل القدرات</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
            قسم اختبار القدرات العامة
          </h2>
        </div>
      </div>

      {/* Feature Teasers Grid - Without Description */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:gap-5">
        {/* Quantitative / القسم الكمي */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-xs flex items-center gap-3.5 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Target className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg md:text-xl text-[#1E293B]">
              القسم الكمي
            </h3>
          </div>
        </div>

        {/* Verbal / القسم اللفظي */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-xs flex items-center gap-3.5 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg md:text-xl text-[#1E293B]">
              القسم اللفظي
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};
