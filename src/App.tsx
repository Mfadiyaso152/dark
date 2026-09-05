import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Subject, Lesson, UserProgress, SubjectBooklet } from './types';
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
import { BottomNav, TabType } from './components/BottomNav';
import { useAuth } from './context/AuthContext';
import { db, doc, setDoc, getDoc } from './lib/firebase';

export default function App() {
  const { user } = useAuth() as any;
  const isSupervisorRole = user?.role === 'supervisor';

  const [subjects] = useState<Subject[]>(INITIAL_SUBJECTS);

  // Lessons: Always ensure all authentic curriculum lessons are present
  const [lessons, setLessons] = useState<Lesson[]>(() => {
    try {
      const saved = localStorage.getItem('thanaweya_lessons_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_LESSONS.length) {
          return parsed;
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
      const saved = localStorage.getItem('thanaweya_subject_booklets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_BOOKLETS;
  });

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
      const saved = localStorage.getItem(key);
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
      const saved = localStorage.getItem(userStorageKey);
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

  // Sync progress
  useEffect(() => {
    if (userStorageKey && progress && Array.isArray(progress.completedLessonIds)) {
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(progress));
      } catch (e) {
        console.error('Failed to sync progress:', e);
      }

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

  // Sync lessons to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('thanaweya_lessons_v2', JSON.stringify(lessons));
    } catch (e) {
      console.error(e);
    }
  }, [lessons]);

  // Active view filters
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Modals
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Safe checks
  const safeLessons = Array.isArray(lessons) ? lessons : [];
  const safeSubjects = Array.isArray(subjects) ? subjects : [];

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

  const handleSaveLesson = (newLesson: Lesson) => {
    setLessons((prev) => {
      const existingIndex = prev.findIndex((l) => l.id === newLesson.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newLesson;
        return updated;
      }
      return [newLesson, ...prev];
    });
  };

  const handleDeleteLesson = (lessonId: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  // Booklet actions
  const handleAddBooklet = (newBooklet: Omit<SubjectBooklet, 'id' | 'createdAt'>) => {
    const b: SubjectBooklet = {
      ...newBooklet,
      id: 'booklet-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setBooklets((prev) => {
      const updated = [b, ...prev];
      try {
        localStorage.setItem('thanaweya_subject_booklets', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleDeleteBooklet = (id: string) => {
    setBooklets((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      try {
        localStorage.setItem('thanaweya_subject_booklets', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
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
      <div className="w-full max-w-2xl bg-[#F8FAFC] min-h-screen flex flex-col shadow-xl pb-24 relative">
        {/* Top Header - with greeting & small logout button */}
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-5 space-y-4">
          {/* TAB: Qudurat (القدرات - قريباً) */}
          {activeTab === 'qudurat' ? (
            <QuduratView />
          ) : activeTab === 'users' && isSupervisorRole ? (
            /* TAB: User Management */
            <UserManagementView />
          ) : activeTab === 'saved' ? (
            /* TAB: Saved Lessons (المحفوظات) */
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-black text-[#1E293B] text-base">
                  الدروس المحفوظة ({filteredLessons.length})
                </h3>
              </div>

              {filteredLessons.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredLessons.map((lesson) => {
                    const subject = subjects.find((s) => s.id === lesson.subjectId);
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
                        onEdit={isSupervisorRole ? openEditLessonModal : undefined}
                        onDelete={isSupervisorRole ? handleDeleteLesson : undefined}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 px-4 bg-white rounded-3xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">لا توجد دروس محفوظة حالياً بحسابك</p>
                </div>
              )}
            </div>
          ) : (
            /* TAB: Home (الرئيسية) */
            <div className="space-y-4">
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
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث عن درس أو مادة..."
                      className="w-full py-2.5 pr-10 pl-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] shadow-xs"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>

                  {/* 2-Column Subject Grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    {safeSubjects.map((sub) => {
                      const subjectLessons = safeLessons.filter((l) => l.subjectId === sub.id);
                      return (
                        <SubjectCard
                          key={sub.id}
                          subject={sub}
                          lessons={safeLessons}
                          lessonsCount={subjectLessons.length}
                          isSelected={selectedSubject?.id === sub.id}
                          onSelect={(s) => setSelectedSubject(s)}
                        />
                      );
                    })}
                  </div>
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
