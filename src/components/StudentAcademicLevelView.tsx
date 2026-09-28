import React from 'react';
import { Subject, StudentSubjectPerformance, calculateStudentSubjectProgress, GradeCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  Award,
  TrendingUp,
  CheckCircle2,
  FileCheck,
  ClipboardList,
  Sparkles,
  Calendar,
  AlertCircle,
  LogIn,
  GraduationCap,
  MessageSquare,
  BookOpen,
  CheckSquare,
  Star,
  Flame,
  Target
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatGregorianDate } from '../utils/dateFormatter';

interface StudentAcademicLevelViewProps {
  subject: Subject;
  performance?: StudentSubjectPerformance | null;
  onBack: () => void;
}

export const StudentAcademicLevelView: React.FC<StudentAcademicLevelViewProps> = ({
  subject,
  performance,
  onBack
}) => {
  const { user, setIsAuthModalOpen } = useAuth();

  const summary = calculateStudentSubjectProgress(performance);

  const getCategoryMeta = (cat: GradeCategory) => {
    switch (cat) {
      case 'exam':
        return {
          label: 'اختبار فصلي / دوري',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
          icon: FileCheck
        };
      case 'quiz':
        return {
          label: 'اختبار قصير',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          icon: GraduationCap
        };
      case 'homework':
        return {
          label: 'تسليم واجب',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          icon: CheckSquare
        };
      case 'participation':
        return {
          label: 'مشاركة وتفاعل',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
          icon: Star
        };
      case 'project':
        return {
          label: 'مشروع المادة',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
          icon: Sparkles
        };
      case 'task':
        return {
          label: 'مهمة أدائية',
          badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
          icon: Target
        };
      default:
        return {
          label: 'تقييم دراسي',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Award
        };
    }
  };

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4 text-right font-['IBM_Plex_Sans_Arabic',sans-serif]"
      >
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer group"
          >
            <ArrowRight className="w-4 h-4 text-sky-600 transition group-hover:-translate-x-0.5" />
            <span>رجوع لخيارات المادة</span>
          </motion.button>
          <span className="text-xs font-bold text-slate-500">
            {subject.name} • المستوى الدراسي
          </span>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-2xs text-center space-y-4 max-w-lg mx-auto my-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100 shadow-2xs">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold font-['Alexandria',sans-serif] text-slate-900">
              تسجيل الدخول مطلوب لعرض مستواك الدراسي
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              سجل دخولك بحسابك لمتابعة درجاتك المحصّلة، نسبة تقدمك في مقرر {subject.name}، وملاحظات المعلم الخاصة بك.
            </p>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 mx-auto shadow-xs cursor-pointer active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول بواسطة Google</span>
          </button>
        </div>
      </motion.div>
    );
  }

  const grades = Array.isArray(performance?.grades) ? performance!.grades : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 md:space-y-5 text-right font-['IBM_Plex_Sans_Arabic',sans-serif]"
    >
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer group"
        >
          <ArrowRight className="w-4 h-4 text-sky-600 transition group-hover:-translate-x-0.5" />
          <span>رجوع لخيارات المادة</span>
        </motion.button>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-sky-50/90 border border-sky-200 rounded-2xl p-4 text-xs sm:text-sm text-sky-950 font-medium flex items-center gap-3 shadow-2xs">
        <span className="text-base sm:text-lg shrink-0">⏳</span>
        <span>خدمة المستوى الدراسي قيد التطوير والتجهيز وستتوفر قريباً لجميع الطلاب والمعلمين!</span>
      </div>

      {/* Main Student Level & Progress Overview Banner */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 md:p-7 border border-slate-200/90 shadow-[0_4px_20px_-6px_rgba(15,23,42,0.06)] space-y-5 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 via-indigo-600 to-emerald-500" />

        {/* Student Name & Level Badge */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 shadow-2xs">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-['Alexandria',sans-serif] text-slate-900">
                  {user.name}
                </h2>
                {summary.percentage > 0 && summary.levelBadge !== 'جديد' && (
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border shadow-2xs ${
                    summary.percentage >= 80
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : summary.percentage >= 60
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {summary.levelBadge}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar from 100 */}
        <div className="space-y-2 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <span className="text-xs sm:text-sm font-bold text-slate-800 font-['Alexandria',sans-serif]">
                نسبة التقدم
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black font-['Alexandria',sans-serif] text-slate-900">
                {summary.percentage}%
              </span>
            </div>
          </div>

          {/* The Progress Bar */}
          <div className="w-full h-3.5 sm:h-4 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, summary.percentage)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${
                summary.percentage >= 90
                  ? 'from-emerald-500 to-teal-500'
                  : summary.percentage >= 75
                  ? 'from-sky-500 to-indigo-600'
                  : summary.percentage >= 60
                  ? 'from-amber-500 to-orange-500'
                  : 'from-rose-500 to-pink-500'
              } shadow-xs relative`}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
            </motion.div>
          </div>

          {/* Level evaluation description */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span className="font-bold text-slate-700">{summary.levelTitle}</span>
            <span>{summary.gradesCount} تقييم وواجب مسجل</span>
          </div>
        </div>

        {/* Teacher General Feedback if available */}
        {performance?.teacherNotes && (
          <div className="bg-sky-50/70 border border-sky-100 p-3.5 sm:p-4 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs font-bold text-sky-950">ملاحظات وتقييم أستاذ المادة:</h4>
              <p className="text-xs text-sky-900/90 leading-relaxed font-medium">
                {performance.teacherNotes}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Breakdown Section Header */}
      <div className="flex items-center justify-between gap-2 px-1 pt-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-sky-600" />
          <h3 className="text-xs sm:text-sm font-bold font-['Alexandria',sans-serif] text-slate-900">
            سجل الدرجات والتقييمات المسجلة ({grades.length})
          </h3>
        </div>
      </div>

      {/* Detailed Grades List */}
      <div className="space-y-2.5">
        {grades.length > 0 ? (
          grades.map((item, index) => {
            const meta = getCategoryMeta(item.category);
            const Icon = meta.icon;
            const scorePercent = item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 100;

            return (
              <motion.div
                key={item.id || `grade-${index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition space-y-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Icon className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 font-['Alexandria',sans-serif]">
                          {item.title}
                        </h4>
                        <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </div>

                      {item.date && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>تاريخ الرصد: {formatGregorianDate(item.date)}</span>
                          {item.teacherName && (
                            <span className="text-slate-400">• بواسطة: {item.teacherName}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score Pill */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-left bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-2xl shadow-2xs">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base sm:text-lg font-black font-['Alexandria',sans-serif] text-slate-900">
                          {item.score}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">
                          / {item.maxScore}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold block ${
                        scorePercent >= 90 ? 'text-emerald-600' : scorePercent >= 75 ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        {scorePercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Individual Note from Teacher if available */}
                {item.notes && (
                  <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{item.notes}</span>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-14 bg-white rounded-3xl border border-dashed border-slate-200 p-6 space-y-2 shadow-2xs">
            <Award className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm sm:text-base font-bold text-slate-800">
              لم يتم رصد درجات لهذه المادة بعد
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              سيظهر هنا سجل تقييماتك وواجباتك ونسبة تقدمك فور قيام معلم المادة برصد الدرجات في التطبيق.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
