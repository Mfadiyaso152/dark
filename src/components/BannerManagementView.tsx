import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Clock,
  Smartphone,
  Tablet,
  Monitor,
  Info,
  Sparkles,
  Link as LinkIcon,
  Upload,
  Check,
  Pencil,
  Cloud,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { BannerItem, BannerSettings } from '../types';

interface BannerManagementViewProps {
  banners: BannerItem[];
  settings: BannerSettings;
  onSaveBanners: (newBanners: BannerItem[]) => void;
  onSaveSettings: (newSettings: BannerSettings) => void;
  onToggleBannerActive?: (bannerId: string, isActive: boolean) => Promise<void> | void;
  onDeleteBanner?: (bannerId: string) => Promise<void> | void;
  onAddBanner?: (newBanner: BannerItem) => Promise<void> | void;
  onUpdateBanner?: (updatedBanner: BannerItem) => Promise<void> | void;
}

// Compress and optimize banner images so they stay crisp, load fast, and never exceed Firestore document limits
const optimizeBannerImage = (file: File, maxDim: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (dataUrl.length > 500 * 1024) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const BannerManagementView: React.FC<BannerManagementViewProps> = ({
  banners,
  settings,
  onSaveBanners,
  onSaveSettings,
  onToggleBannerActive,
  onDeleteBanner,
  onAddBanner,
  onUpdateBanner
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'banners' | 'settings' | 'sizes'>('banners');

  // Form state for adding a new banner with 3 device options
  const [isAdding, setIsAdding] = useState(false);
  const [mobileImageUrl, setMobileImageUrl] = useState('');
  const [tabletImageUrl, setTabletImageUrl] = useState('');
  const [desktopImageUrl, setDesktopImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for editing existing banner texts & link
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');

  // Confirmation state for deleting a banner
  const [bannerToDelete, setBannerToDelete] = useState<BannerItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings state
  const [autoPlay, setAutoPlay] = useState(settings?.autoPlay !== false);
  const [intervalSeconds, setIntervalSeconds] = useState(settings?.intervalSeconds || 5);

  const showTempSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const handleStartEdit = (banner: BannerItem) => {
    setEditingBanner(banner);
    setEditTitle(banner.title || '');
    setEditDescription(banner.description || '');
    setEditLinkUrl(banner.linkUrl || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;

    try {
      setIsSubmitting(true);
      const updatedBanner: BannerItem = {
        ...editingBanner,
        title: editTitle.trim() || undefined,
        description: editDescription.trim() || undefined,
        linkUrl: editLinkUrl.trim() || undefined
      };

      if (onUpdateBanner) {
        await onUpdateBanner(updatedBanner);
      } else {
        const updated = banners.map((b) => (b.id === editingBanner.id ? updatedBanner : b));
        onSaveBanners(updated);
      }

      setEditingBanner(null);
      showTempSuccess('تم حفظ تعديلات الإعلان ومزامنتها سحابياً لجميع المستخدمين لحظياً!');
    } catch (err) {
      console.error(err);
      showTempSuccess('تعذر حفظ التعديل سحابياً');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Image File Upload for individual device sizes with Canvas optimization
  const handleDeviceFileUpload = async (
    device: 'mobile' | 'tablet' | 'desktop',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('يرجى اختيار ملف صورة صالحة (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFormError('حجم الصورة كبير جداً. يفضل اختيار صورة أقل من 15 ميجابايت.');
      return;
    }

    try {
      setIsProcessingImage(true);
      const maxDim = device === 'mobile' ? 800 : device === 'tablet' ? 1200 : 1600;
      const optimized = await optimizeBannerImage(file, maxDim);
      if (device === 'mobile') setMobileImageUrl(optimized);
      if (device === 'tablet') setTabletImageUrl(optimized);
      if (device === 'desktop') setDesktopImageUrl(optimized);
      setFormError('');
    } catch (err) {
      console.error('Image compression error:', err);
      setFormError('تعذر معالجة الصورة، يرجى اختيار صورة أخرى');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const mainUrl = mobileImageUrl || tabletImageUrl || desktopImageUrl;
    if (!mainUrl) {
      setFormError('يرجى رفع صورة واحدة على الأقل لأحد الأجهزة (جوال، أيباد، أو كمبيوتر)');
      return;
    }

    try {
      setIsSubmitting(true);
      const newBanner: BannerItem = {
        id: `banner-${Date.now()}`,
        imageUrl: mainUrl,
        mobileImageUrl: mobileImageUrl.trim() || undefined,
        tabletImageUrl: tabletImageUrl.trim() || undefined,
        desktopImageUrl: desktopImageUrl.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
        isActive,
        createdAt: new Date().toISOString(),
        order: banners.length + 1
      };

      if (onAddBanner) {
        await onAddBanner(newBanner);
      } else {
        const updated = [newBanner, ...banners];
        onSaveBanners(updated);
      }

      // Reset Form & Show Instant Feedback
      setMobileImageUrl('');
      setTabletImageUrl('');
      setDesktopImageUrl('');
      setTitle('');
      setDescription('');
      setLinkUrl('');
      setIsActive(true);
      setFormError('');
      setIsAdding(false);
      showTempSuccess('تمت إضافة الإعلان بنجاح ومزامنته سحابياً لجميع المستخدمين لحظياً!');
    } catch (err) {
      console.error(err);
      setFormError('حدث خطأ أثناء حفظ الإعلان سحابياً');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle banner active state (تفعيل / إلغاء تفعيل) - Instant Real-time Cloud Sync
  const handleToggleBannerActive = async (bannerId: string) => {
    const target = banners.find((b) => b.id === bannerId);
    if (!target) return;
    const newActiveState = target.isActive === false;

    if (onToggleBannerActive) {
      await onToggleBannerActive(bannerId, newActiveState);
    } else {
      const updated = banners.map((b) => (b.id === bannerId ? { ...b, isActive: newActiveState } : b));
      onSaveBanners(updated);
    }

    showTempSuccess(newActiveState ? 'تم تفعيل الإعلان وسينتقل فوراً للشاشة الرئيسية لجميع الطلاب!' : 'تم تعطيل الإعلان وإخفاؤه عن جميع الطلاب لحظياً!');
  };

  // Delete banner - Built-in in-app confirmation modal (works 100% reliably in any browser / iframe)
  const handlePromptDelete = (banner: BannerItem) => {
    setBannerToDelete(banner);
  };

  const handleConfirmDelete = async () => {
    if (!bannerToDelete) return;
    try {
      setIsDeleting(true);
      if (onDeleteBanner) {
        await onDeleteBanner(bannerToDelete.id);
      } else {
        const updated = banners.filter((b) => b.id !== bannerToDelete.id);
        onSaveBanners(updated);
      }
      showTempSuccess('تم حذف الإعلان نهائياً من السحابة لجميع المستخدمين.');
      setBannerToDelete(null);
    } catch (err) {
      console.error(err);
      showTempSuccess('حدث خطأ أثناء الحذف من السحابة');
    } finally {
      setIsDeleting(false);
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    onSaveSettings({
      autoPlay,
      intervalSeconds
    });
    showTempSuccess('تم حفظ إعدادات السرعة والحركة سحابياً بنجاح!');
  };

  return (
    <div className="space-y-6 font-['IBM_Plex_Sans_Arabic',sans-serif]" dir="rtl">
      {/* Full Page Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white p-5 sm:p-7 rounded-3xl shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-400 flex items-center justify-center shrink-0 shadow-inner">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">إدارة الإعلانات والبنايات (Banners)</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-2xl text-xs font-bold shadow-xs">
            <Cloud className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>مزامنة سحابية لحظية ☁️</span>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/15 backdrop-blur-md self-start sm:self-auto">
            <span className="text-xs font-bold text-white px-3">
              الإجمالي: <span className="text-sky-300 font-black">{banners.length}</span> | المُفعل: <span className="text-emerald-400 font-black">{banners.filter((b) => b.isActive !== false).length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Instant Success Alert */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {/* Main Container Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 p-3 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('banners')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'banners'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>قائمة الإعلانات ({banners.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'settings'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>إعدادات السرعة والحركة</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sizes')}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'sizes'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>دليل المقاسات الموصى بها</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* TAB 1: BANNERS LIST & ADD FORM */}
          {activeSubTab === 'banners' && (
            <div className="space-y-6">
              {/* Top Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-xs font-bold text-slate-600">
                  تحديث الإعلانات لحظي فور التفعيل أو الإلغاء أو الإضافة
                </span>

                {!isAdding && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة إعلان جديد</span>
                  </button>
                )}
              </div>

              {/* ADD NEW BANNER FORM */}
              {isAdding && (
                <motion.form
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleAddBanner}
                  className="p-5 bg-sky-50/80 border border-sky-200 rounded-2xl space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-sky-200/80 pb-3">
                    <div className="flex items-center gap-2 font-black text-sky-950 text-sm">
                      <Plus className="w-4 h-4 text-sky-600" />
                      <span>إضافة صورة إعلان جديد</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setFormError('');
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>

                  {formError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                      {formError}
                    </div>
                  )}

                  {/* 3 Device Image Upload Options */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-800">
                      رفع صور الإعلان حسب نوع الجهاز (اختر صورة واحدة على الأقل):
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Mobile Image Upload */}
                      <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-xs text-sky-900">
                            <Smartphone className="w-4 h-4 text-sky-600" />
                            <span>1. صورة الجوال</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">800 × 400</span>
                        </div>

                        {mobileImageUrl ? (
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-900">
                            <img src={mobileImageUrl} alt="الجوال" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setMobileImageUrl('')}
                              className="absolute top-1.5 left-1.5 p-1 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700"
                              title="حذف الصورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="p-3 bg-sky-50/50 border border-dashed border-sky-300 rounded-xl hover:border-sky-500 transition cursor-pointer flex flex-col items-center justify-center text-center space-y-1">
                            <Upload className="w-5 h-5 text-sky-600" />
                            <span className="text-[11px] font-bold text-slate-700">رفع صورة الجوال</span>
                            <span className="text-[9px] text-slate-400">PNG, JPG, WEBP</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleDeviceFileUpload('mobile', e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* Tablet Image Upload */}
                      <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-xs text-purple-900">
                            <Tablet className="w-4 h-4 text-purple-600" />
                            <span>2. صورة الأيباد</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">1200 × 500</span>
                        </div>

                        {tabletImageUrl ? (
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-900">
                            <img src={tabletImageUrl} alt="الأيباد" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setTabletImageUrl('')}
                              className="absolute top-1.5 left-1.5 p-1 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700"
                              title="حذف الصورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="p-3 bg-purple-50/50 border border-dashed border-purple-300 rounded-xl hover:border-purple-500 transition cursor-pointer flex flex-col items-center justify-center text-center space-y-1">
                            <Upload className="w-5 h-5 text-purple-600" />
                            <span className="text-[11px] font-bold text-slate-700">رفع صورة الأيباد</span>
                            <span className="text-[9px] text-slate-400">PNG, JPG, WEBP</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleDeviceFileUpload('tablet', e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* Desktop Image Upload */}
                      <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                            <Monitor className="w-4 h-4 text-emerald-600" />
                            <span>3. صورة الكمبيوتر</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">1600 × 600</span>
                        </div>

                        {desktopImageUrl ? (
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-900">
                            <img src={desktopImageUrl} alt="الكمبيوتر" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setDesktopImageUrl('')}
                              className="absolute top-1.5 left-1.5 p-1 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700"
                              title="حذف الصورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="p-3 bg-emerald-50/50 border border-dashed border-emerald-300 rounded-xl hover:border-emerald-500 transition cursor-pointer flex flex-col items-center justify-center text-center space-y-1">
                            <Upload className="w-5 h-5 text-emerald-600" />
                            <span className="text-[11px] font-bold text-slate-700">رفع صورة الكمبيوتر</span>
                            <span className="text-[9px] text-slate-400">PNG, JPG, WEBP</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleDeviceFileUpload('desktop', e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Optional Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        عنوان الإعلان <span className="text-slate-400 font-normal">(اختياري)</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="مثلاً: جدول الاختبارات النهائية"
                        className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رابط التوجيه عند الضغط <span className="text-slate-400 font-normal">(اختياري)</span>
                      </label>
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 dir-ltr text-left"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      وصف مختصر <span className="text-slate-400 font-normal">(اختياري)</span>
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="شرح بسيط يظهر فوق الصورة..."
                      className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Toggle Active Switch */}
                  <div
                    onClick={() => setIsActive(!isActive)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-slate-100 border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      {isActive ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-slate-400" />}
                      <span>تفعيل الإعلان فور إضافته</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                        isActive ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'
                      }`}
                    >
                      {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || isProcessingImage}
                      className="py-2.5 px-6 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري النشر سحابياً...</span>
                        </>
                      ) : (
                        <span>حفظ ونشر الإعلان سحابياً</span>
                      )}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* BANNERS LIST */}
              {banners.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">لا توجد صور إعلانات حالياً</p>
                  <p className="text-[11px] text-slate-400">اضغط على زر "إضافة إعلان جديد" بالأعلى لرفع أول صورة.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {banners.map((banner, index) => (
                    <div
                      key={banner.id}
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-center justify-between gap-4 ${
                        banner.isActive !== false
                          ? 'bg-white border-slate-200/90 shadow-2xs'
                          : 'bg-slate-50 border-slate-200/60 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        {/* Banner Image Preview */}
                        <div className="relative w-28 sm:w-36 h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0">
                          <img src={banner.imageUrl} alt={banner.title || 'إعلان'} className="w-full h-full object-cover" />

                          {/* Inactive Badge */}
                          {banner.isActive === false && (
                            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="py-0.5 px-2 bg-slate-800 text-slate-200 rounded-md text-[10px] font-bold">
                                معطّل
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="space-y-1 text-right flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {banner.title || 'إعلان بدون عنوان'}
                            </h4>

                            {banner.isActive !== false ? (
                              <span className="py-0.5 px-2 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md text-[10px] font-bold shrink-0">
                                مُفعّل ✓
                              </span>
                            ) : (
                              <span className="py-0.5 px-2 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-md text-[10px] font-bold shrink-0">
                                غير معروض
                              </span>
                            )}
                          </div>

                          {banner.description && (
                            <p className="text-xs text-slate-500 truncate">{banner.description}</p>
                          )}

                          {banner.linkUrl && (
                            <div className="flex items-center gap-1 text-xs text-sky-600 font-medium truncate dir-ltr text-right">
                              <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{banner.linkUrl}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Controls: Active Toggle, Delete */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        {/* TOGGLE ACTIVE / INACTIVE BUTTON (تفعيل / إلغاء تفعيل) */}
                        <button
                          onClick={() => handleToggleBannerActive(banner.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            banner.isActive !== false
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                          title={banner.isActive !== false ? 'إلغاء التفعيل' : 'تفعيل الإعلان'}
                        >
                          {banner.isActive !== false ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>مُفعل</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-slate-500" />
                              <span>تفعيل</span>
                            </>
                          )}
                        </button>

                        {/* EDIT BUTTON (تعديل النصوص والروابط) */}
                        <button
                          onClick={() => handleStartEdit(banner)}
                          className="py-2 px-3.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-sky-200/80"
                          title="تعديل النصوص والروابط"
                        >
                          <Pencil className="w-3.5 h-3.5 text-sky-600" />
                          <span>تعديل</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handlePromptDelete(banner)}
                          className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition cursor-pointer"
                          title="حذف الإعلان نهائياً من السحابة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SLIDER SETTINGS (AUTOMATION & TIMER) */}
          {activeSubTab === 'settings' && (
            <div className="space-y-6">
              <div className="p-5 bg-sky-50/80 border border-sky-200/90 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 font-black text-sky-950 text-sm">
                  <Clock className="w-4.5 h-4.5 text-sky-600" />
                  <span>إعدادات العرض والحركة السريعة</span>
                </div>

                {/* Auto Play Switch */}
                <div
                  onClick={() => setAutoPlay(!autoPlay)}
                  className="p-4 bg-white rounded-xl border border-slate-200 transition cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">التشغيل والتنقل التلقائي</div>
                    <p className="text-[11px] text-slate-500">
                      تتحرك صور الإعلانات تلقائياً دون الحاجة لضغط الطالب على الأسهم
                    </p>
                  </div>

                  <button className="text-sky-600 cursor-pointer">
                    {autoPlay ? (
                      <ToggleRight className="w-8 h-8 text-sky-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Duration Interval Selector */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-800">
                    سرعة الانتقال بين الصور (بالثواني):
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[3, 5, 7, 10].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setIntervalSeconds(sec)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                          intervalSeconds === sec
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {sec} ثواني
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    className="py-2.5 px-6 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    حفظ إعدادات الحركة
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RECOMMENDED DIMENSIONS GUIDE */}
          {activeSubTab === 'sizes' && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50/80 border border-purple-200/90 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-black text-purple-950 text-sm">
                  <Sparkles className="w-4.5 h-4.5 text-purple-600" />
                  <span>المقاسات المطلوبة الموصى بها لتصميم الإعلانات</span>
                </div>
                <p className="text-xs text-purple-800/90 leading-relaxed">
                  لضمان ظهور الإعلانات بصورة احترافية وواضحة جداً دون تقطيع عبر كافة الأجهزة، يُفضل مراعاة المقاسات التالية:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mobile Size */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 text-right">
                  <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs sm:text-sm">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <span>شاشات الجوال (Mobile)</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="text-lg font-black text-sky-700 dir-ltr text-right">800 × 400 px</div>
                    <div className="text-[11px] text-slate-500">نسبة العرض للارتفاع: 2 : 1</div>
                  </div>
                </div>

                {/* Tablet / iPad Size */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 text-right">
                  <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs sm:text-sm">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                      <Tablet className="w-4 h-4" />
                    </div>
                    <span>شاشات الأيباد والتابلت</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="text-lg font-black text-purple-700 dir-ltr text-right">1200 × 500 px</div>
                    <div className="text-[11px] text-slate-500">نسبة العرض للارتفاع: 12 : 5</div>
                  </div>
                </div>

                {/* Desktop Size */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 text-right">
                  <div className="flex items-center gap-2.5 text-slate-900 font-bold text-xs sm:text-sm">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <span>شاشات الكمبيوتر (Desktop)</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="text-lg font-black text-emerald-700 dir-ltr text-right">1600 × 600 px</div>
                    <div className="text-[11px] text-slate-500">نسبة العرض للارتفاع: 8 : 3</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs text-slate-600">
                <span className="font-bold text-slate-900 block">💡 نصيحة هامة للتصميم:</span>
                <p className="leading-relaxed text-[11px]">
                  ضع النصوص المهمة في منتصف الصورة (Safe Area) حتى تظهر بوضوح تام عبر مختلف مقاسات الأجهزة والهواتف الذكية.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT BANNER TEXTS & LINK MODAL */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-right space-y-5 font-['Tajawal',sans-serif]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <Pencil className="w-5 h-5 text-sky-600" />
                <span>تعديل نصوص ورابط الإعلان</span>
              </h3>
              <button
                onClick={() => setEditingBanner(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Banner Image Preview */}
            <div className="relative w-full h-24 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
              <img src={editingBanner.imageUrl} alt="الإعلان" className="w-full h-full object-cover" />
            </div>

            {/* Notice about image editing */}
            <div className="bg-amber-50 border border-amber-200/90 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>تنبيه:</strong> يمكنك تغيير العنوان، الوصف، والرابط فقط. لتغيير صورة الإعلان، يجب عليك حذف الإعلان الحالي وإعادة إضافته بالصورة الجديدة.
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">العنوان الرئيسي للإعلان (اختياري)</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="مثال: خصم 50% على اشتراك المعاصر"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">الوصف أو النص الفرعي (اختياري)</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="مثال: احصل على العرض لفترة محدودة"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none"
                />
              </div>

              {/* Link URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">رابط الإعلان (اختياري)</label>
                <input
                  type="url"
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:bg-white transition outline-none text-left"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ سحابياً...</span>
                    </>
                  ) : (
                    <span>حفظ التعديلات سحابياً</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* DELETE BANNER CONFIRMATION MODAL */}
      <AnimatePresence>
        {bannerToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-right space-y-4 font-['IBM_Plex_Sans_Arabic',sans-serif]"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="font-black text-slate-900 text-lg">تأكيد حذف الإعلان سحابياً</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  هل أنت متأكد من حذف هذا الإعلان نهائياً من السحابة؟ سيختفي الإعلان فوراً من الواجهة الرئيسية لجميع الطلاب وعلى جميع الأجهزة.
                </p>
              </div>

              {/* Banner thumbnail preview */}
              <div className="relative w-full h-24 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
                <img src={bannerToDelete.imageUrl} alt="الإعلان المراد حذفه" className="w-full h-full object-cover opacity-80" />
                {bannerToDelete.title && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2.5 text-xs text-white font-bold">
                    {bannerToDelete.title}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحذف من السحابة...</span>
                    </>
                  ) : (
                    <span>تأكيد الحذف النهائي 🗑️</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setBannerToDelete(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
