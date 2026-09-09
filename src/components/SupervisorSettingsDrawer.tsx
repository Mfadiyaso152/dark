import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Settings,
  BookOpen,
  Lock,
  ChevronRight,
  ChevronLeft,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { Subject } from '../types';
import { useSubjectControls } from '../context/SubjectControlsContext';
import { useAuth } from '../context/AuthContext';
import { SubjectIcon } from './SubjectIcon';

interface SupervisorSettingsDrawerProps {
  subjects: Subject[];
}

type DrawerScreen = 'menus' | 'partSelect' | 'subjectsList' | 'subjectDetail';

export const SupervisorSettingsDrawer: React.FC<SupervisorSettingsDrawerProps> = ({ subjects }) => {
  const {
    isSettingsOpen,
    closeSettings,
    controls,
    updateSubjectControl,
    isSubjectPaused,
    isLessonsPaused,
    isBookletsPaused,
    isHomeworksPaused
  } = useSubjectControls();

  const { user } = useAuth();

  const [currentScreen, setCurrentScreen] = useState<DrawerScreen>('menus');
  const [selectedPart, setSelectedPart] = useState<1 | 2>(1);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const ALLOWED_CONTROL_PANEL_EMAILS = ['mfb.15.f@gmail.com', 'kalshrby90@gmail.com'];
  const isControlPanelAllowed = !!user?.email && ALLOWED_CONTROL_PANEL_EMAILS.includes(user.email.toLowerCase().trim());

  if (!isSettingsOpen || !isControlPanelAllowed) return null;

  // Filter semester 1 subjects
  const part1Subjects = subjects.filter((s) => s.semester === 1);

  const handleOpenSubjectDetail = (sub: Subject) => {
    setSelectedSubject(sub);
    setCurrentScreen('subjectDetail');
  };

  const handleToggleSubject = async (subId: string, currentPaused: boolean) => {
    await updateSubjectControl(subId, {
      isPaused: !currentPaused
    });
  };

  const handleToggleLessons = async (subId: string, currentDisabled: boolean) => {
    await updateSubjectControl(subId, {
      lessonsDisabled: !currentDisabled
    });
  };

  const handleToggleBooklets = async (subId: string, currentDisabled: boolean) => {
    await updateSubjectControl(subId, {
      bookletsDisabled: !currentDisabled
    });
  };

  const handleToggleHomeworks = async (subId: string, currentDisabled: boolean) => {
    await updateSubjectControl(subId, {
      homeworksDisabled: !currentDisabled
    });
  };

  const subPaused = selectedSubject ? isSubjectPaused(selectedSubject.id) : false;
  const lessonsOff = selectedSubject ? isLessonsPaused(selectedSubject.id) : false;
  const bookletsOff = selectedSubject ? isBookletsPaused(selectedSubject.id) : false;
  const homeworksOff = selectedSubject ? isHomeworksPaused(selectedSubject.id) : false;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden font-['Tajawal',sans-serif]" dir="rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSettings}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        />

        {/* Drawer Container sliding from the LEFT as requested */}
        <div className="fixed inset-y-0 left-0 max-w-full flex">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-screen max-w-md bg-white shadow-2xl border-r border-slate-200 flex flex-col justify-between overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black">
                    إعدادات المواد
                  </h2>
                </div>
              </div>
              <button
                onClick={closeSettings}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="إغلاق اللوحة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Breadcrumb / Screen title bar */}
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 shrink-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('menus')}
                  className={`hover:text-blue-600 transition cursor-pointer ${currentScreen === 'menus' ? 'text-blue-600 font-black' : ''}`}
                >
                  القوائم
                </button>

                {currentScreen !== 'menus' && (
                  <>
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('partSelect')}
                      className={`hover:text-blue-600 transition cursor-pointer ${currentScreen === 'partSelect' ? 'text-blue-600 font-black' : ''}`}
                    >
                      المواد
                    </button>
                  </>
                )}

                {(currentScreen === 'subjectsList' || currentScreen === 'subjectDetail') && (
                  <>
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('subjectsList')}
                      className={`hover:text-blue-600 transition cursor-pointer ${currentScreen === 'subjectsList' ? 'text-blue-600 font-black' : ''}`}
                    >
                      البارت {selectedPart}
                    </button>
                  </>
                )}

                {currentScreen === 'subjectDetail' && selectedSubject && (
                  <>
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-900 truncate font-black">
                      {selectedSubject.name}
                    </span>
                  </>
                )}
              </div>

              {currentScreen !== 'menus' && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentScreen === 'subjectDetail') setCurrentScreen('subjectsList');
                    else if (currentScreen === 'subjectsList') setCurrentScreen('partSelect');
                    else if (currentScreen === 'partSelect') setCurrentScreen('menus');
                  }}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition text-[11px] cursor-pointer"
                >
                  <span>رجوع</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

              {/* SCREEN 0: Main Menus */}
              {currentScreen === 'menus' && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    القوائم المتاحة
                  </h3>

                  {/* Menu 1: المواد */}
                  <div
                    onClick={() => setCurrentScreen('partSelect')}
                    className="bg-white hover:bg-blue-50/50 border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-4 transition-all cursor-pointer group flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:scale-105 transition">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 group-hover:text-blue-600 text-base transition">
                          المواد والمقررات
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          التحكم في إيقاف وتشغيل المواد وأقسامها (قريباً)
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-1 transition" />
                  </div>

                  {/* Info Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>صلاحيات الإشراف الإداري</span>
                    </div>
                    <p className="leading-relaxed text-slate-500">
                      تتيح هذه اللوحة للمشرف الأساسي والمشرف المساعد التحكم الفوري في ظهور المواد والدروس والملخصات والواجبات للطلاب، مع بقاء كافة البيانات محفوظة في الخوادم السحابية.
                    </p>
                  </div>
                </div>
              )}

              {/* SCREEN 1: Part Selection (Part 1 vs Part 2 - Locked) */}
              {currentScreen === 'partSelect' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900">
                      اختر البارت (الفصل الدراسي):
                    </h3>
                    <p className="text-xs text-slate-500">
                      حدد الفصل الدراسي لعرض المقررات والتحكم في إعداداتها
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* Part 1 - Active */}
                    <div
                      onClick={() => {
                        setSelectedPart(1);
                        setCurrentScreen('subjectsList');
                      }}
                      className="bg-white hover:bg-indigo-50/50 border-2 border-indigo-200 hover:border-indigo-600 rounded-2xl p-4.5 transition-all cursor-pointer group flex items-center justify-between shadow-xs"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-xs group-hover:scale-105 transition">
                          1
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 group-hover:text-indigo-600 text-base transition">
                              البارت 1 (الفصل الأول)
                            </h4>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                              متاح للتحكم
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {part1Subjects.length} مقررات دراسية
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 group-hover:-translate-x-1 transition" />
                    </div>

                    {/* Part 2 - Locked as requested */}
                    <div className="bg-slate-100/90 border-2 border-slate-200/90 rounded-2xl p-4.5 opacity-80 cursor-not-allowed select-none flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-300 text-slate-600 flex items-center justify-center font-black text-lg">
                          2
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-600 text-base">
                              البارت 2 (الفصل الثاني)
                            </h4>
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>مغلق حالياً</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            غير مفعل ومغلق افتراضياً لجميع المستخدمين
                          </p>
                        </div>
                      </div>
                      <Lock className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 2: Subjects list of Part 1 */}
              {currentScreen === 'subjectsList' && (
                <div className="space-y-3.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900">
                      مواد البارت {selectedPart} ({part1Subjects.length} مواد)
                    </h3>
                    <span className="text-xs text-slate-500">اختر مادة للتحكم</span>
                  </div>

                  <div className="space-y-2.5">
                    {part1Subjects.map((sub) => {
                      const isPaused = isSubjectPaused(sub.id);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleOpenSubjectDetail(sub)}
                          className={`border-2 rounded-2xl p-3.5 transition-all cursor-pointer group flex items-center justify-between ${
                            isPaused
                              ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
                              : 'bg-white border-slate-200 hover:border-blue-500 hover:bg-blue-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                              {sub.emoji ? (
                                <span>{sub.emoji}</span>
                              ) : (
                                <SubjectIcon name={sub.icon} className="w-5 h-5 text-slate-700" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-slate-900 group-hover:text-blue-600 text-sm truncate transition">
                                  {sub.name}
                                </h4>
                                {isPaused ? (
                                  <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                                    🛑 موقوفة (قريباً)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                    🟢 نشطة
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {sub.code}
                              </p>
                            </div>
                          </div>

                          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-1 transition shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SCREEN 3: Subject Detail Controls */}
              {currentScreen === 'subjectDetail' && selectedSubject && (
                <div className="space-y-4 animate-fade-in">
                  {/* Selected Subject Header */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl shadow-2xs shrink-0">
                      {selectedSubject.emoji ? (
                        <span>{selectedSubject.emoji}</span>
                      ) : (
                        <SubjectIcon name={selectedSubject.icon} className="w-6 h-6 text-slate-700" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-base text-slate-900 truncate">
                        {selectedSubject.name}
                      </h4>
                      {selectedSubject.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {selectedSubject.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Main Toggle: إيقاف المادة مؤقتاً */}
                  <div className={`border-2 rounded-2xl p-4 transition-all ${
                    subPaused
                      ? 'bg-amber-50/80 border-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-900">
                            إيقاف المادة مؤقتاً
                          </h4>
                          {subPaused && (
                            <span className="text-[10px] font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md">
                              يظهر "قريباً" لجميع المستخدمين
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleSubject(selectedSubject.id, subPaused)}
                        className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center ${
                          subPaused ? 'bg-amber-500 justify-end' : 'bg-slate-300 justify-start'
                        }`}
                        title={subPaused ? 'إلغاء الإيقاف وتشغيل المادة' : 'إيقاف المادة مؤقتاً'}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-6 h-6 rounded-full bg-white shadow-md"
                        />
                      </button>
                    </div>
                  </div>

                  {/* Rule notice when subject is paused */}
                  {subPaused && (
                    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong>تنبيه الإيقاف الكامل:</strong> المادة مقفلة بالكامل حالياً. يجب إلغاء إيقاف المادة (تشغيلها) لتتمكن من التحكم في أقسامها الفرعية.
                      </div>
                    </div>
                  )}

                  {/* 3 Sub-Features Toggles */}
                  <div className="space-y-2.5 pt-1">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      الخيارات الفرعية للمادة
                    </h4>

                    {/* Sub-option 1: الدروس والشروحات */}
                    <div className={`border-2 rounded-2xl p-3.5 transition-all flex items-center justify-between gap-3 ${
                      subPaused
                        ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                        : lessonsOff
                        ? 'bg-rose-50/50 border-rose-300'
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-black text-sm text-slate-900">
                              الدروس والشروحات
                            </h5>
                            {lessonsOff && !subPaused && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                                متوقفة (قريباً)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            عرض الفهرس وشروحات الدروس التفاعلية
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={subPaused}
                        onClick={() => handleToggleLessons(selectedSubject.id, lessonsOff)}
                        className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 flex items-center ${
                          subPaused
                            ? 'bg-slate-200 cursor-not-allowed'
                            : lessonsOff
                            ? 'bg-rose-500 justify-end cursor-pointer'
                            : 'bg-emerald-500 justify-end cursor-pointer'
                        }`}
                        title={lessonsOff ? 'تشغيل الدروس' : 'إيقاف الدروس (قريباً)'}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-5 h-5 rounded-full bg-white shadow-md"
                        />
                      </button>
                    </div>

                    {/* Sub-option 2: الملخصات والمذكرات */}
                    <div className={`border-2 rounded-2xl p-3.5 transition-all flex items-center justify-between gap-3 ${
                      subPaused
                        ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                        : bookletsOff
                        ? 'bg-rose-50/50 border-rose-300'
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-black text-sm text-slate-900">
                              الملخصات والمذكرات
                            </h5>
                            {bookletsOff && !subPaused && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                                متوقفة (قريباً)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            استعراض وتحميل ملازم PDF والمذكرات
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={subPaused}
                        onClick={() => handleToggleBooklets(selectedSubject.id, bookletsOff)}
                        className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 flex items-center ${
                          subPaused
                            ? 'bg-slate-200 cursor-not-allowed'
                            : bookletsOff
                            ? 'bg-rose-500 justify-end cursor-pointer'
                            : 'bg-emerald-500 justify-end cursor-pointer'
                        }`}
                        title={bookletsOff ? 'تشغيل الملخصات' : 'إيقاف الملخصات (قريباً)'}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-5 h-5 rounded-full bg-white shadow-md"
                        />
                      </button>
                    </div>

                    {/* Sub-option 3: الواجبات المدرسية */}
                    <div className={`border-2 rounded-2xl p-3.5 transition-all flex items-center justify-between gap-3 ${
                      subPaused
                        ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                        : homeworksOff
                        ? 'bg-rose-50/50 border-rose-300'
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                          <ClipboardList className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-black text-sm text-slate-900">
                              الواجبات المدرسية
                            </h5>
                            {homeworksOff && !subPaused && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                                متوقفة (قريباً)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            واجبات المادة ورفع الحلول ونماذج الإجابة
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={subPaused}
                        onClick={() => handleToggleHomeworks(selectedSubject.id, homeworksOff)}
                        className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 flex items-center ${
                          subPaused
                            ? 'bg-slate-200 cursor-not-allowed'
                            : homeworksOff
                            ? 'bg-rose-500 justify-end cursor-pointer'
                            : 'bg-emerald-500 justify-end cursor-pointer'
                        }`}
                        title={homeworksOff ? 'تشغيل الواجبات' : 'إيقاف الواجبات (قريباً)'}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="w-5 h-5 rounded-full bg-white shadow-md"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end text-xs text-slate-500 shrink-0">
              <button
                type="button"
                onClick={closeSettings}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-black transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
