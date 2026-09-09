import React, { useState } from 'react';
import { Lesson, Subject } from '../types';
import {
  Download,
  CheckCircle2,
  Edit,
  Trash2
} from 'lucide-react';
import { downloadLessonPDF, triggerFileDownload } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

interface LessonCardProps {
  lesson: Lesson;
  subject?: Subject;
  isCompleted: boolean;
  isBookmarked?: boolean;
  onSelect?: (lesson: Lesson) => void;
  onToggleComplete: (id: string) => void;
  onToggleBookmark?: (id: string) => void;
  onEdit?: (lesson: Lesson) => void;
  onDelete?: (id: string) => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  subject,
  isCompleted,
  onSelect,
  onToggleComplete,
  onEdit,
  onDelete
}) => {
  const { user, canManageSubject } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDownloading(true);

    try {
      // If lesson has an attached file from supervisor/teacher
      if (lesson.attachedFile) {
        let fileUrl = lesson.attachedFile.dataUrl;
        if (!fileUrl) {
          fileUrl = await getLargeFile('lesson-file-' + lesson.id);
        }
        if (!fileUrl) {
          fileUrl = await downloadFileFromCloud('lesson-file-' + lesson.id);
        }
        if (fileUrl) {
          const ok = triggerFileDownload(fileUrl, lesson.attachedFile.name || `${lesson.title}.pdf`);
          setIsDownloading(false);
          if (ok) {
            setDownloadDone(true);
            setTimeout(() => setDownloadDone(false), 2500);
          }
          return;
        }
      }

      // Generate high-resolution authentic PDF summary
      const ok = await downloadLessonPDF(lesson, subject);
      setIsDownloading(false);
      if (ok) {
        setDownloadDone(true);
        setTimeout(() => setDownloadDone(false), 2500);
      }
    } catch (err) {
      console.error('Error downloading lesson file:', err);
      setIsDownloading(false);
    }
  };

  const handleCardClick = () => {
    handleDownload();
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete(lesson.id);
    if (!isCompleted) {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 }
      });
    }
  };

  const targetSubjectId = subject?.id || lesson.subjectId;
  const canEditThisLesson = canManageSubject(targetSubjectId);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      onClick={handleCardClick}
      className={`group cursor-pointer rounded-2xl p-4 transition-all duration-200 border text-right relative overflow-hidden bg-white ${
        isCompleted
          ? 'border-[#86EFAC] bg-[#F0FDF4]/30'
          : 'border-[#E2E8F0] hover:border-[#94A3B8] shadow-2xs hover:shadow-xs'
      }`}
    >
      {/* Top row: Badges & Actions */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1">
          {/* Teacher/Supervisor Actions */}
          {canEditThisLesson && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(lesson);
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                  title="تعديل الدرس"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(lesson.id);
                  }}
                  className="p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-90"
                  title="حذف الدرس مباشرة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Attached File Badge if any */}
        {lesson.attachedFile && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center gap-1">
            {lesson.attachedFile.type === 'pdf' ? '📄' : '🖼️'}
            <span>{lesson.attachedFile.type.toUpperCase()}</span>
          </span>
        )}
      </div>

      {/* Lesson Title ONLY (No summary or description at all) */}
      <h3 className="font-bold text-[#1E293B] text-sm sm:text-base leading-snug mb-3 group-hover:text-[#3B82F6] transition">
        {lesson.title}
      </h3>

      {/* Action Bar */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Check completed toggle */}
        <button
          onClick={handleComplete}
          className={`text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
            isCompleted
              ? 'bg-[#DCFCE7] text-[#14532D]'
              : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569]'
          }`}
        >
          <CheckCircle2
            className={`w-3.5 h-3.5 ${isCompleted ? 'text-[#16A34A]' : 'text-slate-400'}`}
          />
          <span>{isCompleted ? 'تم إنجازه' : 'تحديد كـ منجز'}</span>
        </button>

        {/* PDF Download ONLY */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="text-xs font-bold py-1.5 px-3.5 rounded-xl bg-[#1E293B] hover:bg-[#0F172A] text-white flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-2xs"
          title="تنزيل ملخص هذا الدرس بصيغة PDF"
        >
          {isDownloading ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{downloadDone ? 'تم التنزيل!' : 'تنزيل PDF'}</span>
        </button>
      </div>
    </motion.div>
  );
};
