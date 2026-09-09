import React, { useState, useMemo } from 'react';
import { Subject, Homework, HomeworkSubmission, AttachedFile } from '../types';
import { useAuth, formatDisplayName } from '../context/AuthContext';
import {
  ClipboardList,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  BookOpen,
  HelpCircle,
  CheckCircle,
  Circle,
  X,
  Sparkles,
  FileText,
  Download,
  UploadCloud,
  FileCheck,
  Clock,
  Send,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerFileDownload } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';

interface DailyHomeworksViewProps {
  allSubjects: Subject[];
  homeworks: Homework[];
  onAddHomework: (hw: Omit<Homework, 'id' | 'createdAt'>) => void;
  onUpdateHomework?: (hw: Homework) => void;
  onDeleteHomework: (id: string) => void;
  completedHomeworkIds?: string[];
  onToggleCompleteHomework?: (id: string) => void;
  submissions?: HomeworkSubmission[];
  onSubmitSolution?: (sub: Omit<HomeworkSubmission, 'id' | 'submittedAt'>) => Promise<void>;
  onDeleteSubmission?: (submissionId: string) => Promise<void> | void;
}

export const DailyHomeworksView: React.FC<DailyHomeworksViewProps> = ({
  allSubjects,
  homeworks,
  onAddHomework,
  onUpdateHomework,
  onDeleteHomework,
  completedHomeworkIds = [],
  onToggleCompleteHomework,
  submissions = [],
  onSubmitSolution,
  onDeleteSubmission
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, canAddContent, canManageSubject } = useAuth();

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);

  // Form states for adding/editing homework
  const [formSubjectId, setFormSubjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Model solution PDF
  const [solutionFileName, setSolutionFileName] = useState('');
  const [solutionFileSize, setSolutionFileSize] = useState('');
  const [solutionFileDataUrl, setSolutionFileDataUrl] = useState<string | null>(null);

  // Student submission modal
  const [activeHomeworkForSubmission, setActiveHomeworkForSubmission] = useState<Homework | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [studentFileName, setStudentFileName] = useState('');
  const [studentFileSize, setStudentFileSize] = useState('');
  const [studentFileDataUrl, setStudentFileDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // PDF download loading state
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Filter & Sort Homeworks:
  // RULE: Submitted / completed homeworks are pushed to the very bottom!
  const sortedAndFilteredHomeworks = useMemo(() => {
    let list = [...homeworks];
    if (selectedSubjectFilter !== 'all') {
      list = list.filter((h) => h.subjectId === selectedSubjectFilter);
    }

    return list.sort((a, b) => {
      const aSub = submissions.some(
        (s) =>
          s.homeworkId === a.id &&
          ((user?.email && s.studentEmail.toLowerCase() === user.email.toLowerCase()) ||
            (user?.id && s.studentId === user.id))
      );
      const bSub = submissions.some(
        (s) =>
          s.homeworkId === b.id &&
          ((user?.email && s.studentEmail.toLowerCase() === user.email.toLowerCase()) ||
            (user?.id && s.studentId === user.id))
      );

      // Unsubmitted comes first, submitted goes to the bottom
      if (!aSub && bSub) return -1;
      if (aSub && !bSub) return 1;

      // Completion check
      const aDone = completedHomeworkIds.includes(a.id);
      const bDone = completedHomeworkIds.includes(b.id);
      if (!aDone && bDone) return -1;
      if (aDone && !bDone) return 1;

      return (b.dueDate || '').localeCompare(a.dueDate || '');
    });
  }, [homeworks, selectedSubjectFilter, submissions, user, completedHomeworkIds]);

  const canUserAddAnyHomework =
    isSuperAdmin ||
    isAssistantAdmin ||
    canAddContent ||
    (user?.role === 'supervisor' || user?.role === 'teacher' || (user?.jobTitle && user.jobTitle !== 'طالب'));

  const handleOpenAddModal = () => {
    setEditingHomework(null);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDueDate(`${yyyy}-${mm}-${dd}`);
    setFormSubjectId(allSubjects[0]?.id || 'math-1');
    setPageNumber('');
    setQuestionNumber('');
    setTitle('');
    setNotes('');
    setFormError('');
    setSolutionFileName('');
    setSolutionFileSize('');
    setSolutionFileDataUrl(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (hw: Homework) => {
    setEditingHomework(hw);
    setFormSubjectId(hw.subjectId);
    setDueDate(hw.dueDate);
    setPageNumber(hw.pageNumber);
    setQuestionNumber(hw.questionNumber);
    setTitle(hw.title || '');
    setNotes(hw.notes || '');
    setFormError('');
    if (hw.solutionFile) {
      setSolutionFileName(hw.solutionFile.name);
      setSolutionFileSize(hw.solutionFile.size);
      setSolutionFileDataUrl(hw.solutionFile.dataUrl || null);
    } else {
      setSolutionFileName('');
      setSolutionFileSize('');
      setSolutionFileDataUrl(null);
    }
    setIsAddModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('يرجى اختيار ملف بصيغة PDF فقط.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. الحد الأقصى المسموح به 15 ميجابايت.');
      return;
    }

    const sizeStr = (file.size / 1024 / 1024).toFixed(1) + ' MB';
    setSolutionFileName(file.name);
    setSolutionFileSize(sizeStr);

    const reader = new FileReader();
    reader.onload = () => {
      setSolutionFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStudentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('يرجى اختيار ملف حل بصيغة PDF فقط.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. الحد الأقصى المسموح به 15 ميجابايت.');
      return;
    }

    const sizeStr = (file.size / 1024 / 1024).toFixed(1) + ' MB';
    setStudentFileName(file.name);
    setStudentFileSize(sizeStr);

    const reader = new FileReader();
    reader.onload = () => {
      setStudentFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitHomeworkForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate || !pageNumber.trim() || !questionNumber.trim() || !formSubjectId) {
      setFormError('يرجى تحديد المادة وتعبئة تاريخ التسليم، رقم الصفحة، ورقم السؤال.');
      return;
    }

    let solutionFile: AttachedFile | undefined = undefined;
    if (solutionFileName && solutionFileDataUrl) {
      solutionFile = {
        hasFile: true,
        name: solutionFileName,
        type: 'pdf',
        size: solutionFileSize || '1 MB',
        dataUrl: solutionFileDataUrl
      };
    } else if (editingHomework?.solutionFile && solutionFileName) {
      solutionFile = editingHomework.solutionFile;
    }

    const supervisorName = formatDisplayName(user?.name, true);

    if (editingHomework) {
      if (onUpdateHomework) {
        onUpdateHomework({
          ...editingHomework,
          subjectId: formSubjectId,
          dueDate: dueDate.trim(),
          pageNumber: pageNumber.trim(),
          questionNumber: questionNumber.trim(),
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
          solutionFile
        });
      }
    } else {
      onAddHomework({
        subjectId: formSubjectId,
        dueDate: dueDate.trim(),
        pageNumber: pageNumber.trim(),
        questionNumber: questionNumber.trim(),
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
        supervisorName,
        solutionFile
      });
    }

    setIsAddModalOpen(false);
    setEditingHomework(null);
  };

  const handleOpenStudentSubmitModal = (hw: Homework) => {
    setActiveHomeworkForSubmission(hw);
    setSubmitSuccess(false);

    const existing = submissions.find(
      (s) =>
        s.homeworkId === hw.id &&
        ((user?.email && s.studentEmail.toLowerCase() === user.email.toLowerCase()) ||
          (user?.id && s.studentId === user.id))
    );

    if (existing) {
      setStudentNotes(existing.notes || '');
      if (existing.attachedFile) {
        setStudentFileName(existing.attachedFile.name);
        setStudentFileSize(existing.attachedFile.size);
        setStudentFileDataUrl(existing.attachedFile.dataUrl || null);
      } else {
        setStudentFileName('');
        setStudentFileSize('');
        setStudentFileDataUrl(null);
      }
    } else {
      setStudentNotes('');
      setStudentFileName('');
      setStudentFileSize('');
      setStudentFileDataUrl(null);
    }
  };

  const handleStudentSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHomeworkForSubmission || !onSubmitSolution) return;

    setIsSubmitting(true);
    try {
      let attachedFile: AttachedFile | undefined = undefined;
      if (studentFileName && studentFileDataUrl) {
        attachedFile = {
          hasFile: true,
          name: studentFileName,
          type: 'pdf',
          size: studentFileSize || '1 MB',
          dataUrl: studentFileDataUrl
        };
      }

      await onSubmitSolution({
        homeworkId: activeHomeworkForSubmission.id,
        subjectId: activeHomeworkForSubmission.subjectId,
        studentId: user?.id || 'guest',
        studentName: user?.name || 'طالب',
        studentEmail: user?.email || '',
        notes: studentNotes.trim() || undefined,
        attachedFile
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setActiveHomeworkForSubmission(null);
        setSubmitSuccess(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert('حدث خطأ أثناء رفع حل الواجب. يرجى المحاولة مجدداً.');
    }
  };

  const handleDownloadPdf = async (fileId?: string, dataUrl?: string, filename?: string) => {
    const targetName = filename || 'ملف_الواجب.pdf';
    setDownloadingFileId(fileId || targetName);
    try {
      let urlToDownload = dataUrl;
      if (!urlToDownload && fileId) {
        urlToDownload = (await getLargeFile(fileId)) || (await downloadFileFromCloud(fileId)) || undefined;
      }
      if (urlToDownload) {
        triggerFileDownload(urlToDownload, targetName);
      } else {
        alert('تعذر استرداد ملف الـ PDF. يرجى التحقق من اتصال الإنترنت.');
      }
    } catch (err) {
      console.warn('PDF download error:', err);
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 text-right font-['Tajawal',sans-serif]">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              قسم الواجبات المدرسية
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              استعراض الواجبات المحددة، رفع حلول الـ PDF، ومتابعة إنجازك الدراسي
            </p>
          </div>
        </div>

        {canUserAddAnyHomework && (
          <button
            onClick={handleOpenAddModal}
            className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة واجب جديد</span>
          </button>
        )}
      </div>

      {/* Subject Filter Pills if homeworks exist */}
      {homeworks.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedSubjectFilter('all')}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedSubjectFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            جميع المواد ({homeworks.length})
          </button>
          {allSubjects.map((sub) => {
            const count = homeworks.filter((h) => h.subjectId === sub.id).length;
            if (count === 0) return null;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectFilter(sub.id)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedSubjectFilter === sub.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{sub.emoji || '📖'}</span>
                <span>{sub.name}</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Homeworks List: Empty State or Cards */}
      {sortedAndFilteredHomeworks.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-800">
              لا توجد واجبات حالياً
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              عند قيام المعلمين بإضافة أي واجب مدرسي جديد، سيظهر هنا مباشرة لتسليمه ومتابعته.
            </p>
          </div>
          {canUserAddAnyHomework && (
            <button
              onClick={handleOpenAddModal}
              className="py-2.5 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول واجب</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {sortedAndFilteredHomeworks.map((hw) => {
            const subject = allSubjects.find((s) => s.id === hw.subjectId);
            const isCompleted = completedHomeworkIds.includes(hw.id);
            const studentSub = submissions.find(
              (s) =>
                s.homeworkId === hw.id &&
                ((user?.email && s.studentEmail.toLowerCase() === user.email.toLowerCase()) ||
                  (user?.id && s.studentId === user.id))
            );
            const hasStudentSubmission = !!studentSub;
            const canManageThis = canManageSubject(hw.subjectId);

            return (
              <motion.div
                key={hw.id}
                layout
                className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between space-y-3.5 ${
                  hasStudentSubmission || isCompleted
                    ? 'border-emerald-200/80 bg-emerald-50/20'
                    : 'border-slate-200/90 shadow-2xs hover:shadow-xs'
                }`}
              >
                {/* Top Row: Subject Tag + Date + Complete Toggle */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/70 text-xs font-black flex items-center gap-1">
                      <span>{subject?.emoji || '📖'}</span>
                      <span>{subject?.name || 'مقرر دراسي'}</span>
                    </span>

                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>تسليم: {hw.dueDate}</span>
                    </span>
                  </div>

                  {/* Complete Checkbox Toggle */}
                  <button
                    onClick={() => onToggleCompleteHomework && onToggleCompleteHomework(hw.id)}
                    className={`py-1 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isCompleted || hasStudentSubmission
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                    title="تحديد كمنجز"
                  >
                    {isCompleted || hasStudentSubmission ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>تم الإنجاز</span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 text-slate-400" />
                        <span>لم يُنجز</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Title and Specs */}
                <div className="space-y-2">
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">
                    {hw.title || `واجب صـ ${hw.pageNumber} - سؤال ${hw.questionNumber}`}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>صفحة: <strong className="text-slate-800">{hw.pageNumber}</strong></span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-purple-600" />
                      <span>سؤال: <strong className="text-slate-800">{hw.questionNumber}</strong></span>
                    </div>
                  </div>

                  {hw.notes && (
                    <p className="text-xs text-slate-600 bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl leading-relaxed">
                      💬 {hw.notes}
                    </p>
                  )}
                </div>

                {/* Teacher Model Solution Download if provided */}
                {hw.solutionFile?.hasFile && (
                  <button
                    onClick={() =>
                      handleDownloadPdf(
                        hw.solutionFile?.fileId,
                        hw.solutionFile?.dataUrl,
                        hw.solutionFile?.name || `${hw.title || 'حل'}_نموذجي.pdf`
                      )
                    }
                    disabled={downloadingFileId === (hw.solutionFile?.fileId || hw.solutionFile?.name)}
                    className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>الحل النموذجي المرفق (PDF)</span>
                    </div>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Student Submission Card status */}
                {hasStudentSubmission && studentSub && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-emerald-900 font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم تسليم حلك لهذا الواجب</span>
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        {new Date(studentSub.submittedAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>

                    {studentSub.attachedFile?.hasFile && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-600 truncate max-w-[180px]">
                          📎 {studentSub.attachedFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadPdf(
                              studentSub.attachedFile?.fileId,
                              studentSub.attachedFile?.dataUrl,
                              studentSub.attachedFile?.name || 'حلي.pdf'
                            )
                          }
                          className="text-[11px] font-bold text-emerald-700 underline cursor-pointer"
                        >
                          تحميل حلي
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Row: Delete/Edit (if teacher), Student Submit/Delete */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-1">
                    {canManageThis && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(hw)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                          title="تعديل الواجب"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من حذف هذا الواجب؟')) {
                              onDeleteHomework(hw.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="حذف الواجب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasStudentSubmission && studentSub && onDeleteSubmission && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('هل تريد حذف حلك المسلم لهذا الواجب؟ سيمكنك رفع حل جديد في أي وقت.')) {
                            onDeleteSubmission(studentSub.id);
                          }
                        }}
                        className="py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 shadow-2xs"
                        title="حذف الحل المسلم"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>حذف الحل</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenStudentSubmitModal(hw)}
                      className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        hasStudentSubmission
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{hasStudentSubmission ? 'تعديل الحل' : 'إرفاق / تسليم الحل'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Homework Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {editingHomework ? 'تعديل الواجب المدرسي' : 'إضافة واجب مدرسي جديد'}
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmitHomeworkForm} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المقرر الدراسي</label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {allSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الصفحة</label>
                    <input
                      type="text"
                      value={pageNumber}
                      onChange={(e) => setPageNumber(e.target.value)}
                      placeholder="مثال: 45"
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم السؤال</label>
                    <input
                      type="text"
                      value={questionNumber}
                      onChange={(e) => setQuestionNumber(e.target.value)}
                      placeholder="مثال: 3، 4"
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الواجب (اختياري)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تدريبات البرمجة بلغة بايثون"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التسليم الأقصى</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات المعلم</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="تعليمات حل الواجب..."
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحل النموذجي (اختياري بصيغة PDF)</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-500 file:mr-0 file:ml-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  {solutionFileName && (
                    <span className="text-[11px] text-emerald-600 block mt-1">
                      تم اختيار: {solutionFileName} ({solutionFileSize})
                    </span>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-black transition cursor-pointer shadow-xs"
                  >
                    {editingHomework ? 'حفظ التعديلات' : 'إضافة الواجب'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Submit Solution Modal */}
      <AnimatePresence>
        {activeHomeworkForSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-purple-600" />
                  <span>تسليم حل الواجب المدرسي</span>
                </h3>
                <button
                  onClick={() => setActiveHomeworkForSubmission(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-emerald-800">تم استلام الحل بنجاح!</h4>
                  <p className="text-xs text-slate-500">تم تسجيل حل الواجب باسمك وإرفاقه بالمنصة.</p>
                </div>
              ) : (
                <form onSubmit={handleStudentSubmitSolution} className="space-y-4">
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl space-y-1 text-xs">
                    <span className="font-black text-purple-900 block">
                      {activeHomeworkForSubmission.title || 'تفاصيل الواجب'}
                    </span>
                    <span className="text-purple-700 block">
                      صفحة: {activeHomeworkForSubmission.pageNumber} • سؤال: {activeHomeworkForSubmission.questionNumber}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ملف الحل (بصيغة PDF)
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleStudentFileChange}
                      className="w-full text-xs text-slate-500 file:mr-0 file:ml-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200"
                    />
                    {studentFileName && (
                      <span className="text-[11px] text-emerald-600 font-bold block mt-1">
                        تم اختيار: {studentFileName} ({studentFileSize})
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ملاحظات أو توضيحات على الحل (اختياري)
                    </label>
                    <textarea
                      rows={3}
                      value={studentNotes}
                      onChange={(e) => setStudentNotes(e.target.value)}
                      placeholder="أضف أي ملاحظات تود إيصالها للمعلم..."
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    {submissions.find(
                      (s) =>
                        s.homeworkId === activeHomeworkForSubmission.id &&
                        (s.studentId === user?.id || s.studentEmail === user?.email)
                    ) && onDeleteSubmission ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const existingSub = submissions.find(
                            (s) =>
                              s.homeworkId === activeHomeworkForSubmission.id &&
                              (s.studentId === user?.id || s.studentEmail === user?.email)
                          );
                          if (existingSub && window.confirm('هل تريد حذف حلك المسلم لهذا الواجب؟ يمكنك رفع حل جديد لاحقاً.')) {
                            await onDeleteSubmission(existingSub.id);
                            setActiveHomeworkForSubmission(null);
                          }
                        }}
                        className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>حذف الحل</span>
                      </button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveHomeworkForSubmission(null)}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs md:text-sm font-black transition cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'جارٍ التسليم...' : 'تسليم الحل'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
