import React, { useState } from 'react';
import { Subject, Lesson } from '../types';
import { SubjectIcon } from './SubjectIcon';
import { Lock, ChevronLeft, BookOpen, ClipboardList, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useSubjectControls } from '../context/SubjectControlsContext';

interface SubjectCardProps {
  subject: Subject;
  lessons?: Lesson[];
  lessonsCount?: number;
  homeworksCount?: number;
  bookletsCount?: number;
  isSelected?: boolean;
  onSelect?: (subject: Subject) => void;
  onSelectSubject?: (subject: Subject) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  lessons = [],
  lessonsCount,
  homeworksCount = 0,
  bookletsCount = 0,
  isSelected = false,
  onSelect,
  onSelectSubject
}) => {
  const [showSoonNotice, setShowSoonNotice] = useState(false);
  const { isSubjectPaused } = useSubjectControls();

  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const subjectLessons = safeLessons.filter((l) => l.subjectId === subject?.id);
  const totalCount = lessonsCount !== undefined ? lessonsCount : subjectLessons.length;
  const isComingSoon = !!subject?.isComingSoon || isSubjectPaused(subject?.id);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isComingSoon) {
      e.preventDefault();
      e.stopPropagation();
      setShowSoonNotice(true);
      setTimeout(() => setShowSoonNotice(false), 2000);
      return;
    }
    if (onSelect) {
      onSelect(subject);
    } else if (onSelectSubject) {
      onSelectSubject(subject);
    }
  };

  return (
    <motion.div
      whileHover={isComingSoon ? {} : { y: -2, scale: 1.005 }}
      whileTap={isComingSoon ? {} : { scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      onClick={handleCardClick}
      role={isComingSoon ? 'status' : 'button'}
      aria-disabled={isComingSoon}
      className={`group w-full rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-4.5 transition-all duration-200 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right relative overflow-hidden ${
        isComingSoon
          ? 'cursor-not-allowed opacity-90 select-none bg-slate-50/90 border-slate-200 hover:border-amber-200'
          : `${subject?.lightBg || 'bg-[#EFF6FF]'} ${subject?.borderColor || 'border-[#DBEAFE]'} cursor-pointer hover:shadow-md active:scale-[0.99]`
      } ${isSelected ? 'ring-2 ring-[#3B82F6] ring-offset-2' : ''}`}
    >
      {/* Toast Notice when clicked if coming soon */}
      {showSoonNotice && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 z-10 animate-fade-in transition-all">
          <span className="text-white text-xs md:text-sm font-bold text-center px-2 py-1">
            المادة قادمة قريباً ⏳
          </span>
        </div>
      )}

      {/* Right Side: Icon & Subject Details */}
      <div className="flex items-center gap-3 md:gap-3.5 min-w-0">
        {/* Subject Emoji / Icon in circular small container */}
        <div
          className={`w-9 h-9 md:w-10 md:h-10 ${
            isComingSoon ? 'bg-amber-500' : (subject?.badgeBg || 'bg-[#3B82F6]')
          } rounded-full flex items-center justify-center text-white text-base md:text-lg shadow-xs shrink-0`}
        >
          {subject?.emoji ? (
            <span>{subject.emoji}</span>
          ) : (
            <SubjectIcon name={subject?.icon || 'book'} className="w-5 h-5 md:w-5 md:h-5" />
          )}
        </div>

        {/* Title and Subject Name */}
        <div className="min-w-0 space-y-0.5 md:space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`font-black text-base sm:text-lg md:text-xl leading-tight truncate ${
                isComingSoon ? 'text-slate-700' : (subject?.titleColor || 'text-[#1E3A8A]')
              }`}
            >
              {subject?.name}
            </h3>
          </div>
        </div>
      </div>

      {/* Left Side: Stats Badges (Lessons, Homeworks, Booklets) & Arrow */}
      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/40">
        {isComingSoon ? (
          <span className="text-[10px] md:text-xs px-2.5 md:px-3 py-1 rounded-xl font-black bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>قريباً</span>
          </span>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Lessons Count */}
            <span
              className="text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/70 shadow-2xs flex items-center gap-1 text-blue-600"
              title="عدد الدروس"
            >
              <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{totalCount} درس</span>
            </span>

            {/* Homeworks Count */}
            <span
              className="text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/70 shadow-2xs flex items-center gap-1 text-purple-600"
              title="عدد الواجبات"
            >
              <ClipboardList className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{homeworksCount} واجب</span>
            </span>

            {/* Booklets Count */}
            <span
              className="text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/70 shadow-2xs flex items-center gap-1 text-amber-600"
              title="عدد الملخصات"
            >
              <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{bookletsCount} ملخص</span>
            </span>

            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/70 group-hover:bg-white border border-slate-200/60 flex items-center justify-center transition shadow-2xs shrink-0 mr-0.5">
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition group-hover:-translate-x-0.5" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
