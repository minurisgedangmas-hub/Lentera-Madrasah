/**
 * Security Rules Verification Suite (Dirty Dozen Payloads)
 * Designed for @firebase/rules-unit-testing against firestore.rules.
 */
import assert from 'node:assert/strict';

export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list';
  actor: { uid: string; email: string; email_verified: boolean; role?: string };
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const dirtyDozenPayloads: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Self-Assigned Admin Escalation',
    collection: 'users/attacker_uid',
    operation: 'create',
    actor: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'attacker_uid',
      email: 'attacker@example.com',
      displayName: 'Attacker',
      role: 'admin',
      linkedStudentIds: [],
      classIds: [],
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Role Tampering on Update',
    collection: 'users/student_uid',
    operation: 'update',
    actor: { uid: 'student_uid', email: 'siswa@sekolah.id', email_verified: true, role: 'siswa' },
    payload: { role: 'guru' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Ghost Field Injection',
    collection: 'grades/grade_shadow',
    operation: 'create',
    actor: { uid: 'teacher_uid', email: 'guru@sekolah.id', email_verified: true, role: 'guru' },
    payload: {
      id: 'grade_shadow',
      studentId: 'student_1',
      score: 95,
      isVerified: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Email Spoofing (Unverified Email)',
    collection: 'announcements/ann_spoof',
    operation: 'create',
    actor: { uid: 'spoof_uid', email: 'hagoyalitu@gmail.com', email_verified: false },
    payload: {
      id: 'ann_spoof',
      title: 'Pengumuman Palsu',
      content: 'Konten tidak sah',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'PII Blanket Read on users',
    collection: 'users/parent_uid',
    operation: 'get',
    actor: { uid: 'student_uid', email: 'siswa@sekolah.id', email_verified: true, role: 'siswa' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Student Grade Forgery',
    collection: 'grades/grade_forged',
    operation: 'create',
    actor: { uid: 'student_uid', email: 'siswa@sekolah.id', email_verified: true, role: 'siswa' },
    payload: {
      id: 'grade_forged',
      studentId: 'student_1',
      score: 100,
      teacherUid: 'student_uid',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned Grade Injection',
    collection: 'grades/grade_orphan',
    operation: 'create',
    actor: { uid: 'teacher_uid', email: 'guru@sekolah.id', email_verified: true, role: 'guru' },
    payload: {
      id: 'grade_orphan',
      studentId: 'non_existent_student',
      score: 88,
      teacherUid: 'teacher_uid',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Score Out-of-Bounds Poisoning',
    collection: 'grades/grade_oob',
    operation: 'create',
    actor: { uid: 'teacher_uid', email: 'guru@sekolah.id', email_verified: true, role: 'guru' },
    payload: {
      id: 'grade_oob',
      studentId: 'student_1',
      score: 999,
      teacherUid: 'teacher_uid',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Path ID Poisoning',
    collection: 'announcements/' + 'A'.repeat(200),
    operation: 'create',
    actor: { uid: 'teacher_uid', email: 'guru@sekolah.id', email_verified: true, role: 'guru' },
    payload: { id: 'A'.repeat(200), title: 'Long ID' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client Timestamp Spoofing',
    collection: 'attendance/att_backdated',
    operation: 'create',
    actor: { uid: 'teacher_uid', email: 'guru@sekolah.id', email_verified: true, role: 'guru' },
    payload: {
      id: 'att_backdated',
      studentId: 'student_1',
      date: '2020-01-01',
      status: 'Hadir',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Teacher Spoofing Another Teacher Grade',
    collection: 'grades/grade_other_teacher',
    operation: 'update',
    actor: { uid: 'teacher_a', email: 'gurua@sekolah.id', email_verified: true, role: 'guru' },
    payload: { score: 50 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unbounded Array Resource Exhaustion',
    collection: 'students/student_exhaust',
    operation: 'create',
    actor: { uid: 'teacher_uid', email: 'guru@sekolah.id', email_verified: true, role: 'guru' },
    payload: {
      id: 'student_exhaust',
      fullName: 'X'.repeat(500),
      parentUids: Array.from({ length: 25 }, (_, i) => `p_${i}`),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 13,
    name: 'Outgoing Mail Spoofing / Invalid URL Injection',
    collection: 'outgoingMails/mail_spoof',
    operation: 'create',
    actor: { uid: 'student_uid', email: 'siswa@sekolah.id', email_verified: true, role: 'siswa' },
    payload: {
      id: 'mail_spoof',
      category: 'surat_keterangan',
      letterNumber: '001/SK/2026',
      driveUrl: 'javascript:alert(1)',
      createdBy: 'teacher_uid',
    },
    expected: 'PERMISSION_DENIED',
  },
];

export function assertSpecCompleteness() {
  assert.ok(dirtyDozenPayloads.length >= 12);
}
