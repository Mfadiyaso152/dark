import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lightbulb, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Send,
  Clock,
  School,
  Home,
  Calendar,
  HeartHandshake,
  Award,
  Bell,
  LogOut,
  ChevronDown,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { safeSetItem, safeGetItem } from '../utils/storage';
import { ZhrawiFeedback, BannerItem, BannerSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { HomeBannerSlider } from './HomeBannerSlider';
import { PlatformShutdownBanner } from './PlatformShutdownNotice';

interface WelcomePortalViewProps {
  onEnterSite: () => void;
  onOpenLogin: () => void;
  onGoToZhrawiAdmin?: () => void;
  currentUser?: any;
  banners?: BannerItem[];
  bannerSettings?: BannerSettings;
}

type PortalNavTab = 'home' | 'schedules' | 'guidance_admin' | 'behavior';

export const WelcomePortalView: React.FC<WelcomePortalViewProps> = ({
  onEnterSite,
  onOpenLogin,
  onGoToZhrawiAdmin,
  currentUser,
  banners = [],
  bannerSettings
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, logout } = useAuth();
  const activeUser = currentUser || user;

  // Active top navigation tab state
  const [activeTab, setActiveTab] = useState<PortalNavTab>('home');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  // Modal states
  const [modalType, setModalType] = useState<'suggestion' | 'complaint' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [comingSoonGrade, setComingSoonGrade] = useState<string | null>(null);
  const [loginRequiredPrompt, setLoginRequiredPrompt] = useState(false);

  // Feedback form states
  const [fullName, setFullName] = useState(activeUser?.name || '');
  const [grade, setGrade] = useState('الأول ثانوي');
  const [classroom, setClassroom] = useState('1/1');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine supervisor / counselor access
  const isSuper = Boolean(
    isSuperAdmin ||
    activeUser?.email?.toLowerCase() === 'mfb.15.f@gmail.com' ||
    activeUser?.jobTitle === 'المشرف الأساسي'
  );

  const isSupervisorUser = Boolean(
    isSuper ||
    isAssistantAdmin ||
    activeUser?.jobTitle === 'مشرف مساعد' ||
    activeUser?.role === 'supervisor' ||
    activeUser?.jobTitle?.includes('مرشد') ||
    activeUser?.jobTitle?.includes('إدار') ||
    activeUser?.email?.toLowerCase() === 'kalshrby90@gmail.com'
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  const handleTabClick = (tabId: PortalNavTab) => {
    if (tabId === 'home') {
      setActiveTab('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tabId === 'schedules') {
      showToast('قسم الجداول المدرسية قريباً 🔒✨');
    } else if (tabId === 'behavior') {
      showToast('قسم السلوك المتميز قريباً 🔒✨');
    } else if (tabId === 'guidance_admin') {
      if (onGoToZhrawiAdmin) {
        onGoToZhrawiAdmin();
      }
    }
  };

  // Open Feedback Modal with auth guard
  const handleOpenFeedbackModal = (type: 'suggestion' | 'complaint') => {
    if (!activeUser) {
      setLoginRequiredPrompt(true);
      return;
    }
    setModalType(type);
    setSubmissionSuccess(false);
    setErrorMessage('');
    setTitle('');
    setContent('');
    setFullName(activeUser?.name || '');
  };

  // Submit Suggestion or Complaint
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) {
      onOpenLogin();
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('يرجى كتابة الاسم الكامل للطالب أو صاحب الرسالة.');
      return;
    }

    if (!phone.trim()) {
      setErrorMessage('يرجى إدخال رقم الجوال للتواصل.');
      return;
    }

    if (!title.trim() || !content.trim()) {
      setErrorMessage('يرجى إدخال عنوان وتفاصيل الرسالة كاملة.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const feedbackPayload: Omit<ZhrawiFeedback, 'id'> = {
        type: modalType || 'suggestion',
        title: title.trim(),
        content: content.trim(),
        studentName: fullName.trim(),
        studentEmail: activeUser.email || 'unknown@domain.com',
        studentGrade: grade,
        studentClass: classroom,
        phone: phone.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending',
        adminNotes: ''
      };

      // 1. Push to Firestore collection `zhrawi_feedback`
      try {
        await addDoc(collection(db, 'zhrawi_feedback'), {
          ...feedbackPayload,
          serverCreatedAt: serverTimestamp(),
          isDeleted: false
        });
      } catch (cloudErr) {
        console.warn('Firestore feedback submission fallback note:', cloudErr);
      }

      // 2. Cache locally
      try {
        const stored = JSON.parse(safeGetItem('zhrawi_feedbacks_cache') || '[]');
        const updated = [
          { ...feedbackPayload, id: 'local_' + Date.now() },
          ...(Array.isArray(stored) ? stored : [])
        ];
        safeSetItem('zhrawi_feedbacks_cache', JSON.stringify(updated));
      } catch (locErr) {
        console.warn('Local storage cache error:', locErr);
      }

      setIsSubmitting(false);
      setSubmissionSuccess(true);
    } catch (err: any) {
      console.error(err);
      setIsSubmitting(false);
      setErrorMessage('حدث خطأ أثناء الإرسال، يرجى المحاولة مجدداً.');
    }
  };

  // Navigation Items for Top Bar
  const navItems = [
    { id: 'home' as PortalNavTab, label: 'الرئيسية', icon: Home, isUpcoming: false },
    { id: 'schedules' as PortalNavTab, label: 'الجداول المدرسية', icon: Calendar, isUpcoming: true },
    ...(isSupervisorUser ? [{ id: 'guidance_admin' as PortalNavTab, label: 'الإرشاد الطلابي', icon: HeartHandshake, isUpcoming: false }] : []),
    { id: 'behavior' as PortalNavTab, label: 'السلوك المتميز', icon: Award, isUpcoming: true }
  ];

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#FBFBFA] text-slate-900 font-['IBM_Plex_Sans_Arabic',sans-serif] selection:bg-slate-900 selection:text-white flex flex-col justify-between relative overflow-hidden"
    >
      {/* Background Soft Glow Accents */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-sky-200/25 to-indigo-200/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/4 w-[450px] h-[450px] bg-gradient-to-tr from-amber-100/30 to-purple-100/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ======================================================== */}
      {/* TOP FLOATING TOAST NOTIFICATION (Like Qudurat)           */}
      {/* ======================================================== */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="fixed top-20 inset-x-0 mx-auto z-50 w-fit max-w-sm px-4 py-2.5 rounded-full bg-slate-900/95 backdrop-blur-xl text-white text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2 border border-slate-700/80 pointer-events-none"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* iOS 26 FLOATING LIQUID GLASS TOP NAVIGATION BAR         */}
      {/* ======================================================== */}
      <header
        className="sticky top-0 z-40 w-full px-3 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2 transition-all select-none"
        dir="rtl"
      >
        <nav
          className="ios26-liquid-glass-nav relative mx-auto max-w-4xl h-14 sm:h-15 px-3 sm:px-4 rounded-full flex items-center justify-between transition-all duration-300 shadow-sm"
          aria-label="شريط التنقل الرئيسي"
        >
          {/* Glass Specular Reflection Highlight Line */}
          <div className="ios26-specular-highlight" />

          {/* Right side: School Brand & Version 3.0 beta */}
          <div className="flex items-center gap-2 shrink-0 z-10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white shadow-xs">
              <School className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900 text-xs sm:text-sm tracking-tight">
                ثانوية الزهراوي
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                3.0 beta
              </span>
            </div>
          </div>

          {/* Center: iOS 26 Interactive Liquid Glass Navigation Tabs */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 select-none z-10">
            {navItems.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={`relative px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${
                    isSelected
                      ? 'text-slate-950 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="portal-liquid-pill"
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 520,
                        damping: 32,
                        mass: 0.55
                      }}
                      className="ios26-liquid-pill absolute inset-0 rounded-full pointer-events-none"
                    />
                  )}
                  <item.icon
                    className={`w-4.5 h-4.5 sm:w-4 sm:h-4 relative z-10 shrink-0 transition-transform duration-200 ${
                      isSelected ? 'text-sky-600 scale-105' : 'text-slate-600'
                    }`}
                  />
                  <span className="hidden sm:inline relative z-10">
                    {item.label}
                  </span>
                  {item.isUpcoming && (
                    <span className="hidden md:inline-block relative z-10 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
                      قريباً
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Left side: Profile Avatar (if signed in) or Notification Bell */}
          <div className="flex items-center justify-end shrink-0 z-10">
            {activeUser ? (
              <div className="relative" ref={avatarMenuRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                  className="relative p-0.5 rounded-full border border-white/80 hover:border-slate-300 bg-white/80 shadow-2xs transition cursor-pointer backdrop-blur-md"
                  title={`الملف الشخصي: ${activeUser.name}`}
                  aria-expanded={isAvatarMenuOpen}
                  aria-label="قائمة الحساب"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-slate-100">
                    {activeUser.avatar ? (
                      <img
                        src={activeUser.avatar}
                        alt={activeUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-black text-slate-700">
                        {activeUser.name ? activeUser.name.charAt(0) : '👤'}
                      </span>
                    )}
                  </div>
                </motion.button>

                {/* Avatar Dropdown */}
                <AnimatePresence>
                  {isAvatarMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-56 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl py-2 z-50 text-slate-800"
                    >
                      <div className="px-3.5 py-2 border-b border-slate-100">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {activeUser.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {activeUser.email}
                        </div>
                        {activeUser.jobTitle && (
                          <div className="mt-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md inline-block">
                            {activeUser.jobTitle}
                          </div>
                        )}
                      </div>

                      {isSupervisorUser && onGoToZhrawiAdmin && (
                        <button
                          onClick={() => {
                            setIsAvatarMenuOpen(false);
                            onGoToZhrawiAdmin();
                          }}
                          className="w-full px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition text-right"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                          <span>بوابة الإرشاد والإدارة</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsAvatarMenuOpen(false);
                          logout();
                        }}
                        className="w-full px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition text-right"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="w-8 h-8" />
            )}
          </div>
        </nav>
      </header>

      {/* ======================================================== */}
      {/* MAINTENANCE NOTIFICATION BANNER (Thursday Closure)      */}
      {/* ======================================================== */}
      {/* Platform Shutdown Countdown Banner */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <PlatformShutdownBanner />
      </div>

      {/* ======================================================== */}
      {/* MAIN BODY: BANNERS & GRADE SELECTION                     */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Home Banner Slider - نفس الإعلانات الموجودة بمنصة زاد */}
        {banners && banners.length > 0 && (
          <div className="w-full">
            <HomeBannerSlider
              banners={banners}
              settings={bannerSettings || { autoPlay: true, intervalSeconds: 5 }}
            />
          </div>
        )}

        {/* Main Portal Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative bg-white/85 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-6 text-center overflow-hidden"
        >
          {/* Subtle decorative highlight line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />

          {/* Main Title */}
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-bold">
              <span>بوابة التعليم الذكي</span>
              <span>•</span>
              <span>الإصدار 3.0 Beta</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight sm:leading-snug">
              أهلاً بكم في بوابة <span className="text-sky-600">ثانوية الزهراوي</span>
            </h1>
          </div>

          {/* Grade Entry Selection (Cylindrical Pill Buttons) */}
          <div className="pt-2 sm:pt-4 space-y-4">
            <div className="text-xs font-black text-slate-500 tracking-wider">
              اختر المرحلة الدراسية:
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
              {/* Grade 1: أول ثانوي */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={onEnterSite}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 text-white font-black text-sm sm:text-base shadow-md shadow-sky-600/25 border border-sky-400/40 transition cursor-pointer flex items-center justify-center min-w-[140px]"
              >
                <span>أول ثانوي</span>
              </motion.button>

              {/* Grade 2: ثاني ثانوي */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setComingSoonGrade('الصف الثاني الثانوي')}
                className="px-8 py-3.5 rounded-full bg-slate-100/90 hover:bg-slate-200/90 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition cursor-pointer flex items-center justify-center min-w-[140px]"
              >
                <span>ثاني ثانوي</span>
              </motion.button>

              {/* Grade 3: ثالث ثانوي */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setComingSoonGrade('الصف الثالث الثانوي')}
                className="px-8 py-3.5 rounded-full bg-slate-100/90 hover:bg-slate-200/90 text-slate-800 font-bold text-sm sm:text-base border border-slate-200/90 shadow-2xs transition cursor-pointer flex items-center justify-center min-w-[140px]"
              >
                <span>ثالث ثانوي</span>
              </motion.button>
            </div>
          </div>

          {/* Suggestions & Complaints Action Hub */}
          <div className="pt-4 border-t border-slate-100">
            <div className="max-w-xl mx-auto space-y-3">
              <div className="text-xs text-slate-500 font-bold">
                تواصل مباشر مع إدارة ثانوية الزهراوي والمرشد الطلابي:
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Suggestion Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenFeedbackModal('suggestion')}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>تقديم اقتراح تطويري للمدرسة</span>
                </motion.button>

                {/* Complaint Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenFeedbackModal('complaint')}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 shadow-2xs font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>تقديم شكوى أو بلاغ للمرشد</span>
                </motion.button>
              </div>

              <p className="text-[11px] text-slate-400">
                يتم استقبال الرسائل بسرية تامة ومتابعتها مباشرة من قبل إدارة المدرسة والموجه الطلابي
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ======================================================== */}
      {/* MODAL: Coming Soon Notification (الصف الثاني / الثالث) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {comingSoonGrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
                <Clock className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  قريباً بإذن الله
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {comingSoonGrade}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  مقررات وواجبات وخدمات {comingSoonGrade} قيد الإعداد والتطوير حالياً وسيتم تفعيلها لطلاب ثانوية الزهراوي قريباً جداً.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={onEnterSite}
                  className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تصفح الصف الأول الثانوي</span>
                </button>
                <button
                  onClick={() => setComingSoonGrade(null)}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: Login Required Prompt                            */}
      {/* ======================================================== */}
      <AnimatePresence>
        {loginRequiredPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xl space-y-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100">
                <UserIcon className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-900">
                  تسجيل الدخول مطلوب للمتابعة
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  لضمان وصول الاقتراح أو الشكوى إلى إدارة مدرسة ثانوية الزهراوي والمرشد الطلابي ومتابعتها، يرجى تسجيل الدخول أولاً.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setLoginRequiredPrompt(false);
                    onOpenLogin();
                  }}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>تسجيل الدخول</span>
                </button>
                <button
                  onClick={() => setLoginRequiredPrompt(false)}
                  className="w-full py-2 px-4 text-slate-500 hover:text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL: Suggestion or Complaint Submission Form           */}
      {/* ======================================================== */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      modalType === 'suggestion' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {modalType === 'suggestion' ? <Lightbulb className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {modalType === 'suggestion' ? 'تقديم اقتراح تطويري لثانوية الزهراوي' : 'تقديم شكوى أو بلاغ للمرشد الطلابي'}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setModalType(null)}
                  className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold cursor-pointer transition"
                >
                  ✕
                </button>
              </div>

              {/* Form Content */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1">
                {submissionSuccess ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-slate-900">
                        تم إرسال رسالتك بنجاح!
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                        شكراً لك، تم توجيه {modalType === 'suggestion' ? 'اقتراحك' : 'شكواك'} إلى إدارة ثانوية الزهراوي والمرشد الطلابي وسيتم الاطلاع عليها والتعامل معها باهتمام.
                      </p>
                    </div>

                    <button
                      onClick={() => setModalType(null)}
                      className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitFeedback} className="space-y-4">
                    {errorMessage && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Student Full Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>الاسم الكامل للطالب</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="اكتب الاسم الثلاثي أو الرباعي..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
                      />
                    </div>

                    {/* Grade and Class */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">الصف الدراسي</label>
                        <select
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none transition"
                        >
                          <option value="الأول ثانوي">الأول ثانوي</option>
                          <option value="الثاني ثانوي">الثاني ثانوي</option>
                          <option value="الثالث ثانوي">الثالث ثانوي</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">الشعبة / الفصل</label>
                        <input
                          type="text"
                          value={classroom}
                          onChange={(e) => setClassroom(e.target.value)}
                          placeholder="مثال: 1/2 أو شعبة 3"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>رقم الجوال للتواصل</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="05xxxxxxxx"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition text-left font-mono"
                        dir="ltr"
                      />
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>عنوان {modalType === 'suggestion' ? 'الاقتراح' : 'الشكوى'}</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={modalType === 'suggestion' ? 'مثال: اقتراح بخصوص الجدول المدرسي...' : 'مثال: مشكلة بخصوص تسليم الواجب...'}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
                      />
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span>التفاصيل والشرح</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="اكتب كامل التفاصيل والمعلومات التي ترغب في إيصالها لإدارة المدرسة..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-white transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 ${
                          modalType === 'suggestion'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال الرسالة إلى إدارة المدرسة'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
