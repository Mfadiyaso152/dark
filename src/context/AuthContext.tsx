import React, { createContext, useContext, useState, useEffect } from 'react';
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
  FirebaseUser
} from '../lib/firebase';

export const SUPER_ADMIN_EMAIL = 'mfb.15.f@gmail.com';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAssistantAdmin: boolean;
  registeredUsers: User[];
  assistantAdminEmails: string[];
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
  joinedAt: '2026-08-15'
};

const INITIAL_USERS: User[] = [SUPER_ADMIN_USER];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

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
          // STRICT filter: Only keep real accounts (e.g. gmail.com or google user, never fake demo data)
          const validUsers = parsed.filter(
            (u) =>
              u.email &&
              (u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ||
                (!u.name.includes('سعود') &&
                  !u.name.includes('عبد الرحمن') &&
                  !u.name.includes('ريان') &&
                  !u.name.includes('سارة') &&
                  !u.name.includes('ساره') &&
                  !u.name.includes('المنصور') &&
                  !u.email.toLowerCase().includes('sara') &&
                  !u.email.toLowerCase().includes('mansour') &&
                  !u.email.includes('fake') &&
                  !u.email.includes('edu.sa') &&
                  !u.email.includes('saud.otb') &&
                  !u.email.includes('abdulrahman.d')))
          );
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
          joinedAt: new Date().toISOString().split('T')[0]
        };

        setUser(newUserObj);
        localStorage.setItem('thanaweya_user', JSON.stringify(newUserObj));

        // Sync user to Firestore if available
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          await setDoc(userDocRef, {
            name: newUserObj.name,
            email: newUserObj.email,
            avatar: newUserObj.avatar,
            role: newUserObj.role,
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.warn('Firestore sync note:', err);
        }

        // Add to local registered users list if not exists
        setRegisteredUsers((prev) => {
          const exists = prev.find((u) => u.email.toLowerCase() === cleanEmail);
          if (exists) {
            return prev.map((u) => (u.email.toLowerCase() === cleanEmail ? { ...u, ...newUserObj } : u));
          }
          return [newUserObj, ...prev];
        });
      }
    });

    return () => unsubscribe();
  }, [assistantAdminEmails]);

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

    if (existing) {
      targetUser = {
        ...existing,
        name: cleanName,
        isSuperAdmin: isSuper,
        isAssistantAdmin: isAsst,
        role: isSuper || isAsst ? 'supervisor' : existing.role
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
        joinedAt: new Date().toISOString().split('T')[0]
      };

      setRegisteredUsers((prev) => [targetUser, ...prev]);
    }

    setUser(targetUser);
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
    setUser({
      ...user,
      role: newRole
    });
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
          joinedAt: new Date().toISOString().split('T')[0]
        };
        return [newUser, ...prev];
      }
    });

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
    setRegisteredUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole, isAssistantAdmin: newRole === 'supervisor' } : u))
    );

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
