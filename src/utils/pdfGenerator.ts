import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Lesson, Subject } from '../types';

/**
 * Downloads an existing attached file directly if present.
 */
function downloadAttachedFileDirect(attachedFile: NonNullable<Lesson['attachedFile']>): boolean {
  try {
    if (attachedFile.dataUrl) {
      const link = document.createElement('a');
      link.href = attachedFile.dataUrl;
      link.download = attachedFile.name.endsWith('.pdf') ? attachedFile.name : `${attachedFile.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    }
  } catch (e) {
    console.error('Direct download failed:', e);
  }
  return false;
}

/**
 * Render HTML inside an isolated iframe so html2canvas never encounters Tailwind v4 oklch CSS functions.
 */
async function renderHtmlToCanvasIsolated(htmlContent: string, width = 800): Promise<HTMLCanvasElement> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = `${width}px`;
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Cannot access iframe document');

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            body {
              background-color: #ffffff;
              color: #1e293b;
              padding: 24px;
              direction: rtl;
              text-align: right;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Small delay to allow layout
    await new Promise((res) => setTimeout(res, 120));

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: width
    });

    return canvas;
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

/**
 * Fallback to direct jsPDF generation when canvas is unavailable, ensuring it always outputs a pure .pdf
 */
function generateFallbackDirectPDF(lesson: Lesson, subject?: Subject, fileName?: string) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const cleanTitle = fileName || `ملخص_${lesson.title.slice(0, 25).replace(/[^\w\u0600-\u06FF]/g, '_')}.pdf`;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('First Secondary Summary', 105, 20, { align: 'center' });

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Subject: ${subject?.name || 'Secondary 1'}`, 20, 32);
  pdf.text(`Pages: ${lesson.pages}`, 20, 40);
  pdf.text(`Lesson: ${lesson.title}`, 20, 48);

  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, 52, 190, 52);

  const splitSummary = pdf.splitTextToSize(lesson.summary, 170);
  pdf.text(splitSummary, 20, 60);

  pdf.save(cleanTitle);
}

/**
 * Generates and downloads a single lesson summary as a genuine PDF.
 */
export async function downloadLessonPDF(lesson: Lesson, subject?: Subject): Promise<boolean> {
  const cleanFileName = `ملخص_${lesson.title.slice(0, 25).replace(/[^\w\u0600-\u06FF]/g, '_')}.pdf`;

  try {
    // If lesson has an attached PDF file dataUrl, download it directly
    if (lesson.attachedFile && lesson.attachedFile.dataUrl) {
      const downloaded = downloadAttachedFileDirect(lesson.attachedFile);
      if (downloaded) return true;
    }

    const subjectTitle = subject ? subject.name : 'مقررات أول ثانوي';
    const cleanSupervisor = (lesson.supervisorName || 'مشرف المادة').replace(/^(أ\.|أستاذ\s*)/, '');

    const htmlContent = `
      <div style="border: 2px solid #e2e8f0; border-radius: 16px; padding: 28px; background: #ffffff;">
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
              📖 الصفحات: ${lesson.pages}
            </span>
            <span style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #334155;">
              👤 إشراف: ${cleanSupervisor}
            </span>
            <span style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #334155;">
              📅 ${lesson.semester === 1 ? 'P1' : 'P2'}
            </span>
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.4; margin: 0;">
            ${lesson.title}
          </h1>
        </div>

        <!-- Summary Section -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 22px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 10px;">
            📌 ملخص الدرس
          </h3>
          <p style="font-size: 13px; line-height: 1.8; color: #334155; margin: 0; white-space: pre-line;">
            ${lesson.summary}
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

    const canvas = await renderHtmlToCanvasIsolated(htmlContent);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(cleanFileName);
    return true;
  } catch (err) {
    console.error('Error generating single PDF with canvas, falling back to direct PDF:', err);
    try {
      generateFallbackDirectPDF(lesson, subject, cleanFileName);
      return true;
    } catch (fallbackErr) {
      console.error('Direct PDF generation error:', fallbackErr);
      return false;
    }
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
      <div style="padding: 10px;">
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
                      ${l.pages}
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
                  📖 ${lesson.pages}
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
                  ${lesson.summary}
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

    const canvas = await renderHtmlToCanvasIsolated(htmlContent);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = pdf.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(cleanTitle);
    return true;
  } catch (err) {
    console.error('Error generating booklet PDF:', err);
    return false;
  }
}
