import React, { useState, useMemo } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL, SUPER_ADMIN_USER } from '../context/AuthContext';
import { User, Lesson, Subject, Homework, HomeworkSubmission, USER_JOB_OPTIONS } from '../types';
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
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerFileDownload } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';

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

  const isViewerSuperOrAssistant =
    isSuperAdmin ||
    user?.role === 'supervisor' ||
    user?.jobTitle === 'مشرف مساعد' ||
    (user?.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeStudentPage, setActiveStudentPage] = useState<User | null>(null);
  const [noHomeworkToast, setNoHomeworkToast] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<{ url: string; name: string } | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUsers();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Strictly deduplicate users
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of registeredUsers) {
      if (!u || !u.email) continue;
      const key = u.email.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, u);
      } else {
        const existing = map.get(key)!;
        if (u.isSuperAdmin || key === SUPER_ADMIN_EMAIL.toLowerCase()) {
          map.set(key, {
            ...existing,
            ...u,
            isSuperAdmin: true,
            role: 'supervisor'
          });
        }
      }
    }

    // Always ensure the main supervisor (المشرف الأساسي) is in the list
    const superKey = SUPER_ADMIN_EMAIL.toLowerCase();
    if (!map.has(superKey)) {
      map.set(superKey, SUPER_ADMIN_USER);
    }

    return Array.from(map.values());
  }, [registeredUsers]);

  // Visible users in students service: All genuine students, student supervisors, AND the main supervisor.
  // Other teachers are excluded so teachers don't see other teachers.
  const visibleStudentsAndSupervisors = useMemo(() => {
    return uniqueUsers.filter((u) => {
      const emailLower = (u.email || '').toLowerCase().trim();
      const isSuper = u.isSuperAdmin || emailLower === SUPER_ADMIN_EMAIL.toLowerCase();

      // The main supervisor (المشرف الأساسي) is explicitly visible to teachers and everyone!
      if (isSuper) return true;

      // Filter out teachers (معلمين) so teachers only see students, supervisors, and the main supervisor
      const isTeacher =
        u.role === 'teacher' ||
        (!!u.jobTitle && u.jobTitle.startsWith('أ.')) ||
        (u.email && user?.role === 'teacher' && u.email.toLowerCase() === user.email.toLowerCase());

      if (isTeacher) return false;

      // Regular students AND student supervisors are visible!
      return true;
    }).sort((a, b) => {
      const aIsSuper = a.isSuperAdmin || (a.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      const bIsSuper = b.isSuperAdmin || (b.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      if (aIsSuper && !bIsSuper) return -1;
      if (!aIsSuper && bIsSuper) return 1;
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [uniqueUsers, user]);

  // Filtered students according to search
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return visibleStudentsAndSupervisors;
    return visibleStudentsAndSupervisors.filter((u) => {
      const matchesName = u.name.toLowerCase().includes(q);
      // Only super admin can search by email
      const matchesEmail = isSuperAdmin && u.email.toLowerCase().includes(q);
      return matchesName || matchesEmail;
    });
  }, [visibleStudentsAndSupervisors, searchQuery, isSuperAdmin]);

  // Get student's submissions count (scoped to teacher's subject if teacher)
  const getStudentSubmissions = (u: User) => {
    const email = (u.email || '').toLowerCase().trim();
    const subs = allSubmissions.filter(
      (s) =>
        (s.studentEmail && s.studentEmail.toLowerCase().trim() === email) ||
        (s.studentId && s.studentId === u.id)
    );
    if (isViewerSuperOrAssistant) {
      return subs;
    }
    return subs.filter((s) => {
      const hw = allHomeworks.find((h) => h.id === s.homeworkId);
      return hw ? canManageSubject(hw.subjectId) : false;
    });
  };

  const getStudentSubmissionsCount = (u: User): number => {
    return getStudentSubmissions(u).length;
  };

  // Click on student card: if has submitted homework -> enter student homework page; else show alert message
  const handleStudentClick = (u: User) => {
    const subsCount = getStudentSubmissionsCount(u);
    if (subsCount === 0) {
      setNoHomeworkToast(`الطالب (${u.name}) لم يرسل أي واجب بعد`);
      setTimeout(() => setNoHomeworkToast(null), 3500);
      return;
    }
    setActiveStudentPage(u);
  };

  const isImageFile = (fileName?: string, dataUrl?: string) => {
    if (dataUrl?.startsWith('data:image/')) return true;
    if (!fileName) return false;
    return /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileName);
  };

  const handleDownloadPdf = async (fileId?: string, dataUrl?: string, filename?: string) => {
    const targetName = filename || 'ملف_الواجب';
    setDownloadingFileId(fileId || targetName);
    try {
      let urlToDownload = dataUrl;
      if (!urlToDownload && fileId) {
        urlToDownload = (await getLargeFile(fileId)) || (await downloadFileFromCloud(fileId)) || undefined;
      }
      if (urlToDownload) {
        triggerFileDownload(urlToDownload, targetName);
      } else {
        alert('تعذر استرداد الملف.');
      }
    } catch (err) {
      console.warn('File download error:', err);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handlePreviewImage = async (fileId?: string, dataUrl?: string, filename?: string) => {
    let url = dataUrl;
    if (!url && fileId) {
      url = (await getLargeFile(fileId)) || (await downloadFileFromCloud(fileId)) || undefined;
    }
    if (url) {
      setPreviewImageUrl({ url, name: filename || 'صورة الواجب' });
    } else {
      alert('تعذر تحميل الصورة للمعاينة.');
    }
  };

  // ----------------------------------------------------
  // VIEW 1: FULL STUDENT HOMEWORKS PAGE (صفحة واجبات الطالب)
  // ----------------------------------------------------
  if (activeStudentPage) {
    const studentSubs = getStudentSubmissions(activeStudentPage);

    return (
      <div className="space-y-4 md:space-y-6 text-right font-['Tajawal',sans-serif]">
        {/* Back Button & Student Info Header */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setActiveStudentPage(null)}
              className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0 shadow-2xs"
              title="الرجوع لقائمة الطلاب"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0 overflow-hidden">
              {activeStudentPage.avatar ? (
                <img
                  src={activeStudentPage.avatar}
                  alt={activeStudentPage.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <GraduationCap className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  {activeStudentPage.isSuperAdmin || (activeStudentPage.email && activeStudentPage.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())
                    ? `واجبات المشرف الأساسي: ${activeStudentPage.name}`
                    : (activeStudentPage.role === 'supervisor' ? `واجبات المشرف: ${activeStudentPage.name}` : `واجبات الطالب: ${activeStudentPage.name}`)}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-black border border-purple-200">
                  {studentSubs.length} واجبات مرسلة
                </span>
              </div>
              <p className="text-xs text-slate-500">
                استعراض حلول الواجبات المسلّمة وملفات الـ PDF المرفقة
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveStudentPage(null)}
            className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>الرجوع للطلاب</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* List of Submitted Homeworks by this student */}
        <div className="space-y-3.5">
          {studentSubs.map((sub) => {
            const hw = allHomeworks.find((h) => h.id === sub.homeworkId);
            const subject = hw ? allSubjects.find((s) => s.id === hw.subjectId) : undefined;
            const hasSolutionFile = !!sub.attachedFile?.hasFile;

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-3"
              >
                {/* Subject Tag & Submission Date */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/70 text-xs font-black flex items-center gap-1.5">
                      <span>{subject?.emoji || '📖'}</span>
                      <span>{subject?.name || 'مقرر دراسي'}</span>
                    </span>
                    {hw?.dueDate && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>تاريخ استحقاق الواجب: {hw.dueDate}</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم التسليم: {new Date(sub.submittedAt).toLocaleDateString('ar-SA')}</span>
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

                {/* Solution File Download/View (PDF or Image) */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {hasSolutionFile ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {isImageFile(sub.attachedFile?.name, sub.attachedFile?.dataUrl) && (
                        <button
                          type="button"
                          onClick={() =>
                            handlePreviewImage(
                              sub.attachedFile?.fileId,
                              sub.attachedFile?.dataUrl,
                              sub.attachedFile?.name
                            )
                          }
                          className="py-2 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-4 h-4 text-indigo-600" />
                          <span>معاينة صورة الحل</span>
                        </button>
                      )}

                      <button
                        onClick={() =>
                          handleDownloadPdf(
                            sub.attachedFile?.fileId,
                            sub.attachedFile?.dataUrl,
                            sub.attachedFile?.name || `${activeStudentPage.name}_حل_واجب`
                          )
                        }
                        disabled={downloadingFileId === (sub.attachedFile?.fileId || sub.attachedFile?.name)}
                        className="py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
                      >
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span>تحميل {isImageFile(sub.attachedFile?.name, sub.attachedFile?.dataUrl) ? 'الصورة' : 'الملف'} ({sub.attachedFile?.name})</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">لم يتم إرفاق ملف أو صورة للحل</span>
                  )}

                  {hw?.solutionFile?.hasFile && (
                    <div className="flex items-center gap-2">
                      {isImageFile(hw.solutionFile?.name, hw.solutionFile?.dataUrl) && (
                        <button
                          type="button"
                          onClick={() =>
                            handlePreviewImage(
                              hw.solutionFile?.fileId,
                              hw.solutionFile?.dataUrl,
                              hw.solutionFile?.name
                            )
                          }
                          className="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-purple-600" />
                          <span>معاينة النموذج</span>
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleDownloadPdf(
                            hw.solutionFile?.fileId,
                            hw.solutionFile?.dataUrl,
                            hw.solutionFile?.name || 'الحل_النموذجي'
                          )
                        }
                        className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck className="w-4 h-4 text-slate-500" />
                        <span>الحل النموذجي</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Lightbox Image Preview Modal inside activeStudentPage */}
        <AnimatePresence>
          {previewImageUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
              >
                <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-sm truncate max-w-xs sm:max-w-md">{previewImageUrl.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerFileDownload(previewImageUrl.url, previewImageUrl.name)}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">تحميل</span>
                    </button>
                    <button
                      onClick={() => setPreviewImageUrl(null)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950">
                  <img
                    src={previewImageUrl.url}
                    alt={previewImageUrl.name}
                    className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 2: UNIFIED STUDENTS LIST (قائمة الطلاب بالشكل مثل قسم المواد)
  // ----------------------------------------------------
  return (
    <div className="space-y-4 md:space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Toast Notice if Student hasn't sent any homework */}
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
              className="text-amber-700 hover:text-amber-900 font-bold text-xs"
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
            <h3 className="font-black text-slate-900 text-base sm:text-lg">
              خدمة الطلاب ({filteredUsers.length})
            </h3>
            <p className="text-xs text-slate-500">
              اضغط على أي طالب لاستعراض حلول واجباته
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

      {/* Search Input (No tabs above) */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث باسم الطالب..."
          className="w-full py-3 pr-11 pl-4 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
        />
        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute right-3.5 top-3.5" />
      </div>

      {/* Stacked Cards: Formatted just like Subject Cards (قسم المواد) */}
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
              {/* Right Side: Icon & Student Name (Email completely hidden for teachers!) */}
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
                    {(u.isSuperAdmin || (u.email && u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())) ? (
                      <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 shrink-0 flex items-center gap-1 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>المشرف الأساسي</span>
                      </span>
                    ) : (u.role === 'supervisor' || u.isAssistantAdmin || (u.jobTitle && u.jobTitle !== 'طالب')) ? (
                      <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                        {u.jobTitle || 'مشرف'}
                      </span>
                    ) : null}
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

                    {/* Only super admin sees email if necessary */}
                    {isSuperAdmin && (
                      <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
                        {u.email}
                      </span>
                    )}
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
              لا توجد نتائج مطابقة للبحث
            </h4>
            <p className="text-xs text-slate-400">
              تأكد من كتابة اسم الطالب بشكل صحيح
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
