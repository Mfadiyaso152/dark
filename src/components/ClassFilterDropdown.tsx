import React from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { AVAILABLE_CLASSES } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ClassFilterDropdownProps {
  selectedClass: string;
  onSelectClass: (cls: string) => void;
  className?: string;
  compact?: boolean;
}

export const ClassFilterDropdown: React.FC<ClassFilterDropdownProps> = ({
  selectedClass = 'all',
  onSelectClass,
  className = ''
}) => {
  const { t, isRTL } = useLanguage();

  const classDisplayLabels: Record<string, string> = {
    all: t('all_classes', 'جميع الفصول'),
    '1/1': isRTL ? 'فصل ١/١' : 'Class 1/1',
    '1/2': isRTL ? 'فصل ١/٢' : 'Class 1/2',
    '1/3': isRTL ? 'فصل ١/٣' : 'Class 1/3',
    '1/4': isRTL ? 'فصل ١/٤' : 'Class 1/4',
    '1/5': isRTL ? 'فصل ١/٥' : 'Class 1/5',
    '1/6': isRTL ? 'فصل ١/٦' : 'Class 1/6',
    '1/7': isRTL ? 'فصل ١/٧' : 'Class 1/7'
  };

  const activeLabel = classDisplayLabels[selectedClass] || t('all_classes', 'جميع الفصول');

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Visual Button */}
      <div
        className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl border transition-all flex items-center gap-2 shadow-2xs font-bold text-xs sm:text-sm select-none pointer-events-none ${
          selectedClass !== 'all'
            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
            : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50'
        }`}
      >
        <Filter className={`w-3.5 h-3.5 ${selectedClass !== 'all' ? 'text-sky-400' : 'text-slate-400'}`} />
        <span>{activeLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 ${
            selectedClass !== 'all' ? 'text-slate-300' : 'text-slate-400'
          }`}
        />
      </div>

      {/* Native Select Overlay for iPhone / Device Picker */}
      <select
        value={selectedClass}
        onChange={(e) => onSelectClass(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 text-base"
        title={t('choose_class', 'اختر الفصل')}
        aria-label={t('choose_class', 'اختر الفصل')}
      >
        <option value="all">{t('all_classes', 'جميع الفصول')}</option>
        {AVAILABLE_CLASSES.map((cls) => (
          <option key={cls} value={cls}>
            {classDisplayLabels[cls] || `فصل ${cls}`}
          </option>
        ))}
      </select>
    </div>
  );
};

