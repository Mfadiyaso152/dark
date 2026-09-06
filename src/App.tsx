import React, { useState, useEffect, useMemo } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { Subject, Lesson, UserProgress, SubjectBooklet, Semester } from './types';
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
import { QuduratView } from './components/QuduratView';
import { SemesterCountdown } from './components/SemesterCountdown';
import { BottomNav, TabType } from './components/BottomNav';
import { useAuth } from './context/AuthContext';
import { db, doc, setDoc, getDoc, collection, onSnapshot, deleteDoc } from './lib/firebase';
import {
  safeSetItem,
  safeGetItem,
  sanitizeLessonsForStorage,
  sanitizeBookletsForStorage,
  sanitizeExistingLocalStorage
} from './utils/storage';
import { storeLargeFile, deleteLargeFile } from './utils/fileStorage';

export default function App() {
  const { user, isSuperAdmin, canAddContent, canManageSubject } = useAuth();
  const isSupervisorRole = canAddContent;

  // Run startup hygiene to clean any bloated keys causing QuotaExceededError
  useEffect(() => {
    sanitizeExistingLocalStorage();
  }, []);

  const [subjects] = useState<Subject[]>(INITIAL_SUBJECTS);

  // Lessons: Always ensure all authentic curriculum lessons are present
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    try {
      const saved = safeGetItem('thanaweya_lessons_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_LESSONS.length) {
          const hasVoc = parsed.some((l) => l.subjectId === 'voc-1');
          if (!hasVoc) return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LESSONS;
  });

  // Booklets (مذكرات وملخصات)
  const [booklets, setBooklets] = useState<SubjectBooklet[]>(() => {
    try {
      const saved = safeGetItem('thanaweya_subject_booklets_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_BOOKLETS;
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

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isDeleted) {
          deletedIds.add(data.id || docSnap.id);
        } else if (data.id && data.title && data.subjectId) {
          cloudLessons.push(data as Lesson);
        }
      });

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
        if (
          parsed &&
          Array.isArray(parsed.completedLessonIds) &&
          Array.isArray(parsed.bookmarkedLessonIds)
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return {
      completedLessonIds: [],
      bookmarkedLessonIds: []
    };
  });

  // Load progress when user changes
  useEffect(() => {
    if (!user) return;

    try {
      const saved = safeGetItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          Array.isArray(parsed.completedLessonIds) &&
          Array.isArray(parsed.bookmarkedLessonIds)
        ) {
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
            if (data && Array.isArray(data.completedLessonIds) && Array.isArray(data.bookmarkedLessonIds)) {
              setProgress({
                completedLessonIds: data.completedLessonIds,
                bookmarkedLessonIds: data.bookmarkedLessonIds
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
            bookmarkedLessonIds: progress.bookmarkedLessonIds,
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

  // Filtered lessons for saved tab or search
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

    if (activeTab === 'saved') {
      result = safeLessons.filter((l) => progress.bookmarkedLessonIds.includes(l.id));
    }

    return result;
  }, [safeLessons, selectedSubject, searchQuery, activeTab, progress.bookmarkedLessonIds]);

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

  const handleToggleBookmark = (lessonId: string) => {
    setProgress((prev) => {
      const isBookmarked = prev.bookmarkedLessonIds.includes(lessonId);
      return {
        ...prev,
        bookmarkedLessonIds: isBookmarked
          ? prev.bookmarkedLessonIds.filter((id) => id !== lessonId)
          : [...prev.bookmarkedLessonIds, lessonId]
      };
    });
  };

  const handleSaveLesson = async (newLesson: Lesson) => {
    if (!canManageSubject(newLesson.subjectId)) {
      return;
    }

    // If attached file exists, store in IndexedDB to avoid quota issues
    if (newLesson.attachedFile?.dataUrl) {
      await storeLargeFile('lesson-file-' + newLesson.id, newLesson.attachedFile.dataUrl);
    }

    setLessons((prev) => {
      const existingIndex = prev.findIndex((l) => l.id === newLesson.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newLesson;
        return updated;
      }
      return [newLesson, ...prev];
    });

    // Cloud Firestore save: pushes immediately to all other users in real time
    try {
      await setDoc(doc(db, 'lessons', newLesson.id), newLesson, { merge: true });
    } catch (err) {
      console.warn('Firestore lesson save error:', err);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const target = lessons.find((l) => l.id === lessonId);
    if (target && !canManageSubject(target.subjectId)) {
      return;
    }
    // Delete file from IndexedDB
    deleteLargeFile('lesson-file-' + lessonId);

    // Immediate local state update
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));

    // Cloud Firestore deletion: marks deleted & deletes doc so all clients update instantly
    try {
      await setDoc(doc(db, 'lessons', lessonId), { id: lessonId, isDeleted: true }, { merge: true });
      await deleteDoc(doc(db, 'lessons', lessonId));
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
    const b: SubjectBooklet = {
      ...newBooklet,
      id: bookletId,
      createdAt: new Date().toISOString().split('T')[0]
    };

    // Store PDF in IndexedDB
    if (b.fileDataUrl) {
      await storeLargeFile(bookletId, b.fileDataUrl);
    }

    // Immediate local state update
    setBooklets((prev) => [b, ...prev]);

    // Cloud Firestore save: pushes immediately to all students in real time
    try {
      await setDoc(doc(db, 'booklets', bookletId), b, { merge: true });
    } catch (err) {
      console.warn('Firestore booklet save error:', err);
    }
  };

  const handleDeleteBooklet = async (id: string) => {
    const target = booklets.find((b) => b.id === id);
    if (target && !canManageSubject(target.subjectId)) {
      return;
    }
    deleteLargeFile(id);

    // Immediate local state update
    setBooklets((prev) => prev.filter((b) => b.id !== id));

    // Cloud Firestore deletion: marks deleted & deletes doc
    try {
      await setDoc(doc(db, 'booklets', id), { id, isDeleted: true }, { merge: true });
      await deleteDoc(doc(db, 'booklets', id));
    } catch (err) {
      console.warn('Firestore booklet delete error:', err);
    }
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
          ) : activeTab === 'users' && isSuperAdmin ? (
            /* TAB: User Management */
            <UserManagementView />
          ) : activeTab === 'saved' ? (
            /* TAB: Saved Lessons (المحفوظات) */
            <div className="space-y-3 md:space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-black text-[#1E293B] text-base md:text-lg">
                  الدروس المحفوظة ({filteredLessons.length})
                </h3>
              </div>

              {filteredLessons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4">
                  {filteredLessons.map((lesson) => {
                    const subject = subjects.find((s) => s.id === lesson.subjectId);
                    const canEditThis = canManageSubject(lesson.subjectId);
                    return (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        subject={subject}
                        isCompleted={progress.completedLessonIds.includes(lesson.id)}
                        isBookmarked={progress.bookmarkedLessonIds.includes(lesson.id)}
                        onSelect={openLessonDetail}
                        onToggleComplete={handleToggleComplete}
                        onToggleBookmark={handleToggleBookmark}
                        onEdit={canEditThis ? openEditLessonModal : undefined}
                        onDelete={canEditThis ? handleDeleteLesson : undefined}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 md:py-16 px-4 bg-white rounded-3xl border border-dashed border-slate-200">
                  <p className="text-xs md:text-sm text-slate-400">لا توجد دروس محفوظة حالياً بحسابك</p>
                </div>
              )}
            </div>
          ) : (
            /* TAB: Home (الرئيسية) */
            <div className="space-y-4 md:space-y-6">
              {selectedSubject ? (
                /* Inside a Subject: Shows two selectable options (Lessons vs Booklets) */
                <SubjectDetailView
                  subject={selectedSubject}
                  lessons={safeLessons}
                  booklets={booklets}
                  onBack={() => setSelectedSubject(null)}
                  onSelectLesson={openLessonDetail}
                  onToggleComplete={handleToggleComplete}
                  onToggleBookmark={handleToggleBookmark}
                  onOpenAddLesson={() => openAddLessonModal(selectedSubject.id)}
                  onOpenEditLesson={openEditLessonModal}
                  onDeleteLesson={handleDeleteLesson}
                  onAddBooklet={handleAddBooklet}
                  onDeleteBooklet={handleDeleteBooklet}
                  completedLessonIds={progress.completedLessonIds}
                  bookmarkedLessonIds={progress.bookmarkedLessonIds}
                />
              ) : (
                /* All Subjects Grid */
                <div className="space-y-3.5 md:space-y-5">
                  {/* Countdown Timer (العداد الزمني) - Displayed ONLY in P2 as requested */}
                  {selectedSemester === 2 && <SemesterCountdown />}

                  {/* Semester Switcher: P1 vs P2 */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSemester(1);
                        setSelectedSubject(null);
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        selectedSemester === 1
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className={`px-2 py-0.5 text-[10px] md:text-xs rounded-md font-black ${selectedSemester === 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>P1</span>
                      <span>بارت 1 (الفصل الأول)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSemester(2);
                        setSelectedSubject(null);
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                        selectedSemester === 2
                          ? 'bg-white text-purple-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className={`px-2 py-0.5 text-[10px] md:text-xs rounded-md font-black ${selectedSemester === 2 ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>P2</span>
                      <span>بارت 2 (الفصل الثاني)</span>
                    </button>
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

                  {/* Responsive Subject Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5 lg:gap-6">
                    {displayedSubjects.map((sub) => {
                      const subjectLessons = safeLessons.filter((l) => l.subjectId === sub.id);
                      return (
                        <SubjectCard
                          key={sub.id}
                          subject={sub}
                          lessons={safeLessons}
                          lessonsCount={subjectLessons.length}
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
          savedCount={progress.bookmarkedLessonIds.length}
        />

        {/* Lesson Detail Modal */}
        {isDetailModalOpen && activeLesson && (
          <LessonDetailModal
            lesson={activeLesson}
            subject={subjects.find((s) => s.id === activeLesson.subjectId)}
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            isCompleted={progress.completedLessonIds.includes(activeLesson.id)}
            isBookmarked={progress.bookmarkedLessonIds.includes(activeLesson.id)}
            onToggleComplete={handleToggleComplete}
            onToggleBookmark={handleToggleBookmark}
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
