import { safeGetItem, safeSetItem } from './storage';

/**
 * Calculates the target closure time for the platform:
 * Target: Thursday at 12:00:00 (12:00 PM noon).
 * 
 * If a custom target timestamp is saved in localStorage, it will be used.
 * Otherwise, it calculates the next upcoming Thursday at 12:00:00 PM.
 */
export function getClosureTargetDate(): Date {
  // Check if a custom target date was set in localStorage (e.g. by admin)
  const savedTarget = safeGetItem('thanaweya_platform_closure_target');
  if (savedTarget) {
    const parsed = new Date(savedTarget);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  const targetDay = 4; // Thursday

  const target = new Date(now);
  target.setHours(12, 0, 0, 0); // 12:00:00 PM

  let daysToAdd = (targetDay - currentDay + 7) % 7;

  // If today is Thursday and current time is already >= 12:00:00 PM,
  // we either stay locked for this Thursday, or if no forced date set, calculate this Thursday 12:00 PM.
  if (daysToAdd === 0 && now.getTime() >= target.getTime()) {
    // It's Thursday after 12:00 PM, target is today 12:00 PM (platform is closed)
    return target;
  }

  target.setDate(now.getDate() + daysToAdd);
  return target;
}

export interface ClosureCountdown {
  isClosed: boolean;
  totalSecondsRemaining: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedText: string;
  targetDateString: string;
}

/**
 * Calculates the current countdown until platform closure.
 */
export function calculateClosureCountdown(): ClosureCountdown {
  // Check if manually forced closed via localStorage
  const manualLock = safeGetItem('thanaweya_platform_force_closed');
  if (manualLock === 'true') {
    return {
      isClosed: true,
      totalSecondsRemaining: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedText: 'المنصة مغلقة الآن',
      targetDateString: 'يوم الخميس الساعة 12:00 ظهراً'
    };
  }

  const targetDate = getClosureTargetDate();
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      isClosed: true,
      totalSecondsRemaining: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedText: 'المنصة مغلقة الآن',
      targetDateString: targetDate.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format hours as total hours if days are 0, or show days + hours
  let formattedText = '';
  if (days > 0) {
    formattedText = `${days} يوم و ${hours} ساعة و ${minutes} دقيقة`;
  } else {
    formattedText = `${hours} ساعة و ${minutes} دقيقة و ${seconds} ثانية`;
  }

  return {
    isClosed: false,
    totalSecondsRemaining: totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    formattedText,
    targetDateString: 'يوم الخميس الساعة 12:00 ظهراً'
  };
}
