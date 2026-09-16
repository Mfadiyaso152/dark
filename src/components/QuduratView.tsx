import React, { useState } from 'react';
import { BookOpen, ExternalLink, Lock, Clock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const QuduratView: React.FC = () => {
  const [showSoonToast, setShowSoonToast] = useState(false);

  const handleEnterQuduratSoon = () => {
    setShowSoonToast(true);
    setTimeout(() => setShowSoonToast(false), 3500);
  };

  return (
    <div className="max-w-3xl mx-auto text-right font-['Tajawal',sans-serif] py-8 px-3 space-y-6">
      {/* Toast Alert */}
      {showSoonToast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between text-xs sm:text-sm font-bold"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 animate-spin" />
            <span>قسم القدرات قريباً - يفتح رسمياً بتاريخ 12/2/2027</span>
          </div>
          <button onClick={() => setShowSoonToast(false)} className="text-white hover:bg-indigo-700 p-1 rounded-lg">
            ✕
          </button>
        </motion.div>
      )}

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
            قسم القدرات (قريباً) ⏳
          </h2>
        </div>

        {/* Enter Qudurat Button (Coming Soon with date) */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleEnterQuduratSoon}
            className="py-3.5 px-8 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-sm sm:text-base inline-flex items-center gap-2.5 shadow-md transition cursor-pointer"
          >
            <Lock className="w-5 h-5" />
            <span>الدخول إلى قسم القدرات (قريباً - يفتح بتاريخ 12/2/2027)</span>
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
                  كتاب المعاصر للقدرات (الكمي واللفظي)
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
