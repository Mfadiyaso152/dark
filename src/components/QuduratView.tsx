import React from 'react';
import { Sparkles, Target, Brain, Compass } from 'lucide-react';

export const QuduratView: React.FC = () => {
  return (
    <div className="space-y-4 text-right font-['Tajawal',sans-serif]">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>قريباً</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">
            قسم اختبار القدرات العامة (قياس)
          </h2>
        </div>
      </div>

      {/* Feature Teasers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Quantitative / الكمي */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-[#1E293B]">
            القسم الكمي (الرياضيات والمسائل)
          </h3>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
              حساب ذهني سريع
            </span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
              تجميعات النماذج
            </span>
          </div>
        </div>

        {/* Verbal / اللفظي */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-[#1E293B]">
            القسم اللفظي (اللغة والفهم)
          </h3>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
              علاقات التناظر
            </span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
              تحليل النصوص
            </span>
          </div>
        </div>
      </div>

      {/* Preparation Tips Box */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <Compass className="w-4 h-4 text-blue-600" />
          <h4 className="font-bold text-xs">خطة الاستعداد المبكر للقدرات</h4>
        </div>
        <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
          <li>التأسيس أولاً من خلال فهم المفاهيم الأساسية قبل حل النماذج.</li>
          <li>التدريب اليومي بمعدل 20 إلى 30 دقيقة يومياً.</li>
        </ul>
      </div>
    </div>
  );
};
