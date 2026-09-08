import React, { useState, useMemo } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { User, Lesson, Subject, Homework, HomeworkSubmission, USER_JOB_OPTIONS } from '../types';
import { StudentDetailModal } from './StudentDetailModal';
import {
  Search,
  Crown,
  CheckCircle,
  XCircle,
  RefreshCw,
  GraduationCap,
  ChevronDown,
  ClipboardList,
  ChevronLeft,
  Users,
  ShieldCheck,
  Compass,
  Sparkles,
  Clock,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    updateUserJob,
    canManageSubject
  } = useAuth();

  const isViewerSuperOrAssistant =
    isSuperAdmin ||
    user?.role === 'supervisor' ||
    user?.jobTitle === 'مشرف مساعد' ||
    (user?.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());

  const [filterType, setFilterType] = useState<'all' | 'supervisors' | 'students'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingUserEmail, setUpdatingUserEmail] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUsers();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleJobChange = async (email: string, newJobTitle: string) => {
    setUpdatingUserEmail(email);
    try {
      const result = await updateUserJob(email, newJobTitle);
      setFeedback({
        type: result.success ? 'success' : 'error',
        message: result.message
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء تعديل الوظيفة'
      });
    } finally {
      setUpdatingUserEmail(null);
      setTimeout(() => setFeedback(null), 3500);
    }
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
            role: 'supervisor',
            jobTitle: 'المشرف الأساسي'
          });
        }
      }
    }
    return Array.from(map.values());
  }, [registeredUsers]);

  // Separate ONLY Students
  const studentsOnly = useMemo(() => {
    return uniqueUsers.filter((u) => {
      const isSuper = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || u.isSuperAdmin;
      if (isSuper) return false;
      const job = u.jobTitle || '';
      const isStaff =
        u.role === 'supervisor' ||
        u.role === 'teacher' ||
        job === 'مشرف مساعد' ||
        job === 'المرشد الطلابي' ||
        job.includes('مرشد') ||
        job.startsWith('أ.');
      return !isStaff;
    });
  }, [uniqueUsers]);

  // Separate Staff: For SuperAdmin (all supervisors & teachers); For Teacher (supervisors ONLY, other teachers hidden)
  const staffOnly = useMemo(() => {
    return uniqueUsers.filter((u) => {
      const isSuper = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || u.isSuperAdmin;
      const job = u.jobTitle || '';
      const isSupervisor =
        isSuper ||
        u.role === 'supervisor' ||
        job === 'المشرف الأساسي' ||
        job === 'مشرف مساعد' ||
        job === 'المرشد الطلابي' ||
        job.includes('مرشد');

      const isTeacher =
        u.role === 'teacher' ||
        job.startsWith('أ.');

      if (isViewerSuperOrAssistant) {
        return isSupervisor || isTeacher;
      }

      // Teacher view: Show supervisors only, hide other teachers
      return isSupervisor;
    });
  }, [uniqueUsers, isViewerSuperOrAssistant]);

  // Helper to identify supervisor
  const isSupervisorUser = (u: User) => {
    const isSuper = (u.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || u.isSuperAdmin;
    const job = u.jobTitle || '';
    return (
      isSuper ||
      u.role === 'supervisor' ||
      job === 'المشرف الأساسي' ||
      job === 'مشرف مساعد' ||
      job === 'المرشد الطلابي' ||
      job.includes('مرشد')
    );
  };

  // Combined list of Supervisors and Students in the exact same list
  const combinedUsers = useMemo(() => {
    return [...staffOnly, ...studentsOnly];
  }, [staffOnly, studentsOnly]);

  // Filtered users based on filterType and search query
  const filteredUsers = useMemo(() => {
    let list = combinedUsers;
    if (filterType === 'students') {
      list = studentsOnly;
    } else if (filterType === 'supervisors') {
      list = staffOnly;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(q))
    );
  }, [combinedUsers, filterType, studentsOnly, staffOnly, searchQuery]);

  // Helper to get submissions count for a user (scoped to teacher's subject if viewer is a teacher)
  const getStudentSubmissionsCount = (u: User): number => {
    const email = (u.email || '').toLowerCase().trim();
    const subs = allSubmissions.filter(
      (s) =>
        (s.studentEmail && s.studentEmail.toLowerCase().trim() === email) ||
        (s.studentId && s.studentId === u.id)
    );
    if (isViewerSuperOrAssistant) {
      return subs.length;
    }
    return subs.filter((s) => {
      const hw = allHomeworks.find((h) => h.id === s.homeworkId);
      return hw ? canManageSubject(hw.subjectId) : false;
    }).length;
  };

  return (
    <div className="space-y-4 text-right font-['Tajawal',sans-serif]">
      {/* Experimental Service Alert Banner */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-300/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 border border-amber-400/30">
            <Sparkles className="w-6 h-6 text-amber-600 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-amber-950 text-sm sm:text-base">خدمة الطلاب</span>
              <span className="bg-amber-500/20 text-amber-900 border border-amber-400/50 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                نسخة تجريبية
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-amber-800">
              هذه الخدمة تجريبية وسيتم إطلاقها 10 سبتمبر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black shrink-0">
          <Clock className="w-4 h-4 text-amber-700" />
          <span>موعد الإطلاق: 10 سبتمبر 🚀</span>
        </div>
      </motion.div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base sm:text-lg">
              {filterType === 'all'
                ? `قائمة الطلاب والمشرفين (${filteredUsers.length})`
                : filterType === 'supervisors'
                ? `قائمة المشرفين (${filteredUsers.length})`
                : `قائمة الطلاب المسجلين (${filteredUsers.length})`}
            </h3>
            <p className="text-xs text-slate-500">
              {!isViewerSuperOrAssistant
                ? `اضغط على أي طالب أو مشرف لمشاهدة حلول واجبات مادتك (${user?.jobTitle})`
                : 'اضغط على أي طالب أو مشرف لمشاهدة حلول واجباته بالتفصيل'}
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
          title="تحديث البيانات"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {/* Switcher & Filter Tabs (الكل بنفس القائمة افتراضياً) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            filterType === 'all'
              ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الكل ({combinedUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('supervisors')}
          className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            filterType === 'supervisors'
              ? 'bg-white text-purple-600 shadow-xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-500" />
          <span>المشرفون ({staffOnly.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('students')}
          className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            filterType === 'students'
              ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>الطلاب ({studentsOnly.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بالاسم أو البريد الإلكتروني أو الوظيفة..."
          className="w-full py-3 pr-11 pl-4 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs transition"
        />
        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute right-3.5 top-3.5" />
      </div>

      {/* Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNIFIED VIEW: Students and Supervisors in the Same List */}
      <div className="space-y-3">
        {filteredUsers.map((u) => {
          const isSuper = isSupervisorUser(u);
          const isThisSuperAdmin =
            (u.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          const currentJob = isThisSuperAdmin
            ? 'المشرف الأساسي'
            : u.jobTitle ||
              (u.role === 'supervisor'
                ? 'مشرف مساعد'
                : u.role === 'teacher'
                ? 'معلم'
                : 'طالب');

          const submissionsCount = getStudentSubmissionsCount(u);
          const isUpdatingThis = updatingUserEmail === u.email;

          return (
            <motion.div
              key={u.id || u.email}
              whileHover={{ y: -1 }}
              onClick={() => setSelectedStudent(u)}
              className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                isSuper
                  ? 'border-purple-200/90 hover:border-purple-300'
                  : 'border-slate-200/90 hover:border-indigo-300'
              }`}
            >
              {/* User Avatar + Details */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div
                  className={`w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-xs border ${
                    isSuper
                      ? 'bg-purple-50 border-purple-100'
                      : 'bg-indigo-50 border-indigo-100'
                  }`}
                >
                  <img
                    src={
                      u.avatar ||
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=' +
                        encodeURIComponent(u.name)
                    }
                    alt={u.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`font-black text-sm sm:text-base truncate transition ${
                        isSuper
                          ? 'text-slate-900 group-hover:text-purple-700'
                          : 'text-slate-900 group-hover:text-indigo-600'
                      }`}
                    >
                      {u.name}
                    </h4>

                    {/* Badge: Supervisor vs Student */}
                    {isSuper ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1 shrink-0 shadow-2xs">
                          <Crown className="w-3 h-3 text-amber-500" />
                          مشرف
                        </span>
                        {currentJob && currentJob !== 'طالب' && currentJob !== 'المشرف الأساسي' && currentJob !== 'مشرف' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            {currentJob === 'المرشد الطلابي' && (
                              <Compass className="w-2.5 h-2.5 text-amber-600" />
                            )}
                            {currentJob === 'مشرف مساعد' && (
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                            )}
                            {currentJob}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        طالب
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate">{u.email}</p>
                </div>
              </div>

              {/* Submissions Badge + Action */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200/70 text-xs font-bold">
                  <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                  <span>
                    {submissionsCount} حلول واجبات
                    {!isViewerSuperOrAssistant && ' بمادتك'}
                  </span>
                </div>

                {!isThisSuperAdmin && isSuperAdmin && (
                  <div
                    className="relative shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={currentJob}
                      disabled={isUpdatingThis}
                      onChange={(e) => handleJobChange(u.email, e.target.value)}
                      className="py-1.5 pr-2.5 pl-6 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition appearance-none disabled:opacity-50"
                      title="تغيير وظيفة المعلم أو المشرف"
                    >
                      <option value="طالب">طالب</option>
                      <optgroup label="المعلمون والمشرفون">
                        {USER_JOB_OPTIONS.filter((opt) => opt.value !== 'طالب').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
                  </div>
                )}

                <div
                  className={`hidden sm:flex items-center gap-1 text-xs font-bold transition mr-1 group-hover:-translate-x-1 ${
                    isSuper ? 'text-purple-600' : 'text-indigo-600'
                  }`}
                >
                  <span>التفاصيل</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
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
              تأكد من كتابة الاسم أو البريد بشكل صحيح
            </p>
          </div>
        )}
      </div>

      {/* Detailed User Modal (when clicking on any student, supervisor or teacher) */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          allSubjects={allSubjects}
          allHomeworks={allHomeworks}
          allSubmissions={allSubmissions}
        />
      )}
    </div>
  );
};
