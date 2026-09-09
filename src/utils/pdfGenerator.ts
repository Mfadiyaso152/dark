import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Lesson, Subject, SubjectBooklet } from '../types';

/**
 * Universal file download trigger that safely handles base64 data URIs, Blob objects, and remote URLs.
 * Converts base64 to binary Blobs to bypass mobile browser restrictions (iOS Safari / Android Chrome / WebViews).
 */
export function triggerFileDownload(blobOrDataUrl: Blob | string, fileName: string): boolean {
  try {
    let blobUrl: string;
    let shouldRevoke = false;

    if (typeof blobOrDataUrl === 'string') {
      if (blobOrDataUrl.startsWith('data:')) {
        // Convert base64 data URI to genuine binary Blob
        const parts = blobOrDataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        blobUrl = URL.createObjectURL(blob);
        shouldRevoke = true;
      } else {
        blobUrl = blobOrDataUrl;
      }
    } else {
      blobUrl = URL.createObjectURL(blobOrDataUrl);
      shouldRevoke = true;
    }

    const hasExtension = /\.(pdf|png|jpe?g|webp)$/i.test(fileName);
    const cleanName = hasExtension ? fileName : `${fileName}.pdf`;

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      if (shouldRevoke) {
        URL.revokeObjectURL(blobUrl);
      }
    }, 20000);

    return true;
  } catch (err) {
    console.error('Trigger file download failed:', err);
    return false;
  }
}

/**
 * Renders HTML inside a dedicated, isolated off-screen DOM container attached to the document.
 * Removes external CSS style tags in onclone so html2canvas never crashes on Tailwind v4 oklch colors.
 */
async function renderHtmlToCanvasDirect(htmlContent: string, width = 780): Promise<HTMLCanvasElement> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = `${width}px`;
  container.style.zIndex = '-99999';
  container.style.opacity = '0.01';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';
  container.style.direction = 'rtl';
  container.style.fontFamily = 'Tajawal, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.innerHTML = htmlContent;

  document.body.appendChild(container);

  try {
    // Small delay to allow fonts and layout to settle
    await new Promise((res) => setTimeout(res, 80));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: width,
      onclone: (clonedDoc) => {
        // Strip external styles that might contain oklch() colors incompatible with html2canvas
        const externalStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        externalStyles.forEach((s) => s.remove());
      }
    });

    return canvas;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Generates and downloads a single lesson summary as a high-quality PDF.
 */
export async function downloadLessonPDF(lesson: Lesson, subject?: Subject): Promise<boolean> {
  const cleanFileName = `ملخص_${lesson.title.slice(0, 30).replace(/[^\w\u0600-\u06FF]/g, '_')}.pdf`;

  try {
    // If lesson already has an attached PDF file, trigger download directly
    if (lesson.attachedFile && lesson.attachedFile.dataUrl) {
      const ok = triggerFileDownload(lesson.attachedFile.dataUrl, lesson.attachedFile.name || cleanFileName);
      if (ok) return true;
    }

    const subjectTitle = subject ? subject.name : 'مقررات أول ثانوي';
    const cleanSupervisor = (lesson.supervisorName || subject?.supervisorName || 'مشرف المادة').replace(/^(أ\.|أستاذ\s*)/, '');

    const htmlContent = `
      <div style="border: 2px solid #e2e8f0; border-radius: 16px; padding: 28px; background: #ffffff; color: #1e293b; direction: rtl; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 22px;">
          <div>
            <div style="font-size: 20px; font-weight: 800; color: #2563eb; margin-bottom: 4px;">مقررات وملخصات أول ثانوي</div>
            <div style="font-size: 12px; color: #64748b;">المملكة العربية السعودية • مسار التعليم الثانوي المشترك</div>
          </div>
          <div style="text-align: left;">
            <div style="background: #eff6ff; color: #1d4ed8; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; border: 1px solid #dbeafe;">
              ${subjectTitle}
            </div>
          </div>
        </div>

        <!-- Title & Badges -->
        <div style="margin-bottom: 22px;">
          <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            <span style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #334155;">
              📖 الصفحات: ${lesson.pages || 'مقرر المادة'}
            </span>
            <span style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #334155;">
              👤 إشراف: ${cleanSupervisor}
            </span>
            <span style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #334155;">
              📅 الفصل ${lesson.semester === 1 ? 'الأول (P1)' : 'الثاني (P2)'}
            </span>
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.4; margin: 0;">
            ${lesson.title}
          </h1>
        </div>

        <!-- Summary Section -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 10px;">
            📌 ملخص الدرس ومفاهيمه
          </h3>
          <p style="font-size: 13px; line-height: 1.8; color: #334155; margin: 0; white-space: pre-line;">
            ${lesson.summary || 'ملخص شامل ومكثف لدرس ' + lesson.title}
          </p>
        </div>

        <!-- Key Points -->
        ${
          lesson.keyPoints && lesson.keyPoints.length > 0
            ? `
          <div style="margin-bottom: 22px;">
            <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 10px;">
              💡 أهم النقاط والمفاهيم
            </h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${lesson.keyPoints
                .map(
                  (pt, idx) => `
                <div style="display: flex; align-items: flex-start; gap: 10px; background: #ffffff; border: 1px solid #f1f5f9; padding: 8px 12px; border-radius: 8px;">
                  <span style="background: #2563eb; color: #ffffff; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">
                    ${idx + 1}
                  </span>
                  <span style="font-size: 12.5px; line-height: 1.6; color: #334155;">${pt}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Terms / Definitions -->
        ${
          lesson.terms && lesson.terms.length > 0
            ? `
          <div style="margin-bottom: 22px;">
            <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 10px;">
              📑 المصطلحات والقوانين
            </h3>
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
              ${lesson.terms
                .map(
                  (t) => `
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; background: #ffffff;">
                  <div style="font-weight: 700; font-size: 13px; color: #2563eb; margin-bottom: 3px;">• ${t.term}</div>
                  <div style="font-size: 12px; color: #475569; line-height: 1.5;">${t.definition}</div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8;">
          <div>مقررات وملخصات أول ثانوي</div>
          <div>مع تمنياتنا بالتوفيق والنجاح ✨</div>
        </div>
      </div>
    `;

    const canvas = await renderHtmlToCanvasDirect(htmlContent);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const pdfBlob = pdf.output('blob');
    return triggerFileDownload(pdfBlob, cleanFileName);
  } catch (err) {
    console.error('Error generating PDF with canvas:', err);
    return false;
  }
}

/**
 * Generates and downloads a unified all-in-one PDF booklet containing ALL summaries.
 */
export async function downloadAllSummariesPDF(
  lessons: Lesson[],
  subjects: Subject[],
  semester: number,
  subjectFilter?: Subject
): Promise<boolean> {
  const cleanTitle = subjectFilter 
    ? `ملخصات_${subjectFilter.name.replace(/\s+/g, '_')}.pdf`
    : `ملخصات_شاملة_P${semester}.pdf`;

  try {
    const safeLessons = Array.isArray(lessons) ? lessons : [];
    const safeSubjects = Array.isArray(subjects) ? subjects : [];
    if (safeLessons.length === 0) return false;

    const titlePrefix = subjectFilter 
      ? `جميع ملخصات مادة ${subjectFilter.name}` 
      : `الملف الشامل لملخصات P${semester}`;

    const htmlContent = `
      <div style="padding: 16px; background: #ffffff; color: #1e293b; direction: rtl; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <!-- Booklet Cover Banner -->
        <div style="border: 2px solid #2563eb; border-radius: 16px; padding: 30px 20px; text-align: center; background: #eff6ff; margin-bottom: 30px;">
          <div style="font-size: 12px; font-weight: 700; color: #1d4ed8; margin-bottom: 6px;">
            المملكة العربية السعودية • مسار التعليم الثانوي المشترك
          </div>
          <h1 style="font-size: 24px; font-weight: 900; color: #1e3a8a; margin: 0 0 10px 0;">
            ${titlePrefix}
          </h1>
          <p style="font-size: 13px; color: #475569; margin: 0 auto 16px auto;">
            ملف تجميعي شامل ومصمم لجميع دروس ومفاهيم أول ثانوي
          </p>
          <div style="display: inline-flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <span style="background: #ffffff; border: 1px solid #bfdbfe; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #1d4ed8;">
              📚 إجمالي الدروس: ${safeLessons.length}
            </span>
            <span style="background: #ffffff; border: 1px solid #bfdbfe; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #1d4ed8;">
              🏫 مسارات أول ثانوي
            </span>
          </div>
        </div>

        <!-- Table of Contents / Index -->
        <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; background: #f8fafc; margin-bottom: 30px;">
          <h2 style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
            📑 فهرس الدروس
          </h2>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${safeLessons.map((l, index) => {
              const subj = safeSubjects.find(s => s.id === l.subjectId);
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #ffffff; border: 1px solid #f1f5f9; border-radius: 6px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: #eff6ff; color: #1d4ed8; width: 20px; height: 20px; border-radius: 50%; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                      ${index + 1}
                    </span>
                    <span style="font-weight: 700; font-size: 12px; color: #1e293b;">${l.title}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 600;">${subj?.name || ''}</span>
                    <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; color: #475569;">
                      ${l.pages || ''}
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Lesson Pages -->
        ${safeLessons.map((lesson, idx) => {
          const subj = safeSubjects.find(s => s.id === lesson.subjectId);
          return `
            <div style="margin-top: 24px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="background: #2563eb; color: white; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">
                    الدرس #${idx + 1}
                  </span>
                  <span style="font-size: 13px; font-weight: 700; color: #1e3a8a;">
                    ${subj?.name || 'أول ثانوي'}
                  </span>
                </div>
                <span style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; color: #334155;">
                  📖 ${lesson.pages || ''}
                </span>
              </div>

              <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">
                ${lesson.title}
              </h2>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
                <h4 style="font-size: 13px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0;">
                  📌 ملخص المحتوى:
                </h4>
                <p style="font-size: 12px; line-height: 1.7; color: #334155; margin: 0; white-space: pre-line;">
                  ${lesson.summary || 'ملخص الدرس'}
                </p>
              </div>

              ${lesson.keyPoints && lesson.keyPoints.length > 0 ? `
                <div style="margin-bottom: 14px;">
                  <h4 style="font-size: 13px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0;">
                    💡 أهم المفاهيم:
                  </h4>
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${lesson.keyPoints.map(kp => `
                      <div style="font-size: 11.5px; color: #334155; background: #ffffff; border: 1px solid #f1f5f9; padding: 6px 10px; border-radius: 6px;">
                        • ${kp}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${lesson.terms && lesson.terms.length > 0 ? `
                <div style="margin-bottom: 14px;">
                  <h4 style="font-size: 13px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0;">
                    📑 المصطلحات والقوانين:
                  </h4>
                  <div style="display: grid; grid-template-columns: 1fr; gap: 6px;">
                    ${lesson.terms.map(t => `
                      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; background: #ffffff;">
                        <span style="font-weight: 700; font-size: 11.5px; color: #2563eb;">${t.term}:</span>
                        <span style="font-size: 11.5px; color: #475569;"> ${t.definition}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}

        <!-- Footer -->
        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; color: #64748b; font-size: 11px;">
          <div>مقررات وملخصات أول ثانوي</div>
          <div>وفقكم الله في مسيرتكم التعليمية ✨</div>
        </div>
      </div>
    `;

    const canvas = await renderHtmlToCanvasDirect(htmlContent);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const pdfBlob = pdf.output('blob');
    return triggerFileDownload(pdfBlob, cleanTitle);
  } catch (err) {
    console.error('Error generating booklet PDF:', err);
    return false;
  }
}

/**
 * Generates and downloads a booklet summary PDF for a subject.
 */
export async function downloadBookletPDF(
  booklet: SubjectBooklet,
  subject: Subject,
  subjectLessons: Lesson[]
): Promise<boolean> {
  const cleanTitle = `${booklet.title.replace(/\s+/g, '_')}.pdf`;

  if (booklet.fileDataUrl) {
    return triggerFileDownload(booklet.fileDataUrl, booklet.fileName || cleanTitle);
  }

  try {
    const htmlContent = `
      <div style="padding: 24px; background: #ffffff; color: #1e293b; direction: rtl; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <!-- Booklet Cover -->
        <div style="border: 2px solid #059669; border-radius: 16px; padding: 28px 20px; text-align: center; background: #ecfdf5; margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 6px;">
            مذكرة وملخص معتمد • أول ثانوي
          </div>
          <h1 style="font-size: 24px; font-weight: 900; color: #065f46; margin: 0 0 10px 0;">
            ${booklet.title}
          </h1>
          <p style="font-size: 13px; color: #047857; margin: 0 auto 14px auto;">
            مادة ${subject.name} • إشراف: ${booklet.supervisorName || subject.supervisorName || 'مشرف المادة'}
          </p>
          <div style="display: inline-flex; gap: 8px; justify-content: center;">
            <span style="background: #ffffff; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: 700; color: #047857;">
              📄 ${booklet.pagesCount || subjectLessons.length + ' صفحات'}
            </span>
          </div>
        </div>

        <!-- Lessons summary in this booklet -->
        ${subjectLessons.slice(0, 10).map((l, idx) => `
          <div style="margin-bottom: 18px; border-bottom: 1px solid #f1f5f9; padding-bottom: 14px;">
            <div style="font-weight: 800; font-size: 14px; color: #065f46; margin-bottom: 4px;">
              ${idx + 1}. ${l.title} (${l.pages || ''})
            </div>
            <p style="font-size: 12px; line-height: 1.6; color: #334155; margin: 0;">
              ${l.summary}
            </p>
          </div>
        `).join('')}

        <!-- Footer -->
        <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; font-size: 11px; color: #94a3b8;">
          <div>مقررات وملخصات أول ثانوي</div>
          <div>مع تمنياتنا بالتوفيق والنجاح ✨</div>
        </div>
      </div>
    `;

    const canvas = await renderHtmlToCanvasDirect(htmlContent);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const pdfBlob = pdf.output('blob');
    return triggerFileDownload(pdfBlob, cleanTitle);
  } catch (err) {
    console.error('Error generating booklet PDF:', err);
    return false;
  }
}

