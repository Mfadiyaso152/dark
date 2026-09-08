import React, { useState } from 'react';
import { Subject, Lesson, SubjectBooklet, Homework, HomeworkSubmission } from '../types';
import { useAuth } from '../context/AuthContext';
import { LessonCard } from './LessonCard';
import { HomeworkSection } from './HomeworkSection';
import {
  ArrowRight,
  BookOpen,
  FileText,
  Plus,
  Download,
  Trash2,
  FileCheck,
  ChevronLeft,
  MessageCircle,
  ClipboardList,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { downloadAllSummariesPDF, downloadBookletPDF, triggerFileDownload } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';

interface SubjectDetailViewProps {
  subject: Subject;
  lessons: Lesson[];
  booklets: SubjectBooklet[];
  homeworks?: Homework[];
  onBack: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  onToggleComplete: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onOpenAddLesson: () => void;
  onOpenEditLesson?: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onAddBooklet: (booklet: Omit<SubjectBooklet, 'id' | 'createdAt'>) => void;
  onDeleteBooklet: (id: string) => void;
  onAddHomework?: (hw: Omit<Homework, 'id' | 'createdAt'>) => void;
  onUpdateHomework?: (hw: Homework) => void;
  onDeleteHomework?: (id: string) => void;
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
  completedHomeworkIds?: string[];
  onToggleCompleteHomework?: (id: string) => void;
  submissions?: HomeworkSubmission[];
  onSubmitHomeworkSolution?: (sub: Omit<HomeworkSubmission, 'id' | 'submittedAt'>) => Promise<void>;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subject,
  lessons,
  booklets,
  homeworks = [],
  onBack,
  onSelectLesson,
  onToggleComplete,
  onToggleBookmark,
  onOpenAddLesson,
  onOpenEditLesson,
  onDeleteLesson,
  onAddBooklet,
  onDeleteBooklet,
  onAddHomework,
  onUpdateHomework,
  onDeleteHomework,
  completedLessonIds,
  bookmarkedLessonIds,
  completedHomeworkIds = [],
  onToggleCompleteHomework,
  submissions = [],
  onSubmitHomeworkSolution
}) => {
  const { user, canManageSubject } = useAuth();
  // Check if current user is authorized to add/edit/delete content for THIS specific subject
  const canEditCurrentSubject = canManageSubject(subject.id);

  // Sub-view: null = show main choices, 'lessons' = lessons page, 'booklets' = booklets page, 'homework' = homework page
  const [subView, setSubView] = useState<'lessons' | 'booklets' | 'homework' | null>(null);
  const [isAddBookletModalOpen, setIsAddBookletModalOpen] = useState(false);
  const [isDownloadingAllLessons, setIsDownloadingAllLessons] = useState(false);
  const [downloadingBookletId, setDownloadingBookletId] = useState<string | null>(null);
  const [showHomeworkSoonToast, setShowHomeworkSoonToast] = useState(false);

  // New booklet form state
  const [bookletTitle, setBookletTitle] = useState('');
  const [bookletPages, setBookletPages] = useState('');
  const [bookletDesc, setBookletDesc] = useState('');
  const [bookletFileName, setBookletFileName] = useState('');
  const [bookletFileDataUrl, setBookletFileDataUrl] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | null>(null);

  const subjectLessons = lessons.filter((l) => l.subjectId === subject.id);
  const subjectBooklets = booklets.filter((b) => b.subjectId === subject.id);
  const subjectHomeworks = homeworks.filter((h) => h.subjectId === subject.id);

  // Check if subject is Digital Technology or Math
  const isHomeworkSupported =
    subject.id === 'digi-1' ||
    subject.id === 'math-1' ||
    subject.id === 'math-2' ||
    subject.id === 'think-1' ||
    subject.name.includes('تقنية رقمية') ||
    subject.name.includes('الرقمية') ||
    subject.name.includes('رياضيات') ||
    subject.name.includes('التفكير الناقد') ||
    subject.name.includes('تفكير');

  const handleDownloadAllLessons = async () => {
    if (subjectLessons.length === 0) return;
    setIsDownloadingAllLessons(true);
    try {
      await downloadAllSummariesPDF(subjectLessons, [subject], 1, subject);
    } catch (err) {
      console.error('Error downloading all lessons:', err);
    } finally {
      setIsDownloadingAllLessons(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setBookletFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setBookletFileDataUrl(reader.result as string);
    };
    reader.onerror = () => {
      setFileError('حدث خطأ أثناء قراءة الملف، يرجى المحاولة مرة أخرى.');
    };
    reader.readAsDataURL(file);
  };

  const handleCreateBooklet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookletTitle.trim()) return;

    const formattedPages = bookletPages.trim()
      ? (bookletPages.includes('صفح') ? bookletPages.trim() : `${bookletPages.trim()} صفحة`)
      : 'غير محدد';

    onAddBooklet({
      subjectId: subject.id,
      title: bookletTitle.trim(),
      pagesCount: formattedPages,
      description: bookletDesc.trim() || 'ملخص شامل ومذكرة لمفاهيم المقرر',
      fileName: bookletFileName || `ملخص_${subject.name}.pdf`,
      fileDataUrl: bookletFileDataUrl,
      supervisorName: user?.name || 'مشرف المادة'
    });

    // Reset & Close
    setBookletTitle('');
    setBookletPages('');
    setBookletDesc('');
    setBookletFileName('');
    setBookletFileDataUrl(undefined);
    setIsAddBookletModalOpen(false);
  };

  const handleDownloadBooklet = async (booklet: SubjectBooklet) => {
    setDownloadingBookletId(booklet.id);
    try {
      let urlToUse = booklet.fileDataUrl;
      if (!urlToUse) {
        // First try local IndexedDB
        const stored = await getLargeFile(booklet.id);
        if (stored) {
          urlToUse = stored;
        } else {
          // Then fetch from cloud chunks in Firestore
          const cloudUrl = await downloadFileFromCloud(booklet.id);
          if (cloudUrl) urlToUse = cloudUrl;
        }
      }

      if (urlToUse) {
        triggerFileDownload(urlToUse, booklet.fileName || `${booklet.title}.pdf`);
      } else {
        // Generate authentic, high-quality PDF booklet
        await downloadBookletPDF(booklet, subject, subjectLessons);
      }
    } catch (err) {
      console.error('Failed to download booklet:', err);
    } finally {
      setDownloadingBookletId(null);
    }
  };

  // 1) Main Choices Screen: Gives user two distinct options to open
  if (!subView) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4 text-right font-['Tajawal',sans-serif]"
      >
        {/* Top Navigation: Return to all subjects */}
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer group active:scale-95"
          >
            <ArrowRight className="w-4 h-4 text-blue-600 transition group-hover:-translate-x-0.5" />
            <span>رجوع للمواد</span>
          </motion.button>
          <span className="text-xs font-bold text-slate-400">{subject.code}</span>
        </div>

        {/* Subject Header Banner */}
        <div
          className={`p-5 md:p-7 rounded-3xl border ${subject.lightBg || 'bg-[#EFF6FF]'} ${
            subject.borderColor || 'border-[#DBEAFE]'
          } shadow-xs space-y-2`}
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl ${
                subject.badgeBg || 'bg-[#3B82F6]'
              } flex items-center justify-center text-2xl md:text-3xl shadow-xs text-white shrink-0`}
            >
              {subject.emoji || '📖'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-xl md:text-2xl font-black ${subject.titleColor || 'text-[#1E3A8A]'}`}>
                  {subject.name}
                </h2>
                {subject.isComingSoon && (
                  <span className="text-[11px] md:text-xs px-2.5 py-0.5 rounded-full font-black bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                    قريباً
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice if applicable */}
        {subject.isComingSoon && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 md:p-4 text-xs md:text-sm text-amber-900 font-bold flex items-center gap-2.5 shadow-2xs">
            <span className="text-base md:text-lg shrink-0">⏳</span>
            <span>مادة {subject.name} قادمة قريباً، ويجري العمل على استكمال الدروس والمذكرات الخاصة بها.</span>
          </div>
        )}

        {/* The Two Choices Cards */}
        <div className="pt-1">
          <h3 className="text-xs md:text-sm font-bold text-slate-500 mb-3 md:mb-4 px-1">
            اختر القسم المطلوب للمتابعة:
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-6">
            {/* Option 1: الشروحات والدروس */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={() => setSubView('lessons')}
              className="bg-white hover:bg-blue-50/40 border-2 border-slate-200/90 hover:border-blue-500 rounded-3xl p-5 md:p-7 shadow-xs transition-all cursor-pointer group text-right flex flex-col justify-between"
            >
              <div className="space-y-3 md:space-y-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base md:text-lg font-black text-slate-900 group-hover:text-blue-600 transition">
                      الشروحات والدروس
                    </h4>
                    <span className="text-xs md:text-sm font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-xl">
                      {subjectLessons.length} درس
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    دروس وشروحات تفاعلية وملفات PDF
                  </p>
                </div>
              </div>

              <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-slate-100 flex items-center justify-between text-blue-600 font-black text-xs md:text-sm">
                <span>فتح صفحة الدروس</span>
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 transition group-hover:-translate-x-1" />
              </div>
            </motion.div>

            {/* Option 2: الملخصات والمذكرات */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={() => setSubView('booklets')}
              className="bg-white hover:bg-emerald-50/40 border-2 border-slate-200/90 hover:border-emerald-500 rounded-3xl p-5 md:p-7 shadow-xs transition-all cursor-pointer group text-right flex flex-col justify-between"
            >
              <div className="space-y-3 md:space-y-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base md:text-lg font-black text-slate-900 group-hover:text-emerald-600 transition">
                      الملخصات والمذكرات
                    </h4>
                    <span className="text-xs md:text-sm font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-xl">
                      {subjectBooklets.length} مذكرة
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    ملازم ومذكرات المراجعة الشاملة
                  </p>
                </div>
              </div>

              <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-slate-100 flex items-center justify-between text-emerald-600 font-black text-xs md:text-sm">
                <span>فتح صفحة الملخصات</span>
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 transition group-hover:-translate-x-1" />
              </div>
            </motion.div>

            {/* Option 3: الواجبات المدرسية */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={() => {
                if (isHomeworkSupported) {
                  setSubView('homework');
                } else {
                  setShowHomeworkSoonToast(true);
                  setTimeout(() => setShowHomeworkSoonToast(false), 2500);
                }
              }}
              className={`bg-white border-2 rounded-3xl p-5 md:p-7 shadow-xs transition-all text-right flex flex-col justify-between relative overflow-hidden ${
                isHomeworkSupported
                  ? 'hover:bg-purple-50/40 border-slate-200/90 hover:border-purple-500 cursor-pointer group'
                  : 'border-slate-200 opacity-90 cursor-pointer hover:border-amber-300'
              }`}
            >
              {/* Toast when clicked on unsupported subject */}
              {showHomeworkSoonToast && (
                <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-3 z-10 animate-fade-in text-center">
                  <span className="text-white text-xs md:text-sm font-bold">
                    قسم الواجبات لمادة {subject.name} قريباً ⏳
                  </span>
                </div>
              )}

              <div className="space-y-3 md:space-y-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base md:text-lg font-black text-slate-900 group-hover:text-purple-600 transition">
                      الواجبات المدرسية
                    </h4>
                    {isHomeworkSupported ? (
                      <span className="text-xs md:text-sm font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-xl">
                        {subjectHomeworks.length} واجب
                      </span>
                    ) : (
                      <span className="text-[10px] md:text-xs font-black bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-xl flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>قريباً</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {isHomeworkSupported
                      ? 'الصفحات والأسئلة وتواريخ التسليم'
                      : 'متاح قريباً لبقية المواد'}
                  </p>
                </div>
              </div>

              <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-slate-100 flex items-center justify-between font-black text-xs md:text-sm">
                {isHomeworkSupported ? (
                  <>
                    <span className="text-purple-600">فتح صفحة الواجبات</span>
                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-purple-600 transition group-hover:-translate-x-1" />
                  </>
                ) : (
                  <>
                    <span className="text-amber-700">متاح قريباً</span>
                    <Lock className="w-4 h-4 text-amber-600" />
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2) Homework Page Screen
  if (subView === 'homework') {
    return (
      <HomeworkSection
        subject={subject}
        homeworks={homeworks}
        onBack={() => setSubView(null)}
        onAddHomework={onAddHomework || (() => {})}
        onUpdateHomework={onUpdateHomework}
        onDeleteHomework={onDeleteHomework || (() => {})}
        completedHomeworkIds={completedHomeworkIds}
        onToggleCompleteHomework={onToggleCompleteHomework}
        canEdit={canEditCurrentSubject}
        submissions={submissions}
        onSubmitSolution={onSubmitHomeworkSolution}
      />
    );
  }

  // 3) Lessons Page Screen
  if (subView === 'lessons') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4 text-right font-['Tajawal',sans-serif]"
      >
        {/* Top Navigation: Return to Choices Screen */}
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setSubView(null)}
            className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer group active:scale-95"
          >
            <ArrowRight className="w-4 h-4 text-blue-600 transition group-hover:-translate-x-0.5" />
            <span>رجوع لخيارات المادة</span>
          </motion.button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              {subject.name} • {subjectLessons.length} درس
            </span>
          </div>
        </div>

        {/* Action Row & Title with Download All */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-blue-50 border border-blue-100 p-4 md:p-5 rounded-2xl md:rounded-3xl">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-black text-blue-950">شروحات ودروس المنهج</h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadAllLessons}
              disabled={isDownloadingAllLessons || subjectLessons.length === 0}
              className="py-2 md:py-2.5 px-3.5 md:px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="تنزيل كامل الشروحات والدروس كملف PDF"
            >
              {isDownloadingAllLessons ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
              )}
              <span>{isDownloadingAllLessons ? 'جاري تجهيز الملف...' : 'تنزيل كامل الدروس والشروحات (PDF)'}</span>
            </button>

            {canEditCurrentSubject && (
              <button
                onClick={onOpenAddLesson}
                className="py-2 md:py-2.5 px-3 md:px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>إضافة درس</span>
              </button>
            )}
          </div>
        </div>

        {/* Lessons List (Each card shows ONLY the title and download button) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {subjectLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              subject={subject}
              isCompleted={completedLessonIds.includes(lesson.id)}
              isBookmarked={bookmarkedLessonIds.includes(lesson.id)}
              onSelect={onSelectLesson}
              onToggleComplete={onToggleComplete}
              onToggleBookmark={onToggleBookmark}
              onEdit={canEditCurrentSubject ? onOpenEditLesson : undefined}
              onDelete={canEditCurrentSubject ? onDeleteLesson : undefined}
            />
          ))}

          {subjectLessons.length === 0 && (
            <div className="col-span-full text-center py-12 md:py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs md:text-sm text-slate-500">لا توجد شروحات مضافة حالياً في هذه المادة</p>
            </div>
          )}
        </div>

        {/* WhatsApp Group Direct Button */}
        <a
          id="whatsapp-lessons-btn"
          href="https://chat.whatsapp.com/E8lRfoLDghq3syUGzeBfl7?s=cl&p=i&mlu=4&ilr=4"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 md:py-3.5 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-2xl font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
          <span>الدخول لقروب الواتساب</span>
        </a>
      </motion.div>
    );
  }

  // 3) Booklets Page Screen
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 md:space-y-6 text-right font-['Tajawal',sans-serif]"
    >
      {/* Top Navigation: Return to Choices Screen */}
      <div className="flex items-center justify-between gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setSubView(null)}
          className="py-2 md:py-2.5 px-3.5 md:px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs md:text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer group active:scale-95"
        >
          <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 transition group-hover:-translate-x-0.5" />
          <span>رجوع لخيارات المادة</span>
        </motion.button>

        <span className="text-xs md:text-sm font-bold text-slate-500">
          {subject.name} • {subjectBooklets.length} مذكرة
        </span>
      </div>

      {/* Action Row & Title */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-emerald-50 border border-emerald-100 p-4 md:p-5 rounded-2xl md:rounded-3xl">
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-emerald-950">الملخصات والمذكرات</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEditCurrentSubject && (
            <button
              onClick={() => setIsAddBookletModalOpen(true)}
              className="py-2 md:py-2.5 px-3 md:px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>إضافة ملزمة</span>
            </button>
          )}
        </div>
      </div>

      {/* Booklets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-5">
        {subjectBooklets.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition space-y-3 md:space-y-4 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm sm:text-base md:text-lg">
                    {b.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] md:text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                      📄 {b.pagesCount}
                    </span>
                    <span className="text-[10px] md:text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">
                      إشراف: {b.supervisorName}
                    </span>
                  </div>
                </div>
              </div>

              {canEditCurrentSubject && (
                <button
                  onClick={() => onDeleteBooklet(b.id)}
                  className="p-1.5 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="حذف المذكرة"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => handleDownloadBooklet(b)}
                disabled={downloadingBookletId === b.id}
                className="py-2 md:py-2.5 px-4 md:px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {downloadingBookletId === b.id ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                )}
                <span>{downloadingBookletId === b.id ? 'جاري التنزيل...' : 'تنزيل PDF'}</span>
              </button>
            </div>
          </div>
        ))}

        {subjectBooklets.length === 0 && (
          <div className="col-span-full text-center py-12 md:py-16 bg-white rounded-3xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 md:w-10 md:h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs md:text-sm text-slate-500">لا توجد مذكرات مضافة حالياً في هذه المادة</p>
          </div>
        )}
      </div>

      {/* Add Booklet Modal (For Supervisors) */}
      <AnimatePresence>
        {isAddBookletModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md md:max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl text-right space-y-4 md:space-y-5"
            >
              <h3 className="text-base font-black text-slate-900">
                إضافة ملخص أو مذكرة جديدة للمادة
              </h3>

              <form onSubmit={handleCreateBooklet} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عنوان المذكرة / الملخص *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookletTitle}
                    onChange={(e) => setBookletTitle(e.target.value)}
                    placeholder="مثال: مذكرة شاملة لمقرر كيمياء 1"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد الصفحات
                  </label>
                  <input
                    type="text"
                    value={bookletPages}
                    onChange={(e) => setBookletPages(e.target.value)}
                    placeholder="اكتب عدد الصفحات (مثال: 5)"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    إرفاق ملف المذكرة (PDF)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-600 file:ml-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                  />
                  {bookletFileName && (
                    <p className="text-[11px] text-emerald-600 font-bold mt-1">
                      تم اختيار: {bookletFileName}
                    </p>
                  )}
                  {fileError && <p className="text-[11px] text-rose-500 mt-1">{fileError}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddBookletModalOpen(false)}
                    className="py-2 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                  >
                    حفظ ونشر المذكرة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
