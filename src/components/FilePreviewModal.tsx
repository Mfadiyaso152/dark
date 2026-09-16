import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { AttachedFile } from '../types';
import { createSafeBlobUrl, triggerFileDownload, normalizeFileDataUrl } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: AttachedFile[];
  initialIndex?: number;
  studentName?: string;
  title?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  files = [],
  initialIndex = 0,
  studentName,
  title
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBlobUrl, setActiveBlobUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  // In-component cache of resolved blob URLs so navigating between items is instantaneous (0ms)
  const resolvedCache = useRef<Map<string, { blobUrl: string; revoke: () => void }>>(new Map());

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, files.length - 1)));
      setZoomLevel(1);
      setRotation(0);
    }
  }, [isOpen, initialIndex, files.length]);

  const currentFile = files[currentIndex] as AttachedFile | undefined;

  const isPdf = useMemo(() => {
    if (!currentFile) return false;
    const name = (currentFile.name || '').toLowerCase();
    const type = currentFile.type;
    return type === 'pdf' || name.endsWith('.pdf');
  }, [currentFile]);

  // Load and resolve blob URL for active file at lightning speed
  useEffect(() => {
    let active = true;

    if (!isOpen || !currentFile) {
      setIsLoading(false);
      return;
    }

    const cacheKey = currentFile.fileId || currentFile.name || `idx-${currentIndex}`;
    const cached = resolvedCache.current.get(cacheKey);
    if (cached) {
      setActiveBlobUrl(cached.blobUrl);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setZoomLevel(1);
    setRotation(0);

    const loadContent = async () => {
      try {
        let contentUrl = currentFile.dataUrl;

        // 1. Direct memory or local check for fileId
        if (!contentUrl && currentFile.fileId) {
          try {
            contentUrl = (await getLargeFile(currentFile.fileId)) || undefined;
          } catch {
            // ignore
          }
        }

        // 2. High-speed cloud fetch
        if (!contentUrl && currentFile.fileId) {
          contentUrl = (await downloadFileFromCloud(currentFile.fileId, undefined, currentFile.name)) || undefined;
        }

        // 3. Fallback: check sibling files if single submission had multiple parts
        if (!contentUrl && files.length > 1) {
          for (const f of files) {
            if (f.fileId && f.fileId !== currentFile.fileId) {
              const fromSibling = await downloadFileFromCloud(f.fileId, undefined, currentFile.name);
              if (fromSibling) {
                contentUrl = fromSibling;
                break;
              }
            }
          }
        }

        // 4. Fallback by name
        if (!contentUrl && currentFile.name) {
          contentUrl = (await downloadFileFromCloud(currentFile.name, undefined, currentFile.name)) || undefined;
        }

        if (!active) return;

        if (!contentUrl) {
          setError('تعذر استرداد محتوى الملف من السحابة أو الذاكرة.');
          setIsLoading(false);
          return;
        }

        // If it's an image data URL, display immediately
        if (!isPdf && contentUrl.startsWith('data:image/')) {
          resolvedCache.current.set(cacheKey, { blobUrl: contentUrl, revoke: () => {} });
          setActiveBlobUrl(contentUrl);
          setIsLoading(false);
          return;
        }

        const normalized = normalizeFileDataUrl(contentUrl, currentFile.name);
        const { blobUrl, revoke } = await createSafeBlobUrl(normalized, currentFile.name);

        if (!active) {
          revoke();
          return;
        }

        resolvedCache.current.set(cacheKey, { blobUrl, revoke });
        setActiveBlobUrl(blobUrl);
        setIsLoading(false);
      } catch (err) {
        if (!active) return;
        console.error('[FilePreviewModal] Load error:', err);
        setError('حدث خطأ أثناء فك تشفير وعرض الملف.');
        setIsLoading(false);
      }
    };

    loadContent();

    return () => {
      active = false;
    };
  }, [isOpen, currentIndex, currentFile, reloadTrigger, isPdf, files]);

  // Clean up cache when modal closes
  useEffect(() => {
    if (!isOpen) {
      resolvedCache.current.forEach((item) => item.revoke());
      resolvedCache.current.clear();
      setActiveBlobUrl(null);
    }
  }, [isOpen]);

  if (!isOpen || !currentFile) return null;

  const handleNext = () => {
    if (currentIndex < files.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleDownloadCurrent = async () => {
    const targetName = currentFile.name || (isPdf ? 'ملف.pdf' : 'صورة.jpg');
    if (activeBlobUrl) {
      triggerFileDownload(activeBlobUrl, targetName);
      return;
    }
    if (currentFile.dataUrl) {
      triggerFileDownload(currentFile.dataUrl, targetName);
      return;
    }
    if (currentFile.fileId) {
      try {
        const dl = (await getLargeFile(currentFile.fileId)) || (await downloadFileFromCloud(currentFile.fileId, undefined, targetName));
        if (dl) {
          triggerFileDownload(dl, targetName);
          return;
        }
      } catch {
        // ignore
      }
    }
  };

  const handleOpenExternal = () => {
    if (activeBlobUrl) {
      window.open(activeBlobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[100] w-full h-full bg-slate-950 flex flex-col overflow-hidden select-none font-['IBM_Plex_Sans_Arabic',sans-serif]"
        dir="rtl"
      >
        <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-950">
          {/* Full-Page Header Bar */}
          <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-900/95 backdrop-blur-md text-white flex items-center justify-between gap-3 border-b border-slate-800 z-10">
            {/* Title & Metadata */}
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isPdf ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-white truncate">
                    {currentFile.name || (isPdf ? 'ملف PDF' : 'صورة حل الواجب')}
                  </h3>
                  {files.length > 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 text-[10px] font-bold shrink-0">
                      {currentIndex + 1} من {files.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-300">
                  {studentName && <span className="font-bold text-amber-300">الطالب: {studentName}</span>}
                  {currentFile.size && <span>• الحجم: {currentFile.size}</span>}
                  {title && <span>• {title}</span>}
                </div>
              </div>
            </div>

            {/* Quick Actions & Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Image Controls (Zoom / Rotate) */}
              {!isPdf && !isLoading && !error && (
                <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    title="تكبير"
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    title="تصغير"
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRotate}
                    title="تدوير"
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Open in full external tab */}
              {activeBlobUrl && (
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  title="فتح في نافذة كاملة جديدة"
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1 text-xs font-bold"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden md:inline">نافذة مستقلة</span>
                </button>
              )}



              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Viewer Area */}
          <div className="flex-1 relative bg-slate-900/5 overflow-hidden flex items-center justify-center p-2 sm:p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-600">
                <div className="w-9 h-9 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-xs font-medium text-slate-500">جاري المعاينة...</span>
              </div>
            ) : error ? (
              <div className="text-center p-6 max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700">{error}</p>
                <div className="flex justify-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setReloadTrigger((n) => n + 1)}
                    className="py-1.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>إعادة المحاولة</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCurrent}
                    className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل الملف</span>
                  </button>
                </div>
              </div>
            ) : isPdf && activeBlobUrl ? (
              <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden shadow-inner bg-white border border-slate-200">
                <iframe
                  src={`${activeBlobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-0 rounded-2xl"
                  title={currentFile.name || 'معاينة ملف PDF'}
                />
              </div>
            ) : !isPdf && activeBlobUrl ? (
              <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                <img
                  src={activeBlobUrl}
                  alt={currentFile.name || 'صورة حل الطالب'}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out'
                  }}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-md select-none"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}

            {/* Navigation Arrows for Multi-file Submissions */}
            {files.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={`absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-lg transition backdrop-blur-xs cursor-pointer ${
                    currentIndex === 0 ? 'opacity-30 pointer-events-none' : 'hover:scale-105 active:scale-95'
                  }`}
                  title="المرفق السابق"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex === files.length - 1}
                  className={`absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-lg transition backdrop-blur-xs cursor-pointer ${
                    currentIndex === files.length - 1 ? 'opacity-30 pointer-events-none' : 'hover:scale-105 active:scale-95'
                  }`}
                  title="المرفق التالي"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Strip (if multiple files) */}
          {files.length > 1 && (
            <div className="shrink-0 p-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
              {files.map((f, idx) => {
                const isActive = idx === currentIndex;
                const fileIsPdf = f.type === 'pdf' || (f.name || '').toLowerCase().endsWith('.pdf');

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {fileIsPdf ? <FileText className="w-3.5 h-3.5 text-red-400" /> : <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className="max-w-[120px] truncate">{f.name || `مرفق ${idx + 1}`}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
