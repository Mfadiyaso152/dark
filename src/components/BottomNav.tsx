import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, Sparkles, GraduationCap, ClipboardCheck, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type TabType = 'home' | 'homeworks' | 'qudurat' | 'students' | 'admin';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, setIsAuthModalOpen } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNavToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleHomeworksClick = () => {
    if (!user) {
      showNavToast('يجب تسجيل الدخول أولاً للوصول للواجبات 🔒');
      setIsAuthModalOpen(true);
      return;
    }
    onTabChange('homeworks');
  };

  const handleQuduratClick = () => {
    onTabChange('qudurat');
  };

  // 1. Super Admin (المشرف الأساسي)
  const isSuper = Boolean(
    isSuperAdmin ||
    user?.email?.toLowerCase() === 'mfb.15.f@gmail.com' ||
    user?.jobTitle === 'المشرف الأساسي'
  );

  // 2. Supervisors / Assistant Admins (المشرف الرئيسي والمشرفين المساعدين فقط)
  const isSupervisorUser = Boolean(
    isSuper ||
    isAssistantAdmin ||
    user?.jobTitle === 'مشرف مساعد' ||
    user?.role === 'supervisor' ||
    user?.email?.toLowerCase() === 'kalshrby90@gmail.com'
  );

  // 3. Teachers (المعلمون)
  const isTeacher = Boolean(
    user &&
    !isSupervisorUser &&
    (user.role === 'teacher' || (user.jobTitle && user.jobTitle !== 'طالب' && !user.jobTitle.includes('مشرف')))
  );

  // Show Students for Teachers and Supervisors (المعلمون والمشرفون)
  const showStudents = Boolean(isTeacher || isSupervisorUser);

  return (
    <div className="fixed bottom-3 sm:bottom-5 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 w-auto sm:w-[380px] md:w-[410px] max-w-lg transition-all font-['IBM_Plex_Sans_Arabic',sans-serif]">
      {/* Toast notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="fixed bottom-20 md:bottom-22 left-1/2 -translate-x-1/2 bg-[#1C1917] text-[#FAF8F5] text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 z-50 backdrop-blur-xl font-bold whitespace-nowrap border border-amber-500/30 ring-1 ring-white/10"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Luxury Floating Architectural Dock */}
      <div className="h-15 sm:h-16 px-4 sm:px-6 rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-2xl border border-[#E5DFD5] shadow-[0_16px_36px_-8px_rgba(28,25,23,0.12)] flex items-center justify-around gap-2 sm:gap-4">
        {/* 1. Home (الرئيسية) */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onTabChange('home')}
          title="الرئيسية"
          aria-label="الرئيسية"
          className={`relative p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition flex items-center justify-center cursor-pointer select-none ${
            activeTab === 'home'
              ? 'text-[#FAF8F5] bg-[#1C1917] shadow-md font-bold'
              : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3EF]'
          }`}
        >
          <Home className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          {activeTab === 'home' && (
            <motion.div
              layoutId="bottom-nav-active"
              className="absolute -bottom-1 w-1.5 h-1.5 bg-amber-400 rounded-full"
            />
          )}
        </motion.button>

        {/* 2. Homeworks (الواجبات) */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleHomeworksClick}
          type="button"
          title="الواجبات"
          aria-label="الواجبات"
          className={`relative p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition flex items-center justify-center cursor-pointer select-none ${
            activeTab === 'homeworks'
              ? 'text-[#FAF8F5] bg-[#1C1917] shadow-md font-bold'
              : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3EF]'
          }`}
        >
          <ClipboardCheck className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          {activeTab === 'homeworks' && (
            <motion.div
              layoutId="bottom-nav-active"
              className="absolute -bottom-1 w-1.5 h-1.5 bg-amber-400 rounded-full"
            />
          )}
        </motion.button>

        {/* 3. Qudurat */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleQuduratClick}
          type="button"
          title="القدرات"
          aria-label="القدرات"
          className={`relative p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition flex items-center justify-center cursor-pointer select-none ${
            activeTab === 'qudurat'
              ? 'bg-indigo-100 text-indigo-900 shadow-xs'
              : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3EF]'
          }`}
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-indigo-600" />
          </div>
          {activeTab === 'qudurat' && (
            <div className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
          )}
        </motion.button>

        {/* 4. Students (الطلاب) - ONLY FOR TEACHERS (المعلمين فقط) */}
        {showStudents && (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onTabChange('students')}
            title="الطلاب والواجبات"
            aria-label="الطلاب"
            className={`relative p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition flex items-center justify-center cursor-pointer select-none ${
              activeTab === 'students'
                ? 'text-[#FAF8F5] bg-[#1C1917] shadow-md font-bold'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3EF]'
            }`}
          >
            <GraduationCap className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            {activeTab === 'students' && (
              <motion.div
                layoutId="bottom-nav-active"
                className="absolute -bottom-1 w-1.5 h-1.5 bg-amber-400 rounded-full"
              />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
};
