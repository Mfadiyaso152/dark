import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { AppNotification } from '../types';
import { useAuth, formatDisplayName } from './AuthContext';
import { db, collection, doc, onSnapshot, setDoc, deleteDoc } from '../lib/firebase';
import { INITIAL_SUBJECTS } from '../data/initialData';

interface NotificationsContextType {
  notifications: AppNotification[];
  myNotifications: AppNotification[];
  unreadCount: number;
  isNotificationsModalOpen: boolean;
  openNotificationsModal: () => void;
  closeNotificationsModal: () => void;
  sendNotification: (params: {
    title: string;
    message: string;
    subjectId?: string;
    subjectName?: string;
    linkUrl?: string;
  }) => Promise<{ success: boolean; message: string }>;
  deleteNotification: (id: string) => Promise<{ success: boolean; message: string }>;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  isTeacher: boolean;
  isSupervisor: boolean;
  isStudent: boolean;
  teacherAssignedSubjects: typeof INITIAL_SUBJECTS;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const LOCAL_STORAGE_NOTIFS_KEY = 'thanaweya_notifications_cache';

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin, isAssistantAdmin, canManageSubject } = useAuth();

  const [rawNotifications, setRawNotifications] = useState<AppNotification[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const storageKey = `thanaweya_read_notifs_${user?.email || 'guest'}`;
      const cached = localStorage.getItem(storageKey);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Role detection
  const isSupervisor =
    isSuperAdmin ||
    user?.email?.toLowerCase() === 'mfb.15.f@gmail.com' ||
    user?.email?.toLowerCase() === 'kalshrby90@gmail.com' ||
    user?.jobTitle === 'مشرف مساعد' ||
    user?.jobTitle === 'المشرف الأساسي' ||
    user?.role === 'supervisor';

  const isTeacher =
    !isSupervisor &&
    (user?.role === 'teacher' || (!!user?.jobTitle && user?.jobTitle !== 'طالب'));

  const isStudent = !isSupervisor && !isTeacher;

  // Subjects assigned to the teacher
  const teacherAssignedSubjects = useMemo(() => {
    if (isTeacher) {
      const filtered = INITIAL_SUBJECTS.filter((s) => canManageSubject(s.id));
      return filtered.length > 0 ? filtered : INITIAL_SUBJECTS;
    }
    return INITIAL_SUBJECTS;
  }, [isTeacher, canManageSubject]);

  // Update read IDs when user switches or loads
  useEffect(() => {
    try {
      const storageKey = `thanaweya_read_notifs_${user?.email || 'guest'}`;
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        setReadNotificationIds(JSON.parse(cached));
      } else {
        setReadNotificationIds([]);
      }
    } catch {
      setReadNotificationIds([]);
    }
  }, [user?.email]);

  // Sync with Firestore collection 'notifications' in real-time
  useEffect(() => {
    try {
      const notifsCol = collection(db, 'notifications');
      const unsubscribe = onSnapshot(
        notifsCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: AppNotification[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as AppNotification;
              if (data && !data.isDeleted) {
                list.push({ ...data, id: docSnap.id });
              }
            });

            // Sort newest first
            list.sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            });

            setRawNotifications(list);
            try {
              localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(list));
            } catch (err) {
              console.warn('LocalStorage save error:', err);
            }
          } else {
            // Snapshot returned empty
            setRawNotifications([]);
          }
        },
        (error) => {
          console.warn('Real-time notifications onSnapshot listener error:', error);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore notifications listener setup error:', e);
    }
  }, []);

  // Filtered active notifications
  const notifications = useMemo(() => {
    return rawNotifications.filter((n) => !n.isDeleted);
  }, [rawNotifications]);

  // Notifications sent by this teacher / supervisor
  const myNotifications = useMemo(() => {
    if (!user) return [];
    const cleanEmail = user.email?.toLowerCase().trim();
    return notifications.filter((n) => {
      const authorEmail = n.authorEmail?.toLowerCase().trim();
      return (
        (cleanEmail && authorEmail === cleanEmail) ||
        (n.authorId && n.authorId === user.id)
      );
    });
  }, [notifications, user]);

  // Calculate unread count for students & users
  const unreadCount = useMemo(() => {
    // If teacher, they focus on their dashboard, but can still see unread if they want
    return notifications.filter((n) => !readNotificationIds.includes(n.id)).length;
  }, [notifications, readNotificationIds]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadNotificationIds(allIds);
    try {
      const storageKey = `thanaweya_read_notifs_${user?.email || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(allIds));
    } catch (err) {
      console.warn('Failed to save read notifications to localStorage:', err);
    }
  }, [notifications, user?.email]);

  // Mark single as read
  const markAsRead = useCallback(
    (id: string) => {
      if (!readNotificationIds.includes(id)) {
        const updated = [...readNotificationIds, id];
        setReadNotificationIds(updated);
        try {
          const storageKey = `thanaweya_read_notifs_${user?.email || 'guest'}`;
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (err) {
          console.warn('Failed to save read notification to localStorage:', err);
        }
      }
    },
    [readNotificationIds, user?.email]
  );

  const openNotificationsModal = useCallback(() => {
    setIsNotificationsModalOpen(true);
    // Automatically mark all as read when opening modal for students
    markAllAsRead();
  }, [markAllAsRead]);

  const closeNotificationsModal = useCallback(() => {
    setIsNotificationsModalOpen(false);
  }, []);

  // Send Notification instantly
  const sendNotification = async (params: {
    title: string;
    message: string;
    subjectId?: string;
    subjectName?: string;
    linkUrl?: string;
  }): Promise<{ success: boolean; message: string }> => {
    if (!params.title.trim()) {
      return { success: false, message: 'يرجى إدخال عنوان الإشعار' };
    }
    if (!params.message.trim()) {
      return { success: false, message: 'يرجى إدخال نص الإشعار' };
    }

    try {
      const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      
      let finalSubjectId = params.subjectId || 'general';
      let finalSubjectName = params.subjectName || 'إشعار عام';

      // If teacher, make sure it matches their assigned subject
      if (isTeacher && teacherAssignedSubjects.length > 0) {
        if (!params.subjectId || params.subjectId === 'general') {
          finalSubjectId = teacherAssignedSubjects[0].id;
          finalSubjectName = teacherAssignedSubjects[0].name;
        }
      }

      let sanitizedLink = params.linkUrl?.trim() || '';
      if (sanitizedLink && !/^https?:\/\//i.test(sanitizedLink)) {
        sanitizedLink = `https://${sanitizedLink}`;
      }

      const formattedAuthorName = user?.name
        ? formatDisplayName(user.name, isTeacher || isSupervisor)
        : isSupervisor
        ? 'إدارة المنصة'
        : 'أستاذ المادة';

      const newNotif: AppNotification = {
        id: notifId,
        title: params.title.trim(),
        message: params.message.trim(),
        subjectId: finalSubjectId,
        subjectName: finalSubjectName,
        linkUrl: sanitizedLink || undefined,
        authorId: user?.id || 'admin',
        authorEmail: user?.email || '',
        authorName: formattedAuthorName,
        authorJobTitle: user?.jobTitle || (isSupervisor ? 'المشرف' : 'معلم'),
        createdAt: new Date().toISOString(),
        isDeleted: false
      };

      // Optimistic local update
      setRawNotifications((prev) => [newNotif, ...prev]);

      // Push to Firestore real-time collection
      await setDoc(doc(db, 'notifications', notifId), newNotif, { merge: true });

      return { success: true, message: 'تم إرسال الإشعار لجميع الطلاب بنجاح وبشكل فوري!' };
    } catch (error) {
      console.error('Error sending notification to Firestore:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء إرسال الإشعار. تم حفظه محلياً.'
      };
    }
  };

  // Delete notification
  const deleteNotification = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Optimistic update
      setRawNotifications((prev) => prev.filter((n) => n.id !== id));

      // Mark as deleted in Firestore
      await setDoc(
        doc(db, 'notifications', id),
        { isDeleted: true, updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch(async () => {
        await deleteDoc(doc(db, 'notifications', id));
      });

      return { success: true, message: 'تم حذف الإشعار بنجاح' };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, message: 'حدث خطأ أثناء حذف الإشعار' };
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        myNotifications,
        unreadCount,
        isNotificationsModalOpen,
        openNotificationsModal,
        closeNotificationsModal,
        sendNotification,
        deleteNotification,
        markAllAsRead,
        markAsRead,
        isTeacher,
        isSupervisor,
        isStudent,
        teacherAssignedSubjects
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
