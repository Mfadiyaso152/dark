import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  // Clean greeting: no titles, no prefixes
  const cleanName = user?.name
    ? user.name.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim()
    : 'طالبنا العزيز';

  return (
    <header className="px-5 pt-4 pb-2 text-right font-['Tajawal',sans-serif]">
      {/* Top User Bar */}
      <div className="flex justify-between items-center">
        {/* User Info with Avatar & Name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white border-2 border-slate-200 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={cleanName}
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
              <h1 className="text-lg sm:text-xl font-black text-[#1E293B] leading-tight truncate">
                أهلاً {cleanName}
              </h1>

              {/* Small Logout Button next to user name */}
              <button
                onClick={logout}
                className="py-1 px-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition flex items-center gap-1 text-[11px] font-bold border border-slate-200/80 cursor-pointer shrink-0"
                title="تسجيل الخروج من الحساب"
              >
                <LogOut className="w-3 h-3 text-rose-500" />
                <span>خروج</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium mt-0.5">
              الصف الأول الثانوي • المسار المشترك
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
