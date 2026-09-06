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
  }
];

export interface AttachedFile {
  name: string;
  type: 'pdf' | 'png' | 'jpg';
  size: string;
  dataUrl?: string;
  previewUrl?: string;
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
  bookmarkedLessonIds: string[];
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
}


