import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_USER, resolveStudentFullName, isFullNameValid } from '../context/AuthContext';
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
  FileCheck,
  Calendar,
  AlertCircle,
  BookOpen,
  HelpCircle,
  Image as ImageIcon,
  Eye,
  X,
  SlidersHorizontal,
  FileText,
  Clock,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerFileDownload } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';
import { formatGregorianDate } from '../utils/dateFormatter';
import { FilePreviewModal } from './FilePreviewModal';

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
    isSuperAdmin,
    registeredUsers,
    refreshUsers,
    canManageSubject
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeStudentPage, setActiveStudentPage] = useState<User | null>(null);
  const [noHomeworkToast, setNoHomeworkToast] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Filter & Sort State
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

  // Helper to determine if a user is purely a student
  const isStudentUser = (u: User): boolean => {
    const emailLower = (u.email || '').toLowerCase().trim();
    if (u.isSuperAdmin || emailLower === SUPER_ADMIN_EMAIL.toLowerCase() || emailLower === 'mfb.15.f@gmail.com') {
      return false;
    }
    if (u.isAssistantAdmin || u.role === 'supervisor' || (u.jobTitle && (u.jobTitle.includes('مشرف') || u.jobTitle.includes('إدارة')))) {
      return false;
    }
    if (u.role === 'teacher') {
      return false;
    }
    if (
      u.jobTitle &&
      (u.jobTitle.startsWith('أ.') ||
        u.jobTitle.includes('معلم') ||
        u.jobTitle.includes('أستاذ') ||
        u.jobTitle.includes('مرشد') ||
        u.jobTitle.includes('المرشد') ||
        (u.jobTitle !== 'طالب' && u.jobTitle !== ''))
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

    // 1. Text Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter((u) => u.name.toLowerCase().includes(q));
    }

    // 2. Submission status filter (مسلم الواجب / لم يسلم)
    if (statusFilter === 'submitted') {
      result = result.filter((u) => getStudentSubmissionsCount(u) > 0);
    } else if (statusFilter === 'not_submitted') {
      result = result.filter((u) => getStudentSubmissionsCount(u) === 0);
    }

    // 3. Alphabetical sorting (أ إلى ي / ي إلى أ)
    return [...result].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'ar');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [uniqueStudents, searchQuery, statusFilter, sortOrder, allSubmissions]);

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
        const cloudUrl = await downloadFileFromCloud(fileId);
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

  const isImageFile = (fileName?: string, dataUrl?: string) => {
    if (dataUrl?.startsWith('data:image/')) return true;
    if (!fileName) return false;
    return /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileName);
  };

  // Click on student card
  const handleStudentClick = (u: User) => {
    setActiveStudentPage(u);
  };

  return (
    <div className="space-y-4 md:space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* File Preview Modal (PDF and Image viewer directly in-browser) */}
      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        files={previewFiles}
        initialIndex={previewInitialIndex}
        studentName={previewStudentName}
        title={previewTitle}
      />

      <AnimatePresence mode="wait">
        {/* ---------------------------------------------------- */}
        {/* VIEW 1: FULL STUDENT HOMEWORKS PAGE (صفحة واجبات الطالب) */}
        {/* ---------------------------------------------------- */}
        {activeStudentPage ? (
          <motion.div
            key="student-detail-page"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4 md:space-y-6"
          >
            {/* Header: Exactly ONE Single Back Button & Student Info Header */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0 overflow-hidden">
                  {activeStudentPage.avatar ? (
                    <img
                      src={activeStudentPage.avatar}
                      alt={activeStudentPage.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      واجبات الطالب: {activeStudentPage.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-black border border-purple-200">
                      {getStudentSubmissionsCount(activeStudentPage)} واجبات مسلّمة
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    استعراض ومعاينة حلول الواجبات المسلّمة وملفات الـ PDF مباشرة بدون تحميل
                  </p>
                </div>
              </div>

              {/* SINGLE Prominent Back Button */}
              <button
                onClick={() => setActiveStudentPage(null)}
                className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer shadow-2xs self-start sm:self-auto"
                title="الرجوع لقائمة الطلاب"
              >
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                <span>الرجوع لقائمة الطلاب</span>
              </button>
            </div>

            {/* List of Submitted Homeworks by this student */}
            <div className="space-y-3.5">
              {getStudentSubmissions(activeStudentPage).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-6 space-y-2">
                  <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm sm:text-base font-black text-slate-800">
                    لم يقم الطالب ({activeStudentPage.name}) بتسليم أي واجبات بعد
                  </h4>
                  <p className="text-xs text-slate-400">
                    ستظهر هنا حلول الواجبات فور قيام الطالب برفعها وتسليمها
                  </p>
                </div>
              ) : (
                getStudentSubmissions(activeStudentPage).map((sub) => {
                  const hw = allHomeworks.find((h) => h.id === sub.homeworkId);
                  const subject = hw ? allSubjects.find((s) => s.id === hw.subjectId) : undefined;
                  const studentFiles = getSubmissionFiles(sub);
                  const hasStudentFiles = studentFiles.length > 0;

                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-3.5"
                    >
                      {/* Top Row: Subject Tag & Submission Date & Ended Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/70 text-xs font-black flex items-center gap-1.5">
                            <span>{subject?.emoji || '📖'}</span>
                            <span>{subject?.name || 'مقرر دراسي'}</span>
                          </span>
                          {hw?.dueDate && (
                            <span className="text-xs text-slate-500 flex items-center gap-1 font-bold">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>تاريخ الواجب: {hw.dueDate}</span>
                            </span>
                          )}
                          {hw?.isClosed && (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-black border border-rose-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-rose-600" />
                              <span>واجب منتهي</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تم التسليم: {formatGregorianDate(sub.submittedAt)}</span>
                        </span>
                      </div>

                      {/* Assignment Title & Details */}
                      <div className="space-y-1.5 pt-1">
                        <h3 className="font-black text-slate-900 text-sm sm:text-base">
                          {hw?.title || `واجب صـ ${hw?.pageNumber || '–'} - سؤال ${hw?.questionNumber || '–'}`}
                        </h3>

                        {hw && (
                          <div className="grid grid-cols-2 gap-2 text-xs max-w-sm">
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                              <span>صفحة: <strong className="text-slate-800">{hw.pageNumber}</strong></span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                              <HelpCircle className="w-4 h-4 text-purple-600" />
                              <span>سؤال: <strong className="text-slate-800">{hw.questionNumber}</strong></span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Student Notes if any */}
                      {sub.notes && (
                        <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-2xl text-xs space-y-0.5">
                          <span className="font-bold text-indigo-900 block">ملاحظات الطالب مع الحل:</span>
                          <p className="text-slate-700 leading-relaxed">{sub.notes}</p>
                        </div>
                      )}

                      {/* Student Attached Files: Multi-file preview & download support */}
                      {hasStudentFiles ? (
                        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                              <FileCheck className="w-4 h-4 text-emerald-600" />
                              <span>ملفات الحل المرفقة من الطالب ({studentFiles.length}):</span>
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenPreview(
                                  studentFiles,
                                  0,
                                  activeStudentPage.name,
                                  `${hw?.title || 'واجب'} - حل ${activeStudentPage.name}`
                                )
                              }
                              className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>معاينة الكل بدون تحميل</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {studentFiles.map((file, fIdx) => {
                              const isImg = isImageFile(file.name, file.dataUrl);
                              return (
                                <div
                                  key={file.fileId || fIdx}
                                  className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs shadow-2xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isImg ? (
                                      <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                                    ) : (
                                      <FileText className="w-4 h-4 text-red-500 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-800 truncate" title={file.name}>
                                        {file.name}
                                      </p>
                                      {file.size && (
                                        <p className="text-[10px] text-slate-400">{file.size}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenPreview(
                                          studentFiles,
                                          fIdx,
                                          activeStudentPage.name,
                                          `${file.name} - ${activeStudentPage.name}`
                                        )
                                      }
                                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                      title="معاينة الملف مباشرة"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">معاينة</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadFile(file.fileId, file.dataUrl, file.name)
                                      }
                                      disabled={downloadingFileId === (file.fileId || file.name)}
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                      title="تحميل الملف"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">تحميل</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400">
                          لم يتم إرفاق أي ملفات أو صور مع حل هذا الواجب.
                        </div>
                      )}

                      {/* Teacher Model Solution Link if attached */}
                      {hw?.solutionFile?.hasFile && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                          <span className="text-slate-500 font-bold">الحل النموذجي المرفق من المعلم:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenPreview(
                                  [hw.solutionFile!],
                                  0,
                                  'المعلم',
                                  `${hw.title || 'واجب'} - الحل النموذجي`
                                )
                              }
                              className="py-1 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>معاينة النموذج</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadFile(
                                  hw.solutionFile?.fileId,
                                  hw.solutionFile?.dataUrl,
                                  hw.solutionFile?.name || 'الحل_النموذجي.pdf'
                                )
                              }
                              className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>تحميل</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : (
          /* ---------------------------------------------------- */
          /* VIEW 2: UNIFIED STUDENTS LIST WITH FILTER BUTTON */
          /* ---------------------------------------------------- */
          <motion.div
            key="students-list-view"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4 md:space-y-6"
          >
            {/* Toast Notice */}
            <AnimatePresence>
              {noHomeworkToast && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>{noHomeworkToast}</span>
                  </div>
                  <button
                    onClick={() => setNoHomeworkToast(null)}
                    className="text-amber-700 hover:text-amber-900 font-bold text-xs cursor-pointer"
                  >
                    إغلاق
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header Banner */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <span>خدمة الطلاب</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {filteredUsers.length} من {uniqueStudents.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    اضغط على أي طالب لاستعراض حلول واجباته وملفات الـ PDF المرفقة
                  </p>
                </div>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                <span>تحديث</span>
              </button>
            </div>

            {/* Search Bar + Simple Compact Filter Button (زر صغير جمب البحث) */}
            <div className="flex items-center gap-2 w-full">
              {/* Search Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الطالب..."
                  className="w-full py-3 pr-11 pl-9 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
                />
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute right-3.5 top-3.5" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Button next to search (زر الفلترة الصغير) */}
              <div className="relative shrink-0" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`h-[46px] px-3 sm:px-3.5 rounded-2xl border flex items-center gap-1.5 text-xs font-bold transition cursor-pointer shadow-2xs ${
                    statusFilter !== 'all' || sortOrder === 'desc'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="تصفية وترتيب الطلاب"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">تصفية</span>
                  {statusFilter !== 'all' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
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
                        <span className="text-[11px] font-black text-slate-400 block mb-1.5">
                          ترتيب الأسماء
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSortOrder('asc')}
                            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              sortOrder === 'asc'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                            }`}
                          >
                            <span>من أ إلى ي</span>
                            {sortOrder === 'asc' && <CheckCircle className="w-3 h-3 text-indigo-600" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSortOrder('desc')}
                            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              sortOrder === 'desc'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                            }`}
                          >
                            <span>من ي إلى أ</span>
                            {sortOrder === 'desc' && <CheckCircle className="w-3 h-3 text-indigo-600" />}
                          </button>
                        </div>
                      </div>

                      <div className="h-px bg-slate-100" />

                      {/* Section 2: مسلم الواجب و لم يسلم */}
                      <div>
                        <span className="text-[11px] font-black text-slate-400 block mb-1.5">
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
                                ? 'bg-indigo-50 text-indigo-700 font-black'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>الكل (عرض جميع الطلاب)</span>
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

            {/* Active filter pills if any */}
            {statusFilter !== 'all' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-bold">التصفية النشطة:</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
                  <span>{statusFilter === 'submitted' ? 'مسلّم الواجب' : 'لم يسلّم الواجب'}</span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="hover:text-indigo-950 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}

            {/* Stacked Cards: Formatted just like Subject Cards */}
            <div className="flex flex-col gap-3 md:gap-3.5 w-full">
              {filteredUsers.map((u) => {
                const subsCount = getStudentSubmissionsCount(u);

                return (
                  <motion.div
                    key={u.id || u.email}
                    whileHover={{ y: -2, scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    onClick={() => handleStudentClick(u)}
                    role="button"
                    className="group w-full rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-4.5 transition-all duration-200 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right relative overflow-hidden bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.99]"
                  >
                    {/* Right Side: Icon & Student Name */}
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className="w-12 h-12 md:w-13 md:h-13 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-xs shrink-0 overflow-hidden">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <GraduationCap className="w-6 h-6 md:w-7 md:h-7" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-base sm:text-lg md:text-xl text-slate-900 leading-tight truncate group-hover:text-indigo-600 transition-colors">
                            {u.name}
                          </h3>
                          {isFullNameValid(u.name) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              الاسم الثلاثي ✓
                            </span>
                          )}
                        </div>

                        {/* Number of submitted homeworks pill */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              subsCount > 0
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            <span>{subsCount > 0 ? `${subsCount} واجبات تم إرسالها` : 'لم يرسل واجبات'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Left Side: View Arrow / Action */}
                    <div className="flex items-center gap-1 text-xs font-black text-indigo-600 group-hover:-translate-x-1.5 transition-transform self-end sm:self-center">
                      <span>{subsCount > 0 ? 'عرض الواجبات' : 'التفاصيل'}</span>
                      <ChevronLeft className="w-4 h-4" />
                    </div>
                  </motion.div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-6 space-y-2">
                  <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm sm:text-base font-black text-slate-800">
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
