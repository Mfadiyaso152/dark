import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Upload,
  File,
  Image as ImageIcon,
  CheckCircle2,
  Cloud,
  Loader2
} from 'lucide-react';
import { Subject, Lesson, AttachedFile } from '../types';
import { useAuth } from '../context/AuthContext';
import { db, doc, setDoc } from '../lib/firebase';

interface AddLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  onSaveLesson: (lesson: Lesson) => void;
  editingLesson?: Lesson | null;
  defaultSubjectId?: string;
}

export const AddLessonModal: React.FC<AddLessonModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onSaveLesson,
  editingLesson,
  defaultSubjectId
}) => {
  const { user, canManageSubject } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter subjects to only those the teacher/supervisor is authorized to manage
  const allowedSubjects = subjects.filter((s) => canManageSubject(s.id));
  const fallbackSubjectId = allowedSubjects[0]?.id || defaultSubjectId || (subjects[0]?.id || '');

  const [subjectId, setSubjectId] = useState<string>(() => {
    if (editingLesson) return editingLesson.subjectId;
    if (defaultSubjectId && canManageSubject(defaultSubjectId)) return defaultSubjectId;
    return fallbackSubjectId;
  });
  const [title, setTitle] = useState<string>(editingLesson ? editingLesson.title : '');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | undefined>(
    editingLesson?.attachedFile
  );
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    const isImage =
      file.type.includes('image') ||
      file.name.toLowerCase().endsWith('.png') ||
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg');

    if (!isPdf && !isImage) {
      setError('يرجى رفع ملف بصيغة PDF أو صورة PNG / JPG فقط');
      return;
    }

    setError('');
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${sizeInMb} MB`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAttachedFile({
        name: file.name,
        type: isPdf ? 'pdf' : 'png',
        size: sizeStr,
        dataUrl: dataUrl,
        previewUrl: isImage ? dataUrl : undefined
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى كتابة عنوان الدرس');
      return;
    }
    if (!subjectId) {
      setError('يرجى اختيار المادة');
      return;
    }
    if (!canManageSubject(subjectId)) {
      setError('عذراً، لا تملك صلاحية النشر في هذه المادة.');
      return;
    }

    setIsSaving(true);
    setError('');

    const lessonId = editingLesson ? editingLesson.id : `lesson-cloud-${Date.now()}`;
    const newLesson: Lesson = {
      id: lessonId,
      subjectId,
      semester: 1,
      title: title.trim(),
      pages: 'مرفق',
      summary: title.trim(),
      keyPoints: [title.trim()],
      terms: [],
      difficulty: 'easy',
      attachedFile,
      authorId: user?.id,
      authorName: user?.name,
      createdAt: editingLesson?.createdAt || new Date().toISOString()
    };

    // Save to Firestore Cloud
    try {
      const lessonRef = doc(db, 'lessons', lessonId);
      await setDoc(lessonRef, {
        id: newLesson.id,
        subjectId: newLesson.subjectId,
        semester: 1,
        title: newLesson.title,
        pages: 'مرفق',
        summary: newLesson.summary,
        attachedFile: newLesson.attachedFile
          ? {
              name: newLesson.attachedFile.name,
              type: newLesson.attachedFile.type,
              size: newLesson.attachedFile.size,
              dataUrl: newLesson.attachedFile.dataUrl
            }
          : null,
        authorId: newLesson.authorId || '',
        authorName: newLesson.authorName || '',
        createdAt: newLesson.createdAt
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore lesson cloud save note:', err);
    }

    onSaveLesson(newLesson);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['Tajawal',sans-serif]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 text-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">
                {editingLesson ? 'تعديل الدرس' : 'إضافة درس جديد'}
              </h2>
              <p className="text-[11px] text-slate-500">حفظ ونشر مباشر في السحابة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Subject Selection */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              المادة الدراسية
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {(allowedSubjects.length > 0 ? allowedSubjects : subjects).map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.emoji} {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Title */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              عنوان الدرس *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="اكتب عنوان الدرس هنا..."
              className="w-full py-3 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* File Attachment: PDF or Image */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              إرفاق ملف الدرس (PDF أو صور)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              accept=".pdf,image/png,image/jpeg,image/webp"
              className="hidden"
            />

            {!attachedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                  isDragging
                    ? 'border-purple-500 bg-purple-50/50'
                    : 'border-slate-200 hover:border-purple-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">اضغط لرفع ملف أو اسحبه هنا</p>
                <p className="text-[10px] text-slate-400">يدعم ملفات PDF والصور (PNG, JPG)</p>
              </div>
            ) : (
              <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                    {attachedFile.type === 'pdf' ? (
                      <File className="w-4 h-4" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-purple-900 truncate">
                      {attachedFile.name}
                    </p>
                    <p className="text-[10px] text-purple-600 font-medium">
                      {attachedFile.size} • {attachedFile.type.toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAttachedFile(undefined)}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                >
                  إزالة
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ بالسحابة...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>حفظ ونشر بالسحابة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
