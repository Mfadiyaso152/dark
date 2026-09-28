import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  User,
  Subject,
  GradeItem,
  GradeCategory,
  StudentSubjectPerformance,
  calculateStudentSubjectProgress
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  Award,
  TrendingUp,
  Calendar,
  X,
  Check,
  ChevronDown,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatGregorianDate } from '../utils/dateFormatter';

interface TeacherGradesManagementViewProps {
  student: User;
  allSubjects: Subject[];
  performances: StudentSubjectPerformance[];
  onSavePerformance: (perf: StudentSubjectPerformance) => Promise<void> | void;
  onBack: () => void;
}

export const TeacherGradesManagementView: React.FC<TeacherGradesManagementViewProps> = ({
  student,
  allSubjects,
  performances,
  onSavePerformance,
  onBack
}) => {
  const { user, isSuperAdmin, canManageSubject } = useAuth();

  // Filter allowed subjects for current user
  const allowedSubjects = useMemo(() => {
    if (isSuperAdmin || user?.role === 'supervisor' || user?.jobTitle === 'مشرف مساعد' || user?.email?.toLowerCase() === 'mfb.15.f@gmail.com') {
      return allSubjects;
    }
    const filtered = allSubjects.filter((s) => canManageSubject(s.id));
    return filtered.length > 0 ? filtered : allSubjects;
  }, [allSubjects, canManageSubject, isSuperAdmin, user]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (allowedSubjects.length > 0) return allowedSubjects[0].id;
    return allSubjects[0]?.id || '';
  });

  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSubjectDropdownOpen(false);
      }
    };
    if (isSubjectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSubjectDropdownOpen]);

  const currentSubject = allSubjects.find((s) => s.id === selectedSubjectId) || allSubjects[0];

  // Lookup student performance for this subject
  const currentPerformance = useMemo(() => {
    const studentEmail = (student.email || '').toLowerCase().trim();
    return performances.find(
      (p) =>
        ((p.studentEmail && p.studentEmail.toLowerCase().trim() === studentEmail) ||
          (p.studentId && p.studentId === student.id)) &&
        p.subjectId === selectedSubjectId
    );
  }, [performances, student, selectedSubjectId]);

  // Local state for grades
  const [localGrades, setLocalGrades] = useState<GradeItem[]>(() => {
    return currentPerformance?.grades ? [...currentPerformance.grades] : [];
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync local state when subject changes
  useEffect(() => {
    if (currentPerformance) {
      setLocalGrades([...(currentPerformance.grades || [])]);
    } else {
      setLocalGrades([]);
    }
  }, [currentPerformance, selectedSubjectId]);

  // Modal for Add/Edit Grade Item
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [editingGradeIndex, setEditingGradeIndex] = useState<number | null>(null);
  const [gradeFormTitle, setGradeFormTitle] = useState('');
  const [gradeFormCategory, setGradeFormCategory] = useState<GradeCategory>('homework');
  const [gradeFormScore, setGradeFormScore] = useState<string>('10');
  const [gradeFormMaxScore, setGradeFormMaxScore] = useState<string>('10');
  const [gradeFormNotes, setGradeFormNotes] = useState('');

  // Calculate live summary
  const currentPerfObject: StudentSubjectPerformance = {
    id: currentPerformance?.id || `${student.email}_${selectedSubjectId}`,
    studentId: student.id,
    studentEmail: student.email,
    studentName: student.name,
    subjectId: selectedSubjectId,
    grades: localGrades,
    teacherNotes: currentPerformance?.teacherNotes,
    updatedAt: new Date().toISOString()
  };

  const summary = calculateStudentSubjectProgress(currentPerfObject);

  const handleOpenAddModal = (presetCategory?: GradeCategory, presetTitle?: string, presetMax?: number) => {
    setEditingGradeIndex(null);
    setGradeFormTitle(presetTitle || '');
    setGradeFormCategory(presetCategory || 'homework');
    setGradeFormScore(presetMax ? String(presetMax) : '10');
    setGradeFormMaxScore(presetMax ? String(presetMax) : '10');
    setGradeFormNotes('');
    setIsGradeModalOpen(true);
  };

  const handleOpenEditModal = (grade: GradeItem, index: number) => {
    setEditingGradeIndex(index);
    setGradeFormTitle(grade.title);
    setGradeFormCategory(grade.category);
    setGradeFormScore(String(grade.score));
    setGradeFormMaxScore(String(grade.maxScore));
    setGradeFormNotes(grade.notes || '');
    setIsGradeModalOpen(true);
  };

  const handleSaveGradeItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeFormTitle.trim()) return;

    const scoreNum = Math.max(0, parseFloat(gradeFormScore) || 0);
    const maxScoreNum = Math.max(1, parseFloat(gradeFormMaxScore) || scoreNum || 10);

    const newItem: GradeItem = {
      id: editingGradeIndex !== null ? localGrades[editingGradeIndex].id : `grade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: gradeFormTitle.trim(),
      category: gradeFormCategory,
      score: scoreNum,
      maxScore: maxScoreNum,
      notes: gradeFormNotes.trim() || undefined,
      date: editingGradeIndex !== null ? localGrades[editingGradeIndex].date : new Date().toISOString(),
      teacherName: user?.name || 'معلم المادة'
    };

    let updatedList: GradeItem[];
    if (editingGradeIndex !== null) {
      updatedList = localGrades.map((g, idx) => (idx === editingGradeIndex ? newItem : g));
    } else {
      updatedList = [newItem, ...localGrades];
    }

    setLocalGrades(updatedList);
    setIsGradeModalOpen(false);

    // Auto-save changes
    triggerSave(updatedList);
  };

  const handleDeleteGradeItem = (index: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدرجة؟')) return;
    const updated = localGrades.filter((_, idx) => idx !== index);
    setLocalGrades(updated);
    triggerSave(updated);
  };

  const triggerSave = async (gradesToSave: GradeItem[]) => {
    setIsSaving(true);
    try {
      const perfToSave: StudentSubjectPerformance = {
        id: currentPerformance?.id || `${(student.email || student.id).replace(/[^a-zA-Z0-9]/g, '_')}_${selectedSubjectId}`,
        studentId: student.id,
        studentEmail: student.email,
        studentName: student.name,
        subjectId: selectedSubjectId,
        grades: gradesToSave,
        teacherNotes: currentPerformance?.teacherNotes,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.name || user?.email || 'معلم'
      };

      await onSavePerformance(perfToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Save performance error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="space-y-4 md:space-y-5 text-right font-['IBM_Plex_Sans_Arabic',sans-serif]"
    >
      {/* Header: Student Info & Back to Submissions */}
      <div className="glass-subject-vessel rounded-3xl p-4 sm:p-5 border border-white/90 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden">
        <div className="absolute top-0 inset-x-6 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden bg-white/70 border border-white/90 shrink-0 shadow-2xs">
            <img
              src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name)}`}
              alt={student.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {student.name}
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
                إدارة المستوى والدرجات
              </span>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="p-2.5 sm:p-3 rounded-2xl glass-subject-vessel hover:bg-white/80 active:scale-95 text-slate-800 transition flex items-center justify-center cursor-pointer shadow-xs border border-white/90"
          title="الرجوع لقائمة الواجبات"
        >
          <ArrowRight className="w-5 h-5 text-slate-800" />
        </button>
      </div>

      {/* Subject Native Device Picker Selector (اختيار المادة من الجهاز نفسه) */}
      <div className="glass-subject-vessel rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-white/90 shadow-xs space-y-2 relative">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="native-subject-select" className="text-xs font-bold text-slate-700 font-['Alexandria',sans-serif]">
            المادة المختارة:
          </label>
          {saveSuccess && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-xl border border-emerald-200 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              تم حفظ التقييمات
            </span>
          )}
        </div>

        {/* The Native Device Selector Container */}
        <div className="relative">
          <div className="w-full py-3.5 px-4 bg-white/90 hover:bg-white border border-white/95 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 shadow-2xs transition pointer-events-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg shrink-0">{currentSubject?.emoji || '📖'}</span>
              <span className="font-['Alexandria',sans-serif] truncate">{currentSubject?.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">تغيير المادة</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Native HTML select overlay invoking device OS picker directly */}
          <select
            id="native-subject-select"
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-base appearance-none z-10"
            title="اختر المادة"
          >
            {allowedSubjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.emoji ? `${sub.emoji} ` : ''}{sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress Bar Card */}
      <div className="glass-subject-vessel rounded-3xl p-4 sm:p-5 border border-white/90 shadow-xs space-y-3 relative overflow-hidden">
        <div className="absolute top-0 inset-x-6 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        {/* Progress Bar Display */}
        <div className="space-y-2 bg-white/70 p-4 rounded-2xl border border-white/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold text-slate-800 font-['Alexandria',sans-serif]">
                نسبة التقدم
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black font-['Alexandria',sans-serif] text-slate-900">
                {summary.percentage}%
              </span>
            </div>
          </div>

          <div className="w-full h-3.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, summary.percentage)}%` }}
              className={`h-full rounded-full bg-gradient-to-r ${
                summary.percentage >= 90
                  ? 'from-emerald-500 to-teal-500'
                  : summary.percentage >= 75
                  ? 'from-sky-500 to-indigo-600'
                  : summary.percentage >= 60
                  ? 'from-amber-500 to-orange-500'
                  : 'from-rose-500 to-pink-500'
              } shadow-xs`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>مجموع الدرجات: {summary.totalScore} من {summary.totalMaxScore || 0}</span>
            <span>{localGrades.length} درجات مسجلة</span>
          </div>
        </div>
      </div>

      {/* Single Clean Add Grade Button & Header */}
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <span className="text-xs sm:text-sm font-bold text-slate-800 font-['Alexandria',sans-serif]">
          الدرجات والتقييمات المرصودة ({localGrades.length})
        </span>

        <button
          type="button"
          onClick={() => handleOpenAddModal()}
          className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4 text-sky-400" />
          <span>إضافة درجة</span>
        </button>
      </div>

      {/* Grades Table / Cards List */}
      <div className="space-y-2.5">
        {localGrades.length > 0 ? (
          localGrades.map((grade, index) => {
            return (
              <motion.div
                key={grade.id || `g-${index}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-subject-vessel rounded-2xl sm:rounded-3xl p-4 border border-white/90 shadow-xs flex items-center justify-between gap-3 text-right relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-4 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

                {/* Grade Info */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base font-['Alexandria',sans-serif]">
                      {grade.title}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-white/80 text-slate-700 border border-white/90 shadow-2xs">
                      {grade.category === 'exam'
                        ? 'اختبار شهري'
                        : grade.category === 'quiz'
                        ? 'اختبار قصير'
                        : grade.category === 'homework'
                        ? 'تسليم واجب'
                        : grade.category === 'participation'
                        ? 'مشاركة'
                        : grade.category === 'project'
                        ? 'مشروع'
                        : 'مهمة أدائية'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>تاريخ الرصد: {formatGregorianDate(grade.date)}</span>
                    {grade.notes && (
                      <span className="text-slate-600 bg-white/60 px-2 py-0.5 rounded-md truncate max-w-xs">
                        💬 {grade.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-left bg-white/80 border border-white/90 px-3 py-1 rounded-xl shadow-2xs">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm sm:text-base font-black font-['Alexandria',sans-serif] text-slate-900">
                        {grade.score}
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold">
                        / {grade.maxScore}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(grade, index)}
                      className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-sky-600 transition cursor-pointer shadow-2xs border border-white/90"
                      title="تعديل الدرجة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGradeItem(index)}
                      className="p-2 rounded-xl bg-white/80 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer shadow-2xs border border-white/90"
                      title="حذف الدرجة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 glass-subject-vessel rounded-3xl border border-white/85 shadow-xs p-6 space-y-2">
            <Award className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm sm:text-base font-bold text-slate-800">
              لا توجد درجات مرصودة لهذا الطالب في مادة {currentSubject?.name}
            </h4>
            <p className="text-xs text-slate-500">
              اضغط على زر «إضافة درجة» بالأعلى لإضافة درجات الاختبارات، الواجبات، أو المشاركة.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Grade Item Modal */}
      <AnimatePresence>
        {isGradeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['IBM_Plex_Sans_Arabic',sans-serif]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl text-right space-y-4 border border-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold font-['Alexandria',sans-serif] text-slate-900">
                      {editingGradeIndex !== null ? 'تعديل درجة التقييم' : 'إضافة درجة جديدة'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {student.name} • {currentSubject?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGradeModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveGradeItem} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عنوان البند / التقييم *
                  </label>
                  <input
                    type="text"
                    required
                    value={gradeFormTitle}
                    onChange={(e) => setGradeFormTitle(e.target.value)}
                    placeholder="مثال: تسليم واجب صـ 15 أو اختبار شهري 1"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع التقييم *
                  </label>
                  <select
                    value={gradeFormCategory}
                    onChange={(e) => setGradeFormCategory(e.target.value as GradeCategory)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="homework">تسليم واجب</option>
                    <option value="exam">اختبار شهري / دوري</option>
                    <option value="quiz">اختبار قصير</option>
                    <option value="participation">مشاركة وتفاعل</option>
                    <option value="task">مهمة أدائية</option>
                    <option value="project">مشروع المادة</option>
                    <option value="custom">تقييم مخصص</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الدرجة المحصّلة للطالب *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.5"
                      value={gradeFormScore}
                      onChange={(e) => setGradeFormScore(e.target.value)}
                      placeholder="مثلاً: 10"
                      className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الدرجة الكلية (العظمى) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.5"
                      value={gradeFormMaxScore}
                      onChange={(e) => setGradeFormMaxScore(e.target.value)}
                      placeholder="مثلاً: 10 أو 20"
                      className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظات أو تعليق للطالب (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    value={gradeFormNotes}
                    onChange={(e) => setGradeFormNotes(e.target.value)}
                    placeholder="مثال: إجابة نموذجية، أحسنت يا بطل!"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGradeModalOpen(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    {editingGradeIndex !== null ? 'حفظ التعديل' : 'إضافة الدرجة'}
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
