import React, { useState } from 'react';
import { Subject, Lesson } from '../types';
import { SubjectIcon } from './SubjectIcon';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface SubjectCardProps {
  subject: Subject;
  lessons?: Lesson[];
  lessonsCount?: number;
  isSelected?: boolean;
  onSelect?: (subject: Subject) => void;
  onSelectSubject?: (subject: Subject) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  lessons = [],
  lessonsCount,
  isSelected = false,
  onSelect,
  onSelectSubject
}) => {
  const [showSoonNotice, setShowSoonNotice] = useState(false);
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const subjectLessons = safeLessons.filter((l) => l.subjectId === subject?.id);
  const totalCount = lessonsCount !== undefined ? lessonsCount : subjectLessons.length;
  const isComingSoon = !!subject?.isComingSoon;

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
      whileHover={isComingSoon ? {} : { y: -4, scale: 1.01 }}
      whileTap={isComingSoon ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      onClick={handleCardClick}
      role={isComingSoon ? 'status' : 'button'}
      aria-disabled={isComingSoon}
      className={`group rounded-3xl p-4 md:p-5 transition-all duration-200 border flex flex-col justify-between text-right relative overflow-hidden ${
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

      {/* Geometric Icon Badge */}
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div
          className={`w-10 h-10 md:w-12 md:h-12 ${
            isComingSoon ? 'bg-amber-500' : (subject?.badgeBg || 'bg-[#3B82F6]')
          } rounded-2xl flex items-center justify-center text-white text-lg md:text-xl shadow-xs shrink-0`}
        >
          {subject?.emoji ? (
            <span>{subject.emoji}</span>
          ) : (
            <SubjectIcon name={subject?.icon || 'book'} className="w-5 h-5 md:w-6 md:h-6" />
          )}
        </div>

        {isComingSoon && (
          <span className="text-[10px] md:text-xs px-2 md:px-2.5 py-0.5 rounded-full font-black bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 md:w-3 md:h-3" />
            <span>قريباً</span>
          </span>
        )}
      </div>

      {/* Title and Count */}
      <div className="space-y-1 md:space-y-1.5">
        <h3
          className={`font-bold text-sm sm:text-base md:text-lg leading-tight ${
            isComingSoon ? 'text-slate-700' : (subject?.titleColor || 'text-[#1E3A8A]')
          }`}
        >
          {subject?.name}
        </h3>
        {isComingSoon ? (
          <span className="text-[11px] md:text-xs font-bold text-amber-600 block">
            غير متاحة حالياً
          </span>
        ) : (
          <span
            className={`text-[11px] md:text-xs font-semibold block ${
              subject?.countColor || 'text-[#60A5FA]'
            }`}
          >
            {totalCount} درس
          </span>
        )}
      </div>
    </motion.div>
  );
};
