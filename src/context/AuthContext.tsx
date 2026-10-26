import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, USER_JOB_OPTIONS } from '../types';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../utils/storage';
import {
  auth,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  getDocs,
  FirebaseUser
} from '../lib/firebase';

export const SUPER_ADMIN_EMAIL = 'mfb.15.f@gmail.com';

export const SUPER_ADMIN_USER: User = {
  id: 'admin-super-01',
  name: 'محمد فيصل',
  email: SUPER_ADMIN_EMAIL,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'supervisor',
  jobTitle: 'المشرف الأساسي',
  grade: 'أول ثانوي',
  isSuperAdmin: true,
  isAssistantAdmin: false,
  joinedAt: '2026-08-15',
  lastLogin: new Date().toISOString()
};

export const ALNOFAL_EMAIL = 'alnofal.2026108@gmail.com';

export const ALNOFAL_USER: User = {
  id: 'user-alnofal-eng',
  name: 'أ. النوفل (معلم لغة إنجليزية)',
  email: 'Alnofal.2026108@gmail.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alnofal',
  role: 'teacher',
  jobTitle: 'أ. لغة إنجليزية',
  grade: 'أول ثانوي',
  isSuperAdmin: false,
  isAssistantAdmin: false,
  fullNameConfirmed: true,
  joinedAt: '2026-09-01',
  lastLogin: new Date().toISOString()
};

export const INITIAL_USERS: User[] = [
  SUPER_ADMIN_USER,
  ALNOFAL_USER
];

export const FAKE_USER_EMAILS = new Set([
  'abdullah.q@gmail.com',
  'rayan.sh@gmail.com',
  'faisal.otb@gmail.com',
  'saud.dos@gmail.com',
  'sara.gh@gmail.com',
  'noura.hr@gmail.com',
  'khaled.q@gmail.com',
  'fahad.sh@gmail.com'
]);

export const formatDisplayName = (name?: string, isTeacherOrSupervisor?: boolean): string => {
  if (!name || typeof name !== 'string') return isTeacherOrSupervisor ? 'أ. المعلم' : 'طالبنا العزيز';
  const clean = name.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();
  if (isTeacherOrSupervisor) {
    return `أ. ${clean}`;
  }
  return clean;
};

export const getSafeUserDocId = (email: string): string => {
  return (email || '').trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
};

export const isFullNameValid = (name?: string): boolean => {
  if (!name) return false;
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (['طالب', 'مستخدم', 'طالب جديد', 'student', 'user', 'guest'].includes(trimmed.toLowerCase())) {
    return false;
  }
  const parts = trimmed.split(' ').filter((p) => p.length >= 2);
  return parts.length >= 3;
};

export const resolveStudentFullName = (
  studentEmail?: string,
  fallbackName?: string,
  usersList?: User[]
): string => {
  const cleanEmail = (studentEmail || '').trim().toLowerCase();

  // 1. Check if present in usersList
  if (cleanEmail && usersList && usersList.length > 0) {
    const foundUser = usersList.find((u) => u.email && u.email.toLowerCase().trim() === cleanEmail);
    if (foundUser?.name && isFullNameValid(foundUser.name)) {
      return foundUser.name.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();
    }
    if (foundUser?.name && foundUser.name.trim() !== '' && !['طالب', 'مستخدم', 'student', 'user'].includes(foundUser.name.trim().toLowerCase())) {
      return foundUser.name.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();
    }
  }

  // 2. Check local confirmed full name cache
  if (cleanEmail) {
    const cached = safeGetItem(`thanaweya_confirmed_fullname_${cleanEmail}`);
    if (cached && isFullNameValid(cached)) {
      return cached.trim();
    }
  }

  // 3. Check fallbackName
  if (fallbackName && fallbackName.trim() && !['طالب', 'مستخدم', 'طالب جديد', 'student', 'user'].includes(fallbackName.trim().toLowerCase())) {
    return fallbackName.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();
  }

  // 4. Default to email username or 'طالب'
  if (cleanEmail) {
    const prefix = cleanEmail.split('@')[0];
    return prefix;
  }

  return 'طالب';
};

export const deduplicateUsersByEmail = (users: User[]): User[] => {
  const map = new Map<string, User>();

  for (const u of users) {
    if (!u || !u.email) continue;
    const emailKey = u.email.trim().toLowerCase();
    if (isInvalidOrFakeUser(u.name, emailKey)) continue;

    const isSuper = emailKey === SUPER_ADMIN_EMAIL.toLowerCase();
    const isAlnofal = emailKey === ALNOFAL_EMAIL.toLowerCase();
    const isAssistant = !isSuper && (u.role === 'supervisor' || u.jobTitle === 'مشرف مساعد' || emailKey === 'kalshrby90@gmail.com');
    const jobTitle = isSuper
      ? 'المشرف الأساسي'
      : (isAlnofal
          ? (u.jobTitle || 'أ. لغة إنجليزية')
          : (u.jobTitle || (isAssistant ? 'مشرف مساعد' : (u.role === 'teacher' ? 'أ. رياضيات' : 'طالب'))));
    const isTeacher = !isSuper && !isAssistant && (isAlnofal || u.role === 'teacher' || (jobTitle !== 'طالب' && !jobTitle.includes('مشرف')));
    const isConfirmed = !!u.fullNameConfirmed || isSuper || isAlnofal;

    const savedLocalClass = safeGetItem(`thanaweya_student_class_${emailKey}`) || undefined;
    const finalClassroom = u.classroom || savedLocalClass;

    if (!map.has(emailKey)) {
      map.set(emailKey, {
        ...u,
        email: emailKey,
        jobTitle,
        classroom: finalClassroom,
        isSuperAdmin: isSuper,
        isAssistantAdmin: isAssistant,
        fullNameConfirmed: isConfirmed,
        role: isSuper ? 'supervisor' : (isAssistant ? 'supervisor' : (isTeacher ? 'teacher' : 'student'))
      });
    } else {
      const existing = map.get(emailKey)!;
      const lastLogin =
        u.lastLogin && (!existing.lastLogin || new Date(u.lastLogin) > new Date(existing.lastLogin))
          ? u.lastLogin
          : existing.lastLogin;
      const avatar = u.avatar && !u.avatar.includes('dicebear') ? u.avatar : existing.avatar;
      const finalJobTitle = isSuper
        ? 'المشرف الأساسي'
        : (isAlnofal ? (existing.jobTitle || u.jobTitle || 'أ. لغة إنجليزية') : (u.jobTitle || existing.jobTitle || 'طالب'));
      const finalIsAssistant = !isSuper && (finalJobTitle === 'مشرف مساعد' || existing.isAssistantAdmin || u.isAssistantAdmin || emailKey === 'kalshrby90@gmail.com');
      const finalIsTeacher = !isSuper && !finalIsAssistant && (isAlnofal || finalJobTitle !== 'طالب');
      const confirmedName = (existing.fullNameConfirmed ? existing.name : (u.fullNameConfirmed ? u.name : (u.name || existing.name)));
      const combinedClassroom = u.classroom || existing.classroom || savedLocalClass;

      map.set(emailKey, {
        ...existing,
        ...u,
        name: isSuper ? (u.name || existing.name) : (isAlnofal ? (u.name || existing.name || 'أ. النوفل (معلم لغة إنجليزية)') : confirmedName),
        jobTitle: finalJobTitle,
        classroom: combinedClassroom,
        isSuperAdmin: isSuper,
        isAssistantAdmin: finalIsAssistant,
        fullNameConfirmed: isSuper || isAlnofal || !!(existing.fullNameConfirmed || u.fullNameConfirmed),
        role: isSuper ? 'supervisor' : (finalIsAssistant ? 'supervisor' : (finalIsTeacher ? 'teacher' : 'student')),
        avatar,
        lastLogin
      });
    }
  }

  // Ensure SUPER_ADMIN_USER is always present exactly once
  const superKey = SUPER_ADMIN_EMAIL.toLowerCase();
  if (!map.has(superKey)) {
    map.set(superKey, SUPER_ADMIN_USER);
  } else {
    const existingSuper = map.get(superKey)!;
    map.set(superKey, {
      ...SUPER_ADMIN_USER,
      ...existingSuper,
      email: SUPER_ADMIN_EMAIL,
      isSuperAdmin: true,
      jobTitle: 'المشرف الأساسي',
      fullNameConfirmed: true,
      role: 'supervisor'
    });
  }

  // Ensure ALNOFAL_USER (English teacher) is always present
  const alnofalKey = ALNOFAL_EMAIL.toLowerCase();
  if (!map.has(alnofalKey)) {
    map.set(alnofalKey, ALNOFAL_USER);
  } else {
    const existingAlnofal = map.get(alnofalKey)!;
    map.set(alnofalKey, {
      ...ALNOFAL_USER,
      ...existingAlnofal,
      name: existingAlnofal.name && existingAlnofal.name !== 'طالب' ? existingAlnofal.name : 'أ. النوفل (معلم لغة إنجليزية)',
      jobTitle: existingAlnofal.jobTitle || 'أ. لغة إنجليزية',
      role: 'teacher',
      fullNameConfirmed: true
    });
  }

  const result = Array.from(map.values());

  // Sort: Super Admin first, then Alnofal, then by lastLogin descending
  result.sort((a, b) => {
    if (a.isSuperAdmin) return -1;
    if (b.isSuperAdmin) return 1;
    if (a.email.toLowerCase() === alnofalKey) return -1;
    if (b.email.toLowerCase() === alnofalKey) return 1;
    const timeA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
    const timeB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
    return timeB - timeA;
  });

  return result;
};

export const isInvalidOrFakeUser = (_name: string, email: string): boolean => {
  if (!email || !email.includes('@')) return true;
  const clean = email.trim().toLowerCase();
  if (FAKE_USER_EMAILS.has(clean)) return true;
  return false;
};

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAssistantAdmin: boolean;
  isTeacherOrSupervisor: boolean;
  canAddContent: boolean;
  canManageSubject: (subjectIdOrName?: string) => boolean;
  registeredUsers: User[];
  assistantAdminEmails: string[];
  isRealtimeConnected: boolean;
  refreshUsers: () => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithGoogleEmail: (email: string, name?: string, avatar?: string) => Promise<void>;
  updateUserName: (fullName: string) => Promise<{ success: boolean; message: string }>;
  setStudentClassroom: (classroom: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  updateUserJob: (email: string, jobTitle: string) => Promise<{ success: boolean; message: string }>;
  updateUserFullNameByAdmin: (email: string, newFullName: string) => Promise<{ success: boolean; message: string }>;
  deleteUserByAdmin: (email: string) => Promise<{ success: boolean; message: string }>;
  addUserByAdmin: (name: string, email: string, jobTitle: string) => Promise<{ success: boolean; message: string }>;
  addAssistantAdmin: (email: string, name: string) => { success: boolean; message: string };
  removeAssistantAdmin: (email: string) => { success: boolean; message: string };
  toggleUserRole: (userId: string) => { success: boolean; message: string };
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authError: string | null;
  setAuthError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  const [assistantAdminEmails, setAssistantAdminEmails] = useState<string[]>(() => {
    try {
      const saved = safeGetItem('thanaweya_assistant_admins');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (e: string) =>
              typeof e === 'string' &&
              !e.toLowerCase().includes('sara') &&
              !e.toLowerCase().includes('mansour')
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    try {
      const saved = safeGetItem('thanaweya_registered_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((u: any) => u && u.email && !FAKE_USER_EMAILS.has(String(u.email).toLowerCase().trim()));
          const validUsers = deduplicateUsersByEmail([...INITIAL_USERS, ...cleaned]);
          if (validUsers.length > 0) {
            safeSetItem('thanaweya_registered_users', JSON.stringify(validUsers));
            return validUsers;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_USERS;
  });

  // Ensure default cloud users (Super Admin & English Teacher Alnofal) exist in Firestore Cloud
  useEffect(() => {
    const seedCloudUsers = async () => {
      try {
        const alnofalDocId = getSafeUserDocId(ALNOFAL_EMAIL);
        await setDoc(
          doc(db, 'users', alnofalDocId),
          {
            id: alnofalDocId,
            name: 'أ. النوفل (معلم لغة إنجليزية)',
            email: 'alnofal.2026108@gmail.com',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alnofal',
            role: 'teacher',
            jobTitle: 'أ. لغة إنجليزية',
            grade: 'أول ثانوي',
            isSuperAdmin: false,
            isAssistantAdmin: false,
            fullNameConfirmed: true,
            joinedAt: '2026-09-01'
          },
          { merge: true }
        );

        const superDocId = getSafeUserDocId(SUPER_ADMIN_EMAIL);
        await setDoc(
          doc(db, 'users', superDocId),
          {
            id: superDocId,
            name: SUPER_ADMIN_USER.name,
            email: SUPER_ADMIN_EMAIL.toLowerCase(),
            avatar: SUPER_ADMIN_USER.avatar,
            role: 'supervisor',
            jobTitle: 'المشرف الأساسي',
            grade: 'أول ثانوي',
            isSuperAdmin: true,
            isAssistantAdmin: false,
            fullNameConfirmed: true,
            joinedAt: '2026-08-15'
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Seed cloud users note:', err);
      }
    };
    seedCloudUsers();
  }, []);

  // App starts with NO logged-in user by default (forcing Login Page entry)
  const [user, setUser] = useState<User | null>(() => {
    const saved = safeGetItem('thanaweya_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          const isSuper = parsed.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          const jobTitle = isSuper ? 'المشرف الأساسي' : (parsed.jobTitle || 'طالب');
          const isTeacher = isSuper || (jobTitle !== 'طالب');
          const cleanName = (parsed.name || parsed.email.split('@')[0] || 'مستخدم')
            .replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '')
            .trim();
          return {
            ...parsed,
            name: cleanName,
            jobTitle,
            isSuperAdmin: isSuper,
            isAssistantAdmin: !isSuper && isTeacher,
            role: isSuper ? 'supervisor' : (isTeacher ? (parsed.role || 'teacher') : 'student')
          };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Sync a user immediately to Firestore cloud collection 'users'
  const syncUserToCloud = useCallback(async (userObj: User) => {
    if (!userObj || !userObj.email) return;
    const cleanEmail = userObj.email.trim().toLowerCase();
    if (isInvalidOrFakeUser(userObj.name, cleanEmail)) return;

    try {
      const docId = getSafeUserDocId(cleanEmail);
      const userRef = doc(db, 'users', docId);
      const nowIso = new Date().toISOString();
      await setDoc(
        userRef,
        {
          id: docId,
          name: userObj.name,
          email: cleanEmail,
          avatar: userObj.avatar,
          role: userObj.role,
          jobTitle: userObj.jobTitle || 'طالب',
          grade: userObj.grade || 'أول ثانوي',
          classroom: userObj.classroom || safeGetItem(`thanaweya_student_class_${cleanEmail}`) || undefined,
          isSuperAdmin: !!userObj.isSuperAdmin,
          isAssistantAdmin: !!userObj.isAssistantAdmin,
          fullNameConfirmed: !!userObj.fullNameConfirmed,
          joinedAt: userObj.joinedAt || nowIso.split('T')[0],
          lastLogin: nowIso,
          updatedAt: nowIso
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Error pushing user to Firestore cloud:', err);
    }
  }, []);

  // Sync Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
        const cleanEmail = fbUser.email.toLowerCase().trim();
        const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

        // Check if there is existing cloud data for this user
        let existingJobTitle = isSuper ? 'المشرف الأساسي' : 'طالب';
        let existingRole: UserRole = isSuper ? 'supervisor' : 'student';
        let cloudSavedName: string | undefined = undefined;
        let cloudClassroom: string | undefined = safeGetItem(`thanaweya_student_class_${cleanEmail}`) || undefined;
        let isConfirmed = isSuper || !!safeGetItem(`thanaweya_name_confirmed_${cleanEmail}`);

        try {
          const docSnap = await getDoc(doc(db, 'users', getSafeUserDocId(cleanEmail)));
          if (docSnap.exists()) {
            const d = docSnap.data();
            if (d) {
              if (d.jobTitle) {
                existingJobTitle = d.jobTitle;
                existingRole = d.role || (d.jobTitle === 'طالب' ? 'student' : 'teacher');
              }
              if (d.name && isFullNameValid(d.name)) {
                cloudSavedName = d.name;
              }
              if (d.classroom) {
                cloudClassroom = d.classroom;
                safeSetItem(`thanaweya_student_class_${cleanEmail}`, d.classroom);
                safeSetItem(`thanaweya_student_class_locked_${cleanEmail}`, 'true');
              }
              if (d.fullNameConfirmed) {
                isConfirmed = true;
              }
            }
          }
        } catch (e) {
          console.warn('Cloud user lookup note:', e);
        }

        const isAssistant = !isSuper && (existingRole === 'supervisor' || existingJobTitle === 'مشرف مساعد' || cleanEmail === 'kalshrby90@gmail.com');
        const isTeacher = !isSuper && !isAssistant && (existingJobTitle !== 'طالب');
        const rawName = cloudSavedName || fbUser.displayName || cleanEmail.split('@')[0];
        const cleanName = rawName.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();

        if (isFullNameValid(cleanName)) {
          isConfirmed = true;
          safeSetItem(`thanaweya_name_confirmed_${cleanEmail}`, 'true');
        }

        const newUserObj: User = {
          id: fbUser.uid,
          name: cleanName || 'طالب',
          email: cleanEmail,
          avatar:
            fbUser.photoURL ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
          role: isSuper ? 'supervisor' : (isAssistant ? 'supervisor' : (isTeacher ? 'teacher' : 'student')),
          jobTitle: existingJobTitle,
          grade: 'أول ثانوي',
          classroom: cloudClassroom,
          isSuperAdmin: isSuper,
          isAssistantAdmin: isAssistant,
          fullNameConfirmed: isConfirmed,
          joinedAt: new Date().toISOString().split('T')[0],
          lastLogin: new Date().toISOString()
        };

        setUser(newUserObj);
        safeSetItem('thanaweya_user', JSON.stringify(newUserObj));

        // Push immediately to Firestore cloud
        await syncUserToCloud(newUserObj);
      }
    });

    return () => unsubscribe();
  }, [syncUserToCloud]);

  // Real-time Firestore Listener: Instantly captures any user logging in anywhere!
  useEffect(() => {
    let isMounted = true;
    try {
      const usersCol = collection(db, 'users');
      const unsubscribe = onSnapshot(
        usersCol,
        (snapshot) => {
          if (!isMounted) return;
          setIsRealtimeConnected(true);

          const cloudUsers: User[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data || !data.email) return;

            const email = String(data.email).trim().toLowerCase();
            const rawName = String(data.name || email.split('@')[0]);
            const cleanName = rawName.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();

            if (isInvalidOrFakeUser(cleanName, email)) return;

            const isSuper = email === SUPER_ADMIN_EMAIL.toLowerCase();
            const isAssistant = !isSuper && (data.role === 'supervisor' || data.jobTitle === 'مشرف مساعد' || email === 'kalshrby90@gmail.com');
            const jobTitle = isSuper ? 'المشرف الأساسي' : (data.jobTitle || (isAssistant ? 'مشرف مساعد' : 'طالب'));
            const isTeacher = !isSuper && !isAssistant && jobTitle !== 'طالب';
            const isConfirmed = isSuper || !!data.fullNameConfirmed || !!safeGetItem(`thanaweya_name_confirmed_${email}`) || isFullNameValid(cleanName);

            const savedClass = data.classroom || safeGetItem(`thanaweya_student_class_${email}`) || undefined;
            if (data.classroom) {
              safeSetItem(`thanaweya_student_class_${email}`, data.classroom);
              safeSetItem(`thanaweya_student_class_locked_${email}`, 'true');
            }

            cloudUsers.push({
              id: docSnap.id,
              name: cleanName || 'مستخدم',
              email,
              avatar:
                data.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName || email)}`,
              role: isSuper ? 'supervisor' : (isAssistant ? 'supervisor' : (isTeacher ? 'teacher' : 'student')),
              jobTitle,
              grade: data.grade || 'أول ثانوي',
              classroom: savedClass,
              isSuperAdmin: isSuper,
              isAssistantAdmin: isAssistant,
              fullNameConfirmed: isConfirmed,
              joinedAt:
                data.joinedAt ||
                (data.lastLogin ? data.lastLogin.split('T')[0] : new Date().toISOString().split('T')[0]),
              lastLogin: data.lastLogin || undefined
            });
          });

          // Ensure deduplicated users with single Super Admin entry
          const merged = deduplicateUsersByEmail([...INITIAL_USERS, ...cloudUsers]);

          setRegisteredUsers(merged);
          safeSetItem('thanaweya_registered_users', JSON.stringify(merged));

          // If current logged-in user's role or classroom was updated in cloud in real-time, sync it
          setUser((currentUser) => {
            if (!currentUser || !currentUser.email) return currentUser;
            const myEmail = currentUser.email.toLowerCase();
            const foundInCloud = merged.find((u) => u.email.toLowerCase() === myEmail);
            if (foundInCloud && (
              foundInCloud.jobTitle !== currentUser.jobTitle ||
              foundInCloud.role !== currentUser.role ||
              (foundInCloud.classroom && foundInCloud.classroom !== currentUser.classroom)
            )) {
              const updated = {
                ...currentUser,
                jobTitle: foundInCloud.jobTitle,
                role: foundInCloud.role,
                classroom: foundInCloud.classroom || currentUser.classroom,
                isAssistantAdmin: foundInCloud.isAssistantAdmin
              };
              safeSetItem('thanaweya_user', JSON.stringify(updated));
              return updated;
            }
            return currentUser;
          });
        },
        (error) => {
          console.warn('Firestore real-time listener notice:', error);
          setIsRealtimeConnected(false);
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (e) {
      console.warn('Firestore real-time onSnapshot init error:', e);
      setIsRealtimeConnected(false);
    }
  }, []);

  // Manual refresh from Firestore cloud
  const refreshUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const cloudUsers: User[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.email) {
          const email = String(data.email).trim().toLowerCase();
          const cleanName = String(data.name || email.split('@')[0]).replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();
          if (isInvalidOrFakeUser(cleanName, email)) return;
          const isSuper = email === SUPER_ADMIN_EMAIL.toLowerCase();
          const jobTitle = isSuper ? 'المشرف الأساسي' : (data.jobTitle || 'طالب');
          const isTeacher = isSuper || jobTitle !== 'طالب';
          cloudUsers.push({
            id: docSnap.id,
            name: cleanName,
            email,
            avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
            role: isSuper ? 'supervisor' : (data.role || (isTeacher ? 'teacher' : 'student')),
            jobTitle,
            grade: data.grade || 'أول ثانوي',
            isSuperAdmin: isSuper,
            isAssistantAdmin: !isSuper && isTeacher,
            joinedAt: data.joinedAt || new Date().toISOString().split('T')[0],
            lastLogin: data.lastLogin
          });
        }
      });
        const merged = deduplicateUsersByEmail([...INITIAL_USERS, ...cloudUsers]);
        setRegisteredUsers(merged);
        safeSetItem('thanaweya_registered_users', JSON.stringify(merged));
    } catch (e) {
      console.warn('Manual refresh users note:', e);
    }
  };

  useEffect(() => {
    if (user) {
      safeSetItem('thanaweya_user', JSON.stringify(user));
    } else {
      safeRemoveItem('thanaweya_user');
    }
  }, [user]);

  useEffect(() => {
    safeSetItem('thanaweya_assistant_admins', JSON.stringify(assistantAdminEmails));
  }, [assistantAdminEmails]);

  useEffect(() => {
    safeSetItem('thanaweya_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isAssistantAdmin =
    !isSuperAdmin &&
    (user?.role === 'supervisor' || user?.jobTitle === 'مشرف مساعد' || user?.email?.toLowerCase() === 'kalshrby90@gmail.com');

  const isTeacher =
    !isSuperAdmin &&
    !isAssistantAdmin &&
    (user?.role === 'teacher' || (!!user?.jobTitle && user?.jobTitle !== 'طالب' && !user?.jobTitle.includes('مشرف')));

  const canAddContent = isSuperAdmin || isAssistantAdmin || isTeacher;

  const isTeacherOrSupervisor = isSuperAdmin || isAssistantAdmin || isTeacher;

  // Specific Subject Authorization Check:
  // Teachers can ONLY manage their assigned subject.
  // Super Admin and Assistant Supervisor ("مشرف مساعد") can manage all subjects.
  // Students cannot manage any subject.
  const canManageSubject = useCallback((subjectIdOrName?: string): boolean => {
    if (!user || !user.email) return false;
    const cleanEmail = user.email.trim().toLowerCase();

    // 1. Super Admin has full permissions across all subjects
    if (isSuperAdmin || cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return true;
    }

    // 2. Assistant Supervisor has full permissions across all subjects
    if (user.role === 'supervisor' || user.jobTitle === 'مشرف مساعد') {
      return true;
    }

    // 3. Student has NO manage permissions anywhere
    if (user.jobTitle === 'طالب' || user.role === 'student') {
      return false;
    }

    // 4. If checking general capability (e.g. is user a teacher with edit capability?)
    if (!subjectIdOrName) {
      return user.role === 'teacher' || (user.jobTitle !== 'طالب' && !user.jobTitle.includes('طالب'));
    }

    const job = (user.jobTitle || '').trim().toLowerCase();
    const target = (subjectIdOrName || '').trim().toLowerCase();

    // English Teacher (Alnofal or any English teacher):
    // Can manage ALL info of English, but CANNOT manage any other subjects!
    const isEnglishTeacher =
      cleanEmail === 'alnofal.2026108@gmail.com' ||
      job.includes('إنجليز') ||
      job.includes('انجليز') ||
      job.includes('انقليز') ||
      job.includes('انكليز') ||
      job.includes('english') ||
      job.includes('mega');

    if (isEnglishTeacher) {
      const isEnglishTarget =
        target === 'eng-1' ||
        target === 'eng-2' ||
        target.includes('إنجليز') ||
        target.includes('انجليز') ||
        target.includes('انقليز') ||
        target.includes('english') ||
        target.includes('mega') ||
        target.includes('goal');
      return isEnglishTarget;
    }

    // Math Teacher
    if (job.includes('رياضيات') || job.includes('math')) {
      return target === 'math-1' || target === 'math-2' || target.includes('رياضيات') || target.includes('math');
    }

    // Chemistry Teacher
    if (job.includes('كيمياء') || job.includes('chem')) {
      return target === 'chem-1' || target.includes('كيمياء') || target.includes('chem');
    }

    // Ecology / Biology Teacher
    if (job.includes('بيئة') || job.includes('بيئه') || job.includes('أحياء') || job.includes('احياء') || job.includes('eco') || job.includes('bio')) {
      return target === 'eco-1' || target === 'bio-1' || target.includes('بيئة') || target.includes('أحياء') || target.includes('احياء');
    }

    // Digital Technology Teacher
    if (job.includes('تقنية') || job.includes('رقمية') || job.includes('حاسب') || job.includes('digi') || job.includes('tech')) {
      return target === 'digi-1' || target === 'digi-2' || target.includes('تقنية') || target.includes('رقمية');
    }

    // Critical Thinking Teacher
    if (job.includes('تفكير') || job.includes('ناقد') || job.includes('think')) {
      return target === 'think-1' || target.includes('تفكير') || target.includes('ناقد');
    }

    // Tafsir Teacher
    if (job.includes('تفسير') || job.includes('قرآن') || job.includes('tafsir')) {
      return target === 'tafsir-1' || target.includes('تفسير') || target.includes('قرآن');
    }

    // Arabic / Competencies Teacher
    if (job.includes('كفايات') || job.includes('عربي') || job.includes('لغوية') || job.includes('lang')) {
      return target === 'lang-1' || target === 'lang-2' || target.includes('كفايات') || target.includes('لغوية');
    }

    // Guidance
    if (job.includes('مرشد') || job.includes('إرشاد') || job.includes('ارشاد') || job.includes('guidance')) {
      return target === 'guidance-1' || target === 'guidance-2' || target.includes('إرشاد') || target.includes('مرشد');
    }

    return false;
  }, [user, isSuperAdmin]);

  // Real Google Sign-In with Firebase Auth
  const loginWithGoogle = async (): Promise<boolean> => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && result.user.email) {
        const cleanEmail = result.user.email.toLowerCase().trim();
        const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
        
        let existingJob = isSuper ? 'المشرف الأساسي' : 'طالب';
        let existingRole: UserRole = isSuper ? 'supervisor' : 'student';

        // Check if user already exists
        const found = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
        if (found && found.jobTitle) {
          existingJob = found.jobTitle;
          existingRole = found.role;
        }

        const rawName = result.user.displayName || cleanEmail.split('@')[0];
        const cleanName = rawName.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();
        const isTeacher = isSuper || (existingJob !== 'طالب');

        const savedClass = found?.classroom || safeGetItem(`thanaweya_student_class_${cleanEmail}`) || undefined;
        const isConfirmed = isSuper || !!found?.fullNameConfirmed || isFullNameValid(cleanName);

        const newUserObj: User = {
          id: result.user.uid,
          name: cleanName || 'طالب',
          email: cleanEmail,
          avatar:
            result.user.photoURL ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
          role: isSuper ? 'supervisor' : existingRole,
          jobTitle: existingJob,
          grade: 'أول ثانوي',
          classroom: savedClass,
          isSuperAdmin: isSuper,
          isAssistantAdmin: !isSuper && isTeacher,
          fullNameConfirmed: isConfirmed,
          joinedAt: new Date().toISOString().split('T')[0],
          lastLogin: new Date().toISOString()
        };

        setUser(newUserObj);
        safeSetItem('thanaweya_user', JSON.stringify(newUserObj));
        setRegisteredUsers((prev) => deduplicateUsersByEmail([newUserObj, ...prev]));

        // Immediately push to Firestore cloud
        await syncUserToCloud(newUserObj);
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('Firebase popup sign-in note:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        setAuthError('تعذر فتح النافذة المنبثقة بحساب Google. يمكنك إدخال بريدك الإلكتروني أدناه للدخول.');
      } else {
        setAuthError(err.message || 'حدث خطأ أثناء تسجيل الدخول بواسطة Google');
      }
      return false;
    }
  };

  const loginWithGoogleEmail = async (email: string, name?: string, avatar?: string) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();
    const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

    let existing = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    let targetUser: User;

    // Check if user already confirmed their full 3-part name
    const storedConfirmedName = safeGetItem(`thanaweya_confirmed_fullname_${cleanEmail}`);
    const isStoredConfirmed = !!safeGetItem(`thanaweya_name_confirmed_${cleanEmail}`);

    let cleanName: string;
    if (storedConfirmedName && isFullNameValid(storedConfirmedName)) {
      cleanName = storedConfirmedName;
    } else if (existing?.name && isFullNameValid(existing.name)) {
      cleanName = existing.name;
    } else {
      const rawName = name || (existing ? existing.name : cleanEmail.split('@')[0]);
      cleanName = rawName.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();
    }

    const isConfirmed = isSuper || isStoredConfirmed || (existing?.fullNameConfirmed && isFullNameValid(cleanName)) || isFullNameValid(cleanName);
    if (isConfirmed && isFullNameValid(cleanName)) {
      safeSetItem(`thanaweya_name_confirmed_${cleanEmail}`, 'true');
      safeSetItem(`thanaweya_confirmed_fullname_${cleanEmail}`, cleanName);
    }

    const nowIso = new Date().toISOString();
    const savedClass = existing?.classroom || safeGetItem(`thanaweya_student_class_${cleanEmail}`) || undefined;

    if (existing) {
      const jobTitle = isSuper ? 'المشرف الأساسي' : (existing.jobTitle || 'طالب');
      const isAssistant = !isSuper && (existing.role === 'supervisor' || existing.jobTitle === 'مشرف مساعد' || cleanEmail === 'kalshrby90@gmail.com');
      const isTeacher = !isSuper && !isAssistant && jobTitle !== 'طالب';
      targetUser = {
        ...existing,
        name: cleanName,
        jobTitle,
        classroom: savedClass,
        isSuperAdmin: isSuper,
        isAssistantAdmin: isAssistant,
        fullNameConfirmed: isConfirmed,
        role: isSuper ? 'supervisor' : (isAssistant ? 'supervisor' : (isTeacher ? 'teacher' : 'student')),
        lastLogin: nowIso
      };
    } else {
      // First time registering -> Guaranteed 'طالب'
      const jobTitle = isSuper ? 'المشرف الأساسي' : 'طالب';
      targetUser = {
        id: `user-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        avatar:
          avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        role: isSuper ? 'supervisor' : 'student',
        jobTitle,
        grade: 'أول ثانوي',
        classroom: savedClass,
        isSuperAdmin: isSuper,
        isAssistantAdmin: false,
        fullNameConfirmed: isConfirmed,
        joinedAt: nowIso.split('T')[0],
        lastLogin: nowIso
      };
    }

    setUser(targetUser);
    safeSetItem('thanaweya_user', JSON.stringify(targetUser));

    // Update local state instantly with strict deduplication
    setRegisteredUsers((prev) => deduplicateUsersByEmail([targetUser, ...prev]));

    // INSTANT: write to Firestore cloud so supervisor sees them in real time
    await syncUserToCloud(targetUser);

    setIsAuthModalOpen(false);
  };

  // Update user's full 3-part name (mandatory on entry for everyone - once and never repeated)
  const updateUserName = async (fullName: string): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'المستخدم غير مسجل' };
    }

    const trimmed = (fullName || '').trim().replace(/\s+/g, ' ');
    const parts = trimmed.split(' ').filter((p) => p.length >= 2);
    if (parts.length < 3) {
      return { success: false, message: 'يرجى إدخال الاسم الثلاثي كاملاً (3 أسماء على الأقل: الاسم الأول، واسم الأب، واسم العائلة).' };
    }

    const cleanEmail = user.email.toLowerCase().trim();
    safeSetItem(`thanaweya_name_confirmed_${cleanEmail}`, 'true');
    safeSetItem(`thanaweya_confirmed_fullname_${cleanEmail}`, trimmed);

    const updatedUser: User = {
      ...user,
      name: trimmed,
      fullNameConfirmed: true
    };

    setUser(updatedUser);
    safeSetItem('thanaweya_user', JSON.stringify(updatedUser));

    // Update in registeredUsers
    setRegisteredUsers((prev) =>
      prev.map((u) => (u.email.toLowerCase() === cleanEmail ? { ...u, name: trimmed, fullNameConfirmed: true } : u))
    );

    // Save directly to Firestore Cloud
    try {
      const docId = getSafeUserDocId(cleanEmail);
      await setDoc(
        doc(db, 'users', docId),
        {
          name: trimmed,
          fullNameConfirmed: true,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Error saving full name to cloud:', e);
    }

    return { success: true, message: 'تم حفظ الاسم الثلاثي بنجاح' };
  };

  // Set student classroom (mandatory on entry for all students - once and never repeated / cannot change)
  const setStudentClassroom = async (classroom: string): Promise<{ success: boolean; message: string }> => {
    if (!user || !user.email) {
      return { success: false, message: 'المستخدم غير مسجل' };
    }

    const cleanClass = classroom.trim();
    if (!['1/1', '1/2', '1/3', '1/4', '1/5', '1/6', '1/7'].includes(cleanClass)) {
      return { success: false, message: 'يرجى اختيار فصل صحيح من الخيارات المتاحة (1/1 إلى 1/7).' };
    }

    const cleanEmail = user.email.toLowerCase().trim();

    // Lock permanently in localStorage
    safeSetItem(`thanaweya_student_class_${cleanEmail}`, cleanClass);
    safeSetItem(`thanaweya_student_class_locked_${cleanEmail}`, 'true');

    const updatedUser: User = {
      ...user,
      classroom: cleanClass
    };

    setUser(updatedUser);
    safeSetItem('thanaweya_user', JSON.stringify(updatedUser));

    // Update in registeredUsers
    setRegisteredUsers((prev) => {
      const next = prev.map((u) => (u.email && u.email.toLowerCase().trim() === cleanEmail ? { ...u, classroom: cleanClass } : u));
      safeSetItem('thanaweya_registered_users', JSON.stringify(next));
      return next;
    });

    // Save to Firestore Cloud immediately so all teachers and supervisors see it in real time
    try {
      const docId = getSafeUserDocId(cleanEmail);
      await setDoc(
        doc(db, 'users', docId),
        {
          classroom: cleanClass,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Error saving classroom to cloud:', e);
    }

    return { success: true, message: `تم تأكيد الفصل الدراسي (${cleanClass}) بنجاح` };
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setFirebaseUser(null);
    safeRemoveItem('thanaweya_user');
  };

  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    syncUserToCloud(updated);
  };

  // Update user role / job title (Authorized for Admin)
  const updateUserJob = async (email: string, jobTitle: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return { success: false, message: 'لا يمكن تعديل وظيفة المشرف الأساسي.' };
    }

    const jobOption = USER_JOB_OPTIONS.find((j) => j.value === jobTitle) || {
      value: jobTitle,
      label: jobTitle,
      role: (jobTitle === 'طالب' ? 'student' : (jobTitle.includes('مشرف') ? 'supervisor' : 'teacher')) as UserRole,
      isSupervisorOrTeacher: jobTitle !== 'طالب'
    };
    const newRole: UserRole = jobOption.role;
    const isTeacherOrSupervisor = jobOption.isSupervisorOrTeacher;

    // Update assistantAdminEmails
    let nextAssistants = assistantAdminEmails.filter((e) => e.toLowerCase() !== cleanEmail);
    if (isTeacherOrSupervisor) {
      nextAssistants.push(cleanEmail);
    }
    setAssistantAdminEmails(nextAssistants);

    // Update registeredUsers state (upsert so it never fails if user was not in state yet)
    setRegisteredUsers((prev) => {
      const exists = prev.some((u) => u.email.toLowerCase() === cleanEmail);
      let updated: User[];
      if (exists) {
        updated = prev.map((u) => {
          if (u.email.toLowerCase() === cleanEmail) {
            return {
              ...u,
              jobTitle: jobOption.value,
              role: newRole,
              isAssistantAdmin: isTeacherOrSupervisor
            };
          }
          return u;
        });
      } else {
        const newUser: User = {
          id: getSafeUserDocId(cleanEmail),
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
          role: newRole,
          jobTitle: jobOption.value,
          grade: 'أول ثانوي',
          fullNameConfirmed: true,
          isSuperAdmin: false,
          isAssistantAdmin: isTeacherOrSupervisor,
          joinedAt: new Date().toISOString().split('T')[0]
        };
        updated = deduplicateUsersByEmail([newUser, ...prev]);
      }
      safeSetItem('thanaweya_registered_users', JSON.stringify(updated));
      return updated;
    });

    // If target user is the currently active user
    if (user && user.email.toLowerCase() === cleanEmail) {
      const updatedSelf = {
        ...user,
        jobTitle: jobOption.value,
        role: newRole,
        isAssistantAdmin: isTeacherOrSupervisor
      };
      setUser(updatedSelf);
      safeSetItem('thanaweya_user', JSON.stringify(updatedSelf));
    }

    // Sync to Firestore Cloud immediately
    try {
      const docId = getSafeUserDocId(cleanEmail);
      await setDoc(
        doc(db, 'users', docId),
        {
          id: docId,
          email: cleanEmail,
          jobTitle: jobOption.value,
          role: newRole,
          isAssistantAdmin: isTeacherOrSupervisor,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Error updating user job in Firestore:', err);
    }

    return {
      success: true,
      message: `تم تعيين رتبة (${jobOption.label}) للمستخدم بنجاح.`
    };
  };

  // Add new user directly by Admin
  const addUserByAdmin = async (
    name: string,
    email: string,
    jobTitle: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'يرجى إدخال بريد إلكتروني صحيح' };
    }
    const cleanName = name.trim();
    if (!cleanName) {
      return { success: false, message: 'يرجى إدخال اسم المستخدم' };
    }

    const jobOption = USER_JOB_OPTIONS.find((j) => j.value === jobTitle) || USER_JOB_OPTIONS[0];
    const newRole: UserRole = jobOption.role;
    const isTeacherOrSupervisor = jobOption.isSupervisorOrTeacher;
    const nowIso = new Date().toISOString();

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
      role: newRole,
      jobTitle: jobOption.value,
      grade: 'أول ثانوي',
      isSuperAdmin: cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase(),
      isAssistantAdmin: isTeacherOrSupervisor,
      fullNameConfirmed: true,
      joinedAt: nowIso.split('T')[0],
      lastLogin: nowIso
    };

    setRegisteredUsers((prev) => {
      const updated = deduplicateUsersByEmail([newUser, ...prev]);
      safeSetItem('thanaweya_registered_users', JSON.stringify(updated));
      return updated;
    });

    // Push to Firestore
    try {
      const docId = getSafeUserDocId(cleanEmail);
      await setDoc(
        doc(db, 'users', docId),
        {
          id: docId,
          name: cleanName,
          email: cleanEmail,
          avatar: newUser.avatar,
          role: newRole,
          jobTitle: jobOption.value,
          grade: 'أول ثانوي',
          isSuperAdmin: newUser.isSuperAdmin,
          isAssistantAdmin: isTeacherOrSupervisor,
          fullNameConfirmed: true,
          joinedAt: newUser.joinedAt,
          lastLogin: nowIso,
          updatedAt: nowIso
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Error saving new user to Firestore:', err);
    }

    return { success: true, message: `تمت إضافة (${cleanName}) بنجاح كـ (${jobOption.label}).` };
  };

  // Admin can add assistant admins
  const addAssistantAdmin = (email: string, _name: string): { success: boolean; message: string } => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'يرجى إدخال بريد إلكتروني صحيح' };
    }

    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return { success: false, message: 'هذا البريد مسجل بالفعل' };
    }

    updateUserJob(cleanEmail, 'مشرف مساعد');

    return {
      success: true,
      message: `تمت إضافة (${cleanEmail}) كمساعد بنجاح.`
    };
  };

  // Admin can remove assistant admins
  const removeAssistantAdmin = (email: string): { success: boolean; message: string } => {
    const cleanEmail = email.trim().toLowerCase();
    updateUserJob(cleanEmail, 'طالب');

    return {
      success: true,
      message: `تم تعيين المستخدم كطالب (مشاهدة وتحميل فقط).`
    };
  };

  // Admin can update any user's full name directly
  const updateUserFullNameByAdmin = async (
    email: string,
    newFullName: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmed = (newFullName || '').trim().replace(/\s+/g, ' ');
    if (trimmed.length < 3) {
      return { success: false, message: 'يرجى إدخال اسم صحيح يتكون من 3 أحرف على الأقل.' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // Update in local state and cache
    safeSetItem(`thanaweya_name_confirmed_${cleanEmail}`, 'true');
    safeSetItem(`thanaweya_confirmed_fullname_${cleanEmail}`, trimmed);

    setRegisteredUsers((prev) => {
      const updated = prev.map((u) => (u.email.toLowerCase() === cleanEmail ? { ...u, name: trimmed, fullNameConfirmed: true } : u));
      safeSetItem('thanaweya_registered_users', JSON.stringify(updated));
      return updated;
    });

    if (user && user.email.toLowerCase() === cleanEmail) {
      const updatedSelf = { ...user, name: trimmed, fullNameConfirmed: true };
      setUser(updatedSelf);
      safeSetItem('thanaweya_user', JSON.stringify(updatedSelf));
    }

    // Sync to Firestore
    try {
      const docId = getSafeUserDocId(cleanEmail);
      await setDoc(
        doc(db, 'users', docId),
        {
          name: trimmed,
          fullNameConfirmed: true,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Error updating user name in Firestore:', e);
    }

    return { success: true, message: `تم تحديث اسم المستخدم إلى (${trimmed}) بنجاح.` };
  };

  // Admin can delete a user
  const deleteUserByAdmin = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return { success: false, message: 'لا يمكن حذف حساب المشرف الأساسي.' };
    }

    // Remove from state
    setRegisteredUsers((prev) => {
      const updated = prev.filter((u) => u.email.toLowerCase() !== cleanEmail);
      safeSetItem('thanaweya_registered_users', JSON.stringify(updated));
      return updated;
    });
    setAssistantAdminEmails((prev) => prev.filter((e) => e.toLowerCase() !== cleanEmail));

    // Mark as deleted in Firestore
    try {
      const docId = getSafeUserDocId(cleanEmail);
      await setDoc(
        doc(db, 'users', docId),
        {
          isDeleted: true,
          deletedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Error deleting user from Firestore:', e);
    }

    return { success: true, message: 'تم حذف المستخدم بنجاح.' };
  };

  const toggleUserRole = (userId: string): { success: boolean; message: string } => {
    const target = registeredUsers.find((u) => u.id === userId);
    if (!target) return { success: false, message: 'المستخدم غير موجود' };
    if (target.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return { success: false, message: 'لا يمكن تغيير دور المشرف الأساسي' };
    }

    const newJob = target.jobTitle === 'طالب' ? 'أ. رياضيات' : 'طالب';
    updateUserJob(target.email, newJob);

    return {
      success: true,
      message: `تم تحديث دور ${target.name}`
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isAuthenticated: !!user,
        isSuperAdmin,
        isAssistantAdmin,
        isTeacherOrSupervisor,
        canAddContent,
        canManageSubject,
        registeredUsers,
        assistantAdminEmails,
        isRealtimeConnected,
        refreshUsers,
        loginWithGoogle,
        loginWithGoogleEmail,
        updateUserName,
        setStudentClassroom,
        logout,
        switchRole,
        updateUserJob,
        updateUserFullNameByAdmin,
        deleteUserByAdmin,
        addUserByAdmin,
        addAssistantAdmin,
        removeAssistantAdmin,
        toggleUserRole,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authError,
        setAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

