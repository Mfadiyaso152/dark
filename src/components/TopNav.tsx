import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useLanguage } from '../context/LanguageContext';
import { Home, Sparkles, GraduationCap, ClipboardCheck, Bell, LogIn, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type TabType = 'home' | 'homeworks' | 'qudurat' | 'students' | 'admin';

interface TopNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, canAddContent, setIsAuthModalOpen } = useAuth();
  const { openNotificationsModal, unreadCount } = useNotifications();
  const { language, toggleLanguage, t } = useLanguage();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNavToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  const handleHomeworksClick = () => {
    if (!user) {
      showNavToast(t('login_required_homeworks', 'يجب تسجيل الدخول أولاً للوصول للواجبات 🔒'));
      setIsAuthModalOpen(true);
      return;
    }
    onTabChange('homeworks');
  };

  const handleQuduratClick = () => {
    onTabChange('qudurat');
  };

  // Determine user roles
  const isSuper = Boolean(
    isSuperAdmin ||
    user?.email?.toLowerCase() === 'mfb.15.f@gmail.com' ||
    user?.jobTitle === 'المشرف الأساسي'
  );

  const isSupervisorUser = Boolean(
    isSuper ||
    isAssistantAdmin ||
    user?.jobTitle === 'مشرف مساعد' ||
    user?.role === 'supervisor' ||
    user?.email?.toLowerCase() === 'kalshrby90@gmail.com'
  );

  const isTeacher = Boolean(
    user &&
    !isSupervisorUser &&
    (user.role === 'teacher' || (user.jobTitle && user.jobTitle !== 'طالب' && !user.jobTitle.includes('مشرف')))
  );

  const showStudents = Boolean(isTeacher || isSupervisorUser);

  return (
    <>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-60 bg-slate-900/95 text-white text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 backdrop-blur-2xl font-bold border border-white/20 ring-1 ring-black/10"
          >
            <Clock className="w-4 h-4 text-sky-400 shrink-0 animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Conical Beveled Glass Top Navigation Bar */}
      <header className="sticky top-2 sm:top-4 z-40 px-2 sm:px-4 max-w-5xl mx-auto w-full font-['IBM_Plex_Sans_Arabic',sans-serif]">
        <nav
          className="glass-conic-bar relative w-full h-14 sm:h-16 px-3 sm:px-5 rounded-full flex items-center justify-between transition-all duration-300"
          aria-label="التنقل الرئيسي"
        >
          {/* Glass Specular Reflection Highlight Line */}
          <div className="glass-reflection-sheen" />

          {/* Right side: Notification Bell */}
          <div className="flex items-center justify-start shrink-0 z-10">
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={openNotificationsModal}
              className="relative p-2 sm:p-2.5 rounded-full bg-white/70 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/70 shadow-2xs transition flex items-center justify-center cursor-pointer"
              title={t('notifications', 'الإشعارات')}
              aria-label={t('notifications', 'الإشعارات')}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[17px] h-4 px-1 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                  {unreadCount > 9 ? '+9' : unreadCount}
                </span>
              )}
            </motion.button>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-1.5 p-1 rounded-full bg-slate-900/[0.03] border border-slate-900/[0.04]">
            {/* 1. Home */}
            <button
              onClick={() => onTabChange('home')}
              title={t('home', 'الرئيسية')}
              aria-label={t('home', 'الرئيسية')}
              className={`relative px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'home'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {activeTab === 'home' && (
                <motion.div
                  layoutId="top-nav-active-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-slate-900 rounded-full shadow-sm"
                />
              )}
              <Home className="w-4 h-4 relative z-10" />
              <span className="hidden sm:inline relative z-10">{t('home', 'الرئيسية')}</span>
            </button>

            {/* 2. Homeworks */}
            <button
              onClick={handleHomeworksClick}
              title={t('homeworks', 'الواجبات')}
              aria-label={t('homeworks', 'الواجبات')}
              className={`relative px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'homeworks'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {activeTab === 'homeworks' && (
                <motion.div
                  layoutId="top-nav-active-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-slate-900 rounded-full shadow-sm"
                />
              )}
              <ClipboardCheck className="w-4 h-4 relative z-10" />
              <span className="hidden sm:inline relative z-10">{t('homeworks', 'الواجبات')}</span>
            </button>

            {/* 3. Qudurat */}
            <button
              onClick={handleQuduratClick}
              title={t('qudurat', 'القدرات')}
              aria-label={t('qudurat', 'القدرات')}
              className={`relative px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${
                activeTab === 'qudurat'
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {activeTab === 'qudurat' && (
                <motion.div
                  layoutId="top-nav-active-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-slate-900 rounded-full shadow-sm"
                />
              )}
              <Sparkles className="w-4 h-4 text-indigo-600 relative z-10" />
              <span className="hidden sm:inline relative z-10">{t('qudurat', 'القدرات')}</span>
            </button>

            {/* 4. Students (Teachers/Supervisors only) */}
            {showStudents && (
              <button
                onClick={() => onTabChange('students')}
                title={t('students', 'الطلاب')}
                aria-label={t('students', 'الطلاب')}
                className={`relative px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${
                  activeTab === 'students'
                    ? 'text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {activeTab === 'students' && (
                  <motion.div
                    layoutId="top-nav-active-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute inset-0 bg-slate-900 rounded-full shadow-sm"
                  />
                )}
                <GraduationCap className="w-4 h-4 relative z-10" />
                <span className="hidden sm:inline relative z-10">{t('students', 'الطلاب')}</span>
              </button>
            )}
          </div>

          {/* Left side: Auth / Profile */}
          <div className="flex items-center justify-end shrink-0 z-10">
            {user ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAuthModalOpen(true)}
                className="relative p-0.5 rounded-full border border-slate-200/80 hover:border-slate-400 bg-white shadow-2xs transition cursor-pointer"
                title={`${t('profile', 'الملف الشخصي')}: ${user.name}`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-slate-100">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-700">
                      {user.name ? user.name.charAt(0) : '👤'}
                    </span>
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-1.8 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-white/20"
                title={t('login', 'تسجيل الدخول')}
              >
                <LogIn className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">{t('login', 'دخول')}</span>
              </motion.button>
            )}
          </div>
        </nav>
      </header>
    </>
  );
};
