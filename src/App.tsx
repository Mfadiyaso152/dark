import React, { useState, useEffect, useMemo } from 'react';
import { Search, MessageCircle, Calendar, Clock, Sparkles, ClipboardCheck } from 'lucide-react';
import { Subject, Lesson, UserProgress, SubjectBooklet, Semester, Homework, HomeworkSubmission, AttachedFile } from './types';
import { INITIAL_SUBJECTS, INITIAL_LESSONS, INITIAL_BOOKLETS } from './data/initialData';
import { Header } from './components/Header';
import { SubjectCard } from './components/SubjectCard';
import { SubjectDetailView } from './components/SubjectDetailView';
import { LessonCard } from './components/LessonCard';
import { LessonDetailModal } from './components/LessonDetailModal';
import { AddLessonModal } from './components/AddLessonModal';
import { AuthModal } from './components/AuthModal';
import { NotificationsModal } from './components/NotificationsModal';
import { LoginPage } from './components/LoginPage';
import { UserManagementView } from './components/UserManagementView';
import { StudentsManagementView } from './components/StudentsManagementView';
import { StudentServiceView } from './components/StudentServiceView';
import { QuduratView } from './components/QuduratView';
import { DailyHomeworksView } from './components/DailyHomeworksView';
import { AdminPortalView } from './components/AdminPortalView';
import { BottomNav, TabType } from './components/BottomNav';
import { SupervisorSettingsDrawer } from './components/SupervisorSettingsDrawer';
import { FullNameRequiredModal } from './components/FullNameRequiredModal';
import { NotFoundView } from './components/NotFoundView';
import {
  parsePathname,
  buildUrl,
  syncBrowserUrl,
  SubViewType,
  getSubjectSlug,
  getLessonSlug
} from './utils/routes';
import { useAuth, resolveStudentFullName } from './context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { db, doc, setDoc, getDoc, collection, onSnapshot, deleteDoc } from './lib/firebase';
import {
  safeSetItem,
  safeGetItem,
  sanitizeLessonsForStorage,
  sanitizeBookletsForStorage,
  sanitizeExistingLocalStorage
} from './utils/storage';
import { storeLargeFile, deleteLargeFile } from './utils/fileStorage';
import { uploadFileToCloud, deleteFileFromCloud } from './utils/cloudStorage';

export default function App() {
  const { user, isSuperAdmin, isAssistantAdmin, canAddContent, canManageSubject, setIsAuthModalOpen, registeredUsers } = useAuth();
  const isSupervisorRole = canAddContent;

  // Run startup hygiene to clean any bloated keys causing QuotaExceededError
  useEffect(() => {
    sanitizeExistingLocalStorage();
  }, []);

  const [subjects] = useState<Subject[]>(INITIAL_SUBJECTS);

  // Lessons: Always ensure all authentic curriculum lessons are present unless deleted
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    const deletedIds = new Set<string>();
    try {
      const storedDeleted = JSON.parse(safeGetItem('thanaweya_deleted_lesson_ids') || '[]');
      if (Array.isArray(storedDeleted)) {
        storedDeleted.forEach((id) => deletedIds.add(id));
      }
    } catch (e) {
      console.warn(e);
    }

    try {
      const saved = safeGetItem('thanaweya_lessons_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((l) => !deletedIds.has(l.id));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LESSONS.filter((l) => !deletedIds.has(l.id));
  });

  // Booklets (مذكرات وملخصات)
  const [booklets, setBooklets] = useState<SubjectBooklet[]>(() => {
    const deletedIds = new Set<string>();
    try {
      const storedDeleted = JSON.parse(safeGetItem('thanaweya_deleted_booklet_ids') || '[]');
      if (Array.isArray(storedDeleted)) {
        storedDeleted.forEach((id) => deletedIds.add(id));
      }
    } catch (e) {
      console.warn(e);
    }

    try {
      const saved = safeGetItem('thanaweya_subject_booklets_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((b) => !deletedIds.has(b.id));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_BOOKLETS.filter((b) => !deletedIds.has(b.id));
  });

  // Sync booklets safely to localStorage (stripping heavy base64 to protect quota)
  useEffect(() => {
    safeSetItem('thanaweya_subject_booklets_v4', JSON.stringify(sanitizeBookletsForStorage(booklets)));
  }, [booklets]);

  // Real-time Firestore sync for Lessons across all users (instant cloud sync)
  useEffect(() => {
    const lessonsCol = collection(db, 'lessons');
    const unsubscribe = onSnapshot(lessonsCol, (snapshot) => {
      const cloudLessons: Lesson[] = [];
      const deletedIds = new Set<string>();

      try {
        const storedDeleted = JSON.parse(safeGetItem('thanaweya_deleted_lesson_ids') || '[]');
        if (Array.isArray(storedDeleted)) {
          storedDeleted.forEach((id) => deletedIds.add(id));
        }
      } catch (e) {
        console.warn(e);
      }

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isDeleted) {
          deletedIds.add(data.id || docSnap.id);
        } else if (data.id && data.title && data.subjectId) {
          cloudLessons.push(data as Lesson);
        }
      });

      // Save merged deleted IDs permanently so deleted lessons NEVER return
      try {
        safeSetItem('thanaweya_deleted_lesson_ids', JSON.stringify(Array.from(deletedIds)));
      } catch (e) {
        console.warn(e);
      }

      setLessons((prev) => {
        const map = new Map<string, Lesson>();
        INITIAL_LESSONS.forEach((l) => {
          if (!deletedIds.has(l.id)) {
            map.set(l.id, l);
          }
        });
        prev.forEach((l) => {
          if (!deletedIds.has(l.id)) {
            map.set(l.id, l);
          }
        });
        cloudLessons.forEach((cl) => {
          if (!deletedIds.has(cl.id)) {
            map.set(cl.id, cl);
          }
        });

        const merged = Array.from(map.values());
        safeSetItem('thanaweya_lessons_v3', JSON.stringify(sanitizeLessonsForStorage(merged)));
        return merged;
      });
    }, (err) => {
      console.warn('Firestore lessons snapshot error:', err);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore sync for Booklets across all users (instant cloud sync)
  useEffect(() => {
    const bookletsCol = collection(db, 'booklets');
    const unsubscribe = onSnapshot(bookletsCol, (snapshot) => {
      const cloudBooklets: SubjectBooklet[] = [];
      const deletedIds = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isDeleted) {
          deletedIds.add(data.id || docSnap.id);
        } else if (data.id && data.title && data.subjectId) {
          cloudBooklets.push(data as SubjectBooklet);
        }
      });

      setBooklets((prev) => {
        const map = new Map<string, SubjectBooklet>();
        INITIAL_BOOKLETS.forEach((b) => {
          if (!deletedIds.has(b.id)) {
            map.set(b.id, b);
          }
        });
        prev.forEach((b) => {
          if (!deletedIds.has(b.id)) {
            map.set(b.id, b);
          }
        });
        cloudBooklets.forEach((cb) => {
          if (!deletedIds.has(cb.id)) {
            map.set(cb.id, cb);
          }
        });

        const merged = Array.from(map.values());
        safeSetItem('thanaweya_subject_booklets_v4', JSON.stringify(sanitizeBookletsForStorage(merged)));
        return merged;
      });
    }, (err) => {
      console.warn('Firestore booklets snapshot error:', err);
    });

    return () => unsubscribe();
  }, []);

  // Homeworks (الواجبات المدرسية)
  const [homeworks, setHomeworks] = useState<Homework[]>(() => {
    try {
      const saved = safeGetItem('thanaweya_homeworks_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Sync homeworks safely to localStorage
  useEffect(() => {
    safeSetItem('thanaweya_homeworks_v2', JSON.stringify(homeworks));
  }, [homeworks]);

  // Real-time Firestore sync for Homeworks across all users (instant cloud sync)
  useEffect(() => {
    const hwCol = collection(db, 'homeworks');
    const unsubscribe = onSnapshot(hwCol, (snapshot) => {
      const cloudHws: Homework[] = [];
      const deletedIds = new Set<string>();

      // Read local deleted IDs so deleted homeworks NEVER resurrect
      try {
        const storedDeleted = JSON.parse(safeGetItem('thanaweya_deleted_hw_ids') || '[]');
        if (Array.isArray(storedDeleted)) {
          storedDeleted.forEach((d: string) => deletedIds.add(d));
        }
      } catch (e) {
        console.warn(e);
      }

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isDeleted || deletedIds.has(docSnap.id) || deletedIds.has(data.id)) {
          deletedIds.add(data.id || docSnap.id);
        } else if (data.id && data.subjectId && data.dueDate && !deletedIds.has(data.id)) {
          cloudHws.push(data as Homework);
        }
      });

      setHomeworks((prev) => {
        const map = new Map<string, Homework>();
        prev.forEach((h) => {
          if (!deletedIds.has(h.id)) {
            map.set(h.id, h);
          }
        });
        cloudHws.forEach((ch) => {
          if (!deletedIds.has(ch.id)) {
            const existing = map.get(ch.id);
            if (existing?.solutionFile?.dataUrl && !ch.solutionFile?.dataUrl) {
              map.set(ch.id, {
                ...ch,
                solutionFile: {
                  ...ch.solutionFile,
                  ...existing.solutionFile,
                  fileId: ch.solutionFile?.fileId || existing.solutionFile.fileId
                }
              });
            } else {
              map.set(ch.id, ch);
            }
          }
        });
        const merged = Array.from(map.values());
        safeSetItem('thanaweya_homeworks_v2', JSON.stringify(merged));
        return merged;
      });
    }, (err) => {
      console.warn('Firestore homeworks snapshot error:', err);
    });

    return () => unsubscribe();
  }, []);

  // Homework Submissions (تسليمات وحلول واجبات الطلاب)
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>(() => {
    try {
      const saved = safeGetItem('thanaweya_homework_submissions_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Sync submissions safely to localStorage
  useEffect(() => {
    safeSetItem('thanaweya_homework_submissions_v1', JSON.stringify(submissions));
  }, [submissions]);

  // Real-time Firestore sync for Homework Submissions
  useEffect(() => {
    const subCol = collection(db, 'homework_submissions');
    const unsubscribe = onSnapshot(subCol, (snapshot) => {
      const cloudSubs: HomeworkSubmission[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.id && data.homeworkId && (data.studentEmail || data.studentId)) {
          cloudSubs.push(data as HomeworkSubmission);
        }
      });

      setSubmissions((prev) => {
        const map = new Map<string, HomeworkSubmission>();
        prev.forEach((s) => map.set(s.id, s));
        cloudSubs.forEach((cs) => {
          const existing = map.get(cs.id);
          if (existing) {
            // Preserve local dataUrls if cloud document does not have them
            const mergedAttachedFile = existing.attachedFile?.dataUrl && !cs.attachedFile?.dataUrl
              ? { ...cs.attachedFile, dataUrl: existing.attachedFile.dataUrl, fileId: cs.attachedFile?.fileId || existing.attachedFile.fileId }
              : (cs.attachedFile || existing.attachedFile);

            const mergedAttachedFiles = (cs.attachedFiles || existing.attachedFiles || []).map((cf, idx) => {
              const existingF = existing.attachedFiles?.[idx];
              if (existingF?.dataUrl && !cf.dataUrl) {
                return { ...cf, dataUrl: existingF.dataUrl, fileId: cf.fileId || existingF.fileId };
              }
              return cf;
            });

            map.set(cs.id, {
              ...existing,
              ...cs,
              attachedFile: mergedAttachedFile,
              attachedFiles: mergedAttachedFiles.length > 0 ? mergedAttachedFiles : cs.attachedFiles
            });
          } else {
            map.set(cs.id, cs);
          }
        });
        const merged = Array.from(map.values());
        safeSetItem('thanaweya_homework_submissions_v1', JSON.stringify(merged));
        return merged;
      });
    }, (err) => {
      console.warn('Firestore homework_submissions snapshot note:', err);
    });

    return () => unsubscribe();
  }, []);

  // User-specific cloud progress key
  const userStorageKey = useMemo(() => {
    return user?.email
      ? `thanaweya_progress_${user.email.toLowerCase().trim()}`
      : 'thanaweya_progress_guest';
  }, [user?.email]);

  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const key = user?.email
        ? `thanaweya_progress_${user.email.toLowerCase().trim()}`
        : 'thanaweya_progress_guest';
      const saved = safeGetItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.completedLessonIds)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return {
      completedLessonIds: []
    };
  });

  // Load progress when user changes
  useEffect(() => {
    if (!user) return;

    try {
      const saved = safeGetItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.completedLessonIds)) {
          setProgress(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }

    const fetchCloudProgress = async () => {
      try {
        if (user.id) {
          const docRef = doc(db, 'userProgress', user.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && Array.isArray(data.completedLessonIds)) {
              setProgress({
                completedLessonIds: data.completedLessonIds,
                completedHomeworkIds: data.completedHomeworkIds
              });
            }
          }
        }
      } catch (err) {
        console.warn('Firestore progress load note:', err);
      }
    };

    fetchCloudProgress();
  }, [userStorageKey, user?.id]);

  // Sync progress safely
  useEffect(() => {
    if (userStorageKey && progress && Array.isArray(progress.completedLessonIds)) {
      safeSetItem(userStorageKey, JSON.stringify(progress));

      if (user?.id) {
        try {
          const docRef = doc(db, 'userProgress', user.id);
          setDoc(docRef, {
            email: user.email,
            completedLessonIds: progress.completedLessonIds,
            completedHomeworkIds: progress.completedHomeworkIds || [],
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch((err) => console.warn('Firestore sync note:', err));
        } catch (err) {
          console.warn('Firestore sync catch:', err);
        }
      }
    }
  }, [progress, userStorageKey, user?.id, user?.email]);

  // Sync lessons safely to localStorage (stripping heavy attachments from cache)
  useEffect(() => {
    safeSetItem('thanaweya_lessons_v3', JSON.stringify(sanitizeLessonsForStorage(lessons)));
  }, [lessons]);

  // Active view filters
  const [selectedSemester, setSelectedSemester] = useState<Semester>(1);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSubView, setSelectedSubView] = useState<SubViewType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isNotFound, setIsNotFound] = useState(false);
  const [attemptedPath, setAttemptedPath] = useState('');

  // Modals
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Safe checks
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const safeSubjects = Array.isArray(subjects) ? subjects : [];

  // 1. Initial URL load & Browser Back/Forward navigation listener
  useEffect(() => {
    const handleLocationChange = () => {
      if (typeof window === 'undefined') return;
      const pathname = window.location.pathname;
      const route = parsePathname(pathname, safeSubjects, safeLessons);

      if (route.type === 'home') {
        setIsNotFound(false);
        setActiveTab('home');
        setSelectedSubject(null);
        setSelectedSubView(null);
        if (route.semester) setSelectedSemester(route.semester);
        setIsDetailModalOpen(false);
        document.title = 'زاد | zad';
      } else if (route.type === 'homeworks') {
        setIsNotFound(false);
        setActiveTab('homeworks');
        setSelectedSubject(null);
        setSelectedSubView(null);
        setIsDetailModalOpen(false);
        document.title = 'الواجبات اليومية | زاد';
      } else if (route.type === 'qudurat') {
        setIsNotFound(false);
        setActiveTab('qudurat');
        setSelectedSubject(null);
        setSelectedSubView(null);
        setIsDetailModalOpen(false);
        document.title = 'القدرات | زاد';
      } else if (route.type === 'students') {
        setIsNotFound(false);
        setActiveTab('students');
        setSelectedSubject(null);
        setSelectedSubView(null);
        setIsDetailModalOpen(false);
        document.title = 'الطلاب | زاد';
      } else if (route.type === 'admin') {
        setIsNotFound(false);
        setActiveTab('admin');
        setSelectedSubject(null);
        setSelectedSubView(null);
        setIsDetailModalOpen(false);
        document.title = 'بوابة المشرف الأساسي | زاد';
      } else if (route.type === 'users') {
        setIsNotFound(false);
        setActiveTab('users');
        setSelectedSubject(null);
        setSelectedSubView(null);
        setIsDetailModalOpen(false);
        document.title = 'إدارة المستخدمين | زاد';
      } else if (route.type === 'subject') {
        setIsNotFound(false);
        setActiveTab('home');
        setSelectedSubject(route.subject);
        setSelectedSemester(route.subject.semester);

        if ((route.subView || route.activeLesson) && !user) {
          setSelectedSubView(null);
          setIsDetailModalOpen(false);
          setIsAuthModalOpen(true);
        } else {
          setSelectedSubView(route.subView);

          if (route.activeLesson) {
            setActiveLesson(route.activeLesson);
            setIsDetailModalOpen(true);
            document.title = `${route.activeLesson.title} | ${route.subject.name} | زاد`;
          } else {
            setIsDetailModalOpen(false);
            const sectionTitle =
              route.subView === 'lessons'
                ? `شروحات ${route.subject.name}`
                : route.subView === 'homework'
                ? `واجبات ${route.subject.name}`
                : route.subView === 'booklets'
                ? `ملخصات ${route.subject.name}`
                : route.subject.name;
            document.title = `${sectionTitle} | زاد`;
          }
        }
      } else if (route.type === 'not-found') {
        setIsNotFound(true);
        setAttemptedPath(route.path);
        document.title = 'الصفحة غير موجودة (404) | زاد';
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [safeSubjects, safeLessons]);

  // 2. Synchronize Browser URL and Page Title whenever navigation state changes from UI clicks
  const isFirstMountRef = React.useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    if (isNotFound) return;

    const activeLessonForUrl =
      isDetailModalOpen && activeLesson && selectedSubject && activeLesson.subjectId === selectedSubject.id
        ? activeLesson
        : null;

    const targetUrl = buildUrl(
      activeTab,
      selectedSubject,
      selectedSubView,
      activeLessonForUrl,
      selectedSemester
    );

    syncBrowserUrl(targetUrl);

    // Sync Page Title
    if (selectedSubject) {
      if (activeLessonForUrl) {
        document.title = `${activeLessonForUrl.title} | ${selectedSubject.name} | زاد`;
      } else if (selectedSubView === 'lessons') {
        document.title = `شروحات ${selectedSubject.name} | زاد`;
      } else if (selectedSubView === 'homework') {
        document.title = `واجبات ${selectedSubject.name} | زاد`;
      } else if (selectedSubView === 'booklets') {
        document.title = `ملخصات ${selectedSubject.name} | زاد`;
      } else {
        document.title = `${selectedSubject.name} | زاد`;
      }
    } else if (activeTab === 'homeworks') {
      document.title = 'الواجبات اليومية | زاد';
    } else if (activeTab === 'qudurat') {
      document.title = 'القدرات | زاد';
    } else if (activeTab === 'students') {
      document.title = 'الطلاب | زاد';
    } else if (activeTab === 'admin') {
      document.title = 'بوابة المشرف الأساسي | زاد';
    } else if (activeTab === 'users') {
      document.title = 'إدارة المستخدمين | زاد';
    } else {
      document.title = 'زاد | zad';
    }
  }, [
    activeTab,
    selectedSubject,
    selectedSubView,
    isDetailModalOpen,
    activeLesson,
    selectedSemester,
    isNotFound
  ]);

  // Guard against opening a coming-soon subject
  useEffect(() => {
    if (selectedSubject?.isComingSoon) {
      setSelectedSubject(null);
      setSelectedSubView(null);
    }
  }, [selectedSubject]);

  // Filtered subjects based on search query (Unified view without P1/P2 split)
  const displayedSubjects = useMemo(() => {
    let result = safeSubjects.filter((s) => s.semester === 1);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = safeSubjects.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [safeSubjects, searchQuery]);

  // Filtered lessons for search
  const filteredLessons = useMemo(() => {
    let result = safeLessons;

    if (selectedSubject) {
      result = result.filter((l) => l.subjectId === selectedSubject.id);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.summary && l.summary.toLowerCase().includes(q))
      );
    }

    return result;
  }, [safeLessons, selectedSubject, searchQuery]);

  // Lesson actions
  const handleToggleComplete = (lessonId: string) => {
    setProgress((prev) => {
      const isDone = prev.completedLessonIds.includes(lessonId);
      return {
        ...prev,
        completedLessonIds: isDone
          ? prev.completedLessonIds.filter((id) => id !== lessonId)
          : [...prev.completedLessonIds, lessonId]
      };
    });
  };

  const handleSaveLesson = async (newLesson: Lesson) => {
    if (!canManageSubject(newLesson.subjectId)) {
      return;
    }

    // 0. Remove from local deleted IDs list if re-adding
    try {
      const storedDeleted = JSON.parse(safeGetItem('thanaweya_deleted_lesson_ids') || '[]');
      if (Array.isArray(storedDeleted) && storedDeleted.includes(newLesson.id)) {
        const cleaned = storedDeleted.filter((id) => id !== newLesson.id);
        safeSetItem('thanaweya_deleted_lesson_ids', JSON.stringify(cleaned));
      }
    } catch (e) {
      console.warn(e);
    }

    const fileId = 'lesson-file-' + newLesson.id;
    const hasFileData = !!newLesson.attachedFile?.dataUrl;
    const attachedFileDataUrl = newLesson.attachedFile?.dataUrl;

    // 1. Cloud-safe document: strictly clean metadata (no bulky dataUrl)
    // Saves to Firestore in milliseconds, triggering onSnapshot instantly for all students across all devices!
    const cloudLesson: Lesson = {
      ...newLesson,
      attachedFile: newLesson.attachedFile
        ? {
            name: newLesson.attachedFile.name || 'ملف الدرس.pdf',
            type: newLesson.attachedFile.type || 'pdf',
            size: newLesson.attachedFile.size || '1 MB',
            hasFile: true,
            fileId,
            previewUrl:
              newLesson.attachedFile.previewUrl && newLesson.attachedFile.previewUrl.length < 50000
                ? newLesson.attachedFile.previewUrl
                : undefined
          }
        : undefined
    };

    // 2. Immediate local state update for uploader (maintaining dataUrl in memory)
    setLessons((prev) => {
      const existingIndex = prev.findIndex((l) => l.id === newLesson.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newLesson;
        return updated;
      }
      return [newLesson, ...prev];
    });

    // 3. Instant cloud push: reaches all students at the exact moment of addition!
    try {
      const sanitizedCloudDoc = JSON.parse(JSON.stringify(cloudLesson));
      await setDoc(
        doc(db, 'lessons', newLesson.id),
        {
          ...sanitizedCloudDoc,
          isDeleted: false,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Firestore lesson save error:', err);
    }

    // 4. Upload file in safe chunks to Firestore & cache in IndexedDB
    if (hasFileData && attachedFileDataUrl) {
      uploadFileToCloud(fileId, attachedFileDataUrl).catch((err) => {
        console.error('Error uploading lesson file chunks:', err);
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const target = lessons.find((l) => l.id === lessonId);
    if (target && !canManageSubject(target.subjectId)) {
      return;
    }
    // 1. Permanently remember deleted ID in localStorage
    try {
      const storedDeleted = JSON.parse(safeGetItem('thanaweya_deleted_lesson_ids') || '[]');
      const updatedDeleted = Array.from(new Set([...storedDeleted, lessonId]));
      safeSetItem('thanaweya_deleted_lesson_ids', JSON.stringify(updatedDeleted));
    } catch (e) {
      console.warn(e);
    }

    // 2. Delete file chunks and local cache
    deleteFileFromCloud('lesson-file-' + lessonId).catch(console.warn);

    // 3. Immediate local state update
    setLessons((prev) => {
      const updated = prev.filter((l) => l.id !== lessonId);
      safeSetItem('thanaweya_lessons_v3', JSON.stringify(sanitizeLessonsForStorage(updated)));
      return updated;
    });

    // 4. Cloud Firestore deletion: persist tombstone so all connected devices know it is deleted
    try {
      await setDoc(doc(db, 'lessons', lessonId), { id: lessonId, isDeleted: true, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Firestore lesson delete error:', err);
    }
  };

  // Booklet actions
  const handleAddBooklet = async (newBooklet: Omit<SubjectBooklet, 'id' | 'createdAt'>) => {
    if (!canManageSubject(newBooklet.subjectId)) {
      return;
    }
    const bookletId = 'booklet-' + Date.now();
    const hasFileData = !!newBooklet.fileDataUrl;
    const fileDataUrl = newBooklet.fileDataUrl;

    // 0. Remove from local deleted IDs list if present
    try {
      const storedDeleted = JSON.parse(safeGetItem('thanaweya_deleted_booklet_ids') || '[]');
      if (Array.isArray(storedDeleted) && storedDeleted.includes(bookletId)) {
        const cleaned = storedDeleted.filter((id) => id !== bookletId);
        safeSetItem('thanaweya_deleted_booklet_ids', JSON.stringify(cleaned));
      }
    } catch (e) {
      console.warn(e);
    }

    // 1. Cloud-safe metadata document: strictly metadata (no bulky dataUrl)
    // Saves to Firestore in milliseconds (~50ms), triggering onSnapshot instantly on all student devices!
    const cloudBooklet: SubjectBooklet = {
      id: bookletId,
      subjectId: newBooklet.subjectId,
      title: newBooklet.title,
      pagesCount: newBooklet.pagesCount,
      description: newBooklet.description || '',
      fileName: newBooklet.fileName || `${newBooklet.title}.pdf`,
      supervisorName: newBooklet.supervisorName || 'مشرف المادة',
      hasFile: hasFileData,
      createdAt: new Date().toISOString().split('T')[0]
    };

    // 2. Immediate local state update for uploader (with fileDataUrl)
    const localBooklet: SubjectBooklet = {
      ...cloudBooklet,
      fileDataUrl
    };
    setBooklets((prev) => [localBooklet, ...prev]);

    // 3. Instant cloud push: arrives on all student devices at the exact moment of addition!
    try {
      const sanitizedCloudDoc = JSON.parse(JSON.stringify(cloudBooklet));
      await setDoc(
        doc(db, 'booklets', bookletId),
        {
          ...sanitizedCloudDoc,
          isDeleted: false,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Firestore booklet save error:', err);
    }

    // 4. Upload file in safe chunks to Firestore & store in IndexedDB
    if (fileDataUrl) {
      uploadFileToCloud(bookletId, fileDataUrl).catch((err) => {
        console.error('Error uploading booklet chunks:', err);
      });
    }
  };

  const handleDeleteBooklet = async (id: string) => {
    const target = booklets.find((b) => b.id === id);
    if (target && !canManageSubject(target.subjectId)) {
      return;
    }
    // 1. Permanently remember deleted ID in localStorage
    try {
      const storedDeleted = JSON.parse(safeGetItem('thanaweya_deleted_booklet_ids') || '[]');
      const updatedDeleted = Array.from(new Set([...storedDeleted, id]));
      safeSetItem('thanaweya_deleted_booklet_ids', JSON.stringify(updatedDeleted));
    } catch (e) {
      console.warn(e);
    }

    // 2. Delete file chunks and local cache
    deleteFileFromCloud(id).catch(console.warn);

    // 3. Immediate local state update
    setBooklets((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      safeSetItem('thanaweya_subject_booklets_v4', JSON.stringify(sanitizeBookletsForStorage(updated)));
      return updated;
    });

    // 4. Cloud Firestore deletion
    try {
      await setDoc(doc(db, 'booklets', id), { id, isDeleted: true, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Firestore booklet delete error:', err);
    }
  };

  // Homework actions
  const handleAddHomework = async (newHwData: Omit<Homework, 'id' | 'createdAt'>) => {
    if (!canManageSubject(newHwData.subjectId)) {
      return;
    }
    const hwId = 'hw-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const fileId = newHwData.solutionFile?.dataUrl ? 'hw-sol-' + hwId : undefined;
    const hasFileData = !!newHwData.solutionFile?.dataUrl;
    const solutionDataUrl = newHwData.solutionFile?.dataUrl;

    const cloudHw: Homework = {
      ...newHwData,
      id: hwId,
      createdAt: new Date().toISOString(),
      solutionFile: newHwData.solutionFile ? {
        name: newHwData.solutionFile.name || 'الحل_النموذجي.pdf',
        type: newHwData.solutionFile.type || 'pdf',
        size: newHwData.solutionFile.size || '1 MB',
        hasFile: true,
        fileId
      } : undefined
    };

    const localHw: Homework = {
      ...cloudHw,
      solutionFile: newHwData.solutionFile ? {
        ...cloudHw.solutionFile!,
        dataUrl: solutionDataUrl
      } : undefined
    };

    // Immediate local state update
    setHomeworks((prev) => [localHw, ...prev]);

    // Cloud Firestore save: pushes immediately to all students in real time
    try {
      const sanitized = JSON.parse(JSON.stringify(cloudHw));
      await setDoc(doc(db, 'homeworks', hwId), sanitized, { merge: true });
    } catch (err) {
      console.warn('Firestore homework save error:', err);
    }

    // Upload cloud chunks if solution PDF attached
    if (hasFileData && solutionDataUrl && fileId) {
      uploadFileToCloud(fileId, solutionDataUrl).catch((err) => {
        console.warn('Failed to upload homework solution PDF to cloud:', err);
      });
    }
  };

  // Edit / Update an existing published homework
  const handleUpdateHomework = async (updatedHw: Homework) => {
    if (!canManageSubject(updatedHw.subjectId)) {
      alert('ليس لديك صلاحية لتعديل واجبات هذه المادة');
      return;
    }

    const hasNewFileData = !!updatedHw.solutionFile?.dataUrl;
    const solutionDataUrl = updatedHw.solutionFile?.dataUrl;
    const fileId =
      updatedHw.solutionFile?.fileId ||
      (hasNewFileData ? 'hw-sol-' + updatedHw.id : undefined);

    const cloudHw: Homework = {
      ...updatedHw,
      solutionFile: updatedHw.solutionFile ? {
        name: updatedHw.solutionFile.name || 'الحل_النموذجي.pdf',
        type: updatedHw.solutionFile.type || 'pdf',
        size: updatedHw.solutionFile.size || '1 MB',
        hasFile: true,
        fileId
      } : undefined
    };

    const localHw: Homework = {
      ...cloudHw,
      solutionFile: updatedHw.solutionFile ? {
        ...cloudHw.solutionFile!,
        dataUrl: solutionDataUrl || updatedHw.solutionFile.dataUrl
      } : undefined
    };

    // Immediate local state update
    setHomeworks((prev) => {
      const updated = prev.map((h) => (h.id === updatedHw.id ? localHw : h));
      safeSetItem('thanaweya_homeworks_v2', JSON.stringify(updated));
      return updated;
    });

    // Cloud Firestore update
    try {
      const sanitized = JSON.parse(JSON.stringify(cloudHw));
      await setDoc(doc(db, 'homeworks', updatedHw.id), sanitized, { merge: true });
    } catch (err) {
      console.warn('Firestore homework update error:', err);
    }

    // Upload cloud chunks if new solution PDF attached
    if (hasNewFileData && solutionDataUrl && fileId) {
      uploadFileToCloud(fileId, solutionDataUrl).catch((err) => {
        console.warn('Failed to upload updated homework solution PDF to cloud:', err);
      });
    }
  };

  // Student Homework Solution Submission
  const handleSubmitHomeworkSolution = async (
    subData: Omit<HomeworkSubmission, 'id' | 'submittedAt'>
  ) => {
    const subId = 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    // Collect all attached files (supporting both multi-file array and single fallback)
    const rawFiles: AttachedFile[] = [];
    if (Array.isArray(subData.attachedFiles) && subData.attachedFiles.length > 0) {
      rawFiles.push(...subData.attachedFiles);
    } else if (subData.attachedFile && subData.attachedFile.hasFile) {
      rawFiles.push(subData.attachedFile);
    }

    // Prepare files with deterministic fileIds
    const cloudFiles: AttachedFile[] = rawFiles.map((f, idx) => {
      const defaultId = idx === 0 ? `sub-sol-${subId}` : `sub-sol-${subId}-${idx}`;
      const fileId = f.fileId || defaultId;
      return {
        name: f.name || `حل_الواجب_${idx + 1}.pdf`,
        type: f.type || 'pdf',
        size: f.size || '1 MB',
        hasFile: true,
        fileId
      };
    });

    const localFiles: AttachedFile[] = cloudFiles.map((cf, idx) => ({
      ...cf,
      dataUrl: rawFiles[idx]?.dataUrl
    }));

    const studentFullName = resolveStudentFullName(
      subData.studentEmail,
      subData.studentName,
      registeredUsers
    );

    const cloudSub: HomeworkSubmission = {
      ...subData,
      studentName: studentFullName,
      id: subId,
      submittedAt: new Date().toISOString(),
      attachedFile: cloudFiles[0] || undefined,
      attachedFiles: cloudFiles
    };

    const localSub: HomeworkSubmission = {
      ...cloudSub,
      attachedFile: localFiles[0] || undefined,
      attachedFiles: localFiles
    };

    // Replace previous submission if exists or add new
    setSubmissions((prev) => {
      const filtered = prev.filter(
        (s) =>
          !(
            s.homeworkId === subData.homeworkId &&
            s.studentEmail.toLowerCase() === subData.studentEmail.toLowerCase()
          )
      );
      return [localSub, ...filtered];
    });

    // Cloud Firestore metadata save
    try {
      const sanitized = JSON.parse(JSON.stringify(cloudSub));
      await setDoc(doc(db, 'homework_submissions', subId), sanitized, { merge: true });
    } catch (err) {
      console.warn('Firestore homework submission save error:', err);
    }

    // Upload cloud chunks for each file in parallel
    const uploadPromises = rawFiles.map((rf, idx) => {
      const fId = cloudFiles[idx]?.fileId;
      if (rf.dataUrl && fId) {
        return uploadFileToCloud(fId, rf.dataUrl);
      }
      return Promise.resolve(null);
    });

    try {
      await Promise.all(uploadPromises);
    } catch (uploadErr) {
      console.warn('Student submission files cloud upload note:', uploadErr);
    }

    // Also mark as completed in student's progress
    handleToggleCompleteHomework(subData.homeworkId);
  };

  // Student Homework Solution Deletion (for re-submission or cancellation)
  const handleDeleteSubmission = async (submissionId: string) => {
    // 1. Immediate local state update
    const target = submissions.find((s) => s.id === submissionId);
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));

    // 2. Cloud Firestore update
    try {
      await setDoc(
        doc(db, 'homework_submissions', submissionId),
        { id: submissionId, isDeleted: true, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore homework submission delete error:', err);
    }

    // 3. Clean up cloud chunks
    if (target) {
      const allFiles = target.attachedFiles && target.attachedFiles.length > 0
        ? target.attachedFiles
        : target.attachedFile ? [target.attachedFile] : [];
      allFiles.forEach((f) => {
        if (f.fileId) {
          deleteFileFromCloud(f.fileId).catch(() => {});
        }
      });
    }

    // 4. Untoggle completion status if it was completed
    if (target && progress.completedHomeworkIds?.includes(target.homeworkId)) {
      handleToggleCompleteHomework(target.homeworkId);
    }
  };

  const handleDeleteHomework = async (id: string) => {
    const target = homeworks.find((h) => h.id === id);
    const canDelete =
      isSuperAdmin ||
      user?.role === 'supervisor' ||
      user?.jobTitle === 'مشرف مساعد' ||
      !target ||
      canManageSubject(target.subjectId);

    if (!canDelete) {
      console.warn('Cannot delete homework: permission denied for subject', target?.subjectId);
      return;
    }

    // 1. Permanently remember deleted ID in localStorage
    try {
      const storedDeleted = JSON.parse(safeGetItem('thanaweya_deleted_hw_ids') || '[]');
      const updatedDeleted = Array.from(new Set([...storedDeleted, id]));
      safeSetItem('thanaweya_deleted_hw_ids', JSON.stringify(updatedDeleted));
    } catch (e) {
      console.warn(e);
    }

    // 2. Immediate local state update
    setHomeworks((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      safeSetItem('thanaweya_homeworks_v2', JSON.stringify(updated));
      return updated;
    });

    // 3. Cloud Firestore deletion: delete doc AND mark isDeleted
    try {
      await deleteDoc(doc(db, 'homeworks', id)).catch(() => {});
      await setDoc(doc(db, 'homeworks', id), { id, isDeleted: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    } catch (err) {
      console.warn('Firestore homework delete error:', err);
    }
  };

  const handleToggleCompleteHomework = (id: string) => {
    setProgress((prev) => {
      const current = prev.completedHomeworkIds || [];
      const updated = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      const newProgress = { ...prev, completedHomeworkIds: updated };
      safeSetItem(userStorageKey, JSON.stringify(newProgress));

      if (user?.email) {
        const safeEmail = user.email.toLowerCase().replace(/[.#$/[\]]/g, '_');
        setDoc(doc(db, 'user_progress', safeEmail), newProgress, { merge: true }).catch(console.error);
      }
      return newProgress;
    });
  };

  const openLessonDetail = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setIsDetailModalOpen(true);
  };

  const openAddLessonModal = (preselectedSubjectId?: string) => {
    setEditingLesson(null);
    if (preselectedSubjectId) {
      const s = subjects.find((sub) => sub.id === preselectedSubjectId);
      if (s) setSelectedSubject(s);
    }
    setIsAddLessonModalOpen(true);
  };

  const openEditLessonModal = (lesson: Lesson) => {
    if (!canManageSubject(lesson.subjectId)) return;
    setEditingLesson(lesson);
    setIsAddLessonModalOpen(true);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F8FAFC] text-slate-800 font-['Tajawal',sans-serif] flex justify-center selection:bg-blue-500 selection:text-white"
    >
      {/* Container: comfortably wider and scalable on iPad (md/lg) and Desktop (xl/2xl) */}
      <div className="w-full max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-[1380px] bg-[#F8FAFC] min-h-screen flex flex-col shadow-xl pb-24 md:pb-28 relative transition-all">
        {/* Top Header - with greeting & small logout button */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 space-y-4 md:space-y-6 lg:space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={(isNotFound ? '404' : activeTab) + (selectedSubject ? `-${selectedSubject.id}-${selectedSubView || 'root'}` : '')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {/* 404 Not Found Page */}
              {isNotFound ? (
                <NotFoundView
                  attemptedPath={attemptedPath}
                  subjects={safeSubjects}
                  onGoHome={() => {
                    setIsNotFound(false);
                    setActiveTab('home');
                    setSelectedSubject(null);
                    setSelectedSubView(null);
                    setIsDetailModalOpen(false);
                    syncBrowserUrl('/');
                  }}
                  onSelectSubject={(sub) => {
                    if (sub.isComingSoon) return;
                    setIsNotFound(false);
                    setActiveTab('home');
                    setSelectedSubject(sub);
                    setSelectedSemester(sub.semester);
                    setSelectedSubView(null);
                    setIsDetailModalOpen(false);
                  }}
                />
              ) : activeTab === 'qudurat' ? (
                /* TAB: Qudurat (القدرات - يتطلب تسجيل دخول وقريباً) */
                !user ? (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs text-center space-y-4 max-w-md mx-auto my-6">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-black text-slate-900">تسجيل الدخول مطلوب</h3>
                      <p className="text-xs text-slate-500">يجب تسجيل الدخول بحساب Google للوصول إلى قسم القدرات.</p>
                    </div>
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>تسجيل الدخول بواسطة Google</span>
                    </button>
                  </div>
                ) : (
                  <QuduratView />
                )
              ) : activeTab === 'homeworks' ? (
                /* TAB: Daily Homeworks (الواجبات المدرسية اليومية - يتطلب تسجيل دخول) */
                !user ? (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs text-center space-y-4 max-w-md mx-auto my-6">
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-100">
                      <ClipboardCheck className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-black text-slate-900">تسجيل الدخول مطلوب</h3>
                      <p className="text-xs text-slate-500">يجب تسجيل الدخول بحساب Google للوصول إلى الواجبات المدرسية ومتابعة الحلول.</p>
                    </div>
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>تسجيل الدخول بواسطة Google</span>
                    </button>
                  </div>
                ) : (
                  <DailyHomeworksView
                    allSubjects={subjects}
                    homeworks={homeworks}
                    onAddHomework={handleAddHomework}
                    onUpdateHomework={handleUpdateHomework}
                    onDeleteHomework={handleDeleteHomework}
                    completedHomeworkIds={progress.completedHomeworkIds}
                    onToggleCompleteHomework={handleToggleCompleteHomework}
                    submissions={submissions}
                    onSubmitSolution={handleSubmitHomeworkSolution}
                    onDeleteSubmission={handleDeleteSubmission}
                  />
                )
              ) : activeTab === 'students' ? (
                /* TAB: Students (للمعلمين فقط) */
                <StudentsManagementView
                  allLessons={safeLessons}
                  allSubjects={subjects}
                  allHomeworks={homeworks}
                  allSubmissions={submissions}
                  onSelectLesson={openLessonDetail}
                />
              ) : activeTab === 'admin' ? (
                /* TAB: Secret Admin Portal (/admin) */
                <AdminPortalView
                  subjects={subjects}
                  lessons={safeLessons}
                  booklets={booklets}
                  homeworks={homeworks}
                  submissions={submissions}
                  onNavigateHome={() => {
                    setActiveTab('home');
                    setSelectedSubject(null);
                    setSelectedSubView(null);
                    syncBrowserUrl('/');
                  }}
                  onSelectLesson={openLessonDetail}
                />
              ) : activeTab === 'users' ? (
                /* TAB: User Management (للإشراف والإدارة فقط) */
                <UserManagementView />
              ) : (
                /* TAB: Home (الرئيسية) */
                <div className="space-y-4 md:space-y-6">
                  {selectedSubject ? (
                    /* Inside a Subject: Shows selectable options (Lessons vs Booklets vs Homeworks) */
                    <SubjectDetailView
                      subject={selectedSubject}
                      lessons={safeLessons}
                      booklets={booklets}
                      initialSubView={selectedSubView}
                      onSubViewChange={(newSubView) => setSelectedSubView(newSubView)}
                      onBack={() => {
                        setSelectedSubject(null);
                        setSelectedSubView(null);
                      }}
                      onSelectLesson={openLessonDetail}
                      onToggleComplete={handleToggleComplete}
                      onOpenAddLesson={() => openAddLessonModal(selectedSubject.id)}
                      onOpenEditLesson={openEditLessonModal}
                      onDeleteLesson={handleDeleteLesson}
                      onAddBooklet={handleAddBooklet}
                      onDeleteBooklet={handleDeleteBooklet}
                      homeworks={homeworks}
                      onAddHomework={handleAddHomework}
                      onUpdateHomework={handleUpdateHomework}
                      onDeleteHomework={handleDeleteHomework}
                      completedLessonIds={progress.completedLessonIds}
                      completedHomeworkIds={progress.completedHomeworkIds}
                      onToggleCompleteHomework={handleToggleCompleteHomework}
                      submissions={submissions}
                      onSubmitHomeworkSolution={handleSubmitHomeworkSolution}
                      onDeleteSubmission={handleDeleteSubmission}
                    />
                  ) : (
                    /* All Subjects Grid */
                    <div className="space-y-3.5 md:space-y-5">
                      {/* Search Bar */}
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="ابحث عن درس أو مادة..."
                          className="w-full py-2.5 md:py-3.5 pr-10 md:pr-12 pl-4 bg-white border border-slate-200/90 rounded-2xl text-xs md:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                        <Search className="w-4 h-4 md:w-5 md:h-5 text-slate-400 absolute right-3.5 md:right-4 top-3 md:top-3.5" />
                      </div>

                      {/* 2-Column Responsive Subject Grid */}
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 w-full">
                        {displayedSubjects.map((sub) => (
                          <SubjectCard
                            key={sub.id}
                            subject={sub}
                            isSelected={selectedSubject?.id === sub.id}
                            onSelect={(s) => {
                              if (s.isComingSoon) return;
                              setSelectedSubject(s);
                              setSelectedSubView(null);
                            }}
                          />
                        ))}
                      </div>

                      {displayedSubjects.length === 0 && (
                        <div className="text-center py-12 md:py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                          <p className="text-xs md:text-sm text-slate-400">لا توجد مواد مطابقة للبحث حالياً</p>
                        </div>
                      )}

                      {/* App Version Tag */}
                      <div className="text-center pt-2 pb-6">
                        <span className="inline-block text-[11px] sm:text-xs font-medium text-slate-400/90 tracking-wide">
                          النسخة 1.2
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation (Hidden on Secret Admin Portal) */}
        {activeTab !== 'admin' && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={(tab) => {
              setIsNotFound(false);
              setSelectedSubject(null);
              setSelectedSubView(null);
              setIsDetailModalOpen(false);
              setActiveTab(tab);
            }}
          />
        )}

        {/* Lesson Detail Modal */}
        {isDetailModalOpen && activeLesson && (
          <LessonDetailModal
            lesson={activeLesson}
            subject={subjects.find((s) => s.id === activeLesson.subjectId)}
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            isCompleted={progress.completedLessonIds.includes(activeLesson.id)}
            onToggleComplete={handleToggleComplete}
          />
        )}

        {/* Add/Edit Lesson Modal (Supervisor) */}
        {isAddLessonModalOpen && (
          <AddLessonModal
            isOpen={isAddLessonModalOpen}
            onClose={() => setIsAddLessonModalOpen(false)}
            onSaveLesson={handleSaveLesson}
            subjects={subjects}
            editingLesson={editingLesson}
            defaultSubjectId={selectedSubject?.id}
          />
        )}

        {/* Auth / Account Profile Modal */}
        <AuthModal />

        {/* Mandatory Full Name Enforcement Modal */}
        <FullNameRequiredModal />

        {/* Notifications Modal */}
        <NotificationsModal />

        {/* Supervisor Platform Controls Drawer */}
        <SupervisorSettingsDrawer subjects={subjects} />
      </div>
    </div>
  );
}
