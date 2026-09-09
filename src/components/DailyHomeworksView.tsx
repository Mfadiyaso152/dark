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
  Filter,
  Camera,
  Image as ImageIcon,
  Eye,
  ChevronDown,
  ChevronUp
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

// Helper: process image with canvas resize and JPEG compression for fast upload & small storage
const processImageFile = (file: File): Promise<{ dataUrl: string; size: string; name: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: reader.result as string,
            size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
            name: file.name
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const byteLength = Math.round((dataUrl.length * 3) / 4);
        const sizeStr =
          byteLength > 1024 * 1024
            ? (byteLength / 1024 / 1024).toFixed(1) + ' MB'
            : Math.round(byteLength / 1024) + ' KB';

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        resolve({
          dataUrl,
          size: sizeStr,
          name: `${baseName || 'صورة_واجب'}.jpg`
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

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

  const isSupervisor =
    isSuperAdmin ||
    user?.email?.toLowerCase() === 'mfb.15.f@gmail.com' ||
    user?.email?.toLowerCase() === 'kalshrby90@gmail.com' ||
    user?.jobTitle === 'مشرف مساعد' ||
    user?.jobTitle === 'المشرف الأساسي' ||
    user?.role === 'supervisor';

  const isTeacher =
    !isSupervisor &&
    (user?.role === 'teacher' || (!!user?.jobTitle && user?.jobTitle !== 'طالب'));

  // Submit button is ONLY for students, never for teachers or supervisors
  const canSubmitHomework = !isTeacher && !isSupervisor;

  // Restrict allowed subjects for adding/editing homework - ONLY Semester 1 (P1)
  const allowedSubjects = useMemo(() => {
    const p1Subjects = allSubjects.filter((s) => s.semester === 1);
    if (isSupervisor) return p1Subjects;
    if (isTeacher) {
      const filtered = p1Subjects.filter((s) => canManageSubject(s.id));
      return filtered.length > 0 ? filtered : p1Subjects;
    }
    return p1Subjects;
  }, [allSubjects, isSupervisor, isTeacher, canManageSubject]);

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

  // Model solution attachment
  const [solutionFileName, setSolutionFileName] = useState('');
  const [solutionFileSize, setSolutionFileSize] = useState('');
  const [solutionFileType, setSolutionFileType] = useState<AttachedFile['type']>('pdf');
  const [solutionFileDataUrl, setSolutionFileDataUrl] = useState<string | null>(null);

  // Student submission modal
  const [activeHomeworkForSubmission, setActiveHomeworkForSubmission] = useState<Homework | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [studentFileName, setStudentFileName] = useState('');
  const [studentFileSize, setStudentFileSize] = useState('');
  const [studentFileType, setStudentFileType] = useState<AttachedFile['type']>('pdf');
  const [studentFileDataUrl, setStudentFileDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Deletion confirm states (bypasses window.confirm in iframe)
  const [confirmDeleteHwId, setConfirmDeleteHwId] = useState<string | null>(null);
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<string | null>(null);

  // Lightbox Image Preview Modal state
  const [previewImageUrl, setPreviewImageUrl] = useState<{ url: string; name: string } | null>(null);

  // Expanded cards state ("عرض المزيد")
  const [expandedHwIds, setExpandedHwIds] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => {
    setExpandedHwIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // PDF download loading state
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const isImageAttachment = (name?: string, dataUrl?: string | null) => {
    if (dataUrl?.startsWith('data:image/')) return true;
    if (!name) return false;
    return /\.(jpe?g|png|webp|gif|bmp)$/i.test(name);
  };

  // Filter & Sort Homeworks:
  // RULE 1: Teachers only see their own subject's homeworks!
  // RULE 2: Submitted / completed homeworks are pushed to the very bottom!
  const sortedAndFilteredHomeworks = useMemo(() => {
    let list = [...homeworks];

    // If pure teacher, only show homeworks for their allowed subject
    if (isTeacher) {
      list = list.filter((h) => canManageSubject(h.subjectId));
    }

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
  }, [homeworks, isTeacher, canManageSubject, selectedSubjectFilter, submissions, user, completedHomeworkIds]);

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
    const defaultSub = allowedSubjects[0]?.id || allSubjects[0]?.id || 'math-1';
    setFormSubjectId(defaultSub);
    setPageNumber('');
    setQuestionNumber('');
    setTitle('');
    setNotes('');
    setFormError('');
    setSolutionFileName('');
    setSolutionFileSize('');
    setSolutionFileType('pdf');
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
      setSolutionFileType(hw.solutionFile.type || 'pdf');
      setSolutionFileDataUrl(hw.solutionFile.dataUrl || null);
    } else {
      setSolutionFileName('');
      setSolutionFileSize('');
      setSolutionFileType('pdf');
      setSolutionFileDataUrl(null);
    }
    setIsAddModalOpen(true);
  };

  const handleTeacherFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      if (file.size > 15 * 1024 * 1024) {
        alert('حجم الملف كبير جداً. الحد الأقصى 15 ميجابايت.');
        return;
      }
      const sizeStr = (file.size / 1024 / 1024).toFixed(1) + ' MB';
      setSolutionFileName(file.name);
      setSolutionFileSize(sizeStr);
      setSolutionFileType('pdf');
      const reader = new FileReader();
      reader.onload = () => setSolutionFileDataUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)) {
      try {
        const processed = await processImageFile(file);
        setSolutionFileName(processed.name);
        setSolutionFileSize(processed.size);
        setSolutionFileType('jpg');
        setSolutionFileDataUrl(processed.dataUrl);
      } catch (err) {
        console.warn('Image process error:', err);
      }
    } else {
      alert('يرجى اختيار صورة أو ملف PDF.');
    }
    e.target.value = '';
  };

  const handleStudentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      if (file.size > 15 * 1024 * 1024) {
        alert('حجم الملف كبير جداً. الحد الأقصى 15 ميجابايت.');
        return;
      }
      const sizeStr = (file.size / 1024 / 1024).toFixed(1) + ' MB';
      setStudentFileName(file.name);
      setStudentFileSize(sizeStr);
      setStudentFileType('pdf');
      const reader = new FileReader();
      reader.onload = () => setStudentFileDataUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)) {
      try {
        const processed = await processImageFile(file);
        setStudentFileName(processed.name);
        setStudentFileSize(processed.size);
        setStudentFileType('jpg');
        setStudentFileDataUrl(processed.dataUrl);
      } catch (err) {
        console.warn('Image process error:', err);
      }
    } else {
      alert('يرجى اختيار صورة أو ملف PDF.');
    }
    e.target.value = '';
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
        type: solutionFileType || 'pdf',
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
        setStudentFileType(existing.attachedFile.type || 'pdf');
        setStudentFileDataUrl(existing.attachedFile.dataUrl || null);
      } else {
        setStudentFileName('');
        setStudentFileSize('');
        setStudentFileType('pdf');
        setStudentFileDataUrl(null);
      }
    } else {
      setStudentNotes('');
      setStudentFileName('');
      setStudentFileSize('');
      setStudentFileType('pdf');
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
          type: studentFileType || 'pdf',
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

  const handleDownloadFile = async (fileId?: string, dataUrl?: string, filename?: string) => {
    const targetName = filename || 'ملف_الواجب';
    setDownloadingFileId(fileId || targetName);
    try {
      let urlToDownload = dataUrl;
      if (!urlToDownload && fileId) {
        urlToDownload = (await getLargeFile(fileId)) || (await downloadFileFromCloud(fileId)) || undefined;
      }
      if (urlToDownload) {
        triggerFileDownload(urlToDownload, targetName);
      } else {
        alert('تعذر استرداد الملف. يرجى التحقق من اتصال الإنترنت.');
      }
    } catch (err) {
      console.warn('File download error:', err);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handlePreviewImage = async (fileId?: string, dataUrl?: string, filename?: string) => {
    let url = dataUrl;
    if (!url && fileId) {
      url = (await getLargeFile(fileId)) || (await downloadFileFromCloud(fileId)) || undefined;
    }
    if (url) {
      setPreviewImageUrl({ url, name: filename || 'صورة الواجب' });
    } else {
      alert('تعذر تحميل الصورة للمعاينة.');
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
      {homeworks.length > 0 && !isTeacher && (
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
          {allSubjects.filter((sub) => sub.semester === 1).map((sub) => {
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

      {/* Teacher Assigned Subject Info Tag */}
      {isTeacher && allowedSubjects.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-black inline-flex items-center gap-2">
            <span>📚</span>
            <span>واجبات مادتك المسندة إليك: {allowedSubjects.map((s) => s.name).join('، ')}</span>
          </span>
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

            const isExpanded = !!expandedHwIds[hw.id];

            return (
              <motion.div
                key={hw.id}
                layout
                className={`bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border transition-all duration-200 flex flex-col justify-between space-y-2.5 ${
                  hasStudentSubmission
                    ? 'border-emerald-200/90 bg-emerald-50/20'
                    : 'border-slate-200/90 shadow-2xs hover:shadow-xs'
                }`}
              >
                {/* Top Row: Subject Tag + Date + Submission Badge (No "لم ينجز" button) */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/70 text-[11px] font-black flex items-center gap-1">
                      <span>{subject?.emoji || '📖'}</span>
                      <span>{subject?.name || 'مقرر دراسي'}</span>
                    </span>

                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>تسليم: {hw.dueDate}</span>
                    </span>
                  </div>

                  {hasStudentSubmission && (
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تم التسليم</span>
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug">
                    {hw.title || `واجب صـ ${hw.pageNumber} - سؤال ${hw.questionNumber}`}
                  </h3>
                </div>

                {/* Expanded Details: Page, Question, Notes/Description, Attached File, Submission details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2.5 pt-1 overflow-hidden"
                    >
                      {/* Specs: Page & Question */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>صفحة: <strong className="text-slate-800">{hw.pageNumber}</strong></span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>سؤال: <strong className="text-slate-800">{hw.questionNumber}</strong></span>
                        </div>
                      </div>

                      {/* Notes / Description */}
                      {hw.notes && (
                        <p className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-xl leading-relaxed">
                          💬 {hw.notes}
                        </p>
                      )}

                      {/* Teacher Model Solution Download / Preview */}
                      {hw.solutionFile?.hasFile && (
                        <div className="w-full p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 flex-wrap text-xs font-bold text-emerald-800">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isImageAttachment(hw.solutionFile?.name, hw.solutionFile?.dataUrl) ? (
                              <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px]">
                              الملف المرفق ({isImageAttachment(hw.solutionFile?.name, hw.solutionFile?.dataUrl) ? 'صورة' : 'PDF'})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isImageAttachment(hw.solutionFile?.name, hw.solutionFile?.dataUrl) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePreviewImage(
                                    hw.solutionFile?.fileId,
                                    hw.solutionFile?.dataUrl,
                                    hw.solutionFile?.name || `${hw.title || 'حل'}_نموذجي`
                                  )
                                }
                                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>معاينة</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadFile(
                                  hw.solutionFile?.fileId,
                                  hw.solutionFile?.dataUrl,
                                  hw.solutionFile?.name || `${hw.title || 'حل'}_نموذجي`
                                )
                              }
                              disabled={downloadingFileId === (hw.solutionFile?.fileId || hw.solutionFile?.name)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Download className="w-3 h-3" />
                              <span>تحميل</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Student Submission details */}
                      {hasStudentSubmission && studentSub && (
                        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
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
                            <div className="flex items-center justify-between pt-1 flex-wrap gap-1">
                              <span className="text-[11px] text-slate-600 truncate max-w-[180px] flex items-center gap-1">
                                {isImageAttachment(studentSub.attachedFile?.name, studentSub.attachedFile?.dataUrl) ? (
                                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                                <span>{studentSub.attachedFile.name}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isImageAttachment(studentSub.attachedFile?.name, studentSub.attachedFile?.dataUrl) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePreviewImage(
                                        studentSub.attachedFile?.fileId,
                                        studentSub.attachedFile?.dataUrl,
                                        studentSub.attachedFile?.name || 'حلي'
                                      )
                                    }
                                    className="text-[11px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-50 cursor-pointer flex items-center gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>معاينة</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadFile(
                                      studentSub.attachedFile?.fileId,
                                      studentSub.attachedFile?.dataUrl,
                                      studentSub.attachedFile?.name || 'حلي'
                                    )
                                  }
                                  className="text-[11px] font-bold text-emerald-700 underline cursor-pointer"
                                >
                                  تحميل
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bottom Action Row: Edit/Delete + Show More/Less + Submit Button */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  {/* Left: Teacher Edit/Delete or Student Delete Submission */}
                  <div className="flex items-center gap-1">
                    {canManageThis && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(hw)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="تعديل الواجب"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteHwId === hw.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                            <span className="text-[10px] font-bold text-rose-800 pr-1">حذف؟</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteHomework(hw.id);
                                setConfirmDeleteHwId(null);
                              }}
                              className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold transition cursor-pointer"
                            >
                              نعم
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteHwId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-bold transition cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteHwId(hw.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="حذف الواجب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}

                    {isExpanded && hasStudentSubmission && studentSub && onDeleteSubmission && (
                      confirmDeleteSubId === studentSub.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                          <span className="text-[10px] font-bold text-rose-800 pr-1">حذف الحل؟</span>
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteSubmission(studentSub.id);
                              setConfirmDeleteSubId(null);
                            }}
                            className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold transition cursor-pointer"
                          >
                            نعم
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSubId(null)}
                            className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-bold transition cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSubId(studentSub.id)}
                          className="py-1 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                          title="حذف الحل المسلم"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>حذف الحل</span>
                        </button>
                      )
                    )}
                  </div>

                  {/* Right: زر عرض المزيد + زر التسليم */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleExpand(hw.id)}
                      className="py-1 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      <span>{isExpanded ? 'عرض أقل' : 'عرض المزيد'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>

                    {/* زر التسليم: متاح للطلاب والمشرفين فقط، ولا يظهر للمعلمين */}
                    {canSubmitHomework && (
                      <button
                        onClick={() => handleOpenStudentSubmitModal(hw)}
                        className={`py-1 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          hasStudentSubmission
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{hasStudentSubmission ? 'تعديل الحل' : 'تسليم الواجب'}</span>
                      </button>
                    )}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المقرر الدراسي {isTeacher ? '(مادتك المخصصة فقط)' : ''}
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    disabled={allowedSubjects.length === 1}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-75 disabled:bg-slate-100"
                  >
                    {allowedSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.emoji ? `${s.emoji} ` : ''}{s.name}
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

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    الحل النموذجي (اختياري: صور / كاميرا / PDF)
                  </label>

                  {solutionFileName && solutionFileDataUrl ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {solutionFileType !== 'pdf' ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-emerald-300 bg-white shrink-0">
                            <img
                              src={solutionFileDataUrl}
                              alt="معاينة"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-900 truncate max-w-[200px]">
                            {solutionFileName}
                          </p>
                          <span className="text-[10px] text-emerald-700 block">
                            {solutionFileSize} • {solutionFileType !== 'pdf' ? 'صورة مرفقة' : 'ملف PDF'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {solutionFileType !== 'pdf' && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImageUrl({ url: solutionFileDataUrl, name: solutionFileName })
                            }
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                            title="معاينة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSolutionFileName('');
                            setSolutionFileSize('');
                            setSolutionFileDataUrl(null);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="إزالة الملف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-slate-50 hover:bg-purple-50 border border-dashed border-slate-300 hover:border-purple-300 rounded-xl cursor-pointer transition text-center group">
                        <Camera className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-700 group-hover:text-purple-700">
                          الكاميرا
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleTeacherFileSelect}
                          className="hidden"
                        />
                      </label>

                      <label className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-slate-50 hover:bg-indigo-50 border border-dashed border-slate-300 hover:border-indigo-300 rounded-xl cursor-pointer transition text-center group">
                        <ImageIcon className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-700">
                          الصور
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleTeacherFileSelect}
                          className="hidden"
                        />
                      </label>

                      <label className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-slate-50 hover:bg-emerald-50 border border-dashed border-slate-300 hover:border-emerald-300 rounded-xl cursor-pointer transition text-center group">
                        <FileText className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-700">
                          ملف PDF
                        </span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={handleTeacherFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
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

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      إرفاق الحل (الصور / الكاميرا / PDF)
                    </label>

                    {studentFileName && studentFileDataUrl ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {studentFileType !== 'pdf' ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-emerald-300 bg-white shrink-0">
                              <img
                                src={studentFileDataUrl}
                                alt="معاينة حلي"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-900 truncate max-w-[200px]">
                              {studentFileName}
                            </p>
                            <span className="text-[10px] text-emerald-700 block">
                              {studentFileSize} • {studentFileType !== 'pdf' ? 'صورة مرفقة' : 'ملف PDF'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {studentFileType !== 'pdf' && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImageUrl({ url: studentFileDataUrl, name: studentFileName })
                              }
                              className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                              title="معاينة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setStudentFileName('');
                              setStudentFileSize('');
                              setStudentFileDataUrl(null);
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="إزالة الملف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <label className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 bg-slate-50 hover:bg-purple-50 border border-dashed border-slate-300 hover:border-purple-300 rounded-2xl cursor-pointer transition text-center group">
                          <Camera className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-slate-700 group-hover:text-purple-700">
                            التقاط بالكاميرا
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleStudentFileSelect}
                            className="hidden"
                          />
                        </label>

                        <label className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 bg-slate-50 hover:bg-indigo-50 border border-dashed border-slate-300 hover:border-indigo-300 rounded-2xl cursor-pointer transition text-center group">
                          <ImageIcon className="w-6 h-6 text-indigo-600 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                            من الصور
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleStudentFileSelect}
                            className="hidden"
                          />
                        </label>

                        <label className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-2 bg-slate-50 hover:bg-emerald-50 border border-dashed border-slate-300 hover:border-emerald-300 rounded-2xl cursor-pointer transition text-center group">
                          <FileText className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">
                            ملف PDF
                          </span>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={handleStudentFileSelect}
                            className="hidden"
                          />
                        </label>
                      </div>
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
                          if (existingSub) {
                            await onDeleteSubmission(existingSub.id);
                            setActiveHomeworkForSubmission(null);
                          }
                        }}
                        className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>حذف الحل المسلم</span>
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

      {/* Lightbox Modal for Image Preview */}
      <AnimatePresence>
        {previewImageUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
            onClick={() => setPreviewImageUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
            >
              <div className="flex items-center justify-between p-3 bg-slate-900/90 border-b border-slate-800 text-white z-10">
                <span className="text-xs sm:text-sm font-bold truncate max-w-[280px]">
                  {previewImageUrl.name}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => triggerFileDownload(previewImageUrl.url, previewImageUrl.name)}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewImageUrl(null)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="overflow-auto p-2 flex items-center justify-center bg-black/40">
                <img
                  src={previewImageUrl.url}
                  alt={previewImageUrl.name}
                  className="max-h-[75vh] w-auto object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
