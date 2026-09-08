import React, { useState } from 'react';
import { Subject, Homework, HomeworkSubmission, AttachedFile } from '../types';
import { useAuth, formatDisplayName } from '../context/AuthContext';
import {
  ArrowRight,
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
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerFileDownload } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';

interface HomeworkSectionProps {
  subject: Subject;
  homeworks: Homework[];
  onBack: () => void;
  onAddHomework: (hw: Omit<Homework, 'id' | 'createdAt'>) => void;
  onUpdateHomework?: (hw: Homework) => void;
  onDeleteHomework: (id: string) => void;
  completedHomeworkIds?: string[];
  onToggleCompleteHomework?: (id: string) => void;
  canEdit: boolean;
  submissions?: HomeworkSubmission[];
  onSubmitSolution?: (sub: Omit<HomeworkSubmission, 'id' | 'submittedAt'>) => Promise<void>;
}

export const HomeworkSection: React.FC<HomeworkSectionProps> = ({
  subject,
  homeworks,
  onBack,
  onAddHomework,
  onUpdateHomework,
  onDeleteHomework,
  completedHomeworkIds = [],
  onToggleCompleteHomework,
  canEdit,
  submissions = [],
  onSubmitSolution
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, canAddContent } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);

  // Form states for Teacher Add / Edit Homework
  const [dueDate, setDueDate] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Teacher Optional Model Solution PDF
  const [solutionFileName, setSolutionFileName] = useState('');
  const [solutionFileSize, setSolutionFileSize] = useState('');
  const [solutionFileDataUrl, setSolutionFileDataUrl] = useState<string | null>(null);

  // Student Submit Solution Modal
  const [activeHomeworkForSubmission, setActiveHomeworkForSubmission] = useState<Homework | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [studentFileName, setStudentFileName] = useState('');
  const [studentFileSize, setStudentFileSize] = useState('');
  const [studentFileDataUrl, setStudentFileDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // PDF Download tracking
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const subjectHomeworks = homeworks.filter((h) => h.subjectId === subject.id);

  // Open Teacher Add Homework Modal
  const handleOpenAddModal = () => {
    setEditingHomework(null);
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
    setSolutionFileName('');
    setSolutionFileSize('');
    setSolutionFileDataUrl(null);
    setIsAddModalOpen(true);
  };

  // Open Teacher Edit Homework Modal
  const handleOpenEditModal = (hw: Homework) => {
    setEditingHomework(hw);
    setDueDate(hw.dueDate || '');
    setPageNumber(hw.pageNumber || '');
    setQuestionNumber(hw.questionNumber || '');
    setTitle(hw.title || '');
    setNotes(hw.notes || '');
    setFormError('');
    if (hw.solutionFile?.hasFile) {
      setSolutionFileName(hw.solutionFile.name || 'الحل_النموذجي.pdf');
      setSolutionFileSize(hw.solutionFile.size || '1 MB');
      setSolutionFileDataUrl(hw.solutionFile.dataUrl || null);
    } else {
      setSolutionFileName('');
      setSolutionFileSize('');
      setSolutionFileDataUrl(null);
    }
    setIsAddModalOpen(true);
  };

  // Handle Teacher PDF file selection
  const handleTeacherFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      alert('يرجى اختيار ملف بصيغة PDF فقط');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('الحد الأقصى لحجم الملف هو 20 ميجابايت');
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    setSolutionFileName(file.name);
    setSolutionFileSize(sizeFormatted);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSolutionFileDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Teacher Add or Edit Homework Submission
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

    const isTeacher =
      isSuperAdmin ||
      isAssistantAdmin ||
      canAddContent ||
      (user && user.jobTitle !== 'طالب');
    const rawSupervisor =
      user?.name || (isSuperAdmin ? 'المشرف الأساسي' : subject.supervisorName);
    const supervisorName = formatDisplayName(rawSupervisor, isTeacher);

    const solutionFile: AttachedFile | undefined = solutionFileName
      ? {
          name: solutionFileName || 'الحل_النموذجي.pdf',
          type: 'pdf',
          size: solutionFileSize || '1 MB',
          dataUrl: solutionFileDataUrl || editingHomework?.solutionFile?.dataUrl,
          fileId: solutionFileDataUrl ? undefined : editingHomework?.solutionFile?.fileId,
          hasFile: true
        }
      : undefined;

    if (editingHomework) {
      // Editing existing published homework
      if (onUpdateHomework) {
        onUpdateHomework({
          ...editingHomework,
          dueDate: dueDate.trim(),
          pageNumber: pageNumber.trim(),
          questionNumber: questionNumber.trim(),
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
          solutionFile
        });
      }
    } else {
      // Adding new homework
      onAddHomework({
        subjectId: subject.id,
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

  // Open Student Submit Solution Modal
  const handleOpenStudentSubmitModal = (hw: Homework) => {
    setActiveHomeworkForSubmission(hw);
    setSubmitSuccess(false);

    // If user already has a submission for this homework, pre-fill it
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

  // Handle Student PDF file selection
  const handleStudentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      alert('يرجى اختيار ملف بصيغة PDF فقط');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('الحد الأقصى لحجم الملف هو 20 ميجابايت');
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    setStudentFileName(file.name);
    setStudentFileSize(sizeFormatted);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStudentFileDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Student Solution Save
  const handleStudentSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHomeworkForSubmission) return;

    if (!studentNotes.trim() && !studentFileDataUrl) {
      alert('يرجى إرفاق ملف PDF للحل أو كتابة إجابتك وملاحظاتك');
      return;
    }

    setIsSubmitting(true);

    const studentAttachedFile: AttachedFile | undefined = studentFileDataUrl
      ? {
          name: studentFileName || 'حل_الواجب.pdf',
          type: 'pdf',
          size: studentFileSize || '1 MB',
          dataUrl: studentFileDataUrl,
          hasFile: true
        }
      : undefined;

    if (onSubmitSolution) {
      await onSubmitSolution({
        homeworkId: activeHomeworkForSubmission.id,
        subjectId: subject.id,
        studentId: user?.id || 'guest-' + Date.now(),
        studentName: user?.name || 'طالب',
        studentEmail: user?.email || 'student@thanaweya.sa',
        notes: studentNotes.trim() || undefined,
        attachedFile: studentAttachedFile
      });
    }

    setIsSubmitting(false);
    setSubmitSuccess(true);
    setTimeout(() => {
      setActiveHomeworkForSubmission(null);
    }, 1200);
  };

  // Safe Universal Download Helper
  const handleDownloadPdf = async (
    fileId?: string,
    dataUrl?: string,
    fileName: string = 'ملف.pdf'
  ) => {
    if (!fileId && !dataUrl) return;
    setDownloadingFileId(fileId || fileName);

    try {
      if (dataUrl) {
        triggerFileDownload(dataUrl, fileName);
        setDownloadingFileId(null);
        return;
      }

      if (fileId) {
        const cached = await getLargeFile(fileId);
        if (cached) {
          triggerFileDownload(cached, fileName);
          setDownloadingFileId(null);
          return;
        }

        const downloaded = await downloadFileFromCloud(fileId);
        if (downloaded) {
          triggerFileDownload(downloaded, fileName);
        } else {
          alert('تعذر تحميل الملف السحابي');
        }
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingFileId(null);
    }
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/80 p-4 sm:p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              واجبات {subject.name}
            </h3>
            <p className="text-xs text-slate-500">
              تابع الواجبات المدرسية وقم بإرفاق حلولك والاطلاع على الحل النموذجي
            </p>
          </div>
        </div>

        {canEdit && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenAddModal}
            className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة واجب جديد</span>
          </motion.button>
        )}
      </div>

      {/* Homework Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-5">
        <AnimatePresence>
          {subjectHomeworks.map((hw, idx) => {
            const isCompleted = completedHomeworkIds.includes(hw.id);

            // Check if current student submitted a solution
            const studentSub = submissions.find(
              (s) =>
                s.homeworkId === hw.id &&
                ((user?.email && s.studentEmail.toLowerCase() === user.email.toLowerCase()) ||
                  (user?.id && s.studentId === user.id))
            );

            const hasStudentSubmission = !!studentSub;
            const isDownloadingModel =
              downloadingFileId === (hw.solutionFile?.fileId || `hw-sol-${hw.id}`);
            const isDownloadingStudentSol =
              studentSub &&
              downloadingFileId === (studentSub.attachedFile?.fileId || `sub-sol-${studentSub.id}`);

            return (
              <motion.div
                key={hw.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className={`rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between relative overflow-hidden group shadow-2xs hover:shadow-md ${
                  hasStudentSubmission || isCompleted
                    ? 'bg-slate-50/90 border-emerald-300'
                    : 'bg-white border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Top line: Date & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <span>تاريخ الواجب: {hw.dueDate}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {onToggleCompleteHomework && (
                        <button
                          onClick={() => onToggleCompleteHomework(hw.id)}
                          className={`p-1.5 rounded-xl transition cursor-pointer ${
                            isCompleted || hasStudentSubmission
                              ? 'text-emerald-600 bg-emerald-100/70 hover:bg-emerald-200'
                              : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                          }`}
                          title={
                            isCompleted || hasStudentSubmission
                              ? 'تم إنجاز الواجب'
                              : 'تحديد كمنجز'
                          }
                        >
                          {isCompleted || hasStudentSubmission ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                      )}

                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(hw)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="تعديل الواجب"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteHomework(hw.id)}
                            className="p-1.5 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="حذف الواجب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title if present */}
                  {hw.title && (
                    <h4
                      className={`font-black text-sm sm:text-base leading-snug ${
                        isCompleted || hasStudentSubmission
                          ? 'text-slate-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {hw.title}
                    </h4>
                  )}

                  {/* Key Assignment Details: Page & Question */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
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

                  {/* Notes / Instructions */}
                  {hw.notes && (
                    <p className="text-xs text-slate-600 bg-amber-50/60 border border-amber-100/70 p-2.5 rounded-xl leading-relaxed">
                      💬 {hw.notes}
                    </p>
                  )}

                  {/* Teacher Model Solution PDF Download Button */}
                  {hw.solutionFile?.hasFile && (
                    <div className="pt-1">
                      <button
                        onClick={() =>
                          handleDownloadPdf(
                            hw.solutionFile?.fileId,
                            hw.solutionFile?.dataUrl,
                            hw.solutionFile?.name || `${hw.title || 'حل'}_نموذجي.pdf`
                          )
                        }
                        disabled={isDownloadingModel}
                        className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span>الحل النموذجي المرفق (PDF)</span>
                        </div>
                        <Download
                          className={`w-3.5 h-3.5 ${
                            isDownloadingModel ? 'animate-bounce text-emerald-700' : ''
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Student Submission Card Status / Attached file */}
                  {hasStudentSubmission && (
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-black text-emerald-800">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          تم تسليم حلك بنجاح ✓
                        </span>
                        <span className="text-slate-400 font-normal">
                          {studentSub.submittedAt ? studentSub.submittedAt.split('T')[0] : ''}
                        </span>
                      </div>

                      {studentSub.attachedFile?.hasFile && (
                        <button
                          onClick={() =>
                            handleDownloadPdf(
                              studentSub.attachedFile?.fileId,
                              studentSub.attachedFile?.dataUrl,
                              studentSub.attachedFile?.name || 'حلي.pdf'
                            )
                          }
                          disabled={isDownloadingStudentSol}
                          className="w-full py-1.5 px-2 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-200/80 rounded-xl text-[11px] font-bold transition flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            {studentSub.attachedFile.name || 'ملف حلي المرفق (PDF)'}
                          </span>
                          <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        </button>
                      )}

                      {studentSub.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-white/70 p-1.5 rounded-lg">
                          "{studentSub.notes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Action button to submit solution & supervisor info */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 font-medium truncate">
                    إشراف: {hw.supervisorName}
                  </span>

                  <button
                    onClick={() => handleOpenStudentSubmitModal(hw)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs ${
                      hasStudentSubmission
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{hasStudentSubmission ? 'تعديل الحل' : 'إرفاق / تسليم الحل'}</span>
                  </button>
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
            <h4 className="text-sm sm:text-base font-black text-slate-800">
              لا توجد واجبات مسجلة حالياً
            </h4>
            {canEdit && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpenAddModal}
                className="mt-2 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة واجب</span>
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Teacher Add Homework Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-slate-100 text-right space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    {editingHomework ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base md:text-lg">
                      {editingHomework ? 'تعديل تفاصيل الواجب' : `إضافة واجب لمادة ${subject.name}`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {editingHomework
                        ? 'يمكنك تعديل أي بيانات واستبدال أو حذف ملف الحل النموذجي'
                        : 'سيظهر فوراً لجميع الطلاب مع إمكانية إرفاق ملف الحل النموذجي'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingHomework(null);
                  }}
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

                {/* Optional Model Solution PDF Upload */}
                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-3.5 space-y-2">
                  <label className="block text-xs font-black text-purple-900">
                    إرفاق ملف الحل النموذجي (PDF) - <span className="text-purple-600 font-normal">اختياري</span>
                  </label>
                  <p className="text-[11px] text-purple-700">
                    يمكنك إرفاق ملف PDF يحتوي على الحل النموذجي ليتمكن الطلاب من مراجعته
                  </p>

                  {solutionFileName ? (
                    <div className="flex items-center justify-between bg-white border border-purple-200 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {solutionFileName} ({solutionFileSize})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSolutionFileName('');
                          setSolutionFileSize('');
                          setSolutionFileDataUrl(null);
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="حذف الملف المرفق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-200 hover:border-purple-400 bg-white/80 hover:bg-white rounded-xl cursor-pointer transition text-center">
                      <UploadCloud className="w-6 h-6 text-purple-600 mb-1" />
                      <span className="text-xs font-bold text-purple-900">
                        اضغط هنا لرفع ملف الحل (PDF)
                      </span>
                      <span className="text-[10px] text-slate-400">حتى 20 ميجابايت</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleTeacherFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

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
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingHomework(null);
                    }}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs md:text-sm font-black transition cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    {editingHomework ? <Edit3 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    <span>{editingHomework ? 'حفظ التعديلات' : 'نشر الواجب'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Student Submit Solution Modal */}
      <AnimatePresence>
        {activeHomeworkForSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-slate-100 text-right space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base md:text-lg">
                      تسليم حل الواجب
                    </h3>
                    <p className="text-xs text-slate-500">
                      صـ {activeHomeworkForSubmission.pageNumber} - السؤال {activeHomeworkForSubmission.questionNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveHomeworkForSubmission(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-black flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>تم حفظ وتسليم الحل بنجاح! سيتمكن معلمك من مراجعته.</span>
                </div>
              )}

              <form onSubmit={handleStudentSubmitSolution} className="space-y-4 text-right">
                {/* Optional PDF File Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-800">
                    إرفاق ملف الحل (PDF) - <span className="text-purple-600 font-normal">اختياري</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    يمكنك تصوير حلك وتحويله لـ PDF أو رفع ملف PDF مباشرة من جهازك
                  </p>

                  {studentFileName ? (
                    <div className="flex items-center justify-between bg-purple-50 border border-purple-200 p-3 rounded-2xl">
                      <div className="flex items-center gap-2 truncate">
                        <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-black text-slate-900 block truncate">
                            {studentFileName}
                          </span>
                          <span className="text-[10px] text-slate-500">{studentFileSize}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentFileName('');
                          setStudentFileSize('');
                          setStudentFileDataUrl(null);
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        title="إلغاء الملف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 hover:border-purple-400 bg-slate-50 hover:bg-white rounded-2xl cursor-pointer transition text-center">
                      <UploadCloud className="w-7 h-7 text-purple-600 mb-1.5" />
                      <span className="text-xs font-black text-slate-800">
                        اضغط لرفع ملف حل الواجب (PDF)
                      </span>
                      <span className="text-[10px] text-slate-400">PDF حتى 20 ميجابايت</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handleStudentFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Optional Student Text Answer / Notes */}
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1">
                    كتابة الإجابة أو ملاحظاتك للمعلم <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="اكتب حلك أو أسئلتك للمعلم هنا..."
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
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
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
