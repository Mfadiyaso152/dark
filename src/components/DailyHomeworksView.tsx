import React, { useState, useMemo } from 'react';
import { Subject, Homework, HomeworkSubmission, AttachedFile, getSubmissionFiles, isHomeworkDeadlinePassed, AVAILABLE_CLASSES } from '../types';
import { useAuth, formatDisplayName, resolveStudentFullName, isFullNameValid } from '../context/AuthContext';
import { ClassFilterDropdown } from './ClassFilterDropdown';
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
  ChevronUp,
  Users,
  Paperclip,
  PlusCircle,
  Lock,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerFileDownload } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';
import { formatGregorianDate } from '../utils/dateFormatter';
import { FilePreviewModal } from './FilePreviewModal';

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
  const { user, isSuperAdmin, isAssistantAdmin, canAddContent, canManageSubject, setIsAuthModalOpen, registeredUsers } = useAuth();

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

  // Submit button is available for students and supervisors
  const canSubmitHomework = !isTeacher || isSupervisor;

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
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);

  // Form states for adding/editing homework
  const [formSubjectId, setFormSubjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [formTargetClasses, setFormTargetClasses] = useState<string[]>(['all']);
  const [formError, setFormError] = useState('');

  const toggleFormClass = (cls: string) => {
    if (cls === 'all') {
      setFormTargetClasses(['all']);
      return;
    }
    setFormTargetClasses((prev) => {
      const withoutAll = prev.filter((c) => c !== 'all');
      if (withoutAll.includes(cls)) {
        const next = withoutAll.filter((c) => c !== cls);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...withoutAll, cls];
      }
    });
  };

  // Model solution attachment
  const [solutionFileName, setSolutionFileName] = useState('');
  const [solutionFileSize, setSolutionFileSize] = useState('');
  const [solutionFileType, setSolutionFileType] = useState<AttachedFile['type']>('pdf');
  const [solutionFileDataUrl, setSolutionFileDataUrl] = useState<string | null>(null);

  // Student submission modal (supports multiple images and multiple files)
  const [activeHomeworkForSubmission, setActiveHomeworkForSubmission] = useState<Homework | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [studentAttachedFiles, setStudentAttachedFiles] = useState<AttachedFile[]>([]);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Deletion confirm states (bypasses window.confirm in iframe)
  const [confirmDeleteHwId, setConfirmDeleteHwId] = useState<string | null>(null);
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<string | null>(null);

  // Universal File Preview Modal state (supports PDFs & Images seamlessly)
  const [previewModalConfig, setPreviewModalConfig] = useState<{
    isOpen: boolean;
    files: AttachedFile[];
    initialIndex: number;
    studentName?: string;
    title?: string;
  }>({
    isOpen: false,
    files: [],
    initialIndex: 0
  });

  // Expanded cards state ("عرض المزيد")
  const [expandedHwIds, setExpandedHwIds] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => {
    setExpandedHwIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Dedicated Homework Detail View State
  const [selectedHomeworkForDetail, setSelectedHomeworkForDetail] = useState<Homework | null>(null);

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

    if (selectedClassFilter !== 'all') {
      list = list.filter((h) => {
        const tc = h.targetClasses;
        if (!tc || tc.length === 0 || tc.includes('all')) return true;
        if (tc.includes(selectedClassFilter)) return true;
        if ((h as any).targetClass === selectedClassFilter || (h as any).classNumber === selectedClassFilter) return true;
        return false;
      });
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
    setExternalUrl('');
    setFormTargetClasses(['all']);
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
    setExternalUrl(hw.externalUrl || '');
    setFormTargetClasses(hw.targetClasses && hw.targetClasses.length > 0 ? hw.targetClasses : ['all']);
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

  // Handle student selecting multiple files (images or PDFs)
  const handleStudentFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const newAttached: AttachedFile[] = [];

    for (const file of filesArray) {
      if (file.size > 15 * 1024 * 1024) {
        alert(`حجم الملف "${file.name}" كبير جداً. الحد الأقصى 15 ميجابايت.`);
        continue;
      }

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const sizeStr = (file.size / 1024 / 1024).toFixed(1) + ' MB';
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            newAttached.push({
              name: file.name,
              type: 'pdf',
              size: sizeStr,
              dataUrl: reader.result as string,
              hasFile: true
            });
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        });
      } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)) {
        try {
          const processed = await processImageFile(file);
          newAttached.push({
            name: processed.name,
            type: 'image',
            size: processed.size,
            dataUrl: processed.dataUrl,
            hasFile: true
          });
        } catch (err) {
          console.warn('Image process error:', err);
        }
      }
    }

    if (newAttached.length > 0) {
      setStudentAttachedFiles((prev) => [...prev, ...newAttached]);
    }
    e.target.value = '';
  };

  const handleRemoveStudentFile = (indexToRemove: number) => {
    setStudentAttachedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
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
          externalUrl: externalUrl.trim() || undefined,
          targetClasses: formTargetClasses.length === 0 ? ['all'] : formTargetClasses,
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
        externalUrl: externalUrl.trim() || undefined,
        supervisorName,
        targetClasses: formTargetClasses.length === 0 ? ['all'] : formTargetClasses,
        solutionFile
      });
    }

    setIsAddModalOpen(false);
    setEditingHomework(null);
  };

  // Toggle Homework Closed status (إنهاء الواجب أو إعادة فتحه للمعلمين)
  const handleToggleCloseHomework = (hw: Homework) => {
    if (!onUpdateHomework) return;
    const newClosedState = !hw.isClosed;
    onUpdateHomework({
      ...hw,
      isClosed: newClosedState,
      closedAt: newClosedState ? new Date().toISOString() : undefined
    });
  };

  const handleOpenStudentSubmitModal = (hw: Homework) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (hw.isClosed) {
      alert('هذا الواجب منتهي وقد انتهت فترة تسليم الحلول.');
      return;
    }
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
      const existingFiles = getSubmissionFiles(existing);
      setStudentAttachedFiles(existingFiles);
    } else {
      setStudentNotes('');
      setStudentAttachedFiles([]);
    }
  };

  const handleStudentSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHomeworkForSubmission || !onSubmitSolution) return;

    if (!studentNotes.trim() && studentAttachedFiles.length === 0) {
      alert('يرجى إرفاق صور أو ملفات الحل أو كتابة إجابتك في الملاحظات.');
      return;
    }

    setIsSubmitting(true);
    try {
      const studentFullName = resolveStudentFullName(user?.email, user?.name, registeredUsers);

      await onSubmitSolution({
        homeworkId: activeHomeworkForSubmission.id,
        subjectId: activeHomeworkForSubmission.subjectId,
        studentId: user?.id || 'guest',
        studentName: studentFullName,
        studentEmail: user?.email || '',
        notes: studentNotes.trim() || undefined,
        attachedFiles: studentAttachedFiles,
        attachedFile: studentAttachedFiles[0] || undefined
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

  // Safe Universal File Preview (opens PDFs and Images directly without downloading!)
  const handleOpenPreview = (
    files: AttachedFile[],
    initialIndex: number = 0,
    studentName?: string,
    title?: string
  ) => {
    if (!files || files.length === 0) return;
    setPreviewModalConfig({
      isOpen: true,
      files,
      initialIndex,
      studentName,
      title
    });
  };

  // Separate into active and ended homeworks
  const activeHomeworks = useMemo(() => {
    return sortedAndFilteredHomeworks.filter((h) => !h.isClosed);
  }, [sortedAndFilteredHomeworks]);

  const endedHomeworks = useMemo(() => {
    return sortedAndFilteredHomeworks.filter((h) => !!h.isClosed);
  }, [sortedAndFilteredHomeworks]);

  // If a specific homework is selected, show its full dedicated details page
  if (selectedHomeworkForDetail) {
    const hw = selectedHomeworkForDetail;
    const subject = allSubjects.find((s) => s.id === hw.subjectId);
    const studentSub = submissions.find(
      (s) =>
        s.homeworkId === hw.id &&
        ((user?.email && s.studentEmail.toLowerCase() === user.email.toLowerCase()) ||
          (user?.id && s.studentId === user.id))
    );
    const hasStudentSubmission = !!studentSub;
    const canManageThis = canManageSubject(hw.subjectId);
    const isClosed = !!hw.isClosed;
    const deadlinePassed = isHomeworkDeadlinePassed(hw.dueDate);
    const studentFiles = studentSub ? getSubmissionFiles(studentSub) : [];
    const hwSubmissions = submissions.filter((s) => s.homeworkId === hw.id);

    return (
      <div className="space-y-4 md:space-y-6 text-right font-['IBM_Plex_Sans_Arabic',sans-serif]">
        {/* Top Back Button */}
        <div className="flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedHomeworkForDetail(null)}
            className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95"
          >
            <ArrowRight className="w-4 h-4 text-sky-600 transition group-hover:-translate-x-0.5" />
            <span>رجوع لقائمة الواجبات</span>
          </motion.button>

          <span className="text-xs sm:text-sm font-bold text-slate-500">
            {subject?.name || 'مقرر دراسي'}
          </span>
        </div>

        {/* Homework Header Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-2 flex-1 min-w-[240px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <span>{subject?.emoji || '📖'}</span>
                  <span>{subject?.name || 'المقرر'}</span>
                </span>

                {isClosed ? (
                  <span className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    <span>واجب منتهي</span>
                  </span>
                ) : hasStudentSubmission ? (
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم التسليم</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>متاح للتسليم</span>
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-black font-['Alexandria',sans-serif] text-slate-900 leading-snug">
                {hw.title || `واجب صـ ${hw.pageNumber} - سؤال ${hw.questionNumber}`}
              </h2>
            </div>

            {/* Teacher Toolbar (Edit / Delete / Toggle Close) */}
            {canManageThis && (
              <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                {isClosed ? (
                  <button
                    type="button"
                    onClick={() => handleToggleCloseHomework(hw)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 transition flex items-center gap-1 cursor-pointer"
                    title="الواجب منتهي حالياً، انقر لإعادة فتحه للطلاب"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>إعادة فتح</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (deadlinePassed) {
                        handleToggleCloseHomework(hw);
                      }
                    }}
                    disabled={!deadlinePassed}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      deadlinePassed
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                    }`}
                    title={
                      deadlinePassed
                        ? 'انتهت مدة التسليم، يمكنك إنهاء الواجب'
                        : `يتفعل بعد انتهاء تاريخ التسليم (${hw.dueDate})`
                    }
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{deadlinePassed ? 'إنهاء الواجب' : 'إنهاء الواجب'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(hw);
                  }}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl transition cursor-pointer"
                  title="تعديل الواجب"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {confirmDeleteHwId === hw.id ? (
                  <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-xl border border-rose-200">
                    <span className="text-xs font-bold text-rose-800 pr-1">حذف؟</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteHomework(hw.id);
                        setConfirmDeleteHwId(null);
                        setSelectedHomeworkForDetail(null);
                      }}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      نعم
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteHwId(null)}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteHwId(hw.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="حذف الواجب"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Details Grid: Page, Question, Deadline, Target Classes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-sky-600 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block">الصفحة</span>
                <strong className="text-slate-900 text-xs sm:text-sm font-black">{hw.pageNumber || '—'}</strong>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block">السؤال</span>
                <strong className="text-slate-900 text-xs sm:text-sm font-black">{hw.questionNumber || '—'}</strong>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block">تاريخ التسليم</span>
                <strong className="text-slate-900 text-xs sm:text-sm font-black">{hw.dueDate || 'غير محدد'}</strong>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2.5">
              <Users className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <span className="text-[11px] text-slate-400 block">الفصول الموجهة</span>
                <strong className="text-slate-900 text-xs sm:text-sm font-black truncate block">
                  {!hw.targetClasses || hw.targetClasses.includes('all') ? 'جميع الفصول' : hw.targetClasses.join('، ')}
                </strong>
              </div>
            </div>
          </div>

          {/* Teacher Notes / Description */}
          {hw.notes && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
              <span className="text-xs font-bold text-slate-500 block">ملاحظات وتعليمات الواجب:</span>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                {hw.notes}
              </p>
            </div>
          )}

          {/* Teacher Solution File Attachment (Visible to teachers/supervisors) */}
          {canManageThis && hw.solutionFile?.hasFile && (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-emerald-900">
                  الحل النموذجي للمعلم ({hw.solutionFile.name || 'ملف الحل'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleOpenPreview(
                      [hw.solutionFile!],
                      0,
                      'الحل النموذجي',
                      `${hw.title || 'واجب'} - الحل النموذجي`
                    )
                  }
                  className="py-1.5 px-3 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleDownloadFile(
                      hw.solutionFile?.fileId,
                      hw.solutionFile?.dataUrl,
                      hw.solutionFile?.name || `${hw.title || 'حل'}_نموذجي`
                    )
                  }
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student Submission & Notes Section */}
        {canSubmitHomework && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-black font-['Alexandria',sans-serif] text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-sky-600" />
                <span>تسليم الواجب وملاحظات الحل</span>
              </h3>

              {hasStudentSubmission && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  تم التسليم بنجاح
                </span>
              )}
            </div>

            {hasStudentSubmission && studentSub ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-emerald-900 font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>بيانات تسليمك للواجب</span>
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      {formatGregorianDate(studentSub.submittedAt)}
                    </span>
                  </div>

                  {studentSub.notes && (
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-100 space-y-1">
                      <span className="text-[11px] text-slate-500 font-bold block">ملاحظاتك المرسلة مع الحل:</span>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">{studentSub.notes}</p>
                    </div>
                  )}

                  {studentFiles.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950">
                          الملفات والصور المرفقة ({studentFiles.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(studentFiles, 0, 'حلي', 'معاينة الحل المسلم')}
                          className="text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة كاملة بدون تحميل</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {studentFiles.map((file, idx) => {
                          const isImg = isImageAttachment(file.name, file.dataUrl);
                          return (
                            <div
                              key={file.fileId || idx}
                              className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-emerald-200 text-xs"
                            >
                              <div className="flex items-center gap-2 truncate max-w-[180px]">
                                {isImg ? (
                                  <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                                )}
                                <span className="truncate font-bold text-slate-800" title={file.name}>
                                  {file.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPreview(studentFiles, idx, 'حلي', 'معاينة الحل المسلم')}
                                  className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-1 rounded-lg hover:bg-sky-100 flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>معاينة</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadFile(file.fileId, file.dataUrl, file.name)}
                                  className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>تحميل</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit / Delete Submission Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() => handleOpenStudentSubmitModal(hw)}
                      className="py-2.5 px-5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>تعديل الحل المسلم</span>
                    </button>
                  )}

                  {onDeleteSubmission && (
                    confirmDeleteSubId === studentSub.id ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-2xl border border-rose-200">
                        <span className="text-xs font-bold text-rose-800 pr-1">تأكيد حذف الحل؟</span>
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteSubmission(studentSub.id);
                            setConfirmDeleteSubId(null);
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          نعم، احذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSubId(null)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSubId(studentSub.id)}
                        className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف الحل</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : isClosed ? (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-1">
                <span className="text-xs sm:text-sm font-bold text-rose-900 block">
                  هذا الواجب منتهي ولم يعد متاحاً للتسليم.
                </span>
                <p className="text-xs text-rose-700">تواصل مع معلّم المادة إذا كنت بحاجة لإعادة فتح التسليم.</p>
              </div>
            ) : hw.externalUrl ? (
              <div className="p-6 bg-sky-50/80 border border-sky-200/90 rounded-2xl text-center space-y-3">
                <p className="text-xs sm:text-sm text-sky-900 font-bold">
                  هذا الواجب يتطلب التسليم عبر منصة خارجية. اضغط على الزر أدناه للانتقال لصفحة التسليم:
                </p>
                <a
                  href={hw.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-6 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>التسليم عبر رابط خارجي</span>
                </a>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200/90 rounded-2xl text-center space-y-3">
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  لم تقم بتسليم هذا الواجب بعد. يمكنك إرفاق صور الحل أو الملفات وكتابة الملاحظات.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenStudentSubmitModal(hw)}
                  className="py-3 px-6 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs transition"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>تسليم الواجب وملاحظات الحل</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Teacher / Supervisor View: All Student Submissions for this Homework */}
        {(isTeacher || isSupervisor || canManageThis) && (
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base sm:text-lg font-black font-['Alexandria',sans-serif] text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>حلول الطلاب المسلمة لهذا الواجب ({hwSubmissions.length})</span>
              </h3>
            </div>

            {hwSubmissions.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs sm:text-sm">
                لم يقم أي طالب بتسليم هذا الواجب بعد.
              </div>
            ) : (
              <div className="space-y-3">
                {hwSubmissions.map((sub) => {
                  const studentFullName = resolveStudentFullName(sub.studentEmail, sub.studentName, registeredUsers);
                  const isConfirmedName = isFullNameValid(studentFullName);
                  const subFiles = getSubmissionFiles(sub);

                  return (
                    <div
                      key={sub.id}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-xs sm:text-sm">
                              {studentFullName}
                            </span>
                            {isConfirmedName && (
                              <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                الاسم الثلاثي ✓
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            بتاريخ: {formatGregorianDate(sub.submittedAt)}
                          </span>
                        </div>

                        {subFiles.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(subFiles, 0, studentFullName, `حل الواجب - ${studentFullName}`)}
                            className="self-start sm:self-center text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة حلول الطالب ({subFiles.length})</span>
                          </button>
                        )}
                      </div>

                      {sub.notes && (
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                          {sub.notes}
                        </p>
                      )}

                      {subFiles.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {subFiles.map((file, fileIdx) => {
                            const isImg = isImageAttachment(file.name, file.dataUrl);
                            return (
                              <div
                                key={file.fileId || fileIdx}
                                className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
                              >
                                <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                                  {isImg ? (
                                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  )}
                                  <span className="truncate font-medium text-slate-800" title={file.name}>
                                    {file.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPreview(subFiles, fileIdx, studentFullName, `حل الواجب - ${studentFullName}`)}
                                    className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg hover:bg-indigo-100 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>معاينة</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadFile(file.fileId, file.dataUrl, file.name)}
                                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg hover:bg-emerald-100 flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                    <span>تحميل</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Universal Full-Screen File Preview Modal */}
        <FilePreviewModal
          isOpen={previewModalConfig.isOpen}
          onClose={() => setPreviewModalConfig((prev) => ({ ...prev, isOpen: false }))}
          files={previewModalConfig.files}
          initialIndex={previewModalConfig.initialIndex}
          studentName={previewModalConfig.studentName}
          title={previewModalConfig.title}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 text-right font-['IBM_Plex_Sans_Arabic',sans-serif]">
      {/* Top Action Bar (Add Homework button if teacher/admin) */}
      {canUserAddAnyHomework && (
        <div className="flex justify-end">
          <button
            onClick={handleOpenAddModal}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs border border-slate-800"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>إضافة واجب جديد</span>
          </button>
        </div>
      )}

      {/* Teacher Assigned Subject Info Tag */}
      {isTeacher && allowedSubjects.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold inline-flex items-center gap-2 shadow-2xs">
            <span>📚</span>
            <span>واجبات مادتك المسندة إليك: {allowedSubjects.map((s) => s.name).join('، ')}</span>
          </span>
        </div>
      )}

      {/* Class filter dropdown button (الافتراضي جميع الفصول) */}
      <div className="flex items-center">
        <ClassFilterDropdown
          selectedClass={selectedClassFilter}
          onSelectClass={setSelectedClassFilter}
        />
      </div>

      {/* Homeworks List: Empty State or Cards */}
      {sortedAndFilteredHomeworks.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
            <ClipboardList className="w-8 h-8 text-sky-600" />
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
              className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer transition"
            >
              <Plus className="w-4 h-4 text-sky-400" />
              <span>إضافة أول واجب</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Homeworks Section: Displays strictly Homework Title & Subject Name */}
          {activeHomeworks.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {activeHomeworks.map((hw) => {
                  const subject = allSubjects.find((s) => s.id === hw.subjectId);
                  return (
                    <motion.div
                      key={hw.id}
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                      onClick={() => setSelectedHomeworkForDetail(hw)}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-sky-300 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      {/* Subject Name Tag */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-sky-50 text-slate-700 group-hover:text-sky-700 border border-slate-200/80 group-hover:border-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors">
                          <span>{subject?.emoji || '📖'}</span>
                          <span>{subject?.name || 'مقرر دراسي'}</span>
                        </span>

                        <ChevronLeft className="w-4 h-4 text-slate-400 transition group-hover:-translate-x-1 group-hover:text-slate-900" />
                      </div>

                      {/* Homework Title Only */}
                      <div>
                        <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug group-hover:text-sky-700 transition-colors font-['Alexandria',sans-serif]">
                          {hw.title || `واجب صـ ${hw.pageNumber} - سؤال ${hw.questionNumber}`}
                        </h3>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ended Homeworks Section: Grayed-out separate section at the bottom */}
          {endedHomeworks.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-slate-500 font-black text-xs sm:text-sm border-t border-slate-200/80 pt-4">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>الواجبات المنتهية ({endedHomeworks.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {endedHomeworks.map((hw) => {
                  const subject = allSubjects.find((s) => s.id === hw.subjectId);
                  const isPrivileged = isTeacher || isSupervisor || isSuperAdmin || isAssistantAdmin;
                  return (
                    <motion.div
                      key={hw.id}
                      whileHover={isPrivileged ? { y: -1, scale: 1.005 } : {}}
                      whileTap={isPrivileged ? { scale: 0.98 } : {}}
                      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                      onClick={() => {
                        if (!isPrivileged) {
                          alert('هذا الواجب منتهي ولا يمكن للطلاب الدخول إليه.');
                          return;
                        }
                        setSelectedHomeworkForDetail(hw);
                      }}
                      className={`rounded-2xl p-4 sm:p-5 border shadow-2xs transition-all flex flex-col justify-between space-y-3 select-none ${
                        isPrivileged
                          ? 'bg-slate-100/90 hover:bg-slate-200/70 border-slate-200 text-slate-600 cursor-pointer'
                          : 'bg-slate-100/80 border-slate-200/80 text-slate-400 cursor-not-allowed opacity-75'
                      }`}
                    >
                      {/* Subject Name Tag + Ended Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-white/80 text-slate-600 border border-slate-200 text-[11px] font-bold flex items-center gap-1.5">
                          <span>{subject?.emoji || '📖'}</span>
                          <span>{subject?.name || 'مقرر دراسي'}</span>
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 flex items-center gap-1 border border-rose-200/60">
                          <Lock className="w-3 h-3 text-rose-500" />
                          <span>منتهي ومغلق</span>
                        </span>
                      </div>

                      {/* Homework Title Only */}
                      <div>
                        <h3 className="font-bold text-slate-600 text-sm sm:text-base leading-snug font-['Alexandria',sans-serif]">
                          {hw.title || `واجب صـ ${hw.pageNumber} - سؤال ${hw.questionNumber}`}
                        </h3>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Homework Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsAddModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {editingHomework ? 'تعديل الواجب المدرسي' : 'إضافة واجب مدرسي جديد'}
                </h3>
                <button
                  type="button"
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
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-75 disabled:bg-slate-100"
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
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم السؤال</label>
                    <input
                      type="text"
                      value={questionNumber}
                      onChange={(e) => setQuestionNumber(e.target.value)}
                      placeholder="مثال: 3، 4"
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Target Classes Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      الفصول المستهدفة *
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formTargetClasses.includes('all')
                        ? 'محدد لجميع الفصول (١/١ - ١/٧)'
                        : `${formTargetClasses.length} فصول محددة`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleFormClass('all')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        formTargetClasses.includes('all')
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
                      }`}
                    >
                      جميع الفصول
                    </button>
                    {AVAILABLE_CLASSES.map((cls) => {
                      const isSelected = !formTargetClasses.includes('all') && formTargetClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => toggleFormClass(cls)}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التسليم الأقصى</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات المعلم</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="تعليمات حل الواجب..."
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رابط التسليم الخارجي (اختياري - يمنع التسليم داخل الموقع)
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://forms.google.com/..."
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dir-ltr text-left"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    الحل النموذجي (اختياري: صور / كاميرا / PDF)
                  </label>

                  {solutionFileName && solutionFileDataUrl ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {solutionFileType !== 'pdf' ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                            <img
                              src={solutionFileDataUrl}
                              alt="معاينة"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                            {solutionFileName}
                          </p>
                          <span className="text-[10px] text-slate-500 block">
                            {solutionFileSize} • {solutionFileType !== 'pdf' ? 'صورة مرفقة' : 'ملف PDF'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenPreview(
                              [
                                {
                                  name: solutionFileName,
                                  type: (solutionFileType === 'pdf' ? 'pdf' : 'image') as 'pdf' | 'image',
                                  dataUrl: solutionFileDataUrl || undefined,
                                  hasFile: true,
                                  size: solutionFileSize,
                                },
                              ],
                              0,
                              'الحل النموذجي',
                              'معاينة الحل المرفق'
                            )
                          }
                          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                          title="معاينة الملف مباشرة بدون تحميل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
                      <label className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer transition text-center group">
                        <Camera className="w-5 h-5 text-slate-700 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-700">
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

                      <label className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer transition text-center group">
                        <ImageIcon className="w-5 h-5 text-slate-700 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-700">
                          الصور
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleTeacherFileSelect}
                          className="hidden"
                        />
                      </label>

                      <label className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer transition text-center group">
                        <FileText className="w-5 h-5 text-slate-700 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-700">
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
                    className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs"
                  >
                    {editingHomework ? 'حفظ التعديلات' : 'إضافة الواجب'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Submit Solution Modal */}
      <AnimatePresence>
        {activeHomeworkForSubmission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveHomeworkForSubmission(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-sky-600" />
                  <span>تسليم حل الواجب المدرسي</span>
                </h3>
                <button
                  type="button"
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
                  <h4 className="text-base font-bold text-emerald-800">تم استلام الحل بنجاح!</h4>
                  <p className="text-xs text-slate-500">تم تسجيل حل الواجب باسمك وإرفاقه بالمنصة.</p>
                </div>
              ) : (
                <form onSubmit={handleStudentSubmitSolution} className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
                    <span className="font-bold text-slate-900 block">
                      {activeHomeworkForSubmission.title || 'تفاصيل الواجب'}
                    </span>
                    <span className="text-slate-600 block">
                      صفحة: {activeHomeworkForSubmission.pageNumber} • سؤال: {activeHomeworkForSubmission.questionNumber}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        إرفاق صور أو ملفات الحل (الحد الأقصى 15 ميجابايت)
                      </label>
                      {studentAttachedFiles.length > 0 && (
                        <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                          {studentAttachedFiles.length} مرفقات محددة
                        </span>
                      )}
                    </div>

                    {/* Action buttons to add files */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                        className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                      >
                        <Paperclip className="w-4 h-4" />
                        <span>إرفاق ملف</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isAttachMenuOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isAttachMenuOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-sky-200 shadow-xl p-2.5 z-20 space-y-1.5 text-right">
                          <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-sky-50 cursor-pointer transition text-xs font-bold text-slate-800">
                            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                              <Camera className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold">التقاط بالكاميرا</p>
                              <p className="text-[10px] text-slate-400">تصوير الدفتر مباشرة</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => {
                                handleStudentFilesSelect(e);
                                setIsAttachMenuOpen(false);
                              }}
                              className="hidden"
                            />
                          </label>

                          <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-50 cursor-pointer transition text-xs font-bold text-slate-800">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold">صور من الاستوديو</p>
                              <p className="text-[10px] text-slate-400">تحديد صور متعددة من الجهاز</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                handleStudentFilesSelect(e);
                                setIsAttachMenuOpen(false);
                              }}
                              className="hidden"
                            />
                          </label>

                          <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer transition text-xs font-bold text-slate-800">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold">ملفات PDF</p>
                              <p className="text-[10px] text-slate-400">اختيار ملف أو عدة ملفات PDF</p>
                            </div>
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              multiple
                              onChange={(e) => {
                                handleStudentFilesSelect(e);
                                setIsAttachMenuOpen(false);
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Selected files preview list */}
                    {studentAttachedFiles.length > 0 && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 pt-1">
                        {studentAttachedFiles.map((f, idx) => {
                          const isImg = isImageAttachment(f.name, f.dataUrl);
                          return (
                            <div
                              key={f.fileId || idx}
                              className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isImg && f.dataUrl ? (
                                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                                    <img
                                      src={f.dataUrl}
                                      alt={f.name}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate max-w-[190px]">
                                    {f.name}
                                  </p>
                                  <span className="text-[10px] text-slate-500 block">
                                    {f.size} • {isImg ? 'صورة' : 'ملف PDF'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPreview(studentAttachedFiles, idx, 'حلي', 'معاينة المرفق')}
                                  className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                                  title="معاينة الملف مباشرة"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudentFile(idx)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="إزالة هذا المرفق"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
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
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                        className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs md:text-sm font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4 text-sky-400" />
                        <span>{isSubmitting ? 'جارٍ التسليم...' : 'تسليم الحل'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Universal File Preview Modal (PDF & Images without downloading) */}
      <FilePreviewModal
        isOpen={previewModalConfig.isOpen}
        onClose={() => setPreviewModalConfig((prev) => ({ ...prev, isOpen: false }))}
        files={previewModalConfig.files}
        initialIndex={previewModalConfig.initialIndex}
        studentName={previewModalConfig.studentName}
        title={previewModalConfig.title}
      />
    </div>
  );
};
