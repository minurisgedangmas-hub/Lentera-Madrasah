import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  clampString,
  DATE_PATTERN,
  LIMITS,
  makeDocId,
  normalizeEmailKey,
  sanitizeIdToken,
  todayIsoDate,
  YEAR_PATTERN,
} from '../lib/validation';
import {
  AccreditationStatus,
  AnnouncementCategory,
  AnnouncementRecord,
  AttendanceClassLevel,
  AttendanceRecord,
  AttendanceReportLink,
  AttendanceStatus,
  FinanceCategory,
  FinanceClassLevel,
  FinancePaymentStatus,
  FinanceTransactionRecord,
  FinanceTransactionType,
  GradeLevel,
  NotificationRecord,
  SchoolClass,
  StudentEntryType,
  StudentMutationRecord,
  StudentRecord,
  StudentStatus,
  TargetAudience,
  TeacherGender,
  TeacherRecord,
  UserProfile,
  UserRole,
} from '../types/school';
import {
  findMatchingSchoolClass,
  formatAutoClassName,
  inferGradeLevelFromClassName,
  normalizeClassKey,
  type ParsedStudentInput,
} from '../utils/studentExcel';

export async function saveMadrasahIdentity(input: {
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
  adminUid: string;
  adminName: string;
}) {
  const path = 'madrasahProfile/main';
  const ref = doc(db, 'madrasahProfile', 'main');
  const safeYear = YEAR_PATTERN.test(input.tahunBerdiri.trim())
    ? input.tahunBerdiri.trim()
    : String(new Date().getFullYear());
  const cleanLogoUrl = clampString(input.logoUrl || '', LIMITS.LOGO_URL_MAX);

  try {
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() : {};

    const cleanHeroPhotoUrl =
      input.heroPhotoUrl !== undefined
        ? clampString(input.heroPhotoUrl, LIMITS.DRIVE_URL_MAX)
        : clampString(String(existingData.heroPhotoUrl || ''), LIMITS.DRIVE_URL_MAX);
    const cleanHeroBadge =
      input.heroBadge !== undefined
        ? clampString(input.heroBadge, 100)
        : clampString(String(existingData.heroBadge || ''), 100);
    const cleanHeroTitle =
      input.heroTitle !== undefined
        ? clampString(input.heroTitle, 140)
        : clampString(String(existingData.heroTitle || ''), 140);
    const cleanHeroSlogan =
      input.heroSlogan !== undefined
        ? clampString(input.heroSlogan, 240)
        : clampString(String(existingData.heroSlogan || ''), 240);
    const cleanHeroDescription =
      input.heroDescription !== undefined
        ? clampString(input.heroDescription, 500)
        : clampString(String(existingData.heroDescription || ''), 500);
    const cleanHeroPhotoCaption =
      input.heroPhotoCaption !== undefined
        ? clampString(input.heroPhotoCaption, 120)
        : clampString(String(existingData.heroPhotoCaption || ''), 120);
    const cleanScheduleUrl =
      input.jadwalPelajaranUrl !== undefined
        ? clampString(input.jadwalPelajaranUrl, LIMITS.DRIVE_URL_MAX)
        : clampString(String(existingData.jadwalPelajaranUrl || ''), LIMITS.DRIVE_URL_MAX);
    const cleanAbsensiReportUrl =
      input.absensiReportUrl !== undefined
        ? clampString(input.absensiReportUrl, LIMITS.DRIVE_URL_MAX)
        : clampString(String(existingData.absensiReportUrl || ''), LIMITS.DRIVE_URL_MAX);
    const cleanGaleriUrl =
      input.galeriDriveUrl !== undefined
        ? clampString(input.galeriDriveUrl, LIMITS.DRIVE_URL_MAX)
        : clampString(String(existingData.galeriDriveUrl || ''), LIMITS.DRIVE_URL_MAX);
    const cleanAgendaContent =
      input.agendaContent !== undefined
        ? clampString(input.agendaContent, LIMITS.CONTENT_TEXT_MAX)
        : clampString(String(existingData.agendaContent || ''), LIMITS.CONTENT_TEXT_MAX);
    const cleanProgramContent =
      input.programContent !== undefined
        ? clampString(input.programContent, LIMITS.CONTENT_TEXT_MAX)
        : clampString(String(existingData.programContent || ''), LIMITS.CONTENT_TEXT_MAX);
    const cleanPrestasiContent =
      input.prestasiContent !== undefined
        ? clampString(input.prestasiContent, LIMITS.CONTENT_TEXT_MAX)
        : clampString(String(existingData.prestasiContent || ''), LIMITS.CONTENT_TEXT_MAX);
    const cleanSpmbContent =
      input.spmbContent !== undefined
        ? clampString(input.spmbContent, LIMITS.CONTENT_TEXT_MAX)
        : clampString(String(existingData.spmbContent || ''), LIMITS.CONTENT_TEXT_MAX);
    const cleanSpmbUrl =
      input.spmbUrl !== undefined
        ? clampString(input.spmbUrl, LIMITS.DRIVE_URL_MAX)
        : clampString(String(existingData.spmbUrl || ''), LIMITS.DRIVE_URL_MAX);
    const cleanKontakPhone =
      input.kontakPhone !== undefined
        ? clampString(input.kontakPhone, LIMITS.PHONE_MAX)
        : clampString(String(existingData.kontakPhone || ''), LIMITS.PHONE_MAX);
    const cleanKontakEmail =
      input.kontakEmail !== undefined
        ? clampString(input.kontakEmail, LIMITS.EMAIL_MAX)
        : clampString(String(existingData.kontakEmail || ''), LIMITS.EMAIL_MAX);
    const cleanGoogleMapsUrl =
      input.googleMapsUrl !== undefined
        ? clampString(input.googleMapsUrl, LIMITS.DRIVE_URL_MAX)
        : clampString(String(existingData.googleMapsUrl || ''), LIMITS.DRIVE_URL_MAX);
    const cleanYoutubeUrl =
      input.youtubeUrl !== undefined
        ? clampString(input.youtubeUrl, LIMITS.DRIVE_URL_MAX)
        : clampString(String(existingData.youtubeUrl || ''), LIMITS.DRIVE_URL_MAX);
    const cleanInstagramUrl =
      input.instagramUrl !== undefined
        ? clampString(input.instagramUrl, LIMITS.DRIVE_URL_MAX)
        : clampString(String(existingData.instagramUrl || ''), LIMITS.DRIVE_URL_MAX);
    const cleanWhatsappUrl =
      input.whatsappUrl !== undefined
        ? clampString(input.whatsappUrl, LIMITS.DRIVE_URL_MAX)
        : clampString(String(existingData.whatsappUrl || ''), LIMITS.DRIVE_URL_MAX);

    const payload = {
      id: 'main',
      namaYayasan: clampString(input.namaYayasan, LIMITS.YAYASAN_MAX),
      namaMadrasah: clampString(input.namaMadrasah, LIMITS.MADRASAH_NAME_MAX),
      nsm: clampString(input.nsm, LIMITS.NSM_MAX),
      npsn: clampString(input.npsn, LIMITS.NPSN_MAX),
      statusAkreditasi: input.statusAkreditasi,
      alamat: clampString(input.alamat, LIMITS.ADDRESS_MAX),
      tahunBerdiri: safeYear,
      namaKepalaMadrasah: clampString(input.namaKepalaMadrasah, LIMITS.HEADMASTER_MAX),
      logoUrl: cleanLogoUrl,
      heroPhotoUrl: cleanHeroPhotoUrl,
      heroBadge: cleanHeroBadge,
      heroTitle: cleanHeroTitle,
      heroSlogan: cleanHeroSlogan,
      heroDescription: cleanHeroDescription,
      heroPhotoCaption: cleanHeroPhotoCaption,
      jadwalPelajaranUrl: cleanScheduleUrl,
      absensiReportUrl: cleanAbsensiReportUrl,
      galeriDriveUrl: cleanGaleriUrl,
      agendaContent: cleanAgendaContent,
      programContent: cleanProgramContent,
      prestasiContent: cleanPrestasiContent,
      spmbContent: cleanSpmbContent,
      spmbUrl: cleanSpmbUrl,
      kontakPhone: cleanKontakPhone,
      kontakEmail: cleanKontakEmail,
      googleMapsUrl: cleanGoogleMapsUrl,
      youtubeUrl: cleanYoutubeUrl,
      instagramUrl: cleanInstagramUrl,
      whatsappUrl: cleanWhatsappUrl,
      isPublic: true,
      updatedBy: input.adminUid,
      updatedByName: clampString(input.adminName || 'Administrator Madrasah', LIMITS.DISPLAY_NAME_MAX),
    };

    if (existing.exists()) {
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateMadrasahScheduleDriveUrl(input: {
  jadwalPelajaranUrl: string;
  adminUid: string;
  adminName: string;
}) {
  const path = 'madrasahProfile/main';
  const ref = doc(db, 'madrasahProfile', 'main');
  const cleanScheduleUrl = clampString(input.jadwalPelajaranUrl, LIMITS.DRIVE_URL_MAX);

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      throw new Error('Identitas Madrasah belum diatur.');
    }
    await updateDoc(ref, {
      jadwalPelajaranUrl: cleanScheduleUrl,
      updatedBy: input.adminUid,
      updatedByName: clampString(input.adminName || 'Administrator Madrasah', LIMITS.DISPLAY_NAME_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateMadrasahAbsensiReportUrl(input: {
  absensiReportUrl: string;
  adminUid: string;
  adminName: string;
}) {
  const path = 'madrasahProfile/main';
  const ref = doc(db, 'madrasahProfile', 'main');
  const cleanAbsensiReportUrl = clampString(input.absensiReportUrl, LIMITS.DRIVE_URL_MAX);

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      throw new Error('Identitas Madrasah belum diatur.');
    }
    await updateDoc(ref, {
      absensiReportUrl: cleanAbsensiReportUrl,
      updatedBy: input.adminUid,
      updatedByName: clampString(input.adminName || 'Administrator Madrasah', LIMITS.DISPLAY_NAME_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createSchoolClass(input: {
  name: string;
  gradeLevel: GradeLevel;
  academicYear: string;
  subjects: string[];
  teacherUid: string;
  teacherName: string;
  homeroomTeacherUid?: string;
  homeroomTeacherName?: string;
}) {
  const id = makeDocId('cls');
  const path = `classes/${id}`;
  const cleanSubjects = input.subjects
    .map((s) => clampString(s, LIMITS.SUBJECT_MAX))
    .filter(Boolean)
    .slice(0, LIMITS.SUBJECTS_MAX);
  const safeHomeroomUid = sanitizeIdToken(
    input.homeroomTeacherUid || input.teacherUid,
    input.teacherUid
  );
  const safeHomeroomName = clampString(
    input.homeroomTeacherName || input.teacherName,
    LIMITS.DISPLAY_NAME_MAX
  );

  try {
    await setDoc(doc(db, 'classes', id), {
      id,
      name: clampString(input.name, LIMITS.CLASS_NAME_MAX),
      gradeLevel: input.gradeLevel,
      homeroomTeacherUid: safeHomeroomUid,
      homeroomTeacherName: safeHomeroomName,
      academicYear: clampString(input.academicYear, LIMITS.ACADEMIC_YEAR_MAX),
      isActive: true,
      subjects: cleanSubjects.length > 0 ? cleanSubjects : ["Al-Qur'an Hadis", 'Matematika', 'Bahasa Indonesia'],
      createdBy: input.teacherUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function assignHomeroomTeacher(input: {
  schoolClass: SchoolClass;
  homeroomTeacherUid: string;
  homeroomTeacherName: string;
  teacherRecord?: TeacherRecord;
  syncTeacherPosition?: boolean;
  linkedUser?: UserProfile;
  classStudents?: StudentRecord[];
}) {
  const path = `classes/${input.schoolClass.id}`;
  const safeUid = sanitizeIdToken(input.homeroomTeacherUid, input.schoolClass.homeroomTeacherUid);
  const safeName = clampString(input.homeroomTeacherName, LIMITS.DISPLAY_NAME_MAX);

  const batch = writeBatch(db);
  batch.update(doc(db, 'classes', input.schoolClass.id), {
    homeroomTeacherUid: safeUid,
    homeroomTeacherName: safeName,
    updatedAt: serverTimestamp(),
  });

  if (input.syncTeacherPosition && input.teacherRecord) {
    batch.update(doc(db, 'teachers', input.teacherRecord.id), {
      position: clampString(`Wali Kelas ${input.schoolClass.name}`, LIMITS.TEACHER_POSITION_MAX),
      updatedAt: serverTimestamp(),
    });
  }

  if (input.linkedUser) {
    const updatedClassIds = Array.from(
      new Set([...(input.linkedUser.classIds || []), input.schoolClass.id])
    ).slice(0, LIMITS.CLASS_IDS_MAX);
    batch.update(doc(db, 'users', input.linkedUser.uid), {
      classIds: updatedClassIds,
      updatedAt: serverTimestamp(),
    });

    for (const stu of input.classStudents || []) {
      const updatedTeacherUids = Array.from(
        new Set([...(stu.teacherUids || []), input.linkedUser.uid])
      ).slice(0, LIMITS.TEACHER_UIDS_MAX);
      batch.update(doc(db, 'students', stu.id), {
        teacherUids: updatedTeacherUids,
        updatedAt: serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function clearHomeroomTeacher(input: {
  schoolClass: SchoolClass;
  teacherRecord?: TeacherRecord;
  syncTeacherPosition?: boolean;
  linkedUser?: UserProfile;
  classStudents?: StudentRecord[];
}) {
  const path = `classes/${input.schoolClass.id}`;
  const batch = writeBatch(db);

  batch.update(doc(db, 'classes', input.schoolClass.id), {
    homeroomTeacherUid: 'unassigned',
    homeroomTeacherName: 'Belum Ditentukan',
    updatedAt: serverTimestamp(),
  });

  if (
    input.syncTeacherPosition &&
    input.teacherRecord &&
    input.teacherRecord.position.toLowerCase().includes('wali kelas')
  ) {
    batch.update(doc(db, 'teachers', input.teacherRecord.id), {
      position: 'Guru Kelas',
      updatedAt: serverTimestamp(),
    });
  }

  if (input.linkedUser) {
    const remainingClassIds = (input.linkedUser.classIds || []).filter(
      (cid) => cid !== input.schoolClass.id
    );
    batch.update(doc(db, 'users', input.linkedUser.uid), {
      classIds: remainingClassIds,
      updatedAt: serverTimestamp(),
    });

    for (const stu of input.classStudents || []) {
      const remainingTeacherUids = (stu.teacherUids || []).filter(
        (tid) => tid !== input.linkedUser!.uid
      );
      batch.update(doc(db, 'students', stu.id), {
        teacherUids: remainingTeacherUids,
        updatedAt: serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteSchoolClass(schoolClass: SchoolClass) {
  const path = `classes/${schoolClass.id}`;
  try {
    await deleteDoc(doc(db, 'classes', schoolClass.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createStudentRecord(input: {
  studentIdNumber?: string;
  nisn: string;
  fullName: string;
  nik?: string;
  schoolClass: SchoolClass;
  studentUid?: string;
  parentUids?: string[];
  teacherUid: string;
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
}) {
  const id = makeDocId('stu');
  const path = `students/${id}`;
  const nisn = sanitizeIdToken(input.nisn, `NISN_${Date.now()}`).slice(0, LIMITS.NISN_MAX);
  const fullName = clampString(input.fullName, LIMITS.DISPLAY_NAME_MAX);
  const parentUids = (input.parentUids || [])
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, LIMITS.PARENT_UIDS_MAX);

  try {
    await setDoc(doc(db, 'students', id), {
      id,
      studentIdNumber: clampString(input.studentIdNumber || '', LIMITS.STUDENT_ID_NUMBER_MAX),
      nisn: nisn.length >= 4 ? nisn : `${nisn}0000`.slice(0, 8),
      fullName,
      nik: clampString(input.nik || '', LIMITS.NIK_MAX),
      classId: input.schoolClass.id,
      className: input.schoolClass.name,
      studentUid: clampString(input.studentUid || '', LIMITS.ID_MAX),
      parentUids,
      teacherUids: Array.from(new Set([input.teacherUid, input.schoolClass.homeroomTeacherUid])).slice(
        0,
        LIMITS.TEACHER_UIDS_MAX
      ),
      status: input.status || 'Aktif',
      gender: input.gender || 'Laki-laki',
      birthPlace: clampString(input.birthPlace || '', LIMITS.TEACHER_BIRTH_PLACE_MAX),
      birthDate: clampString(input.birthDate || '', LIMITS.TEACHER_DATE_MAX),
      parentName: clampString(input.parentName || '', LIMITS.PARENT_NAME_MAX),
      fatherName: clampString(input.fatherName || '', LIMITS.PARENT_NAME_MAX),
      motherName: clampString(input.motherName || '', LIMITS.PARENT_NAME_MAX),
      phone: clampString(input.phone || '', LIMITS.TEACHER_PHONE_MAX),
      address: clampString(input.address || '', LIMITS.TEACHER_ADDRESS_MAX),
      entryType: input.entryType || 'Siswa Baru',
      entryDate: clampString(input.entryDate || todayIsoDate(), LIMITS.TEACHER_DATE_MAX),
      previousSchool: clampString(input.previousSchool || '', LIMITS.SCHOOL_NAME_MAX),
      graduationYear: clampString(input.graduationYear || '', LIMITS.GRADUATION_YEAR_MAX),
      nextSchool: clampString(input.nextSchool || '', LIMITS.SCHOOL_NAME_MAX),
      certificateNumber: clampString(input.certificateNumber || '', LIMITS.CERTIFICATE_NUMBER_MAX),
      createdBy: input.teacherUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateStudentProfile(
  student: StudentRecord,
  input: {
    studentIdNumber?: string;
    nisn: string;
    fullName: string;
    nik?: string;
    schoolClass: SchoolClass;
    status: StudentStatus;
    gender: TeacherGender;
    birthPlace: string;
    birthDate: string;
    parentName: string;
    fatherName?: string;
    motherName?: string;
    phone: string;
    address: string;
    studentUid: string;
    parentUids: string[];
    graduationYear?: string;
    nextSchool?: string;
    certificateNumber?: string;
  }
) {
  const path = `students/${student.id}`;
  const nisn = sanitizeIdToken(input.nisn, student.nisn).slice(0, LIMITS.NISN_MAX);
  try {
    await updateDoc(doc(db, 'students', student.id), {
      studentIdNumber: clampString(
        input.studentIdNumber !== undefined ? input.studentIdNumber : student.studentIdNumber || '',
        LIMITS.STUDENT_ID_NUMBER_MAX
      ),
      nisn: nisn.length >= 4 ? nisn : student.nisn,
      fullName: clampString(input.fullName, LIMITS.DISPLAY_NAME_MAX),
      nik: clampString(input.nik !== undefined ? input.nik : student.nik || '', LIMITS.NIK_MAX),
      classId: input.schoolClass.id,
      className: input.schoolClass.name,
      status: input.status,
      gender: input.gender,
      birthPlace: clampString(input.birthPlace, LIMITS.TEACHER_BIRTH_PLACE_MAX),
      birthDate: clampString(input.birthDate, LIMITS.TEACHER_DATE_MAX),
      parentName: clampString(input.parentName, LIMITS.PARENT_NAME_MAX),
      fatherName: clampString(input.fatherName || student.fatherName || '', LIMITS.PARENT_NAME_MAX),
      motherName: clampString(input.motherName || student.motherName || '', LIMITS.PARENT_NAME_MAX),
      phone: clampString(input.phone, LIMITS.TEACHER_PHONE_MAX),
      address: clampString(input.address, LIMITS.TEACHER_ADDRESS_MAX),
      studentUid: clampString(input.studentUid, LIMITS.ID_MAX),
      parentUids: input.parentUids.map((u) => u.trim()).filter(Boolean).slice(0, LIMITS.PARENT_UIDS_MAX),
      teacherUids: Array.from(
        new Set([...(student.teacherUids || []), input.schoolClass.homeroomTeacherUid])
      ).slice(0, LIMITS.TEACHER_UIDS_MAX),
      graduationYear: clampString(input.graduationYear ?? student.graduationYear ?? '', LIMITS.GRADUATION_YEAR_MAX),
      nextSchool: clampString(input.nextSchool ?? student.nextSchool ?? '', LIMITS.SCHOOL_NAME_MAX),
      certificateNumber: clampString(
        input.certificateNumber ?? student.certificateNumber ?? '',
        LIMITS.CERTIFICATE_NUMBER_MAX
      ),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteStudentRecord(student: StudentRecord) {
  try {
    await deleteDoc(doc(db, 'students', student.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `students/${student.id}`);
  }
}

export async function deleteStudentsBatch(studentIds: string[]): Promise<number> {
  const uniqueIds = Array.from(new Set(studentIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return 0;

  const CHUNK_SIZE = 400;
  let deleted = 0;

  try {
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'students', id));
      }
      await batch.commit();
      deleted += chunk.length;
    }
    return deleted;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'students');
    return deleted;
  }
}

export async function recordStudentMutationIn(input: {
  nisn: string;
  fullName: string;
  nik?: string;
  gender: TeacherGender;
  birthPlace: string;
  birthDate: string;
  parentName: string;
  phone: string;
  address: string;
  schoolClass: SchoolClass;
  mutationDate: string;
  previousSchool: string;
  letterNumber: string;
  reason: string;
  actorUid: string;
}) {
  const studentId = makeDocId('stu');
  const mutationId = makeDocId('mut');
  const nisn = sanitizeIdToken(input.nisn, `NISN_${Date.now()}`).slice(0, LIMITS.NISN_MAX);
  const safeNisn = nisn.length >= 4 ? nisn : `${nisn}0000`.slice(0, 8);
  const safeName = clampString(input.fullName, LIMITS.DISPLAY_NAME_MAX);
  const safeDate = DATE_PATTERN.test(input.mutationDate) ? input.mutationDate : todayIsoDate();
  const safeSchool = clampString(input.previousSchool, LIMITS.SCHOOL_NAME_MAX);

  const batch = writeBatch(db);
  batch.set(doc(db, 'students', studentId), {
    id: studentId,
    nisn: safeNisn,
    fullName: safeName,
    nik: clampString(input.nik || '', LIMITS.NIK_MAX),
    classId: input.schoolClass.id,
    className: input.schoolClass.name,
    studentUid: '',
    parentUids: [],
    teacherUids: Array.from(new Set([input.actorUid, input.schoolClass.homeroomTeacherUid])).slice(
      0,
      LIMITS.TEACHER_UIDS_MAX
    ),
    status: 'Aktif',
    gender: input.gender,
    birthPlace: clampString(input.birthPlace, LIMITS.TEACHER_BIRTH_PLACE_MAX),
    birthDate: clampString(input.birthDate, LIMITS.TEACHER_DATE_MAX),
    parentName: clampString(input.parentName, LIMITS.PARENT_NAME_MAX),
    phone: clampString(input.phone, LIMITS.TEACHER_PHONE_MAX),
    address: clampString(input.address, LIMITS.TEACHER_ADDRESS_MAX),
    entryType: 'Mutasi Masuk',
    entryDate: safeDate,
    previousSchool: safeSchool,
    graduationYear: '',
    nextSchool: '',
    certificateNumber: '',
    createdBy: input.actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'studentMutations', mutationId), {
    id: mutationId,
    studentId,
    nisn: safeNisn,
    studentName: safeName,
    mutationType: 'Masuk',
    mutationDate: safeDate,
    classId: input.schoolClass.id,
    className: input.schoolClass.name,
    schoolOriginOrDestination: safeSchool,
    reason: clampString(input.reason, LIMITS.MUTATION_REASON_MAX),
    letterNumber: clampString(input.letterNumber, LIMITS.LETTER_NUMBER_MAX),
    createdBy: input.actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return studentId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `studentMutations/${mutationId}`);
  }
}

export async function recordStudentMutationOut(input: {
  student: StudentRecord;
  mutationDate: string;
  destinationSchool: string;
  letterNumber: string;
  reason: string;
  actorUid: string;
}) {
  const mutationId = makeDocId('mut');
  const safeDate = DATE_PATTERN.test(input.mutationDate) ? input.mutationDate : todayIsoDate();
  const safeSchool = clampString(input.destinationSchool, LIMITS.SCHOOL_NAME_MAX);

  const batch = writeBatch(db);
  batch.update(doc(db, 'students', input.student.id), {
    status: 'Mutasi Keluar',
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'studentMutations', mutationId), {
    id: mutationId,
    studentId: input.student.id,
    nisn: input.student.nisn,
    studentName: input.student.fullName,
    mutationType: 'Keluar',
    mutationDate: safeDate,
    classId: input.student.classId,
    className: input.student.className,
    schoolOriginOrDestination: safeSchool,
    reason: clampString(input.reason, LIMITS.MUTATION_REASON_MAX),
    letterNumber: clampString(input.letterNumber, LIMITS.LETTER_NUMBER_MAX),
    createdBy: input.actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return mutationId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `studentMutations/${mutationId}`);
  }
}

export async function deleteStudentMutationLog(mutation: StudentMutationRecord) {
  try {
    await deleteDoc(doc(db, 'studentMutations', mutation.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `studentMutations/${mutation.id}`);
  }
}

export async function promoteStudentsBatch(input: {
  students: StudentRecord[];
  mode: 'promote' | 'graduate';
  targetClass?: SchoolClass;
  graduationYear?: string;
}) {
  if (input.students.length === 0) return 0;
  const CHUNK_SIZE = 400;
  let updated = 0;

  try {
    for (let i = 0; i < input.students.length; i += CHUNK_SIZE) {
      const chunk = input.students.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const stu of chunk) {
        if (input.mode === 'promote' && input.targetClass) {
          const updatedTeacherUids = Array.from(
            new Set([...(stu.teacherUids || []), input.targetClass.homeroomTeacherUid])
          ).slice(0, LIMITS.TEACHER_UIDS_MAX);
          batch.update(doc(db, 'students', stu.id), {
            classId: input.targetClass.id,
            className: input.targetClass.name,
            teacherUids: updatedTeacherUids,
            status: 'Aktif',
            updatedAt: serverTimestamp(),
          });
        } else if (input.mode === 'graduate') {
          batch.update(doc(db, 'students', stu.id), {
            status: 'Alumni',
            graduationYear: clampString(
              input.graduationYear || String(new Date().getFullYear()),
              LIMITS.GRADUATION_YEAR_MAX
            ),
            updatedAt: serverTimestamp(),
          });
        }
      }
      await batch.commit();
      updated += chunk.length;
    }
    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'students');
    return updated;
  }
}

export async function linkStudentAccounts(input: {
  student: StudentRecord;
  studentUid: string;
  parentUids: string[];
  teacherUids: string[];
}) {
  const path = `students/${input.student.id}`;
  try {
    await updateDoc(doc(db, 'students', input.student.id), {
      studentUid: clampString(input.studentUid, LIMITS.ID_MAX),
      parentUids: input.parentUids.map((u) => u.trim()).filter(Boolean).slice(0, LIMITS.PARENT_UIDS_MAX),
      teacherUids: input.teacherUids.map((u) => u.trim()).filter(Boolean).slice(0, LIMITS.TEACHER_UIDS_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function recordAttendanceBatchWithNotifications(input: {
  entries: Array<{
    student: StudentRecord;
    status: AttendanceStatus;
    notes: string;
  }>;
  date: string;
  teacherUid: string;
  teacherName: string;
}) {
  const safeDate = DATE_PATTERN.test(input.date) ? input.date : todayIsoDate();
  const teacherName = clampString(input.teacherName, LIMITS.DISPLAY_NAME_MAX);
  const batch = writeBatch(db);

  for (const entry of input.entries) {
    const attId = `att_${safeDate.replace(/-/g, '')}_${entry.student.id.slice(0, 32)}`;
    const notes = clampString(entry.notes, LIMITS.ATTENDANCE_NOTES_MAX);

    batch.set(doc(db, 'attendance', attId), {
      id: attId,
      studentId: entry.student.id,
      studentName: entry.student.fullName,
      studentUid: entry.student.studentUid || '',
      parentUids: entry.student.parentUids || [],
      classId: entry.student.classId,
      className: entry.student.className,
      date: safeDate,
      status: entry.status,
      notes,
      teacherUid: input.teacherUid,
      teacherName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const recipientTargets = Array.from(
      new Set(
        [entry.student.studentUid, ...(entry.student.parentUids || []), input.teacherUid].filter(Boolean)
      )
    );

    for (const recipientUid of recipientTargets) {
      const notifId = makeDocId('ntf');
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientUid,
        isBroadcast: false,
        type: 'absensi',
        title: `Absensi ${entry.status} · ${entry.student.fullName}`,
        message: `Kehadiran tanggal ${safeDate} (${entry.student.className}): ${entry.status}.${notes ? ` Keterangan: ${notes}` : ''}`.slice(
          0,
          LIMITS.NOTIFICATION_MESSAGE_MAX
        ),
        studentId: entry.student.id,
        studentName: entry.student.fullName,
        relatedId: attId,
        isRead: recipientUid === input.teacherUid,
        readByUids: [],
        senderUid: input.teacherUid,
        senderName: teacherName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'attendance');
  }
}

export async function publishAnnouncementWithNotification(input: {
  title: string;
  content: string;
  category: AnnouncementCategory;
  targetAudience: TargetAudience;
  eventDate: string;
  location: string;
  driveUrl?: string;
  isPinned: boolean;
  isPublished?: boolean;
  authorUid: string;
  authorName: string;
}) {
  const annId = makeDocId('ann');
  const notifId = makeDocId('ntf');
  const title = clampString(input.title, LIMITS.ANNOUNCEMENT_TITLE_MAX);
  const content = clampString(input.content, LIMITS.ANNOUNCEMENT_CONTENT_MAX);
  const authorName = clampString(input.authorName, LIMITS.DISPLAY_NAME_MAX);
  const cleanDriveUrl = clampString(input.driveUrl || '', LIMITS.DRIVE_URL_MAX);
  const isPublished = input.isPublished ?? true;

  const batch = writeBatch(db);

  batch.set(doc(db, 'announcements', annId), {
    id: annId,
    title,
    content,
    category: input.category,
    targetAudience: input.targetAudience,
    eventDate: clampString(input.eventDate, LIMITS.EVENT_DATE_MAX),
    location: clampString(input.location, LIMITS.ANNOUNCEMENT_LOCATION_MAX),
    driveUrl: cleanDriveUrl,
    isPinned: input.isPinned,
    isPublished,
    authorUid: input.authorUid,
    authorName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (isPublished) {
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      recipientUid: 'ALL_SCHOOL',
      isBroadcast: true,
      type: 'pengumuman',
      title: `Pengumuman ${input.category}: ${title}`.slice(0, LIMITS.NOTIFICATION_TITLE_MAX),
      message: content.slice(0, LIMITS.NOTIFICATION_MESSAGE_MAX),
      studentId: '',
      studentName: '',
      relatedId: annId,
      isRead: false,
      readByUids: [],
      senderUid: input.authorUid,
      senderName: authorName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
    return annId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `announcements/${annId}`);
  }
}

export async function updateAnnouncementRecord(
  ann: AnnouncementRecord,
  input: {
    title: string;
    content: string;
    category: AnnouncementCategory;
    targetAudience: TargetAudience;
    eventDate: string;
    location: string;
    driveUrl?: string;
    isPinned: boolean;
    isPublished: boolean;
  }
) {
  const path = `announcements/${ann.id}`;
  const cleanDriveUrl =
    input.driveUrl !== undefined
      ? clampString(input.driveUrl, LIMITS.DRIVE_URL_MAX)
      : clampString(ann.driveUrl || '', LIMITS.DRIVE_URL_MAX);

  try {
    await updateDoc(doc(db, 'announcements', ann.id), {
      title: clampString(input.title, LIMITS.ANNOUNCEMENT_TITLE_MAX),
      content: clampString(input.content, LIMITS.ANNOUNCEMENT_CONTENT_MAX),
      category: input.category,
      targetAudience: input.targetAudience,
      eventDate: clampString(input.eventDate, LIMITS.EVENT_DATE_MAX),
      location: clampString(input.location, LIMITS.ANNOUNCEMENT_LOCATION_MAX),
      driveUrl: cleanDriveUrl,
      isPinned: input.isPinned,
      isPublished: input.isPublished,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function markNotificationRead(notif: NotificationRecord, currentUid: string) {
  const path = `notifications/${notif.id}`;
  try {
    if (notif.isBroadcast) {
      await updateDoc(doc(db, 'notifications', notif.id), {
        readByUids: arrayUnion(currentUid),
        updatedAt: serverTimestamp(),
      });
    } else if (!notif.isRead) {
      await updateDoc(doc(db, 'notifications', notif.id), {
        isRead: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createOrUpdateRoleInvite(input: {
  email: string;
  role: 'guru' | 'siswa' | 'orangtua';
  displayName: string;
  linkedStudentIds: string[];
  classIds: string[];
  assignedSubjects?: string[];
  adminUid: string;
}) {
  const cleanEmail = input.email.trim().toLowerCase().slice(0, LIMITS.EMAIL_MAX);
  const inviteId = normalizeEmailKey(cleanEmail);
  const path = `roleInvites/${inviteId}`;
  const cleanSubjects = (input.assignedSubjects || [])
    .map((s) => clampString(s, LIMITS.SUBJECT_MAX))
    .filter(Boolean)
    .slice(0, LIMITS.SUBJECTS_MAX);

  try {
    await setDoc(doc(db, 'roleInvites', inviteId), {
      email: cleanEmail,
      role: input.role,
      displayName: clampString(input.displayName, LIMITS.DISPLAY_NAME_MAX),
      linkedStudentIds: input.linkedStudentIds.slice(0, LIMITS.LINKED_STUDENTS_MAX),
      classIds: input.classIds.slice(0, LIMITS.CLASS_IDS_MAX),
      assignedSubjects: cleanSubjects,
      createdBy: input.adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return inviteId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserRoleByAdmin(input: {
  user: UserProfile;
  role: UserRole;
  linkedStudentIds: string[];
  classIds: string[];
  assignedSubjects?: string[];
}) {
  const path = `users/${input.user.uid}`;
  const roleLabel =
    input.role === 'admin'
      ? 'Admin'
      : input.role === 'guru'
      ? 'Guru'
      : input.role === 'siswa'
      ? 'Siswa'
      : input.role === 'orangtua'
      ? 'Orang Tua'
      : 'Menunggu Verifikasi';

  const cleanSubjects = (input.assignedSubjects ?? input.user.assignedSubjects ?? [])
    .map((s) => clampString(s, LIMITS.SUBJECT_MAX))
    .filter(Boolean)
    .slice(0, LIMITS.SUBJECTS_MAX);

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', input.user.uid), {
    role: input.role,
    linkedStudentIds: input.linkedStudentIds.slice(0, LIMITS.LINKED_STUDENTS_MAX),
    classIds: input.classIds.slice(0, LIMITS.CLASS_IDS_MAX),
    assignedSubjects: cleanSubjects,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    doc(db, 'publicProfiles', input.user.uid),
    {
      uid: input.user.uid,
      displayName: input.user.displayName,
      roleLabel,
      departmentOrClass: cleanSubjects.join(', ').slice(0, 80),
      isPublic: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteAttendanceRecord(record: AttendanceRecord) {
  try {
    await deleteDoc(doc(db, 'attendance', record.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `attendance/${record.id}`);
  }
}

export async function deleteAnnouncementRecord(record: AnnouncementRecord) {
  try {
    await deleteDoc(doc(db, 'announcements', record.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `announcements/${record.id}`);
  }
}

export interface TeacherInputPayload {
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
  isActive?: boolean;
}

function buildTeacherDocPayload(input: TeacherInputPayload) {
  const safeOrder = Number.isFinite(input.orderNo)
    ? Math.max(0, Math.min(LIMITS.TEACHER_ORDER_MAX, Math.round(input.orderNo)))
    : 0;
  return {
    orderNo: safeOrder,
    fullName: clampString(input.fullName, LIMITS.DISPLAY_NAME_MAX),
    birthPlace: clampString(input.birthPlace, LIMITS.TEACHER_BIRTH_PLACE_MAX),
    birthDate: clampString(input.birthDate, LIMITS.TEACHER_DATE_MAX),
    gender: input.gender,
    nuptkNpkPegId: clampString(input.nuptkNpkPegId, LIMITS.TEACHER_ID_NUMBER_MAX),
    tmt: clampString(input.tmt, LIMITS.TEACHER_DATE_MAX),
    position: clampString(input.position, LIMITS.TEACHER_POSITION_MAX),
    phone: clampString(input.phone, LIMITS.TEACHER_PHONE_MAX),
    address: clampString(input.address, LIMITS.TEACHER_ADDRESS_MAX),
    isActive: input.isActive ?? true,
  };
}

export async function createTeacherRecord(input: TeacherInputPayload & { adminUid: string }) {
  const id = makeDocId('tch');
  const path = `teachers/${id}`;
  try {
    await setDoc(doc(db, 'teachers', id), {
      id,
      ...buildTeacherDocPayload(input),
      createdBy: input.adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateTeacherRecord(
  teacher: TeacherRecord,
  input: TeacherInputPayload
) {
  const path = `teachers/${teacher.id}`;
  try {
    await updateDoc(doc(db, 'teachers', teacher.id), {
      ...buildTeacherDocPayload(input),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteTeacherRecord(teacher: TeacherRecord) {
  try {
    await deleteDoc(doc(db, 'teachers', teacher.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `teachers/${teacher.id}`);
  }
}

export async function importTeachersBatch(
  entries: TeacherInputPayload[],
  adminUid: string
): Promise<number> {
  if (entries.length === 0) return 0;
  const CHUNK_SIZE = 400;
  let imported = 0;

  try {
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const entry of chunk) {
        const id = makeDocId('tch');
        batch.set(doc(db, 'teachers', id), {
          id,
          ...buildTeacherDocPayload(entry),
          createdBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      imported += chunk.length;
    }
    return imported;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'teachers');
    return imported;
  }
}

export async function seedSampleSchoolData(adminUid: string, adminName: string) {
  const safeTeacherName = clampString(adminName || 'Ustadzah Ratna Sari, S.Pd.I.', LIMITS.DISPLAY_NAME_MAX);
  const today = todayIsoDate();

  // Step 1: Create MI Classes first so students exist check passes cleanly
  const classBatch = writeBatch(db);
  const classes: Array<Omit<SchoolClass, 'createdAt' | 'updatedAt'>> = [
    {
      id: 'cls_mi_4a',
      name: 'IV A',
      gradeLevel: 'IV',
      homeroomTeacherUid: adminUid,
      homeroomTeacherName: safeTeacherName,
      academicYear: '2026/2027',
      isActive: true,
      subjects: ["Al-Qur'an Hadis", 'Akidah Akhlak', 'Fikih', 'Bahasa Arab', 'Matematika', 'IPAS', 'Bahasa Indonesia'],
      createdBy: adminUid,
    },
    {
      id: 'cls_mi_5b',
      name: 'V B',
      gradeLevel: 'V',
      homeroomTeacherUid: adminUid,
      homeroomTeacherName: safeTeacherName,
      academicYear: '2026/2027',
      isActive: true,
      subjects: ["Al-Qur'an Hadis", 'Fikih', 'SKI', 'Bahasa Arab', 'Matematika', 'Bahasa Indonesia', 'Pendidikan Pancasila'],
      createdBy: adminUid,
    },
  ];

  for (const cls of classes) {
    classBatch.set(doc(db, 'classes', cls.id), {
      ...cls,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await classBatch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'classes');
  }

  // Step 2: Create MI Students (classes now exist in Firestore)
  const studentBatch = writeBatch(db);
  const sampleStudents = [
    { id: 'stu_mi_01', nisn: '3154129001', fullName: 'Aisyah Zahra Putri', classId: 'cls_mi_4a', className: 'IV A' },
    { id: 'stu_mi_02', nisn: '3154129002', fullName: 'Muhammad Fatih Al-Ghifari', classId: 'cls_mi_4a', className: 'IV A' },
    { id: 'stu_mi_03', nisn: '3154129003', fullName: 'Hafizah Nurul Hidayah', classId: 'cls_mi_4a', className: 'IV A' },
    { id: 'stu_mi_04', nisn: '3144129004', fullName: 'Ahmad Rayyan Pratama', classId: 'cls_mi_5b', className: 'V B' },
    { id: 'stu_mi_05', nisn: '3144129005', fullName: 'Khadijah Az-Zahra', classId: 'cls_mi_5b', className: 'V B' },
  ];

  for (const stu of sampleStudents) {
    studentBatch.set(doc(db, 'students', stu.id), {
      ...stu,
      studentUid: '',
      parentUids: [],
      teacherUids: [adminUid],
      createdBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await studentBatch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'students');
  }

  // Step 3: Create MI Attendance, Announcements & Broadcast Notifications
  const dataBatch = writeBatch(db);

  const sampleAtt: Array<{
    id: string;
    studentId: string;
    studentName: string;
    classId: string;
    className: string;
    status: AttendanceStatus;
    notes: string;
  }> = [
    {
      id: `att_${today.replace(/-/g, '')}_stu_mi_01`,
      studentId: 'stu_mi_01',
      studentName: 'Aisyah Zahra Putri',
      classId: 'cls_mi_4a',
      className: 'IV A',
      status: 'Hadir',
      notes: 'Hadir tepat waktu mengikuti tadarus pagi pukul 06.55 WIB',
    },
    {
      id: `att_${today.replace(/-/g, '')}_stu_mi_02`,
      studentId: 'stu_mi_02',
      studentName: 'Muhammad Fatih Al-Ghifari',
      classId: 'cls_mi_4a',
      className: 'IV A',
      status: 'Hadir',
      notes: '',
    },
    {
      id: `att_${today.replace(/-/g, '')}_stu_mi_03`,
      studentId: 'stu_mi_03',
      studentName: 'Hafizah Nurul Hidayah',
      classId: 'cls_mi_4a',
      className: 'IV A',
      status: 'Izin',
      notes: 'Mengikuti lomba Musabaqah Tilawatil Qur’an tingkat kecamatan',
    },
    {
      id: `att_${today.replace(/-/g, '')}_stu_mi_04`,
      studentId: 'stu_mi_04',
      studentName: 'Ahmad Rayyan Pratama',
      classId: 'cls_mi_5b',
      className: 'V B',
      status: 'Hadir',
      notes: '',
    },
    {
      id: `att_${today.replace(/-/g, '')}_stu_mi_05`,
      studentId: 'stu_mi_05',
      studentName: 'Khadijah Az-Zahra',
      classId: 'cls_mi_5b',
      className: 'V B',
      status: 'Sakit',
      notes: 'Surat izin orang tua telah diterima wali kelas MI',
    },
  ];

  for (const a of sampleAtt) {
    dataBatch.set(doc(db, 'attendance', a.id), {
      ...a,
      studentUid: '',
      parentUids: [],
      date: today,
      teacherUid: adminUid,
      teacherName: safeTeacherName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const sampleAnnouncements = [
    {
      id: 'ann_mi_1',
      title: 'Gebyar Kaligrafi & Pameran Sains Cilik MI 2026',
      content:
        'Seluruh siswa kelas I hingga VI diundang berpartisipasi dalam pameran proyek sains cilik dan karya kaligrafi pada Festival Madrasah tahunan. Orang tua/wali murid dipersilakan hadir mulai pukul 08.00 WIB.',
      category: 'Kegiatan' as AnnouncementCategory,
      targetAudience: 'Semua' as TargetAudience,
      eventDate: '2026-12-05',
      location: 'Aula Utama Madrasah',
      isPinned: false,
    },
    {
      id: 'ann_mi_2',
      title: 'Jadwal Pengambilan Rapor Tengah Semester Ganjil MI',
      content:
        'Wali kelas MI akan membagikan laporan hasil belajar tengah semester dan capaian tahfidz serta sesi konsultasi perkembangan akhlak dan akademik siswa bersama orang tua/wali murid.',
      category: 'Akademik' as AnnouncementCategory,
      targetAudience: 'Orang Tua' as TargetAudience,
      eventDate: '2026-12-12',
      location: 'Ruang Kelas I–VI Madrasah',
      isPinned: false,
    },
  ];

  for (const ann of sampleAnnouncements) {
    dataBatch.set(doc(db, 'announcements', ann.id), {
      ...ann,
      isPublished: true,
      authorUid: adminUid,
      authorName: safeTeacherName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  dataBatch.set(doc(db, 'notifications', 'ntf_mi_welcome'), {
    id: 'ntf_mi_welcome',
    recipientUid: 'ALL_SCHOOL',
    isBroadcast: true,
    type: 'pengumuman',
    title: 'Pengumuman Madrasah: Gebyar Kaligrafi & Sains Cilik MI 2026',
    message: 'Festival Madrasah tahunan akan diselenggarakan pada 5 Desember 2026 di Aula Utama Madrasah. Orang tua murid diundang hadir.',
    studentId: '',
    studentName: '',
    relatedId: 'ann_mi_1',
    isRead: false,
    readByUids: [],
    senderUid: adminUid,
    senderName: safeTeacherName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    const existingProfile = await getDoc(doc(db, 'madrasahProfile', 'main'));
    if (!existingProfile.exists()) {
      dataBatch.set(doc(db, 'madrasahProfile', 'main'), {
        id: 'main',
        namaYayasan: 'Yayasan Pendidikan Islam Al-Hidayah',
        namaMadrasah: 'MI Al-Hidayah Nusantara',
        nsm: '111232750012',
        npsn: '60708912',
        statusAkreditasi: 'A',
        alamat: 'Jl. KH. Ahmad Dahlan No. 24, Kec. Bekasi Timur, Kota Bekasi, Jawa Barat 17113',
        tahunBerdiri: '1998',
        namaKepalaMadrasah: 'H. Ahmad Fauzi, S.Pd.I., M.Pd.',
        logoUrl: '',
        jadwalPelajaranUrl: '',
        isPublic: true,
        updatedBy: adminUid,
        updatedByName: safeTeacherName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await dataBatch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'seedSampleSchoolData');
  }
}

export async function importStudentsBatch(
  entries: ParsedStudentInput[],
  adminUid: string,
  classes: SchoolClass[],
  adminName?: string
): Promise<number> {
  if (entries.length === 0) return 0;
  const CHUNK_SIZE = 400;
  let imported = 0;

  try {
    // 1. Ensure any Excel classes not yet registered in Firestore exist before inserting students
    const availableClasses: SchoolClass[] = [...classes];
    const missingClassDrafts: Array<{
      id: string;
      name: string;
      gradeLevel: SchoolClass['gradeLevel'];
    }> = [];
    const seenMissingKeys = new Set<string>();

    for (const entry of entries) {
      const rawName = (entry.className || '').trim();
      if (!rawName) continue;
      const existing =
        (entry.classId ? availableClasses.find((c) => c.id === entry.classId) : undefined) ||
        findMatchingSchoolClass(rawName, availableClasses);
      if (!existing) {
        const key = normalizeClassKey(rawName) || rawName.toLowerCase();
        if (!seenMissingKeys.has(key)) {
          seenMissingKeys.add(key);
          const cleanName = formatAutoClassName(rawName);
          const newId = makeDocId('cls');
          const gradeLevel = inferGradeLevelFromClassName(cleanName);
          missingClassDrafts.push({
            id: newId,
            name: cleanName,
            gradeLevel,
          });
          availableClasses.push({
            id: newId,
            name: cleanName,
            gradeLevel,
            homeroomTeacherUid: adminUid,
            homeroomTeacherName: clampString(adminName || 'Pengelola Madrasah', LIMITS.DISPLAY_NAME_MAX),
            academicYear: '2026/2027',
            isActive: true,
            subjects: ["Al-Qur'an Hadis", 'Fikih', 'Matematika', 'Bahasa Indonesia'],
            createdBy: adminUid,
          } as SchoolClass);
        }
      }
    }

    if (missingClassDrafts.length > 0) {
      const safeHomeroomName = clampString(adminName || 'Pengelola Madrasah', LIMITS.DISPLAY_NAME_MAX);
      for (let i = 0; i < missingClassDrafts.length; i += CHUNK_SIZE) {
        const clsChunk = missingClassDrafts.slice(i, i + CHUNK_SIZE);
        const clsBatch = writeBatch(db);
        for (const cls of clsChunk) {
          clsBatch.set(doc(db, 'classes', cls.id), {
            id: cls.id,
            name: cls.name,
            gradeLevel: cls.gradeLevel,
            homeroomTeacherUid: adminUid,
            homeroomTeacherName: safeHomeroomName,
            academicYear: '2026/2027',
            isActive: true,
            subjects: ["Al-Qur'an Hadis", 'Fikih', 'Matematika', 'Bahasa Indonesia'],
            createdBy: adminUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await clsBatch.commit();
      }
    }

    // 2. Import students linked to their exact matched or newly created class
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const entry of chunk) {
        const id = makeDocId('stu');
        const targetClass =
          (entry.classId ? availableClasses.find((c) => c.id === entry.classId) : undefined) ||
          findMatchingSchoolClass(entry.className || '', availableClasses) ||
          availableClasses[0];

        const safeNisn = entry.nisn && entry.nisn.length >= 4 ? entry.nisn : `3150${Date.now()}`.slice(0, 10);
        const className = targetClass ? targetClass.name : entry.className || 'Kelas I A';
        const classId = targetClass ? targetClass.id : '';
        const homeroomUid = targetClass?.homeroomTeacherUid;

        batch.set(doc(db, 'students', id), {
          id,
          studentIdNumber: clampString(entry.studentIdNumber || '', LIMITS.STUDENT_ID_NUMBER_MAX),
          nisn: safeNisn,
          fullName: clampString(entry.fullName, LIMITS.DISPLAY_NAME_MAX),
          nik: clampString(entry.nik || '', LIMITS.NIK_MAX),
          classId,
          className,
          studentUid: '',
          parentUids: [],
          teacherUids: Array.from(new Set([adminUid, homeroomUid])).filter(Boolean),
          status: 'Aktif',
          gender: entry.gender || 'Laki-laki',
          birthPlace: clampString(entry.birthPlace || '', LIMITS.TEACHER_BIRTH_PLACE_MAX),
          birthDate: clampString(entry.birthDate || '', LIMITS.TEACHER_DATE_MAX),
          parentName: clampString(entry.fatherName || entry.motherName || '', LIMITS.PARENT_NAME_MAX),
          fatherName: clampString(entry.fatherName || '', LIMITS.PARENT_NAME_MAX),
          motherName: clampString(entry.motherName || '', LIMITS.PARENT_NAME_MAX),
          phone: '',
          address: clampString(entry.address || '', LIMITS.TEACHER_ADDRESS_MAX),
          entryType: 'Siswa Baru',
          entryDate: todayIsoDate(),
          previousSchool: '',
          graduationYear: '',
          nextSchool: '',
          certificateNumber: '',
          createdBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      imported += chunk.length;
    }
    return imported;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'students');
    return imported;
  }
}

export interface FinanceTransactionInput {
  category: FinanceCategory;
  classLevel: FinanceClassLevel;
  transactionType: FinanceTransactionType;
  amount: number;
  transactionDate: string;
  studentId?: string;
  studentName?: string;
  title: string;
  paymentStatus?: FinancePaymentStatus;
  notes?: string;
}

function sanitizeFinanceAmount(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(LIMITS.FINANCE_AMOUNT_MAX, Math.round(raw)));
}

export async function createFinanceTransaction(
  input: FinanceTransactionInput & { actorUid: string; actorName: string }
) {
  const id = makeDocId('fin');
  const path = `financeTransactions/${id}`;
  const safeAmount = sanitizeFinanceAmount(input.amount);
  const safeDate = DATE_PATTERN.test(input.transactionDate) ? input.transactionDate : todayIsoDate();

  try {
    await setDoc(doc(db, 'financeTransactions', id), {
      id,
      category: input.category,
      classLevel: input.classLevel,
      transactionType: input.transactionType,
      amount: safeAmount,
      transactionDate: safeDate,
      studentId: clampString(input.studentId || '', LIMITS.ID_MAX),
      studentName: clampString(input.studentName || '', LIMITS.DISPLAY_NAME_MAX),
      title: clampString(input.title, LIMITS.FINANCE_TITLE_MAX),
      paymentStatus: input.paymentStatus || '',
      notes: clampString(input.notes || '', LIMITS.FINANCE_NOTES_MAX),
      createdBy: input.actorUid,
      createdByName: clampString(input.actorName || 'Pengelola Madrasah', LIMITS.DISPLAY_NAME_MAX),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateFinanceTransaction(
  record: FinanceTransactionRecord,
  input: Omit<FinanceTransactionInput, 'category'>
) {
  const path = `financeTransactions/${record.id}`;
  const safeAmount = sanitizeFinanceAmount(input.amount);
  const safeDate = DATE_PATTERN.test(input.transactionDate) ? input.transactionDate : todayIsoDate();

  try {
    await updateDoc(doc(db, 'financeTransactions', record.id), {
      classLevel: input.classLevel,
      transactionType: input.transactionType,
      amount: safeAmount,
      transactionDate: safeDate,
      studentId: clampString(input.studentId || '', LIMITS.ID_MAX),
      studentName: clampString(input.studentName || '', LIMITS.DISPLAY_NAME_MAX),
      title: clampString(input.title, LIMITS.FINANCE_TITLE_MAX),
      paymentStatus: input.paymentStatus || '',
      notes: clampString(input.notes || '', LIMITS.FINANCE_NOTES_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteFinanceTransaction(record: FinanceTransactionRecord) {
  try {
    await deleteDoc(doc(db, 'financeTransactions', record.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `financeTransactions/${record.id}`);
  }
}

export async function saveAttendanceReportLink(input: {
  existingId?: string;
  classLevel: AttendanceClassLevel;
  rombel: string;
  reportUrl: string;
  actorUid: string;
  actorName: string;
}) {
  const cleanRombel = clampString(input.rombel, 40);
  const cleanUrl = clampString(input.reportUrl, LIMITS.DRIVE_URL_MAX);
  const actorName = clampString(input.actorName || 'Pengelola Madrasah', LIMITS.DISPLAY_NAME_MAX);

  if (input.existingId) {
    const path = `attendanceReportLinks/${input.existingId}`;
    try {
      await updateDoc(doc(db, 'attendanceReportLinks', input.existingId), {
        classLevel: input.classLevel,
        rombel: cleanRombel,
        reportUrl: cleanUrl,
        isPublic: true,
        updatedBy: input.actorUid,
        updatedByName: actorName,
        updatedAt: serverTimestamp(),
      });
      return input.existingId;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }

  const id = makeDocId('attlink');
  const path = `attendanceReportLinks/${id}`;
  try {
    await setDoc(doc(db, 'attendanceReportLinks', id), {
      id,
      classLevel: input.classLevel,
      rombel: cleanRombel,
      reportUrl: cleanUrl,
      isPublic: true,
      createdBy: input.actorUid,
      updatedBy: input.actorUid,
      updatedByName: actorName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteAttendanceReportLink(record: AttendanceReportLink) {
  try {
    await deleteDoc(doc(db, 'attendanceReportLinks', record.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `attendanceReportLinks/${record.id}`);
  }
}


