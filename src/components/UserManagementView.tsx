import React, { useState } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { Search, Trash2, ShieldCheck, Crown, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const UserManagementView: React.FC = () => {
  const {
    isSuperAdmin,
    registeredUsers,
    assistantAdminEmails,
    addAssistantAdmin,
    removeAssistantAdmin
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRemoveAdmin = (email: string) => {
    const result = removeAssistantAdmin(email);
    setFeedback({
      type: result.success ? 'success' : 'error',
      message: result.message
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Filter users by search only (no role filters)
  const filteredUsers = registeredUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.grade && u.grade.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 text-right font-['Tajawal',sans-serif]">
      {/* Top Search Bar (No add assistant button) */}
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
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
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

      {/* User Cards List */}
      <div className="space-y-2">
        {filteredUsers.map((u) => {
          const isThisSuperAdmin = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          const isThisAssistant =
            !isThisSuperAdmin &&
            (assistantAdminEmails.includes(u.email.toLowerCase()) || u.isAssistantAdmin || u.role === 'supervisor');

          return (
            <div
              key={u.id}
              className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center justify-between gap-3 transition hover:border-slate-200"
            >
              {/* User Identity Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name}
                    alt={u.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1E293B] text-xs sm:text-sm truncate">
                      {u.name}
                    </span>
                    {isThisSuperAdmin ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5 text-amber-500" />
                        مشرف
                      </span>
                    ) : isThisAssistant ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        مشرف مساعد
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600">
                        طالب
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium truncate mt-0.5 font-mono">
                    {u.email}
                  </p>
                </div>
              </div>

              {/* Role Action Controls - ONLY for Super Admin */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isThisSuperAdmin ? (
                  <span className="text-[11px] font-black text-purple-700 bg-purple-100/70 px-2.5 py-1 rounded-xl">
                    المشرف الأساسي
                  </span>
                ) : isSuperAdmin ? (
                  isThisAssistant ? (
                    <button
                      onClick={() => handleRemoveAdmin(u.email)}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-rose-200 cursor-pointer"
                      title="إزالة صلاحية الإشراف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إزالة كمشرف</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const res = addAssistantAdmin(u.email, u.name);
                        setFeedback({ type: res.success ? 'success' : 'error', message: res.message });
                        setTimeout(() => setFeedback(null), 2500);
                      }}
                      className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-purple-200 cursor-pointer"
                      title="ترقية إلى مشرف مساعد"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>ترقية لمشرف</span>
                    </button>
                  )
                ) : null}
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-400">لا يوجد مستخدمين مطابقين للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
};
