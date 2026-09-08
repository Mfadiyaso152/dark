import React, { useState, useEffect, useMemo } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { Subject, Lesson, UserProgress, SubjectBooklet, Semester, Homework, HomeworkSubmission } from './types';
import { INITIAL_SUBJECTS, INITIAL_LESSONS, INITIAL_BOOKLETS } from './data/initialData';
import { Header } from './components/Header';
import { SubjectCard } from './components/SubjectCard';
import { SubjectDetailView } from './components/SubjectDetailView';
import { LessonCard } from './components/LessonCard';
import { LessonDetailModal } from './components/LessonDetailModal';
import { AddLessonModal } from './components/AddLessonModal';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { UserManagementView } from './components/UserManagementView';
import { StudentsManagementView } from './components/StudentsManagementView';
import { StudentServiceView } from './components/StudentServiceView';
import { QuduratView } from './components/QuduratView';
import { AdminNotificationsView } from './components/AdminNotificationsView';
import { BottomNav, TabType } from './components/BottomNav';
import { useAuth } from './context/AuthContext';
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
  const { user, isSuperAdmin, isAssistantAdmin, canAddContent, canManageSubject } = useAuth();
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
      const saved = safeGetItem('thanaweya_homeworks_v1');
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
    safeSetItem('thanaweya_homeworks_v1', JSON.stringify(homeworks));
  }, [homeworks]);

  // Real-time Firestore sync for Homeworks across all users (instant cloud sync)
  useEffect(() => {
    const hwCol = collection(db, 'homeworks');
    const unsubscribe = onSnapshot(hwCol, (snapshot) => {
      const cloudHws: Homework[] = [];
      const deletedIds = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isDeleted) {
          deletedIds.add(data.id || docSnap.id);
        } else if (data.id && data.subjectId && data.dueDate) {
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
            map.set(ch.id, ch);
          }
        });
        const merged = Array.from(map.values());
        safeSetItem('thanaweya_homeworks_v1', JSON.stringify(merged));
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
        cloudSubs.forEach((cs) => map.set(cs.id, cs));
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Guard against opening a coming-soon subject
  useEffect(() => {
    if (selectedSubject?.isComingSoon) {
      setSelectedSubject(null);
    }
  }, [selectedSubject]);

  // Modals
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Safe checks
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const safeSubjects = Array.isArray(subjects) ? subjects : [];

  // Filtered subjects based on selected semester (P1 / P2) and search query
  const displayedSubjects = useMemo(() => {
    let result = safeSubjects.filter((s) => s.semester === selectedSemester);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [safeSubjects, selectedSemester, searchQuery]);

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
    const fileId = subData.attachedFile?.dataUrl ? 'sub-sol-' + subId : undefined;
    const hasFileData = !!subData.attachedFile?.dataUrl;
    const attachedDataUrl = subData.attachedFile?.dataUrl;

    const cloudSub: HomeworkSubmission = {
      ...subData,
      id: subId,
      submittedAt: new Date().toISOString(),
      attachedFile: subData.attachedFile ? {
        name: subData.attachedFile.name || 'حل_الواجب.pdf',
        type: subData.attachedFile.type || 'pdf',
        size: subData.attachedFile.size || '1 MB',
        hasFile: true,
        fileId
      } : undefined
    };

    const localSub: HomeworkSubmission = {
      ...cloudSub,
      attachedFile: subData.attachedFile ? {
        ...cloudSub.attachedFile!,
        dataUrl: attachedDataUrl
      } : undefined
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

    // Cloud Firestore save
    try {
      const sanitized = JSON.parse(JSON.stringify(cloudSub));
      await setDoc(doc(db, 'homework_submissions', subId), sanitized, { merge: true });
    } catch (err) {
      console.warn('Firestore homework submission save error:', err);
    }

    // Upload cloud chunks if PDF attached
    if (hasFileData && attachedDataUrl && fileId) {
      uploadFileToCloud(fileId, attachedDataUrl).catch((err) => {
        console.warn('Failed to upload student solution PDF to cloud:', err);
      });
    }

    // Also mark as completed in student's progress
    handleToggleCompleteHomework(subData.homeworkId);
  };

  const handleDeleteHomework = async (id: string) => {
    const target = homeworks.find((h) => h.id === id);
    if (target && !canManageSubject(target.subjectId)) {
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

    // 3. Cloud Firestore deletion
    try {
      await setDoc(doc(db, 'homeworks', id), { id, isDeleted: true, updatedAt: new Date().toISOString() }, { merge: true });
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

  // If user is not authenticated, show Login Page
  if (!user) {
    return <LoginPage />;
  }

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
          {/* TAB: Qudurat (القدرات - قريباً) */}
          {activeTab === 'qudurat' ? (
            <QuduratView />
          ) : activeTab === 'notifications' ? (
            /* TAB: Administrative Notifications (الإشعارات الإدارية - قريباً) */
            <AdminNotificationsView />
          ) : activeTab === 'users' ? (
            isSuperAdmin ? (
              /* TAB: User Management (الإدارة - إدارة المستخدمين وتعيين المعلمين والصلاحيات زي قبل) */
              <UserManagementView />
            ) : isAssistantAdmin || canAddContent || (user && user.jobTitle !== 'طالب') ? (
              /* TAB: Students Management (المعلمين والمشرف المساعد - استعراض الطلاب والواجبات) */
              <StudentsManagementView
                allLessons={safeLessons}
                allSubjects={subjects}
                allHomeworks={homeworks}
                allSubmissions={submissions}
                onSelectLesson={openLessonDetail}
              />
            ) : (
              /* TAB: Student Service for regular students (خدمة الطلاب - تجريبية وإطلاق 10 سبتمبر) */
              <StudentServiceView />
            )
          ) : (
            /* TAB: Home (الرئيسية) */
            <div className="space-y-4 md:space-y-6">
              {selectedSubject ? (
                /* Inside a Subject: Shows selectable options (Lessons vs Booklets vs Homeworks) */
                <SubjectDetailView
                  subject={selectedSubject}
                  lessons={safeLessons}
                  booklets={booklets}
                  onBack={() => setSelectedSubject(null)}
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
                />
              ) : (
                /* All Subjects Grid */
                <div className="space-y-3.5 md:space-y-5">
                  {/* Semester Switcher: P1 & P2 only */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => {
                        setSelectedSemester(1);
                        setSelectedSubject(null);
                      }}
                      className={`py-2.5 px-4 rounded-xl text-sm md:text-base font-black transition flex items-center justify-center cursor-pointer ${
                        selectedSemester === 1
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      P1
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => {
                        setSelectedSemester(2);
                        setSelectedSubject(null);
                      }}
                      className={`py-2.5 px-4 rounded-xl text-sm md:text-base font-black transition flex items-center justify-center cursor-pointer ${
                        selectedSemester === 2
                          ? 'bg-white text-purple-600 shadow-sm border border-slate-200/60'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      P2
                    </motion.button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث عن درس أو مادة..."
                      className="w-full py-2.5 md:py-3.5 pr-10 md:pr-12 pl-4 bg-white border border-slate-200 rounded-2xl text-xs md:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] shadow-xs"
                    />
                    <Search className="w-4 h-4 md:w-5 md:h-5 text-slate-400 absolute right-3.5 md:right-4 top-3 md:top-3.5" />
                  </div>

                  {/* Responsive Subject List (Rectangular & Stacked) */}
                  <div className="flex flex-col gap-3 md:gap-3.5 w-full">
                    {displayedSubjects.map((sub) => {
                      const subjectLessons = safeLessons.filter((l) => l.subjectId === sub.id);
                      const subjectHomeworks = homeworks.filter((h) => h.subjectId === sub.id);
                      const subjectBooklets = booklets.filter((b) => b.subjectId === sub.id);
                      return (
                        <SubjectCard
                          key={sub.id}
                          subject={sub}
                          lessons={safeLessons}
                          lessonsCount={subjectLessons.length}
                          homeworksCount={subjectHomeworks.length}
                          bookletsCount={subjectBooklets.length}
                          isSelected={selectedSubject?.id === sub.id}
                          onSelect={(s) => {
                            if (s.isComingSoon) return;
                            setSelectedSubject(s);
                          }}
                        />
                      );
                    })}
                  </div>

                  {displayedSubjects.length === 0 && (
                    <div className="text-center py-12 md:py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                      <p className="text-xs md:text-sm text-slate-400">لا توجد مواد مطابقة للبحث حالياً</p>
                    </div>
                  )}

                  {/* WhatsApp Group Direct Button - Located under subjects as requested */}
                  <a
                    id="whatsapp-home-btn"
                    href="https://chat.whatsapp.com/E8lRfoLDghq3syUGzeBfl7?s=cl&p=i&mlu=4&ilr=4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 md:py-3.5 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-2xl font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                    <span>الدخول لقروب الواتساب</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
          }}
        />

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
      </div>
    </div>
  );
}
