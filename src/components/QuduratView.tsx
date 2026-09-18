import React from 'react';
import { BookOpen, ExternalLink, Sparkles, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export const QuduratView: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto text-right font-['Tajawal',sans-serif] py-8 px-3 space-y-6">
      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-xs space-y-8"
      >
        {/* Header Badge & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs sm:text-sm font-black">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>منصة اختبارات القدرات العامة</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            قسم القدرات
          </h2>
        </div>

        {/* Enter Qudurat Button */}
        <div className="text-center">
          <button
            type="button"
            className="py-3.5 px-8 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-sm sm:text-base inline-flex items-center gap-2.5 shadow-md transition cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            <span>الدخول إلى قسم القدرات</span>
          </button>
        </div>

        <hr className="border-slate-100 my-4" />

        {/* Al-Moaser Book Section */}
        <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  كتاب المعاصر 11
                </h3>
              </div>
            </div>

            <a
              href="https://www.jarir.com/arabic-books-688126.html"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black inline-flex items-center gap-2 shadow-xs transition cursor-pointer shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              <span>رابط الشراء (مكتبة جرير)</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
