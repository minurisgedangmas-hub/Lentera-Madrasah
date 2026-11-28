import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  Search,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LIMITS } from '../lib/validation';
import {
  createTeacherRecord,
  deleteTeacherRecord,
  importTeachersBatch,
  updateTeacherRecord,
} from '../services/schoolService';
import {
  SchoolClass,
  StudentRecord,
  TeacherGender,
  TeacherRecord,
  UserProfile,
} from '../types/school';
import {
  downloadTeacherExcelTemplate,
  exportTeachersToExcel,
  parseTeacherExcelFile,
  TEACHER_EXCEL_HEADERS,
  TeacherExcelParseResult,
} from '../utils/teacherExcel';
import { HomeroomTeacherSettingsView } from './HomeroomTeacherSettingsView';

export type GuruSubmenu = 'direktori' | 'wali_kelas';

interface TeacherDirectoryViewProps {
  teachers: TeacherRecord[];
  classes: SchoolClass[];
  students: StudentRecord[];
  allUsers: UserProfile[];
  madrasahName?: string;
  activeSubmenu: GuruSubmenu;
  onChangeSubmenu: (sub: GuruSubmenu) => void;
}

export function TeacherDirectoryView({
  teachers,
  classes,
  students,
  allUsers,
  madrasahName,
  activeSubmenu,
  onChangeSubmenu,
}: TeacherDirectoryViewProps) {
  const { firebaseUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'Semua' | TeacherGender>('Semua');
  const [showFormatGuide, setShowFormatGuide] = useState(true);

  // Manual Add / Edit Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [orderNo, setOrderNo] = useState('1');
  const [fullName, setFullName] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<TeacherGender>('Laki-laki');
  const [nuptkNpkPegId, setNuptkNpkPegId] = useState('');
  const [tmt, setTmt] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // Excel Upload & Preview State
  const [parsingFile, setParsingFile] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [previewResult, setPreviewResult] = useState<TeacherExcelParseResult | null>(null);
  const [importingBatch, setImportingBatch] = useState(false);

  // Delete inline confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const stats = useMemo(() => {
    const male = teachers.filter((t) => t.gender === 'Laki-laki').length;
    const female = teachers.filter((t) => t.gender === 'Perempuan').length;
    const hasId = teachers.filter((t) => t.nuptkNpkPegId.trim().length > 0).length;
    return { total: teachers.length, male, female, hasId };
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teachers.filter((t) => {
      if (genderFilter !== 'Semua' && t.gender !== genderFilter) return false;
      if (!q) return true;
      return (
        t.fullName.toLowerCase().includes(q) ||
        t.nuptkNpkPegId.toLowerCase().includes(q) ||
        t.position.toLowerCase().includes(q) ||
        t.birthPlace.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
      );
    });
  }, [teachers, searchQuery, genderFilter]);

  const resetForm = () => {
    setEditingTeacher(null);
    setOrderNo(String(teachers.length + 1));
    setFullName('');
    setBirthPlace('');
    setBirthDate('');
    setGender('Laki-laki');
    setNuptkNpkPegId('');
    setTmt('');
    setPosition('');
    setPhone('');
    setAddress('');
  };

  const handleOpenAddForm = () => {
    setFeedback(null);
    resetForm();
    setFormOpen(true);
  };

  const handleOpenEditForm = (teacher: TeacherRecord) => {
    setFeedback(null);
    setEditingTeacher(teacher);
    setOrderNo(String(teacher.orderNo || 1));
    setFullName(teacher.fullName);
    setBirthPlace(teacher.birthPlace);
    setBirthDate(teacher.birthDate);
    setGender(teacher.gender);
    setNuptkNpkPegId(teacher.nuptkNpkPegId);
    setTmt(teacher.tmt);
    setPosition(teacher.position);
    setPhone(teacher.phone);
    setAddress(teacher.address);
    setFormOpen(true);
  };

  const handleSubmitManual = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    const cleanName = fullName.trim();
    const cleanPosition = position.trim();
    if (cleanName.length < 2) {
      setFeedback({ type: 'error', text: 'Nama guru minimal terdiri dari 2 karakter.' });
      return;
    }
    if (cleanPosition.length < 1) {
      setFeedback({ type: 'error', text: 'Jabatan guru wajib diisi.' });
      return;
    }

    setSavingManual(true);
    setFeedback(null);
    try {
      const payload = {
        orderNo: Number(orderNo) || teachers.length + 1,
        fullName: cleanName,
        birthPlace: birthPlace.trim(),
        birthDate: birthDate.trim(),
        gender,
        nuptkNpkPegId: nuptkNpkPegId.trim(),
        tmt: tmt.trim(),
        position: cleanPosition,
        phone: phone.trim(),
        address: address.trim(),
        isActive: true,
      };

      if (editingTeacher) {
        await updateTeacherRecord(editingTeacher, payload);
        setFeedback({
          type: 'success',
          text: `Data guru "${cleanName}" berhasil diperbarui.`,
        });
      } else {
        await createTeacherRecord({ ...payload, adminUid: firebaseUser.uid });
        setFeedback({
          type: 'success',
          text: `Data guru "${cleanName}" berhasil ditambahkan ke direktori madrasah.`,
        });
      }
      setFormOpen(false);
      resetForm();
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menyimpan data guru. Periksa kembali isian atau koneksi Anda.',
      });
    } finally {
      setSavingManual(false);
    }
  };

  const handleTriggerFileUpload = () => {
    setFeedback(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingFile(true);
    setFeedback(null);
    setSelectedFileName(file.name);
    try {
      const parsed = await parseTeacherExcelFile(file);
      setPreviewResult(parsed);
      if (parsed.missingColumns.length > 0 && parsed.rows.length === 0) {
        setFeedback({
          type: 'error',
          text: `Format kolom Excel tidak sesuai templat (${parsed.missingColumns.join(', ')}). Gunakan tombol Unduh Templat Excel untuk format standar.`,
        });
      }
    } catch {
      setPreviewResult(null);
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
      const count = await importTeachersBatch(validRows, firebaseUser.uid);
      setPreviewResult(null);
      setSelectedFileName('');
      setFeedback({
        type: 'success',
        text: `${count} data guru berhasil diimpor dari berkas Excel ke basis data madrasah.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal mengimpor data guru ke Firestore. Silakan coba lagi.',
      });
    } finally {
      setImportingBatch(false);
    }
  };

  const handleDeleteTeacher = async (teacher: TeacherRecord) => {
    setDeletingId(teacher.id);
    setFeedback(null);
    try {
      await deleteTeacherRecord(teacher);
      setConfirmDeleteId(null);
      setFeedback({
        type: 'success',
        text: `Data guru "${teacher.fullName}" telah dihapus.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menghapus data guru.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Submenu Navigation Strip */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-1.5 inline-flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChangeSubmenu('direktori')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeSubmenu === 'direktori'
              ? 'bg-[#064E3B] text-[#FAF8F2]'
              : 'text-slate-700 hover:bg-[#F5F3EC] hover:text-slate-950'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Direktori Data Guru &amp; Excel</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeSubmenu('wali_kelas')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            activeSubmenu === 'wali_kelas'
              ? 'bg-[#064E3B] text-[#FAF8F2]'
              : 'text-slate-700 hover:bg-[#F5F3EC] hover:text-slate-950'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Pengaturan Wali Kelas</span>
        </button>
      </div>

      {activeSubmenu === 'wali_kelas' ? (
        <HomeroomTeacherSettingsView
          teachers={teachers}
          classes={classes}
          students={students}
          allUsers={allUsers}
        />
      ) : (
        <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Executive Madrasah Header Banner */}
      <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#F3D88B]">
            Kepegawaian &amp; Direktori Pendidik MI
          </p>
          <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
            Data Guru Madrasah
          </h1>
          <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1 max-w-2xl">
            Kelola biodata guru dan tenaga kependidikan secara terstruktur. Unduh templat Excel resmi, isi data, lalu unggah untuk impor massal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={downloadTeacherExcelTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A74A] text-[#062C21] text-sm font-semibold hover:bg-[#DFB763] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Templat Excel</span>
          </button>
          <button
            type="button"
            onClick={handleTriggerFileUpload}
            disabled={parsingFile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2C6B57] bg-[#0B3A2C] text-[#FAF8F2] text-sm font-medium hover:bg-[#104A39] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <Upload className="w-4 h-4" />
            <span>{parsingFile ? 'Membaca Excel...' : 'Upload Excel Guru'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2C6B57] bg-[#0F533F] text-[#FAF8F2] text-sm font-medium hover:bg-[#14644C] transition-colors whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Manual</span>
          </button>
        </div>
      </div>

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
          <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Total Pendidik</p>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#F3D88B] tabular-nums mt-2">
            {stats.total} <span className="text-sm font-sans font-medium text-emerald-100">Guru</span>
          </p>
          <p className="text-xs text-emerald-300/80 mt-1">Tercatat di direktori MI</p>
        </div>
        <div className="bg-gradient-to-br from-teal-800 via-teal-950 to-[#042018] border border-teal-600/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
          <p className="text-xs font-semibold text-teal-200 uppercase tracking-wider">Laki-laki</p>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-teal-300 tabular-nums mt-2">
            {stats.male}
          </p>
          <p className="text-xs text-teal-300/80 mt-1">Ustadz / Guru Putra</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-800 via-cyan-950 to-[#041E28] border border-cyan-600/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none"></div>
          <p className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">Perempuan</p>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-cyan-300 tabular-nums mt-2">
            {stats.female}
          </p>
          <p className="text-xs text-cyan-300/80 mt-1">Ustadzah / Guru Putri</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-900 via-blue-950 to-[#091528] border border-indigo-700/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
          <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">NUPTK / NPK / Peg. Id</p>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-indigo-300 tabular-nums mt-2">
            {stats.hasId}
          </p>
          <p className="text-xs text-indigo-300/80 mt-1">Memiliki nomor identitas</p>
        </div>
      </div>

      {/* Format Kolom Templat Excel Info Strip */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="w-4 h-4 text-[#064E3B] shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900 truncate">
              Format Kolom Templat Excel Data Guru (.xlsx)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowFormatGuide((prev) => !prev)}
            className="text-xs font-semibold text-[#064E3B] hover:text-emerald-950 whitespace-nowrap cursor-pointer"
          >
            {showFormatGuide ? 'Sembunyikan' : 'Lihat Format'}
          </button>
        </div>
        {showFormatGuide && (
          <div className="p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TEACHER_EXCEL_HEADERS.map((col, idx) => (
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
              Unduh templat resmi agar seluruh 10 kolom sesuai standar. Untuk tanggal lahir dan TMT dapat menggunakan format <span className="font-mono font-medium text-slate-800">YYYY-MM-DD</span> atau format tanggal Excel standar; Jenis Kelamin dapat diisi <span className="font-medium text-slate-800">Laki-laki / Perempuan</span> (atau <span className="font-mono font-medium text-slate-800">L / P</span>).
            </p>
          </div>
        )}
      </div>

      {/* Excel Import Preview Card */}
      {previewResult && (
        <div className="bg-[#FCFBF8] border border-emerald-800/30 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] border-b border-[#144D3C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#F3D88B]">Pratinjau Impor Excel</p>
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
                    : `Simpan ${previewResult.validCount} Data Guru`}
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
                  <th className="px-3 py-2.5 whitespace-nowrap">Nama</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Tempat Lahir</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Tanggal Lahir</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Jenis Kelamin</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">NUPTK / NPK / Peg. Id</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">TMT</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Jabatan</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">No. HP</th>
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
                    <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                      {row.data.fullName || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                      {row.data.birthPlace || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {row.data.birthDate || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                      {row.data.gender}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {row.data.nuptkNpkPegId || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {row.data.tmt || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap">
                      {row.data.position || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {row.data.phone || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 max-w-[220px] truncate" title={row.data.address}>
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

      {/* Manual Add / Edit Form */}
      {formOpen && (
        <form
          onSubmit={handleSubmitManual}
          className="bg-[#FCFBF8] border border-[#D8D3C6] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                {editingTeacher ? 'Perbarui Data Guru' : 'Tambah Data Guru Manual'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Lengkapi biodata guru sesuai format kepegawaian Madrasah Ibtidaiyah (MI).
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
                No. Urut
              </label>
              <input
                type="number"
                min={0}
                max={LIMITS.TEACHER_ORDER_MAX}
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lengkap &amp; Gelar <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.DISPLAY_NAME_MAX}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Ustadzah Siti Aminah, S.Pd.I."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
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
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : ''}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Kelamin <span className="text-red-600">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as TeacherGender)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                NUPTK / NPK / Peg. Id
              </label>
              <input
                type="text"
                maxLength={LIMITS.TEACHER_ID_NUMBER_MAX}
                value={nuptkNpkPegId}
                onChange={(e) => setNuptkNpkPegId(e.target.value)}
                placeholder="Contoh: 8253764665300012"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                TMT (Terhitung Mulai Tanggal)
              </label>
              <input
                type="date"
                value={/^\d{4}-\d{2}-\d{2}$/.test(tmt) ? tmt : ''}
                onChange={(e) => setTmt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jabatan <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.TEACHER_POSITION_MAX}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Contoh: Wali Kelas IV A / Guru PAI"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                No. HP / WhatsApp
              </label>
              <input
                type="text"
                maxLength={LIMITS.TEACHER_PHONE_MAX}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Lengkap
              </label>
              <input
                type="text"
                maxLength={LIMITS.TEACHER_ADDRESS_MAX}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jalan, RT/RW, kelurahan/desa, kecamatan, kota/kabupaten"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#EAE6DB] bg-[#F5F3EC] flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={savingManual}
              className="px-5 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] transition-colors cursor-pointer disabled:opacity-60"
            >
              {savingManual
                ? 'Menyimpan...'
                : editingTeacher
                ? 'Perbarui Data Guru'
                : 'Simpan Data Guru'}
            </button>
          </div>
        </form>
      )}

      {/* Teacher Directory Table Card */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#064E3B]" />
            <h2 className="text-base font-semibold text-slate-900">
              Daftar Guru &amp; Tenaga Kependidikan
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NUPTK, jabatan..."
                className="pl-9 pr-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 w-56"
              />
            </div>

            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as 'Semua' | TeacherGender)}
              className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            >
              <option value="Semua">Semua L/P</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>

            {teachers.length > 0 && (
              <button
                type="button"
                onClick={() => exportTeachersToExcel(teachers, madrasahName)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-800/30 bg-white text-[#064E3B] text-xs font-semibold hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Excel</span>
              </button>
            )}
          </div>
        </div>

        {teachers.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Belum Ada Data Guru Tersimpan
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mt-1.5">
              Unduh templat Excel resmi, lengkapi data guru MI Anda, lalu unggah kembali ke sini untuk mengisi direktori secara otomatis.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={downloadTeacherExcelTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A74A] text-[#062C21] text-sm font-semibold hover:bg-[#DFB763] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Templat Excel</span>
              </button>
              <button
                type="button"
                onClick={handleTriggerFileUpload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload File Excel</span>
              </button>
            </div>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Tidak ada data guru yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#EAE6DB] text-slate-600 text-xs font-semibold">
                  <th className="px-4 py-3 whitespace-nowrap">No.</th>
                  <th className="px-4 py-3 whitespace-nowrap">Nama</th>
                  <th className="px-4 py-3 whitespace-nowrap">Tempat, Tgl Lahir</th>
                  <th className="px-4 py-3 whitespace-nowrap">L/P</th>
                  <th className="px-4 py-3 whitespace-nowrap">NUPTK / NPK / Peg. Id</th>
                  <th className="px-4 py-3 whitespace-nowrap">TMT</th>
                  <th className="px-4 py-3 whitespace-nowrap">Jabatan</th>
                  <th className="px-4 py-3 whitespace-nowrap">No. HP</th>
                  <th className="px-4 py-3 whitespace-nowrap">Alamat</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE2]">
                {filteredTeachers.map((t, index) => (
                  <tr key={t.id} className="hover:bg-[#F5F3EC]/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {t.orderNo || index + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {t.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      <span>{t.birthPlace || '-'}</span>
                      {t.birthDate && (
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {t.birthPlace ? `, ${t.birthDate}` : t.birthDate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {t.gender === 'Laki-laki' ? 'L' : 'P'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 tabular-nums whitespace-nowrap">
                      {t.nuptkNpkPegId || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {t.tmt || '-'}
                    </td>
                    <td className="px-4 py-3 text-[#064E3B] font-medium whitespace-nowrap">
                      {t.position}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {t.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[240px] truncate" title={t.address}>
                      {t.address || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {confirmDeleteId === t.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(t)}
                            disabled={deletingId === t.id}
                            className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === t.id ? 'Menghapus...' : 'Ya, Hapus'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 text-xs hover:bg-slate-50 cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(t)}
                            title="Edit data guru"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#064E3B] hover:bg-emerald-50 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(t.id)}
                            title="Hapus data guru"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
