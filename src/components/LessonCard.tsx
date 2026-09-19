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
import { triggerHaptic } from '../utils/haptics';

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
    triggerHaptic(isCompleted ? 'light' : 'success');
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
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      onClick={handleCardClick}
      className={`group cursor-pointer rounded-2xl md:rounded-3xl p-4 sm:p-5 transition-all duration-300 border text-right relative overflow-hidden bg-white ${
        isCompleted
          ? 'border-emerald-300/80 bg-[#FAFDF8] shadow-[0_2px_12px_-3px_rgba(16,185,129,0.06)]'
          : 'border-[#E7E2D8] hover:border-[#D0C8B8] hover:bg-[#FFFCF9] shadow-[0_2px_12px_-3px_rgba(28,25,23,0.04)] hover:shadow-[0_8px_20px_-6px_rgba(28,25,23,0.08)]'
      }`}
    >
      {/* Top row: Badges & Actions */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
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
                  className="p-1.5 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3EF] transition cursor-pointer"
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
                  className="p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 text-[#78716C] hover:text-rose-600 hover:bg-rose-50 active:scale-90"
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
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#F5F3EF] text-[#1C1917] border border-[#E7E2D8] flex items-center gap-1">
            {lesson.attachedFile.type === 'pdf' ? '📄' : '🖼️'}
            <span>{lesson.attachedFile.type.toUpperCase()}</span>
          </span>
        )}
      </div>

      {/* Lesson Title */}
      <h3 className="font-bold font-['Alexandria',sans-serif] text-[#1C1917] text-sm sm:text-base leading-snug mb-3.5 group-hover:text-amber-800 transition-colors">
        {lesson.title}
      </h3>

      {/* Action Bar */}
      <div className="pt-3 border-t border-[#F2EEE9] flex items-center justify-between gap-2 font-['IBM_Plex_Sans_Arabic',sans-serif]">
        {/* Check completed toggle */}
        <button
          onClick={handleComplete}
          className={`text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
              : 'bg-[#F5F3EF] hover:bg-[#EBE7DF] text-[#44403C]'
          }`}
        >
          <CheckCircle2
            className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-700' : 'text-[#A8A29E]'}`}
          />
          <span>{isCompleted ? 'تم إنجازه' : 'تحديد كـ منجز'}</span>
        </button>

        {/* PDF Download ONLY */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="text-xs font-bold py-1.5 px-3.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-[#FAF8F5] flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs border border-white/10"
          title="تنزيل ملخص هذا الدرس بصيغة PDF"
        >
          {isDownloading ? (
            <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Download className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{downloadDone ? 'تم التنزيل!' : 'تنزيل PDF'}</span>
        </button>
      </div>
    </motion.div>
  );
};
