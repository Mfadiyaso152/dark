import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SubjectControlsMap, SubjectFeatureControl } from '../types';
import { db, doc, onSnapshot, setDoc } from '../lib/firebase';

interface SubjectControlsContextType {
  controls: SubjectControlsMap;
  updateSubjectControl: (subjectId: string, updates: Partial<SubjectFeatureControl>) => Promise<void>;
  isSubjectPaused: (subjectId: string) => boolean;
  isLessonsPaused: (subjectId: string) => boolean;
  isBookletsPaused: (subjectId: string) => boolean;
  isHomeworksPaused: (subjectId: string) => boolean;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setIsSettingsOpen: (open: boolean) => void;
}

const SubjectControlsContext = createContext<SubjectControlsContextType | undefined>(undefined);

const STORAGE_KEY = 'thanaweya_subjects_controls_v1';

const getInitialControls = (): SubjectControlsMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load local subject controls:', e);
  }
  return {};
};

export const SubjectControlsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [controls, setControls] = useState<SubjectControlsMap>(getInitialControls);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync with Firestore in real-time
  useEffect(() => {
    try {
      const docRef = doc(db, 'system_settings', 'subjects_control');
      const unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as SubjectControlsMap;
          if (data && typeof data === 'object') {
            setControls(data);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (e) {
              console.warn('Failed to save to localStorage:', e);
            }
          }
        }
      }, (err) => {
        console.warn('Subject controls firestore sync fallback to local:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore listener error for subject controls:', e);
    }
  }, []);

  const updateSubjectControl = useCallback(
    async (subjectId: string, updates: Partial<SubjectFeatureControl>) => {
      const prevControl = controls[subjectId] || {};
      const newControl: SubjectFeatureControl = {
        ...prevControl,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const newControls: SubjectControlsMap = {
        ...controls,
        [subjectId]: newControl
      };

      // 1. Immediate local update
      setControls(newControls);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newControls));
      } catch (e) {
        console.warn('Failed to cache subject controls:', e);
      }

      // 2. Persistent Firestore update
      try {
        const docRef = doc(db, 'system_settings', 'subjects_control');
        await setDoc(docRef, newControls, { merge: true });
      } catch (err) {
        console.error('Failed to sync subject control to Firestore:', err);
      }
    },
    [controls]
  );

  const isSubjectPaused = useCallback(
    (subjectId: string): boolean => {
      return !!controls[subjectId]?.isPaused;
    },
    [controls]
  );

  const isLessonsPaused = useCallback(
    (subjectId: string): boolean => {
      if (controls[subjectId]?.isPaused) return true;
      return !!controls[subjectId]?.lessonsDisabled;
    },
    [controls]
  );

  const isBookletsPaused = useCallback(
    (subjectId: string): boolean => {
      if (controls[subjectId]?.isPaused) return true;
      return !!controls[subjectId]?.bookletsDisabled;
    },
    [controls]
  );

  const isHomeworksPaused = useCallback(
    (subjectId: string): boolean => {
      if (controls[subjectId]?.isPaused) return true;
      return !!controls[subjectId]?.homeworksDisabled;
    },
    [controls]
  );

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  return (
    <SubjectControlsContext.Provider
      value={{
        controls,
        updateSubjectControl,
        isSubjectPaused,
        isLessonsPaused,
        isBookletsPaused,
        isHomeworksPaused,
        isSettingsOpen,
        openSettings,
        closeSettings,
        setIsSettingsOpen
      }}
    >
      {children}
    </SubjectControlsContext.Provider>
  );
};

export const useSubjectControls = (): SubjectControlsContextType => {
  const context = useContext(SubjectControlsContext);
  if (!context) {
    throw new Error('useSubjectControls must be used within a SubjectControlsProvider');
  }
  return context;
};
