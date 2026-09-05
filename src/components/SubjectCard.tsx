import React from 'react';
import { Subject, Lesson } from '../types';
import { SubjectIcon } from './SubjectIcon';

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
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const subjectLessons = safeLessons.filter((l) => l.subjectId === subject?.id);
  const totalCount = lessonsCount !== undefined ? lessonsCount : subjectLessons.length;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(subject);
    } else if (onSelectSubject) {
      onSelectSubject(subject);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group cursor-pointer rounded-3xl p-4 transition-all duration-200 border flex flex-col justify-between text-right relative overflow-hidden ${
        subject?.lightBg || 'bg-[#EFF6FF]'
      } ${subject?.borderColor || 'border-[#DBEAFE]'} hover:shadow-md ${
        isSelected ? 'ring-2 ring-[#3B82F6] ring-offset-2' : ''
      }`}
    >
      {/* Geometric Icon Badge */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 ${
            subject?.badgeBg || 'bg-[#3B82F6]'
          } rounded-2xl flex items-center justify-center text-white text-lg shadow-xs shrink-0`}
        >
          {subject?.emoji ? (
            <span>{subject.emoji}</span>
          ) : (
            <SubjectIcon name={subject?.icon || 'book'} className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Title and Count */}
      <div className="space-y-1">
        <h3
          className={`font-bold text-sm sm:text-base leading-tight ${
            subject?.titleColor || 'text-[#1E3A8A]'
          }`}
        >
          {subject?.name}
        </h3>
        <span
          className={`text-[11px] font-semibold block ${
            subject?.countColor || 'text-[#60A5FA]'
          }`}
        >
          {totalCount} درس
        </span>
      </div>
    </div>
  );
};
