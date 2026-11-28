export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
export const YEAR_PATTERN = /^[0-9]{4}$/;

export const LIMITS = {
  ID_MAX: 128,
  EMAIL_MAX: 160,
  DISPLAY_NAME_MAX: 100,
  CLASS_NAME_MAX: 60,
  ACADEMIC_YEAR_MAX: 20,
  NISN_MIN: 4,
  NISN_MAX: 20,
  NIK_MAX: 30,
  STUDENT_ID_NUMBER_MAX: 30,
  SUBJECT_MAX: 60,
  GRADE_TITLE_MAX: 120,
  GRADE_NOTES_MAX: 400,
  ATTENDANCE_NOTES_MAX: 300,
  ANNOUNCEMENT_TITLE_MAX: 140,
  ANNOUNCEMENT_CONTENT_MAX: 2000,
  ANNOUNCEMENT_LOCATION_MAX: 120,
  EVENT_DATE_MAX: 20,
  NOTIFICATION_TITLE_MAX: 140,
  NOTIFICATION_MESSAGE_MAX: 400,
  YAYASAN_MAX: 140,
  MADRASAH_NAME_MAX: 140,
  NSM_MAX: 30,
  NPSN_MAX: 20,
  ADDRESS_MAX: 300,
  HEADMASTER_MAX: 120,
  LOGO_URL_MAX: 500,
  DRIVE_URL_MAX: 500,
  CONTENT_TEXT_MAX: 2000,
  PHONE_MAX: 50,
  LINKED_STUDENTS_MAX: 10,
  CLASS_IDS_MAX: 15,
  SUBJECTS_MAX: 20,
  PARENT_UIDS_MAX: 4,
  TEACHER_UIDS_MAX: 20,
  READ_BY_MAX: 100,
  TEACHER_ORDER_MAX: 99999,
  TEACHER_BIRTH_PLACE_MAX: 100,
  TEACHER_DATE_MAX: 25,
  TEACHER_ID_NUMBER_MAX: 50,
  TEACHER_POSITION_MAX: 100,
  TEACHER_PHONE_MAX: 25,
  TEACHER_ADDRESS_MAX: 300,
  PARENT_NAME_MAX: 120,
  SCHOOL_NAME_MAX: 140,
  MUTATION_REASON_MAX: 300,
  LETTER_NUMBER_MAX: 60,
  GRADUATION_YEAR_MAX: 12,
  CERTIFICATE_NUMBER_MAX: 60,
  FINANCE_TITLE_MAX: 140,
  FINANCE_NOTES_MAX: 300,
  FINANCE_AMOUNT_MAX: 1000000000,
} as const;

export function makeDocId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'doc';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${cleanPrefix}_${Date.now()}_${rand}`;
}

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, LIMITS.ID_MAX);
}

export function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

export function sanitizeIdToken(val: string, fallback = 'id'): string {
  const cleaned = val.trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, LIMITS.ID_MAX);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function extractGoogleDriveFileId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const fileMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch?.[1]) return fileMatch[1];

  const paramMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (paramMatch?.[1]) return paramMatch[1];

  const lh3Match = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i);
  if (lh3Match?.[1]) return lh3Match[1];

  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/i);
  if (folderMatch?.[1]) return folderMatch[1];

  // If the string itself looks like a raw Google Drive file/folder ID (20-40 alphanumeric/dash/underscore chars)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function isValidHttpsUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return true;
  if (trimmed.length > LIMITS.DRIVE_URL_MAX) return false;
  return true;
}

export function isValidHttpsLogoUrl(rawUrl: string): boolean {
  return isValidHttpsUrl(rawUrl);
}

export function resolveMadrasahLogoCandidates(rawUrl?: string): string[] {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return [];

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return Array.from(
      new Set([
        `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`,
        `https://lh3.googleusercontent.com/d/${driveId}`,
        `https://drive.google.com/uc?export=view&id=${driveId}`,
        `https://drive.google.com/uc?export=download&id=${driveId}`,
      ])
    );
  }

  const fixedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return [fixedUrl];
}

export function resolveJadwalDownloadUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed || !/^https:\/\/.+/i.test(trimmed)) return '';

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/uc?export=download&id=${driveId}`;
  }

  const googleDocMatch = trimmed.match(
    /docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/i
  );
  if (googleDocMatch?.[1] && googleDocMatch?.[2]) {
    return `https://docs.google.com/${googleDocMatch[1]}/d/${googleDocMatch[2]}/export?format=pdf`;
  }

  return trimmed;
}

export function resolveAttendancePreviewUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed || !/^https:\/\/.+/i.test(trimmed)) return '';

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  const driveFolderMatch = trimmed.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/i);
  if (driveFolderMatch?.[1]) {
    return `https://drive.google.com/embeddedfolderview?id=${driveFolderMatch[1]}#list`;
  }

  const googleDocMatch = trimmed.match(
    /docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/i
  );
  if (googleDocMatch?.[1] && googleDocMatch?.[2]) {
    if (googleDocMatch[1] === 'spreadsheets') {
      return `https://docs.google.com/spreadsheets/d/${googleDocMatch[2]}/preview`;
    }
    return `https://docs.google.com/${googleDocMatch[1]}/d/${googleDocMatch[2]}/preview`;
  }

  return trimmed;
}

export function normalizeWhatsAppUrl(rawValue?: string): string {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return '';
  if (/^https:\/\/.+/i.test(trimmed)) return trimmed;
  if (/^http:\/\/.+/i.test(trimmed)) return trimmed.replace(/^http:\/\//i, 'https://');

  const digits = trimmed.replace(/[^0-9]/g, '');
  if (digits.length < 8) return trimmed;
  const international = digits.startsWith('0')
    ? `62${digits.slice(1)}`
    : digits.startsWith('62')
    ? digits
    : digits;
  return `https://wa.me/${international}`;
}


