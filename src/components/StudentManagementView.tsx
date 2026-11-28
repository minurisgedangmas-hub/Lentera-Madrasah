import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  GraduationCap,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LIMITS } from '../lib/validation';
import {
  createStudentRecord,
  deleteStudentRecord,
  deleteStudentsBatch,
  importStudentsBatch,
  updateStudentProfile,
} from '../services/schoolService';
import {
  SchoolClass,
  StudentMutationRecord,
  StudentRecord,
  StudentStatus,
  TeacherGender,
} from '../types/school';
import {
  downloadStudentExcelTemplate,
  exportStudentsToExcel,
  parseStudentExcelFile,
  STUDENT_EXCEL_HEADERS,
  StudentExcelParseResult,
} from '../utils/studentExcel';
import {
  StudentAlumniView,
  StudentMutationView,
  StudentPromotionView,
} from './StudentLifecycleViews';

export type SiswaSubmenu = 'daftar' | 'mutasi' | 'kenaikan' | 'alumni';

interface StudentManagementViewProps {
  students: StudentRecord[];
  classes: SchoolClass[];
  mutations: StudentMutationRecord[];
  madrasahName?: string;
  isAdmin: boolean;
  activeSubmenu: SiswaSubmenu;
  onChangeSubmenu: (sub: SiswaSubmenu) => void;
}

function getStudentStatus(s: StudentRecord): StudentStatus {
  return s.status || 'Aktif';
}

export function StudentManagementView({
  students,
  classes,
  mutations,
  madrasahName,
  isAdmin,
  activeSubmenu,
  onChangeSubmenu,
}: StudentManagementViewProps) {
  const { firebaseUser, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Excel Upload & Preview State
  const [parsingFile, setParsingFile] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [previewResult, setPreviewResult] = useState<StudentExcelParseResult | null>(null);
  const [importingBatch, setImportingBatch] = useState(false);
  const [showFormatGuide, setShowFormatGuide] = useState(true);

  // Directory filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | StudentStatus>('Semua');

  // Add / Edit student form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [nisn, setNisn] = useState('');
  const [fullName, setFullName] = useState('');
  const [nik, setNik] = useState('');
  const [classId, setClassId] = useState('');
  const [gender, setGender] = useState<TeacherGender>('Laki-laki');
  const [status, setStatus] = useState<StudentStatus>('Aktif');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [parentName, setParentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [studentUid, setStudentUid] = useState('');
  const [parentUidsText, setParentUidsText] = useState('');
  const [saving, setSaving] = useState(false);

  // Inline delete confirmation & bulk checkbox delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!classId && classes.length > 0) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  useEffect(() => {
    const existingIds = new Set(students.map((s) => s.id));
    setSelectedStudentIds((prev) => prev.filter((id) => existingIds.has(id)));
  }, [students]);

  const stats = useMemo(() => {
    const active = students.filter((s) => getStudentStatus(s) === 'Aktif').length;
    const mutasiKeluar = students.filter((s) => getStudentStatus(s) === 'Mutasi Keluar').length;
    const alumni = students.filter((s) => getStudentStatus(s) === 'Alumni').length;
    return {
      total: students.length,
      active,
      mutasiKeluar,
      alumni,
    };
  }, [students]);

  const sortedClasses = useMemo(() => {
    const order: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
    return [...classes].sort((a, b) => {
      const ga = order[a.gradeLevel] ?? 99;
      const gb = order[b.gradeLevel] ?? 99;
      if (ga !== gb) return ga - gb;
      return a.name.localeCompare(b.name, 'id-ID');
    });
  }, [classes]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...students]
      .filter((s) => {
        if (classFilter !== 'Semua' && s.classId !== classFilter) return false;
        if (statusFilter !== 'Semua' && getStudentStatus(s) !== statusFilter) return false;
        if (!q) return true;
        return (
          s.fullName.toLowerCase().includes(q) ||
          (s.nik || '').toLowerCase().includes(q) ||
          s.nisn.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q) ||
          (s.parentName || '').toLowerCase().includes(q) ||
          (s.phone || '').toLowerCase().includes(q) ||
          (s.address || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const classCmp = a.className.localeCompare(b.className, 'id-ID');
        if (classCmp !== 0) return classCmp;
        return a.fullName.localeCompare(b.fullName, 'id-ID');
      });
  }, [students, searchQuery, classFilter, statusFilter]);

  const resetForm = () => {
    setEditingStudent(null);
    setStudentIdNumber('');
    setNisn('');
    setFullName('');
    setNik('');
    setClassId(classes[0]?.id || '');
    setGender('Laki-laki');
    setStatus('Aktif');
    setBirthPlace('');
    setBirthDate('');
    setParentName('');
    setFatherName('');
    setMotherName('');
    setPhone('');
    setAddress('');
    setStudentUid('');
    setParentUidsText('');
  };

  const handleOpenAddForm = () => {
    setFeedback(null);
    resetForm();
    setFormOpen(true);
  };

  const handleOpenEditForm = (stu: StudentRecord) => {
    setFeedback(null);
    setEditingStudent(stu);
    setStudentIdNumber(stu.studentIdNumber || '');
    setNisn(stu.nisn);
    setFullName(stu.fullName);
    setNik(stu.nik || '');
    setClassId(stu.classId || classes[0]?.id || '');
    setGender(stu.gender || 'Laki-laki');
    setStatus(getStudentStatus(stu));
    setBirthPlace(stu.birthPlace || '');
    setBirthDate(stu.birthDate || '');
    setParentName(stu.parentName || '');
    setFatherName(stu.fatherName || '');
    setMotherName(stu.motherName || '');
    setPhone(stu.phone || '');
    setAddress(stu.address || '');
    setStudentUid(stu.studentUid || '');
    setParentUidsText((stu.parentUids || []).join(', '));
    setFormOpen(true);
  };

  const handleSubmitStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    const targetClass = classes.find((c) => c.id === classId);
    if (!targetClass) {
      setFeedback({
        type: 'error',
        text: 'Pilih kelas MI terlebih dahulu. Tambahkan kelas melalui Data Guru → Pengaturan Wali Kelas jika masih kosong.',
      });
      return;
    }

    if (nisn.trim().length < LIMITS.NISN_MIN || fullName.trim().length < 2) {
      setFeedback({
        type: 'error',
        text: 'NISN minimal 4 karakter dan Nama Lengkap minimal 2 karakter.',
      });
      return;
    }

    const parsedParentUids = parentUidsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    setSaving(true);
    setFeedback(null);
    try {
      if (editingStudent) {
        await updateStudentProfile(editingStudent, {
          studentIdNumber: studentIdNumber.trim(),
          nisn: nisn.trim(),
          fullName: fullName.trim(),
          nik: nik.trim(),
          schoolClass: targetClass,
          status,
          gender,
          birthPlace: birthPlace.trim(),
          birthDate: birthDate.trim(),
          parentName: parentName.trim(),
          fatherName: fatherName.trim(),
          motherName: motherName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          studentUid: studentUid.trim(),
          parentUids: parsedParentUids,
        });
        setFeedback({
          type: 'success',
          text: `Biodata siswa "${fullName.trim()}" berhasil diperbarui.`,
        });
      } else {
        await createStudentRecord({
          studentIdNumber: studentIdNumber.trim(),
          nisn: nisn.trim(),
          fullName: fullName.trim(),
          nik: nik.trim(),
          schoolClass: targetClass,
          studentUid: studentUid.trim(),
          parentUids: parsedParentUids,
          teacherUid: firebaseUser.uid,
          status,
          gender,
          birthPlace: birthPlace.trim(),
          birthDate: birthDate.trim(),
          parentName: parentName.trim(),
          fatherName: fatherName.trim(),
          motherName: motherName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          entryType: 'Siswa Baru',
        });
        setFeedback({
          type: 'success',
          text: `Siswa baru "${fullName.trim()}" berhasil ditambahkan ke Kelas ${targetClass.name}.`,
        });
      }
      setFormOpen(false);
      resetForm();
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menyimpan data siswa. Periksa kembali isian formulir dan hak akses Anda.',
      });
    } finally {
      setSaving(false);
    }
  };

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.id));

  const toggleSelectStudent = (studentId: string) => {
    setConfirmBulkDelete(false);
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAllFiltered = () => {
    setConfirmBulkDelete(false);
    const filteredIds = filteredStudents.map((s) => s.id);
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredIds);
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleBulkDeleteStudents = async () => {
    if (!isAdmin || selectedStudentIds.length === 0) return;
    setDeletingBulk(true);
    setFeedback(null);
    try {
      const deletedCount = await deleteStudentsBatch(selectedStudentIds);
      setSelectedStudentIds([]);
      setConfirmBulkDelete(false);
      setFeedback({
        type: 'success',
        text: `${deletedCount} data siswa terpilih berhasil dihapus dari basis data.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menghapus data siswa terpilih. Silakan coba lagi.',
      });
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleDeleteStudent = async (stu: StudentRecord) => {
    setDeletingId(stu.id);
    setFeedback(null);
    try {
      await deleteStudentRecord(stu);
      setConfirmDeleteId(null);
      setFeedback({
        type: 'success',
        text: `Data siswa "${stu.fullName}" telah dihapus dari basis data.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menghapus data siswa.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleTriggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setParsingFile(true);
    setFeedback(null);
    try {
      const result = await parseStudentExcelFile(file, classes);
      setPreviewResult(result);
      if (result.missingColumns.length > 0) {
        setFeedback({
          type: 'error',
          text: `Kolom wajib tidak ditemukan: ${result.missingColumns.join(', ')}. Silakan unduh templat resmi.`,
        });
      } else if (result.rows.length === 0) {
        setFeedback({
          type: 'error',
          text: 'Tidak ada data siswa yang terbaca di berkas Excel tersebut.',
        });
      } else if (result.invalidCount > 0) {
        setFeedback({
          type: 'error',
          text: `Ditemukan ${result.invalidCount} baris yang perlu diperiksa dari ${result.rows.length} total baris. Periksa tabel pratinjau di bawah.`,
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        text: 'Berkas Excel gagal dibaca. Pastikan format file adalah .xlsx, .xls, atau .csv yang valid.',
      });
    } finally {
      setParsingFile(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!firebaseUser || !previewResult) return;
    const validRows = previewResult.rows.filter((r) => r.isValid).map((r) => r.data);
    if (validRows.length === 0) {
      setFeedback({
        type: 'error',
        text: 'Tidak ada baris valid yang dapat diimpor dari berkas Excel tersebut.',
      });
      return;
    }

    setImportingBatch(true);
    setFeedback(null);
    try {
      const count = await importStudentsBatch(
        validRows,
        firebaseUser.uid,
        classes,
        profile?.displayName
      );
      setPreviewResult(null);
      setSelectedFileName('');
      setFeedback({
        type: 'success',
        text: `${count} data siswa berhasil diimpor dari berkas Excel ke basis data madrasah.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal mengimpor data siswa ke Firestore. Silakan coba lagi.',
      });
    } finally {
      setImportingBatch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Submenu Navigation Strip */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-1.5 inline-flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChangeSubmenu('daftar')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeSubmenu === 'daftar'
              ? 'bg-[#064E3B] text-[#FAF8F2]'
              : 'text-slate-700 hover:bg-[#F5F3EC] hover:text-slate-950'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Siswa</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeSubmenu('mutasi')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeSubmenu === 'mutasi'
              ? 'bg-[#064E3B] text-[#FAF8F2]'
              : 'text-slate-700 hover:bg-[#F5F3EC] hover:text-slate-950'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Mutasi Keluar &amp; Masuk</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeSubmenu('kenaikan')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeSubmenu === 'kenaikan'
              ? 'bg-[#064E3B] text-[#FAF8F2]'
              : 'text-slate-700 hover:bg-[#F5F3EC] hover:text-slate-950'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Kenaikan Kelas</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeSubmenu('alumni')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeSubmenu === 'alumni'
              ? 'bg-[#064E3B] text-[#FAF8F2]'
              : 'text-slate-700 hover:bg-[#F5F3EC] hover:text-slate-950'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Alumni</span>
        </button>
      </div>

      {activeSubmenu === 'mutasi' && (
        <StudentMutationView students={students} classes={classes} mutations={mutations} />
      )}

      {activeSubmenu === 'kenaikan' && (
        <StudentPromotionView students={students} classes={classes} />
      )}

      {activeSubmenu === 'alumni' && (
        <StudentAlumniView
          students={students}
          classes={classes}
          madrasahName={madrasahName}
          isAdmin={isAdmin}
        />
      )}

      {activeSubmenu === 'daftar' && (
        <div className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelected}
            className="hidden"
          />

          {/* Executive Banner */}
          <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#F3D88B]">
                Buku Induk &amp; Direktori Siswa MI
              </p>
              <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
                Daftar Seluruh Siswa Madrasah
              </h1>
              <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1 max-w-2xl">
                Kelola data induk siswa madrasah secara terstruktur. Unduh templat Excel resmi, isi data sesuai format {STUDENT_EXCEL_HEADERS.length} kolom, lalu unggah untuk impor massal seketika.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => downloadStudentExcelTemplate(classes)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-sm font-bold shadow-md hover:from-amber-400 hover:to-yellow-400 transition-all transform hover:scale-[1.02] whitespace-nowrap cursor-pointer border border-amber-400"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Templat Excel</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerFileUpload}
                disabled={parsingFile}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold shadow-md hover:from-emerald-500 hover:to-teal-500 transition-all transform hover:scale-[1.02] whitespace-nowrap cursor-pointer disabled:opacity-60 border border-emerald-500"
              >
                <Upload className="w-4 h-4" />
                <span>{parsingFile ? 'Membaca Excel...' : 'Upload Excel Siswa'}</span>
              </button>

              <button
                type="button"
                onClick={() => exportStudentsToExcel(filteredStudents, madrasahName)}
                disabled={filteredStudents.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold shadow-md hover:from-cyan-500 hover:to-blue-500 transition-all transform hover:scale-[1.02] whitespace-nowrap cursor-pointer disabled:opacity-50 border border-cyan-500"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold shadow-md hover:from-violet-500 hover:to-purple-500 transition-all transform hover:scale-[1.02] whitespace-nowrap cursor-pointer border border-violet-500"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Manual</span>
              </button>
            </div>
          </div>

          {/* Format Guide Strip */}
          <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#064E3B]" />
                <p className="text-xs font-bold text-slate-800">
                  Format Standar Kolom Excel Siswa ({STUDENT_EXCEL_HEADERS.length} Kolom)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormatGuide((prev) => !prev)}
                className="text-xs font-semibold text-[#064E3B] hover:text-[#04392B] cursor-pointer"
              >
                {showFormatGuide ? 'Sembunyikan' : 'Lihat Format'}
              </button>
            </div>
            {showFormatGuide && (
              <div className="p-4 sm:p-5 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {STUDENT_EXCEL_HEADERS.map((col, idx) => (
                    <div
                      key={col}
                      className="px-3 py-2 rounded-lg bg-[#F5F3EC] border border-[#E2DDD0]"
                    >
                      <p className="font-mono text-[10px] text-slate-500 tabular-nums">
                        Kolom {idx + 1}
                      </p>
                      <p className="text-xs font-semibold text-slate-900 mt-0.5 truncate" title={col}>
                        {col}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Unduh templat resmi agar seluruh {STUDENT_EXCEL_HEADERS.length} kolom tersusun rapi: <span className="font-semibold text-slate-900">No, No. Induk, NISN, Nama Lengkap, NIK, Tempat Lahir, Tanggal Lahir, L/P, Kelas, Nama Ayah, Nama Ibu, Alamat</span>. Tanggal lahir dapat diisi format <span className="font-mono font-medium text-slate-800">YYYY-MM-DD</span> atau tanggal standar Excel; kolom L/P diisi <span className="font-medium text-slate-800">L / P</span>; kolom Kelas diisi rombel madrasah seperti <span className="font-medium text-slate-800">{classes.map((c) => c.name).join(', ') || 'IV A'}</span>.
                </p>
              </div>
            )}
          </div>

          {/* Excel Import Preview Card */}
          {previewResult && (
            <div className="bg-[#FCFBF8] border border-emerald-800/30 rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] border-b border-[#144D3C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#F3D88B]">Pratinjau Impor Excel Data Siswa</p>
                  <h2 className="font-display text-base font-bold text-[#FAF8F2] truncate mt-0.5">
                    {selectedFileName} · Sheet &ldquo;{previewResult.sheetName}&rdquo;
                  </h2>
                  <p className="text-xs text-[#C6DDD4] mt-0.5 font-mono tabular-nums">
                    {previewResult.rows.length} baris terdeteksi · {previewResult.validCount} siap impor ·{' '}
                    {previewResult.invalidCount} perlu perbaikan
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewResult(null);
                      setSelectedFileName('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#2C6B57] bg-[#0B3A2C] text-[#FAF8F2] text-xs font-medium hover:bg-[#104A39] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={importingBatch || previewResult.validCount === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4A74A] text-[#062C21] text-xs font-bold hover:bg-[#DFB763] cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {importingBatch
                        ? 'Mengimpor...'
                        : `Simpan ${previewResult.validCount} Data Siswa`}
                    </span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F5F3EC] border-b border-[#EAE6DB] text-slate-700 font-semibold">
                      <th className="px-3 py-2.5 whitespace-nowrap">Baris</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">No.</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">No. Induk</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">NISN</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Nama Lengkap</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">NIK</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Tempat Lahir</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Tanggal Lahir</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">L/P</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Kelas</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Nama Ayah</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Nama Ibu</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Alamat</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE2]">
                    {previewResult.rows.map((row) => (
                      <tr
                        key={`${row.rowNumber}_${row.data.fullName}`}
                        className={row.isValid ? 'hover:bg-[#F5F3EC]/60' : 'bg-red-50/70'}
                      >
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-500">
                          #{row.rowNumber}
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-800">
                          {row.data.orderNo}
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {row.data.studentIdNumber || '-'}
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {row.data.nisn || '-'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                          {row.data.fullName || '-'}
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {row.data.nik || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                          {row.data.birthPlace || '-'}
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {row.data.birthDate || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                          {row.data.gender === 'Perempuan' ? 'P' : 'L'}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                          <span>{row.data.className || '-'}</span>
                          {row.data.className && !row.data.classId && (
                            <span className="ml-1.5 text-[10px] font-normal text-[#064E3B]">
                              (kelas baru)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap">
                          {row.data.fatherName || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap">
                          {row.data.motherName || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 max-w-[200px] truncate" title={row.data.address}>
                          {row.data.address || '-'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {row.isValid ? (
                            <span className="font-semibold text-[#064E3B]">Siap Impor</span>
                          ) : (
                            <span className="font-semibold text-red-700">
                              {row.errors.join('; ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {classes.length === 0 && (
            <div className="bg-[#FCFBF8] border border-amber-300/70 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Belum Ada Kelas / Rombel MI Terdaftar
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tambahkan kelas MI melalui menu Data Guru → Pengaturan Wali Kelas sebelum menambahkan data siswa baru.
                </p>
              </div>
            </div>
          )}

          {feedback && (
            <div
              className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* 4-Column KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-[#04231A] border border-emerald-700/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
              <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Total Data Siswa</p>
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#F3D88B] tabular-nums mt-2">
                {stats.total} <span className="text-sm font-sans font-medium text-emerald-100">Siswa</span>
              </p>
              <p className="text-xs text-emerald-300/80 mt-1">Seluruh status tercatat</p>
            </div>

            <div className="bg-gradient-to-br from-teal-800 via-teal-950 to-[#042018] border border-teal-600/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
              <p className="text-xs font-semibold text-teal-200 uppercase tracking-wider">Siswa Aktif</p>
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-teal-300 tabular-nums mt-2">
                {stats.active}
              </p>
              <p className="text-xs text-teal-300/80 mt-1">Aktif belajar di kelas MI</p>
            </div>

            <div className="bg-gradient-to-br from-amber-800 via-amber-950 to-[#2A1804] border border-amber-600/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
              <p className="text-xs font-semibold text-amber-200 uppercase tracking-wider">Mutasi Keluar</p>
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-300 tabular-nums mt-2">
                {stats.mutasiKeluar}
              </p>
              <p className="text-xs text-amber-300/80 mt-1">Pindah ke sekolah lain</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 via-blue-950 to-[#091528] border border-indigo-700/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Alumni Lulusan</p>
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-indigo-300 tabular-nums mt-2">
                {stats.alumni}
              </p>
              <p className="text-xs text-indigo-300/80 mt-1">Tamat jenjang MI</p>
            </div>
          </div>

          {/* Add / Edit Student Collapsible Form */}
          {formOpen && (
            <form
              onSubmit={handleSubmitStudent}
              className="bg-[#FCFBF8] border border-[#D8D3C6] rounded-xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    {editingStudent ? 'Perbarui Biodata Siswa' : 'Tambah Siswa Baru MI'}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Lengkapi data induk siswa, kontak orang tua/wali, serta tautan UID akun portal jika sudah tersedia.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    resetForm();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-slate-700 text-xs font-medium hover:bg-[#EAE7DC] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tutup</span>
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    No. Induk Siswa
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={studentIdNumber}
                    onChange={(e) => setStudentIdNumber(e.target.value)}
                    placeholder="Contoh: 1024"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    NISN <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={LIMITS.NISN_MIN}
                    maxLength={LIMITS.NISN_MAX}
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    placeholder="Contoh: 3154129001"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Lengkap Siswa <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={LIMITS.DISPLAY_NAME_MAX}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama lengkap sesuai akta kelahiran"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    NIK
                  </label>
                  <input
                    type="text"
                    maxLength={LIMITS.NIK_MAX}
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    placeholder="Contoh: 3508124120160001"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kelas MI <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  >
                    {sortedClasses.length === 0 ? (
                      <option value="">Belum ada kelas MI</option>
                    ) : (
                      sortedClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          Kelas {c.name} ({c.academicYear})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jenis Kelamin (L/P)
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as TeacherGender)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  >
                    <option value="Laki-laki">Laki-laki (L)</option>
                    <option value="Perempuan">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Status Siswa
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StudentStatus)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Mutasi Keluar">Mutasi Keluar</option>
                    <option value="Alumni">Alumni</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    maxLength={LIMITS.TEACHER_BIRTH_PLACE_MAX}
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Contoh: Bekasi"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Ayah
                  </label>
                  <input
                    type="text"
                    maxLength={LIMITS.PARENT_NAME_MAX}
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Nama ayah kandung"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Ibu
                  </label>
                  <input
                    type="text"
                    maxLength={LIMITS.PARENT_NAME_MAX}
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="Nama ibu kandung"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    No. HP Orang Tua / Wali
                  </label>
                  <input
                    type="text"
                    maxLength={LIMITS.TEACHER_PHONE_MAX}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Alamat Domisili
                  </label>
                  <input
                    type="text"
                    maxLength={LIMITS.TEACHER_ADDRESS_MAX}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Alamat lengkap tempat tinggal siswa"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    UID Akun Portal Siswa (Opsional)
                  </label>
                  <input
                    type="text"
                    maxLength={LIMITS.ID_MAX}
                    value={studentUid}
                    onChange={(e) => setStudentUid(e.target.value)}
                    placeholder="UID Firebase siswa (jika sudah login)"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    UID Akun Orang Tua (Opsional, pisahkan koma)
                  </label>
                  <input
                    type="text"
                    value={parentUidsText}
                    onChange={(e) => setParentUidsText(e.target.value)}
                    placeholder="uid_orangtua_1, uid_orangtua_2"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#EAE6DB] bg-[#F5F3EC] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-slate-700 text-sm font-medium hover:bg-[#EAE7DC] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || classes.length === 0}
                  className="px-5 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] cursor-pointer disabled:opacity-50"
                >
                  {saving
                    ? 'Menyimpan...'
                    : editingStudent
                    ? 'Simpan Perubahan'
                    : 'Daftarkan Siswa'}
                </button>
              </div>
            </form>
          )}

          {/* Main Student Table Card */}
          <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#064E3B]" />
                <h2 className="text-base font-semibold text-slate-900">
                  Tabel Daftar Siswa ({filteredStudents.length})
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, NIK, NISN, orang tua..."
                    className="pl-9 pr-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-900 w-56"
                  />
                </div>

                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-800"
                >
                  <option value="Semua">Semua Kelas</option>
                  {sortedClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'Semua' | StudentStatus)}
                  className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-800"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Mutasi Keluar">Mutasi Keluar</option>
                  <option value="Alumni">Alumni</option>
                </select>
              </div>
            </div>

            {isAdmin && selectedStudentIds.length > 0 && (
              <div className="px-5 py-3 border-b border-red-200/80 bg-red-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-red-900">
                  <span>{selectedStudentIds.length} siswa ditandai untuk dihapus</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {confirmBulkDelete ? (
                    <>
                      <span className="text-xs font-medium text-red-800">
                        Yakin hapus {selectedStudentIds.length} data siswa?
                      </span>
                      <button
                        type="button"
                        disabled={deletingBulk}
                        onClick={() => void handleBulkDeleteStudents()}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50"
                      >
                        {deletingBulk ? 'Menghapus...' : `Ya, Hapus ${selectedStudentIds.length} Siswa`}
                      </button>
                      <button
                        type="button"
                        disabled={deletingBulk}
                        onClick={() => setConfirmBulkDelete(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Batal
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([])}
                        className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Batal Pilih
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmBulkDelete(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Terpilih ({selectedStudentIds.length})</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                 <thead>
                  <tr className="bg-[#FAF9F5] border-b border-[#EAE6DB] text-slate-600 text-xs font-semibold">
                    {isAdmin && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                          disabled={filteredStudents.length === 0}
                          aria-label="Pilih semua siswa"
                          title="Tandai semua siswa yang tampil"
                          className="rounded border-slate-300 text-[#064E3B] cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 whitespace-nowrap">No.</th>
                    <th className="px-4 py-3 whitespace-nowrap">No. Induk</th>
                    <th className="px-4 py-3 whitespace-nowrap">NISN</th>
                    <th className="px-4 py-3 whitespace-nowrap">Nama Lengkap</th>
                    <th className="px-4 py-3 whitespace-nowrap">NIK</th>
                    <th className="px-4 py-3 whitespace-nowrap">Tempat Lahir</th>
                    <th className="px-4 py-3 whitespace-nowrap">Tanggal Lahir</th>
                    <th className="px-4 py-3 whitespace-nowrap">L/P</th>
                    <th className="px-4 py-3 whitespace-nowrap">Kelas</th>
                    <th className="px-4 py-3 whitespace-nowrap">Nama Ayah</th>
                    <th className="px-4 py-3 whitespace-nowrap">Nama Ibu</th>
                    <th className="px-4 py-3 whitespace-nowrap">Alamat</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE2]">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 14 : 13} className="py-10 text-center text-slate-500">
                        Belum ada data siswa yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((stu, idx) => {
                      const genderShort =
                        stu.gender === 'Perempuan'
                          ? 'P'
                          : stu.gender === 'Laki-laki'
                          ? 'L'
                          : '-';
                      const isChecked = selectedStudentIds.includes(stu.id);

                      return (
                        <tr
                          key={stu.id}
                          className={
                            isChecked
                              ? 'bg-red-50/40 hover:bg-red-50/60'
                              : 'hover:bg-[#F5F3EC]/70'
                          }
                        >
                          {isAdmin && (
                            <td className="px-4 py-3 w-10">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectStudent(stu.id)}
                                aria-label={`Pilih ${stu.fullName}`}
                                className="rounded border-slate-300 text-[#064E3B] cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                            {stu.studentIdNumber || '-'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                            {stu.nisn}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-semibold text-slate-900">{stu.fullName}</p>
                            {stu.entryType === 'Mutasi Masuk' && stu.previousSchool && (
                              <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                                Pindahan dari {stu.previousSchool}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                            {stu.nik || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                            {stu.birthPlace || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap font-mono tabular-nums">
                            {stu.birthDate || '-'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                            {genderShort}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                            {stu.className}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-800 whitespace-nowrap">
                            {stu.fatherName || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-800 whitespace-nowrap">
                            {stu.motherName || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700 max-w-[220px] truncate" title={stu.address || ''}>
                            {stu.address || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            {confirmDeleteId === stu.id ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={deletingId === stu.id}
                                  onClick={() => void handleDeleteStudent(stu)}
                                  className="px-2 py-1 rounded bg-red-600 text-white text-xs cursor-pointer disabled:opacity-50"
                                >
                                  {deletingId === stu.id ? '...' : 'Ya, Hapus'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded border border-slate-300 bg-white text-xs cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditForm(stu)}
                                  title="Edit biodata siswa"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#064E3B] hover:bg-emerald-50 cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(stu.id)}
                                    title="Hapus siswa"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
