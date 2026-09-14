import React from 'react';
import { useAuth, formatDisplayName } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { LogOut, Bell, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export const Header: React.FC = () => {
  const { user, logout, canAddContent, isSuperAdmin, isAssistantAdmin, setIsAuthModalOpen } = useAuth();
  const { openNotificationsModal, unreadCount } = useNotifications();

  const isTeacherOrSupervisor = isSuperAdmin || isAssistantAdmin || canAddContent || (user && user.jobTitle !== 'طالب');

  // If user is a teacher/supervisor, prefix with 'أ.'
  const displayName = user?.name
    ? formatDisplayName(user.name, isTeacherOrSupervisor)
    : 'طالبنا العزيز';

  return (
    <header className="sticky top-3 sm:top-4 z-40 px-3 sm:px-4 max-w-5xl mx-auto w-full text-right font-['Tajawal',sans-serif]">
      {/* Cylindrical Floating Glass Bar */}
      <div className="w-full h-14 sm:h-16 px-3.5 sm:px-5 md:px-6 rounded-full bg-white/55 backdrop-blur-2xl backdrop-saturate-200 border border-white/80 shadow-[0_8px_32px_rgba(15,23,42,0.10)] flex items-center justify-between gap-3">
        {/* User Info / Guest Greeting */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border-2 border-white/80 shadow-xs flex items-center justify-center overflow-hidden shrink-0 text-white font-black text-xs sm:text-sm">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>زاد</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 leading-tight truncate">
                {user ? `أهلاً ${displayName}` : 'منصة زاد التعليمية'}
              </h1>

              {/* Action Buttons next to user name */}
              {user ? (
                <div className="flex items-center gap-1 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={logout}
                    className="p-1 rounded-full bg-slate-100/90 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition flex items-center justify-center border border-slate-200/80 cursor-pointer"
                    title="تسجيل الخروج من الحساب"
                    aria-label="تسجيل الخروج"
                    id="header-logout-btn"
                  >
                    <LogOut className="w-3 h-3 text-rose-500" />
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-2 py-0.5 rounded-full bg-blue-50/90 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-blue-200/80"
                >
                  <LogIn className="w-2.5 h-2.5" />
                  <span>دخول</span>
                </motion.button>
              )}
            </div>

            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              الصف الأول الثانوي • المسار المشترك
            </p>
          </div>
        </div>

        {/* Top-Left Notification Bell Icon */}
        <div className="flex items-center shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={openNotificationsModal}
            className="relative p-2 sm:p-2.5 rounded-full bg-white/70 backdrop-blur-md hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition flex items-center justify-center border border-slate-200/70 shadow-2xs cursor-pointer"
            title="الإشعارات والتنبيهات المدرسية"
            aria-label="الإشعارات والتنبيهات"
            id="header-notifications-btn"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-700 hover:text-indigo-600 transition-colors" />

            {/* Unread Counter Badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-2xs animate-bounce">
                {unreadCount > 9 ? '+9' : unreadCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
};


