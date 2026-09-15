import React, { useState } from 'react';
import { UserCheck, AlertCircle, CheckCircle2, Shield, Loader2 } from 'lucide-react';
import { useAuth, isFullNameValid } from '../context/AuthContext';

export const FullNameRequiredModal: React.FC = () => {
  const { user, updateUserName } = useAuth();
  const [fullName, setFullName] = useState(
    user?.name && !['طالب', 'مستخدم', 'طالب جديد'].includes(user.name) ? user.name : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If no user or if full name is already confirmed/valid for super admin, do not render
  if (!user) return null;
  if (user.isSuperAdmin) return null;
  if (user.fullNameConfirmed && isFullNameValid(user.name)) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = fullName.trim().replace(/\s+/g, ' ');
    if (!isFullNameValid(trimmed)) {
      setError('يرجى كتابة الاسم الثلاثي كاملاً وبشكل صحيح (الاسم الأول + اسم الأب + اسم العائلة)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateUserName(trimmed);
      if (!res.success) {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ الاسم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nameParts = fullName.trim().replace(/\s+/g, ' ').split(' ').filter(p => p.length >= 2);

  return (
    <div
      id="fullname-required-overlay"
      className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        id="fullname-required-card"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-right animate-in fade-in zoom-in duration-300"
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 text-white text-center relative overflow-hidden">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
            <UserCheck className="w-8 h-8 text-blue-200" />
          </div>
          <h2 className="text-xl font-bold mb-1">الاسم الثلاثي إلزامي</h2>
          <p className="text-xs text-blue-100 leading-relaxed max-w-xs mx-auto">
            وفقاً لتعليمات المنصة، يُلزم جميع المستخدمين والطلاب بتسجيل الاسم الثلاثي الصريح للتعرف على الواجبات والأنشطة
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              يُحفظ اسمك في قاعدة بيانات حسابك ليظهر للمعلم عند تسليم الواجبات ورصد الدرجات. لن يتمكن المعلم من رؤية بريدك الإلكتروني حفاظاً على خصوصيتك.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              الاسم الثلاثي الصريح <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="input-fullname-mandatory"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="مثال: محمد عبدالله القحطاني"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                autoFocus
                required
              />
              {nameParts.length >= 3 && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
              <span>الاسم الأول + اسم الأب + اللقب/العائلة</span>
              <span className={nameParts.length >= 3 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                {nameParts.length} / 3 أسماء
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="btn-save-fullname"
            type="submit"
            disabled={isSubmitting || nameParts.length < 3}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ في قاعدة البيانات...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ وتأكيد الاسم للدخول</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
