import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_USER, resolveStudentFullName, isFullNameValid } from '../context/AuthContext';
import { User, Lesson, Subject, Homework, HomeworkSubmission, AttachedFile, getSubmissionFiles, StudentSubjectPerformance } from '../types';
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
  Check,
  Calendar,
  Clock,
  TrendingUp,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerFileDownload } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';
import {
  formatGregorianDate,
  formatGregorianNumericWithDay,
  formatSubmissionDateTime
} from '../utils/dateFormatter';
import { FilePreviewModal } from './FilePreviewModal';
import { ClassFilterDropdown } from './ClassFilterDropdown';
import { TeacherGradesManagementView } from './TeacherGradesManagementView';

interface StudentsManagementViewProps {
  allLessons?: Lesson[];
  allSubjects: Subject[];
  allHomeworks: Homework[];
  allSubmissions: HomeworkSubmission[];
  performances?: StudentSubjectPerformance[];
  onSavePerformance?: (perf: StudentSubjectPerformance) => Promise<void> | void;
  onSelectLesson?: (lesson: Lesson) => void;
}

export const StudentsManagementView: React.FC<StudentsManagementViewProps> = ({
  allLessons,
  allSubjects,
  allHomeworks,
  allSubmissions,
  performances = [],
  onSavePerformance,
  onSelectLesson
}) => {
  const {
    user,
    registeredUsers,
    refreshUsers,
    canManageSubject,
    isSuperAdmin,
    isAssistantAdmin
  } = useAuth();

  const isGlobalAdminOrSupervisor =
    isSuperAdmin ||
    isAssistantAdmin ||
    user?.role === 'supervisor' ||
    user?.jobTitle === 'مشرف مساعد' ||
    (user?.email && user.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase());

  // Submissions visible to the current teacher/supervisor (teacher only sees their assigned subject's submissions)
  const visibleSubmissions = useMemo(() => {
    if (isGlobalAdminOrSupervisor) {
      return allSubmissions;
    }
    return allSubmissions.filter((sub) => {
      if (!sub) return false;
      const hw = allHomeworks.find((h) => h.id === sub.homeworkId);
      const subjectId = sub.subjectId || hw?.subjectId;
      return canManageSubject(subjectId);
    });
  }, [allSubmissions, allHomeworks, canManageSubject, isGlobalAdminOrSupervisor]);

  // Homeworks visible to current user (teacher only sees their subject's homeworks)
  const visibleHomeworks = useMemo(() => {
    if (isGlobalAdminOrSupervisor) {
      return allHomeworks;
    }
    return allHomeworks.filter((hw) => canManageSubject(hw.subjectId));
  }, [allHomeworks, canManageSubject, isGlobalAdminOrSupervisor]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeStudentPage, setActiveStudentPage] = useState<User | null>(null);
  const [studentSubView, setStudentSubView] = useState<'submissions' | 'grades'>('submissions');
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Filter & Sort State
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'not_submitted'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'date_desc' | 'date_asc'>('asc');
  const [studentDetailDateSort, setStudentDetailDateSort] = useState<'desc' | 'asc'>('desc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Unified File Preview Modal State
  const [previewFiles, setPreviewFiles] = useState<AttachedFile[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewStudentName, setPreviewStudentName] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showGradesComingSoon, setShowGradesComingSoon] = useState(false);

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
    // Always include Main Supervisor / Super Admin
    if (u.email && u.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return true;
    }
    if (u.isSuperAdmin) {
      return true;
    }
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

  // Strictly filter only genuine students & include Main Supervisor
  const uniqueStudents = useMemo(() => {
    const map = new Map<string, User>();

    // 1. Always inject Main Supervisor first so he is guaranteed to be in the Students list
    const superAdminKey = SUPER_ADMIN_EMAIL.toLowerCase();
    const foundSuper = registeredUsers.find((u) => u.email?.toLowerCase().trim() === superAdminKey) || SUPER_ADMIN_USER;
    const resolvedSuperName = resolveStudentFullName(superAdminKey, foundSuper.name || SUPER_ADMIN_USER.name, registeredUsers);
    const cleanSuperName = resolvedSuperName.replace(/\s*\(المشرف الأساسي\)/g, '').trim();
    map.set(superAdminKey, {
      ...SUPER_ADMIN_USER,
      ...foundSuper,
      name: cleanSuperName,
      fullNameConfirmed: true
    });

    // 1.1 Always inject currently logged in user if admin/supervisor so they can see themselves in the list
    if (user && user.email) {
      const userKey = user.email.trim().toLowerCase();
      if (!map.has(userKey)) {
        const resolvedCurrentName = resolveStudentFullName(userKey, user.name, registeredUsers);
        map.set(userKey, {
          ...user,
          email: userKey,
          name: resolvedCurrentName,
          fullNameConfirmed: true
        });
      }
    }

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

  // Get student's submissions count (strictly scoped to teacher's subject)
  const getStudentSubmissions = (u: User) => {
    const email = (u.email || '').toLowerCase().trim();
    return visibleSubmissions.filter(
      (s) =>
        (s.studentEmail && s.studentEmail.toLowerCase().trim() === email) ||
        (s.studentId && s.studentId === u.id) ||
        (s.studentName && u.name && s.studentName.trim() === u.name.trim())
    );
  };

  const getStudentSubmissionsCount = (u: User): number => {
    return getStudentSubmissions(u).length;
  };

  // Helper to get student's latest submission timestamp for date sorting
  const getStudentLatestTimestamp = (u: User): number => {
    const studentSubs = getStudentSubmissions(u);
    if (studentSubs.length === 0) return 0;
    let maxTs = 0;
    for (const sub of studentSubs) {
      const hw = visibleHomeworks.find((h) => h.id === sub.homeworkId) || allHomeworks.find((h) => h.id === sub.homeworkId);
      const dateStr = sub.submittedAt || hw?.dueDate || '';
      if (dateStr) {
        const ts = new Date(dateStr).getTime() || 0;
        if (ts > maxTs) maxTs = ts;
      }
    }
    return maxTs;
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
          const hw = visibleHomeworks.find((h) => h.id === sub.homeworkId) || allHomeworks.find((h) => h.id === sub.homeworkId);
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

    // 4. Sorting (أبجدي / تاريخ التسليم الأحدث / تاريخ التسليم الأقدم)
    return [...result].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name, 'ar');
      }
      if (sortOrder === 'desc') {
        return b.name.localeCompare(a.name, 'ar');
      }
      if (sortOrder === 'date_desc') {
        const tsA = getStudentLatestTimestamp(a);
        const tsB = getStudentLatestTimestamp(b);
        if (tsA !== tsB) return tsB - tsA; // الأحدث إلى الأقدم
        return a.name.localeCompare(b.name, 'ar');
      }
      if (sortOrder === 'date_asc') {
        const tsA = getStudentLatestTimestamp(a);
        const tsB = getStudentLatestTimestamp(b);
        if (tsA !== tsB) return tsA - tsB; // الأقدم إلى الأحدث
        return a.name.localeCompare(b.name, 'ar');
      }
      return 0;
    });
  }, [uniqueStudents, selectedClass, searchQuery, statusFilter, sortOrder, visibleSubmissions, visibleHomeworks, allHomeworks]);

  // Submission count metrics for the filter badges
  const totalSubmittedCount = useMemo(() => {
    return uniqueStudents.filter((u) => getStudentSubmissionsCount(u) > 0).length;
  }, [uniqueStudents, visibleSubmissions]);

  const totalNotSubmittedCount = useMemo(() => {
    return uniqueStudents.filter((u) => getStudentSubmissionsCount(u) === 0).length;
  }, [uniqueStudents, visibleSubmissions]);

  // Active student detail submissions sorted by date
  const activeStudentSubmissionsSorted = useMemo(() => {
    if (!activeStudentPage) return [];
    const subs = getStudentSubmissions(activeStudentPage);
    return [...subs].sort((a, b) => {
      const hwA = visibleHomeworks.find((h) => h.id === a.homeworkId) || allHomeworks.find((h) => h.id === a.homeworkId);
      const hwB = visibleHomeworks.find((h) => h.id === b.homeworkId) || allHomeworks.find((h) => h.id === b.homeworkId);
      const timeA = new Date(a.submittedAt || hwA?.dueDate || 0).getTime() || 0;
      const timeB = new Date(b.submittedAt || hwB?.dueDate || 0).getTime() || 0;
      if (studentDetailDateSort === 'asc') {
        return timeA - timeB;
      } else {
        return timeB - timeA;
      }
    });
  }, [activeStudentPage, visibleSubmissions, visibleHomeworks, allHomeworks, studentDetailDateSort]);

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
    setStudentSubView('submissions');
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
          studentSubView === 'grades' ? (
            <TeacherGradesManagementView
              key={`student-grades-${activeStudentPage.id || activeStudentPage.email}`}
              student={activeStudentPage}
              allSubjects={allSubjects}
              performances={performances}
              onSavePerformance={onSavePerformance || (async () => {})}
              onBack={() => setStudentSubView('submissions')}
            />
          ) : (
          <motion.div
            key={`student-detail-${activeStudentPage.id || activeStudentPage.email}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="space-y-4 min-h-[60vh]"
          >
            {/* Header: Student Info Header & Academic Level Button + Back Button */}
            <div className="glass-subject-vessel rounded-3xl p-4 sm:p-5 border border-white/90 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
              <div className="absolute top-0 inset-x-6 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/70 text-slate-900 border border-white/90 flex items-center justify-center text-xl shadow-2xs shrink-0 overflow-hidden backdrop-blur-md">
                  {activeStudentPage.avatar ? (
                    <img
                      src={activeStudentPage.avatar}
                      alt={activeStudentPage.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
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
                  <span className="text-xs text-slate-600 font-medium">
                    {getStudentSubmissionsCount(activeStudentPage)} واجبات مسلّمة
                  </span>
                </div>
              </div>

              {/* Action Buttons: Academic Level button NEXT TO Back Button (مقفل مؤقتاً ويظهر إشعار قريباً) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowGradesComingSoon(true);
                  }}
                  className="py-2 sm:py-2.5 px-3 sm:px-4 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 hover:from-sky-700 hover:to-indigo-800 active:scale-95 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-white/20 text-xs sm:text-sm font-bold"
                  title="المستوى الدراسي (قريباً)"
                >
                  <TrendingUp className="w-4 h-4 text-sky-200" />
                  <span>المستوى الدراسي</span>
                  <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-bold">
                    قريباً
                  </span>
                </button>

                {/* Single Prominent Back Button (Icon Only) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setActiveStudentPage(null);
                    setStudentSubView('submissions');
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                  className="p-2.5 sm:p-3 rounded-2xl glass-subject-vessel hover:bg-white/80 active:scale-95 text-slate-800 transition flex items-center justify-center cursor-pointer shadow-xs border border-white/90"
                  title="الرجوع لقائمة الطلاب"
                  aria-label="الرجوع لقائمة الطلاب"
                >
                  <ArrowRight className="w-5 h-5 text-slate-800" />
                </button>
              </div>
            </div>

            {/* List Header with Date Sort Selector */}
            {activeStudentSubmissionsSorted.length > 0 && (
              <div className="flex items-center justify-between gap-2.5 px-1 pt-1">
                <span className="text-xs font-bold text-slate-700">
                  الواجبات المسلّمة ({activeStudentSubmissionsSorted.length})
                </span>
                <select
                  value={studentDetailDateSort}
                  onChange={(e) => setStudentDetailDateSort(e.target.value as 'desc' | 'asc')}
                  className="py-1.5 px-3 bg-white/80 hover:bg-white text-slate-800 border border-white/90 rounded-2xl text-xs font-bold shadow-2xs focus:outline-none cursor-pointer transition"
                >
                  <option value="desc">تاريخ التسليم: الأحدث إلى الأقدم</option>
                  <option value="asc">تاريخ التسليم: الأقدم إلى الأحدث</option>
                </select>
              </div>
            )}

            {/* List of Submitted Homeworks by this student */}
            <div className="space-y-2.5">
              {activeStudentSubmissionsSorted.length === 0 ? (
                <div className="text-center py-16 glass-subject-vessel rounded-3xl border border-white/85 shadow-xs p-6 space-y-2">
                  <ClipboardList className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-sm sm:text-base font-bold text-slate-800">
                    لا توجد واجبات مسلّمة
                  </h4>
                  <p className="text-xs text-slate-500">
                    ستظهر هنا حلول الواجبات فور قيام الطالب برفعها وتسليمها
                  </p>
                </div>
              ) : (
                activeStudentSubmissionsSorted.map((sub) => {
                  const hw = allHomeworks.find((h) => h.id === sub.homeworkId);
                  const studentFiles = getSubmissionFiles(sub);
                  const hasFiles = studentFiles.length > 0;
                  const homeworkTitle = hw?.title || `واجب صـ ${hw?.pageNumber || '–'} - سؤال ${hw?.questionNumber || '–'}` || 'واجب مدرسي';
                  const submissionTime = sub.submittedAt;
                  const formattedSubmissionTime = formatSubmissionDateTime(submissionTime) || formatGregorianDate(submissionTime);
                  const exactDueDate = hw?.dueDate;

                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-subject-vessel rounded-2xl sm:rounded-3xl p-4 border border-white/90 shadow-xs hover:border-white transition-all flex items-center justify-between gap-3 text-right relative overflow-hidden"
                    >
                      <div className="absolute top-0 inset-x-4 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
                      {/* Homework Title & Exact Submission Time */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug font-['Alexandria',sans-serif]">
                            {homeworkTitle}
                          </h3>
                          {formattedSubmissionTime ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-emerald-50/90 text-emerald-800 border border-emerald-200/80 text-xs font-bold shadow-2xs backdrop-blur-md shrink-0">
                              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>بتاريخ: {formattedSubmissionTime}</span>
                            </span>
                          ) : exactDueDate ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-white/70 text-slate-700 border border-white/90 text-xs font-bold shadow-2xs backdrop-blur-md shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span>{formatGregorianDate(exactDueDate)}</span>
                            </span>
                          ) : null}
                        </div>
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
                          className="p-2.5 sm:p-3 glass-subject-vessel hover:bg-white/80 active:scale-95 text-slate-800 rounded-2xl transition flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs border border-white/90"
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
                          className="p-2.5 sm:p-3 bg-slate-900/90 hover:bg-slate-900 active:scale-95 text-white rounded-2xl transition flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs border border-white/20 backdrop-blur-md"
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
        )) : (
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
            <div className="glass-subject-vessel rounded-3xl p-3.5 sm:p-4 border border-white/90 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
              <div className="absolute top-0 inset-x-6 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-2xl bg-white/70 text-slate-900 border border-white/90 shadow-2xs backdrop-blur-md">
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
                className="p-2.5 sm:p-3 glass-subject-vessel hover:bg-white/80 active:scale-95 text-slate-800 rounded-2xl text-xs font-bold transition flex items-center justify-center cursor-pointer disabled:opacity-50 shadow-xs border border-white/90"
                title="تحديث البيانات"
                aria-label="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-600' : 'text-slate-700'}`} />
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
                  className="w-full py-3 pr-11 pl-10 glass-subject-vessel border border-white/90 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-xs transition"
                />
                <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3.5 top-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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
                  className={`h-[44px] px-3.5 sm:px-4 rounded-2xl border flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
                    statusFilter !== 'all' || sortOrder === 'desc'
                      ? 'glass-subject-vessel text-slate-950 border-white ring-1 ring-sky-500/30'
                      : 'glass-subject-vessel text-slate-800 border-white/90 hover:bg-white/80'
                  }`}
                  title="تصفية وترتيب الطلاب"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                  <span className="hidden sm:inline">تصفية</span>
                  {statusFilter !== 'all' && (
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
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
                      className="absolute left-0 mt-2 w-64 glass-subject-vessel rounded-3xl p-4 shadow-2xl border border-white/95 z-50 space-y-3 text-right bg-white/95 backdrop-blur-2xl"
                    >
                      {/* Section 1: الترتيب (الأسماء وتاريخ التسليم) */}
                      <div>
                        <span className="text-[11px] font-black text-slate-500 block mb-1.5">
                          ترتيب الطلاب
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          <button
                            type="button"
                            onClick={() => setSortOrder('asc')}
                            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              sortOrder === 'asc'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white/60 text-slate-700 hover:bg-white/80 border border-white/80'
                            }`}
                          >
                            <span>من أ إلى ي</span>
                            {sortOrder === 'asc' && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSortOrder('desc')}
                            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              sortOrder === 'desc'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white/60 text-slate-700 hover:bg-white/80 border border-white/80'
                            }`}
                          >
                            <span>من ي إلى أ</span>
                            {sortOrder === 'desc' && <Check className="w-3 h-3 text-white" />}
                          </button>
                        </div>

                        <span className="text-[11px] font-black text-slate-500 block mb-1.5">
                          ترتيب بحسب تاريخ التسليم
                        </span>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => setSortOrder('date_desc')}
                            className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              sortOrder === 'date_desc'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white/60 text-slate-700 hover:bg-white/80 border border-white/80'
                            }`}
                          >
                            <span>تاريخ التسليم: الأحدث إلى الأقدم</span>
                            {sortOrder === 'date_desc' && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSortOrder('date_asc')}
                            className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              sortOrder === 'date_asc'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white/60 text-slate-700 hover:bg-white/80 border border-white/80'
                            }`}
                          >
                            <span>تاريخ التسليم: الأقدم إلى الأحدث</span>
                            {sortOrder === 'date_asc' && <Check className="w-3 h-3 text-white" />}
                          </button>
                        </div>
                      </div>

                      <div className="h-px bg-white/80" />

                      {/* Section 2: مسلم الواجب و لم يسلم */}
                      <div>
                        <span className="text-[11px] font-black text-slate-500 block mb-1.5">
                          حالة تسليم الواجبات
                        </span>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter('all');
                              setIsFilterOpen(false);
                            }}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              statusFilter === 'all'
                                ? 'bg-white text-slate-950 font-black shadow-2xs border border-white/90'
                                : 'text-slate-700 hover:bg-white/60'
                            }`}
                          >
                            <span>الكل</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                              {uniqueStudents.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter('submitted');
                              setIsFilterOpen(false);
                            }}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              statusFilter === 'submitted'
                                ? 'bg-emerald-500/15 text-emerald-950 font-black border border-emerald-500/20 shadow-2xs'
                                : 'text-slate-700 hover:bg-white/60'
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
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              statusFilter === 'not_submitted'
                                ? 'bg-rose-500/15 text-rose-950 font-black border border-rose-500/20 shadow-2xs'
                                : 'text-slate-700 hover:bg-white/60'
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
                        <div className="pt-1 border-t border-white/80">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter('all');
                              setSortOrder('asc');
                              setIsFilterOpen(false);
                            }}
                            className="w-full py-1.5 text-center text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer"
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
                    whileHover={{ y: -2, scale: 1.008 }}
                    whileTap={{ scale: 0.992 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    onClick={() => handleStudentClick(u)}
                    role="button"
                    className="group w-full rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 transition-all duration-200 border flex items-center justify-between gap-3 text-right glass-subject-vessel border-white/90 hover:border-white shadow-xs hover:shadow-md cursor-pointer relative overflow-hidden"
                  >
                    {/* Specular Highlight */}
                    <div className="absolute top-0 inset-x-6 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

                    {/* Right Side: Avatar (with checkmark if triple name registered) + Student Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 sm:w-11 sm:h-11 bg-white/70 text-slate-700 rounded-2xl flex items-center justify-center text-base shadow-2xs shrink-0 border border-white/90 backdrop-blur-md">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          <GraduationCap className="w-5 h-5 text-indigo-600" />
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
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug truncate group-hover:text-sky-700 transition-colors font-['Alexandria',sans-serif]">
                            {u.name}
                          </h3>
                          {u.isSuperAdmin && (
                            <span className="text-[10px] font-black bg-purple-500/15 text-purple-900 border border-purple-500/25 px-2 py-0.5 rounded-full shrink-0 backdrop-blur-md">
                              مشرف عام
                            </span>
                          )}
                          {!u.isSuperAdmin && u.isAssistantAdmin && (
                            <span className="text-[10px] font-black bg-amber-500/15 text-amber-900 border border-amber-500/25 px-2 py-0.5 rounded-full shrink-0 backdrop-blur-md">
                              مساعد إداري
                            </span>
                          )}
                          {!u.isSuperAdmin && !u.isAssistantAdmin && u.role === 'supervisor' && (
                            <span className="text-[10px] font-black bg-sky-500/15 text-sky-900 border border-sky-500/25 px-2 py-0.5 rounded-full shrink-0 backdrop-blur-md">
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
                <div className="text-center py-16 glass-subject-vessel rounded-3xl border border-white/85 shadow-xs p-6 space-y-2">
                  <GraduationCap className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-sm sm:text-base font-bold text-slate-800">
                    لا توجد نتائج مطابقة
                  </h4>
                  <p className="text-xs text-slate-500">
                    جرب تغيير خيارات التصفية أو البحث
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coming Soon Notification Modal for Academic Level */}
      <AnimatePresence>
        {showGradesComingSoon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['IBM_Plex_Sans_Arabic',sans-serif]">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4 border border-slate-100 relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mx-auto shadow-sm">
                <TrendingUp className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold font-['Alexandria',sans-serif] text-slate-900">
                  خدمة المستوى الدراسي
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  خدمة المستوى الدراسي ورصد الدرجات قيد التجهيز والتطوير وستتوفر قريباً للمعلمين والطلاب! ⏳
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowGradesComingSoon(false)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  حسناً، فهمت
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
