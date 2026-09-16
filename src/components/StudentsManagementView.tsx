import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL, resolveStudentFullName, isFullNameValid } from '../context/AuthContext';
import { User, Lesson, Subject, Homework, HomeworkSubmission, AttachedFile, getSubmissionFiles } from '../types';
import {
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  GraduationCap,
  ClipboardList,
  ChevronLeft,
  ArrowRight,
  Download,
  Eye,
  X,
  SlidersHorizontal,
  RotateCcw,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerFileDownload } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';
import { FilePreviewModal } from './FilePreviewModal';
import { ClassFilterDropdown } from './ClassFilterDropdown';

interface StudentsManagementViewProps {
  allLessons?: Lesson[];
  allSubjects: Subject[];
  allHomeworks: Homework[];
  allSubmissions: HomeworkSubmission[];
  onSelectLesson?: (lesson: Lesson) => void;
}

export const StudentsManagementView: React.FC<StudentsManagementViewProps> = ({
  allLessons,
  allSubjects,
  allHomeworks,
  allSubmissions,
  onSelectLesson
}) => {
  const {
    user,
    registeredUsers,
    refreshUsers
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeStudentPage, setActiveStudentPage] = useState<User | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Filter & Sort State
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'not_submitted'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Unified File Preview Modal State
  const [previewFiles, setPreviewFiles] = useState<AttachedFile[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewStudentName, setPreviewStudentName] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Close filter popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUsers();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Helper to determine if a user should be displayed in the Students & Users list
  const isStudentUser = (u: User): boolean => {
    // Only filter out pure teachers/instructors so supervisors, assistants, admins & students all show up
    if (u.role === 'teacher') {
      return false;
    }
    if (
      u.jobTitle &&
      (u.jobTitle.startsWith('أ.') ||
        u.jobTitle.includes('معلم') ||
        u.jobTitle.includes('أستاذ') ||
        u.jobTitle.includes('مرشد') ||
        u.jobTitle.includes('المرشد')) &&
      !u.jobTitle.includes('مشرف') &&
      !u.jobTitle.includes('مساعد') &&
      !u.isAssistantAdmin &&
      !u.isSuperAdmin &&
      u.role !== 'supervisor'
    ) {
      return false;
    }
    return true;
  };

  // Strictly filter only genuine students
  const uniqueStudents = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of registeredUsers) {
      if (!u || !u.email) continue;
      if (!isStudentUser(u)) continue;
      const key = u.email.trim().toLowerCase();
      const resolvedName = resolveStudentFullName(u.email, u.name, registeredUsers);
      const isConfirmed = isFullNameValid(resolvedName);
      if (!map.has(key)) {
        map.set(key, { ...u, name: resolvedName, fullNameConfirmed: isConfirmed });
      }
    }
    for (const s of allSubmissions) {
      if (!s || !s.studentEmail) continue;
      const key = s.studentEmail.trim().toLowerCase();
      const resolvedName = resolveStudentFullName(s.studentEmail, s.studentName, registeredUsers);
      const isConfirmed = isFullNameValid(resolvedName);
      if (!map.has(key)) {
        const dummyUser: User = {
          id: s.studentId || `user-${key}`,
          name: resolvedName,
          email: key,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(resolvedName)}`,
          role: 'student',
          jobTitle: 'طالب',
          grade: 'أول ثانوي',
          fullNameConfirmed: isConfirmed
        };
        if (isStudentUser(dummyUser)) {
          map.set(key, dummyUser);
        }
      }
    }
    return Array.from(map.values());
  }, [registeredUsers, allSubmissions]);

  // Get student's submissions count
  const getStudentSubmissions = (u: User) => {
    const email = (u.email || '').toLowerCase().trim();
    return allSubmissions.filter(
      (s) =>
        (s.studentEmail && s.studentEmail.toLowerCase().trim() === email) ||
        (s.studentId && s.studentId === u.id) ||
        (s.studentName && u.name && s.studentName.trim() === u.name.trim())
    );
  };

  const getStudentSubmissionsCount = (u: User): number => {
    return getStudentSubmissions(u).length;
  };

  // Filtered & Sorted students
  const filteredUsers = useMemo(() => {
    let result = uniqueStudents;

    // 1. Class filter
    if (selectedClass && selectedClass !== 'all') {
      result = result.filter((u) => {
        // If student has submissions with matching class or student's class matches
        const studentSubs = getStudentSubmissions(u);
        const hasClassSub = studentSubs.some((sub) => {
          const hw = allHomeworks.find((h) => h.id === sub.homeworkId);
          return hw && (hw.targetClasses?.includes(selectedClass) || hw.targetClasses?.includes('all') || (hw as any).targetClass === selectedClass || (hw as any).classNumber === selectedClass);
        });
        const userClassMatches = (u as any).class === selectedClass || (u as any).section === selectedClass;
        return hasClassSub || userClassMatches || studentSubs.length > 0;
      });
    }

    // 2. Text Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter((u) => u.name.toLowerCase().includes(q));
    }

    // 3. Submission status filter (مسلم الواجب / لم يسلم)
    if (statusFilter === 'submitted') {
      result = result.filter((u) => getStudentSubmissionsCount(u) > 0);
    } else if (statusFilter === 'not_submitted') {
      result = result.filter((u) => getStudentSubmissionsCount(u) === 0);
    }

    // 4. Alphabetical sorting (أ إلى ي / ي إلى أ)
    return [...result].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'ar');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [uniqueStudents, selectedClass, searchQuery, statusFilter, sortOrder, allSubmissions, allHomeworks]);

  // Submission count metrics for the filter badges
  const totalSubmittedCount = useMemo(() => {
    return uniqueStudents.filter((u) => getStudentSubmissionsCount(u) > 0).length;
  }, [uniqueStudents, allSubmissions]);

  const totalNotSubmittedCount = useMemo(() => {
    return uniqueStudents.filter((u) => getStudentSubmissionsCount(u) === 0).length;
  }, [uniqueStudents, allSubmissions]);

  // Open Preview Modal for Student or Homework files
  const handleOpenPreview = (
    files: AttachedFile[],
    initialIndex: number = 0,
    studentName: string = '',
    title: string = 'معاينة الملف'
  ) => {
    if (!files || files.length === 0) return;
    setPreviewFiles(files);
    setPreviewInitialIndex(initialIndex);
    setPreviewStudentName(studentName);
    setPreviewTitle(title);
    setIsPreviewOpen(true);
  };

  // Safe file downloader with multi-layer fallback
  const handleDownloadFile = async (
    fileId?: string,
    dataUrl?: string,
    filename?: string
  ) => {
    const targetName = filename || 'ملف_الواجب';
    setDownloadingFileId(fileId || targetName);
    try {
      if (dataUrl) {
        triggerFileDownload(dataUrl, targetName);
        return;
      }
      if (fileId) {
        const cached = await getLargeFile(fileId);
        if (cached) {
          triggerFileDownload(cached, targetName);
          return;
        }
        const cloudUrl = await downloadFileFromCloud(fileId, undefined, targetName);
        if (cloudUrl) {
          triggerFileDownload(cloudUrl, targetName);
          return;
        }
      }
      alert('تعذر استرداد الملف السحابي. يرجى التأكد من اتصال الإنترنت أو رفع الملف مرة أخرى.');
    } catch (err) {
      console.warn('File download error:', err);
      alert('حدث خطأ أثناء تنزيل الملف.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Download all files attached to a submission
  const handleDownloadAllFiles = async (files: AttachedFile[]) => {
    if (!files || files.length === 0) return;
    for (const file of files) {
      await handleDownloadFile(file.fileId, file.dataUrl, file.name);
    }
  };

  // Click on student card
  const handleStudentClick = (u: User) => {
    setActiveStudentPage(u);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="space-y-4 md:space-y-5 text-right font-['IBM_Plex_Sans_Arabic',sans-serif]">
      {/* File Preview Modal (PDF and Image viewer directly in-browser full page) */}
      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        files={previewFiles}
        initialIndex={previewInitialIndex}
        studentName={previewStudentName}
        title={previewTitle}
      />

      <AnimatePresence initial={false}>
        {/* ---------------------------------------------------- */}
        {/* VIEW 1: FULL STUDENT HOMEWORKS PAGE (صفحة واجبات الطالب) */}
        {/* ---------------------------------------------------- */}
        {activeStudentPage ? (
          <motion.div
            key={`student-detail-${activeStudentPage.id || activeStudentPage.email}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="space-y-4 min-h-[60vh]"
          >
            {/* Header: Student Info Header & Icon-only Back Button */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl shadow-xs shrink-0 overflow-hidden">
                  {activeStudentPage.avatar ? (
                    <img
                      src={activeStudentPage.avatar}
                      alt={activeStudentPage.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="w-5 h-5" />
                  )}
                  {isFullNameValid(activeStudentPage.name) && (
                    <span className="absolute bottom-0.5 left-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white text-[9px] font-bold">
                      ✓
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {activeStudentPage.name}
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    {getStudentSubmissionsCount(activeStudentPage)} واجبات مسلّمة
                  </span>
                </div>
              </div>

              {/* Single Prominent Back Button (Icon Only) */}
              <button
                type="button"
                onClick={() => {
                  setIsPreviewOpen(false);
                  setActiveStudentPage(null);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className="p-2.5 sm:p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 transition flex items-center justify-center cursor-pointer shadow-2xs"
                title="الرجوع لقائمة الطلاب"
                aria-label="الرجوع لقائمة الطلاب"
              >
                <ArrowRight className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            {/* List of Submitted Homeworks by this student */}
            <div className="space-y-2.5">
              {getStudentSubmissions(activeStudentPage).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-6 space-y-2">
                  <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm sm:text-base font-bold text-slate-800">
                    لا توجد واجبات مسلّمة
                  </h4>
                  <p className="text-xs text-slate-400">
                    ستظهر هنا حلول الواجبات فور قيام الطالب برفعها وتسليمها
                  </p>
                </div>
              ) : (
                getStudentSubmissions(activeStudentPage).map((sub) => {
                  const hw = allHomeworks.find((h) => h.id === sub.homeworkId);
                  const studentFiles = getSubmissionFiles(sub);
                  const hasFiles = studentFiles.length > 0;
                  const homeworkTitle = hw?.title || `واجب صـ ${hw?.pageNumber || '–'} - سؤال ${hw?.questionNumber || '–'}` || 'واجب مدرسي';

                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl sm:rounded-3xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 text-right"
                    >
                      {/* ONLY Homework Title (No subject, notes, or date) */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                          {homeworkTitle}
                        </h3>
                      </div>

                      {/* Action buttons: ONLY 2 Icon-Only Buttons (View All, Download All) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 1. View All Icon Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!hasFiles) {
                              alert('لا توجد ملفات مرفقة مع هذا الواجب.');
                              return;
                            }
                            handleOpenPreview(
                              studentFiles,
                              0,
                              activeStudentPage.name,
                              homeworkTitle
                            );
                          }}
                          disabled={!hasFiles}
                          className="p-2.5 sm:p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-xl transition flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                          title="عرض الكل"
                          aria-label="عرض الكل"
                        >
                          <Eye className="w-4 h-4 text-slate-700" />
                        </button>

                        {/* 2. Download All Icon Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!hasFiles) {
                              alert('لا توجد ملفات مرفقة لتحميلها.');
                              return;
                            }
                            handleDownloadAllFiles(studentFiles);
                          }}
                          disabled={!hasFiles || Boolean(downloadingFileId)}
                          className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl transition flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                          title="تحميل الكل"
                          aria-label="تحميل الكل"
                        >
                          <Download className="w-4 h-4 text-sky-400" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : (
          /* ---------------------------------------------------- */
          /* VIEW 2: UNIFIED STUDENTS LIST */
          /* ---------------------------------------------------- */
          <motion.div
            key="students-list-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Header: Counter only + Refresh button */}
            <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
                  {uniqueStudents.length}
                </span>
                <ClassFilterDropdown
                  selectedClass={selectedClass}
                  onSelectClass={setSelectedClass}
                />
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer disabled:opacity-50 shadow-2xs"
                title="تحديث البيانات"
                aria-label="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            </div>

            {/* Search Bar + Simple Compact Filter Button */}
            <div className="flex items-center gap-2 w-full">
              {/* Search Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الطالب..."
                  className="w-full py-2.5 pr-10 pl-9 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs transition"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Button next to search */}
              <div className="relative shrink-0" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`h-[42px] px-3 sm:px-3.5 rounded-2xl border flex items-center gap-1.5 text-xs font-bold transition cursor-pointer shadow-2xs ${
                    statusFilter !== 'all' || sortOrder === 'desc'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="تصفية وترتيب الطلاب"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">تصفية</span>
                  {statusFilter !== 'all' && (
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  )}
                </button>

                {/* Filter Popover Dropdown */}
                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-64 bg-white rounded-2xl p-3 shadow-xl border border-slate-200 z-50 space-y-3 text-right"
                    >
                      {/* Section 1: الترتيب من أ إلى ي */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                          ترتيب الأسماء
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSortOrder('asc')}
                            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              sortOrder === 'asc'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                            }`}
                          >
                            <span>من أ إلى ي</span>
                            {sortOrder === 'asc' && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSortOrder('desc')}
                            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              sortOrder === 'desc'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                            }`}
                          >
                            <span>من ي إلى أ</span>
                            {sortOrder === 'desc' && <Check className="w-3 h-3 text-white" />}
                          </button>
                        </div>
                      </div>

                      <div className="h-px bg-slate-100" />

                      {/* Section 2: مسلم الواجب و لم يسلم */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                          حالة تسليم الواجبات
                        </span>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter('all');
                              setIsFilterOpen(false);
                            }}
                            className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              statusFilter === 'all'
                                ? 'bg-slate-100 text-slate-900 font-black'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>الكل</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {uniqueStudents.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter('submitted');
                              setIsFilterOpen(false);
                            }}
                            className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              statusFilter === 'submitted'
                                ? 'bg-emerald-50 text-emerald-800 font-black'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>مسلّم الواجب</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {totalSubmittedCount}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter('not_submitted');
                              setIsFilterOpen(false);
                            }}
                            className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              statusFilter === 'not_submitted'
                                ? 'bg-rose-50 text-rose-800 font-black'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span>لم يسلّم</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              {totalNotSubmittedCount}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Reset Filters */}
                      {(statusFilter !== 'all' || sortOrder !== 'asc') && (
                        <div className="pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter('all');
                              setSortOrder('asc');
                              setIsFilterOpen(false);
                            }}
                            className="w-full py-1.5 text-center text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>إعادة تعيين الفلترة</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Students List: ONLY Avatar with Checkmark if triple name, Student Name, and Arrow */}
            <div className="flex flex-col gap-2.5 w-full">
              {filteredUsers.map((u) => {
                const hasValidTripleName = isFullNameValid(u.name);

                return (
                  <motion.div
                    key={u.id || u.email}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.995 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    onClick={() => handleStudentClick(u)}
                    role="button"
                    className="group w-full rounded-2xl p-3 sm:p-3.5 transition-all duration-200 border flex items-center justify-between gap-3 text-right bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs cursor-pointer"
                  >
                    {/* Right Side: Avatar (with checkmark if triple name registered) + Student Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 sm:w-11 sm:h-11 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center text-base shadow-2xs shrink-0">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <GraduationCap className="w-5 h-5 text-slate-500" />
                        )}
                        {hasValidTripleName && (
                          <span
                            className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white text-[9px] font-black shadow-2xs"
                            title="الاسم الثلاثي مسجل ومؤكد"
                          >
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug truncate group-hover:text-sky-600 transition-colors">
                            {u.name}
                          </h3>
                          {u.isSuperAdmin && (
                            <span className="text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full shrink-0">
                              مشرف عام
                            </span>
                          )}
                          {!u.isSuperAdmin && u.isAssistantAdmin && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                              مساعد إداري
                            </span>
                          )}
                          {!u.isSuperAdmin && !u.isAssistantAdmin && u.role === 'supervisor' && (
                            <span className="text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full shrink-0">
                              مشرف
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Left Side: Arrow icon only */}
                    <div className="flex items-center justify-center text-slate-400 group-hover:text-slate-800 transition-colors shrink-0">
                      <ChevronLeft className="w-5 h-5" />
                    </div>
                  </motion.div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-6 space-y-2">
                  <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm sm:text-base font-bold text-slate-800">
                    لا توجد نتائج مطابقة
                  </h4>
                  <p className="text-xs text-slate-400">
                    جرب تغيير خيارات التصفية أو البحث
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
