import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, USER_JOB_OPTIONS } from '../types';
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

export const getSafeUserDocId = (email: string): string => {
  return email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
};

export const deduplicateUsersByEmail = (users: User[]): User[] => {
  const map = new Map<string, User>();

  for (const u of users) {
    if (!u || !u.email) continue;
    const emailKey = u.email.trim().toLowerCase();
    if (isInvalidOrFakeUser(u.name, emailKey)) continue;

    const isSuper = emailKey === SUPER_ADMIN_EMAIL.toLowerCase();
    const jobTitle = isSuper ? 'المشرف الأساسي' : (u.jobTitle || (u.role === 'supervisor' ? 'مشرف مساعد' : (u.role === 'teacher' ? 'أ. رياضيات' : 'طالب')));
    const isTeacherOrSupervisor = isSuper || (jobTitle !== 'طالب');

    if (!map.has(emailKey)) {
      map.set(emailKey, {
        ...u,
        email: emailKey,
        jobTitle,
        isSuperAdmin: isSuper,
        isAssistantAdmin: !isSuper && isTeacherOrSupervisor,
        role: isSuper ? 'supervisor' : (u.role || (isTeacherOrSupervisor ? 'teacher' : 'student'))
      });
    } else {
      const existing = map.get(emailKey)!;
      const lastLogin =
        u.lastLogin && (!existing.lastLogin || new Date(u.lastLogin) > new Date(existing.lastLogin))
          ? u.lastLogin
          : existing.lastLogin;
      const avatar = u.avatar && !u.avatar.includes('dicebear') ? u.avatar : existing.avatar;
      const finalJobTitle = isSuper ? 'المشرف الأساسي' : (u.jobTitle || existing.jobTitle || 'طالب');
      const finalIsTeacher = isSuper || finalJobTitle !== 'طالب';

      map.set(emailKey, {
        ...existing,
        ...u,
        name: isSuper ? (u.name || existing.name) : (existing.name || u.name),
        jobTitle: finalJobTitle,
        isSuperAdmin: isSuper,
        isAssistantAdmin: !isSuper && finalIsTeacher,
        role: isSuper ? 'supervisor' : (finalIsTeacher ? (u.role === 'supervisor' ? 'supervisor' : 'teacher') : 'student'),
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
      role: 'supervisor'
    });
  }

  const result = Array.from(map.values());

  // Sort: Super Admin first, then by lastLogin descending
  result.sort((a, b) => {
    if (a.isSuperAdmin) return -1;
    if (b.isSuperAdmin) return 1;
    const timeA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
    const timeB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
    return timeB - timeA;
  });

  return result;
};

const isInvalidOrFakeUser = (name: string, email: string): boolean => {
  const n = (name || '').toLowerCase();
  const e = (email || '').toLowerCase();
  return (
    e.includes('fake') ||
    e.includes('edu.sa') ||
    e.includes('saud.otb') ||
    e.includes('abdulrahman.d') ||
    e.includes('sara') ||
    e.includes('mansour') ||
    n.includes('سعود') ||
    n.includes('عبد الرحمن') ||
    n.includes('ريان') ||
    n.includes('سارة') ||
    n.includes('ساره') ||
    n.includes('المنصور')
  );
};

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAssistantAdmin: boolean;
  canAddContent: boolean;
  canManageSubject: (subjectIdOrName?: string) => boolean;
  registeredUsers: User[];
  assistantAdminEmails: string[];
  isRealtimeConnected: boolean;
  refreshUsers: () => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithGoogleEmail: (email: string, name?: string, avatar?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  updateUserJob: (email: string, jobTitle: string) => Promise<{ success: boolean; message: string }>;
  addAssistantAdmin: (email: string, name: string) => { success: boolean; message: string };
  removeAssistantAdmin: (email: string) => { success: boolean; message: string };
  toggleUserRole: (userId: string) => { success: boolean; message: string };
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authError: string | null;
  setAuthError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

const INITIAL_USERS: User[] = [SUPER_ADMIN_USER];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

  const [assistantAdminEmails, setAssistantAdminEmails] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('thanaweya_assistant_admins');
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
      const saved = localStorage.getItem('thanaweya_registered_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validUsers = deduplicateUsersByEmail(parsed);
          if (validUsers.length > 0) {
            localStorage.setItem('thanaweya_registered_users', JSON.stringify(validUsers));
            return validUsers;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_USERS;
  });

  // App starts with NO logged-in user by default (forcing Login Page entry)
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('thanaweya_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          const isSuper = parsed.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
          const jobTitle = isSuper ? 'المشرف الأساسي' : (parsed.jobTitle || 'طالب');
          const isTeacher = isSuper || (jobTitle !== 'طالب');
          return {
            ...parsed,
            name: parsed.name.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim(),
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
          isSuperAdmin: !!userObj.isSuperAdmin,
          isAssistantAdmin: !!userObj.isAssistantAdmin,
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

        try {
          const docSnap = await getDoc(doc(db, 'users', getSafeUserDocId(cleanEmail)));
          if (docSnap.exists()) {
            const d = docSnap.data();
            if (d && d.jobTitle) {
              existingJobTitle = d.jobTitle;
              existingRole = d.role || (d.jobTitle === 'طالب' ? 'student' : 'teacher');
            }
          }
        } catch (e) {
          console.warn('Cloud user lookup note:', e);
        }

        const isTeacher = isSuper || (existingJobTitle !== 'طالب');
        const rawName = fbUser.displayName || cleanEmail.split('@')[0];
        const cleanName = rawName.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();

        const newUserObj: User = {
          id: fbUser.uid,
          name: cleanName || 'طالب',
          email: cleanEmail,
          avatar:
            fbUser.photoURL ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
          role: isSuper ? 'supervisor' : existingRole,
          jobTitle: existingJobTitle,
          grade: 'أول ثانوي',
          isSuperAdmin: isSuper,
          isAssistantAdmin: !isSuper && isTeacher,
          joinedAt: new Date().toISOString().split('T')[0],
          lastLogin: new Date().toISOString()
        };

        setUser(newUserObj);
        localStorage.setItem('thanaweya_user', JSON.stringify(newUserObj));

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
            const jobTitle = isSuper ? 'المشرف الأساسي' : (data.jobTitle || (data.role === 'supervisor' ? 'مشرف مساعد' : 'طالب'));
            const isTeacher = isSuper || jobTitle !== 'طالب';

            cloudUsers.push({
              id: docSnap.id,
              name: cleanName || 'مستخدم',
              email,
              avatar:
                data.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName || email)}`,
              role: isSuper ? 'supervisor' : (data.role || (isTeacher ? 'teacher' : 'student')),
              jobTitle,
              grade: data.grade || 'أول ثانوي',
              isSuperAdmin: isSuper,
              isAssistantAdmin: !isSuper && isTeacher,
              joinedAt:
                data.joinedAt ||
                (data.lastLogin ? data.lastLogin.split('T')[0] : new Date().toISOString().split('T')[0]),
              lastLogin: data.lastLogin || undefined
            });
          });

          // Ensure deduplicated users with single Super Admin entry
          const merged = deduplicateUsersByEmail(cloudUsers);

          setRegisteredUsers(merged);
          try {
            localStorage.setItem('thanaweya_registered_users', JSON.stringify(merged));
          } catch (e) {
            console.error(e);
          }

          // If current logged-in user's role was updated by super admin in real-time, sync it
          setUser((currentUser) => {
            if (!currentUser || !currentUser.email) return currentUser;
            const myEmail = currentUser.email.toLowerCase();
            const foundInCloud = merged.find((u) => u.email.toLowerCase() === myEmail);
            if (foundInCloud && (foundInCloud.jobTitle !== currentUser.jobTitle || foundInCloud.role !== currentUser.role)) {
              const updated = {
                ...currentUser,
                jobTitle: foundInCloud.jobTitle,
                role: foundInCloud.role,
                isAssistantAdmin: foundInCloud.isAssistantAdmin
              };
              localStorage.setItem('thanaweya_user', JSON.stringify(updated));
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
      if (cloudUsers.length > 0) {
        const merged = deduplicateUsersByEmail(cloudUsers);
        setRegisteredUsers(merged);
        localStorage.setItem('thanaweya_registered_users', JSON.stringify(merged));
      }
    } catch (e) {
      console.warn('Manual refresh users note:', e);
    }
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('thanaweya_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('thanaweya_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('thanaweya_assistant_admins', JSON.stringify(assistantAdminEmails));
  }, [assistantAdminEmails]);

  useEffect(() => {
    localStorage.setItem('thanaweya_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isAssistantAdmin =
    !isSuperAdmin &&
    (user?.role === 'supervisor' || user?.role === 'teacher' || (!!user?.jobTitle && user?.jobTitle !== 'طالب'));

  const canAddContent =
    isSuperAdmin ||
    user?.role === 'supervisor' ||
    user?.role === 'teacher' ||
    (!!user?.jobTitle && user?.jobTitle !== 'طالب');

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
    if (user.jobTitle === 'طالب' || !user.jobTitle) {
      return false;
    }

    // 4. If checking general capability (e.g. is user a teacher?)
    if (!subjectIdOrName) {
      return user.role === 'teacher' || user.jobTitle !== 'طالب';
    }

    const job = user.jobTitle.trim().toLowerCase();
    const target = subjectIdOrName.trim().toLowerCase();

    // 5. Check specific subject assignment:
    if (job.includes('رياضيات')) {
      return target === 'math-1' || target.includes('رياضيات') || target.includes('math');
    }
    if (job.includes('كيمياء')) {
      return target === 'chem-1' || target.includes('كيمياء') || target.includes('chem');
    }
    if (job.includes('بيئة') || job.includes('أحياء') || job.includes('احياء')) {
      return target === 'eco-1' || target.includes('بيئة') || target.includes('بيئه') || target.includes('eco');
    }
    if (job.includes('تقنية') || job.includes('رقمية') || job.includes('حاسب')) {
      return target === 'digi-1' || target.includes('تقنية') || target.includes('رقمية') || target.includes('tech') || target.includes('digi');
    }
    if (job.includes('تفكير') || job.includes('ناقد')) {
      return target === 'think-1' || target.includes('تفكير') || target.includes('ناقد') || target.includes('think') || target.includes('crit');
    }
    if (job.includes('تفسير') || job.includes('قرآن')) {
      return target === 'tafsir-1' || target.includes('تفسير') || target.includes('taf');
    }
    if (job.includes('إنجليزي') || job.includes('انجليزي') || job.includes('english')) {
      return target === 'eng-1' || target.includes('إنجليزي') || target.includes('انجليزي') || target.includes('eng');
    }
    if (job.includes('كفايات') || job.includes('عربي') || job.includes('لغوية')) {
      return target === 'lang-1' || target.includes('كفايات') || target.includes('لغوية') || target.includes('lang');
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
          isSuperAdmin: isSuper,
          isAssistantAdmin: !isSuper && isTeacher,
          joinedAt: new Date().toISOString().split('T')[0],
          lastLogin: new Date().toISOString()
        };

        setUser(newUserObj);
        localStorage.setItem('thanaweya_user', JSON.stringify(newUserObj));
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

    const rawName = name || (existing ? existing.name : cleanEmail.split('@')[0]);
    const cleanName = rawName.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();
    const nowIso = new Date().toISOString();

    if (existing) {
      const jobTitle = isSuper ? 'المشرف الأساسي' : (existing.jobTitle || 'طالب');
      const isTeacher = isSuper || jobTitle !== 'طالب';
      targetUser = {
        ...existing,
        name: cleanName,
        jobTitle,
        isSuperAdmin: isSuper,
        isAssistantAdmin: !isSuper && isTeacher,
        role: isSuper ? 'supervisor' : (isTeacher ? (existing.role === 'supervisor' ? 'supervisor' : 'teacher') : 'student'),
        lastLogin: nowIso
      };
    } else {
      // First time registering -> Guaranteed 'طالب'
      const jobTitle = isSuper ? 'المشرف الأساسي' : 'طالب';
      const isTeacher = isSuper;
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
        isSuperAdmin: isSuper,
        isAssistantAdmin: isTeacher,
        joinedAt: nowIso.split('T')[0],
        lastLogin: nowIso
      };
    }

    setUser(targetUser);
    localStorage.setItem('thanaweya_user', JSON.stringify(targetUser));

    // Update local state instantly with strict deduplication
    setRegisteredUsers((prev) => deduplicateUsersByEmail([targetUser, ...prev]));

    // INSTANT: write to Firestore cloud so supervisor sees them in real time
    await syncUserToCloud(targetUser);

    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setFirebaseUser(null);
    localStorage.removeItem('thanaweya_user');
  };

  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    syncUserToCloud(updated);
  };

  // Update user role / job title (Only Super Admin can do this)
  const updateUserJob = async (email: string, jobTitle: string): Promise<{ success: boolean; message: string }> => {
    if (!isSuperAdmin) {
      return { success: false, message: 'عذراً، فقط المشرف الأساسي يملك صلاحية تعيين وظائف المستخدمين.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return { success: false, message: 'لا يمكن تعديل وظيفة المشرف الأساسي.' };
    }

    const jobOption = USER_JOB_OPTIONS.find((j) => j.value === jobTitle) || USER_JOB_OPTIONS[0];
    const newRole: UserRole = jobOption.role;
    const isTeacherOrSupervisor = jobOption.isSupervisorOrTeacher;

    // Update assistantAdminEmails
    let nextAssistants = assistantAdminEmails.filter((e) => e.toLowerCase() !== cleanEmail);
    if (isTeacherOrSupervisor) {
      nextAssistants.push(cleanEmail);
    }
    setAssistantAdminEmails(nextAssistants);

    // Update registeredUsers state
    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (u.email.toLowerCase() === cleanEmail) {
          return {
            ...u,
            jobTitle: jobOption.value,
            role: newRole,
            isAssistantAdmin: isTeacherOrSupervisor
          };
        }
        return u;
      })
    );

    // If target user is the currently active user (e.g. self-testing)
    if (user && user.email.toLowerCase() === cleanEmail) {
      const updatedSelf = {
        ...user,
        jobTitle: jobOption.value,
        role: newRole,
        isAssistantAdmin: isTeacherOrSupervisor
      };
      setUser(updatedSelf);
      localStorage.setItem('thanaweya_user', JSON.stringify(updatedSelf));
    }

    // Sync to Firestore Cloud immediately
    try {
      const docId = getSafeUserDocId(cleanEmail);
      await setDoc(
        doc(db, 'users', docId),
        {
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
      message: `تم تعيين وظيفة (${jobOption.label}) للمستخدم بنجاح.`
    };
  };

  // Only Super Admin can add assistant admins
  const addAssistantAdmin = (email: string, name: string): { success: boolean; message: string } => {
    if (!isSuperAdmin) {
      return { success: false, message: 'عذراً، فقط حساب المشرف يملك صلاحية إضافة مساعدين.' };
    }

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

  // Only Super Admin can remove assistant admins
  const removeAssistantAdmin = (email: string): { success: boolean; message: string } => {
    if (!isSuperAdmin) {
      return { success: false, message: 'عذراً، فقط حساب المشرف يملك صلاحية إزالة المساعدين.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    updateUserJob(cleanEmail, 'طالب');

    return {
      success: true,
      message: `تم تعيين المستخدم كطالب (مشاهدة وتحميل فقط).`
    };
  };

  const toggleUserRole = (userId: string): { success: boolean; message: string } => {
    if (!isSuperAdmin) {
      return { success: false, message: 'فقط المشرف يملك صلاحية تعديل الأدوار.' };
    }

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
        canAddContent,
        canManageSubject,
        registeredUsers,
        assistantAdminEmails,
        isRealtimeConnected,
        refreshUsers,
        loginWithGoogle,
        loginWithGoogleEmail,
        logout,
        switchRole,
        updateUserJob,
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

