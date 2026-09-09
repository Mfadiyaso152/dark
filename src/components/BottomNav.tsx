import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, Sparkles, GraduationCap, Users, ClipboardCheck, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type TabType = 'home' | 'subjects' | 'qudurat' | 'homeworks' | 'users';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  savedCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, canAddContent } = useAuth();
  const [showQuduratToast, setShowQuduratToast] = useState(false);

  const handleQuduratClick = () => {
    onTabChange('qudurat');
    setShowQuduratToast(true);
    setTimeout(() => {
      setShowQuduratToast(false);
    }, 2500);
  };

  // Appointed teachers and assistant supervisors (excluding Super Admin and regular students)
  const isAppointedTeacherOrAssistant =
    !isSuperAdmin &&
    (isAssistantAdmin ||
      canAddContent ||
      user?.role === 'supervisor' ||
      user?.role === 'teacher' ||
      (user?.jobTitle && user.jobTitle !== 'طالب'));

  return (
    <div className="fixed bottom-3 sm:bottom-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 w-auto sm:w-[500px] md:w-[600px] lg:w-[680px] bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl sm:rounded-[28px] shadow-xl shadow-slate-900/10 transition-all font-['Tajawal',sans-serif]">
      {/* Coming Soon Toast for Qudurat */}
      <AnimatePresence>
        {showQuduratToast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="fixed bottom-22 md:bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 border border-slate-700/80 backdrop-blur-md font-bold whitespace-nowrap shadow-indigo-950/40"
          >
            <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
            <span>قسم القدرات قريباً التفعيل ⏳</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Items Bar */}
      <div className="h-16 md:h-18 flex items-center justify-around px-2 sm:px-4 md:px-6">
        {/* Home */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center py-1 md:py-1.5 px-3 md:px-5 rounded-2xl transition cursor-pointer select-none active:scale-90 ${
            activeTab === 'home'
              ? 'text-[#3B82F6] font-black'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Home className="w-5 h-5 md:w-6 md:h-6" />
          <span className="text-[11px] md:text-xs mt-1">الرئيسية</span>
        </motion.button>

        {/* Qudurat (قريباً التفعيل) */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleQuduratClick}
          className={`flex flex-col items-center justify-center py-1 md:py-1.5 px-3 md:px-5 rounded-2xl transition relative cursor-pointer select-none active:scale-90 ${
            activeTab === 'qudurat'
              ? 'text-indigo-600 font-black'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
            <span className="absolute -top-1 -right-3.5 bg-amber-400 text-amber-950 text-[8px] md:text-[9px] font-black px-1 rounded-full">
              قريباً
            </span>
          </div>
          <span className="text-[11px] md:text-xs mt-1">القدرات</span>
        </motion.button>

        {/* Homeworks (الواجبات اليومية والمدرسية) */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onTabChange('homeworks')}
          type="button"
          className={`flex flex-col items-center justify-center py-1 md:py-1.5 px-3 md:px-5 rounded-2xl transition relative cursor-pointer select-none active:scale-90 ${
            activeTab === 'homeworks'
              ? 'text-purple-600 font-black'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6" />
          <span className="text-[11px] md:text-xs mt-1">الواجبات</span>
        </motion.button>

        {/* 1. Super Admin (الإدارة الأساسية): Shows "المستخدمين" with Users icon */}
        {isSuperAdmin && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onTabChange('users')}
            className={`flex flex-col items-center justify-center py-1 md:py-1.5 px-3 md:px-5 rounded-2xl transition cursor-pointer select-none active:scale-90 ${
              activeTab === 'users'
                ? 'text-[#7C3AED] font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Users className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[11px] md:text-xs mt-1">المستخدمين</span>
          </motion.button>
        )}

        {/* 2. Appointed Teachers & Assistant Supervisors: Shows "خدمة الطلاب" */}
        {isAppointedTeacherOrAssistant && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onTabChange('users')}
            className={`flex flex-col items-center justify-center py-1 md:py-1.5 px-3 md:px-5 rounded-2xl transition relative cursor-pointer select-none active:scale-90 ${
              activeTab === 'users'
                ? 'text-[#7C3AED] font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <GraduationCap className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[11px] md:text-xs mt-1">خدمة الطلاب</span>
          </motion.button>
        )}

        {/* 3. Regular Students: Shows "خدمة الطلاب" */}
        {!isSuperAdmin && !isAppointedTeacherOrAssistant && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onTabChange('users')}
            className={`flex flex-col items-center justify-center py-1 md:py-1.5 px-3 md:px-5 rounded-2xl transition relative cursor-pointer select-none active:scale-90 ${
              activeTab === 'users'
                ? 'text-[#7C3AED] font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <GraduationCap className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[11px] md:text-xs mt-1">خدمة الطلاب</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};

