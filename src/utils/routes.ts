import { Subject, Lesson, Semester } from '../types';
import { TabType } from '../components/BottomNav';

// Subject canonical slug definitions
const KNOWN_SUBJECT_SLUGS: Record<string, string> = {
  'math-1': 'math',
  'chem-1': 'chemistry',
  'bio-1': 'biology',
  'eng-1': 'english',
  'digi-1': 'digital-skills',
  'lang-1': 'arabic',
  'tafsir-1': 'tafsir',
  'think-1': 'critical-thinking',
  'math-2': 'math-2',
  'phys-1': 'physics',
  'eco-1': 'ecology',
  'eng-2': 'english-2',
  'digi-2': 'digital-skills-2',
  'fin-1': 'financial-knowledge',
  'lang-2': 'arabic-2',
  'soc-1': 'social-studies',
  'hadith-1': 'hadith'
};

// Aliases mapping back to subject IDs
const SUBJECT_SLUG_ALIASES: Record<string, string> = {
  'math': 'math-1',
  'math-1': 'math-1',
  'mathematics': 'math-1',
  'math-2': 'math-2',
  'math2': 'math-2',
  'mathematics-2': 'math-2',
  'chemistry': 'chem-1',
  'chem': 'chem-1',
  'chem-1': 'chem-1',
  'physics': 'phys-1',
  'phys': 'phys-1',
  'phys-1': 'phys-1',
  'biology': 'bio-1',
  'bio': 'bio-1',
  'bio-1': 'bio-1',
  'english': 'eng-1',
  'eng': 'eng-1',
  'eng-1': 'eng-1',
  'english-1': 'eng-1',
  'mega-goal': 'eng-1',
  'english-2': 'eng-2',
  'eng-2': 'eng-2',
  'mega-goal-2': 'eng-2',
  'digital-skills': 'digi-1',
  'digi-1': 'digi-1',
  'digital-tech': 'digi-1',
  'tech-1': 'digi-1',
  'digital-skills-2': 'digi-2',
  'digi-2': 'digi-2',
  'digital-tech-2': 'digi-2',
  'arabic': 'lang-1',
  'lang-1': 'lang-1',
  'language-skills': 'lang-1',
  'kafayat-1': 'lang-1',
  'arabic-2': 'lang-2',
  'lang-2': 'lang-2',
  'language-skills-2': 'lang-2',
  'kafayat-2': 'lang-2',
  'tafsir': 'tafsir-1',
  'tafsir-1': 'tafsir-1',
  'quran': 'tafsir-1',
  'islamic-studies': 'tafsir-1',
  'critical-thinking': 'think-1',
  'think-1': 'think-1',
  'thinking': 'think-1',
  'critical-thought': 'think-1',
  'ecology': 'eco-1',
  'eco-1': 'eco-1',
  'environment': 'eco-1',
  'financial-knowledge': 'fin-1',
  'fin-1': 'fin-1',
  'finance': 'fin-1',
  'social-studies': 'soc-1',
  'soc-1': 'soc-1',
  'social': 'soc-1',
  'hadith': 'hadith-1',
  'hadith-1': 'hadith-1'
};

// Section slug translations
export type SubViewType = 'lessons' | 'booklets' | 'homework' | null;

const SECTION_SLUGS: Record<string, 'lessons' | 'booklets' | 'homework'> = {
  'summaries': 'lessons',
  'lessons': 'lessons',
  'lectures': 'lessons',
  'shuruh': 'lessons',
  'assignments': 'homework',
  'homework': 'homework',
  'homeworks': 'homework',
  'wajibat': 'homework',
  'booklets': 'booklets',
  'memos': 'booklets',
  'notes': 'booklets',
  'molakhasat': 'booklets',
  'quizzes': 'lessons', // fallback to lessons/quizzes tab
  'exams': 'lessons'
};

// Arabic transliteration dictionary for dynamic subjects
const ARABIC_WORD_MAP: Record<string, string> = {
  'رياضيات': 'math',
  'كيمياء': 'chemistry',
  'فيزياء': 'physics',
  'أحياء': 'biology',
  'احياء': 'biology',
  'إنجليزي': 'english',
  'انجليزي': 'english',
  'تقنية': 'tech',
  'رقمية': 'digital',
  'حاسب': 'computer',
  'مهارات': 'skills',
  'بيئة': 'ecology',
  'تفكير': 'thinking',
  'ناقد': 'critical',
  'قرآن': 'quran',
  'تفسير': 'tafsir',
  'كفايات': 'competencies',
  'لغوية': 'linguistics',
  'عربي': 'arabic',
  'لغة': 'language',
  'مالية': 'finance',
  'معرفة': 'knowledge',
  'دراسات': 'studies',
  'اجتماعية': 'social',
  'حديث': 'hadith',
  'توحيد': 'tawheed',
  'فقه': 'fiqh',
  'تاريخ': 'history',
  'جغرافيا': 'geography',
  'إحصاء': 'statistics',
  'علم': 'science',
  'أول': '1',
  'اول': '1',
  'ثاني': '2',
  'ثالث': '3'
};

/**
 * Generate a clean English slug for any subject
 */
export function getSubjectSlug(subject: Subject): string {
  if (KNOWN_SUBJECT_SLUGS[subject.id]) {
    return KNOWN_SUBJECT_SLUGS[subject.id];
  }

  // If already alphanumeric slug
  if (/^[a-z0-9-]+$/i.test(subject.id)) {
    return subject.id.toLowerCase();
  }

  // Attempt to translate Arabic keywords
  const words = subject.name.toLowerCase().split(/[\s\-–—_\(\)]+/).filter(Boolean);
  const translatedWords = words.map(w => ARABIC_WORD_MAP[w] || w);
  const candidate = translatedWords.join('-').replace(/[^a-z0-9-]+/gi, '').toLowerCase();

  if (candidate && candidate.length > 1) {
    return candidate;
  }

  return `subject-${subject.id}`;
}

/**
 * Match a URL slug back to a Subject object
 */
export function findSubjectBySlug(slug: string, subjects: Subject[]): Subject | undefined {
  if (!slug) return undefined;
  const raw = decodeURIComponent(slug).toLowerCase().trim();
  const normalized = raw.replace(/[ـ\s\-_]+/g, '');

  // 1. Check known aliases
  const mappedId = SUBJECT_SLUG_ALIASES[normalized] || SUBJECT_SLUG_ALIASES[raw];
  if (mappedId) {
    const found = subjects.find(s => s.id === mappedId);
    if (found) return found;
  }

  // 2. Check exact ID match
  const directId = subjects.find(s => s.id.toLowerCase() === raw || s.id.toLowerCase().replace(/[\s\-_]+/g, '') === normalized);
  if (directId) return directId;

  // 3. Check calculated slug
  const bySlug = subjects.find(s => {
    const sSlug = getSubjectSlug(s).toLowerCase();
    return sSlug === raw || sSlug.replace(/[\s\-_]+/g, '') === normalized;
  });
  if (bySlug) return bySlug;

  // 4. Check subject name match (exact or partial)
  const byName = subjects.find(s => {
    const sName = s.name.toLowerCase();
    const cleanSName = sName.replace(/[^\u0621-\u064Aa-zA-Z0-9]/g, '');
    const cleanNorm = normalized.replace(/[^\u0621-\u064Aa-zA-Z0-9]/g, '');
    return sName === raw || cleanSName === cleanNorm || cleanSName.includes(cleanNorm) || cleanNorm.includes(cleanSName);
  });
  if (byName) return byName;

  // 5. Fuzzy keyword search across subjects
  return subjects.find(s => {
    const cleanName = s.name.toLowerCase();
    return cleanName.includes(raw) || raw.includes(cleanName);
  });
}

/**
 * Convert a lesson to a clean URL slug
 */
export function getLessonSlug(lesson: Lesson): string {
  if (!lesson) return '';

  // Clean title: remove punctuation, brackets
  const cleanTitle = lesson.title
    .replace(/[^\u0621-\u064Aa-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  if (cleanTitle) {
    return encodeURIComponent(cleanTitle);
  }

  return lesson.id;
}

/**
 * Find a lesson by slug or ID
 */
export function findLessonBySlug(slug: string, lessons: Lesson[]): Lesson | undefined {
  if (!slug) return undefined;
  const raw = decodeURIComponent(slug).toLowerCase().trim();
  const decoded = raw.replace(/[ـ\s\-_]+/g, '');

  // 1. Direct ID match
  const direct = lessons.find(l => l.id.toLowerCase() === raw || l.id.toLowerCase().replace(/[\s\-_]+/g, '') === decoded);
  if (direct) return direct;

  // 2. Exact slug match
  const bySlug = lessons.find(l => {
    const lessonSlug = decodeURIComponent(getLessonSlug(l)).toLowerCase();
    return lessonSlug === raw || lessonSlug.replace(/[\s\-_]+/g, '') === decoded;
  });
  if (bySlug) return bySlug;

  // 3. Title match / partial slug match
  return lessons.find(l => {
    const cleanTitle = l.title.toLowerCase().replace(/[^\u0621-\u064Aa-zA-Z0-9]/g, '');
    const cleanSlug = decoded.replace(/[^a-zA-Z0-9\u0621-\u064A]/g, '');
    return cleanTitle.includes(cleanSlug) || cleanSlug.includes(cleanTitle);
  });
}

/**
 * Route State Representation
 */
export type AppRoute =
  | { type: 'home'; semester?: Semester }
  | { type: 'homeworks' }
  | { type: 'qudurat' }
  | { type: 'students' }
  | { type: 'users' }
  | {
      type: 'subject';
      subject: Subject;
      subView: SubViewType;
      activeLesson?: Lesson;
    }
  | { type: 'not-found'; path: string };

/**
 * Parse browser pathname into AppRoute
 */
export function parsePathname(pathname: string, subjects: Subject[], lessons: Lesson[]): AppRoute {
  const cleanPath = (pathname || '/').split('?')[0].split('#')[0];
  const segments = cleanPath.split('/').filter(Boolean).map(s => decodeURIComponent(s));

  // Root / Home
  if (segments.length === 0 || segments[0] === 'home') {
    return { type: 'home', semester: 1 };
  }

  // Top level tabs
  const first = segments[0].toLowerCase();

  if (first === 'p1' || first === 'semester-1') {
    return { type: 'home', semester: 1 };
  }
  if (first === 'p2' || first === 'semester-2') {
    return { type: 'home', semester: 2 };
  }
  if (first === 'homeworks' || first === 'daily-homeworks' || first === 'homework') {
    return { type: 'homeworks' };
  }
  if (first === 'qudurat' || first === 'aptitude') {
    return { type: 'qudurat' };
  }
  if (first === 'students' || first === 'services' || first === 'student-service') {
    return { type: 'students' };
  }
  if (first === 'users' || first === 'management' || first === 'admin') {
    return { type: 'users' };
  }

  // Check if first segment is a Subject
  let matchedSubject = findSubjectBySlug(first, subjects);
  
  // If not matched by first segment, check any segment for a subject match
  if (!matchedSubject) {
    for (const seg of segments) {
      const found = findSubjectBySlug(seg, subjects);
      if (found) {
        matchedSubject = found;
        break;
      }
    }
  }

  if (matchedSubject) {
    // e.g. /math
    if (segments.length === 1) {
      return {
        type: 'subject',
        subject: matchedSubject,
        subView: null
      };
    }

    // e.g. /math/summaries, /math/assignments, /math/booklets
    const second = segments[1].toLowerCase();
    const subView = SECTION_SLUGS[second] || null;

    // Check if there is a 3rd segment (lesson detail): e.g. /math/summaries/lesson-name
    if (segments.length >= 3) {
      const third = segments.slice(2).join('/');
      const subjectLessons = lessons.filter(l => l.subjectId === matchedSubject.id);
      const matchedLesson = findLessonBySlug(third, subjectLessons);

      return {
        type: 'subject',
        subject: matchedSubject,
        subView: subView || 'lessons',
        activeLesson: matchedLesson
      };
    }

    // Check if 2nd segment was actually a direct lesson slug without section: e.g. /math/my-lesson
    if (!subView) {
      const subjectLessons = lessons.filter(l => l.subjectId === matchedSubject.id);
      const matchedLesson = findLessonBySlug(second, subjectLessons);
      if (matchedLesson) {
        return {
          type: 'subject',
          subject: matchedSubject,
          subView: 'lessons',
          activeLesson: matchedLesson
        };
      }
      // Fallback to subject root instead of 404
      return {
        type: 'subject',
        subject: matchedSubject,
        subView: null
      };
    }

    return {
      type: 'subject',
      subject: matchedSubject,
      subView
    };
  }

  // Only return 404 if path doesn't match home, tabs, or any subject
  return { type: 'not-found', path: pathname };
}

/**
 * Build Canonical URL path from state
 */
export function buildUrl(
  tab: TabType,
  selectedSubject: Subject | null,
  subView: SubViewType,
  activeLesson: Lesson | null,
  selectedSemester?: Semester
): string {
  // If a subject is selected
  if (selectedSubject) {
    const subjectSlug = getSubjectSlug(selectedSubject);

    if (activeLesson && activeLesson.subjectId === selectedSubject.id) {
      const lessonSlug = getLessonSlug(activeLesson);
      return `/${subjectSlug}/summaries/${lessonSlug}`;
    }

    if (subView === 'lessons') {
      return `/${subjectSlug}/summaries`;
    }
    if (subView === 'homework') {
      return `/${subjectSlug}/assignments`;
    }
    if (subView === 'booklets') {
      return `/${subjectSlug}/booklets`;
    }

    return `/${subjectSlug}`;
  }

  // Top level tabs
  if (tab === 'homeworks') return '/homeworks';
  if (tab === 'qudurat') return '/qudurat';
  if (tab === 'students') return '/students';
  if (tab === 'users') return '/users';

  // Home
  if (selectedSemester === 2) return '/p2';
  return '/';
}

/**
 * Update browser URL without triggering reload
 */
export function syncBrowserUrl(
  url: string,
  replace: boolean = false
) {
  if (typeof window === 'undefined') return;

  const currentPath = window.location.pathname;
  if (currentPath === url) return;

  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
}
