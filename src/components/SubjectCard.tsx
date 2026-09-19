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
      whileHover={isComingSoon ? {} : { y: -3, scale: 1.015 }}
      whileTap={isComingSoon ? {} : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      onClick={handleCardClick}
      role={isComingSoon ? 'status' : 'button'}
      aria-disabled={isComingSoon}
      className={`group w-full h-[84px] sm:h-[92px] md:h-[98px] rounded-2xl md:rounded-3xl p-3.5 sm:p-4.5 transition-all duration-300 border flex items-center justify-between gap-3 text-right relative overflow-hidden select-none bg-white/95 backdrop-blur-xs shadow-[0_2px_12px_-3px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.1)] active:shadow-xs ${
        isComingSoon
          ? 'cursor-not-allowed opacity-65 border-slate-200 bg-slate-50/80'
          : 'border-slate-200/90 hover:border-slate-300 hover:bg-white cursor-pointer'
      } ${isSelected ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
    >
      {/* Top subtle highlight */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-sky-500/20 to-transparent group-hover:via-sky-500/60 transition-all duration-500" />

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
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Subject Emoji / Icon in bespoke vessel */}
        <div
          className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 ${
            isComingSoon
              ? 'bg-slate-100 text-slate-400'
              : 'bg-slate-900 text-white'
          } rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl md:text-2xl shadow-2xs shrink-0 group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5`}
        >
          {subject?.emoji ? (
            <span>{subject.emoji}</span>
          ) : (
            <SubjectIcon name={subject?.icon || 'book'} className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />
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
        <div className="shrink-0">
          <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-xl font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-600" />
          </span>
        </div>
      )}
    </motion.div>
  );
};
