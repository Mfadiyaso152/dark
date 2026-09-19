import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL, resolveStudentFullName, isFullNameValid } from '../context/AuthContext';
import { Subject, Lesson, SubjectBooklet, Homework, HomeworkSubmission, USER_JOB_OPTIONS, User, BannerItem, BannerSettings } from '../types';
import { BannerManagementView } from './BannerManagementView';
import { formatGregorianDate } from '../utils/dateFormatter';
import {
  Lock,
  Unlock,
  KeyRound,
  Crown,
  Users,
  GraduationCap,
  Briefcase,
  BookOpen,
  FileText,
  ClipboardList,
  CheckCircle2,
  Search,
  Edit3,
  Trash2,
  RefreshCw,
  X,
  ChevronDown,
  AlertTriangle,
  ArrowRight,
  Activity,
  BarChart3,
  Layers,
  Clock,
  Home,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ADMIN_SECRET_PASSCODE = '199090';

interface AdminPortalViewProps {
  subjects: Subject[];
  lessons: Lesson[];
  booklets: SubjectBooklet[];
  homeworks: Homework[];
  submissions: HomeworkSubmission[];
  banners?: BannerItem[];
  bannerSettings?: BannerSettings;
  onSaveBanners?: (newBanners: BannerItem[]) => void;
  onSaveBannerSettings?: (newSettings: BannerSettings) => void;
  onToggleBannerActive?: (bannerId: string, isActive: boolean) => Promise<void> | void;
  onDeleteBanner?: (bannerId: string) => Promise<void> | void;
  onDeleteAllBanners?: () => Promise<void> | void;
  onAddBanner?: (newBanner: BannerItem) => Promise<void> | void;
  onUpdateBanner?: (updatedBanner: BannerItem) => Promise<void> | void;
  onNavigateHome: () => void;
  onSelectLesson?: (lesson: Lesson) => void;
  initialTab?: AdminTab;
}

type AdminTab = 'stats' | 'users' | 'activity' | 'banners';

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  subjects,
  lessons,
  booklets,
  homeworks,
  submissions,
  banners = [],
  bannerSettings = { autoPlay: true, intervalSeconds: 5 },
  onSaveBanners = () => {},
  onSaveBannerSettings = () => {},
  onToggleBannerActive,
  onDeleteBanner,
  onDeleteAllBanners,
  onAddBanner,
  onUpdateBanner,
  onNavigateHome,
  initialTab
}) => {
  const {
    user,
    registeredUsers,
    refreshUsers,
    updateUserJob,
    updateUserFullNameByAdmin,
    deleteUserByAdmin,
    loginWithGoogle,
    logout
  } = useAuth();

  // 1. Secret Passcode State (Never persisted in storage, must be entered on every single visit)
  const [passcode, setPasscode] = useState('');
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Clear any existing session storage from older sessions on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('thanaweya_admin_passcode_session');
      } catch {
        // ignore
      }
    }
  }, []);

  // 2. Active Tab in Admin Dashboard
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'stats');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // 3. User Management Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'students' | 'teachers' | 'supervisors'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 4. Modals State: Edit Name & Delete User
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newFullName, setNewFullName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current logged-in Google account is Super Admin
  const isAuthorizedSuperAdmin = Boolean(
    user && user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
  );

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleVerifyPasscode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passcode.trim() === ADMIN_SECRET_PASSCODE) {
      setIsPasscodeUnlocked(true);
      setPasscodeError(null);
    } else {
      setPasscodeError('رمز المرور السري غير صحيح!');
      setTimeout(() => setPasscodeError(null), 3000);
    }
  };

  const handleLockPortal = () => {
    setIsPasscodeUnlocked(false);
    setPasscode('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUsers();
    setTimeout(() => setIsRefreshing(false), 500);
    showFeedback('success', 'تم تحديث البيانات بنجاح');
  };

  // Handle User Job Change
  const handleJobChange = async (email: string, newJobTitle: string) => {
    try {
      const res = await updateUserJob(email, newJobTitle);
      showFeedback(res.success ? 'success' : 'error', res.message);
    } catch (err: any) {
      showFeedback('error', err.message || 'حدث خطأ أثناء تعديل الوظيفة');
    }
  };

  // Open Edit Name Modal
  const openEditNameModal = (u: User) => {
    setEditingUser(u);
    setNewFullName(u.name || '');
  };

  // Save Full Name
  const handleSaveFullName = async () => {
    if (!editingUser) return;
    setIsSavingName(true);
    try {
      const res = await updateUserFullNameByAdmin(editingUser.email, newFullName);
      showFeedback(res.success ? 'success' : 'error', res.message);
      if (res.success) {
        setEditingUser(null);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'حدث خطأ أثناء تعديل الاسم');
    } finally {
      setIsSavingName(false);
    }
  };

  // Confirm Delete User
  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const res = await deleteUserByAdmin(deletingUser.email);
      showFeedback(res.success ? 'success' : 'error', res.message);
      if (res.success) {
        setDeletingUser(null);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'حدث خطأ أثناء حذف المستخدم');
    } finally {
      setIsDeleting(false);
    }
  };

  // Deduplicated users list
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
          map.set(key, { ...existing, ...u, isSuperAdmin: true, role: 'supervisor', jobTitle: 'المشرف الأساسي' });
        }
      }
    }
    // Also include any user who submitted homeworks if not already present
    for (const s of submissions) {
      if (!s || !s.studentEmail) continue;
      const key = s.studentEmail.trim().toLowerCase();
      if (!map.has(key)) {
        const dummyName = s.studentName || key.split('@')[0];
        map.set(key, {
          id: s.studentId || `user-${key}`,
          name: dummyName,
          email: key,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(dummyName)}`,
          role: 'student',
          jobTitle: 'طالب',
          grade: 'أول ثانوي',
          fullNameConfirmed: true,
          joinedAt: s.submittedAt ? s.submittedAt.split('T')[0] : '2026-09-01'
        });
      }
    }
    return Array.from(map.values());
  }, [registeredUsers, submissions]);

  // Statistics Calculations
  const stats = useMemo(() => {
    const totalUsersCount = uniqueUsers.length;
    const studentsCount = uniqueUsers.filter(
      (u) =>
        u.role === 'student' ||
        (!u.jobTitle || u.jobTitle === 'طالب')
    ).length;
    const teachersCount = uniqueUsers.filter(
      (u) =>
        u.role === 'teacher' ||
        (u.jobTitle && u.jobTitle.startsWith('أ.') && u.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase())
    ).length;
    const supervisorsCount = uniqueUsers.filter(
      (u) =>
        u.role === 'supervisor' ||
        u.jobTitle === 'المشرف الأساسي' ||
        u.jobTitle === 'مشرف مساعد' ||
        u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    ).length;

    const totalHomeworksCount = homeworks.length;
    const totalSubmissionsCount = submissions.length;
    const totalBookletsCount = booklets.length;
    const totalLessonsCount = lessons.length;

    const uniqueStudentsSubmitted = new Set(
      submissions.map((s) => (s.studentEmail || s.studentName || '').toLowerCase().trim()).filter(Boolean)
    ).size;

    return {
      totalUsersCount,
      studentsCount,
      teachersCount,
      supervisorsCount,
      totalHomeworksCount,
      totalSubmissionsCount,
      totalBookletsCount,
      totalLessonsCount,
      uniqueStudentsSubmitted
    };
  }, [uniqueUsers, homeworks, submissions, booklets, lessons]);

  // Filtered Users according to search and role
  const filteredUsers = useMemo(() => {
    return uniqueUsers.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (roleFilter === 'students') {
        return u.role === 'student' || (!u.jobTitle || u.jobTitle === 'طالب');
      }
      if (roleFilter === 'teachers') {
        return (
          u.role === 'teacher' ||
          (u.jobTitle && u.jobTitle.startsWith('أ.') && u.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase())
        );
      }
      if (roleFilter === 'supervisors') {
        return (
          u.role === 'supervisor' ||
          u.jobTitle === 'المشرف الأساسي' ||
          u.jobTitle === 'مشرف مساعد' ||
          u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
        );
      }
      return true;
    });
  }, [uniqueUsers, searchQuery, roleFilter]);

  // Helper to count student submissions
  const getStudentSubmissionsCount = (userEmail: string, userName: string) => {
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    const cleanName = (userName || '').trim();
    return submissions.filter(
      (s) =>
        (s.studentEmail && s.studentEmail.toLowerCase().trim() === cleanEmail) ||
        (cleanName && s.studentName && s.studentName.trim() === cleanName)
    ).length;
  };

  // ==========================================
  // GATE 1: Passcode Verification Screen
  // ==========================================
  if (!isPasscodeUnlocked) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 font-['IBM_Plex_Sans_Arabic',sans-serif] text-right">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-7 space-y-4"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-sky-400 flex items-center justify-center mx-auto shadow-md ring-1 ring-sky-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-base sm:text-lg font-bold font-['Alexandria',sans-serif] text-slate-900">
              رمز المرور السري
            </h2>
            <p className="text-xs text-slate-500">
              أدخل رمز المرور للمتابعة إلى لوحة التحكم
            </p>
          </div>

          <form onSubmit={handleVerifyPasscode} className="space-y-3">
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="أدخل رمز المرور..."
                maxLength={10}
                autoFocus
                className="w-full py-3 pr-10 pl-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-base font-mono font-bold tracking-widest text-slate-900 placeholder:text-xs placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:border-sky-600 focus:bg-white transition"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>

            {passcodeError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer border border-white/10"
            >
              <Unlock className="w-3.5 h-3.5 text-sky-400" />
              <span>دخول</span>
            </button>

            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full py-2 text-slate-500 hover:text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للرئيسية</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // GATE 2: Google Authentication Check
  // ==========================================
  if (!isAuthorizedSuperAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 font-['IBM_Plex_Sans_Arabic',sans-serif] text-right">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-7 space-y-4 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-sky-400 flex items-center justify-center mx-auto shadow-md ring-1 ring-sky-500/20">
            <Crown className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold font-['Alexandria',sans-serif] text-slate-900">
              تسجيل الدخول مطلوب
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              يرجى تسجيل الدخول بحساب المشرف الأساسي للمتابعة
            </p>
          </div>

          {user && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold">
              الحساب الحالي غير مصرح له بالدخول
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={loginWithGoogle}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer border border-white/10"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>تسجيل الدخول بحساب المشرف</span>
            </button>

            {user && (
              <button
                onClick={logout}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                تسجيل الخروج
              </button>
            )}

            <button
              onClick={handleLockPortal}
              className="w-full py-2 text-slate-500 hover:text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              قفل والعودة
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // UNLOCKED: Admin Options & Dashboard
  // ==========================================
  return (
    <div className="space-y-4 text-right font-['IBM_Plex_Sans_Arabic',sans-serif] pb-10">
      {/* Clean Options & Action Header Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs - Icon only without text as requested */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stats')}
            aria-label="الإحصائيات"
            title="الإحصائيات"
            className={`p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer shrink-0 ${
              activeTab === 'stats'
                ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('users')}
            aria-label={`إدارة المستخدمين (${uniqueUsers.length})`}
            title={`إدارة المستخدمين (${uniqueUsers.length})`}
            className={`p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer shrink-0 ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Banner Management Tab (Icon only as requested) */}
          <button
            onClick={() => setActiveTab('banners')}
            aria-label="إدارة الإعلانات والبنايات"
            title="إدارة الإعلانات والبنايات"
            className={`p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer shrink-0 ${
              activeTab === 'banners'
                ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            aria-label={`سجل التسليمات (${submissions.length})`}
            title={`سجل التسليمات (${submissions.length})`}
            className={`p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer shrink-0 ${
              activeTab === 'activity'
                ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 mr-auto">

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer border border-slate-200"
            title="تحديث البيانات"
            aria-label="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          <button
            onClick={handleLockPortal}
            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer border border-rose-200"
            title="قفل البوابة"
            aria-label="قفل البوابة"
          >
            <Lock className="w-4 h-4" />
          </button>

          <button
            onClick={onNavigateHome}
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer border border-slate-200"
            title="الرئيسية"
            aria-label="الرئيسية"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB 1: Statistics & Analytics */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          {/* Main Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold">إجمالي المستخدمين</span>
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-black text-slate-800">
                {stats.totalUsersCount}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold">الطلاب</span>
                <GraduationCap className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-black text-blue-700">
                {stats.studentsCount}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold">المعلمون</span>
                <Briefcase className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-700">
                {stats.teachersCount}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold">المشرفون</span>
                <Crown className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-700">
                {stats.supervisorsCount}
              </div>
            </div>
          </div>

          {/* Educational Content Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold">الواجبات المنشورة</span>
                <ClipboardList className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl font-black text-indigo-700">
                {stats.totalHomeworksCount}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold">حلول الطلاب المستلمة</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-700">
                {stats.totalSubmissionsCount}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold">الدروس والشروحات</span>
                <BookOpen className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-black text-rose-700">
                {stats.totalLessonsCount}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold">المذكرات والملخصات</span>
                <FileText className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-xl font-black text-teal-700">
                {stats.totalBookletsCount}
              </div>
            </div>
          </div>

          {/* Activity Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* User Distribution Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>توزيع المستخدمين</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">
                  {stats.totalUsersCount} مستخدم
                </span>
              </div>

              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${(stats.studentsCount / (stats.totalUsersCount || 1)) * 100}%` }}
                  className="bg-blue-500 h-full"
                  title={`طلاب: ${stats.studentsCount}`}
                />
                <div
                  style={{ width: `${(stats.teachersCount / (stats.totalUsersCount || 1)) * 100}%` }}
                  className="bg-emerald-500 h-full"
                  title={`معلمون: ${stats.teachersCount}`}
                />
                <div
                  style={{ width: `${(stats.supervisorsCount / (stats.totalUsersCount || 1)) * 100}%` }}
                  className="bg-amber-500 h-full"
                  title={`مشرفون: ${stats.supervisorsCount}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-900 block">طلاب</span>
                  <span className="text-xs font-black text-blue-700">{stats.studentsCount}</span>
                </div>
                <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-900 block">معلمون</span>
                  <span className="text-xs font-black text-emerald-700">{stats.teachersCount}</span>
                </div>
                <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-900 block">مشرفون</span>
                  <span className="text-xs font-black text-amber-700">{stats.supervisorsCount}</span>
                </div>
              </div>
            </div>

            {/* Subject Activity Breakdown */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>نشاط المواد الدراسية</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">
                  {subjects.length} مادة
                </span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {subjects.map((sub) => {
                  const subHwCount = homeworks.filter((h) => h.subjectId === sub.id).length;
                  const subLessonsCount = lessons.filter((l) => l.subjectId === sub.id).length;
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                        <span className="font-bold text-slate-800 text-[11px]">{sub.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <span>{subLessonsCount} درس</span>
                        <span>•</span>
                        <span className="font-bold text-indigo-700">{subHwCount} واجب</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: User Management with Editable Triple Names */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، البريد، أو الوظيفة..."
                  className="w-full py-2 pr-9 pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>

              {/* Role Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {[
                  { key: 'all', label: 'الكل' },
                  { key: 'students', label: 'الطلاب' },
                  { key: 'teachers', label: 'المعلمون' },
                  { key: 'supervisors', label: 'المشرفون' }
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setRoleFilter(f.key as any)}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                      roleFilter === f.key
                        ? 'bg-purple-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Users List Cards */}
          <div className="space-y-2">
            {filteredUsers.map((u) => {
              const isThisSuperAdmin = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
              const currentJob = isThisSuperAdmin
                ? 'المشرف الأساسي'
                : (u.jobTitle || (u.role === 'supervisor' ? 'مشرف مساعد' : (u.role === 'teacher' ? 'أ. رياضيات' : 'طالب')));

              const subCount = getStudentSubmissionsCount(u.email, u.name);

              return (
                <div
                  key={u.id || u.email}
                  className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs hover:border-purple-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img
                        src={u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.name)}
                        alt={u.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Display User's Name / Triple Full Name */}
                        <span className="font-black text-slate-900 text-xs sm:text-sm">
                          {u.name}
                        </span>

                        {/* Direct Edit Name Button */}
                        <button
                          type="button"
                          onClick={() => openEditNameModal(u)}
                          className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                          title="تعديل الاسم"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {isThisSuperAdmin ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-purple-100 text-purple-900 border border-purple-200">
                            المشرف الأساسي
                          </span>
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {currentJob}
                          </span>
                        )}

                        {u.fullNameConfirmed && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            اسم معتمد ✓
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-medium mt-0.5 flex-wrap">
                        <span className="font-mono text-slate-500">{u.email}</span>
                        {subCount > 0 && (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[9px]">
                            {subCount} واجب مسلّم
                          </span>
                        )}
                        {u.joinedAt && (
                          <span className="text-[9px] text-slate-400">
                            انضم: {formatGregorianDate(u.joinedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role Selector & Actions */}
                  <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                    {!isThisSuperAdmin && (
                      <>
                        <div className="relative">
                          <select
                            value={currentJob}
                            onChange={(e) => handleJobChange(u.email, e.target.value)}
                            className={`py-1 pr-2 pl-5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer appearance-none ${
                              currentJob === 'طالب'
                                ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                            title="تعديل الرتبة / الوظيفة"
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
                          <ChevronDown className="w-3 h-3 text-slate-400 absolute left-1.5 top-2 pointer-events-none" />
                        </div>

                        {/* Delete User Button */}
                        <button
                          type="button"
                          onClick={() => setDeletingUser(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition cursor-pointer"
                          title="حذف هذا الحساب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-bold">لا يوجد مستخدمين مطابقين</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Activity Stream & Submissions */}
      {activeTab === 'activity' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>تسليمات واجبات الطلاب ({submissions.length})</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">مرتب من الأحدث</span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {submissions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  لا توجد تسليمات واجبات بعد
                </div>
              ) : (
                [...submissions]
                  .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
                  .map((sub) => {
                    const hw = homeworks.find((h) => h.id === sub.homeworkId);
                    const subSubject = subjects.find((s) => s.id === hw?.subjectId);
                    const studentFullName = resolveStudentFullName(sub.studentEmail, sub.studentName, registeredUsers);
                    const isConfirmed = isFullNameValid(studentFullName);

                    return (
                      <div
                        key={sub.id}
                        className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-xs">
                              {studentFullName}
                            </span>
                            {isConfirmed && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                الاسم الثلاثي ✓
                              </span>
                            )}
                            {subSubject && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                                {subSubject.name}
                              </span>
                            )}
                            {hw && (
                              <span className="text-[10px] text-slate-600 font-medium">
                                - {hw.title}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[9px] text-slate-400">
                            <span className="font-mono">{sub.studentEmail}</span>
                            <span>{formatGregorianDate(sub.submittedAt)}</span>
                          </div>
                          {sub.notes && (
                            <p className="text-[10px] text-slate-600 bg-white p-1 rounded border border-slate-100 mt-1">
                              {sub.notes}
                            </p>
                          )}
                        </div>

                        {sub.attachedFile?.hasFile && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md self-end sm:self-center shrink-0">
                            ملف مرفق ✓
                          </span>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Banner Management Full Page View */}
      {activeTab === 'banners' && (
        <BannerManagementView
          banners={banners}
          settings={bannerSettings}
          onSaveBanners={onSaveBanners}
          onSaveSettings={onSaveBannerSettings}
          onToggleBannerActive={onToggleBannerActive}
          onDeleteBanner={onDeleteBanner}
          onDeleteAllBanners={onDeleteAllBanners}
          onAddBanner={onAddBanner}
          onUpdateBanner={onUpdateBanner}
        />
      )}

      {/* Edit User Full Triple Name Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['Tajawal',sans-serif]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 space-y-3.5 text-right"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-purple-600" />
                  <span>تعديل اسم المستخدم (الاسم الثلاثي)</span>
                </h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="text-[11px] text-slate-500 font-medium">
                  البريد: <span className="font-mono text-slate-700">{editingUser.email}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    الاسم الجديد (الاسم الثلاثي):
                  </label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="مثال: محمد عبد الله الأحمد"
                    autoFocus
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSaveFullName}
                  disabled={isSavingName || !newFullName.trim()}
                  className="flex-1 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  {isSavingName ? 'جاري الحفظ...' : 'حفظ الاسم'}
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Confirmation Modal */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['Tajawal',sans-serif]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-100 space-y-3 text-right"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                  تأكيد حذف المستخدم
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  هل أنت متأكد من رغبتك في حذف حساب ({deletingUser.name})؟
                </p>
                <span className="text-[10px] font-mono text-slate-400 block">
                  {deletingUser.email}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleConfirmDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  {isDeleting ? 'جاري الحذف...' : 'حذف'}
                </button>
                <button
                  onClick={() => setDeletingUser(null)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
