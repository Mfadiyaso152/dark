import React, { useState } from 'react';
import { Subject, Homework } from '../types';
import { useAuth, formatDisplayName } from '../context/AuthContext';
import {
  ArrowRight,
  ClipboardList,
  Plus,
  Trash2,
  Calendar,
  BookOpen,
  HelpCircle,
  CheckCircle,
  Circle,
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HomeworkSectionProps {
  subject: Subject;
  homeworks: Homework[];
  onBack: () => void;
  onAddHomework: (hw: Omit<Homework, 'id' | 'createdAt'>) => void;
  onDeleteHomework: (id: string) => void;
  completedHomeworkIds?: string[];
  onToggleCompleteHomework?: (id: string) => void;
  canEdit: boolean;
}

export const HomeworkSection: React.FC<HomeworkSectionProps> = ({
  subject,
  homeworks,
  onBack,
  onAddHomework,
  onDeleteHomework,
  completedHomeworkIds = [],
  onToggleCompleteHomework,
  canEdit
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, canAddContent } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [dueDate, setDueDate] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const subjectHomeworks = homeworks.filter((h) => h.subjectId === subject.id);

  const handleOpenModal = () => {
    // Default to today's date (تاريخ أخذ الواجب)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDueDate(`${yyyy}-${mm}-${dd}`);
    setPageNumber('');
    setQuestionNumber('');
    setTitle('');
    setNotes('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate.trim()) {
      setFormError('يرجى تحديد تاريخ أخذ الواجب');
      return;
    }
    if (!pageNumber.trim()) {
      setFormError('يرجى تحديد رقم الصفحة');
      return;
    }
    if (!questionNumber.trim()) {
      setFormError('يرجى كتابة السؤال رقم كم');
      return;
    }

    const isTeacher = isSuperAdmin || isAssistantAdmin || canAddContent || (user && user.jobTitle !== 'طالب');
    const rawSupervisor = user?.name || (isSuperAdmin ? 'المشرف الأساسي' : subject.supervisorName);
    const supervisorName = formatDisplayName(rawSupervisor, isTeacher);

    onAddHomework({
      subjectId: subject.id,
      dueDate: dueDate.trim(),
      pageNumber: pageNumber.trim(),
      questionNumber: questionNumber.trim(),
      title: title.trim() || undefined,
      notes: notes.trim() || undefined,
      supervisorName
    });

    setIsAddModalOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 md:space-y-6 text-right font-['Tajawal',sans-serif]"
    >
      {/* Navigation and Top Title Bar */}
      <div className="flex items-center justify-between gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs md:text-sm font-bold transition flex items-center gap-2 shadow-xs cursor-pointer group active:scale-95"
        >
          <ArrowRight className="w-4 h-4 text-purple-600 transition group-hover:-translate-x-0.5" />
          <span>رجوع لخيارات المادة</span>
        </motion.button>
      </div>

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            واجبات {subject.name}
          </h3>
        </div>

        {canEdit && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenModal}
            className="py-2 px-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة واجب</span>
          </motion.button>
        )}
      </div>

      {/* Homework Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-5">
        <AnimatePresence>
          {subjectHomeworks.map((hw, idx) => {
            const isCompleted = completedHomeworkIds.includes(hw.id);
            return (
              <motion.div
                key={hw.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className={`rounded-2xl md:rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between relative overflow-hidden group shadow-2xs hover:shadow-md ${
                  isCompleted
                    ? 'bg-slate-50/90 border-emerald-300'
                    : 'bg-white border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Top line: Date & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <span>تاريخ أخذ الواجب: {hw.dueDate}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {onToggleCompleteHomework && (
                        <button
                          onClick={() => onToggleCompleteHomework(hw.id)}
                          className={`p-1.5 rounded-xl transition cursor-pointer ${
                            isCompleted
                              ? 'text-emerald-600 bg-emerald-100/70 hover:bg-emerald-200'
                              : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                          }`}
                          title={isCompleted ? 'تم إنجاز الواجب' : 'تحديد كمنجز'}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                      )}

                      {canEdit && (
                        <button
                          onClick={() => onDeleteHomework(hw.id)}
                          className="p-1.5 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="حذف الواجب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title if present */}
                  {hw.title && (
                    <h4
                      className={`font-black text-sm sm:text-base leading-snug ${
                        isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {hw.title}
                    </h4>
                  )}

                  {/* Key Assignment Details: Page & Question */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Page Box */}
                    <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">الصفحة</span>
                        <span className="text-xs sm:text-sm font-black text-slate-800">
                          صـ {hw.pageNumber}
                        </span>
                      </div>
                    </div>

                    {/* Question Box */}
                    <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">السؤال</span>
                        <span className="text-xs sm:text-sm font-black text-slate-800">
                          {hw.questionNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes / Details */}
                  {hw.notes && (
                    <p className="text-xs text-slate-600 bg-amber-50/60 border border-amber-100/70 p-2.5 rounded-xl leading-relaxed">
                      💬 {hw.notes}
                    </p>
                  )}
                </div>

                {/* Footer: Supervisor badge and Completion state */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>إشراف: {hw.supervisorName}</span>
                  {isCompleted ? (
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      ✓ تم الإنجاز
                    </span>
                  ) : (
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      مطلوب حله
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {subjectHomeworks.length === 0 && (
          <div className="col-span-full text-center py-12 md:py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-2xs">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h4 className="text-sm sm:text-base font-black text-slate-800">لا توجد واجبات مسجلة حالياً</h4>
            {canEdit && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpenModal}
                className="mt-2 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة واجب</span>
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Add Homework Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-slate-100 text-right space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base md:text-lg">
                      إضافة واجب لمادة {subject.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      سيظهر فوراً لجميع الطلاب في هذه المادة
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
                  ⚠️ {formError}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-3.5 text-right">
                {/* Assignment Date (تاريخ أخذ الواجب) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ أخذ الواجب <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                  />
                </div>

                {/* Page and Question */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الصفحة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 45"
                      value={pageNumber}
                      onChange={(e) => setPageNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      السؤال رقم كم <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: سؤال 2 و 4"
                      value={questionNumber}
                      onChange={(e) => setQuestionNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Title / Topic (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عنوان الواجب أو الدرس <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: تمارين المصفوفات والعمليات"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                  />
                </div>

                {/* Notes (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظات وتوجيهات للطلاب <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="مثال: يرجى حل السؤال في دفتر المادة وإحضاره بالحصة القادمة"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs md:text-sm font-black transition cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>نشر الواجب</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

