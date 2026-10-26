import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Clock, Lock, ShieldAlert, Sparkles, LogIn, ChevronLeft } from 'lucide-react';
import { calculateClosureCountdown, ClosureCountdown } from '../utils/closureTimer';
import { useAuth } from '../context/AuthContext';

/**
 * Banner shown on Home & Welcome screens displaying countdown until Thursday 12:00 shutdown.
 */
export const PlatformShutdownBanner: React.FC = () => {
  const [countdown, setCountdown] = useState<ClosureCountdown>(calculateClosureCountdown());

  useEffect(() => {
    // Update every second for live countdown
    const timer = setInterval(() => {
      setCountdown(calculateClosureCountdown());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (countdown.isClosed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-gradient-to-r from-rose-700 via-rose-800 to-rose-900 border border-rose-500 rounded-3xl p-4 sm:p-5 shadow-lg shadow-rose-950/20 flex flex-col sm:flex-row items-center gap-4 text-white text-center sm:text-right overflow-hidden mb-3"
      >
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight">
            تم إغلاق المنصة رسمياً
          </h3>
          <p className="text-[11px] sm:text-xs font-bold text-rose-100 leading-snug">
            توقفت المنصة عن العمل اعتباراً من يوم الخميس الساعة 12:00 ظهراً.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 backdrop-blur-xl border border-rose-400/80 rounded-3xl p-4 sm:p-5 shadow-lg shadow-rose-900/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-white text-center sm:text-right overflow-hidden mb-3"
    >
      {/* Specular Top Glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      {/* Left Icon & Text Details */}
      <div className="flex items-center gap-3.5 sm:gap-4 flex-1">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
          <AlertCircle className="w-6 h-6 text-white animate-pulse" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight">
              إشعار إغلاق المنصة يوم الخميس
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black border border-white/25">
              هام للجميع
            </span>
          </div>
          <p className="text-[11px] sm:text-xs font-bold text-rose-50/95 leading-snug">
            يرجى العلم بأنه <span className="underline decoration-white/40 underline-offset-2 font-black">سيتم إغلاق المنصة وتوقفها عن العمل تماماً</span> يوم <strong className="text-white font-black">الخميس القادم الساعة 12:00 ظهراً</strong>.
          </p>
        </div>
      </div>

      {/* Live Countdown Clock Badges */}
      <div className="shrink-0 flex items-center gap-2 bg-black/25 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 shadow-inner" dir="ltr">
        <div className="flex items-center gap-1.5 font-mono text-center">
          {countdown.days > 0 && (
            <>
              <div className="flex flex-col items-center">
                <span className="text-sm sm:text-base font-black text-white leading-none">
                  {String(countdown.days).padStart(2, '0')}
                </span>
                <span className="text-[9px] font-sans text-rose-200 mt-0.5">يوم</span>
              </div>
              <span className="text-white/60 font-bold">:</span>
            </>
          )}

          <div className="flex flex-col items-center">
            <span className="text-sm sm:text-base font-black text-white leading-none">
              {String(countdown.hours).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-sans text-rose-200 mt-0.5">ساعة</span>
          </div>

          <span className="text-white/60 font-bold">:</span>

          <div className="flex flex-col items-center">
            <span className="text-sm sm:text-base font-black text-white leading-none">
              {String(countdown.minutes).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-sans text-rose-200 mt-0.5">دقيقة</span>
          </div>

          <span className="text-white/60 font-bold">:</span>

          <div className="flex flex-col items-center">
            <span className="text-sm sm:text-base font-black text-amber-300 leading-none">
              {String(countdown.seconds).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-sans text-amber-200 mt-0.5">ثانية</span>
          </div>
        </div>

        <div className="border-l border-white/20 pl-2 ml-1 text-right" dir="rtl">
          <span className="text-[10px] font-bold text-white/90 block leading-tight">متبقي على</span>
          <span className="text-[10px] font-black text-amber-200 block leading-tight">الإغلاق</span>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Full-screen Locked Overlay rendered when countdown reaches 0 (Thursday 12:00).
 * Prevents usage of the app for regular users, while allowing Admin override.
 */
interface PlatformClosedScreenProps {
  onAdminBypass?: () => void;
}

export const PlatformClosedScreen: React.FC<PlatformClosedScreenProps> = ({ onAdminBypass }) => {
  const { user, isSuperAdmin, setIsAuthModalOpen } = useAuth();
  const [countdown, setCountdown] = useState<ClosureCountdown>(calculateClosureCountdown());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateClosureCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-9999 bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto"
      dir="rtl"
    >
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(225,29,72,0.18),transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative max-w-xl w-full bg-slate-900/95 border border-rose-500/40 rounded-3xl p-6 sm:p-8 md:p-10 text-center shadow-2xl shadow-rose-950/40 backdrop-blur-2xl space-y-6"
      >
        {/* Specular highlight */}
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />

        {/* Big Lock Icon with animated pulse */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shadow-xl shadow-rose-900/30">
          <div className="absolute inset-0 rounded-3xl bg-rose-500/10 animate-ping opacity-40" />
          <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400 relative z-10" />
        </div>

        {/* Main Title & Notice */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>انتهت فترة العمل المقررة</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-['Alexandria',sans-serif] text-white tracking-tight">
            تم إغلاق المنصة رسمياً
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto pt-1 font-medium">
            نود إحاطتكم بأنه قد تم إيقاف وإغلاق منصة زاد التعليمية عن العمل اعتباراً من يوم <strong className="text-rose-300 font-bold">الخميس الساعة 12:00 ظهراً</strong>.
          </p>
        </div>

        {/* Appreciation card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-medium space-y-1">
          <p className="font-bold text-white flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>شكراً لجميع الطلاب والمعلمين والمشرفين</span>
          </p>
          <p className="text-slate-400 text-xs">
            نشكركم على تفاعلكم وجهودكم المبذولة طوال الفصل الدراسي. نسأل الله لكم دوام التوفيق والنجاح وأعلى الدرجات دائماً!
          </p>
        </div>

        {/* Status / Timestamp indicator */}
        <div className="text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>حالة المنصة: مغلقة بقرار الإدارة المدرسية</span>
        </div>

        {/* Admin Access / Override button */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-center gap-2">
          {isSuperAdmin || (user && user.email?.toLowerCase() === 'mfb.15.f@gmail.com') ? (
            <button
              type="button"
              onClick={onAdminBypass}
              className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>متابعة لوحة المشرف العام (تجاوز الإغلاق للإدارة)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>تسجيل دخول المشرف</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
