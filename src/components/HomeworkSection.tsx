import React, { useState } from 'react';
import { Subject, Homework, HomeworkSubmission, AttachedFile, isHomeworkDeadlinePassed, AVAILABLE_CLASSES } from '../types';
import { useAuth, formatDisplayName, resolveStudentFullName, isFullNameValid } from '../context/AuthContext';
import { ClassFilterDropdown } from './ClassFilterDropdown';
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
  Send,
  Camera,
  Image as ImageIcon,
  Eye,
  ChevronDown,
  ChevronUp,
  Users,
  Lock,
  ExternalLink,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerFileDownload } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';
import { formatGregorianDate } from '../utils/dateFormatter';
import { FilePreviewModal } from './FilePreviewModal';

const getSubmissionFiles = (sub: HomeworkSubmission): AttachedFile[] => {
  if (Array.isArray(sub.attachedFiles) && sub.attachedFiles.length > 0) {
    return sub.attachedFiles;
  }
  if (sub.attachedFile && sub.attachedFile.hasFile) {
    return [sub.attachedFile];
  }
  return [];
};

// Image compression helper to optimize image & camera captures
const processImageFile = (file: File): Promise<{ dataUrl: string; sizeFormatted: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const rawUrl = reader.result as string;
          const sz = Math.round(file.size / 1024) + ' KB';
          resolve({ dataUrl: rawUrl, sizeFormatted: sz });
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);
        const formatted =
          approxBytes > 1024 * 1024
            ? `${(approxBytes / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(approxBytes / 1024)} KB`;
        resolve({ dataUrl: compressedDataUrl, sizeFormatted: formatted });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const isImageAttachment = (name?: string, dataUrl?: string | null) => {
  if (dataUrl?.startsWith('data:image/')) return true;
  if (!name) return false;
  const n = name.toLowerCase();
  return n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png') || n.endsWith('.webp');
};

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
  onDeleteSubmission?: (submissionId: string) => Promise<void> | void;
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
  onSubmitSolution,
  onDeleteSubmission
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, canAddContent, setIsAuthModalOpen, registeredUsers } = useAuth();
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

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);

  // Form states for Teacher Add / Edit Homework
  const [dueDate, setDueDate] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [questionNumber, setQuestionNumber] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [targetClasses, setTargetClasses] = useState<string[]>(['all']);

  const toggleClass = (cls: string) => {
    if (cls === 'all') {
      setTargetClasses(['all']);
      return;
    }
    setTargetClasses((prev) => {
      const withoutAll = prev.filter((c) => c !== 'all');
      if (withoutAll.includes(cls)) {
        const next = withoutAll.filter((c) => c !== cls);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...withoutAll, cls];
      }
    });
  };

  // Teacher Optional Model Solution
  const [solutionFileName, setSolutionFileName] = useState('');
  const [solutionFileSize, setSolutionFileSize] = useState('');
  const [solutionFileDataUrl, setSolutionFileDataUrl] = useState<string | null>(null);
  const [solutionFileType, setSolutionFileType] = useState<'pdf' | 'image'>('pdf');

  // Student Submit Solution Modal
  const [activeHomeworkForSubmission, setActiveHomeworkForSubmission] = useState<Homework | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [studentAttachedFiles, setStudentAttachedFiles] = useState<AttachedFile[]>([]);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Universal Preview Modal State (PDF & Images without downloading)
  const [previewModalConfig, setPreviewModalConfig] = useState<{
    isOpen: boolean;
    files: AttachedFile[];
    initialIndex: number;
    studentName?: string;
    title?: string;
  }>({
    isOpen: false,
    files: [],
    initialIndex: 0,
  });

  // Expanded cards state ("عرض المزيد")
  const [expandedHwIds, setExpandedHwIds] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => {
    setExpandedHwIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Inline delete confirmation states
  const [confirmDeleteHwId, setConfirmDeleteHwId] = useState<string | null>(null);
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<string | null>(null);

  // File Download tracking
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Sort homeworks: unsubmitted/pending homeworks come first; submitted homeworks are placed at the very bottom
  const subjectHomeworks = [...homeworks.filter((h) => h.subjectId === subject.id)]
    .filter((h) => {
      if (selectedClassFilter === 'all') return true;
      if (!h.targetClasses || h.targetClasses.length === 0 || h.targetClasses.includes('all')) return true;
      return h.targetClasses.includes(selectedClassFilter);
    })
    .sort((a, b) => {
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
    if (!aSub && bSub) return -1;
    if (aSub && !bSub) return 1;

    const aDone = completedHomeworkIds.includes(a.id);
    const bDone = completedHomeworkIds.includes(b.id);
    if (!aDone && bDone) return -1;
    if (aDone && !bDone) return 1;

    return (b.dueDate || '').localeCompare(a.dueDate || '');
  });

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
    setExternalUrl('');
    setTargetClasses(['all']);
    setFormError('');
    setSolutionFileName('');
    setSolutionFileSize('');
    setSolutionFileDataUrl(null);
    setSolutionFileType('pdf');
    setTimeout(() => {
      setIsAddModalOpen(true);
    }, 10);
  };

  // Open Teacher Edit Homework Modal
  const handleOpenEditModal = (hw: Homework) => {
    setEditingHomework(hw);
    setDueDate(hw.dueDate || '');
    setPageNumber(hw.pageNumber || '');
    setQuestionNumber(hw.questionNumber || '');
    setTitle(hw.title || '');
    setNotes(hw.notes || '');
    setExternalUrl(hw.externalUrl || '');
    setTargetClasses(hw.targetClasses && hw.targetClasses.length > 0 ? hw.targetClasses : ['all']);
    setFormError('');
    if (hw.solutionFile?.hasFile) {
      setSolutionFileName(hw.solutionFile.name || 'الحل_النموذجي');
      setSolutionFileSize(hw.solutionFile.size || '1 MB');
      setSolutionFileDataUrl(hw.solutionFile.dataUrl || null);
      setSolutionFileType(
        isImageAttachment(hw.solutionFile.name, hw.solutionFile.dataUrl) ? 'image' : 'pdf'
      );
    } else {
      setSolutionFileName('');
      setSolutionFileSize('');
      setSolutionFileDataUrl(null);
      setSolutionFileType('pdf');
    }
    setTimeout(() => {
      setIsAddModalOpen(true);
    }, 10);
  };

  // Handle Teacher file selection (Images / Camera / PDF)
  const handleTeacherFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImg && !isPdf) {
      alert('يرجى اختيار صورة (الكاميرا / ألبوم الصور) أو ملف بصيغة PDF');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('الحد الأقصى لحجم الملف هو 25 ميجابايت');
      return;
    }

    try {
      if (isImg) {
        const { dataUrl, sizeFormatted } = await processImageFile(file);
        setSolutionFileName(file.name);
        setSolutionFileSize(sizeFormatted);
        setSolutionFileDataUrl(dataUrl);
        setSolutionFileType('image');
      } else {
        const sizeFormatted =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`;

        setSolutionFileName(file.name);
        setSolutionFileSize(sizeFormatted);
        setSolutionFileType('pdf');

        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setSolutionFileDataUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('File load error:', err);
      alert('حدث خطأ أثناء معالجة الملف، يرجى المحاولة مرة أخرى');
    }
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
          name: solutionFileName || 'الحل_النموذجي',
          type: solutionFileType === 'image' ? 'image' : 'pdf',
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
          externalUrl: externalUrl.trim() || undefined,
          targetClasses: targetClasses.length === 0 ? ['all'] : targetClasses,
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
        externalUrl: externalUrl.trim() || undefined,
        supervisorName,
        targetClasses: targetClasses.length === 0 ? ['all'] : targetClasses,
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

  // Open Student Submit Solution Modal
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

    // If user already has a submission for this homework, pre-fill it
    const existing = submissions.find(
      (s) =>
        s.homeworkId === hw.id &&
        ((user?.email && s.studentEmail.toLowerCase() === user.email.toLowerCase()) ||
          (user?.id && s.studentId === user.id))
    );

    if (existing) {
      setStudentNotes(existing.notes || '');
      const files = getSubmissionFiles(existing);
      setStudentAttachedFiles(files);
    } else {
      setStudentNotes('');
      setStudentAttachedFiles([]);
    }
  };

  // Handle Student file selection (Multiple Images / Camera / Multiple PDFs)
  const handleStudentFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles: AttachedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (!isImg && !isPdf) {
        alert(`الملف "${file.name}" غير مدعوم. يرجى اختيار صورة أو ملف PDF.`);
        continue;
      }

      if (file.size > 25 * 1024 * 1024) {
        alert(`الملف "${file.name}" يتجاوز الحد الأقصى (25 ميجابايت).`);
        continue;
      }

      try {
        if (isImg) {
          const { dataUrl, sizeFormatted } = await processImageFile(file);
          newFiles.push({
            name: file.name,
            type: 'image',
            size: sizeFormatted,
            dataUrl,
            hasFile: true,
          });
        } else {
          const sizeFormatted =
            file.size > 1024 * 1024
              ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
              : `${Math.round(file.size / 1024)} KB`;

          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') resolve(reader.result);
              else reject(new Error('Failed to read PDF'));
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          newFiles.push({
            name: file.name,
            type: 'pdf',
            size: sizeFormatted,
            dataUrl,
            hasFile: true,
          });
        }
      } catch (err) {
        console.error('File load error:', err);
      }
    }

    if (newFiles.length > 0) {
      setStudentAttachedFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const handleRemoveStudentFile = (index: number) => {
    setStudentAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Open Universal File Preview Modal (PDF & Images)
  const handleOpenPreview = (files: AttachedFile[], initialIndex = 0, studentName?: string, title?: string) => {
    if (!files || files.length === 0) return;
    setPreviewModalConfig({
      isOpen: true,
      files,
      initialIndex,
      studentName,
      title,
    });
  };

  // Handle Student Solution Save
  const handleStudentSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHomeworkForSubmission) return;

    if (!studentNotes.trim() && studentAttachedFiles.length === 0) {
      alert('يرجى إرفاق حل الواجب (صور / ملفات PDF) أو كتابة إجابتك وملاحظاتك');
      return;
    }

    setIsSubmitting(true);

    const primaryFile = studentAttachedFiles[0];

    if (onSubmitSolution) {
      const studentFullName = resolveStudentFullName(user?.email, user?.name, registeredUsers);

      await onSubmitSolution({
        homeworkId: activeHomeworkForSubmission.id,
        subjectId: subject.id,
        studentId: user?.id || 'guest-' + Date.now(),
        studentName: studentFullName,
        studentEmail: user?.email || '',
        notes: studentNotes.trim() || undefined,
        attachedFile: primaryFile,
        attachedFiles: studentAttachedFiles,
      });
    }

    setIsSubmitting(false);
    setSubmitSuccess(true);
    setTimeout(() => {
      setActiveHomeworkForSubmission(null);
    }, 1200);
  };

  // Safe Universal Download Helper
  const handleDownloadFile = async (
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

        const downloaded = await downloadFileFromCloud(fileId, undefined, fileName);
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
              {canEdit
                ? 'إدارة واجبات المادة ومتابعة تسليمات وحلول الطلاب'
                : 'تابع الواجبات المدرسية وقم بإرفاق حلولك ومتابعة تقييمك'}
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

      {/* Class filter dropdown button (الافتراضي جميع الفصول) */}
      <div className="flex items-center">
        <ClassFilterDropdown
          selectedClass={selectedClassFilter}
          onSelectClass={setSelectedClassFilter}
        />
      </div>

      {/* Homework Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-5">
        <AnimatePresence>
          {subjectHomeworks.map((hw, idx) => {
            const isCompleted = completedHomeworkIds.includes(hw.id);
            const isClosed = !!hw.isClosed;
            const deadlinePassed = isHomeworkDeadlinePassed(hw.dueDate);

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

            const isExpanded = !!expandedHwIds[hw.id];

            return (
              <motion.div
                key={hw.id}
                layout
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border transition-all flex flex-col justify-between relative overflow-hidden group shadow-2xs hover:shadow-xs space-y-2.5 ${
                  isClosed
                    ? 'bg-rose-50/20 border-rose-200/80 hover:border-rose-300'
                    : hasStudentSubmission
                    ? 'bg-emerald-50/20 border-emerald-300/80'
                    : 'bg-white border-slate-200/90 hover:border-purple-300'
                }`}
              >
                {/* Top line: Date & Status Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 text-[11px] font-bold">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <span>تاريخ الواجب: {hw.dueDate}</span>
                    </div>

                    {isClosed ? (
                      <span className="text-[11px] font-black text-rose-700 bg-rose-100/90 border border-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-rose-600" />
                        <span>واجب منتهي</span>
                      </span>
                    ) : deadlinePassed ? (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>انتهت المدة المحددة</span>
                      </span>
                    ) : null}
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
                  <h4
                    className={`font-black text-sm sm:text-base leading-snug ${
                      hasStudentSubmission
                        ? 'text-slate-800'
                        : 'text-slate-900'
                    }`}
                  >
                    {hw.title || `واجب صـ ${hw.pageNumber} - سؤال ${hw.questionNumber}`}
                  </h4>
                </div>

                {/* Expanded Details: Page, Question, Notes, Solution File, Student File */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2.5 pt-1 overflow-hidden"
                    >
                      {/* Key Assignment Details: Page & Question */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>صفحة: <strong className="text-slate-800">صـ {hw.pageNumber}</strong></span>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>السؤال: <strong className="text-slate-800">{hw.questionNumber}</strong></span>
                        </div>
                      </div>

                      {/* Notes / Description */}
                      {hw.notes && (
                        <p className="text-xs text-slate-600 bg-amber-50/70 border border-amber-100/80 p-2.5 rounded-xl leading-relaxed">
                          💬 {hw.notes}
                        </p>
                      )}

                      {/* Teacher Model Solution Download / Preview (Visible to teachers/supervisors only) */}
                      {canEdit && hw.solutionFile?.hasFile && (
                        <div className="w-full p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 flex-wrap text-xs font-bold text-emerald-800">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isImageAttachment(hw.solutionFile?.name, hw.solutionFile?.dataUrl) ? (
                              <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px]">
                              الحل النموذجي للمعلم ({isImageAttachment(hw.solutionFile?.name, hw.solutionFile?.dataUrl) ? 'صورة' : 'PDF'})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
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
                              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="معاينة الحل مباشرة بدون تحميل"
                            >
                              <Eye className="w-3 h-3" />
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
                              disabled={isDownloadingModel}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Download className="w-3 h-3" />
                              <span>تحميل</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Student Submission Card Status / Attached file */}
                      {hasStudentSubmission && studentSub && (() => {
                        const studentFiles = getSubmissionFiles(studentSub);
                        return (
                          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-[11px] font-black text-emerald-800">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                تم تسليم حلك بنجاح ✓
                              </span>
                              <span className="text-slate-400 font-normal">
                                {formatGregorianDate(studentSub.submittedAt)}
                              </span>
                            </div>

                            {studentFiles.length > 0 && (
                              <div className="space-y-1.5 pt-1 border-t border-emerald-200/60">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-emerald-900 font-bold">
                                    الملفات المرفقة ({studentFiles.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPreview(studentFiles, 0, 'حلي', 'معاينة الحل')}
                                    className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>معاينة الكل بدون تحميل</span>
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {studentFiles.map((file, idx) => {
                                    const isImg = isImageAttachment(file.name, file.dataUrl);
                                    return (
                                      <div
                                        key={file.fileId || idx}
                                        className="flex items-center justify-between bg-white px-2 py-1.5 rounded-lg border border-emerald-200 text-[11px]"
                                      >
                                        <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                                          {isImg ? (
                                            <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          ) : (
                                            <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                          )}
                                          <span className="truncate font-medium text-slate-800" title={file.name}>
                                            {file.name}
                                          </span>
                                          {file.size && <span className="text-[9px] text-slate-400">({file.size})</span>}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenPreview(studentFiles, idx, 'حلي', 'معاينة الحل')}
                                            className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded hover:bg-indigo-100 flex items-center gap-0.5 cursor-pointer"
                                            title="معاينة الملف مباشرة بدون تحميل"
                                          >
                                            <Eye className="w-2.5 h-2.5" />
                                            <span>معاينة</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDownloadFile(file.fileId, file.dataUrl, file.name)}
                                            className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-100 flex items-center gap-0.5 cursor-pointer"
                                            title="تحميل الملف"
                                          >
                                            <Download className="w-2.5 h-2.5" />
                                            <span>تحميل</span>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {studentSub.notes && (
                              <p className="text-[11px] text-slate-600 italic bg-white/70 p-1.5 rounded-lg">
                                "{studentSub.notes}"
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Teacher / Supervisor View: All Student Submissions for this Homework */}
                      {(isTeacher || isSupervisor || canEdit) && (
                        <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-2xl space-y-2 text-xs">
                          <div className="flex items-center justify-between text-purple-900 font-bold border-b border-purple-200/60 pb-1.5">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-purple-700" />
                              <span>حلول الطلاب المسلمة لهذا الواجب ({submissions.filter((s) => s.homeworkId === hw.id).length})</span>
                            </span>
                          </div>

                          {submissions.filter((s) => s.homeworkId === hw.id).length === 0 ? (
                            <p className="text-[11px] text-slate-400 py-1">لم يقم أي طالب بتسليم هذا الواجب بعد.</p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                              {submissions
                                .filter((s) => s.homeworkId === hw.id)
                                .map((sub) => {
                                  const studentFullName = resolveStudentFullName(sub.studentEmail, sub.studentName, registeredUsers);
                                  const isConfirmedName = isFullNameValid(studentFullName);
                                  const subFiles = getSubmissionFiles(sub);

                                  return (
                                    <div
                                      key={sub.id}
                                      className="bg-white p-2.5 rounded-xl border border-purple-100 flex flex-col gap-2"
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <div>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-black text-slate-900 text-xs sm:text-sm">
                                              {studentFullName}
                                            </span>
                                            {isConfirmedName && (
                                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                الاسم الثلاثي ✓
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[10px] text-slate-400 block mt-0.5">
                                            بتاريخ: {formatGregorianDate(sub.submittedAt)}
                                          </span>
                                        </div>
                                        {subFiles.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenPreview(subFiles, 0, studentFullName, `حل الواجب - ${studentFullName}`)}
                                            className="self-start sm:self-center text-[11px] font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>معاينة حلول الطالب ({subFiles.length}) بدون تحميل</span>
                                          </button>
                                        )}
                                      </div>

                                      {sub.notes && (
                                        <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                          {sub.notes}
                                        </p>
                                      )}

                                      {subFiles.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                                          {subFiles.map((file, fileIdx) => {
                                            const isImg = isImageAttachment(file.name, file.dataUrl);
                                            return (
                                              <div
                                                key={file.fileId || fileIdx}
                                                className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200/70 text-[11px]"
                                              >
                                                <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                                                  {isImg ? (
                                                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                  ) : (
                                                    <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                                  )}
                                                  <span className="truncate font-medium text-slate-800" title={file.name}>
                                                    {file.name}
                                                  </span>
                                                  {file.size && <span className="text-[9px] text-slate-400">({file.size})</span>}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenPreview(subFiles, fileIdx, studentFullName, `حل الواجب - ${studentFullName}`)}
                                                    className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-1.5 py-0.5 rounded hover:bg-indigo-50 flex items-center gap-0.5 cursor-pointer"
                                                    title="معاينة الملف مباشرة بدون تحميل"
                                                  >
                                                    <Eye className="w-2.5 h-2.5" />
                                                    <span>معاينة</span>
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDownloadFile(file.fileId, file.dataUrl, file.name)}
                                                    className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-50 flex items-center gap-0.5 cursor-pointer"
                                                    title="تحميل الملف"
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
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer: Teacher actions + Show More/Less + Submit button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    {canEdit && (
                      <>
                        {/* زر إنهاء الواجب للمعلّم: يتفعل فقط بعد انتهاء المدة التي حددها للتسليم */}
                        {isClosed ? (
                          <button
                            type="button"
                            onClick={() => handleToggleCloseHomework(hw)}
                            className="px-2 py-1 rounded-xl text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                            title="الواجب منتهي حالياً للطلاب، انقر لإعادة فتحه"
                          >
                            <CheckCircle className="w-3 h-3 text-rose-600" />
                            <span>واجب منتهي (إعادة فتح)</span>
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
                            className={`px-2 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                              deadlinePassed
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs cursor-pointer active:scale-95'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75'
                            }`}
                            title={
                              deadlinePassed
                                ? 'انتهت مدة التسليم، يمكنك الآن إنهاء الواجب ليظهر كمنتهي للطلاب'
                                : `يتفعل هذا الزر تلقائياً بعد انتهاء تاريخ التسليم (${hw.dueDate})`
                            }
                          >
                            <Clock className={`w-3 h-3 ${deadlinePassed ? 'text-white' : 'text-slate-400'}`} />
                            <span>
                              {deadlinePassed ? 'إنهاء الواجب' : 'إنهاء الواجب (يتفعل بعد انتهاء المدة)'}
                            </span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEditModal(hw)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="حذف الواجب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}

                    {isExpanded && hasStudentSubmission && onDeleteSubmission && (
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
                          title="حذف الحل المسلم لتعديله أو استبداله"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>حذف الحل</span>
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* زر عرض المزيد / عرض أقل */}
                    <button
                      type="button"
                      onClick={() => {
                        if ((isClosed || deadlinePassed) && !canEdit && !hasStudentSubmission) {
                          alert('هذا الواجب منتهي ولا يمكن الدخول إليه.');
                          return;
                        }
                        toggleExpand(hw.id);
                      }}
                      className={`py-1 px-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        (isClosed || deadlinePassed) && !canEdit && !hasStudentSubmission
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{isExpanded ? 'عرض أقل' : 'عرض المزيد'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>

                    {/* زر التسليم: متاح للطلاب والمشرفين فقط */}
                    {canSubmitHomework && (
                      hw.externalUrl ? (
                        <a
                          href={hw.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1 px-3 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="التسليم عبر المنصة الخارجية"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>التسليم الخارجي</span>
                        </a>
                      ) : (isClosed || deadlinePassed) ? (
                        <div
                          className="py-1 px-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5 cursor-not-allowed select-none"
                          title="هذا الواجب منتهي ومغلق ولا يمكن تسليم أو تعديل حلول"
                        >
                          <Lock className="w-3.5 h-3.5 text-rose-500" />
                          <span>واجب منتهي</span>
                        </div>
                      ) : (
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
                      )
                    )}
                  </div>
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رابط التسليم الخارجي <span className="text-slate-400 font-normal">(اختياري: منصة مدرستي، قوقل كلاس روم...)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://... (إذا وُجد، فلن يتمكن الطلاب من التسليم الداخلي)"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition dir-ltr text-right"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    عند وضع رابط هنا، يظهر للطالب زر "التسليم الخارجي" ولا يمكنه تسليم الحل داخل الموقع.
                  </p>
                </div>

                {/* Target Classes Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      الفصول المستهدفة *
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {targetClasses.includes('all')
                        ? 'محدد لجميع الفصول (١/١ - ١/٧)'
                        : `${targetClasses.length} فصول محددة`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleClass('all')}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        targetClasses.includes('all')
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
                      }`}
                    >
                      جميع الفصول
                    </button>
                    {AVAILABLE_CLASSES.map((cls) => {
                      const isSelected = !targetClasses.includes('all') && targetClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => toggleClass(cls)}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent'
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Model Solution Upload (Images / Camera / PDF) */}
                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-3.5 space-y-2">
                  <label className="block text-xs font-black text-purple-900">
                    إرفاق ملف الحل النموذجي - <span className="text-purple-600 font-normal">اختياري</span>
                  </label>
                  <p className="text-[11px] text-purple-700">
                    يمكنك التقاط صورة للحل، أو اختيار صورة من جهازك، أو رفع ملف PDF
                  </p>

                  {solutionFileName ? (
                    <div className="bg-white border border-purple-200 p-2.5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          {solutionFileType === 'image' ? (
                            <ImageIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
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

                      {solutionFileType === 'image' && solutionFileDataUrl && (
                        <div className="relative rounded-lg overflow-hidden border border-purple-100 max-h-32 flex justify-center bg-slate-50">
                          <img
                            src={solutionFileDataUrl}
                            alt="معاينة الحل"
                            className="max-h-32 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-purple-200 hover:border-purple-500 bg-white/80 hover:bg-purple-50/40 rounded-xl cursor-pointer transition text-center group">
                        <Camera className="w-5 h-5 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-purple-900">الكاميرا</span>
                        <span className="text-[9px] text-slate-400">تصوير مباشر</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleTeacherFileSelect}
                          className="hidden"
                        />
                      </label>

                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-purple-200 hover:border-purple-500 bg-white/80 hover:bg-purple-50/40 rounded-xl cursor-pointer transition text-center group">
                        <ImageIcon className="w-5 h-5 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-indigo-900">الصور</span>
                        <span className="text-[9px] text-slate-400">ألبوم الصور</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleTeacherFileSelect}
                          className="hidden"
                        />
                      </label>

                      <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-purple-200 hover:border-purple-500 bg-white/80 hover:bg-purple-50/40 rounded-xl cursor-pointer transition text-center group">
                        <UploadCloud className="w-5 h-5 text-slate-600 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-900">ملف PDF</span>
                        <span className="text-[9px] text-slate-400">مستند جاهز</span>
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
                {/* File Attachment Options: Camera, Photos, PDF */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800">
                      إرفاق الحل (يمكنك تحديد أكثر من صورة أو ملف PDF)
                    </label>
                    {studentAttachedFiles.length > 0 && (
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        {studentAttachedFiles.length} مرفقات محددة
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    يمكنك تصوير عدة صفحات بالكاميرا، أو اختيار صور متعددة من الألبوم، أو إرفاق ملفات PDF
                  </p>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                      className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span>إرفاق ملف</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isAttachMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAttachMenuOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-purple-200 shadow-xl p-2.5 z-20 space-y-1.5 text-right">
                        <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-50 cursor-pointer transition text-xs font-bold text-slate-800">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
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

                  {/* Selected files list with preview & delete */}
                  {studentAttachedFiles.length > 0 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 pt-1">
                      {studentAttachedFiles.map((f, idx) => {
                        const isImg = isImageAttachment(f.name, f.dataUrl);
                        return (
                          <div
                            key={f.fileId || idx}
                            className="p-2 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isImg && f.dataUrl ? (
                                <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-purple-300 bg-white shrink-0">
                                  <img
                                    src={f.dataUrl}
                                    alt={f.name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
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
                                className="p-1.5 text-indigo-700 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
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

      {/* Universal File Preview Modal (PDF & Images without downloading) */}
      <FilePreviewModal
        isOpen={previewModalConfig.isOpen}
        onClose={() => setPreviewModalConfig((prev) => ({ ...prev, isOpen: false }))}
        files={previewModalConfig.files}
        initialIndex={previewModalConfig.initialIndex}
        studentName={previewModalConfig.studentName}
        title={previewModalConfig.title}
      />
    </motion.div>
  );
};
