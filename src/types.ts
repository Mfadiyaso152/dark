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
}

export interface Subject {
  id: string;
  name: string;
  code: string;
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
  attachedFile?: AttachedFile; // Optional PDF solution attached by student
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



