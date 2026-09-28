import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Search, 
  Filter, 
  Lightbulb, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Calendar, 
  Trash2, 
  MessageSquare, 
  ChevronDown, 
  ArrowRight, 
  Home, 
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { ZhrawiFeedback } from '../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { safeSetItem, safeGetItem } from '../utils/storage';

interface ZhrawiManagementViewProps {
  onGoToPortal: () => void;
  onGoToMainSite: () => void;
}

const ZHRAWI_PASSCODE = '011421';

export const ZhrawiManagementView: React.FC<ZhrawiManagementViewProps> = ({
  onGoToPortal,
  onGoToMainSite
}) => {
  const { user, isSuperAdmin, isAssistantAdmin, setIsAuthModalOpen } = useAuth();

  // Authentication status
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('zhrawi_access_token') === ZHRAWI_PASSCODE;
    } catch {
      return false;
    }
  });

  // Check if current user is an authorized staff/admin
  const isAuthorizedAccount = useMemo(() => {
    if (!user) return false;
    const emailLower = (user.email || '').toLowerCase().trim();
    if (emailLower === 'mfb.15.f@gmail.com') return true;
    if (isSuperAdmin || isAssistantAdmin) return true;
    if ((user as any).role === 'supervisor' || (user as any).role === 'admin') return true;
    if (user.jobTitle === 'المشرف الأساسي' || user.jobTitle === 'مشرف مساعد' || user.jobTitle === 'المرشد الطلابي') return true;
    return false;
  }, [user, isSuperAdmin, isAssistantAdmin]);

  // Overall access allowed
  const hasAccess = isUnlocked || isAuthorizedAccount;

  // Feedback items list
  const [feedbacks, setFeedbacks] = useState<ZhrawiFeedback[]>(() => {
    try {
      const saved = safeGetItem('zhrawi_feedbacks_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'suggestion' | 'complaint'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_review' | 'resolved'>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ZhrawiFeedback | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Auto-sync with Firestore collection `zhrawi_feedback`
  useEffect(() => {
    if (!hasAccess) return;

    setIsLoading(true);
    const colRef = collection(db, 'zhrawi_feedback');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: ZhrawiFeedback[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && !data.isDeleted) {
          list.push({
            id: docSnap.id,
            type: data.type || 'suggestion',
            title: data.title || '',
            content: data.content || '',
            studentName: data.studentName || '',
            studentEmail: data.studentEmail || '',
            studentGrade: data.studentGrade || 'الأول ثانوي',
            studentClass: data.studentClass || '',
            phone: data.phone || '',
            createdAt: data.createdAt || new Date().toISOString(),
            status: data.status || 'pending',
            adminNotes: data.adminNotes || '',
            resolvedAt: data.resolvedAt || '',
            resolvedBy: data.resolvedBy || ''
          });
        }
      });

      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setFeedbacks(list);
      safeSetItem('zhrawi_feedbacks_cache', JSON.stringify(list));
      setIsLoading(false);
    }, (err) => {
      console.warn('Firestore zhrawi_feedback note:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [hasAccess]);

  // Handle Passcode Submit
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === ZHRAWI_PASSCODE) {
      setIsUnlocked(true);
      try {
        sessionStorage.setItem('zhrawi_access_token', ZHRAWI_PASSCODE);
      } catch {}
      setPasscodeError('');
    } else {
      setPasscodeError('رمز المرور غير صحيح، يرجى التحقق وإعادة المحاولة.');
    }
  };

  // Update Feedback Status
  const handleUpdateStatus = async (item: ZhrawiFeedback, newStatus: ZhrawiFeedback['status']) => {
    try {
      const docRef = doc(db, 'zhrawi_feedback', item.id);
      const updatePayload: Partial<ZhrawiFeedback> = {
        status: newStatus,
        resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : '',
        resolvedBy: newStatus === 'resolved' ? (user?.name || 'إدارة المدرسة') : ''
      };

      await updateDoc(docRef, updatePayload as any);

      // Local update
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, ...updatePayload } : f))
      );

      if (selectedItem?.id === item.id) {
        setSelectedItem((prev) => prev ? { ...prev, ...updatePayload } : null);
      }

      showNotification('تم تحديث حالة الرسالة بنجاح.');
    } catch (err) {
      console.error(err);
      // Local fallback
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: newStatus } : f))
      );
      showNotification('تم الحفظ محلياً.');
    }
  };

  // Save Admin Note
  const handleSaveAdminNote = async () => {
    if (!selectedItem) return;
    setIsSavingNote(true);

    try {
      const docRef = doc(db, 'zhrawi_feedback', selectedItem.id);
      await updateDoc(docRef, {
        adminNotes: adminNoteInput,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.name || 'المرشد الطلابي'
      });

      setFeedbacks((prev) =>
        prev.map((f) => (f.id === selectedItem.id ? { ...f, adminNotes: adminNoteInput } : f))
      );
      setSelectedItem((prev) => prev ? { ...prev, adminNotes: adminNoteInput } : null);
      showNotification('تم حفظ الملاحظة الإدارية بنجاح.');
    } catch (err) {
      console.error(err);
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === selectedItem.id ? { ...f, adminNotes: adminNoteInput } : f))
      );
      showNotification('تم حفظ الملاحظة محلياً.');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Delete Feedback
  const handleDeleteFeedback = async (item: ZhrawiFeedback) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة نهائياً؟')) return;

    try {
      await deleteDoc(doc(db, 'zhrawi_feedback', item.id));
    } catch (err) {
      console.warn(err);
    }

    setFeedbacks((prev) => prev.filter((f) => f.id !== item.id));
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
    }
    showNotification('تم حذف الرسالة بنجاح.');
  };

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => {
      setActionSuccessMessage(null);
    }, 3000);
  };

  // Filtered List
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (filterGrade !== 'all' && item.studentGrade !== filterGrade) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inName = item.studentName.toLowerCase().includes(q);
        const inEmail = item.studentEmail.toLowerCase().includes(q);
        const inTitle = item.title.toLowerCase().includes(q);
        const inContent = item.content.toLowerCase().includes(q);
        const inPhone = (item.phone || '').includes(q);
        if (!inName && !inEmail && !inTitle && !inContent && !inPhone) return false;
      }

      return true;
    });
  }, [feedbacks, filterType, filterStatus, filterGrade, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const suggestions = feedbacks.filter((f) => f.type === 'suggestion').length;
    const complaints = feedbacks.filter((f) => f.type === 'complaint').length;
    const pending = feedbacks.filter((f) => f.status === 'pending' || f.status === 'in_review').length;
    const resolved = feedbacks.filter((f) => f.status === 'resolved').length;
    return { total, suggestions, complaints, pending, resolved };
  }, [feedbacks]);

  // Helper format Gregorian Date
  const formatGregorianDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        calendar: 'gregory'
      }).format(d);
    } catch {
      return isoStr;
    }
  };

  // ==========================================
  // VIEW: Passcode Lock Screen (If Not Authorized)
  // ==========================================
  if (!hasAccess) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden text-slate-100 font-['IBM_Plex_Sans_Arabic',sans-serif]">
        {/* Background glow & mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6"
        >
          {/* Header Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/20 text-white">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-sky-400 bg-sky-950/60 border border-sky-800/60 px-3 py-1 rounded-full">
              بوابة خاصة • ثانوية الزهراوي
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              لوحة المرشد الطلابي وإدارة المدرسة
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              هذه الصفحة مخصصة فقط للكادر الإداري والمرشد الطلابي لمتابعة المقترحات والشكاوى الواردة، ومحمية بكلمة المرور المعتمدة والحسابات الموثقة.
            </p>
          </div>

          {/* Passcode Form */}
          <form onSubmit={handlePasscodeSubmit} className="space-y-4 text-right">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                <span>رمز المرور السري (Passcode)</span>
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setPasscodeError('');
                }}
                placeholder="أدخل رمز المرور المعتمد..."
                autoFocus
                className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700/80 focus:border-sky-500 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition text-center tracking-widest font-mono"
              />
              {passcodeError && (
                <p className="text-xs text-rose-400 font-bold flex items-center gap-1 pt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{passcodeError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:scale-98 text-white rounded-2xl text-sm font-black transition shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>التحقق وفتح اللوحة</span>
            </button>
          </form>

          {/* Alternative: Sign In with Google */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <p className="text-xs text-slate-400">
              أو تسجيل الدخول بالحساب الإداري المعتمد من قبل الإدارة:
            </p>
            {user ? (
              <div className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                أنت مسجل حالياً بـ: <span className="text-sky-400 font-bold">{user.email}</span> (غير مصرح كإدارة، يرجى استخدام رمز المرور).
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-700"
              >
                <span>تسجيل الدخول بحساب Google المعتمد</span>
              </button>
            )}

            <button
              type="button"
              onClick={onGoToPortal}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-bold pt-2 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة لصفحة البداية لثانوية الزهراوي</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // VIEW: Authorized Zhrawi Dashboard
  // ==========================================
  return (
    <div dir="rtl" className="min-h-screen bg-[#FBFBFA] text-slate-900 font-['IBM_Plex_Sans_Arabic',sans-serif] selection:bg-sky-600 selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {actionSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs sm:text-sm font-bold border border-white/10"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900">
                  لوحة المرشد الطلابي وإدارة ثانوية الزهراوي
                </h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full border border-emerald-200">
                  نظام موثق
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                متابعة المقترحات، الشكاوى، وبلاغات الطلاب وأولياء الأمور
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGoToPortal}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">بوابة المدرسة</span>
            </button>
            <button
              onClick={onGoToMainSite}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>منصة زاد</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Statistics Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
            <span className="text-xs font-bold text-slate-500">إجمالي الرسائل</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</span>
              <MessageSquare className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-amber-200/80 shadow-2xs space-y-1">
            <span className="text-xs font-bold text-amber-700">المقترحات التطويرية</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-amber-900">{stats.suggestions}</span>
              <Lightbulb className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-rose-200/80 shadow-2xs space-y-1">
            <span className="text-xs font-bold text-rose-700">الشكاوى والبلاغات</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-rose-900">{stats.complaints}</span>
              <AlertCircle className="w-5 h-5 text-rose-500" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-200/80 shadow-2xs space-y-1">
            <span className="text-xs font-bold text-emerald-700">تمت المعالجة والإغلاق</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-900">{stats.resolved}</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث بالاسم، البريد، العنوان، رقم الجوال أو المحتوى..."
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Type Filter */}
              <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الكل ({stats.total})
                </button>
                <button
                  onClick={() => setFilterType('suggestion')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    filterType === 'suggestion' ? 'bg-amber-50 text-amber-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lightbulb className="w-3 h-3 text-amber-500" />
                  <span>اقتراحات ({stats.suggestions})</span>
                </button>
                <button
                  onClick={() => setFilterType('complaint')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    filterType === 'complaint' ? 'bg-rose-50 text-rose-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  <span>شكاوى ({stats.complaints})</span>
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-500 transition"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="in_review">قيد المراجعة</option>
                <option value="resolved">تمت المعالجة</option>
              </select>

              {/* Grade Filter */}
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-sky-500 transition"
              >
                <option value="all">جميع المراحل</option>
                <option value="الأول ثانوي">الصف الأول ثانوي</option>
                <option value="الثاني ثانوي">الصف الثاني ثانوي</option>
                <option value="الثالث ثانوي">الصف الثالث ثانوي</option>
                <option value="ولي أمر">أولياء الأمور</option>
                <option value="معلم/كادر">معلمون / منسوبون</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Layout: List on Right, Detail Modal / Drawer */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-2xs space-y-3">
            <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-600">جاري تحميل رسائل ثانوية الزهراوي...</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-2xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-900">لا توجد رسائل مطابقة للبحث</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              لم يتم العثور على اقتراحات أو شكاوى وفق خيارات الفلترة المحددة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeedbacks.map((item) => {
              const isSuggestion = item.type === 'suggestion';
              return (
                <motion.div
                  key={item.id}
                  layout
                  className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between space-y-4 hover:shadow-md cursor-pointer ${
                    selectedItem?.id === item.id ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200/90'
                  }`}
                  onClick={() => {
                    setSelectedItem(item);
                    setAdminNoteInput(item.adminNotes || '');
                  }}
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full border ${
                          isSuggestion
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {isSuggestion ? <Lightbulb className="w-3 h-3 text-amber-500" /> : <AlertCircle className="w-3 h-3 text-rose-500" />}
                        <span>{isSuggestion ? 'اقتراح تطويري' : 'شكوى / بلاغ'}</span>
                      </span>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          item.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'in_review'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.status === 'resolved'
                          ? 'تمت المعالجة'
                          : item.status === 'in_review'
                          ? 'قيد المراجعة'
                          : 'جديد / بالانتظار'}
                      </span>
                    </div>

                    {/* Title & Preview */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-900 line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    {/* Student Info */}
                    <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1 text-slate-500">
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                        <User className="w-3.5 h-3.5 text-sky-600" />
                        <span>{item.studentName || 'مجهول'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-normal">
                          {item.studentGrade} {item.studentClass ? `(${item.studentClass})` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{item.studentEmail}</span>
                      </div>

                      {item.phone && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{item.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Date & Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatGregorianDate(item.createdAt)}</span>
                    </span>
                    <span className="text-sky-600 font-bold hover:underline">
                      عرض ومتابعة ←
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail & Action Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full border ${
                      selectedItem.type === 'suggestion'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    {selectedItem.type === 'suggestion' ? <Lightbulb className="w-3.5 h-3.5 text-amber-600" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                    <span>{selectedItem.type === 'suggestion' ? 'اقتراح' : 'شكوى'}</span>
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {formatGregorianDate(selectedItem.createdAt)}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-black cursor-pointer transition"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-right">
                {/* Subject Title & Details */}
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                    {selectedItem.title}
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedItem.content}
                  </div>
                </div>

                {/* Sender Profile Cards */}
                <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100 space-y-2">
                  <h4 className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-sky-600" />
                    <span>بيانات صاحب الرسالة / الطالب:</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                    <div>
                      <span className="font-bold text-slate-900">الاسم الكامل: </span>
                      <span>{selectedItem.studentName}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">المرحلة: </span>
                      <span>{selectedItem.studentGrade} {selectedItem.studentClass ? `(${selectedItem.studentClass})` : ''}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">البريد الإلكتروني: </span>
                      <a href={`mailto:${selectedItem.studentEmail}`} className="text-sky-600 underline">
                        {selectedItem.studentEmail}
                      </a>
                    </div>
                    {selectedItem.phone && (
                      <div>
                        <span className="font-bold text-slate-900">رقم التواصل: </span>
                        <a href={`tel:${selectedItem.phone}`} className="text-emerald-700 font-mono font-bold">
                          {selectedItem.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Changer */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800">
                    تحديث حالة البلاغ:
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedItem, 'pending')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        selectedItem.status === 'pending'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      جديد / بالانتظار
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedItem, 'in_review')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        selectedItem.status === 'in_review'
                          ? 'bg-sky-100 text-sky-900 border-sky-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      قيد المراجعة والمتابعة
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedItem, 'resolved')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        selectedItem.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      تمت المعالجة والإغلاق
                    </button>
                  </div>
                </div>

                {/* Internal Admin Notes */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>ملاحظات المرشد الطلابي / الإدارة الداخلية:</span>
                    {selectedItem.resolvedBy && (
                      <span className="text-[10px] text-slate-500 font-normal">
                        آخر إجراء بواسطة: {selectedItem.resolvedBy}
                      </span>
                    )}
                  </label>
                  <textarea
                    rows={3}
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="اكتب ملاحظات داخلية حول الإجراء المتخذ، التواصل مع الطالب أو ولي الأمر، أو قرار الإدارة..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleSaveAdminNote}
                      disabled={isSavingNote}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingNote ? 'جاري الحفظ...' : 'حفظ الملاحظة الإدارية'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteFeedback(selectedItem)}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الرسالة</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
