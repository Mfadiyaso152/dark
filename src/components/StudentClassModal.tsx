import React, { useState } from 'react';
import { School, AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AVAILABLE_CLASSES, ClassName } from '../types';
import { triggerHaptic } from '../utils/haptics';

export const StudentClassModal: React.FC = () => {
  const { user, setStudentClassroom } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Strictly check if user is a student
  // Supervisors and teachers must NEVER see this modal
  if (!user || !user.email) return null;

  const isSuper = !!user.isSuperAdmin || user.email.toLowerCase().trim() === 'mfb.15.f@gmail.com';
  const isTeacherOrSupervisor =
    isSuper ||
    user.role === 'teacher' ||
    user.role === 'supervisor' ||
    user.isAssistantAdmin ||
    (user.jobTitle && user.jobTitle !== 'طالب');

  if (isTeacherOrSupervisor) return null;

  const cleanEmail = user.email.toLowerCase().trim();

  // If student already has a classroom recorded, never show
  if (user.classroom && AVAILABLE_CLASSES.includes(user.classroom as ClassName)) {
    return null;
  }

  // If already locked in localStorage and we have a valid classroom
  const localLocked = typeof window !== 'undefined' && localStorage.getItem(`thanaweya_student_class_locked_${cleanEmail}`) === 'true';
  const localClass = typeof window !== 'undefined' ? localStorage.getItem(`thanaweya_student_class_${cleanEmail}`) : null;
  if (localLocked && localClass && AVAILABLE_CLASSES.includes(localClass as ClassName)) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) {
      setError('يرجى اختيار فصلك الدراسي للمتابعة');
      return;
    }

    if (!AVAILABLE_CLASSES.includes(selectedClass as ClassName)) {
      setError('يرجى اختيار فصل صحيح من الفصول المحددة');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    triggerHaptic();

    try {
      const res = await setStudentClassroom(selectedClass);
      if (res.success) {
        setSuccessMessage(`تم حفظ وتأكيد فصلك الدراسي (${selectedClass}) بنجاح`);
      } else {
        setError(res.message || 'حدث خطأ أثناء حفظ الفصل الدراسي');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع أثناء حفظ الفصل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="student-class-modal-overlay"
      className="fixed inset-0 z-[9998] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        id="student-class-modal-card"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-right animate-in fade-in zoom-in duration-300 font-['IBM_Plex_Sans_Arabic',sans-serif]"
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-br from-sky-600 via-indigo-600 to-blue-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
          
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
            <School className="w-7 h-7 text-white" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black mb-2 backdrop-blur-md border border-white/25">
            <Sparkles className="w-3.5 h-3.5" />
            <span>إلزامي لجميع الطلاب</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-['Alexandria',sans-serif] tracking-tight">
            حدد فصلك الدراسي
          </h2>
          <p className="text-xs text-sky-100 mt-1 max-w-xs mx-auto leading-relaxed">
            مرحباً بك {user.name}، يرجى اختيار فصلك الدراسي للانضمام إلى قائمة زملائك والمعلمين
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Strict Warning Banner: لا يمكن تغيير الفصل مستقبلاً */}
          <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-900 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-black text-rose-950">
                تنبيه: لا يمكن تغيير الفصل مستقبلًا
              </p>
              <p className="text-rose-800 leading-relaxed text-[11px]">
                احرص على اختيار فصلك الصحيح بدقة؛ حيث يرتبط هذا الفصل بجميع واجباتك، درجاتك، وتقارير معلميك وإدارة المدرسة ولا يمكن تعديله لاحقاً.
              </p>
            </div>
          </div>

          {/* 7 Classroom Selection Buttons Grid */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-2.5">
              اختر فصلك من القائمة أدناه: <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_CLASSES.map((cls) => {
                const isSelected = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      setSelectedClass(cls);
                      setError(null);
                      triggerHaptic();
                    }}
                    className={`py-3 px-2 rounded-2xl font-black text-sm transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                      isSelected
                        ? 'bg-gradient-to-br from-sky-600 to-indigo-600 text-white border-transparent shadow-md shadow-sky-500/20 scale-102 ring-2 ring-sky-500/40'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold opacity-80">فصل</span>
                    <span className="text-base font-black font-['Alexandria',sans-serif]">{cls}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="btn-confirm-student-classroom"
            type="submit"
            disabled={isSubmitting || !selectedClass}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 active:scale-98 text-white rounded-2xl font-black text-sm shadow-lg shadow-sky-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري حفظ وتثبيت الفصل...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {selectedClass ? `تأكيد واختيار فصل ${selectedClass}` : 'اختر فصلك أولاً'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
