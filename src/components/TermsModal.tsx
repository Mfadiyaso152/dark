import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Lock, EyeOff, FileText, CheckCircle2, UserCheck, School } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-['Tajawal',sans-serif] text-right" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
          id="terms-and-privacy-modal"
        >
          {/* Modal Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black">الشروط والأحكام وسياسة الخصوصية</h2>
                <p className="text-xs text-blue-100 mt-0.5">ضمان حماية وسرية بياناتك وخصوصية استخدام المنصة</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-slate-700 text-sm leading-relaxed">
            
            {/* Guarantee Highlight Box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-emerald-900 text-sm sm:text-base">
                  تعهد وضمان حفظ وسرية البيانات 🔒
                </h3>
                <p className="text-xs sm:text-sm text-emerald-800 mt-1">
                  نضمن لك التزاماً تاماً بأن جميع بياناتك الشخصية (الاسم، البريد الإلكتروني، حلول الواجبات، الملاحظات، والإنجازات) 
                  <strong> محفوظة ومشفرة في خوادم آمنة</strong>، ولن يتم تسريبها أو مشاركتها أو بيعها لأي جهة خارجية إطلاقاً.
                </p>
              </div>
            </div>

            {/* Terms List */}
            <div className="space-y-3.5 pt-1">
              
              {/* Item 1 */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                  <EyeOff className="w-4 h-4 text-blue-600 shrink-0" />
                  <h4>1. خصوصية تسليم الواجبات والملفات المرفوعة</h4>
                </div>
                <p className="text-xs text-slate-600 pr-6">
                  حلول الواجبات والملفات التي تقوم برفعها خاصة بك ويقتصر الاطلاع عليها على معلم المادة المعتمد والمشرفين لمراجعتها وتقييمها فقط، ولا يستطيع أي طالب آخر الاطلاع على حلولك.
                </p>
              </div>

              {/* Item 2 */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                  <School className="w-4 h-4 text-purple-600 shrink-0" />
                  <h4>2. الاستخدام التعليمي الآمن والمحترم</h4>
                </div>
                <p className="text-xs text-slate-600 pr-6">
                  تم تصميم هذه المنصة لخدمة طلاب المرحلة الثانوية لتنظيم المذاكرة ومتابعة المقررات الدراسية. يلتزم المستخدم باستخدام المنصة للأغراض التعليمية الشخصية والالتزام بالأمانة الأكاديمية والآداب العامة.
                </p>
              </div>

              {/* Item 3 */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h4>3. حقوق المحتوى والملخصات الدراسية</h4>
                </div>
                <p className="text-xs text-slate-600 pr-6">
                  جميع المذكرات، التلاخيص، والملفات النموذجية المنشورة على المنصة مقدمة من معلمي ومشرفي المقررات للاستفادة الشخصية للطلاب في مسيرتهم التعليمية.
                </p>
              </div>

              {/* Item 4 */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                  <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <h4>4. أمان الحساب وإدارته</h4>
                </div>
                <p className="text-xs text-slate-600 pr-6">
                  يتحمل المستخدم مسؤولية الحفاظ على سرية بيانات تسجيل دخوله لحفظ تقدمه في الدروس وتاريخ إنجازه للواجبات بشكل دقيق ومستمر.
                </p>
              </div>

            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تسجيلك يعني موافقتك على هذه البنود</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-black transition cursor-pointer shadow-xs"
            >
              أوافق وأفهم الشروط
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
