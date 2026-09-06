import React, { useState } from 'react';
import { Subject, Lesson, SubjectBooklet } from '../types';
import { useAuth } from '../context/AuthContext';
import { LessonCard } from './LessonCard';
import {
  ArrowRight,
  BookOpen,
  FileText,
  Plus,
  Download,
  Trash2,
  FileCheck,
  ChevronLeft,
  AlertTriangle,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { downloadAllSummariesPDF } from '../utils/pdfGenerator';

interface SubjectDetailViewProps {
  subject: Subject;
  lessons: Lesson[];
  booklets: SubjectBooklet[];
  onBack: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  onToggleComplete: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onOpenAddLesson: () => void;
  onOpenEditLesson?: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onAddBooklet: (booklet: Omit<SubjectBooklet, 'id' | 'createdAt'>) => void;
  onDeleteBooklet: (id: string) => void;
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subject,
  lessons,
  booklets,
  onBack,
  onSelectLesson,
  onToggleComplete,
  onToggleBookmark,
  onOpenAddLesson,
  onOpenEditLesson,
  onDeleteLesson,
  onAddBooklet,
  onDeleteBooklet,
  completedLessonIds,
  bookmarkedLessonIds
}) => {
  const { user, canManageSubject } = useAuth();
  // Check if current user is authorized to add/edit/delete content for THIS specific subject
  const canEditCurrentSubject = canManageSubject(subject.id);

  // Sub-view: null = show the two main choices, 'lessons' = show lessons page, 'booklets' = show booklets page
  const [subView, setSubView] = useState<'lessons' | 'booklets' | null>(null);
  const [isAddBookletModalOpen, setIsAddBookletModalOpen] = useState(false);
  const [isDownloadingAllLessons, setIsDownloadingAllLessons] = useState(false);
  const [isDownloadingAllBooklets, setIsDownloadingAllBooklets] = useState(false);

  // New booklet form state
  const [bookletTitle, setBookletTitle] = useState('');
  const [bookletPages, setBookletPages] = useState('100 صفحة');
  const [bookletDesc, setBookletDesc] = useState('');
  const [bookletFileName, setBookletFileName] = useState('');
  const [bookletFileDataUrl, setBookletFileDataUrl] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | null>(null);

  const subjectLessons = lessons.filter((l) => l.subjectId === subject.id);
  const subjectBooklets = booklets.filter((b) => b.subjectId === subject.id);

  const handleDownloadAllLessons = async () => {
    if (subjectLessons.length === 0) return;
    setIsDownloadingAllLessons(true);
    try {
      await downloadAllSummariesPDF(subjectLessons, [subject], 1, subject);
    } catch (err) {
      console.error('Error downloading all lessons:', err);
    } finally {
      setIsDownloadingAllLessons(false);
    }
  };

  const handleDownloadAllBooklets = async () => {
    if (subjectBooklets.length === 0) return;
    setIsDownloadingAllBooklets(true);
    try {
      for (let i = 0; i < subjectBooklets.length; i++) {
        handleDownloadBooklet(subjectBooklets[i]);
        if (i < subjectBooklets.length - 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    } catch (err) {
      console.error('Error downloading all booklets:', err);
    } finally {
      setIsDownloadingAllBooklets(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setBookletFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setBookletFileDataUrl(reader.result as string);
    };
    reader.onerror = () => {
      setFileError('حدث خطأ أثناء قراءة الملف، يرجى المحاولة مرة أخرى.');
    };
    reader.readAsDataURL(file);
  };

  const handleCreateBooklet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookletTitle.trim()) return;

    onAddBooklet({
      subjectId: subject.id,
      title: bookletTitle.trim(),
      pagesCount: bookletPages.trim() || '100 صفحة',
      description: bookletDesc.trim() || 'ملخص شامل ومذكرة لمفاهيم المقرر',
      fileName: bookletFileName || `ملخص_${subject.name}.pdf`,
      fileDataUrl: bookletFileDataUrl,
      supervisorName: user?.name || 'مشرف المادة'
    });

    // Reset & Close
    setBookletTitle('');
    setBookletPages('100 صفحة');
    setBookletDesc('');
    setBookletFileName('');
    setBookletFileDataUrl(undefined);
    setIsAddBookletModalOpen(false);
  };

  const handleDownloadBooklet = (booklet: SubjectBooklet) => {
    if (booklet.fileDataUrl) {
      const a = document.createElement('a');
      a.href = booklet.fileDataUrl;
      a.download = booklet.fileName || `${booklet.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const blob = new Blob(
        [
          `%PDF-1.4\n% مذكرة ملخص ${subject.name}\n${booklet.title}\nعدد الصفحات: ${booklet.pagesCount}\nإشراف: ${booklet.supervisorName}`
        ],
        { type: 'application/pdf' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${booklet.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // 1) Main Choices Screen: Gives user two distinct options to open
  if (!subView) {
    return (
      <div className="space-y-4 text-right font-['Tajawal',sans-serif]">
        {/* Top Navigation: Return to all subjects */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer group"
          >
            <ArrowRight className="w-4 h-4 text-blue-600 transition group-hover:-translate-x-0.5" />
            <span>رجوع للمواد</span>
          </button>
          <span className="text-xs font-bold text-slate-400">{subject.code}</span>
        </div>

        {/* Subject Header Banner */}
        <div
          className={`p-5 rounded-3xl border ${subject.lightBg || 'bg-[#EFF6FF]'} ${
            subject.borderColor || 'border-[#DBEAFE]'
          } shadow-xs space-y-2`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl ${
                subject.badgeBg || 'bg-[#3B82F6]'
              } flex items-center justify-center text-2xl shadow-xs text-white shrink-0`}
            >
              {subject.emoji || '📖'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-black ${subject.titleColor || 'text-[#1E3A8A]'}`}>
                  {subject.name}
                </h2>
                {subject.isComingSoon && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-black bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                    قريباً
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice if applicable */}
        {subject.isComingSoon && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 font-bold flex items-center gap-2.5 shadow-2xs">
            <span className="text-base shrink-0">⏳</span>
            <span>مادة {subject.name} قادمة قريباً، ويجري العمل على استكمال الدروس والمذكرات الخاصة بها.</span>
          </div>
        )}

        {/* The Two Choices Cards */}
        <div className="pt-1">
          <h3 className="text-xs font-bold text-slate-500 mb-3 px-1">
            اختر القسم المطلوب للمتابعة:
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Option 1: الشروحات والدروس */}
            <div
              onClick={() => setSubView('lessons')}
              className="bg-white hover:bg-blue-50/40 border-2 border-slate-200/90 hover:border-blue-500 rounded-3xl p-5 shadow-xs transition-all cursor-pointer group text-right flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition">
                      الشروحات والدروس
                    </h4>
                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-xl">
                      {subjectLessons.length} درس
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-blue-600 font-black text-xs">
                <span>فتح صفحة الدروس</span>
                <ChevronLeft className="w-4 h-4 transition group-hover:-translate-x-1" />
              </div>
            </div>

            {/* Option 2: الملخصات والمذكرات */}
            <div
              onClick={() => setSubView('booklets')}
              className="bg-white hover:bg-emerald-50/40 border-2 border-slate-200/90 hover:border-emerald-500 rounded-3xl p-5 shadow-xs transition-all cursor-pointer group text-right flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-slate-900 group-hover:text-emerald-600 transition">
                      الملخصات والمذكرات
                    </h4>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-xl">
                      {subjectBooklets.length} مذكرة
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-emerald-600 font-black text-xs">
                <span>فتح صفحة الملخصات</span>
                <ChevronLeft className="w-4 h-4 transition group-hover:-translate-x-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2) Lessons Page Screen
  if (subView === 'lessons') {
    return (
      <div className="space-y-4 text-right font-['Tajawal',sans-serif]">
        {/* Top Navigation: Return to Choices Screen */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setSubView(null)}
            className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer group"
          >
            <ArrowRight className="w-4 h-4 text-blue-600 transition group-hover:-translate-x-0.5" />
            <span>رجوع لخيارات المادة</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              {subject.name} • {subjectLessons.length} درس
            </span>
          </div>
        </div>

        {/* Action Row & Title with Download All */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-blue-50 border border-blue-100 p-4 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-blue-950">شروحات ودروس المنهج</h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadAllLessons}
              disabled={isDownloadingAllLessons || subjectLessons.length === 0}
              className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="تنزيل كامل الشروحات والدروس كملف PDF"
            >
              {isDownloadingAllLessons ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isDownloadingAllLessons ? 'جاري تجهيز الملف...' : 'تنزيل كامل الدروس والشروحات (PDF)'}</span>
            </button>

            {canEditCurrentSubject && (
              <button
                onClick={onOpenAddLesson}
                className="py-2 px-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة درس</span>
              </button>
            )}
          </div>
        </div>

        {/* Lessons List (Each card shows ONLY the title and download button) */}
        <div className="space-y-2.5">
          {subjectLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              subject={subject}
              isCompleted={completedLessonIds.includes(lesson.id)}
              isBookmarked={bookmarkedLessonIds.includes(lesson.id)}
              onSelect={onSelectLesson}
              onToggleComplete={onToggleComplete}
              onToggleBookmark={onToggleBookmark}
              onEdit={canEditCurrentSubject ? onOpenEditLesson : undefined}
              onDelete={canEditCurrentSubject ? onDeleteLesson : undefined}
            />
          ))}

          {subjectLessons.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">لا توجد شروحات مضافة حالياً في هذه المادة</p>
            </div>
          )}
        </div>

        {/* WhatsApp Group Direct Button */}
        <a
          id="whatsapp-lessons-btn"
          href="https://chat.whatsapp.com/E8lRfoLDghq3syUGzeBfl7?s=cl&p=i&mlu=4&ilr=4"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>الدخول لقروب الواتساب</span>
        </a>

        {/* Notice under lessons: site is experimental */}
        <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center justify-center gap-2 text-amber-900 text-xs font-bold text-center shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>تنبيه: هذا الموقع تجريبي</span>
        </div>
      </div>
    );
  }

  // 3) Booklets Page Screen
  return (
    <div className="space-y-4 text-right font-['Tajawal',sans-serif]">
      {/* Top Navigation: Return to Choices Screen */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setSubView(null)}
          className="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer group"
        >
          <ArrowRight className="w-4 h-4 text-emerald-600 transition group-hover:-translate-x-0.5" />
          <span>رجوع لخيارات المادة</span>
        </button>

        <span className="text-xs font-bold text-slate-500">
          {subject.name} • {subjectBooklets.length} مذكرة
        </span>
      </div>

      {/* Action Row & Title with Download All */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-emerald-950">الملخصات والمذكرات</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadAllBooklets}
            disabled={isDownloadingAllBooklets || subjectBooklets.length === 0}
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            title="تنزيل كامل الملخصات والمذكرات"
          >
            {isDownloadingAllBooklets ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isDownloadingAllBooklets ? 'جاري التنزيل...' : 'تنزيل كامل الملخصات (PDF)'}</span>
          </button>

          {canEditCurrentSubject && (
            <button
              onClick={() => setIsAddBookletModalOpen(true)}
              className="py-2 px-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة ملزمة</span>
            </button>
          )}
        </div>
      </div>

      {/* Booklets List */}
      <div className="space-y-3">
        {subjectBooklets.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm sm:text-base">
                    {b.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                      📄 {b.pagesCount}
                    </span>
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">
                      إشراف: {b.supervisorName}
                    </span>
                  </div>
                </div>
              </div>

              {canEditCurrentSubject && (
                <button
                  onClick={() => onDeleteBooklet(b.id)}
                  className="p-1.5 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="حذف المذكرة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => handleDownloadBooklet(b)}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل PDF</span>
              </button>
            </div>
          </div>
        ))}

        {subjectBooklets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">لا توجد مذكرات مضافة حالياً في هذه المادة</p>
          </div>
        )}
      </div>

      {/* Add Booklet Modal (For Supervisors) */}
      <AnimatePresence>
        {isAddBookletModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl text-right space-y-4"
            >
              <h3 className="text-base font-black text-slate-900">
                إضافة ملخص أو مذكرة جديدة للمادة
              </h3>

              <form onSubmit={handleCreateBooklet} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عنوان المذكرة / الملخص *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookletTitle}
                    onChange={(e) => setBookletTitle(e.target.value)}
                    placeholder="مثال: مذكرة شاملة لمقرر كيمياء 1"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد الصفحات
                  </label>
                  <input
                    type="text"
                    value={bookletPages}
                    onChange={(e) => setBookletPages(e.target.value)}
                    placeholder="مثال: 50 صفحة"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    إرفاق ملف المذكرة (PDF)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-600 file:ml-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                  />
                  {bookletFileName && (
                    <p className="text-[11px] text-emerald-600 font-bold mt-1">
                      تم اختيار: {bookletFileName}
                    </p>
                  )}
                  {fileError && <p className="text-[11px] text-rose-500 mt-1">{fileError}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddBookletModalOpen(false)}
                    className="py-2 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                  >
                    حفظ ونشر المذكرة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
