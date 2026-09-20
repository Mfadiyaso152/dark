import React, { useState } from 'react';
import { Subject } from '../types';
import { SubjectIcon } from './SubjectIcon';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useSubjectControls } from '../context/SubjectControlsContext';
import { triggerHaptic } from '../utils/haptics';

interface SubjectCardProps {
  subject: Subject;
  isSelected?: boolean;
  onSelect?: (subject: Subject) => void;
  onSelectSubject?: (subject: Subject) => void;
}

// Helper to get short and clean subject name
export const getShortSubjectName = (fullName: string): string => {
  if (!fullName) return '';
  if (fullName.toLowerCase().includes('mega goal')) return 'Mega Goal 1';
  if (fullName.includes('اللغة الإنجليزية') || fullName.includes('إنجليزي')) return 'Mega Goal 1';
  if (fullName.includes('قرآن') || fullName.includes('تفسير')) return 'القرآن الكريم والتفسير';

  // Remove course code/term suffix like " 1-2", " 1-1", " 1", " 2", etc.
  let cleaned = fullName.replace(/\s*\d+-\d+/g, '').replace(/\s+\d+$/g, '').trim();

  // Shorten specific long titles if needed
  if (cleaned.includes('التربية البدنية')) return 'التربية البدنية';
  if (cleaned.includes('المهارات الحياتية')) return 'المهارات الحياتية';
  if (cleaned.includes('الدراسات الاجتماعية')) return 'الدراسات الاجتماعية';
  if (cleaned.includes('التقنية الرقمية')) return 'التقنية الرقمية';

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
      triggerHaptic('warning');
      setShowSoonNotice(true);
      setTimeout(() => setShowSoonNotice(false), 2000);
      return;
    }
    triggerHaptic('medium');
    if (onSelect) {
      onSelect(subject);
    } else if (onSelectSubject) {
      onSelectSubject(subject);
    }
  };

  return (
    <motion.div
      whileHover={isComingSoon ? {} : { y: -3, scale: 1.025 }}
      whileTap={isComingSoon ? {} : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 26, mass: 0.6 }}
      onClick={handleCardClick}
      role={isComingSoon ? 'status' : 'button'}
      aria-disabled={isComingSoon}
      className={`group w-full h-[84px] sm:h-[92px] md:h-[98px] rounded-full sm:rounded-full p-3 sm:p-4 px-4 sm:px-5 transition-all duration-300 flex items-center justify-between gap-3 text-right relative overflow-hidden select-none touch-manipulation cursor-pointer ${
        isComingSoon
          ? 'cursor-not-allowed opacity-65 border border-slate-200/70 bg-slate-50/70 backdrop-blur-md'
          : 'glass-subject-vessel'
      } ${isSelected ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
    >
      {/* Top subtle highlight reflecting the top navigation bar specular highlight */}
      <div className="absolute top-0 inset-x-8 h-[1.5px] bg-gradient-to-r from-transparent via-white/90 to-transparent group-hover:via-sky-300 transition-all duration-500 pointer-events-none" />

      {/* Internal ambient diagonal glass refraction sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none group-hover:opacity-100 opacity-60 transition-opacity duration-300" />

      {/* Toast Notice when clicked if coming soon */}
      {showSoonNotice && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xs flex items-center justify-center p-2 z-10 animate-fade-in transition-all">
          <span className="text-white text-xs sm:text-sm font-bold font-['Alexandria',sans-serif] text-center px-2 py-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            المادة قادمة قريباً
          </span>
        </div>
      )}

      {/* Subject Icon & Short Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
        {/* Subject Emoji / Icon in cylindrical transparent liquid glass vessel identical to top nav aesthetics */}
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 ${
            isComingSoon
              ? 'bg-slate-100/50 text-slate-400 border border-slate-200/50'
              : 'bg-white/40 group-hover:bg-white/65 text-slate-900 border border-white/90 shadow-[0_4px_18px_-2px_rgba(15,23,42,0.08),inset_0_1.5px_2px_0_rgba(255,255,255,1),inset_0_-1px_1px_0_rgba(15,23,42,0.04)] backdrop-blur-2xl'
          } rounded-full flex items-center justify-center text-xl sm:text-2xl shrink-0 group-hover:scale-105 transition-all duration-300 relative overflow-hidden`}
        >
          {/* Subtle internal glass specular reflection highlight */}
          {!isComingSoon && (
            <div className="absolute top-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none opacity-90" />
          )}

          {subject?.emoji ? (
            <span className="leading-none drop-shadow-2xs relative z-10">{subject.emoji}</span>
          ) : (
            <SubjectIcon name={subject?.icon || 'book'} className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 text-sky-600 drop-shadow-2xs relative z-10" />
          )}
        </div>

        {/* Short Subject Name */}
        <div className="min-w-0 flex-1">
          <h3
            title={subject?.name}
            className="font-bold font-['Alexandria',sans-serif] text-xs sm:text-sm md:text-base leading-tight truncate text-slate-900 group-hover:text-sky-700 transition-colors"
          >
            {displayName}
          </h3>
        </div>
      </div>

      {/* Lock Indicator only if coming soon */}
      {isComingSoon && (
        <div className="shrink-0 relative z-10">
          <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-xl font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-600" />
          </span>
        </div>
      )}
    </motion.div>
  );
};
