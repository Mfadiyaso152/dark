import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, Clock, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isStarted: boolean;
}

export const SemesterCountdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isStarted: false
  });

  useEffect(() => {
    // Target date: January 17th of the current academic cycle
    // In Saudi school year 2026/2027 or upcoming Jan 17
    const calculateTimeLeft = () => {
      const now = new Date();
      let targetYear = now.getFullYear();
      
      // If current month is after January 17, target next year's Jan 17
      const targetDate = new Date(targetYear, 0, 17, 7, 0, 0); // Jan 17, 7:00 AM
      if (now.getTime() > targetDate.getTime()) {
        // If Jan 17 passed this year, calculate for next year or show active
        targetDate.setFullYear(targetYear + 1);
      }

      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isStarted: true
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isStarted: false
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-4 sm:p-5 text-white shadow-lg text-right relative overflow-hidden mb-2"
    >
      {/* Decorative background shapes */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute left-6 top-3 w-16 h-16 bg-blue-300/10 rounded-full blur-md pointer-events-none" />

      <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
        <span className="text-[11px] font-extrabold bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-blue-50 border border-white/20 flex items-center gap-1.5 shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-amber-300" />
          <span>موعد الانطلاق: 1/17 (17 يناير)</span>
        </span>

        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
            <span>العد التنازلي لبداية بارت تو</span>
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </h3>
        </div>
      </div>

      <p className="text-xs text-blue-100 font-medium mb-3.5 leading-relaxed relative z-10">
        استعد لانطلاقة بارت تو (P2) وتحميل ملخصات المقررات الجديدة فور صدورها.
      </p>

      {/* Countdown Digits Grid */}
      <div className="grid grid-cols-4 gap-2 relative z-10">
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/15 shadow-inner">
          <span className="block text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-bold text-blue-100 uppercase mt-0.5 block">يوم</span>
        </div>

        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/15 shadow-inner">
          <span className="block text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-bold text-blue-100 uppercase mt-0.5 block">ساعة</span>
        </div>

        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/15 shadow-inner">
          <span className="block text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-bold text-blue-100 uppercase mt-0.5 block">دقيقة</span>
        </div>

        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/15 shadow-inner">
          <span className="block text-xl sm:text-2xl font-black font-mono tracking-tight text-amber-300">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-bold text-blue-100 uppercase mt-0.5 block">ثانية</span>
        </div>
      </div>
    </motion.div>
  );
};
