export type UserRole = 'student' | 'supervisor' | 'teacher';

export interface UserJobOption {
  value: string;
  label: string;
  role: UserRole;
  isSupervisorOrTeacher: boolean;
  colorClass: string;
  description: string;
}

export const USER_JOB_OPTIONS: UserJobOption[] = [
  {
    value: 'طالب',
    label: 'طالب',
    role: 'student',
    isSupervisorOrTeacher: false,
    colorClass: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'مشاهدة وتحميل فقط'
  },
  {
    value: 'أ. كيمياء',
    label: 'أ. كيمياء',
    role: 'teacher',
    isSupervisorOrTeacher: true,
    colorClass: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'إضافة ملفات وشروحات لكافة المواد'
  },
  {
    value: 'أ. رياضيات',
    label: 'أ. رياضيات',
    role: 'teacher',
    isSupervisorOrTeacher: true,
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'إضافة ملفات وشروحات لكافة المواد'
  },
  {
    value: 'أ. علم البيئة',
    label: 'أ. علم البيئة',
    role: 'teacher',
    isSupervisorOrTeacher: true,
    colorClass: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'إضافة ملفات وشروحات لكافة المواد'
  },
  {
    value: 'أ. تقنية رقمية',
    label: 'أ. تقنية رقمية',
    role: 'teacher',
    isSupervisorOrTeacher: true,
    colorClass: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'إضافة ملفات وشروحات لكافة المواد'
  },
  {
    value: 'أ. تفكير ناقد',
    label: 'أ. تفكير ناقد',
    role: 'teacher',
    isSupervisorOrTeacher: true,
    colorClass: 'bg-red-100 text-red-800 border-red-200',
    description: 'إضافة ملفات وشروحات لكافة المواد'
  },
  {
    value: 'أ. التفسير',
    label: 'أ. التفسير',
    role: 'teacher',
    isSupervisorOrTeacher: true,
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'إضافة ملفات وشروحات لكافة المواد'
  },
  {
    value: 'أ. لغة إنجليزية',
    label: 'أ. لغة إنجليزية',
    role: 'teacher',
    isSupervisorOrTeacher: true,
    colorClass: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'إضافة ملفات وشروحات لكافة المواد'
  },
  {
    value: 'أ. كفايات لغوية',
    label: 'أ. كفايات لغوية',
    role: 'teacher',
    isSupervisorOrTeacher: true,
    colorClass: 'bg-pink-100 text-pink-800 border-pink-200',
    description: 'إضافة ملفات وشروحات لكافة المواد'
  },
  {
    value: 'مشرف مساعد',
    label: 'مشرف مساعد',
    role: 'supervisor',
    isSupervisorOrTeacher: true,
    colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'صلاحيات إشرافية كاملة'
  },
  {
    value: 'المرشد الطلابي',
    label: 'المرشد الطلابي',
    role: 'supervisor',
    isSupervisorOrTeacher: true,
    colorClass: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'إدارة الإرشاد الطلابي والملفات التوجيهية'
  }
];

export interface AttachedFile {
  name: string;
  type: 'pdf' | 'png' | 'jpg' | 'image';
  size: string;
  dataUrl?: string;
  previewUrl?: string;
  hasFile?: boolean;
  fileId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  jobTitle?: string;
  grade: string;
  isSuperAdmin?: boolean;
  isAssistantAdmin?: boolean;
  fullNameConfirmed?: boolean;
  joinedAt?: string;
  lastLogin?: string;
}

export type Semester = 1 | 2;

export interface TermDefinition {
  term: string;
  definition: string;
}

export interface Lesson {
  id: string;
  subjectId: string;
  semester: Semester;
  title: string;
  pages: string; // e.g., "ص 12 - 20"
  summary: string;
  keyPoints: string[];
  terms?: TermDefinition[];
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt?: string;
  supervisorName?: string;
  downloadCount?: number;
  tags?: string[];
  pdfFileName?: string;
  attachedFile?: AttachedFile;
  authorId?: string;
  authorName?: string;
  targetClasses?: string[]; // e.g. ["1/1", "1/2"] or ["all"]
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  semester: Semester;
  icon: string;
  emoji?: string;
  color: string;
  gradient: string;
  lightBg: string;
  borderColor: string;
  badgeBg?: string;
  titleColor?: string;
  countColor?: string;
  description: string;
  supervisorName: string;
  isComingSoon?: boolean;
}

export interface UserProgress {
  completedLessonIds: string[];
  bookmarkedLessonIds?: string[];
  completedHomeworkIds?: string[];
}

export interface SubjectBooklet {
  id: string;
  subjectId: string;
  title: string;
  pagesCount: string; // e.g. "100 صفحة"
  description: string;
  fileDataUrl?: string;
  fileName?: string;
  createdAt: string;
  supervisorName: string;
  hasFile?: boolean;
  fileSize?: string;
  targetClasses?: string[];
}

export interface BannerItem {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string;
  tabletImageUrl?: string;
  desktopImageUrl?: string;
  title?: string;
  description?: string;
  linkUrl?: string;
  isActive: boolean;
  createdAt: string;
  order?: number;
  isDeleted?: boolean;
}

export interface BannerSettings {
  autoPlay: boolean;
  intervalSeconds: number; // مدة الحركة بالثواني (مثلاً 5 ثواني)
}

export interface Homework {
  id: string;
  subjectId: string;
  title?: string;
  dueDate: string;
  pageNumber: string;
  questionNumber: string;
  notes?: string;
  createdAt: string;
  supervisorName: string;
  solutionFile?: AttachedFile; // Optional PDF solution file attached by teacher
  isClosed?: boolean; // إنهاء الواجب بعد انتهاء مدة التسليم
  closedAt?: string;
  targetClasses?: string[];
  externalUrl?: string; // رابط التسليم الخارجي
  isExternalSubmission?: boolean; // تسليم يدوي / خارج الموقع (داخل المدرسة)
}

export function isHomeworkDeadlinePassed(dueDate?: string): boolean {
  if (!dueDate) return false;
  const clean = dueDate.trim();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const formattedDue = `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
    return todayStr > formattedDue;
  }

  try {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(23, 59, 59, 999);
      return Date.now() > parsed.getTime();
    }
  } catch {}

  return false;
}

export interface SubjectFeatureControl {
  isPaused?: boolean; // إيقاف المادة بالكامل (عرض قريباً للجميع)
  lessonsDisabled?: boolean; // إيقاف الدروس (عرض قريباً)
  bookletsDisabled?: boolean; // إيقاف الملخصات (عرض قريباً)
  homeworksDisabled?: boolean; // إيقاف الواجبات (عرض قريباً)
  updatedAt?: string;
  updatedBy?: string;
}

export type SubjectControlsMap = Record<string, SubjectFeatureControl>;

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  subjectId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  notes?: string;
  isDeleted?: boolean;
  attachedFile?: AttachedFile; // Optional PDF/image solution attached by student (backward compatibility)
  attachedFiles?: AttachedFile[]; // Multiple solution files & images attached by student
}

/**
 * Format file size with accurate units (KB, MB), never returning 0kb or 0.0 MB.
 */
export function formatFileSize(bytesOrStr?: number | string | null, dataUrl?: string): string {
  if (typeof bytesOrStr === 'number' && !isNaN(bytesOrStr) && bytesOrStr > 0) {
    if (bytesOrStr < 1024) {
      return `${Math.max(1, Math.round(bytesOrStr))} B`;
    }
    if (bytesOrStr < 1024 * 1024) {
      const kb = Math.round(bytesOrStr / 1024);
      return `${Math.max(1, kb)} KB`;
    }
    const mb = bytesOrStr / (1024 * 1024);
    return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  }

  // If a string was provided
  if (typeof bytesOrStr === 'string' && bytesOrStr.trim()) {
    const s = bytesOrStr.trim();
    // If it's something like "0.0 MB", "0 MB", "0 KB", "0kb", "0B", try to calculate from dataUrl if present
    if (/^(0(\.0+)?\s*(mb|kb|b|k)?|0kb|0mb|0b)$/i.test(s)) {
      if (dataUrl && dataUrl.length > 30) {
        const estBytes = Math.round((dataUrl.length * 3) / 4);
        return formatFileSize(estBytes);
      }
      return '100 KB'; // sensible fallback instead of 0kb
    }
    return s;
  }

  // If we only have dataUrl
  if (dataUrl && dataUrl.length > 30) {
    const estBytes = Math.round((dataUrl.length * 3) / 4);
    return formatFileSize(estBytes);
  }

  return '1 MB';
}

export function getSubmissionFiles(sub?: HomeworkSubmission | null): AttachedFile[] {
  if (!sub) return [];
  const rawList: AttachedFile[] = [];
  if (Array.isArray(sub.attachedFiles) && sub.attachedFiles.length > 0) {
    rawList.push(...sub.attachedFiles);
  } else if (sub.attachedFile && (sub.attachedFile.hasFile !== false || sub.attachedFile.fileId || sub.attachedFile.dataUrl || sub.attachedFile.name)) {
    rawList.push(sub.attachedFile);
  }

  return rawList
    .filter((f) => !!f && (f.hasFile !== false || !!f.fileId || !!f.dataUrl || !!f.name))
    .map((f, idx) => {
      const fallbackId = idx === 0 ? `sub-sol-${sub.id}` : `sub-sol-${sub.id}-${idx}`;
      return {
        ...f,
        fileId: f.fileId || fallbackId,
        size: formatFileSize(f.size, f.dataUrl),
        hasFile: true
      };
    });
}

/**
 * Filter submissions to strictly only the latest active submission per student per homework.
 * Eliminates deleted or outdated duplicate submissions.
 */
export function getLatestUniqueSubmissions(
  submissions: HomeworkSubmission[] = [],
  homeworkId?: string
): HomeworkSubmission[] {
  if (!Array.isArray(submissions)) return [];

  const studentMap = new Map<string, HomeworkSubmission>();

  for (const sub of submissions) {
    if (!sub || (sub as any).isDeleted === true) continue;
    if (homeworkId && sub.homeworkId !== homeworkId) continue;

    const emailKey = (sub.studentEmail || '').trim().toLowerCase();
    const idKey = (sub.studentId || '').trim();
    const nameKey = (sub.studentName || '').trim().toLowerCase();

    // Key that uniquely identifies the student on this homework
    const studentIdentifier = emailKey || idKey || nameKey;
    if (!studentIdentifier) continue;

    const uniqueKey = `${sub.homeworkId}:::${studentIdentifier}`;
    const existing = studentMap.get(uniqueKey);

    if (!existing) {
      studentMap.set(uniqueKey, sub);
    } else {
      const existingTime = new Date(existing.submittedAt || 0).getTime();
      const subTime = new Date(sub.submittedAt || 0).getTime();
      // Keep the newer submission
      if (subTime >= existingTime) {
        studentMap.set(uniqueKey, sub);
      }
    }
  }

  return Array.from(studentMap.values()).sort(
    (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
  );
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  subjectId?: string;
  subjectName?: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  authorJobTitle?: string;
  linkUrl?: string;
  createdAt: string;
  isDeleted?: boolean;
}

export const AVAILABLE_CLASSES = ['1/1', '1/2', '1/3', '1/4', '1/5', '1/6', '1/7'] as const;
export type ClassName = typeof AVAILABLE_CLASSES[number];



