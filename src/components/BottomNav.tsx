import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, Sparkles, GraduationCap, ClipboardCheck, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type TabType = 'home' | 'homeworks' | 'qudurat' | 'students' | 'users';

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
    if (!user) {
      showNavToast('يجب تسجيل الدخول أولاً للوصول للقدرات 🔒');
      setIsAuthModalOpen(true);
      return;
    }
    showNavToast('قسم القدرات قريباً ⏳');
  };

  // 1. Supervisors & Assistant Supervisors (المدير والمشرف المساعد فقط)
  const isSupervisorOrAssistant = Boolean(
    isSuperAdmin ||
    isAssistantAdmin ||
    user?.jobTitle?.includes('مشرف') ||
    user?.email?.toLowerCase() === 'mfb.15.f@gmail.com' ||
    user?.email?.toLowerCase() === 'kalshrby90@gmail.com'
  );

  // 2. Teachers ONLY (المعلمين فقط، ولا يظهر للمشرفين)
  const isTeacherOnly = Boolean(
    user &&
    !isSupervisorOrAssistant &&
    (user.role === 'teacher' || (user.jobTitle && user.jobTitle !== 'طالب'))
  );

  return (
    <div className="fixed bottom-3 sm:bottom-5 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 w-auto sm:w-[420px] md:w-[460px] max-w-lg transition-all font-['Tajawal',sans-serif]">
      {/* Toast notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="fixed bottom-20 md:bottom-22 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 z-50 backdrop-blur-xl font-bold whitespace-nowrap border border-white/15"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cylindrical Floating Glass Navigation Bar (Icons Only) */}
      <div className="h-14 sm:h-16 px-3 sm:px-6 rounded-full bg-white/55 backdrop-blur-2xl backdrop-saturate-200 border border-white/80 shadow-[0_8px_32px_rgba(15,23,42,0.12)] flex items-center justify-around gap-1 sm:gap-2">
        {/* 1. Home (الرئيسية) */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.88 }}
          onClick={() => onTabChange('home')}
          title="الرئيسية"
          aria-label="الرئيسية"
          className={`relative p-2.5 sm:p-3 rounded-full transition flex items-center justify-center cursor-pointer select-none ${
            activeTab === 'home'
              ? 'text-blue-600 bg-blue-50/80 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Home className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          {activeTab === 'home' && (
            <motion.div
              layoutId="bottom-nav-active"
              className="absolute -bottom-1 w-2 h-2 bg-blue-600 rounded-full"
            />
          )}
        </motion.button>

        {/* 2. Homeworks (الواجبات) */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.88 }}
          onClick={handleHomeworksClick}
          type="button"
          title="الواجبات"
          aria-label="الواجبات"
          className={`relative p-2.5 sm:p-3 rounded-full transition flex items-center justify-center cursor-pointer select-none ${
            activeTab === 'homeworks'
              ? 'text-purple-600 bg-purple-50/80 shadow-2xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <ClipboardCheck className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          {activeTab === 'homeworks' && (
            <motion.div
              layoutId="bottom-nav-active"
              className="absolute -bottom-1 w-2 h-2 bg-purple-600 rounded-full"
            />
          )}
        </motion.button>

        {/* 3. Qudurat (القدرات - إشعار قريباً) */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.88 }}
          onClick={handleQuduratClick}
          type="button"
          title="القدرات (قريباً)"
          aria-label="القدرات"
          className="relative p-2.5 sm:p-3 rounded-full transition flex items-center justify-center cursor-pointer select-none text-slate-500 hover:text-slate-900 hover:bg-white/60"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-amber-500" />
            <span className="absolute -top-1 -right-2 bg-amber-400 text-amber-950 text-[7px] font-black px-1 rounded-full leading-tight">
              قريباً
            </span>
          </div>
        </motion.button>

        {/* 4. Students (الطلاب) - ONLY FOR TEACHERS (المعلمين فقط) */}
        {isTeacherOnly && (
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => onTabChange('students')}
            title="الطلاب والواجبات"
            aria-label="الطلاب"
            className={`relative p-2.5 sm:p-3 rounded-full transition flex items-center justify-center cursor-pointer select-none ${
              activeTab === 'students'
                ? 'text-emerald-600 bg-emerald-50/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <GraduationCap className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            {activeTab === 'students' && (
              <motion.div
                layoutId="bottom-nav-active"
                className="absolute -bottom-1 w-2 h-2 bg-emerald-600 rounded-full"
              />
            )}
          </motion.button>
        )}

        {/* 5. User Management (إدارة المستخدمين) - ONLY FOR SUPERVISORS & ASSISTANT ADMIN */}
        {isSupervisorOrAssistant && (
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => onTabChange('users')}
            title="إدارة المستخدمين"
            aria-label="إدارة المستخدمين"
            className={`relative p-2.5 sm:p-3 rounded-full transition flex items-center justify-center cursor-pointer select-none ${
              activeTab === 'users'
                ? 'text-indigo-600 bg-indigo-50/80 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            {activeTab === 'users' && (
              <motion.div
                layoutId="bottom-nav-active"
                className="absolute -bottom-1 w-2 h-2 bg-indigo-600 rounded-full"
              />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
};
