import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
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

    if (!map.has(emailKey)) {
      map.set(emailKey, {
        ...u,
        email: emailKey,
        isSuperAdmin: isSuper,
        role: isSuper ? 'supervisor' : u.role
      });
    } else {
      const existing = map.get(emailKey)!;
      const lastLogin =
        u.lastLogin && (!existing.lastLogin || new Date(u.lastLogin) > new Date(existing.lastLogin))
          ? u.lastLogin
          : existing.lastLogin;
      const avatar = u.avatar && !u.avatar.includes('dicebear') ? u.avatar : existing.avatar;

      map.set(emailKey, {
        ...existing,
        ...u,
        name: isSuper ? (u.name || existing.name) : (existing.name || u.name),
        isSuperAdmin: isSuper,
        role: isSuper ? 'supervisor' : (u.role === 'supervisor' || existing.role === 'supervisor' ? 'supervisor' : 'student'),
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
  registeredUsers: User[];
  assistantAdminEmails: string[];
  isRealtimeConnected: boolean;
  refreshUsers: () => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithGoogleEmail: (email: string, name?: string, avatar?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
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
          const isAsst = !isSuper && (parsed.isAssistantAdmin || parsed.role === 'supervisor');
          return {
            ...parsed,
            name: parsed.name.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim(),
            isSuperAdmin: isSuper,
            isAssistantAdmin: isAsst,
            role: isSuper || isAsst ? 'supervisor' : parsed.role || 'student'
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
        const isAsst = !isSuper && assistantAdminEmails.some((e) => e.toLowerCase() === cleanEmail);
        
        const rawName = fbUser.displayName || cleanEmail.split('@')[0];
        const cleanName = rawName.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();

        const newUserObj: User = {
          id: fbUser.uid,
          name: cleanName || 'طالب',
          email: cleanEmail,
          avatar:
            fbUser.photoURL ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
          role: isSuper || isAsst ? 'supervisor' : 'student',
          grade: 'أول ثانوي',
          isSuperAdmin: isSuper,
          isAssistantAdmin: isAsst,
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
  }, [assistantAdminEmails, syncUserToCloud]);

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
            const isAsst =
              !isSuper &&
              (assistantAdminEmails.some((e) => e.toLowerCase() === email) ||
                data.role === 'supervisor' ||
                data.isAssistantAdmin === true);

            cloudUsers.push({
              id: docSnap.id,
              name: cleanName || 'مستخدم',
              email,
              avatar:
                data.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName || email)}`,
              role: isSuper || isAsst ? 'supervisor' : 'student',
              grade: data.grade || 'أول ثانوي',
              isSuperAdmin: isSuper,
              isAssistantAdmin: isAsst,
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
  }, [assistantAdminEmails]);

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
          const isAsst = !isSuper && (assistantAdminEmails.includes(email) || data.role === 'supervisor');
          cloudUsers.push({
            id: docSnap.id,
            name: cleanName,
            email,
            avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
            role: isSuper || isAsst ? 'supervisor' : 'student',
            grade: data.grade || 'أول ثانوي',
            isSuperAdmin: isSuper,
            isAssistantAdmin: isAsst,
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
    (user?.role === 'supervisor' || assistantAdminEmails.some((e) => e.toLowerCase() === user?.email?.toLowerCase()));

  // Real Google Sign-In with Firebase Auth
  const loginWithGoogle = async (): Promise<boolean> => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && result.user.email) {
        const cleanEmail = result.user.email.toLowerCase().trim();
        const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
        const isAsst = !isSuper && assistantAdminEmails.some((e) => e.toLowerCase() === cleanEmail);
        const rawName = result.user.displayName || cleanEmail.split('@')[0];
        const cleanName = rawName.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();

        const newUserObj: User = {
          id: result.user.uid,
          name: cleanName || 'طالب',
          email: cleanEmail,
          avatar:
            result.user.photoURL ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
          role: isSuper || isAsst ? 'supervisor' : 'student',
          grade: 'أول ثانوي',
          isSuperAdmin: isSuper,
          isAssistantAdmin: isAsst,
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
    const isAsst = !isSuper && assistantAdminEmails.some((e) => e.toLowerCase() === cleanEmail);

    let existing = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    let targetUser: User;

    const rawName = name || (existing ? existing.name : cleanEmail.split('@')[0]);
    const cleanName = rawName.replace(/^(أ\.|أستاذ\s*|\(المدير العام\))/g, '').trim();
    const nowIso = new Date().toISOString();

    if (existing) {
      targetUser = {
        ...existing,
        name: cleanName,
        isSuperAdmin: isSuper,
        isAssistantAdmin: isAsst,
        role: isSuper || isAsst ? 'supervisor' : existing.role,
        lastLogin: nowIso
      };
    } else {
      targetUser = {
        id: `user-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        avatar:
          avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        role: isSuper || isAsst ? 'supervisor' : 'student',
        grade: 'أول ثانوي',
        isSuperAdmin: isSuper,
        isAssistantAdmin: isAsst,
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

    if (assistantAdminEmails.some((e) => e.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'هذا المستخدم مضاف بالفعل كمساعد' };
    }

    const updatedAssistants = [...assistantAdminEmails, cleanEmail];
    setAssistantAdminEmails(updatedAssistants);

    setRegisteredUsers((prev) => {
      const exists = prev.find((u) => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        return prev.map((u) =>
          u.email.toLowerCase() === cleanEmail
            ? { ...u, role: 'supervisor', isAssistantAdmin: true }
            : u
        );
      } else {
        const cleanName = (name || cleanEmail.split('@')[0]).replace(/^(أ\.|أستاذ\s*)/g, '').trim();
        const newUser: User = {
          id: `asst-${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
          role: 'supervisor',
          grade: 'أول ثانوي',
          isSuperAdmin: false,
          isAssistantAdmin: true,
          joinedAt: new Date().toISOString().split('T')[0],
          lastLogin: new Date().toISOString()
        };
        return [newUser, ...prev];
      }
    });

    // Also update in Firestore cloud
    const docId = getSafeUserDocId(cleanEmail);
    setDoc(doc(db, 'users', docId), { role: 'supervisor', isAssistantAdmin: true }, { merge: true }).catch(console.warn);

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
    const updatedAssistants = assistantAdminEmails.filter((e) => e.toLowerCase() !== cleanEmail);
    setAssistantAdminEmails(updatedAssistants);

    setRegisteredUsers((prev) =>
      prev.map((u) =>
        u.email.toLowerCase() === cleanEmail
          ? { ...u, role: 'student', isAssistantAdmin: false }
          : u
      )
    );

    // Also update in Firestore cloud
    const docId = getSafeUserDocId(cleanEmail);
    setDoc(doc(db, 'users', docId), { role: 'student', isAssistantAdmin: false }, { merge: true }).catch(console.warn);

    return {
      success: true,
      message: `تم إلغاء الصلاحية عن (${cleanEmail}).`
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

    const newRole: UserRole = target.role === 'supervisor' ? 'student' : 'supervisor';
    const isAsst = newRole === 'supervisor';

    setRegisteredUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole, isAssistantAdmin: isAsst } : u))
    );

    // Also update in Firestore cloud
    const docId = getSafeUserDocId(target.email);
    setDoc(doc(db, 'users', docId), { role: newRole, isAssistantAdmin: isAsst }, { merge: true }).catch(console.warn);

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
        registeredUsers,
        assistantAdminEmails,
        isRealtimeConnected,
        refreshUsers,
        loginWithGoogle,
        loginWithGoogleEmail,
        logout,
        switchRole,
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
