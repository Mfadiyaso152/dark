import React, { useState } from 'react';
import { Subject } from '../types';
import { SubjectIcon } from './SubjectIcon';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useSubjectControls } from '../context/SubjectControlsContext';

interface SubjectCardProps {
  subject: Subject;
  isSelected?: boolean;
  onSelect?: (subject: Subject) => void;
  onSelectSubject?: (subject: Subject) => void;
}

// Helper to get short and clean subject name
export const getShortSubjectName = (fullName: string): string => {
  if (!fullName) return '';
  // Remove course code/term suffix like " 1-2", " 1-1", " 1", " 2", etc.
  let cleaned = fullName.replace(/\s*\d+-\d+/g, '').replace(/\s+\d+$/g, '').trim();

  // Shorten specific long titles if needed
  if (cleaned.includes('التربية البدنية')) return 'التربية البدنية';
  if (cleaned.includes('المهارات الحياتية')) return 'المهارات الحياتية';
  if (cleaned.includes('الدراسات الاجتماعية')) return 'الدراسات الاجتماعية';
  if (cleaned.includes('التقنية الرقمية')) return 'التقنية الرقمية';
  if (cleaned.includes('اللغة الإنجليزية')) return 'اللغة الإنجليزية';

  return cleaned;
};

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  isSelected = false,
  onSelect,
  onSelectSubject
}) => {
  const [showSoonNotice, setShowSoonNotice] = useState(false);
  const { isSubjectPaused } = useSubjectControls();

  const isComingSoon = !!subject?.isComingSoon || isSubjectPaused(subject?.id);
  const displayName = getShortSubjectName(subject?.name || '');

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
      whileHover={isComingSoon ? {} : { y: -2, scale: 1.01 }}
      whileTap={isComingSoon ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      onClick={handleCardClick}
      role={isComingSoon ? 'status' : 'button'}
      aria-disabled={isComingSoon}
      className={`group w-full h-[76px] sm:h-[84px] md:h-[90px] rounded-2xl md:rounded-3xl p-2.5 sm:p-3.5 transition-all duration-200 border flex items-center justify-between gap-2 text-right relative overflow-hidden select-none bg-white shadow-2xs hover:shadow-md ${
        isComingSoon
          ? 'cursor-not-allowed opacity-75 border-slate-200 bg-slate-50/70'
          : 'border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/50 cursor-pointer'
      } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
    >
      {/* Toast Notice when clicked if coming soon */}
      {showSoonNotice && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xs flex items-center justify-center p-2 z-10 animate-fade-in transition-all">
          <span className="text-white text-xs sm:text-sm font-bold text-center px-2 py-1">
            المادة قادمة قريباً ⏳
          </span>
        </div>
      )}

      {/* Subject Icon & Short Name (No Arrow) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Subject Emoji / Icon */}
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 ${
            isComingSoon
              ? 'bg-slate-200 text-slate-600'
              : (subject?.badgeBg || 'bg-blue-600 text-white')
          } rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-lg md:text-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform`}
        >
          {subject?.emoji ? (
            <span>{subject.emoji}</span>
          ) : (
            <SubjectIcon name={subject?.icon || 'book'} className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          )}
        </div>

        {/* Short Subject Name */}
        <div className="min-w-0 flex-1">
          <h3
            title={subject?.name}
            className={`font-black text-xs sm:text-sm md:text-base leading-tight truncate text-slate-900 group-hover:text-blue-600 transition-colors`}
          >
            {displayName}
          </h3>
        </div>
      </div>

      {/* Lock Indicator only if coming soon */}
      {isComingSoon && (
        <div className="shrink-0">
          <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-lg font-black bg-amber-100/90 text-amber-800 border border-amber-200/80 flex items-center gap-1">
            <Lock className="w-3 h-3" />
          </span>
        </div>
      )}
    </motion.div>
  );
};
