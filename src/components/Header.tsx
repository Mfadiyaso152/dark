import React from 'react';
import { useAuth, formatDisplayName } from '../context/AuthContext';
import { useSubjectControls } from '../context/SubjectControlsContext';
import { LogOut, Settings } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, canAddContent, isSuperAdmin, isAssistantAdmin } = useAuth();
  const { openSettings } = useSubjectControls();

  const isTeacherOrSupervisor = isSuperAdmin || isAssistantAdmin || canAddContent || (user && user.jobTitle !== 'طالب');
  
  // Only explicitly authorized supervisor emails can open the control panel
  const ALLOWED_CONTROL_PANEL_EMAILS = ['mfb.15.f@gmail.com', 'kalshrby90@gmail.com'];
  const isSettingsAllowed = !!user?.email && ALLOWED_CONTROL_PANEL_EMAILS.includes(user.email.toLowerCase().trim());

  // If user is a teacher/supervisor, prefix with 'أ.'
  const displayName = user?.name
    ? formatDisplayName(user.name, isTeacherOrSupervisor)
    : 'طالبنا العزيز';

  return (
    <header className="px-5 sm:px-6 md:px-8 lg:px-10 pt-4 md:pt-6 pb-2 text-right font-['Tajawal',sans-serif]">
      {/* Top User Bar */}
      <div className="flex justify-between items-center">
        {/* User Info with Avatar & Name */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Student"
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-[#1E293B] leading-tight truncate">
                أهلاً {displayName}
              </h1>

              {/* Action Buttons next to user name */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Supervisor Settings Button - Icon Only - Visible ONLY for specified supervisor emails */}
                {isSettingsAllowed && (
                  <button
                    onClick={openSettings}
                    className="p-1.5 md:p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 transition flex items-center justify-center border border-indigo-200/80 cursor-pointer shadow-2xs active:scale-95"
                    title="إعدادات المقررات"
                    aria-label="إعدادات المشرف"
                    id="supervisor-settings-header-btn"
                  >
                    <Settings className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-600" />
                  </button>
                )}

                {/* Small Logout Button next to user name - Icon Only */}
                <button
                  onClick={logout}
                  className="p-1.5 md:p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition flex items-center justify-center border border-slate-200/80 cursor-pointer active:scale-95"
                  title="تسجيل الخروج من الحساب"
                  aria-label="تسجيل الخروج"
                  id="header-logout-btn"
                >
                  <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500" />
                </button>
              </div>
            </div>

            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              الصف الأول الثانوي • المسار المشترك
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

