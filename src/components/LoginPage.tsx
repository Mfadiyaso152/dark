import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithGoogle, authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleRealGoogleLogin = async () => {
    setIsLoading(true);
    const success = await loginWithGoogle();
    setIsLoading(false);
    if (success && onSuccess) onSuccess();
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 text-right font-['Tajawal',sans-serif] selection:bg-blue-500 selection:text-white"
    >
      {/* Background Soft Glows */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-[#1E293B] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <BookOpen className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1E293B]">
              مقررات وملخصات أول ثانوي
            </h1>
          </div>
        </div>

        {/* Real Google Login Primary Button */}
        <div className="space-y-3 pt-2">
          {authError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 leading-relaxed font-medium text-center">
              {authError}
            </div>
          )}

          <button
            onClick={handleRealGoogleLogin}
            disabled={isLoading}
            className="w-full py-4 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-500 text-slate-800 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition shadow-xs group cursor-pointer"
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
            <span>{isLoading ? 'جاري الاتصال بـ Google...' : 'تسجيل الدخول بواسطة Google'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
