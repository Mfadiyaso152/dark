import { Lesson, SubjectBooklet } from '../types';

/**
 * Robust localStorage utilities that completely prevent and handle QuotaExceededError.
 */

// Keys that may have accumulated large payloads
const BULKY_KEYS = [
  'thanaweya_subject_booklets_v4',
  'thanaweya_subject_booklets_v3',
  'thanaweya_subject_booklets_v2',
  'thanaweya_subject_booklets',
  'thanaweya_lessons_v3',
  'thanaweya_lessons_v2',
  'thanaweya_lessons'
];

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`[Storage] Failed to set "${key}":`, error);

    // If quota exceeded, free space by purging old/bulky keys and retry
    if (
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014 ||
      (typeof error?.message === 'string' && error.message.toLowerCase().includes('quota'))
    ) {
      try {
        for (const k of BULKY_KEYS) {
          if (k !== key) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.warn(`[Storage] Retry setItem failed for "${key}":`, retryError);
      }
    }
    return false;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[Storage] Failed to get "${key}":`, error);
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Storage] Failed to remove "${key}":`, error);
  }
}

/**
 * Strips heavy data URLs (> 50KB) before saving to localStorage
 * so that localStorage stores only lightweight metadata and never exceeds quota limits.
 */
export function sanitizeLessonsForStorage(lessons: Lesson[]): Lesson[] {
  return lessons.map((l) => {
    if (l.attachedFile && l.attachedFile.dataUrl && l.attachedFile.dataUrl.length > 50000) {
      return {
        ...l,
        attachedFile: {
          ...l.attachedFile,
          dataUrl: undefined
        }
      };
    }
    return l;
  });
}

/**
 * Strips heavy PDF data URLs (> 50KB) before saving to localStorage.
 */
export function sanitizeBookletsForStorage(booklets: SubjectBooklet[]): SubjectBooklet[] {
  return booklets.map((b) => {
    if (b.fileDataUrl && b.fileDataUrl.length > 50000) {
      return {
        ...b,
        fileDataUrl: undefined
      };
    }
    return b;
  });
}

/**
 * One-time startup hygiene check: purges any oversized strings already occupying localStorage
 */
export function sanitizeExistingLocalStorage(): void {
  try {
    for (const key of BULKY_KEYS) {
      const val = localStorage.getItem(key);
      if (val && val.length > 300000) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            if (key.includes('booklets')) {
              const cleaned = sanitizeBookletsForStorage(parsed);
              localStorage.setItem(key, JSON.stringify(cleaned));
            } else if (key.includes('lessons')) {
              const cleaned = sanitizeLessonsForStorage(parsed);
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (e) {
    console.warn('[Storage] Hygiene check error:', e);
  }
}
