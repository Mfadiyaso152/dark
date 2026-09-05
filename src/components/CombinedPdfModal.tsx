import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, FileStack, BookOpen, CheckCircle, Sparkles, Printer, Layers } from 'lucide-react';
import { Lesson, Subject, Semester } from '../types';
import { downloadAllSummariesPDF } from '../utils/pdfGenerator';
import confetti from 'canvas-confetti';

interface CombinedPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: Lesson[];
  subjects: Subject[];
  currentSemester: Semester;
  initialSubjectFilter?: Subject;
}

export const CombinedPdfModal: React.FC<CombinedPdfModalProps> = ({
  isOpen,
  onClose,
  lessons,
  subjects,
  currentSemester,
  initialSubjectFilter
}) => {
  const [selectedSemester, setSelectedSemester] = useState<Semester>(currentSemester);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectFilter ? initialSubjectFilter.id : 'all'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeLessons = Array.isArray(lessons) ? lessons : [];

  const filteredSubjects = safeSubjects.filter(s => s.semester === selectedSemester);
  
  const targetLessons = safeLessons.filter(l => {
    const matchSemester = l.semester === selectedSemester;
    if (selectedSubjectId === 'all') return matchSemester;
    return matchSemester && l.subjectId === selectedSubjectId;
  });

  const activeSubject = selectedSubjectId !== 'all' 
    ? safeSubjects.find(s => s.id === selectedSubjectId) 
    : undefined;

  const handleDownloadAll = async () => {
    if (targetLessons.length === 0) return;
    setIsGenerating(true);
    setProgress(20);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          return 90;
        }
        return prev + 15;
      });
    }, 300);

    const isDone = await downloadAllSummariesPDF(
      targetLessons,
      subjects,
      selectedSemester,
      activeSubject
    );

    clearInterval(timer);
    setProgress(100);
    setIsGenerating(false);

    if (isDone) {
      setSuccess(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => setSuccess(false), 4000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-5 sm:p-6 text-right overflow-hidden relative my-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-5 pt-1">
            <div className="w-14 h-14 bg-[#1E293B] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <FileStack className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-[#1E293B] mb-1">
              تحميل جميع الملخصات بملف PDF واحد
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              تجميع وتنسيق كامل لجميع ملخصات المواد والدروس في كتيب PDF شامل ومصمم
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {/* Semester selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">اختر الجزء (البارت):</label>
              <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9] p-1 rounded-2xl">
                <button
                  onClick={() => {
                    setSelectedSemester(1);
                    setSelectedSubjectId('all');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selectedSemester === 1
                      ? 'bg-white text-[#3B82F6] shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${selectedSemester === 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200'}`}>P1</span>
                  <span>بارت ون</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedSemester(2);
                    setSelectedSubjectId('all');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selectedSemester === 2
                      ? 'bg-white text-[#3B82F6] shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${selectedSemester === 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200'}`}>P2</span>
                  <span>بارت تو</span>
                </button>
              </div>
            </div>

            {/* Subject selector filter */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">تحديد النطاق:</label>
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                <button
                  onClick={() => setSelectedSubjectId('all')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedSubjectId === 'all'
                      ? 'bg-[#3B82F6] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ✨ كل المواد ({filteredSubjects.length})
                </button>
                {filteredSubjects.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedSubjectId === sub.id
                        ? 'bg-[#3B82F6] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary preview box */}
            <div className="p-4 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                <span>محتويات الملف المجمع:</span>
                <span className="text-[#3B82F6] font-extrabold">{targetLessons.length} درس وملخص</span>
              </div>
              
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {targetLessons.map((les, idx) => {
                  const s = safeSubjects.find(sub => sub.id === les.subjectId);
                  return (
                    <div
                      key={les.id}
                      className="p-2 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 truncate">{les.title}</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
                        {les.pages}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>يتضمن غلاف احترافي، فهرس محتويات، ومصطلحات كل درس</span>
              </div>
            </div>

            {/* Progress indicator */}
            {isGenerating && (
              <div className="space-y-1.5 p-3 bg-[#EFF6FF] rounded-2xl border border-[#DBEAFE]">
                <div className="flex justify-between text-xs font-bold text-[#1E3A8A]">
                  <span>جاري إنشاء وتجميع ملف الـ PDF...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-[#DBEAFE] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#3B82F6] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Download CTA Button */}
            <button
              onClick={handleDownloadAll}
              disabled={isGenerating || targetLessons.length === 0}
              className="w-full py-4 px-4 bg-[#1E293B] hover:bg-[#0F172A] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition shadow-lg disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span>
                {success
                  ? 'تم تحميل الملف المجمع بنجاح! ✨'
                  : `تحميل الكتيب الشامل (${targetLessons.length} درس) PDF`}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
