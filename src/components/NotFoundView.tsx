import React from 'react';
import { Home, ArrowRight, BookOpen, Compass, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { Subject } from '../types';
import { getSubjectSlug } from '../utils/routes';

interface NotFoundViewProps {
  attemptedPath?: string;
  onGoHome: () => void;
  onSelectSubject?: (subject: Subject) => void;
  subjects?: Subject[];
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  attemptedPath,
  onGoHome,
  onSelectSubject,
  subjects = []
}) => {
  const popularSubjects = subjects.slice(0, 6);

  return (
    <div
      dir="rtl"
      className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 md:p-8 font-['Tajawal',sans-serif] text-right"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 md:p-10 text-center space-y-6"
      >
        {/* Animated 404 Badge */}
        <div className="relative inline-block">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-500/25">
            <Compass className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
          </div>
          <span className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-xs font-black px-2.5 py-1 rounded-full border-2 border-white shadow-xs">
            404
          </span>
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            عفواً، الصفحة غير موجودة!
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
            الرابط الذي تحاول الوصول إليه{' '}
            {attemptedPath && (
              <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 inline-block mx-1 dir-ltr">
                {attemptedPath}
              </span>
            )}{' '}
            غير متاح أو قد تم نقله لمسار آخر.
          </p>
        </div>

        {/* Primary Home Button */}
        <div className="pt-2">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onGoHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-3.5 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm sm:text-base transition shadow-md shadow-indigo-500/25 cursor-pointer"
          >
            <Home className="w-5 h-5" />
            <span>العودة إلى الصفحة الرئيسية</span>
          </motion.button>
        </div>

        {/* Quick Subject Shortcuts */}
        {popularSubjects.length > 0 && onSelectSubject && (
          <div className="pt-4 border-t border-slate-100 text-right space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                تصفح المواد الأساسية مباشرة:
              </span>
            </div>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {popularSubjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => onSelectSubject(sub)}
                  className="py-1.5 px-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>{sub.emoji || '📚'}</span>
                  <span>{sub.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
