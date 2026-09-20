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

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="relative flex items-center">
        <select
          value={selectedClass}
          onChange={(e) => onSelectClass(e.target.value)}
          className={`appearance-none px-3.5 py-2.5 sm:px-4 sm:py-2.5 pr-9 pl-8 rounded-2xl border transition-all font-black text-xs sm:text-sm cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500/30 glass-subject-vessel ${
            selectedClass !== 'all'
              ? 'text-slate-950 font-black border-white ring-1 ring-sky-500/20'
              : 'text-slate-800 border-white/85 hover:bg-white/60'
          }`}
          title={t('choose_class', 'اختر الفصل')}
          aria-label={t('choose_class', 'اختر الفصل')}
        >
          <option value="all" className="bg-white text-slate-900 font-bold py-2">
            {t('all_classes', 'جميع الفصول')}
          </option>
          {AVAILABLE_CLASSES.map((cls) => (
            <option key={cls} value={cls} className="bg-white text-slate-900 font-bold py-2">
              {classDisplayLabels[cls] || `فصل ${cls}`}
            </option>
          ))}
        </select>

        {/* Icons inside the select button */}
        <div className={`absolute ${isRTL ? 'right-3' : 'left-3'} pointer-events-none flex items-center`}>
          <Filter className={`w-3.5 h-3.5 ${selectedClass !== 'all' ? 'text-sky-600' : 'text-slate-500'}`} />
        </div>
        <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} pointer-events-none flex items-center`}>
          <ChevronDown className={`w-3.5 h-3.5 ${selectedClass !== 'all' ? 'text-slate-700' : 'text-slate-500'}`} />
        </div>
      </div>
    </div>
  );
};

