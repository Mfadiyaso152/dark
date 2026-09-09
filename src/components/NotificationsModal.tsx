import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  BellRing,
  X,
  Plus,
  Send,
  Trash2,
  CheckCheck,
  Calendar,
  User as UserIcon,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';
import { useNotifications } from '../context/NotificationsContext';
import { INITIAL_SUBJECTS } from '../data/initialData';

export const NotificationsModal: React.FC = () => {
  const {
    notifications,
    myNotifications,
    isNotificationsModalOpen,
    closeNotificationsModal,
    sendNotification,
    deleteNotification,
    isTeacher,
    isSupervisor,
    teacherAssignedSubjects
  } = useNotifications();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (teacherAssignedSubjects.length > 0) {
      return teacherAssignedSubjects[0].id;
    }
    return 'general';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isNotificationsModalOpen) return null;

  // If teacher, they see their own sent notifications plus general notifications
  // If supervisor or student, they see the shared active list
  const displayedList = useMemo(() => {
    if (isTeacher) {
      const myNotifIds = new Set(myNotifications.map((n) => n.id));
      const generalNotifs = notifications.filter((n) => n.subjectId === 'general' && !myNotifIds.has(n.id));
      return [...myNotifications, ...generalNotifs].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }
    return notifications;
  }, [isTeacher, myNotifications, notifications]);

  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFeedbackMsg({ type: 'error', text: 'يرجى كتابة عنوان ونص الإشعار بالكامل' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    let finalSubjectName = 'إشعار عام';
    if (selectedSubjectId !== 'general') {
      const foundSub = INITIAL_SUBJECTS.find((s) => s.id === selectedSubjectId);
      if (foundSub) {
        finalSubjectName = foundSub.name;
      }
    }

    const res = await sendNotification({
      title: title.trim(),
      message: message.trim(),
      subjectId: selectedSubjectId,
      subjectName: finalSubjectName,
      linkUrl: linkUrl.trim() || undefined
    });

    setIsSubmitting(false);

    if (res.success) {
      setFeedbackMsg({ type: 'success', text: res.message });
      setTitle('');
      setMessage('');
      setLinkUrl('');
      setTimeout(() => {
        setIsAddingNew(false);
        setFeedbackMsg(null);
      }, 1200);
    } else {
      setFeedbackMsg({ type: 'error', text: res.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
      return;
    }
    setDeletingId(id);
    await deleteNotification(id);
    setDeletingId(null);
  };

  const getSubjectBadge = (subjectId?: string, subjectName?: string) => {
    const sub = INITIAL_SUBJECTS.find((s) => s.id === subjectId);
    if (!sub || subjectId === 'general') {
      return {
        name: subjectName || 'إشعار عام',
        emoji: '📢',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      };
    }
    return {
      name: sub.name,
      emoji: sub.emoji || '📚',
      bg: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  };

  const formatArabicDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('ar-SA', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs font-['Tajawal',sans-serif]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-right"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  الإشعارات والتنبيهات
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-200">
                  {displayedList.length}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                {isTeacher
                  ? 'إشعاراتك وتوجيهاتك المرسلة للطلاب'
                  : isSupervisor
                  ? 'لوحة إدارة الإشعارات العامة والمدرسية'
                  : 'تنبيهات وتوجيهات المعلمين'}
              </p>
            </div>
          </div>

          {/* Header Action Buttons (Icon-Only, Clean & Uncrowded) */}
          <div className="flex items-center gap-2">
            {/* Add Notification Icon Button for Teachers and Supervisors */}
            {(isTeacher || isSupervisor) && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => {
                  setIsAddingNew(!isAddingNew);
                  setFeedbackMsg(null);
                }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-2xs cursor-pointer ${
                  isAddingNew
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title={isAddingNew ? 'إلغاء الإضافة' : 'إضافة إشعار جديد'}
                aria-label={isAddingNew ? 'إلغاء' : 'إضافة إشعار'}
              >
                {isAddingNew ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </motion.button>
            )}

            {/* Close Modal Icon Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={closeNotificationsModal}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Add Notification Form Panel */}
          <AnimatePresence>
            {isAddingNew && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.98 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.98 }}
                className="overflow-hidden"
              >
                <div className="bg-gradient-to-b from-indigo-50/80 to-purple-50/40 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-950 font-black text-xs sm:text-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>إرسال إشعار فوري جديد</span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                      فوري للطلاب
                    </span>
                  </div>

                  <form onSubmit={handleSendSubmit} className="space-y-3.5">
                    {/* Subject Selector or Assigned Subject Display */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        المقرر الدراسي
                      </label>
                      {isSupervisor ? (
                        <select
                          value={selectedSubjectId}
                          onChange={(e) => setSelectedSubjectId(e.target.value)}
                          className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        >
                          <option value="general">📢 إشعار عام (لجميع الطلاب والمواد)</option>
                          {INITIAL_SUBJECTS.filter((s) => s.semester === 1).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.emoji} {s.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full py-2 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-black text-indigo-900 flex items-center justify-between shadow-2xs">
                          <span className="flex items-center gap-2">
                            <span>{teacherAssignedSubjects[0]?.emoji || '📚'}</span>
                            <span>{teacherAssignedSubjects[0]?.name || 'مادتي'}</span>
                          </span>
                          <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                            مادتك المسندة
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Title Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        عنوان الإشعار <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="مثال: موعد تسليم الواجب أو مراجعة الاختبار"
                        className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        maxLength={100}
                        required
                      />
                    </div>

                    {/* Message Textarea */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        نص الإشعار <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="اكتب التوجيهات أو الملاحظات التي ترغب بإيصالها لطلابك..."
                        rows={3}
                        className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs resize-none"
                        maxLength={500}
                        required
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                        <span>الحد الأقصى: 500 حرف</span>
                        <span>{message.length}/500</span>
                      </div>
                    </div>

                    {/* Link Attachment Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span>إرفاق رابط (اختياري)</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          درس، ملف، اختبار، استبيان
                        </span>
                      </label>
                      <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        dir="ltr"
                        className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs text-left"
                      />
                    </div>

                    {/* Feedback Alert */}
                    {feedbackMsg && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                          feedbackMsg.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {feedbackMsg.type === 'success' ? (
                          <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{feedbackMsg.text}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال الإشعار فوراً'}</span>
                      </motion.button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notifications List */}
          {displayedList.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                {isTeacher
                  ? 'لم تقم بإرسال أي إشعارات بعد'
                  : 'لا توجد إشعارات جديدة حالياً'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {isTeacher
                  ? 'اضغط على أيقونة (+) في الأعلى لإرسال تنبيه فوري لطلابك.'
                  : 'سيتم إشعارك فور نشر تنبيهات وتوجيهات دراسية جديدة.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {displayedList.map((notif) => {
                const badge = getSubjectBadge(notif.subjectId, notif.subjectName);
                const canDelete =
                  isSupervisor ||
                  (isTeacher &&
                    (notif.authorEmail?.toLowerCase() === myNotifications.find((m) => m.id === notif.id)?.authorEmail?.toLowerCase() ||
                      notif.authorId === myNotifications.find((m) => m.id === notif.id)?.authorId));

                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition space-y-3 relative group"
                  >
                    {/* Top Row: Subject & Author on Right, Date & Action Icons on Left */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Subject & Author Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Subject Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-2xs ${badge.bg}`}
                        >
                          <span>{badge.emoji}</span>
                          <span>{badge.name}</span>
                        </span>

                        {/* Author info */}
                        {!isTeacher && notif.authorName && (
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-slate-400" />
                            <span>{notif.authorName}</span>
                          </span>
                        )}
                      </div>

                      {/* Left Actions: Date, Link Icon, Delete Icon */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Date */}
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium flex items-center gap-1 pl-1" dir="ltr">
                          <span>{formatArabicDate(notif.createdAt)}</span>
                          <Calendar className="w-3 h-3 text-slate-400" />
                        </span>

                        {/* Link Icon Button (Icon-Only, Clean) */}
                        {notif.linkUrl && (
                          <a
                            href={notif.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-800 border border-indigo-200/80 flex items-center justify-center transition shadow-2xs cursor-pointer active:scale-95"
                            title="فتح الرابط المرفق"
                            aria-label="فتح الرابط"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Delete Icon Button (Icon-Only, Clean) */}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(notif.id)}
                            disabled={deletingId === notif.id}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 flex items-center justify-center transition cursor-pointer active:scale-95"
                            title="حذف الإشعار"
                            aria-label="حذف الإشعار"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                      {notif.title}
                    </h3>

                    {/* Message Body */}
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3 rounded-xl border border-slate-100 font-medium">
                      {notif.message}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            تنبيهات فورية ومباشرة • منصة أول ثانوي المسار المشترك
          </p>
        </div>
      </motion.div>
    </div>
  );
};
