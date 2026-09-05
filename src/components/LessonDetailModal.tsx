import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  BookOpen,
  CheckCircle2,
  Bookmark,
  Share2,
  FileText,
  Sparkles,
  Layers,
  HelpCircle,
  Clock,
  Printer,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Lesson, Subject } from '../types';
import { downloadLessonPDF } from '../utils/pdfGenerator';
import confetti from 'canvas-confetti';

interface LessonDetailModalProps {
  lesson: Lesson | null;
  subject?: Subject;
  isOpen: boolean;
  onClose: () => void;
  isCompleted: boolean;
  isBookmarked: boolean;
  onToggleComplete: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onOpenAllPdfModal: (subject?: Subject) => void;
}

export const LessonDetailModal: React.FC<LessonDetailModalProps> = ({
  lesson,
  subject,
  isOpen,
  onClose,
  isCompleted,
  isBookmarked,
  onToggleComplete,
  onToggleBookmark,
  onOpenAllPdfModal
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'points' | 'terms' | 'quiz'>('summary');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  if (!isOpen || !lesson) return null;

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    const success = await downloadLessonPDF(lesson, subject);
    setIsDownloading(false);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  const handleCompleteToggle = () => {
    onToggleComplete(lesson.id);
    if (!isCompleted) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 }
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: lesson.title,
        text: `ملخص درس ${lesson.title} (${lesson.pages}) - تطبيق ملخصات أول ثانوي`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${lesson.title} - ${lesson.pages}\n${lesson.summary}`);
      alert('تم نسخ ملخص الدرس بنجاح!');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[92vh] flex flex-col text-right overflow-hidden relative my-auto"
        >
          {/* Top Bar / Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-[#F8FAFC] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleShare}
                title="مشاركة الملخص"
                className="w-9 h-9 rounded-xl hover:bg-slate-200/70 text-slate-500 hover:text-[#3B82F6] flex items-center justify-center transition"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleBookmark(lesson.id)}
                title="حفظ في المفضلة"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                  isBookmarked
                    ? 'bg-[#FEF3C7] text-[#F59E0B]'
                    : 'hover:bg-slate-200/70 text-slate-400 hover:text-[#F59E0B]'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[11px] font-bold px-3 py-1 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] border border-[#DBEAFE]">
                  {subject?.name || 'مقرر دراسي'}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#F1F5F9] text-[#475569]">
                  {lesson.pages}
                </span>
              </div>
            </div>
          </div>

          {/* Main Title & Action Strip */}
          <div className="px-5 pt-4 pb-2">
            <h1 className="text-lg sm:text-xl font-black text-[#1E293B] leading-snug mb-2">
              {lesson.title}
            </h1>
            <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span>إشراف:</span>
                <span className="text-slate-800 font-bold">{lesson.supervisorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#F1F5F9] text-[#334155] px-2.5 py-1 rounded-xl text-[10px] font-bold">
                  {lesson.difficulty === 'easy' ? 'مستوى سهل 🟢' : lesson.difficulty === 'medium' ? 'مستوى متوسط 🟡' : 'مستوى متقدم 🔴'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 border-b border-slate-100 flex gap-2 pt-2 overflow-x-auto scrollbar-none">
            {[
              { id: 'summary', label: 'ملخص الدرس', icon: FileText },
              { id: 'points', label: `أهم النقاط (${lesson.keyPoints?.length || 0})`, icon: Sparkles },
              { id: 'terms', label: `المصطلحات (${lesson.terms?.length || 0})`, icon: Layers },
              { id: 'quiz', label: 'بطاقات المراجعة', icon: HelpCircle }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-2.5 pt-1.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-[#3B82F6] text-[#3B82F6]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {activeTab === 'summary' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4 text-slate-800 text-sm leading-relaxed"
              >
                {/* Attached PDF / PNG File Preview Box */}
                {lesson.attachedFile && (
                  <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                          {lesson.attachedFile.type === 'pdf' ? '📄' : '🖼️'}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-purple-950">
                            الملف المرفق: {lesson.attachedFile.name}
                          </h4>
                          <span className="text-[11px] text-purple-700 font-medium">
                            صيغة {lesson.attachedFile.type.toUpperCase()} • الحجم: {lesson.attachedFile.size}
                          </span>
                        </div>
                      </div>

                      {lesson.attachedFile.dataUrl ? (
                        <a
                          href={lesson.attachedFile.dataUrl}
                          download={lesson.attachedFile.name}
                          className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تحميل الملف</span>
                        </a>
                      ) : (
                        <button
                          onClick={handleDownloadPDF}
                          className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تحميل</span>
                        </button>
                      )}
                    </div>

                    {lesson.attachedFile.previewUrl && (
                      <div className="rounded-xl overflow-hidden border border-purple-200/60 bg-white max-h-60 flex items-center justify-center">
                        <img
                          src={lesson.attachedFile.previewUrl}
                          alt={lesson.attachedFile.name}
                          className="max-h-60 object-contain w-full"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Page design card highlight */}
                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm">
                      📖
                    </div>
                    <div>
                      <div className="text-xs font-black text-indigo-900">الصفحات المشمولة بالملخص</div>
                      <div className="text-xs text-indigo-700 font-bold">{lesson.pages} من الكتاب المدرسي</div>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل PDF</span>
                  </button>
                </div>

                <div className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-100 text-slate-700 font-medium whitespace-pre-line leading-loose text-sm sm:text-[15px]">
                  {lesson.summary}
                </div>

                {/* Quick Points preview */}
                {lesson.keyPoints && lesson.keyPoints.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="font-bold text-xs text-slate-700">مقتطفات سريعة من الدرس:</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {lesson.keyPoints.slice(0, 3).map((pt, i) => (
                        <div
                          key={i}
                          className="p-3 bg-white border border-slate-100 rounded-xl text-xs text-slate-600 flex items-start gap-2 shadow-xs"
                        >
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <span className="leading-normal">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'points' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="text-xs text-slate-500 font-medium mb-1">
                  أهم الأفكار والمفاهيم الأساسية التي يركز عليها الاختبار النهائي:
                </div>
                {lesson.keyPoints?.map((point, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3 transition"
                  >
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {index + 1}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed pt-0.5">
                      {point}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'terms' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {lesson.terms && lesson.terms.length > 0 ? (
                  lesson.terms.map((termItem, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white border-2 border-indigo-50 rounded-2xl hover:border-indigo-100 transition shadow-xs"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <h4 className="font-bold text-sm text-indigo-950">{termItem.term}</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pr-4">
                        {termItem.definition}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    لا توجد مصطلحات منفصلة لهذا الدرس، راجع ملخص الدرس الشامل
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'quiz' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="text-xs text-slate-500 font-medium">
                  اضغط على البطاقة لقلبها والتحقق من فهمك لمفاهيم الدرس:
                </div>

                {lesson.terms && lesson.terms.length > 0 ? (
                  <div className="space-y-4">
                    <div
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                      className="min-h-[160px] p-6 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex flex-col justify-center items-center text-center cursor-pointer shadow-lg relative select-none transition duration-300"
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-white/20 rounded-full mb-3">
                        {isCardFlipped ? 'الإجابة والتعريف' : 'ما هو المفهوم؟ (اضغط للقلب)'}
                      </span>
                      <div className="text-base sm:text-lg font-bold leading-relaxed">
                        {isCardFlipped
                          ? lesson.terms[activeCardIndex].definition
                          : lesson.terms[activeCardIndex].term}
                      </div>
                      <span className="text-[11px] text-indigo-200 mt-4">
                        بطاقة {activeCardIndex + 1} من {lesson.terms.length}
                      </span>
                    </div>

                    <div className="flex justify-between items-center px-2">
                      <button
                        onClick={() => {
                          setIsCardFlipped(false);
                          setActiveCardIndex((prev) => Math.max(0, prev - 1));
                        }}
                        disabled={activeCardIndex === 0}
                        className="p-2 rounded-xl bg-slate-100 text-slate-600 disabled:opacity-30 font-bold text-xs flex items-center gap-1"
                      >
                        <ChevronRight className="w-4 h-4" />
                        السابق
                      </button>
                      <button
                        onClick={() => {
                          setIsCardFlipped(false);
                          setActiveCardIndex((prev) =>
                            Math.min(lesson.terms!.length - 1, prev + 1)
                          );
                        }}
                        disabled={activeCardIndex === lesson.terms.length - 1}
                        className="p-2 rounded-xl bg-slate-100 text-slate-600 disabled:opacity-30 font-bold text-xs flex items-center gap-1"
                      >
                        التالي
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    البطاقات متاحة في الدروس التي تحتوي على مصطلحات وقوانين
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-[#F8FAFC] border-t border-slate-100 flex items-center gap-2">
            {/* Mark completed */}
            <button
              onClick={handleCompleteToggle}
              className={`flex-1 py-3.5 px-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
                isCompleted
                  ? 'bg-[#22C55E] text-white shadow-sm'
                  : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-[#22C55E] hover:text-[#15803D]'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'fill-current' : ''}`} />
              <span>{isCompleted ? 'تم إنجاز هذا الدرس ✓' : 'تحديد كـ درس منجز'}</span>
            </button>

            {/* Single Download PDF button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="py-3.5 px-5 bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadSuccess ? 'تم التحميل!' : 'تحميل PDF'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
