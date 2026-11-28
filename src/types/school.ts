import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'guru' | 'siswa' | 'orangtua' | 'pending';

export type PortalPreviewMode = 'admin' | 'guru' | 'siswa' | 'orangtua';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  linkedStudentIds: string[];
  classIds: string[];
  assignedSubjects?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  roleLabel: 'Admin' | 'Guru' | 'Siswa' | 'Orang Tua' | 'Menunggu Verifikasi';
  departmentOrClass: string;
  isPublic: boolean;
  updatedAt: Timestamp;
}

export interface RoleInvite {
  id: string;
  email: string;
  role: 'guru' | 'siswa' | 'orangtua';
  displayName: string;
  linkedStudentIds: string[];
  classIds: string[];
  assignedSubjects?: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type GradeLevel = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX' | 'X' | 'XI' | 'XII';
export type MIGradeLevel = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export interface SchoolClass {
  id: string;
  name: string;
  gradeLevel: GradeLevel;
  homeroomTeacherUid: string;
  homeroomTeacherName: string;
  academicYear: string;
  isActive: boolean;
  subjects: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type StudentStatus = 'Aktif' | 'Mutasi Keluar' | 'Alumni';
export type StudentEntryType = 'Siswa Baru' | 'Mutasi Masuk';

export interface StudentRecord {
  id: string;
  studentIdNumber?: string;
  nisn: string;
  fullName: string;
  nik?: string;
  classId: string;
  className: string;
  studentUid: string;
  parentUids: string[];
  teacherUids: string[];
  status?: StudentStatus;
  gender?: TeacherGender;
  birthPlace?: string;
  birthDate?: string;
  parentName?: string;
  fatherName?: string;
  motherName?: string;
  phone?: string;
  address?: string;
  entryType?: StudentEntryType;
  entryDate?: string;
  previousSchool?: string;
  graduationYear?: string;
  nextSchool?: string;
  certificateNumber?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type StudentMutationType = 'Masuk' | 'Keluar';

export interface StudentMutationRecord {
  id: string;
  studentId: string;
  nisn: string;
  studentName: string;
  mutationType: StudentMutationType;
  mutationDate: string;
  classId: string;
  className: string;
  schoolOriginOrDestination: string;
  reason: string;
  letterNumber: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AssessmentType = 'Tugas' | 'UH' | 'UTS' | 'UAS' | 'Praktik';
export type SemesterType = 'Ganjil 2026/2027' | 'Genap 2026/2027';

export interface GradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentUid: string;
  parentUids: string[];
  classId: string;
  className: string;
  subject: string;
  assessmentType: AssessmentType;
  title: string;
  score: number;
  maxScore: number;
  notes: string;
  semester: SemesterType;
  teacherUid: string;
  teacherName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentUid: string;
  parentUids: string[];
  classId: string;
  className: string;
  date: string;
  status: AttendanceStatus;
  notes: string;
  teacherUid: string;
  teacherName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AnnouncementCategory = 'Akademik' | 'Kegiatan' | 'Ujian' | 'Libur' | 'Umum';
export type TargetAudience = 'Semua' | 'Guru' | 'Siswa' | 'Orang Tua';

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  targetAudience: TargetAudience;
  eventDate: string;
  location: string;
  driveUrl?: string;
  isPinned: boolean;
  isPublished: boolean;
  authorUid: string;
  authorName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NotificationType = 'nilai' | 'absensi' | 'pengumuman';

export interface NotificationRecord {
  id: string;
  recipientUid: string;
  isBroadcast: boolean;
  type: NotificationType;
  title: string;
  message: string;
  studentId: string;
  studentName: string;
  relatedId: string;
  isRead: boolean;
  readByUids: string[];
  senderUid: string;
  senderName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AccreditationStatus = 'A' | 'B' | 'C' | 'Belum Terakreditasi';

export interface MadrasahIdentity {
  id: string;
  namaYayasan: string;
  namaMadrasah: string;
  nsm: string;
  npsn: string;
  statusAkreditasi: AccreditationStatus;
  alamat: string;
  tahunBerdiri: string;
  namaKepalaMadrasah: string;
  logoUrl?: string;
  heroPhotoUrl?: string;
  heroBadge?: string;
  heroTitle?: string;
  heroSlogan?: string;
  heroDescription?: string;
  heroPhotoCaption?: string;
  jadwalPelajaranUrl?: string;
  absensiReportUrl?: string;
  galeriDriveUrl?: string;
  agendaContent?: string;
  programContent?: string;
  prestasiContent?: string;
  spmbContent?: string;
  spmbUrl?: string;
  kontakPhone?: string;
  kontakEmail?: string;
  googleMapsUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  whatsappUrl?: string;
  isPublic: boolean;
  updatedBy: string;
  updatedByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type TeacherGender = 'Laki-laki' | 'Perempuan';

export interface TeacherRecord {
  id: string;
  orderNo: number;
  fullName: string;
  birthPlace: string;
  birthDate: string;
  gender: TeacherGender;
  nuptkNpkPegId: string;
  tmt: string;
  position: string;
  phone: string;
  address: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type FinanceCategory =
  | 'kas_kelas'
  | 'tabungan_siswa'
  | 'tabungan_wajib_6'
  | 'pembayaran_kursus'
  | 'ekstra_pramuka';

export type FinanceClassLevel =
  | 'Kelas 1'
  | 'Kelas 2'
  | 'Kelas 3'
  | 'Kelas 4'
  | 'Kelas 5'
  | 'Kelas 6'
  | 'Umum';

export type FinanceTransactionType = 'Masuk' | 'Keluar';

export type FinancePaymentStatus = 'Lunas' | 'Cicilan' | 'Belum Lunas' | '';

export interface FinanceTransactionRecord {
  id: string;
  category: FinanceCategory;
  classLevel: FinanceClassLevel;
  transactionType: FinanceTransactionType;
  amount: number;
  transactionDate: string;
  studentId: string;
  studentName: string;
  title: string;
  paymentStatus: FinancePaymentStatus;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AttendanceClassLevel =
  | 'Kelas 1'
  | 'Kelas 2'
  | 'Kelas 3'
  | 'Kelas 4'
  | 'Kelas 5'
  | 'Kelas 6';

export interface AttendanceReportLink {
  id: string;
  classLevel: AttendanceClassLevel;
  rombel: string;
  reportUrl: string;
  isPublic: boolean;
  createdBy: string;
  updatedBy: string;
  updatedByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}



