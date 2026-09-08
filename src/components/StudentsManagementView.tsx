import React, { useState, useMemo, useEffect } from 'react';
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
  Bookmark,
  ClipboardList,
  ChevronLeft,
  Users,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, onSnapshot } from '../lib/firebase';

interface StudentsManagementViewProps {
  allLessons: Lesson[];
  allSubjects: Subject[];
  allHomeworks: Homework[];
  allSubmissions: HomeworkSubmission[];
  onSelectLesson?: (lesson: Lesson) => void;
}

interface StudentProgressMap {
  [emailOrId: string]: {
    bookmarkedLessonIds: string[];
    completedHomeworkIds?: string[];
  };
}

export const StudentsManagementView: React.FC<StudentsManagementViewProps> = ({
  allLessons,
  allSubjects,
  allHomeworks,
  allSubmissions,
  onSelectLesson
}) => {
  const {
    isSuperAdmin,
    registeredUsers,
    refreshUsers,
    updateUserJob
  } = useAuth();

  const [mainTab, setMainTab] = useState<'students' | 'staff'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingUserEmail, setUpdatingUserEmail] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  // Real-time map of all users' progress (bookmarks, completed homeworks)
  const [userProgressMap, setUserProgressMap] = useState<StudentProgressMap>({});

  useEffect(() => {
    const progressCol = collection(db, 'userProgress');
    const unsubscribe = onSnapshot(
      progressCol,
      (snapshot) => {
        const map: StudentProgressMap = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;
          const email = (data.email || '').toLowerCase().trim();
          const progressObj = {
            bookmarkedLessonIds: Array.isArray(data.bookmarkedLessonIds)
              ? data.bookmarkedLessonIds
              : [],
            completedHomeworkIds: Array.isArray(data.completedHomeworkIds)
              ? data.completedHomeworkIds
              : []
          };

          if (docId) map[docId] = progressObj;
          if (email) map[email] = progressObj;
        });
        setUserProgressMap(map);
      },
      (err) => {
        console.warn('Firestore userProgress listener note:', err);
      }
    );

    return () => unsubscribe();
  }, []);

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

  // Separate ONLY Students vs Staff
  const studentsOnly = useMemo(() => {
    return uniqueUsers.filter((u) => {
      const isSuper = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || u.isSuperAdmin;
      if (isSuper) return false;
      const job = u.jobTitle || '';
      const isStaff =
        u.role === 'supervisor' ||
        u.role === 'teacher' ||
        job === 'مشرف مساعد' ||
        job.startsWith('أ.');
      return !isStaff;
    });
  }, [uniqueUsers]);

  const staffOnly = useMemo(() => {
    return uniqueUsers.filter((u) => {
      const isSuper = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || u.isSuperAdmin;
      if (isSuper) return true;
      const job = u.jobTitle || '';
      return (
        u.role === 'supervisor' ||
        u.role === 'teacher' ||
        job === 'مشرف مساعد' ||
        job.startsWith('أ.')
      );
    });
  }, [uniqueUsers]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    return studentsOnly.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [studentsOnly, searchQuery]);

  // Filter staff based on search
  const filteredStaff = useMemo(() => {
    return staffOnly.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(q))
      );
    });
  }, [staffOnly, searchQuery]);

  // Helper to get bookmarks for a student
  const getStudentBookmarks = (u: User): string[] => {
    const key1 = u.id;
    const key2 = (u.email || '').toLowerCase().trim();
    return (
      userProgressMap[key1]?.bookmarkedLessonIds ||
      userProgressMap[key2]?.bookmarkedLessonIds ||
      []
    );
  };

  // Helper to get submissions for a student
  const getStudentSubmissionsCount = (u: User): number => {
    const email = (u.email || '').toLowerCase().trim();
    return allSubmissions.filter(
      (s) =>
        (s.studentEmail && s.studentEmail.toLowerCase().trim() === email) ||
        (s.studentId && s.studentId === u.id)
    ).length;
  };

  return (
    <div className="space-y-4 text-right font-['Tajawal',sans-serif]">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base sm:text-lg">
              {mainTab === 'students'
                ? `قائمة الطلاب المسجلين (${filteredStudents.length})`
                : `المشرفون والمعلمون (${filteredStaff.length})`}
            </h3>
            <p className="text-xs text-slate-500">
              {mainTab === 'students'
                ? 'اضغط على أي طالب لمشاهدة مفضلاته وحلول واجباته بالتفصيل'
                : 'اضغط على أي مشرف أو معلم للاطلاع على حلول واجباته ومفضلاته بالتفصيل'}
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

      {/* Switcher (Students vs Supervisors & Teachers) - Available for SuperAdmin and Teachers */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setMainTab('students')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === 'students'
              ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>الطلاب ({studentsOnly.length})</span>
        </button>

        <button
          onClick={() => setMainTab('staff')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === 'staff'
              ? 'bg-white text-purple-600 shadow-xs border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المشرفون والمعلمون ({staffOnly.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            mainTab === 'students'
              ? 'ابحث باسم الطالب أو البريد الإلكتروني...'
              : 'ابحث باسم المعلم أو المشرف أو المادة...'
          }
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

      {/* MAIN VIEW: Students List */}
      {mainTab === 'students' ? (
        <div className="space-y-3">
          {filteredStudents.map((student) => {
            const bookmarks = getStudentBookmarks(student);
            const submissionsCount = getStudentSubmissionsCount(student);

            return (
              <motion.div
                key={student.id || student.email}
                whileHover={{ y: -1 }}
                onClick={() => setSelectedStudent(student)}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Student Avatar + Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-indigo-50 border border-indigo-100 shrink-0 shadow-xs">
                    <img
                      src={
                        student.avatar ||
                        'https://api.dicebear.com/7.x/avataaars/svg?seed=' +
                          encodeURIComponent(student.name)
                      }
                      alt={student.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-slate-900 text-sm sm:text-base truncate group-hover:text-indigo-600 transition">
                        {student.name}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        طالب
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">{student.email}</p>
                  </div>
                </div>

                {/* Badges: Bookmarks + Homework Submissions */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/70 text-xs font-bold">
                    <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                    <span>{bookmarks.length} محفوظة</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200/70 text-xs font-bold">
                    <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                    <span>{submissionsCount} حلول واجبات</span>
                  </div>

                  <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:-translate-x-1 transition mr-1">
                    <span>التفاصيل</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredStudents.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-6 space-y-2">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm sm:text-base font-black text-slate-800">
                لا يوجد طلاب مسجلين مطابقين للبحث
              </h4>
              <p className="text-xs text-slate-400">
                عند تسجيل الطلاب ودخولهم سيظهرون فوراً هنا في القائمة
              </p>
            </div>
          )}
        </div>
      ) : (
        /* SECOND VIEW: Staff & Supervisors (Supervisors and Teachers) */
        <div className="space-y-3">
          {filteredStaff.map((u) => {
            const isThisSuperAdmin =
              u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
            const currentJob = isThisSuperAdmin
              ? 'المشرف الأساسي'
              : u.jobTitle ||
                (u.role === 'supervisor'
                  ? 'مشرف مساعد'
                  : u.role === 'teacher'
                  ? 'أ. رياضيات'
                  : 'طالب');

            const matchedOption = USER_JOB_OPTIONS.find((opt) => opt.value === currentJob);
            const badgeClass = isThisSuperAdmin
              ? 'bg-purple-100 text-purple-800 border-purple-200'
              : matchedOption?.colorClass || 'bg-slate-100 text-slate-700 border-slate-200';

            const bookmarks = getStudentBookmarks(u);
            const submissionsCount = getStudentSubmissionsCount(u);
            const isUpdatingThis = updatingUserEmail === u.email;

            return (
              <motion.div
                key={u.id || u.email}
                whileHover={{ y: -1 }}
                onClick={() => setSelectedStudent(u)}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Staff Avatar + Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-purple-50 border border-purple-100 shrink-0 shadow-xs">
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
                      <h4 className="font-black text-slate-900 text-sm sm:text-base truncate group-hover:text-purple-700 transition">
                        {u.name}
                      </h4>
                      {isThisSuperAdmin ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 shrink-0">
                          <Crown className="w-2.5 h-2.5 text-amber-500" />
                          المشرف الأساسي
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${badgeClass}`}
                        >
                          {currentJob}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">{u.email}</p>
                  </div>
                </div>

                {/* Right Area: Badges (Bookmarks + Submissions) + Super Admin Dropdown */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/70 text-xs font-bold">
                    <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                    <span>{bookmarks.length} محفوظة</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200/70 text-xs font-bold">
                    <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                    <span>{submissionsCount} حلول واجبات</span>
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

                  <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-purple-600 group-hover:-translate-x-1 transition mr-1">
                    <span>التفاصيل</span>
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredStaff.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-6 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm sm:text-base font-black text-slate-800">
                لا يوجد مشرفون أو معلمون مطابقين للبحث
              </h4>
            </div>
          )}
        </div>
      )}

      {/* Detailed User Modal (when clicking on any student, supervisor or teacher) */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          allLessons={allLessons}
          allSubjects={allSubjects}
          allHomeworks={allHomeworks}
          allSubmissions={allSubmissions}
          studentBookmarkedLessonIds={getStudentBookmarks(selectedStudent)}
          studentCompletedHomeworkIds={
            userProgressMap[selectedStudent.id]?.completedHomeworkIds ||
            userProgressMap[(selectedStudent.email || '').toLowerCase()]?.completedHomeworkIds ||
            []
          }
          onSelectLesson={onSelectLesson}
        />
      )}
    </div>
  );
};
