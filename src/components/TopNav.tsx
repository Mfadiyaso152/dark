import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useLanguage } from '../context/LanguageContext';
import { Home, Sparkles, GraduationCap, ClipboardCheck, Bell, LogIn, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

export type TabType = 'home' | 'homeworks' | 'qudurat' | 'students' | 'admin';

interface TopNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, setIsAuthModalOpen } = useAuth();
  const { openNotificationsModal, unreadCount } = useNotifications();
  const { t } = useLanguage();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<TabType>(activeTab);
  const longPressTimerRef = useRef<any>(null);
  const isHoldingRef = useRef(false);

  useEffect(() => {
    lastActiveRef.current = activeTab;
  }, [activeTab]);

  const showNavToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2600);
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

  const handleTabSelect = (tab: TabType) => {
    if (tab === 'homeworks' && !user) {
      triggerHaptic('warning');
      showNavToast(t('login_required_homeworks', 'يجب تسجيل الدخول أولاً للوصول للواجبات 🔒'));
      setIsAuthModalOpen(true);
      return;
    }
    if (tab === lastActiveRef.current) return;
    lastActiveRef.current = tab;
    triggerHaptic('selection');
    onTabChange(tab);
  };

  const handleHomeworksClick = () => {
    if (!user) {
      triggerHaptic('warning');
      showNavToast(t('login_required_homeworks', 'يجب تسجيل الدخول أولاً للوصول للواجبات 🔒'));
      setIsAuthModalOpen(true);
      return;
    }
    handleTabSelect('homeworks');
  };

  // Advanced Touch & Drag Scrubbing across Tabs
  const getTabFromCoordinates = (clientX: number, clientY: number): TabType | null => {
    // 1. First check direct element hit
    const elements = document.elementsFromPoint ? document.elementsFromPoint(clientX, clientY) : [];
    for (const el of elements) {
      const tabBtn = el.closest('[data-nav-tab]') as HTMLElement | null;
      if (tabBtn) {
        return tabBtn.getAttribute('data-nav-tab') as TabType;
      }
    }

    // 2. Fallback: Horizontal closest-distance interpolation within container
    if (containerRef.current) {
      const buttons = Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-nav-tab]'));
      if (buttons.length === 0) return null;

      let closestTab: TabType | null = null;
      let minDistance = Infinity;

      buttons.forEach((btn) => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const dist = Math.abs(clientX - centerX);
        if (dist < minDistance) {
          minDistance = dist;
          closestTab = btn.getAttribute('data-nav-tab') as TabType;
        }
      });

      return closestTab;
    }

    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isHoldingRef.current = true;
    const { clientX, clientY } = e;

    // Start long-press gesture detection
    longPressTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        setIsScrubbing(true);
        triggerHaptic('medium');
      }
    }, 180);

    const targetTab = getTabFromCoordinates(clientX, clientY);
    if (targetTab) {
      handleTabSelect(targetTab);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isHoldingRef.current) return;
    setIsScrubbing(true);
    const targetTab = getTabFromCoordinates(e.clientX, e.clientY);
    if (targetTab && targetTab !== lastActiveRef.current) {
      handleTabSelect(targetTab);
    }
  };

  const handlePointerUp = () => {
    isHoldingRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    setIsScrubbing(false);
  };

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
          className="glass-conic-bar relative w-full h-15 sm:h-16 px-3 sm:px-5 rounded-full flex items-center justify-between transition-all duration-300"
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
              <Bell className="w-4.5 h-4.5 sm:w-4 sm:h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 min-w-[17px] h-4 px-1 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                  {unreadCount > 9 ? '+9' : unreadCount}
                </span>
              )}
            </motion.button>
          </div>

          {/* Center: Navigation Tabs directly integrated in Top Nav with Long-Press & Drag Scrubbing */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 sm:gap-2 transition-all duration-200 touch-none select-none"
          >
            {/* 1. Home */}
            <button
              data-nav-tab="home"
              onClick={() => handleTabSelect('home')}
              title={t('home', 'الرئيسية')}
              aria-label={t('home', 'الرئيسية')}
              className={`relative p-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                activeTab === 'home'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5'
              }`}
            >
              {activeTab === 'home' && (
                <motion.div
                  layoutId="top-nav-active-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-slate-900 rounded-full shadow-sm"
                />
              )}
              <Home className="w-6.5 h-6.5 sm:w-5 sm:h-5 relative z-10 shrink-0" />
              <span className="hidden sm:inline relative z-10">{t('home', 'الرئيسية')}</span>
            </button>

            {/* 2. Homeworks */}
            <button
              data-nav-tab="homeworks"
              onClick={handleHomeworksClick}
              title={t('homeworks', 'الواجبات')}
              aria-label={t('homeworks', 'الواجبات')}
              className={`relative p-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                activeTab === 'homeworks'
                  ? 'text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5'
              }`}
            >
              {activeTab === 'homeworks' && (
                <motion.div
                  layoutId="top-nav-active-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-slate-900 rounded-full shadow-sm"
                />
              )}
              <ClipboardCheck className="w-6.5 h-6.5 sm:w-5 sm:h-5 relative z-10 shrink-0" />
              <span className="hidden sm:inline relative z-10">{t('homeworks', 'الواجبات')}</span>
            </button>

            {/* 3. Qudurat */}
            <button
              data-nav-tab="qudurat"
              onClick={() => handleTabSelect('qudurat')}
              title={t('qudurat', 'القدرات')}
              aria-label={t('qudurat', 'القدرات')}
              className={`relative p-2 sm:px-3.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                activeTab === 'qudurat'
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5'
              }`}
            >
              {activeTab === 'qudurat' && (
                <motion.div
                  layoutId="top-nav-active-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-slate-900 rounded-full shadow-sm"
                />
              )}
              <Sparkles className="w-6.5 h-6.5 sm:w-5 sm:h-5 text-indigo-500 relative z-10 shrink-0" />
              <span className="hidden sm:inline relative z-10">{t('qudurat', 'القدرات')}</span>
            </button>

            {/* 4. Students (Teachers/Supervisors only) */}
            {showStudents && (
              <button
                data-nav-tab="students"
                onClick={() => handleTabSelect('students')}
                title={t('students', 'الطلاب')}
                aria-label={t('students', 'الطلاب')}
                className={`relative p-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                  activeTab === 'students'
                    ? 'text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5'
                }`}
              >
                {activeTab === 'students' && (
                  <motion.div
                    layoutId="top-nav-active-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute inset-0 bg-slate-900 rounded-full shadow-sm"
                  />
                )}
                <GraduationCap className="w-6.5 h-6.5 sm:w-5 sm:h-5 relative z-10 shrink-0" />
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
                <LogIn className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-sky-400" />
                <span className="hidden sm:inline">{t('login', 'دخول')}</span>
              </motion.button>
            )}
          </div>
        </nav>
      </header>
    </>
  );
};
