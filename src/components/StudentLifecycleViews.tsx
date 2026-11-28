import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Download,
  Edit3,
  GraduationCap,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LIMITS, todayIsoDate } from '../lib/validation';
import {
  createStudentRecord,
  deleteStudentMutationLog,
  deleteStudentRecord,
  promoteStudentsBatch,
  recordStudentMutationIn,
  recordStudentMutationOut,
  updateStudentProfile,
} from '../services/schoolService';
import {
  SchoolClass,
  StudentMutationRecord,
  StudentRecord,
  TeacherGender,
} from '../types/school';
import { exportAlumniToExcel } from '../utils/studentExcel';

const MI_GRADE_ORDER: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
};

function isStudentActive(s: StudentRecord): boolean {
  return !s.status || s.status === 'Aktif';
}

// ============================================================================
// Submenu 2: Mutasi Keluar dan Masuk
// ============================================================================
export function StudentMutationView({
  students,
  classes,
  mutations,
}: {
  students: StudentRecord[];
  classes: SchoolClass[];
  mutations: StudentMutationRecord[];
}) {
  const { firebaseUser } = useAuth();
  const [mutationTab, setMutationTab] = useState<'masuk' | 'keluar'>('masuk');
  const [filterType, setFilterType] = useState<'Semua' | 'Masuk' | 'Keluar'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Mutasi Masuk state
  const [inNisn, setInNisn] = useState('');
  const [inFullName, setInFullName] = useState('');
  const [inNik, setInNik] = useState('');
  const [inGender, setInGender] = useState<TeacherGender>('Laki-laki');
  const [inBirthPlace, setInBirthPlace] = useState('');
  const [inBirthDate, setInBirthDate] = useState('');
  const [inParentName, setInParentName] = useState('');
  const [inPhone, setInPhone] = useState('');
  const [inAddress, setInAddress] = useState('');
  const [inClassId, setInClassId] = useState('');
  const [inDate, setInDate] = useState(todayIsoDate());
  const [inPreviousSchool, setInPreviousSchool] = useState('');
  const [inLetterNumber, setInLetterNumber] = useState('');
  const [inReason, setInReason] = useState('');

  // Mutasi Keluar state
  const [outStudentId, setOutStudentId] = useState('');
  const [outDate, setOutDate] = useState(todayIsoDate());
  const [outDestSchool, setOutDestSchool] = useState('');
  const [outLetterNumber, setOutLetterNumber] = useState('');
  const [outReason, setOutReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeStudents = useMemo(
    () => students.filter(isStudentActive).sort((a, b) => a.fullName.localeCompare(b.fullName, 'id-ID')),
    [students]
  );

  useEffect(() => {
    if (!inClassId && classes.length > 0) {
      setInClassId(classes[0].id);
    }
  }, [classes, inClassId]);

  useEffect(() => {
    if (!outStudentId && activeStudents.length > 0) {
      setOutStudentId(activeStudents[0].id);
    }
  }, [activeStudents, outStudentId]);

  const stats = useMemo(() => {
    const masukCount = mutations.filter((m) => m.mutationType === 'Masuk').length;
    const keluarCount = mutations.filter((m) => m.mutationType === 'Keluar').length;
    return {
      total: mutations.length,
      masukCount,
      keluarCount,
      activeCount: activeStudents.length,
    };
  }, [mutations, activeStudents.length]);

  const filteredMutations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mutations.filter((m) => {
      if (filterType !== 'Semua' && m.mutationType !== filterType) return false;
      if (!q) return true;
      return (
        m.studentName.toLowerCase().includes(q) ||
        m.nisn.toLowerCase().includes(q) ||
        m.schoolOriginOrDestination.toLowerCase().includes(q) ||
        m.letterNumber.toLowerCase().includes(q) ||
        m.className.toLowerCase().includes(q)
      );
    });
  }, [mutations, filterType, searchQuery]);

  const handleMutationInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const targetClass = classes.find((c) => c.id === inClassId);
    if (!targetClass) {
      setFeedback({ type: 'error', text: 'Pilih kelas MI tujuan untuk siswa mutasi masuk.' });
      return;
    }
    if (inFullName.trim().length < 2 || inPreviousSchool.trim().length < 2) {
      setFeedback({
        type: 'error',
        text: 'Nama siswa dan sekolah/madrasah asal minimal terdiri dari 2 karakter.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await recordStudentMutationIn({
        nisn: inNisn || String(Date.now()).slice(-8),
        fullName: inFullName.trim(),
        nik: inNik.trim(),
        gender: inGender,
        birthPlace: inBirthPlace.trim(),
        birthDate: inBirthDate.trim(),
        parentName: inParentName.trim(),
        phone: inPhone.trim(),
        address: inAddress.trim(),
        schoolClass: targetClass,
        mutationDate: inDate,
        previousSchool: inPreviousSchool.trim(),
        letterNumber: inLetterNumber.trim(),
        reason: inReason.trim(),
        actorUid: firebaseUser.uid,
      });
      setInNisn('');
      setInFullName('');
      setInNik('');
      setInBirthPlace('');
      setInBirthDate('');
      setInParentName('');
      setInPhone('');
      setInAddress('');
      setInPreviousSchool('');
      setInLetterNumber('');
      setInReason('');
      setFeedback({
        type: 'success',
        text: `Mutasi masuk siswa "${inFullName.trim()}" ke Kelas ${targetClass.name} berhasil dicatat dan ditambahkan ke Daftar Siswa.`,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Gagal mencatat mutasi masuk siswa.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMutationOutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const targetStudent = activeStudents.find((s) => s.id === outStudentId);
    if (!targetStudent) {
      setFeedback({ type: 'error', text: 'Pilih siswa aktif yang akan dimutasi keluar.' });
      return;
    }
    if (outDestSchool.trim().length < 2) {
      setFeedback({ type: 'error', text: 'Madrasah / sekolah tujuan minimal terdiri dari 2 karakter.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await recordStudentMutationOut({
        student: targetStudent,
        mutationDate: outDate,
        destinationSchool: outDestSchool.trim(),
        letterNumber: outLetterNumber.trim(),
        reason: outReason.trim(),
        actorUid: firebaseUser.uid,
      });
      setOutDestSchool('');
      setOutLetterNumber('');
      setOutReason('');
      setOutStudentId('');
      setFeedback({
        type: 'success',
        text: `Mutasi keluar untuk ${targetStudent.fullName} berhasil dicatat. Status siswa otomatis diperbarui menjadi Mutasi Keluar.`,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Gagal mencatat mutasi keluar siswa.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#F3D88B]">Submenu Data Siswa · Administrasi Mutasi</p>
          <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
            Mutasi Keluar &amp; Masuk Siswa
          </h1>
          <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1 max-w-2xl">
            Catat siswa pindahan masuk beserta asal madrasah/sekolah, maupun mutasi pindah keluar lengkap dengan nomor surat pindah dan riwayatnya.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-[#0A3A2B] border border-[#23614E] rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => {
              setMutationTab('masuk');
              setFeedback(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              mutationTab === 'masuk'
                ? 'bg-[#D4A74A] text-[#062C21]'
                : 'text-[#C6DDD4] hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Mutasi Masuk</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMutationTab('keluar');
              setFeedback(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              mutationTab === 'keluar'
                ? 'bg-[#D4A74A] text-[#062C21]'
                : 'text-[#C6DDD4] hover:text-white'
            }`}
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span>Mutasi Keluar</span>
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

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Riwayat Mutasi</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {stats.total}
          </p>
          <p className="text-xs text-slate-500 mt-1">Catatan pindah masuk &amp; keluar</p>
        </div>
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Mutasi Masuk</p>
          <p className="font-mono text-2xl font-bold text-[#064E3B] tabular-nums mt-1.5">
            {stats.masukCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Siswa pindahan diterima</p>
        </div>
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Mutasi Keluar</p>
          <p className="font-mono text-2xl font-bold text-amber-700 tabular-nums mt-1.5">
            {stats.keluarCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Siswa pindah sekolah</p>
        </div>
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Siswa Aktif Saat Ini</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {stats.activeCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Terdaftar aktif di kelas</p>
        </div>
      </div>

      {/* Form Card: Mutasi Masuk vs Mutasi Keluar */}
      {mutationTab === 'masuk' ? (
        <form
          onSubmit={handleMutationInSubmit}
          className="bg-[#FCFBF8] border border-[#D8D3C6] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#064E3B]" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Formulir Mutasi Masuk (Siswa Pindahan)
              </h2>
              <p className="text-xs text-slate-600">
                Data siswa otomatis masuk ke Daftar Siswa dengan status Aktif dan tercatat di riwayat mutasi.
              </p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                NISN <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                minLength={4}
                maxLength={LIMITS.NISN_MAX}
                value={inNisn}
                onChange={(e) => setInNisn(e.target.value)}
                placeholder="Contoh: 3154129099"
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
                value={inFullName}
                onChange={(e) => setInFullName(e.target.value)}
                placeholder="Nama lengkap sesuai akta/rapor"
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
                value={inNik}
                onChange={(e) => setInNik(e.target.value)}
                placeholder="Contoh: 3508124120160001"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Kelamin
              </label>
              <select
                value={inGender}
                onChange={(e) => setInGender(e.target.value as TeacherGender)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kelas Penempatan MI <span className="text-red-600">*</span>
              </label>
              <select
                value={inClassId}
                onChange={(e) => setInClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                {classes.length === 0 ? (
                  <option value="">Belum ada kelas MI</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Mutasi Masuk <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={inDate}
                onChange={(e) => setInDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Madrasah / Sekolah Asal <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={LIMITS.SCHOOL_NAME_MAX}
                value={inPreviousSchool}
                onChange={(e) => setInPreviousSchool(e.target.value)}
                placeholder="Contoh: MI Nurul Huda Jakarta"
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
                value={inBirthPlace}
                onChange={(e) => setInBirthPlace(e.target.value)}
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
                value={inBirthDate}
                onChange={(e) => setInBirthDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor Surat Pindah
              </label>
              <input
                type="text"
                maxLength={LIMITS.LETTER_NUMBER_MAX}
                value={inLetterNumber}
                onChange={(e) => setInLetterNumber(e.target.value)}
                placeholder="Contoh: 045/MI-NH/XI/2026"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Orang Tua / Wali
              </label>
              <input
                type="text"
                maxLength={LIMITS.PARENT_NAME_MAX}
                value={inParentName}
                onChange={(e) => setInParentName(e.target.value)}
                placeholder="Nama ayah/ibu/wali"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                No. HP Orang Tua
              </label>
              <input
                type="text"
                maxLength={LIMITS.TEACHER_PHONE_MAX}
                value={inPhone}
                onChange={(e) => setInPhone(e.target.value)}
                placeholder="081234567890"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alasan / Keterangan
              </label>
              <input
                type="text"
                maxLength={LIMITS.MUTATION_REASON_MAX}
                value={inReason}
                onChange={(e) => setInReason(e.target.value)}
                placeholder="Contoh: Mengikuti kepindahan tugas orang tua"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Domisili
              </label>
              <input
                type="text"
                maxLength={LIMITS.TEACHER_ADDRESS_MAX}
                value={inAddress}
                onChange={(e) => setInAddress(e.target.value)}
                placeholder="Alamat lengkap siswa di wilayah madrasah"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#EAE6DB] bg-[#F5F3EC] flex justify-end">
            <button
              type="submit"
              disabled={submitting || classes.length === 0}
              className="px-5 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Catat Mutasi Masuk & Daftarkan Siswa'}
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleMutationOutSubmit}
          className="bg-[#FCFBF8] border border-[#D8D3C6] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center gap-2">
            <UserMinus className="w-4 h-4 text-amber-700" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Formulir Mutasi Keluar (Siswa Pindah Sekolah)
              </h2>
              <p className="text-xs text-slate-600">
                Status siswa pada Daftar Siswa akan berubah menjadi Mutasi Keluar dan riwayat pindah tersimpan permanen.
              </p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Siswa Aktif <span className="text-red-600">*</span>
              </label>
              <select
                value={outStudentId}
                onChange={(e) => setOutStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              >
                {activeStudents.length === 0 ? (
                  <option value="">Tidak ada siswa aktif tersedia</option>
                ) : (
                  activeStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} — NISN {s.nisn} (Kelas {s.className})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Mutasi Keluar <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={outDate}
                onChange={(e) => setOutDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Madrasah / Sekolah Tujuan <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={LIMITS.SCHOOL_NAME_MAX}
                value={outDestSchool}
                onChange={(e) => setOutDestSchool(e.target.value)}
                placeholder="Contoh: MI Al-Falah Bandung"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor Surat Keterangan Pindah
              </label>
              <input
                type="text"
                maxLength={LIMITS.LETTER_NUMBER_MAX}
                value={outLetterNumber}
                onChange={(e) => setOutLetterNumber(e.target.value)}
                placeholder="Contoh: 112/SKP-MI/XI/2026"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alasan Mutasi Keluar
              </label>
              <input
                type="text"
                maxLength={LIMITS.MUTATION_REASON_MAX}
                value={outReason}
                onChange={(e) => setOutReason(e.target.value)}
                placeholder="Contoh: Pindah domisili keluarga ke luar kota"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#EAE6DB] bg-[#F5F3EC] flex justify-end">
            <button
              type="submit"
              disabled={submitting || activeStudents.length === 0}
              className="px-5 py-2.5 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Mutasi Keluar'}
            </button>
          </div>
        </form>
      )}

      {/* Mutasi Log Table */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-[#064E3B]" />
            <h2 className="text-base font-semibold text-slate-900">
              Riwayat Mutasi Masuk &amp; Keluar
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa, NISN, sekolah..."
                className="pl-9 pr-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-900 w-52"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'Semua' | 'Masuk' | 'Keluar')}
              className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-800"
            >
              <option value="Semua">Semua Mutasi</option>
              <option value="Masuk">Mutasi Masuk</option>
              <option value="Keluar">Mutasi Keluar</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#FAF9F5] border-b border-[#EAE6DB] text-slate-600 text-xs font-semibold">
                <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3 whitespace-nowrap">Jenis</th>
                <th className="px-4 py-3 whitespace-nowrap">NISN</th>
                <th className="px-4 py-3 whitespace-nowrap">Nama Siswa</th>
                <th className="px-4 py-3 whitespace-nowrap">Kelas</th>
                <th className="px-4 py-3 whitespace-nowrap">Sekolah Asal / Tujuan</th>
                <th className="px-4 py-3 whitespace-nowrap">No. Surat</th>
                <th className="px-4 py-3 whitespace-nowrap">Keterangan</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE2]">
              {filteredMutations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    Belum ada riwayat mutasi masuk atau keluar yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredMutations.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F5F3EC]/70">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {m.mutationDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold ${
                          m.mutationType === 'Masuk' ? 'text-[#064E3B]' : 'text-amber-700'
                        }`}
                      >
                        Mutasi {m.mutationType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {m.nisn}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {m.studentName}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{m.className}</td>
                    <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                      {m.schoolOriginOrDestination}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {m.letterNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={m.reason}>
                      {m.reason || '-'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {confirmDeleteId === m.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteStudentMutationLog(m);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded bg-red-600 text-white text-xs cursor-pointer"
                          >
                            Hapus
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
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(m.id)}
                          title="Hapus log mutasi"
                          className="p-1.5 text-slate-400 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Submenu 3: Kenaikan Kelas
// ============================================================================
export function StudentPromotionView({
  students,
  classes,
}: {
  students: StudentRecord[];
  classes: SchoolClass[];
}) {
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const ga = MI_GRADE_ORDER[a.gradeLevel] ?? 99;
      const gb = MI_GRADE_ORDER[b.gradeLevel] ?? 99;
      if (ga !== gb) return ga - gb;
      return a.name.localeCompare(b.name, 'id-ID');
    });
  }, [classes]);

  const [sourceClassId, setSourceClassId] = useState('');
  const [promotionMode, setPromotionMode] = useState<'promote' | 'graduate'>('promote');
  const [targetClassId, setTargetClassId] = useState('');
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear()));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!sourceClassId && sortedClasses.length > 0) {
      setSourceClassId(sortedClasses[0].id);
    }
  }, [sortedClasses, sourceClassId]);

  const sourceClass = useMemo(
    () => sortedClasses.find((c) => c.id === sourceClassId),
    [sortedClasses, sourceClassId]
  );

  const sourceStudents = useMemo(
    () =>
      students
        .filter((s) => s.classId === sourceClassId && isStudentActive(s))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'id-ID')),
    [students, sourceClassId]
  );

  // Auto-select next class or graduate mode if source is Kelas VI
  useEffect(() => {
    if (!sourceClass) return;
    if (sourceClass.gradeLevel === 'VI') {
      setPromotionMode('graduate');
    } else {
      setPromotionMode('promote');
      const currentOrder = MI_GRADE_ORDER[sourceClass.gradeLevel] ?? 0;
      const nextClass = sortedClasses.find(
        (c) => (MI_GRADE_ORDER[c.gradeLevel] ?? 0) === currentOrder + 1
      );
      if (nextClass) {
        setTargetClassId(nextClass.id);
      } else {
        const fallback = sortedClasses.find((c) => c.id !== sourceClass.id);
        setTargetClassId(fallback?.id || '');
      }
    }
  }, [sourceClass, sortedClasses]);

  // Select all active students in source class whenever source class changes
  useEffect(() => {
    setSelectedIds(sourceStudents.map((s) => s.id));
  }, [sourceStudents]);

  const allSelected = sourceStudents.length > 0 && selectedIds.length === sourceStudents.length;

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : sourceStudents.map((s) => s.id));
  };

  const handleExecutePromotion = async () => {
    const selectedStudents = sourceStudents.filter((s) => selectedIds.includes(s.id));
    if (selectedStudents.length === 0) {
      setFeedback({ type: 'error', text: 'Pilih minimal satu siswa untuk diproses.' });
      return;
    }

    if (promotionMode === 'promote') {
      const targetClass = sortedClasses.find((c) => c.id === targetClassId);
      if (!targetClass) {
        setFeedback({ type: 'error', text: 'Pilih kelas tujuan kenaikan kelas.' });
        return;
      }
      if (targetClass.id === sourceClassId) {
        setFeedback({ type: 'error', text: 'Kelas tujuan harus berbeda dari kelas asal.' });
        return;
      }

      setProcessing(true);
      setFeedback(null);
      try {
        const count = await promoteStudentsBatch({
          students: selectedStudents,
          mode: 'promote',
          targetClass,
        });
        setFeedback({
          type: 'success',
          text: `${count} siswa berhasil dinaikkan dari Kelas ${sourceClass?.name} ke Kelas ${targetClass.name}.`,
        });
      } catch {
        setFeedback({ type: 'error', text: 'Gagal memproses kenaikan kelas.' });
      } finally {
        setProcessing(false);
      }
    } else {
      if (!graduationYear.trim()) {
        setFeedback({ type: 'error', text: 'Isi tahun kelulusan alumni terlebih dahulu.' });
        return;
      }

      setProcessing(true);
      setFeedback(null);
      try {
        const count = await promoteStudentsBatch({
          students: selectedStudents,
          mode: 'graduate',
          graduationYear: graduationYear.trim(),
        });
        setFeedback({
          type: 'success',
          text: `${count} siswa Kelas ${sourceClass?.name} berhasil diluluskan dan dipindahkan ke Submenu Alumni (${graduationYear.trim()}).`,
        });
      } catch {
        setFeedback({ type: 'error', text: 'Gagal meluluskan siswa ke daftar alumni.' });
      } finally {
        setProcessing(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C]">
        <p className="text-xs font-semibold text-[#F3D88B]">Submenu Data Siswa · Promosi Akademik MI</p>
        <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
          Kenaikan Kelas &amp; Kelulusan MI
        </h1>
        <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1 max-w-2xl">
          Naikkan siswa secara massal ke kelas berikutnya pada tahun ajaran baru, atau luluskan siswa tingkat akhir (Kelas VI) ke direktori Alumni. Hapus centang bagi siswa yang tinggal kelas.
        </p>
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

      {/* Configuration Panel */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-[#064E3B]" />
          <h2 className="text-base font-semibold text-slate-900">
            Pengaturan Kelas Asal &amp; Tujuan
          </h2>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              1. Pilih Kelas Asal
            </label>
            <select
              value={sourceClassId}
              onChange={(e) => {
                setSourceClassId(e.target.value);
                setFeedback(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
            >
              {sortedClasses.length === 0 ? (
                <option value="">Belum ada kelas MI</option>
              ) : (
                sortedClasses.map((c) => {
                  const count = students.filter((s) => s.classId === c.id && isStudentActive(s)).length;
                  return (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name} (Tingkat {c.gradeLevel}) · {count} siswa aktif
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              2. Jenis Proses
            </label>
            <select
              value={promotionMode}
              onChange={(e) => setPromotionMode(e.target.value as 'promote' | 'graduate')}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
            >
              <option value="promote">Naik ke Kelas Berikutnya</option>
              <option value="graduate">Luluskan Menjadi Alumni MI</option>
            </select>
          </div>

          <div>
            {promotionMode === 'promote' ? (
              <>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  3. Pilih Kelas Tujuan
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                >
                  <option value="">-- Pilih Kelas Tujuan --</option>
                  {sortedClasses
                    .filter((c) => c.id !== sourceClassId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name} (Tingkat {c.gradeLevel} · {c.academicYear})
                      </option>
                    ))}
                </select>
              </>
            ) : (
              <>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  3. Tahun Kelulusan Alumni
                </label>
                <input
                  type="text"
                  maxLength={LIMITS.GRADUATION_YEAR_MAX}
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder="Contoh: 2026"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Checklist Table */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-900 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={sourceStudents.length === 0}
                className="rounded border-slate-300 text-[#064E3B]"
              />
              <span>
                Pilih Semua ({selectedIds.length} / {sourceStudents.length} siswa aktif)
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleExecutePromotion}
            disabled={processing || selectedIds.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs sm:text-sm font-semibold hover:bg-[#04392B] cursor-pointer disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4" />
            <span>
              {processing
                ? 'Memproses...'
                : promotionMode === 'promote'
                ? `Naikkan ${selectedIds.length} Siswa Terpilih`
                : `Luluskan ${selectedIds.length} Siswa ke Alumni`}
            </span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#FAF9F5] border-b border-[#EAE6DB] text-slate-600 text-xs font-semibold">
                <th className="px-4 py-3 w-12">Pilih</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Nama Lengkap Siswa</th>
                <th className="px-4 py-3">L/P</th>
                <th className="px-4 py-3">Kelas Saat Ini</th>
                <th className="px-4 py-3">Rencana Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE2]">
              {sourceStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Tidak ada siswa aktif di kelas asal yang dipilih.
                  </td>
                </tr>
              ) : (
                sourceStudents.map((stu) => {
                  const checked = selectedIds.includes(stu.id);
                  const targetClassName = sortedClasses.find((c) => c.id === targetClassId)?.name;

                  return (
                    <tr
                      key={stu.id}
                      onClick={() => toggleStudent(stu.id)}
                      className="hover:bg-[#F5F3EC]/70 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudent(stu.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-[#064E3B]"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600">
                        {stu.nisn}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{stu.fullName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {stu.gender === 'Perempuan' ? 'P' : 'L'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{stu.className}</td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {checked ? (
                          promotionMode === 'promote' ? (
                            <span className="text-[#064E3B]">
                              {targetClassName ? `Naik ke ${targetClassName}` : 'Pilih kelas tujuan'}
                            </span>
                          ) : (
                            <span className="text-[#064E3B]">Lulus / Alumni {graduationYear}</span>
                          )
                        ) : (
                          <span className="text-amber-700">Tetap di {stu.className}</span>
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
  );
}

// ============================================================================
// Submenu 4: Alumni
// ============================================================================
export function StudentAlumniView({
  students,
  classes,
  madrasahName,
  isAdmin,
}: {
  students: StudentRecord[];
  classes: SchoolClass[];
  madrasahName?: string;
  isAdmin: boolean;
}) {
  const { firebaseUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('Semua');

  const [formOpen, setFormOpen] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<StudentRecord | null>(null);
  const [nisn, setNisn] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<TeacherGender>('Laki-laki');
  const [classId, setClassId] = useState('');
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear()));
  const [certificateNumber, setCertificateNumber] = useState('');
  const [nextSchool, setNextSchool] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const alumniList = useMemo(
    () =>
      students
        .filter((s) => s.status === 'Alumni')
        .sort((a, b) => {
          const yDiff = (b.graduationYear || '').localeCompare(a.graduationYear || '');
          return yDiff !== 0 ? yDiff : a.fullName.localeCompare(b.fullName, 'id-ID');
        }),
    [students]
  );

  const graduationYears = useMemo(() => {
    const years = Array.from(new Set(alumniList.map((a) => a.graduationYear).filter(Boolean))) as string[];
    return years.sort((a, b) => b.localeCompare(a));
  }, [alumniList]);

  useEffect(() => {
    if (!classId && classes.length > 0) {
      const sixthGrade = classes.find((c) => c.gradeLevel === 'VI');
      setClassId((sixthGrade || classes[classes.length - 1]).id);
    }
  }, [classes, classId]);

  const filteredAlumni = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return alumniList.filter((a) => {
      if (yearFilter !== 'Semua' && (a.graduationYear || '') !== yearFilter) return false;
      if (!q) return true;
      return (
        a.fullName.toLowerCase().includes(q) ||
        a.nisn.toLowerCase().includes(q) ||
        (a.nextSchool || '').toLowerCase().includes(q) ||
        (a.certificateNumber || '').toLowerCase().includes(q)
      );
    });
  }, [alumniList, yearFilter, searchQuery]);

  const stats = useMemo(() => {
    const withNextSchool = alumniList.filter((a) => (a.nextSchool || '').trim().length > 0).length;
    const withCert = alumniList.filter((a) => (a.certificateNumber || '').trim().length > 0).length;
    return {
      total: alumniList.length,
      latestYear: graduationYears[0] || '-',
      withNextSchool,
      withCert,
    };
  }, [alumniList, graduationYears]);

  const resetForm = () => {
    setEditingAlumni(null);
    setNisn('');
    setFullName('');
    setGender('Laki-laki');
    setGraduationYear(String(new Date().getFullYear()));
    setCertificateNumber('');
    setNextSchool('');
    setPhone('');
    setAddress('');
  };

  const handleOpenEdit = (alu: StudentRecord) => {
    setFeedback(null);
    setEditingAlumni(alu);
    setNisn(alu.nisn);
    setFullName(alu.fullName);
    setGender(alu.gender || 'Laki-laki');
    setClassId(alu.classId);
    setGraduationYear(alu.graduationYear || String(new Date().getFullYear()));
    setCertificateNumber(alu.certificateNumber || '');
    setNextSchool(alu.nextSchool || '');
    setPhone(alu.phone || '');
    setAddress(alu.address || '');
    setFormOpen(true);
  };

  const handleSubmitAlumni = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const targetClass = classes.find((c) => c.id === classId) || classes[0];
    if (!targetClass) {
      setFeedback({ type: 'error', text: 'Buat minimal satu kelas MI terlebih dahulu.' });
      return;
    }
    if (fullName.trim().length < 2) {
      setFeedback({ type: 'error', text: 'Nama alumni minimal terdiri dari 2 karakter.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      if (editingAlumni) {
        await updateStudentProfile(editingAlumni, {
          nisn: nisn.trim() || editingAlumni.nisn,
          fullName: fullName.trim(),
          schoolClass: targetClass,
          status: 'Alumni',
          gender,
          birthPlace: editingAlumni.birthPlace || '',
          birthDate: editingAlumni.birthDate || '',
          parentName: editingAlumni.parentName || '',
          phone: phone.trim(),
          address: address.trim(),
          studentUid: editingAlumni.studentUid || '',
          parentUids: editingAlumni.parentUids || [],
          graduationYear: graduationYear.trim(),
          nextSchool: nextSchool.trim(),
          certificateNumber: certificateNumber.trim(),
        });
        setFeedback({ type: 'success', text: `Data alumni "${fullName.trim()}" diperbarui.` });
      } else {
        await createStudentRecord({
          nisn: nisn.trim() || String(Date.now()).slice(-8),
          fullName: fullName.trim(),
          schoolClass: targetClass,
          teacherUid: firebaseUser.uid,
          status: 'Alumni',
          gender,
          phone: phone.trim(),
          address: address.trim(),
          graduationYear: graduationYear.trim(),
          nextSchool: nextSchool.trim(),
          certificateNumber: certificateNumber.trim(),
        });
        setFeedback({ type: 'success', text: `Data alumni "${fullName.trim()}" berhasil disimpan.` });
      }
      setFormOpen(false);
      resetForm();
    } catch {
      setFeedback({ type: 'error', text: 'Gagal menyimpan data alumni.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreActive = async (alu: StudentRecord) => {
    const targetClass = classes.find((c) => c.id === alu.classId) || classes[0];
    if (!targetClass) return;
    await updateStudentProfile(alu, {
      nisn: alu.nisn,
      fullName: alu.fullName,
      schoolClass: targetClass,
      status: 'Aktif',
      gender: alu.gender || 'Laki-laki',
      birthPlace: alu.birthPlace || '',
      birthDate: alu.birthDate || '',
      parentName: alu.parentName || '',
      phone: alu.phone || '',
      address: alu.address || '',
      studentUid: alu.studentUid || '',
      parentUids: alu.parentUids || [],
    });
    setFeedback({
      type: 'success',
      text: `${alu.fullName} dikembalikan menjadi siswa aktif di Kelas ${targetClass.name}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#F3D88B]">Submenu Data Siswa · Direktori Lulusan MI</p>
          <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
            Data Alumni Madrasah (MI)
          </h1>
          <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1 max-w-2xl">
            Arsip lulusan Madrasah Ibtidaiyah lengkap dengan tahun kelulusan, nomor ijazah/SKL, serta sekolah lanjutan (MTs/SMP).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {alumniList.length > 0 && (
            <button
              type="button"
              onClick={() => exportAlumniToExcel(filteredAlumni, madrasahName)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2C6B57] bg-[#0B3A2C] text-[#FAF8F2] text-sm font-medium hover:bg-[#104A39] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Alumni (.xlsx)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              resetForm();
              setFormOpen(true);
              setFeedback(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A74A] text-[#062C21] text-sm font-semibold hover:bg-[#DFB763] cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Catat Alumni</span>
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

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Alumni</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {stats.total} Lulusan
          </p>
          <p className="text-xs text-slate-500 mt-1">Tercatat dalam arsip MI</p>
        </div>
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Angkatan Terbaru</p>
          <p className="font-mono text-2xl font-bold text-[#064E3B] tabular-nums mt-1.5">
            {stats.latestYear}
          </p>
          <p className="text-xs text-slate-500 mt-1">Tahun kelulusan terakhir</p>
        </div>
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Melanjutkan ke MTs/SMP</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {stats.withNextSchool}
          </p>
          <p className="text-xs text-slate-500 mt-1">Sekolah tujuan terdata</p>
        </div>
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Nomor Ijazah / SKL</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {stats.withCert}
          </p>
          <p className="text-xs text-slate-500 mt-1">Dokumen kelulusan lengkap</p>
        </div>
      </div>

      {/* Add / Edit Alumni Form */}
      {formOpen && (
        <form
          onSubmit={handleSubmitAlumni}
          className="bg-[#FCFBF8] border border-[#D8D3C6] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                {editingAlumni ? 'Perbarui Data Alumni' : 'Tambah Catatan Alumni MI'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Lengkapi informasi kelulusan, nomor ijazah, serta jenjang MTs/SMP lanjutan.
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
                NISN <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                minLength={4}
                maxLength={LIMITS.NISN_MAX}
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="Contoh: 3124129001"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lengkap Alumni <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={LIMITS.DISPLAY_NAME_MAX}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tahun Lulus <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.GRADUATION_YEAR_MAX}
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="2026"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kelas Terakhir
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Kelamin
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as TeacherGender)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                No. Ijazah / SKL
              </label>
              <input
                type="text"
                maxLength={LIMITS.CERTIFICATE_NUMBER_MAX}
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                placeholder="Contoh: MI-02/2026/00142"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Melanjutkan ke (MTs / SMP)
              </label>
              <input
                type="text"
                maxLength={LIMITS.SCHOOL_NAME_MAX}
                value={nextSchool}
                onChange={(e) => setNextSchool(e.target.value)}
                placeholder="Contoh: MTsN 1 Bekasi / SMP Islam"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                No. HP Kontak Alumni / Wali
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
                Alamat
              </label>
              <input
                type="text"
                maxLength={LIMITS.TEACHER_ADDRESS_MAX}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#EAE6DB] bg-[#F5F3EC] flex justify-end">
            <button
              type="submit"
              disabled={saving || classes.length === 0}
              className="px-5 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : editingAlumni ? 'Perbarui Alumni' : 'Simpan Data Alumni'}
            </button>
          </div>
        </form>
      )}

      {/* Alumni Table */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#064E3B]" />
            <h2 className="text-base font-semibold text-slate-900">Direktori Alumni Madrasah</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari alumni, NISN, sekolah tujuan..."
                className="pl-9 pr-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-900 w-56"
              />
            </div>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-800"
            >
              <option value="Semua">Semua Tahun Lulus</option>
              {graduationYears.map((y) => (
                <option key={y} value={y}>
                  Lulus {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#FAF9F5] border-b border-[#EAE6DB] text-slate-600 text-xs font-semibold">
                <th className="px-4 py-3 whitespace-nowrap">No.</th>
                <th className="px-4 py-3 whitespace-nowrap">NISN</th>
                <th className="px-4 py-3 whitespace-nowrap">Nama Alumni</th>
                <th className="px-4 py-3 whitespace-nowrap">Tahun Lulus</th>
                <th className="px-4 py-3 whitespace-nowrap">Kelas Terakhir</th>
                <th className="px-4 py-3 whitespace-nowrap">No. Ijazah / SKL</th>
                <th className="px-4 py-3 whitespace-nowrap">Sekolah Lanjutan (MTs/SMP)</th>
                <th className="px-4 py-3 whitespace-nowrap">No. HP</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE2]">
              {filteredAlumni.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    Belum ada data alumni tersimpan. Gunakan menu <strong>Kenaikan Kelas</strong> untuk meluluskan siswa Kelas VI atau klik <strong>Catat Alumni</strong>.
                  </td>
                </tr>
              ) : (
                filteredAlumni.map((alu, idx) => (
                  <tr key={alu.id} className="hover:bg-[#F5F3EC]/70">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {alu.nisn}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {alu.fullName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#064E3B] tabular-nums whitespace-nowrap">
                      {alu.graduationYear || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{alu.className}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {alu.certificateNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                      {alu.nextSchool || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {alu.phone || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {confirmDeleteId === alu.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteStudentRecord(alu);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded bg-red-600 text-white text-xs cursor-pointer"
                          >
                            Ya, Hapus
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
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(alu)}
                            title="Edit data alumni"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#064E3B] hover:bg-emerald-50 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRestoreActive(alu)}
                            className="text-xs font-medium text-slate-600 hover:text-[#064E3B] px-2 py-1 rounded hover:bg-[#F5F3EC] cursor-pointer"
                          >
                            Aktifkan
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(alu.id)}
                              title="Hapus alumni"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
