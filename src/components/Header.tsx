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
    <header className="sticky top-2 sm:top-4 z-40 px-2 sm:px-4 max-w-5xl mx-auto w-full text-right font-['IBM_Plex_Sans_Arabic',sans-serif]">
      {/* Luxury Warm Architectural Capsule Header */}
      <div className="w-full h-15 sm:h-16 px-4 sm:px-6 rounded-2xl sm:rounded-3xl bg-white/92 backdrop-blur-2xl border border-[#E7E2D8] shadow-[0_6px_28px_-6px_rgba(28,25,23,0.08)] flex items-center justify-between gap-3">
        {/* User Info / Guest Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#1C1917] border border-[#292524] text-amber-400 shadow-sm flex items-center justify-center overflow-hidden shrink-0 font-bold text-xs sm:text-sm ring-1 ring-amber-500/20">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-['Alexandria',sans-serif] font-black tracking-tight text-white">زاد</span>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xs sm:text-sm md:text-base font-bold font-['Alexandria',sans-serif] text-[#1C1917] leading-tight truncate tracking-tight">
                {user ? displayName : 'منصة زاد التعليمية'}
              </h1>

              {/* Action Buttons next to user name */}
              {user ? (
                <div className="flex items-center gap-1 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={logout}
                    className="p-1 rounded-lg bg-[#F5F3EF] hover:bg-rose-50 text-[#78716C] hover:text-rose-600 transition flex items-center justify-center border border-[#E5E0D8] cursor-pointer"
                    title="تسجيل الخروج"
                    aria-label="تسجيل الخروج"
                    id="header-logout-btn"
                  >
                    <LogOut className="w-3 h-3" />
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-lg bg-[#1C1917] hover:bg-[#292524] text-[#FAF8F5] text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs border border-white/10"
                >
                  <LogIn className="w-2.5 h-2.5 text-amber-400" />
                  <span>دخول</span>
                </motion.button>
              )}
            </div>

            <p className="text-[10px] sm:text-[11px] text-[#A8A29E] font-medium leading-none mt-0.5">
              الأول الثانوي • المسار المشترك
            </p>
          </div>
        </div>

        {/* Top-Left Notification Bell Icon */}
        <div className="flex items-center shrink-0">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={openNotificationsModal}
            className="relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#F5F3EF] hover:bg-[#EBE7DF] text-[#1C1917] transition flex items-center justify-center border border-[#E5E0D8] shadow-xs cursor-pointer"
            title="الإشعارات والتنبيهات"
            aria-label="الإشعارات والتنبيهات"
            id="header-notifications-btn"
          >
            <Bell className="w-4 h-4 text-[#1C1917] transition-colors" />

            {/* Unread Counter Badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 bg-[#1C1917] text-amber-400 border border-amber-400/40 text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                {unreadCount > 9 ? '+9' : unreadCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
};


