import React, { useState, useEffect, useRef } from 'react';
import { Subject, Lesson, SubjectBooklet, Homework, HomeworkSubmission, AVAILABLE_CLASSES, formatFileSize, AttachedFile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSubjectControls } from '../context/SubjectControlsContext';
import { LessonCard } from './LessonCard';
import { HomeworkSection } from './HomeworkSection';
import { ClassFilterDropdown } from './ClassFilterDropdown';
import { FilePreviewModal } from './FilePreviewModal';
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
  Lock,
  Share2,
  Check,
  Search,
  Image as ImageIcon,
  Eye,
  Upload,
  X
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
  initialSubView?: 'lessons' | 'booklets' | 'homework' | null;
  onSubViewChange?: (subView: 'lessons' | 'booklets' | 'homework' | null) => void;
  onBack: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  onToggleComplete: (id: string) => void;
  onOpenAddLesson: () => void;
  onOpenEditLesson?: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onAddBooklet: (booklet: Omit<SubjectBooklet, 'id' | 'createdAt'>) => void;
  onDeleteBooklet: (id: string) => void;
  onAddHomework?: (hw: Omit<Homework, 'id' | 'createdAt'>) => void;
  onUpdateHomework?: (hw: Homework) => void;
  onDeleteHomework?: (id: string) => void;
  completedLessonIds: string[];
  completedHomeworkIds?: string[];
  onToggleCompleteHomework?: (id: string) => void;
  submissions?: HomeworkSubmission[];
  onSubmitHomeworkSolution?: (sub: Omit<HomeworkSubmission, 'id' | 'submittedAt'>) => Promise<void>;
  onDeleteSubmission?: (submissionId: string) => Promise<void> | void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subject,
  lessons,
  booklets,
  homeworks = [],
  initialSubView = null,
  onSubViewChange,
  onBack,
  onSelectLesson,
  onToggleComplete,
  onOpenAddLesson,
  onOpenEditLesson,
  onDeleteLesson,
  onAddBooklet,
  onDeleteBooklet,
  onAddHomework,
  onUpdateHomework,
  onDeleteHomework,
  completedLessonIds,
  completedHomeworkIds = [],
  onToggleCompleteHomework,
  submissions = [],
  onSubmitHomeworkSolution,
  onDeleteSubmission
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, canManageSubject, setIsAuthModalOpen } = useAuth();
  const { isSubjectPaused, isLessonsPaused, isBookletsPaused, isHomeworksPaused } = useSubjectControls();

  const isSubjectActuallyPaused = !!subject.isComingSoon || isSubjectPaused(subject.id);
  const isLessonsActuallyPaused = isSubjectActuallyPaused || isLessonsPaused(subject.id);
  const isBookletsActuallyPaused = isSubjectActuallyPaused || isBookletsPaused(subject.id);
  const isHomeworksActuallyPaused = isSubjectActuallyPaused || isHomeworksPaused(subject.id);

  // Check if current user is authorized to add/edit/delete content for THIS specific subject
  const canEditCurrentSubject = canManageSubject(subject.id);

  // Sub-view: null = show main choices, 'lessons' = lessons page, 'booklets' = booklets page, 'homework' = homework page
  const [subView, setSubViewState] = useState<'lessons' | 'booklets' | 'homework' | null>(initialSubView);
  const [copiedLink, setCopiedLink] = useState(false);

  // Keep state synchronized with prop if it changes externally
  useEffect(() => {
    setSubViewState(initialSubView);
  }, [initialSubView]);

  const handleSubViewSelect = (newSubView: 'lessons' | 'booklets' | 'homework' | null) => {
    if (newSubView && !user) {
      setIsAuthModalOpen(true);
      return;
    }
    setSubViewState(newSubView);
    if (onSubViewChange) {
      onSubViewChange(newSubView);
    }
  };

  const handleShareSubject = () => {
    const urlToShare = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${subject.name} | زاد`,
        text: `مقرر ${subject.name} - منصة زاد التعليمية`,
        url: urlToShare
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(urlToShare);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };
  const [isAddBookletModalOpen, setIsAddBookletModalOpen] = useState(false);
  const [isDownloadingAllLessons, setIsDownloadingAllLessons] = useState(false);
  const [downloadingBookletId, setDownloadingBookletId] = useState<string | null>(null);
  const [showHomeworkSoonToast, setShowHomeworkSoonToast] = useState(false);
  const [showLessonsSoonToast, setShowLessonsSoonToast] = useState(false);
  const [showBookletsSoonToast, setShowBookletsSoonToast] = useState(false);

  // New booklet form state
  const [bookletTitle, setBookletTitle] = useState('');
  const [bookletPages, setBookletPages] = useState('');
  const [bookletDesc, setBookletDesc] = useState('');
  const [bookletFileName, setBookletFileName] = useState('');
  const [bookletFileSize, setBookletFileSize] = useState<string | undefined>();
  const [bookletFileType, setBookletFileType] = useState<'pdf' | 'png' | 'jpg'>('pdf');
  const [bookletImagePreview, setBookletImagePreview] = useState<string | null>(null);
  const [bookletFileDataUrl, setBookletFileDataUrl] = useState<string | undefined>();
  const [bookletTargetClasses, setBookletTargetClasses] = useState<string[]>(['all']);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingBookletFile, setIsDraggingBookletFile] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [contentSearchQuery, setContentSearchQuery] = useState<string>('');
  const bookletFileInputRef = useRef<HTMLInputElement>(null);

  // Preview modal for booklet (PDF or PNG)
  const [previewBooklet, setPreviewBooklet] = useState<SubjectBooklet | null>(null);

  const toggleBookletClass = (cls: string) => {
    if (cls === 'all') {
      setBookletTargetClasses(['all']);
      return;
    }
    setBookletTargetClasses((prev) => {
      const withoutAll = prev.filter((c) => c !== 'all');
      if (withoutAll.includes(cls)) {
        const next = withoutAll.filter((c) => c !== cls);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...withoutAll, cls];
      }
    });
  };

  const subjectLessons = lessons
    .filter((l) => l.subjectId === subject.id)
    .filter((l) => {
      if (selectedClassFilter === 'all') return true;
      if (!l.targetClasses || l.targetClasses.length === 0 || l.targetClasses.includes('all')) return true;
      return l.targetClasses.includes(selectedClassFilter);
    })
    .filter((l) => {
      if (!contentSearchQuery.trim()) return true;
      const q = contentSearchQuery.toLowerCase().trim();
      return (
        l.title.toLowerCase().includes(q) ||
        (l.summary && l.summary.toLowerCase().includes(q))
      );
    });

  const subjectBooklets = booklets
    .filter((b) => b.subjectId === subject.id)
    .filter((b) => {
      if (selectedClassFilter === 'all') return true;
      if (!b.targetClasses || b.targetClasses.length === 0 || b.targetClasses.includes('all')) return true;
      return b.targetClasses.includes(selectedClassFilter);
    })
    .filter((b) => {
      if (!contentSearchQuery.trim()) return true;
      const q = contentSearchQuery.toLowerCase().trim();
      return (
        b.title.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
      );
    });

  const subjectHomeworks = homeworks.filter((h) => h.subjectId === subject.id);

  // Check if homework is supported for this subject (Math, Digital Technology, Critical Thinking, English)
  const isHomeworkSupportedBase =
    subject.id === 'digi-1' ||
    subject.id === 'math-1' ||
    subject.id === 'math-2' ||
    subject.id === 'think-1' ||
    subject.id === 'eng-1' ||
    subject.name.includes('تقنية رقمية') ||
    subject.name.includes('الرقمية') ||
    subject.name.includes('رياضيات') ||
    subject.name.includes('التفكير الناقد') ||
    subject.name.includes('تفكير') ||
    subject.name.includes('إنجليزي') ||
    subject.name.includes('انجليزي') ||
    subject.name.toLowerCase().includes('english') ||
    subject.name.toLowerCase().includes('mega goal');

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

  const handleBookletFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileError(null);

    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    const isPng = file.type.includes('png') || file.name.toLowerCase().endsWith('.png');
    const isJpg = file.type.includes('jpeg') || file.type.includes('jpg') || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
    const isImage = file.type.includes('image') || isPng || isJpg;

    if (!isPdf && !isImage) {
      setFileError('يرجى اختيار ملف بصيغة PDF أو صورة PNG / JPG');
      return;
    }

    const typeKey = isPdf ? 'pdf' : isPng ? 'png' : 'jpg';
    setBookletFileType(typeKey);
    setBookletFileName(file.name);
    setBookletFileSize(formatFileSize(file.size));

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBookletFileDataUrl(dataUrl);
      if (isImage) {
        setBookletImagePreview(dataUrl);
        if (!bookletPages.trim()) {
          setBookletPages(isPng ? 'ملخص PNG' : 'صورة ملخص');
        }
      } else {
        setBookletImagePreview(null);
      }
    };
    reader.onerror = () => {
      setFileError('حدث خطأ أثناء قراءة الملف، يرجى المحاولة مرة أخرى.');
    };
    reader.readAsDataURL(file);
  };

  const handleCreateBooklet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookletTitle.trim()) return;

    let formattedPages = bookletPages.trim();
    if (!formattedPages) {
      if (bookletFileType === 'png') {
        formattedPages = 'ملخص PNG';
      } else if (bookletFileType === 'jpg') {
        formattedPages = 'صورة ملخص';
      } else {
        formattedPages = 'ملف PDF';
      }
    } else if (!formattedPages.includes('صفح') && !formattedPages.includes('ملخص') && !formattedPages.includes('PNG') && !formattedPages.includes('PDF')) {
      formattedPages = `${formattedPages} صفحة`;
    }

    const isImage = bookletFileType === 'png' || bookletFileType === 'jpg';
    const fallbackExt = bookletFileType === 'png' ? 'png' : bookletFileType === 'jpg' ? 'jpg' : 'pdf';

    onAddBooklet({
      subjectId: subject.id,
      title: bookletTitle.trim(),
      pagesCount: formattedPages,
      description: bookletDesc.trim() || (isImage ? 'ملخص مصور شامل لمفاهيم المقرر' : 'ملخص شامل ومذكرة لمفاهيم المقرر'),
      fileName: bookletFileName || `ملخص_${subject.name}.${fallbackExt}`,
      fileDataUrl: bookletFileDataUrl,
      fileSize: bookletFileSize,
      supervisorName: user?.name || 'مشرف المادة',
      targetClasses: bookletTargetClasses.length === 0 ? ['all'] : bookletTargetClasses
    });

    // Reset & Close
    setBookletTitle('');
    setBookletPages('');
    setBookletDesc('');
    setBookletFileName('');
    setBookletFileSize(undefined);
    setBookletFileType('pdf');
    setBookletImagePreview(null);
    setBookletFileDataUrl(undefined);
    setBookletTargetClasses(['all']);
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

      const isImage = booklet.fileName?.toLowerCase().endsWith('.png') ||
        booklet.fileName?.toLowerCase().endsWith('.jpg') ||
        booklet.fileName?.toLowerCase().endsWith('.jpeg') ||
        booklet.fileName?.toLowerCase().endsWith('.webp') ||
        urlToUse?.startsWith('data:image/');

      const ext = isImage ? (booklet.fileName?.split('.').pop() || 'png') : 'pdf';

      if (urlToUse) {
        triggerFileDownload(urlToUse, booklet.fileName || `${booklet.title}.${ext}`);
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
        className="space-y-4 text-right font-['IBM_Plex_Sans_Arabic',sans-serif]"
      >
        {/* Top Navigation: Return to all subjects + Share */}
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer group active:scale-95"
          >
            <ArrowRight className="w-4 h-4 text-sky-600 transition group-hover:-translate-x-0.5" />
            <span>رجوع للمواد</span>
          </motion.button>

          <button
            onClick={handleShareSubject}
            title="مشاركة رابط المادة"
            className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">تم نسخ الرابط!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-sky-600" />
                <span>مشاركة المادة</span>
              </>
            )}
          </button>
        </div>

        {/* Subject Header Banner */}
        <div
          className="p-6 md:p-8 rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_4px_20px_-6px_rgba(15,23,42,0.05)] space-y-2 relative overflow-hidden"
        >
          {/* Top highlight accent */}
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-sky-500 via-slate-900 to-indigo-500" />

          <div className="flex items-center gap-4 md:gap-5">
            <div
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl md:text-3xl shadow-sm text-white shrink-0 ring-1 ring-sky-400/20"
            >
              {subject.emoji || '📖'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold font-['Alexandria',sans-serif] text-slate-900">
                  {subject.name}
                </h2>
                {subject.isComingSoon && (
                  <span className="text-[11px] md:text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    قريباً
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                مقررات التعليم الثانوي • المسار المشترك
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice if applicable */}
        {isSubjectActuallyPaused && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 text-xs md:text-sm text-slate-800 font-medium flex items-center gap-3 shadow-2xs">
            <span className="text-base md:text-lg shrink-0 text-amber-600">⏳</span>
            <span>مادة {subject.name} متوقفة مؤقتاً وقادمة قريباً للجميع، وتظل كافة بياناتها محفوظة بأمان.</span>
          </div>
        )}

        {/* The Two Choices Cards: الدروس والملخصات فقط */}
        <div className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Option 1: الدروس */}
            <motion.div
              whileHover={isLessonsActuallyPaused ? {} : { y: -3, scale: 1.01 }}
              whileTap={isLessonsActuallyPaused ? {} : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={() => {
                if (isLessonsActuallyPaused) {
                  setShowLessonsSoonToast(true);
                  setTimeout(() => setShowLessonsSoonToast(false), 2500);
                  return;
                }
                handleSubViewSelect('lessons');
              }}
              className={`bg-white border rounded-3xl p-5 sm:p-6 shadow-2xs transition-all text-right flex items-center justify-between relative overflow-hidden ${
                isLessonsActuallyPaused
                  ? 'border-slate-200 opacity-85 cursor-pointer hover:border-sky-300'
                  : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50/50 cursor-pointer group'
              }`}
            >
              {showLessonsSoonToast && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xs flex items-center justify-center p-3 z-10 animate-fade-in text-center">
                  <span className="text-white text-xs sm:text-sm font-bold font-['Alexandria',sans-serif]">
                    قسم الدروس لمادة {subject.name} قريباً ⏳
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 text-white border border-slate-800 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
                  <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-bold font-['Alexandria',sans-serif] text-slate-900 group-hover:text-sky-700 transition">
                    الدروس
                  </h4>
                  {isLessonsActuallyPaused ? (
                    <span className="text-[10px] sm:text-xs font-bold text-sky-700 mt-0.5 inline-block">
                      متاح قريباً
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 mt-0.5 inline-block">
                      {subjectLessons.length} درس مسجل
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <ChevronLeft className="w-5 h-5 text-slate-400 transition group-hover:-translate-x-1 group-hover:text-slate-900" />
              </div>
            </motion.div>

            {/* Option 2: الملخصات */}
            <motion.div
              whileHover={isBookletsActuallyPaused ? {} : { y: -3, scale: 1.01 }}
              whileTap={isBookletsActuallyPaused ? {} : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={() => {
                if (isBookletsActuallyPaused) {
                  setShowBookletsSoonToast(true);
                  setTimeout(() => setShowBookletsSoonToast(false), 2500);
                  return;
                }
                handleSubViewSelect('booklets');
              }}
              className={`bg-white border rounded-3xl p-5 sm:p-6 shadow-2xs transition-all text-right flex items-center justify-between relative overflow-hidden ${
                isBookletsActuallyPaused
                  ? 'border-slate-200 opacity-85 cursor-pointer hover:border-emerald-300'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50 cursor-pointer group'
              }`}
            >
              {showBookletsSoonToast && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xs flex items-center justify-center p-3 z-10 animate-fade-in text-center">
                  <span className="text-white text-xs sm:text-sm font-bold font-['Alexandria',sans-serif]">
                    قسم الملخصات لمادة {subject.name} قريباً ⏳
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 text-white border border-slate-800 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-bold font-['Alexandria',sans-serif] text-slate-900 group-hover:text-emerald-700 transition">
                    الملخصات
                  </h4>
                  {isBookletsActuallyPaused ? (
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-700 mt-0.5 inline-block">
                      متاح قريباً
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 mt-0.5 inline-block">
                      {subjectBooklets.length} مذكرة وملخص
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <ChevronLeft className="w-5 h-5 text-slate-400 transition group-hover:-translate-x-1 group-hover:text-slate-900" />
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
        onBack={() => handleSubViewSelect(null)}
        onAddHomework={onAddHomework || (() => {})}
        onUpdateHomework={onUpdateHomework}
        onDeleteHomework={onDeleteHomework || (() => {})}
        completedHomeworkIds={completedHomeworkIds}
        onToggleCompleteHomework={onToggleCompleteHomework}
        canEdit={canEditCurrentSubject}
        submissions={submissions}
        onSubmitSolution={onSubmitHomeworkSolution}
        onDeleteSubmission={onDeleteSubmission}
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
            onClick={() => handleSubViewSelect(null)}
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

        {/* Action Row & Title */}
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
            {canEditCurrentSubject && (
              <button
                onClick={onOpenAddLesson}
                className="py-2 md:py-2.5 px-3.5 md:px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>إضافة درس</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Class Filter */}
        <div className="space-y-2">
          {/* Search by lesson title */}
          <div className="relative">
            <input
              type="text"
              value={contentSearchQuery}
              onChange={(e) => setContentSearchQuery(e.target.value)}
              placeholder="ابحث في شروحات المادة بالاسم..."
              className="w-full py-2.5 pr-10 pl-4 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>

          {/* Class Filter Dropdown */}
          <div className="flex items-center">
            <ClassFilterDropdown
              selectedClass={selectedClassFilter}
              onSelectClass={setSelectedClassFilter}
            />
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
              onSelect={onSelectLesson}
              onToggleComplete={onToggleComplete}
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
          onClick={() => handleSubViewSelect(null)}
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

      {/* Search & Class Filter */}
      <div className="space-y-2">
        {/* Search by booklet title */}
        <div className="relative">
          <input
            type="text"
            value={contentSearchQuery}
            onChange={(e) => setContentSearchQuery(e.target.value)}
            placeholder="ابحث في ملخصات المادة بالاسم..."
            className="w-full py-2.5 pr-10 pl-4 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </div>

        {/* Class Filter Dropdown */}
        <div className="flex items-center">
          <ClassFilterDropdown
            selectedClass={selectedClassFilter}
            onSelectClass={setSelectedClassFilter}
          />
        </div>
      </div>

      {/* Booklets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-5">
        {subjectBooklets.map((b) => {
          const isImage = b.fileName?.toLowerCase().endsWith('.png') ||
            b.fileName?.toLowerCase().endsWith('.jpg') ||
            b.fileName?.toLowerCase().endsWith('.jpeg') ||
            b.fileName?.toLowerCase().endsWith('.webp') ||
            b.fileDataUrl?.startsWith('data:image/');
          const isPng = b.fileName?.toLowerCase().endsWith('.png');

          return (
            <div
              key={b.id}
              className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition space-y-3 md:space-y-4 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isImage ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {isImage ? <ImageIcon className="w-5 h-5 md:w-6 md:h-6" /> : <FileCheck className="w-5 h-5 md:w-6 md:h-6" />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base md:text-lg">
                      {b.title}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-lg ${
                        isPng ? 'bg-purple-100 text-purple-800' : isImage ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isPng ? '🖼️ ملخص PNG' : isImage ? '🖼️ صورة ملخص' : '📄 ملف PDF'}
                      </span>
                      {b.pagesCount && (
                        <span className="text-[10px] md:text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                          {b.pagesCount}
                        </span>
                      )}
                      {b.fileSize && (
                        <span className="text-[10px] md:text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                          {b.fileSize}
                        </span>
                      )}
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

              {/* Action Buttons: Preview & Download */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setPreviewBooklet(b)}
                  className="py-2 md:py-2.5 px-3 md:px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="معاينة سريعة للملخص"
                >
                  <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-600" />
                  <span>معاينة</span>
                </button>

                <button
                  onClick={() => handleDownloadBooklet(b)}
                  disabled={downloadingBookletId === b.id}
                  className={`py-2 md:py-2.5 px-4 md:px-5 text-white rounded-xl text-xs md:text-sm font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60 ${
                    isImage ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {downloadingBookletId === b.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  )}
                  <span>
                    {downloadingBookletId === b.id
                      ? 'جاري التحميل...'
                      : isPng
                      ? 'تنزيل PNG'
                      : isImage
                      ? 'تنزيل الصورة'
                      : 'تنزيل PDF'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}

        {subjectBooklets.length === 0 && (
          <div className="col-span-full text-center py-12 md:py-16 bg-white rounded-3xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 md:w-10 md:h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs md:text-sm text-slate-500">لا توجد مذكرات أو ملخصات مضافة حالياً في هذه المادة</p>
          </div>
        )}
      </div>

      {/* Add Booklet Modal (For Supervisors / Teachers) */}
      <AnimatePresence>
        {isAddBookletModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['Tajawal',sans-serif]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md md:max-w-xl rounded-3xl p-6 md:p-8 shadow-2xl text-right space-y-4 md:space-y-5 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      إضافة ملخص أو مذكرة جديدة للمادة
                    </h3>
                    <p className="text-[11px] text-slate-400">يدعم ملفات PDF وصور الملخصات (PNG / JPG)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddBookletModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                    placeholder="مثال: ملخص شامل للفصل الأول - بصيغة PNG أو PDF"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    وصف أو عدد الصفحات (اختياري)
                  </label>
                  <input
                    type="text"
                    value={bookletPages}
                    onChange={(e) => setBookletPages(e.target.value)}
                    placeholder="مثال: 5 صفحات أو ملخص PNG أو مذكرة مراجعة"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Target Classes for Booklet */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      الفصول المستهدفة *
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {bookletTargetClasses.includes('all')
                        ? 'محدد لجميع الفصول (١/١ - ١/٧)'
                        : `${bookletTargetClasses.length} فصول محددة`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleBookletClass('all')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        bookletTargetClasses.includes('all')
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
                      }`}
                    >
                      جميع الفصول
                    </button>
                    {AVAILABLE_CLASSES.map((cls) => {
                      const isSelected = !bookletTargetClasses.includes('all') && bookletTargetClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => toggleBookletClass(cls)}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* File Upload Zone: PDF or PNG / JPG */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    إرفاق ملف الملخص (صورة PNG / JPG أو ملف PDF) *
                  </label>

                  <input
                    type="file"
                    ref={bookletFileInputRef}
                    accept=".pdf,application/pdf,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg"
                    onChange={(e) => handleBookletFileSelect(e.target.files)}
                    className="hidden"
                  />

                  {!bookletFileDataUrl ? (
                    <div
                      onClick={() => bookletFileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingBookletFile(true);
                      }}
                      onDragLeave={() => setIsDraggingBookletFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingBookletFile(false);
                        handleBookletFileSelect(e.dataTransfer.files);
                      }}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                        isDraggingBookletFile
                          ? 'border-purple-500 bg-purple-50/60'
                          : 'border-slate-200 hover:border-purple-400 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">اضغط لرفع ملخص أو اسحب الملف هنا</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          يدعم صور <strong className="text-purple-600 font-bold">PNG</strong> و JPG ومستندات PDF
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                            {bookletFileType === 'pdf' ? (
                              <FileText className="w-5 h-5" />
                            ) : (
                              <ImageIcon className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-purple-950 truncate">
                              {bookletFileName}
                            </p>
                            <p className="text-[10px] text-purple-700 font-medium">
                              صيغة {bookletFileType.toUpperCase()} {bookletFileSize ? `• ${bookletFileSize}` : ''}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setBookletFileDataUrl(undefined);
                            setBookletFileName('');
                            setBookletFileSize(undefined);
                            setBookletImagePreview(null);
                          }}
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                        >
                          إزالة الملف
                        </button>
                      </div>

                      {bookletImagePreview && (
                        <div className="rounded-xl overflow-hidden border border-purple-200 bg-white max-h-48 flex items-center justify-center p-1">
                          <img
                            src={bookletImagePreview}
                            alt="معاينة الملخص"
                            className="max-h-44 object-contain rounded-lg w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {fileError && <p className="text-[11px] text-rose-500 font-bold mt-1.5">{fileError}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddBookletModalOpen(false)}
                    className="py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    حفظ ونشر الملخص
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-screen interactive File Preview Modal for Booklets / Summaries (PNG or PDF) */}
      {previewBooklet && (
        <FilePreviewModal
          isOpen={!!previewBooklet}
          onClose={() => setPreviewBooklet(null)}
          title={previewBooklet.title}
          studentName={previewBooklet.supervisorName}
          files={[{
            name: previewBooklet.fileName || `${previewBooklet.title}.${previewBooklet.fileName?.toLowerCase().endsWith('.png') ? 'png' : 'pdf'}`,
            type: (previewBooklet.fileName?.toLowerCase().endsWith('.png') || previewBooklet.fileName?.toLowerCase().endsWith('.jpg') || previewBooklet.fileDataUrl?.startsWith('data:image/')) ? 'png' : 'pdf',
            size: previewBooklet.fileSize || previewBooklet.pagesCount || 'ملخص',
            dataUrl: previewBooklet.fileDataUrl,
            previewUrl: previewBooklet.fileDataUrl,
            fileId: previewBooklet.id,
            hasFile: true
          }]}
        />
      )}
    </motion.div>
  );
};
