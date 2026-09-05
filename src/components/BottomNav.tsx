import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, Bookmark, Users, Sparkles } from 'lucide-react';

export type TabType = 'home' | 'subjects' | 'qudurat' | 'saved' | 'users';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  savedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  savedCount
}) => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-w-2xl mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl transition-all font-['Tajawal',sans-serif]">
      {/* Navigation Items Bar */}
      <div className="h-16 flex items-center justify-around px-2 sm:px-4">
        {/* Home */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition cursor-pointer ${
            activeTab === 'home'
              ? 'text-[#3B82F6] font-black'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px] mt-1">الرئيسية</span>
        </button>

        {/* Qudurat (قريباً) */}
        <button
          onClick={() => onTabChange('qudurat')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition relative cursor-pointer ${
            activeTab === 'qudurat'
              ? 'text-indigo-600 font-black'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative">
            <Sparkles className="w-5 h-5" />
            <span className="absolute -top-1 -right-3.5 bg-amber-400 text-amber-950 text-[8px] font-black px-1 rounded-full">
              قريباً
            </span>
          </div>
          <span className="text-[11px] mt-1">القدرات</span>
        </button>

        {/* Saved / Bookmarks */}
        <button
          onClick={() => onTabChange('saved')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition relative cursor-pointer ${
            activeTab === 'saved'
              ? 'text-[#3B82F6] font-black'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative">
            <Bookmark className="w-5 h-5" />
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#22C55E] text-white text-[9px] font-black flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1">المحفوظات</span>
        </button>

        {/* Users (For Supervisor) */}
        {isSupervisor && (
          <button
            onClick={() => onTabChange('users')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition cursor-pointer ${
              activeTab === 'users'
                ? 'text-[#7C3AED] font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[11px] mt-1">المستخدمين</span>
          </button>
        )}
      </div>
    </div>
  );
};
