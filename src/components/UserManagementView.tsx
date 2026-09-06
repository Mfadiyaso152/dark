import React, { useState, useMemo } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { USER_JOB_OPTIONS } from '../types';
import {
  Search,
  Crown,
  CheckCircle,
  XCircle,
  RefreshCw,
  GraduationCap,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UserManagementView: React.FC = () => {
  const {
    isSuperAdmin,
    registeredUsers,
    refreshUsers,
    updateUserJob
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingUserEmail, setUpdatingUserEmail] = useState<string | null>(null);

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

  // Strictly deduplicate users by email so supervisor and users never appear twice
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, typeof registeredUsers[0]>();
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
    return Array.from(map.values());
  }, [registeredUsers]);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    return uniqueUsers.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(q))
      );
    });
  }, [uniqueUsers, searchQuery]);

  return (
    <div className="space-y-4 text-right font-['Tajawal',sans-serif]">
      {/* Header */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-800 text-sm">
          المستخدمين المسجلين ({filteredUsers.length})
        </h3>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          title="تحديث القائمة"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {/* Top Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو البريد الإلكتروني..."
          className="w-full py-2.5 pr-10 pl-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
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

      {/* User Cards List */}
      <div className="space-y-2">
        {filteredUsers.map((u) => {
          const isThisSuperAdmin = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          const currentJob = isThisSuperAdmin
            ? 'المشرف الأساسي'
            : (u.jobTitle || (u.role === 'supervisor' ? 'مشرف مساعد' : (u.role === 'teacher' ? 'أ. رياضيات' : 'طالب')));

          const matchedOption = USER_JOB_OPTIONS.find((opt) => opt.value === currentJob);
          const badgeClass = isThisSuperAdmin
            ? 'bg-purple-100 text-purple-800 border-purple-200'
            : (matchedOption?.colorClass || 'bg-slate-100 text-slate-700 border-slate-200');

          const isUpdatingThis = updatingUserEmail === u.email;

          return (
            <div
              key={u.id || u.email}
              className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-100 shadow-2xs hover:border-slate-200 transition flex items-center justify-between gap-3"
            >
              {/* User Avatar + Name + Email */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name}
                    alt={u.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-[#1E293B] text-xs sm:text-sm truncate">
                      {u.name}
                    </span>
                    {isThisSuperAdmin ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 shrink-0">
                        <Crown className="w-2.5 h-2.5 text-amber-500" />
                        المشرف الأساسي
                      </span>
                    ) : !isSuperAdmin ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${badgeClass}`}>
                        {currentJob}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-400 font-mono font-medium truncate mt-0.5" title={u.email}>
                    {u.email}
                  </div>
                </div>
              </div>

              {/* Compact Selector directly beside the user info on the left side */}
              <div className="shrink-0 flex items-center gap-1.5">
                {!isThisSuperAdmin && isSuperAdmin && (
                  <div className="relative">
                    <select
                      value={currentJob}
                      disabled={isUpdatingThis}
                      onChange={(e) => handleJobChange(u.email, e.target.value)}
                      className={`py-1.5 pr-2.5 pl-6 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition appearance-none disabled:opacity-50 ${
                        currentJob === 'طالب'
                          ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                      title="تغيير وظيفة المستخدم"
                    >
                      <optgroup label="🎓 الطلاب (مشاهدة وتحميل فقط)">
                        <option value="طالب">طالب (مشاهدة وتحميل)</option>
                      </optgroup>
                      <optgroup label="👨‍🏫 المعلمون والمشرفون (إضافة ملفات لكافة المواد)">
                        <option value="أ. رياضيات">أ. رياضيات</option>
                        <option value="أ. كيمياء">أ. كيمياء</option>
                        <option value="أ. فيزياء">أ. فيزياء</option>
                        <option value="أ. أحياء / علم بيئة">أ. أحياء / علم بيئة</option>
                        <option value="أ. تقنية رقمية">أ. تقنية رقمية</option>
                        <option value="أ. تفكير ناقد">أ. تفكير ناقد</option>
                        <option value="أ. لغة إنجليزية">أ. لغة إنجليزية</option>
                        <option value="أ. كفايات لغوية">أ. كفايات لغوية</option>
                        <option value="أ. دراسات إسلامية">أ. دراسات إسلامية</option>
                        <option value="أ. اجتماعيات">أ. اجتماعيات</option>
                        <option value="معلم / مشرف مادة">معلم / مشرف مادة</option>
                        <option value="مشرف مساعد">مشرف مساعد</option>
                      </optgroup>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 space-y-1">
            <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-1" />
            <p className="text-xs text-slate-500 font-bold">لا يوجد مستخدمين مطابقين للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
};

