import React from 'react';
import { Lock, Clock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const QuduratView: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto text-right font-['Tajawal',sans-serif] py-8 px-2">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm text-center space-y-6"
      >
        {/* Locked Icon Badge */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs sm:text-sm font-black">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>قسم القدرات مغلق حالياً</span>
        </div>

        {/* Main Title & Notice */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            قريباً التفعيل ⏳
          </h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto leading-relaxed">
            يجري إعداد وتجهيز بنك التجميعات والنماذج التدريبية للقسمين الكمي واللفظي، وسيتم إتاحة القسم قريباً لجميع الطلاب.
          </p>
        </div>

        {/* Clean subtle footer tag */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-bold">
          <Lock className="w-3.5 h-3.5" />
          <span>القسم غير متاح حالياً للمذاكرة</span>
        </div>
      </motion.div>
    </div>
  );
};


