import React from 'react';
import { Lock, Sparkles, BookOpen, ExternalLink, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface QuduratViewProps {
  onBackHome?: () => void;
}

export const QuduratView: React.FC<QuduratViewProps> = ({ onBackHome }) => {
  return (
    <div className="max-w-2xl mx-auto text-right font-['IBM_Plex_Sans_Arabic',sans-serif] py-6 sm:py-10 px-3 space-y-6">
      {/* Liquid Glass Locked Card */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className="glass-subject-vessel rounded-[2.5rem] p-6 sm:p-10 text-center space-y-6 relative overflow-hidden shadow-[0_16px_40px_-10px_rgba(15,23,42,0.12)] border border-white/95"
      >
        {/* Specular Highlight */}
        <div className="absolute top-0 inset-x-10 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        {/* Lock Icon in Glass Vessel */}
        <div className="w-20 h-20 rounded-full bg-white/60 text-slate-900 border border-white/90 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.1),inset_0_2px_3px_0_rgba(255,255,255,1)] backdrop-blur-2xl flex items-center justify-center mx-auto relative overflow-hidden">
          <div className="absolute top-0 inset-x-3 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />
          <Lock className="w-9 h-9 text-amber-500 animate-pulse" />
        </div>

        {/* Title and Message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-900 border border-amber-500/20 text-xs sm:text-sm font-black backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>قريباً جداً</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-['Alexandria',sans-serif] text-slate-950">
            قسم اختبارات القدرات
          </h2>
          <p className="text-sm sm:text-base font-medium text-slate-600 max-w-md mx-auto leading-relaxed">
            قسم اختبارات وتدريبات القدرات العامة قيد التطوير والتجهيز حالياً، وسيتوفر لجميع الطلاب والمعلمين قريباً.
          </p>
        </div>

        {/* Action Button */}
        {onBackHome && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onBackHome}
              className="py-3 px-6 rounded-full glass-subject-vessel text-slate-900 font-black text-xs sm:text-sm inline-flex items-center gap-2 shadow-xs hover:bg-white/80 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 text-sky-600" />
              <span>العودة للصفحة الرئيسية</span>
            </button>
          </div>
        )}

        <hr className="border-white/60 my-4" />

        {/* Recommended Resource: Al-Moaser Book in Glass Card */}
        <div className="glass-subject-vessel rounded-3xl p-5 sm:p-6 text-right space-y-3 border border-white/80">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/70 border border-white/90 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs backdrop-blur-md">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  كتاب المعاصر 11 للقدرات
                </h3>
                <span className="text-xs text-slate-500 font-medium">المرجع المعتمد للتدريب</span>
              </div>
            </div>

            <a
              href="https://www.jarir.com/arabic-books-688126.html"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 bg-slate-900/90 hover:bg-slate-900 active:scale-95 text-white rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition cursor-pointer shrink-0 backdrop-blur-md border border-white/20"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-300" />
              <span>مكتبة جرير</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
