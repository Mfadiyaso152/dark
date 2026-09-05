export type UserRole = 'student' | 'supervisor';

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

