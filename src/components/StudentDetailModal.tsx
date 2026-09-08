import React, { useState } from 'react';
import { User, Subject, Homework, HomeworkSubmission, USER_JOB_OPTIONS } from '../types';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import {
  X,
  GraduationCap,
  ClipboardList,
  FileText,
  Download,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Crown,
  ShieldCheck,
  Compass,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { triggerFileDownload } from '../utils/pdfGenerator';
import { getLargeFile } from '../utils/fileStorage';
import { downloadFileFromCloud } from '../utils/cloudStorage';

interface StudentDetailModalProps {
  student: User;
  isOpen: boolean;
  onClose: () => void;
  allSubjects: Subject[];
  allHomeworks: Homework[];
  allSubmissions: HomeworkSubmission[];
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
  allSubjects,
  allHomeworks,
  allSubmissions
}) => {
  const { user, isSuperAdmin, canManageSubject } = useAuth();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isViewerSuperOrAssistant =
    isSuperAdmin ||
    user?.role === 'supervisor' ||
    user?.jobTitle === 'مشرف مساعد' ||
    (user?.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());

  const isThisSuperAdmin =
    student.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || student.isSuperAdmin;
  const currentJob = isThisSuperAdmin
    ? 'المشرف الأساسي'
    : student.jobTitle ||
      (student.role === 'supervisor'
        ? 'مشرف مساعد'
        : student.role === 'teacher'
        ? 'أ. رياضيات'
        : 'طالب');

  const matchedOption = USER_JOB_OPTIONS.find((opt) => opt.value === currentJob);
  const badgeColorClass = isThisSuperAdmin
    ? 'bg-purple-500/30 text-purple-200 border-purple-400/40'
    : currentJob === 'المرشد الطلابي'
    ? 'bg-amber-500/30 text-amber-200 border-amber-400/40'
    : matchedOption
    ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/40'
    : 'bg-slate-500/30 text-slate-200 border-slate-400/30';

  // Filter student's homework submissions (scoped to teacher's subject if viewer is a teacher)
  const studentEmail = (student.email || '').toLowerCase().trim();
  const rawStudentSubmissions = allSubmissions.filter(
    (s) =>
      (s.studentEmail && s.studentEmail.toLowerCase().trim() === studentEmail) ||
      (s.studentId && s.studentId === student.id)
  );

  // Match submissions with homework details
  const allSubmissionsWithHomework = rawStudentSubmissions.map((sub) => {
    const hw = allHomeworks.find((h) => h.id === sub.homeworkId);
    const subject = hw ? allSubjects.find((s) => s.id === hw.subjectId) : undefined;
    return {
      submission: sub,
      homework: hw,
      subject
    };
  });

  const submissionsWithHomework = isViewerSuperOrAssistant
    ? allSubmissionsWithHomework
    : allSubmissionsWithHomework.filter((item) =>
        item.homework ? canManageSubject(item.homework.subjectId) : false
      );

  // Handle downloading/opening PDF files safely
  const handleDownloadPdf = async (
    fileId?: string,
    dataUrl?: string,
    fileName: string = 'ملف.pdf'
  ) => {
    if (!fileId && !dataUrl) return;
    setDownloadingFileId(fileId || fileName);

    try {
      if (dataUrl) {
        triggerFileDownload(dataUrl, fileName);
        setDownloadingFileId(null);
        return;
      }

      if (fileId) {
        const cached = await getLargeFile(fileId);
        if (cached) {
          triggerFileDownload(cached, fileName);
          setDownloadingFileId(null);
          return;
        }

        const downloaded = await downloadFileFromCloud(fileId);
        if (downloaded) {
          triggerFileDownload(downloaded, fileName);
        } else {
          alert('تعذر تحميل الملف السحابي');
        }
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs font-['Tajawal',sans-serif]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-right"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 pr-1">
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl overflow-hidden bg-white/10 border-2 border-white/20 shrink-0 shadow-md">
              <img
                src={
                  student.avatar ||
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(student.name)
                }
                alt={student.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {student.name}
                </h3>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${badgeColorClass}`}>
                  {isThisSuperAdmin ? (
                    <>
                      <Crown className="w-3 h-3 text-amber-400" />
                      المشرف الأساسي
                    </>
                  ) : currentJob === 'مشرف مساعد' ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      مشرف مساعد
                    </>
                  ) : currentJob === 'المرشد الطلابي' ? (
                    <>
                      <Compass className="w-3 h-3 text-amber-300" />
                      المرشد الطلابي
                    </>
                  ) : currentJob.startsWith('أ.') ? (
                    <>
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                      {currentJob}
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-3 h-3" />
                      طالب
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono truncate">{student.email}</p>
            </div>
          </div>

          {/* Teacher Scope Notice if viewing as a teacher */}
          {!isViewerSuperOrAssistant && (
            <div className="mt-3 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-bold flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span>يتم عرض حلول الواجبات الخاصة بمادتك فقط ({user?.jobTitle})</span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="bg-white/10 rounded-xl p-2.5 flex items-center gap-2.5 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-300 block">حلول الواجبات المسلمة</span>
                <span className="text-xs sm:text-sm font-black text-white">
                  {submissionsWithHomework.length} حل مسلّم
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Title for Submissions */}
        <div className="border-b border-slate-100 bg-slate-50/80 p-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-purple-600" />
            <h4 className="text-xs sm:text-sm font-black text-slate-800">
              سجل تسليمات الواجبات ({submissionsWithHomework.length})
            </h4>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {submissionsWithHomework.length > 0 ? (
            submissionsWithHomework.map(({ submission, homework, subject }) => {
              const isDownloading =
                downloadingFileId === (submission.attachedFile?.fileId || submission.id);

              return (
                <div
                  key={submission.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-purple-300 transition"
                >
                  {/* Top Bar: Subject & Submission Date */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {subject && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 border border-purple-100">
                          {subject.emoji} {subject.name}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-slate-400" />
                        تاريخ التسليم: {submission.submittedAt ? submission.submittedAt.split('T')[0] : 'اليوم'}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      تم تسليم الحل
                    </span>
                  </div>

                  {/* Assignment Info */}
                  {homework && (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1">
                      {homework.title && (
                        <h5 className="text-xs font-black text-slate-800">
                          {homework.title}
                        </h5>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-slate-600 font-bold">
                        <span>📄 صفحة: صـ {homework.pageNumber}</span>
                        <span>❓ السؤال: {homework.questionNumber}</span>
                      </div>
                    </div>
                  )}

                  {/* Attached Notes / Answers */}
                  {submission.notes && (
                    <div className="text-xs text-slate-700 bg-amber-50/70 border border-amber-100 p-2.5 rounded-xl leading-relaxed">
                      <span className="font-bold text-amber-900 block mb-0.5">💬 ملاحظات / إجابة الحل:</span>
                      <p>{submission.notes}</p>
                    </div>
                  )}

                  {/* Actions & Attached PDF Download */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
                    {submission.attachedFile?.hasFile ? (
                      <button
                        onClick={() =>
                          handleDownloadPdf(
                            submission.attachedFile?.fileId,
                            submission.attachedFile?.dataUrl,
                            submission.attachedFile?.name || `حل_${student.name}.pdf`
                          )
                        }
                        disabled={isDownloading}
                        className="py-1.5 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>تحميل ملف الحل (PDF)</span>
                        <Download className={`w-3.5 h-3.5 mr-1 ${isDownloading ? 'animate-bounce' : ''}`} />
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        (تم التسليم بدون ملف PDF)
                      </span>
                    )}

                    {/* Model Solution from teacher if exists */}
                    {homework?.solutionFile?.hasFile && (
                      <button
                        onClick={() =>
                          handleDownloadPdf(
                            homework.solutionFile?.fileId,
                            homework.solutionFile?.dataUrl,
                            homework.solutionFile?.name || 'الحل_النموذجي.pdf'
                          )
                        }
                        className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="عرض الحل النموذجي للمقارنة"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>الحل النموذجي</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4 space-y-2">
              <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs sm:text-sm text-slate-500 font-bold">
                {!isViewerSuperOrAssistant
                  ? 'لم يقم الطالب بتسليم أي حل واجب خاص بمادتك بعد'
                  : 'لم يتم تسليم أي حلول واجبات بعد'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end px-4">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </div>
  );
};

