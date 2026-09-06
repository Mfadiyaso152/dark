import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, formatDisplayName } from '../context/AuthContext';
import {
  X,
  LogOut,
  BookOpen
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    user,
    loginWithGoogle,
    loginWithGoogleEmail,
    logout,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authError,
    isTeacherOrSupervisor
  } = useAuth();

  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const displayName = user ? formatDisplayName(user.name, isTeacherOrSupervisor) : '';

  const handleRealGoogleLogin = async () => {
    setIsLoading(true);
    await loginWithGoogle();
    setIsLoading(false);
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    setIsLoading(true);
    await loginWithGoogleEmail(customEmail.trim(), customName.trim() || undefined);
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm font-['Tajawal',sans-serif]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-right overflow-hidden relative"
        >
          {/* Close button */}
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-5 pt-1">
            <div className="w-14 h-14 bg-[#1E293B] text-white rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-md">
              <BookOpen className="w-7 h-7 text-blue-400" />
            </div>
            <h2 className="text-xl font-black text-[#1E293B]">
              {user ? 'بيانات الحساب' : 'تسجيل الدخول بواسطة Google'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {user
                ? `أهلاً بك، ${displayName}`
                : 'اختر حساب Google لتسجيل الدخول والوصول للملخصات'}
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 leading-relaxed font-medium">
              {authError}
            </div>
          )}

          {user ? (
            <div className="space-y-4">
              {/* Current User Card */}
              <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 flex items-center gap-3.5">
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-[#1E293B] text-sm truncate">{displayName}</h3>
                  <p className="text-xs text-slate-400 font-mono truncate">{user.email}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    logout();
                    setIsAuthModalOpen(false);
                  }}
                  className="flex-1 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>

                <button
                  onClick={() => setIsAuthModalOpen(false)}
                  className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Real Google Login Button */}
              <button
                onClick={handleRealGoogleLogin}
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-500 text-slate-800 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition shadow-xs cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoading ? 'جاري الاتصال...' : 'تسجيل الدخول بواسطة Google'}</span>
              </button>

              {/* Custom Google Email */}
              {!isCustomMode ? (
                <button
                  onClick={() => setIsCustomMode(true)}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-bold transition text-center cursor-pointer"
                >
                  الدخول بكتابة البريد الإلكتروني...
                </button>
              ) : (
                <form onSubmit={handleCustomLogin} className="space-y-3 pt-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      الاسم:
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="اسمك الكامل"
                      className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      البريد الإلكتروني:
                    </label>
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isLoading || !customEmail.trim()}
                      className="flex-1 py-2 bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? 'جاري التحقق...' : 'دخول بحساب Google'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className="py-2 px-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
