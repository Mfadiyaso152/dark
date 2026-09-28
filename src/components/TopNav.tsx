import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useLanguage } from '../context/LanguageContext';
import { Home, Sparkles, GraduationCap, ClipboardCheck, Bell, LogIn, Clock, Lock, User as UserIcon, LogOut, School } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

export type TabType = 'home' | 'homeworks' | 'qudurat' | 'students' | 'admin';

interface TopNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onBackToPortal?: () => void;
  onOpenZhrawi?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange,
  onBackToPortal,
  onOpenZhrawi
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, setIsAuthModalOpen, logout } = useAuth();
  const { openNotificationsModal, unreadCount } = useNotifications();
  const { t } = useLanguage();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    if (isAvatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAvatarMenuOpen]);

  // iOS 26 Press & Scrubbing State
  const [isPressing, setIsPressing] = useState(false);
  const [previewTab, setPreviewTab] = useState<TabType | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const isPressingRef = useRef(false);
  const previewTabRef = useRef<TabType | null>(null);

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

  // Navigation Items
  const navItems = [
    { id: 'home' as TabType, label: t('home', 'الرئيسية'), icon: Home },
    { id: 'homeworks' as TabType, label: t('homeworks', 'الواجبات'), icon: ClipboardCheck },
    { id: 'qudurat' as TabType, label: t('qudurat', 'القدرات'), icon: Sparkles },
    ...(showStudents ? [{ id: 'students' as TabType, label: t('students', 'الطلاب'), icon: GraduationCap }] : [])
  ];

  // Final committed navigation (only triggered on finger lift / pointerup)
  const commitTabSelection = (tab: TabType) => {
    if (tab === 'qudurat') {
      triggerHaptic('warning');
      showNavToast('قسم القدرات قريباً 🔒✨');
      return;
    }

    if (tab === 'homeworks' && !user) {
      triggerHaptic('warning');
      showNavToast(t('login_required_homeworks', 'يجب تسجيل الدخول أولاً للوصول للواجبات 🔒'));
      setIsAuthModalOpen(true);
      return;
    }

    if (tab !== activeTab) {
      triggerHaptic('medium');
      onTabChange(tab);
    } else {
      triggerHaptic('light');
    }
  };

  // Fast coordinate resolution with horizontal interpolation and vertical tolerance
  const getTabFromCoordinates = (clientX: number, clientY: number): TabType | null => {
    if (!containerRef.current) return null;
    const buttons = Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-nav-tab]'));
    if (buttons.length === 0) return null;

    // 1. Direct hit with generous vertical tolerance (+/- 45px for natural finger placement)
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      const inY = clientY >= rect.top - 45 && clientY <= rect.bottom + 45;
      const inX = clientX >= rect.left && clientX <= rect.right;
      if (inX && inY) {
        return btn.getAttribute('data-nav-tab') as TabType;
      }
    }

    // 2. Horizontal clamping: find the nearest tab horizontally
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
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const targetTab = getTabFromCoordinates(e.clientX, e.clientY);
    if (!targetTab) return;

    isPressingRef.current = true;
    previewTabRef.current = targetTab;
    setIsPressing(true);
    setPreviewTab(targetTab);
    triggerHaptic('light');

    // Capture pointer so all sliding movements track smoothly across the viewport
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      pointerIdRef.current = e.pointerId;
    } catch (err) {
      // Ignored if not supported
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressingRef.current) return;

    const targetTab = getTabFromCoordinates(e.clientX, e.clientY);
    if (targetTab && targetTab !== previewTabRef.current) {
      previewTabRef.current = targetTab;
      setPreviewTab(targetTab);
      triggerHaptic('selection'); // Subtle iOS selection tick during slide
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPressingRef.current) return;
    isPressingRef.current = false;
    setIsPressing(false);

    try {
      if (pointerIdRef.current !== null) {
        (e.currentTarget as HTMLElement).releasePointerCapture(pointerIdRef.current);
      }
    } catch (err) {
      // Ignored
    }
    pointerIdRef.current = null;

    const finalTab = previewTabRef.current;
    setPreviewTab(null);

    // Commit navigation only when finger lifts
    if (finalTab) {
      commitTabSelection(finalTab);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (!isPressingRef.current) return;
    isPressingRef.current = false;
    setIsPressing(false);

    try {
      if (pointerIdRef.current !== null) {
        (e.currentTarget as HTMLElement).releasePointerCapture(pointerIdRef.current);
      }
    } catch (err) {
      // Ignored
    }
    pointerIdRef.current = null;
    setPreviewTab(null);
  };

  // Which tab is currently visually focused (preview during press, or committed activeTab)
  const displayedTab = (isPressing && previewTab) ? previewTab : activeTab;

  return (
    <>
      {/* iOS Floating Glass Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="fixed top-20 sm:top-22 left-1/2 -translate-x-1/2 z-60 glass-subject-vessel text-slate-900 text-xs sm:text-sm px-6 py-3 rounded-full shadow-[0_16px_40px_-8px_rgba(15,23,42,0.18)] flex items-center gap-2.5 backdrop-blur-2xl font-black border border-white/95"
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS 26 Floating Liquid Glass Navigation Bar */}
      <header
        className="sticky top-0 z-40 w-full px-3 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2 transition-all select-none"
        dir="rtl"
      >
        <nav
          className="ios26-liquid-glass-nav relative mx-auto max-w-4xl h-14 sm:h-15 px-3 sm:px-4 rounded-full flex items-center justify-between transition-all duration-300"
          aria-label="شريط التنقل الرئيسي"
        >
          {/* Glass Specular Reflection Highlight Line */}
          <div className="ios26-specular-highlight" />

          {/* Right side: Notification Bell */}
          <div className="flex items-center justify-start shrink-0 z-10">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openNotificationsModal}
              className="relative p-2 sm:p-2.5 rounded-full bg-white/40 hover:bg-white/70 text-slate-700 hover:text-slate-950 border border-white/60 shadow-2xs transition flex items-center justify-center cursor-pointer backdrop-blur-lg"
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

          {/* Center: iOS 26 Interactive Liquid Glass Scrubbing Tabs */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className={`absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 sm:gap-2 touch-none select-none transition-transform duration-150 ${
              isPressing ? 'scale-[0.985]' : 'scale-100'
            }`}
          >
            {navItems.map((item) => {
              const isSelected = displayedTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-nav-tab={item.id}
                  title={item.label}
                  aria-label={item.label}
                  className={`relative px-3 sm:px-4.5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none touch-none ${
                    isSelected
                      ? 'text-slate-950 font-extrabold'
                      : isPressing
                      ? 'text-slate-400 opacity-60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/30'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="ios26-liquid-pill"
                      initial={false}
                      animate={{
                        scaleY: isPressing ? 1.28 : 1,
                        scaleX: isPressing ? 1.08 : 1,
                        y: isPressing ? -5 : 0,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: isPressing ? 480 : 520,
                        damping: isPressing ? 24 : 32,
                        mass: 0.55
                      }}
                      className="ios26-liquid-pill absolute inset-0 rounded-full pointer-events-none origin-bottom"
                    />
                  )}
                  <item.icon
                    className={`w-5.5 h-5.5 sm:w-4.5 sm:h-4.5 relative z-10 shrink-0 transition-transform duration-200 ${
                      isSelected
                        ? isPressing
                          ? '-translate-y-1 scale-110 text-sky-600'
                          : 'scale-105 text-sky-600'
                        : 'scale-100 text-slate-600'
                    }`}
                  />
                  <span className={`hidden sm:inline relative z-10 transition-all duration-200 ${
                    isSelected
                      ? isPressing
                        ? '-translate-y-1 text-slate-950 font-black'
                        : 'text-slate-950 font-extrabold'
                      : 'text-slate-600'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Left side: Auth / Profile */}
          <div className="flex items-center justify-end shrink-0 z-10">
            {user ? (
              <div className="relative" ref={avatarMenuRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                  className="relative p-0.5 rounded-full border border-white/80 hover:border-slate-300 bg-white/80 shadow-2xs transition cursor-pointer backdrop-blur-md"
                  title={`${t('profile', 'الملف الشخصي')}: ${user.name}`}
                  aria-expanded={isAvatarMenuOpen}
                  aria-label="قائمة الحساب"
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

                {/* Dropdown Menu when clicking account picture */}
                <AnimatePresence>
                  {isAvatarMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: 8 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 mt-2.5 w-72 sm:w-80 rounded-3xl bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-2xl p-3 sm:p-4 z-50 text-right font-['IBM_Plex_Sans_Arabic',sans-serif] ring-1 ring-black/5"
                      dir="rtl"
                    >
                      {/* User Mini Profile Info */}
                      <div className="flex items-center gap-3 pb-3 mb-2.5 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-700">
                              {user.name ? user.name.charAt(0) : '👤'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate font-['Alexandria',sans-serif]">
                            {user.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate font-mono">{user.email}</p>
                        </div>
                      </div>

                      {/* Primary Return to Home / Beginning Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAvatarMenuOpen(false);
                          if (onBackToPortal) {
                            onBackToPortal();
                          }
                        }}
                        className="w-full py-2.5 px-3 mb-2 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition cursor-pointer active:scale-95"
                      >
                        <Home className="w-4 h-4 text-sky-100 shrink-0" />
                        <span>العودة للرئيسية (صفحة البداية)</span>
                      </button>

                      {/* Other Account Options */}
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAvatarMenuOpen(false);
                            setIsAuthModalOpen(true);
                          }}
                          className="w-full py-2 px-3 rounded-xl hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-slate-400" />
                            <span>بيانات الحساب الشخصي</span>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsAvatarMenuOpen(false);
                            logout();
                          }}
                          className="w-full py-2 px-3 rounded-xl hover:bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <LogOut className="w-4 h-4 text-rose-500" />
                            <span>تسجيل الخروج</span>
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-1.8 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-white/30 backdrop-blur-lg"
                title={t('login', 'تسجيل الدخول')}
              >
                <LogIn className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-sky-300" />
                <span className="hidden sm:inline">{t('login', 'دخول')}</span>
              </motion.button>
            )}
          </div>
        </nav>
      </header>
    </>
  );
};
