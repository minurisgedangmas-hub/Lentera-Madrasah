import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LIMITS } from '../lib/validation';
import {
  assignHomeroomTeacher,
  clearHomeroomTeacher,
  createSchoolClass,
  deleteSchoolClass,
} from '../services/schoolService';
import {
  GradeLevel,
  SchoolClass,
  StudentRecord,
  TeacherRecord,
  UserProfile,
} from '../types/school';

interface HomeroomTeacherSettingsViewProps {
  teachers: TeacherRecord[];
  classes: SchoolClass[];
  students: StudentRecord[];
  allUsers: UserProfile[];
}

const MI_GRADE_ORDER: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
};

interface CandidateOption {
  key: string;
  uid: string;
  name: string;
  subtitle: string;
  source: 'teacher' | 'user';
  teacherRecord?: TeacherRecord;
  userProfile?: UserProfile;
}

export function HomeroomTeacherSettingsView({
  teachers,
  classes,
  students,
  allUsers,
}: HomeroomTeacherSettingsViewProps) {
  const { firebaseUser, profile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'Semua' | GradeLevel>('Semua');
  const [syncPosition, setSyncPosition] = useState(true);

  // Per-class draft selection map: classId -> candidate key
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({});
  const [savingClassId, setSavingClassId] = useState<string | null>(null);
  const [clearingClassId, setClearingClassId] = useState<string | null>(null);
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  // Quick-add MI Class modal/panel
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState<GradeLevel>('I');
  const [newAcademicYear, setNewAcademicYear] = useState('2026/2027');
  const [newHomeroomKey, setNewHomeroomKey] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Build unified candidate list from Data Guru (teachers) + Registered Portal Accounts (guru/admin)
  const candidates = useMemo<CandidateOption[]>(() => {
    const list: CandidateOption[] = [];

    for (const t of teachers) {
      list.push({
        key: `tch:${t.id}`,
        uid: t.id,
        name: t.fullName,
        subtitle: `${t.position}${t.nuptkNpkPegId ? ` · ID ${t.nuptkNpkPegId}` : ''}`,
        source: 'teacher',
        teacherRecord: t,
      });
    }

    for (const u of allUsers) {
      if (u.role === 'guru' || u.role === 'admin') {
        list.push({
          key: `usr:${u.uid}`,
          uid: u.uid,
          name: u.displayName,
          subtitle: `${u.role === 'admin' ? 'Admin Portal' : 'Akun Guru'} · ${u.email}`,
          source: 'user',
          userProfile: u,
        });
      }
    }

    return list;
  }, [teachers, allUsers]);

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const ga = MI_GRADE_ORDER[a.gradeLevel] ?? 99;
      const gb = MI_GRADE_ORDER[b.gradeLevel] ?? 99;
      if (ga !== gb) return ga - gb;
      return a.name.localeCompare(b.name, 'id-ID');
    });
  }, [classes]);

  // Pre-populate draft selection based on current homeroomTeacherUid / homeroomTeacherName
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const cls of classes) {
      const byUid = candidates.find((c) => c.uid === cls.homeroomTeacherUid);
      if (byUid) {
        next[cls.id] = byUid.key;
        continue;
      }
      const byName = candidates.find(
        (c) => c.name.trim().toLowerCase() === cls.homeroomTeacherName.trim().toLowerCase()
      );
      if (byName) {
        next[cls.id] = byName.key;
      } else {
        next[cls.id] = '';
      }
    }
    setSelectedMap(next);
  }, [classes, candidates]);

  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedClasses.filter((cls) => {
      if (gradeFilter !== 'Semua' && cls.gradeLevel !== gradeFilter) return false;
      if (!q) return true;
      return (
        cls.name.toLowerCase().includes(q) ||
        cls.homeroomTeacherName.toLowerCase().includes(q) ||
        cls.academicYear.toLowerCase().includes(q)
      );
    });
  }, [sortedClasses, gradeFilter, searchQuery]);

  const stats = useMemo(() => {
    const assignedTeacherIds = new Set(
      classes
        .filter((c) => c.homeroomTeacherUid && c.homeroomTeacherUid !== 'unassigned')
        .map((c) => c.homeroomTeacherUid)
    );
    const matchedInDirectory = classes.filter(
      (c) =>
        c.homeroomTeacherUid !== 'unassigned' &&
        teachers.some(
          (t) =>
            t.id === c.homeroomTeacherUid ||
            t.fullName.trim().toLowerCase() === c.homeroomTeacherName.trim().toLowerCase()
        )
    ).length;
    return {
      totalClasses: classes.length,
      matchedInDirectory,
      uniqueHomerooms: assignedTeacherIds.size,
      totalTeachers: teachers.length,
    };
  }, [classes, teachers]);

  const findMatchedTeacherForClass = (cls: SchoolClass): TeacherRecord | undefined => {
    return teachers.find(
      (t) =>
        t.id === cls.homeroomTeacherUid ||
        t.fullName.trim().toLowerCase() === cls.homeroomTeacherName.trim().toLowerCase()
    );
  };

  const findLinkedUserByNameOrUid = (candidate: CandidateOption): UserProfile | undefined => {
    if (candidate.userProfile) return candidate.userProfile;
    const normalizedName = candidate.name.trim().toLowerCase();
    return allUsers.find(
      (u) =>
        (u.role === 'guru' || u.role === 'admin') &&
        u.displayName.trim().toLowerCase() === normalizedName
    );
  };

  const handleSaveAssignment = async (cls: SchoolClass) => {
    const key = selectedMap[cls.id];
    const chosen = candidates.find((c) => c.key === key);
    if (!chosen) {
      setFeedback({
        type: 'error',
        text: `Pilih guru terlebih dahulu untuk Kelas ${cls.name}.`,
      });
      return;
    }

    setSavingClassId(cls.id);
    setFeedback(null);
    try {
      const linkedUser = findLinkedUserByNameOrUid(chosen);
      const classStudents = students.filter((s) => s.classId === cls.id);

      await assignHomeroomTeacher({
        schoolClass: cls,
        homeroomTeacherUid: chosen.uid,
        homeroomTeacherName: chosen.name,
        teacherRecord: chosen.teacherRecord,
        syncTeacherPosition: syncPosition && Boolean(chosen.teacherRecord),
        linkedUser,
        classStudents,
      });

      setFeedback({
        type: 'success',
        text: `Wali Kelas ${cls.name} berhasil ditetapkan kepada ${chosen.name}.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: `Gagal memperbarui Wali Kelas ${cls.name}.`,
      });
    } finally {
      setSavingClassId(null);
    }
  };

  const handleClearHomeroom = async (cls: SchoolClass) => {
    setClearingClassId(cls.id);
    setFeedback(null);
    try {
      const currentCandidate = candidates.find(
        (c) =>
          c.uid === cls.homeroomTeacherUid ||
          c.name.trim().toLowerCase() === cls.homeroomTeacherName.trim().toLowerCase()
      );
      const linkedUser = currentCandidate
        ? findLinkedUserByNameOrUid(currentCandidate)
        : allUsers.find(
            (u) =>
              (u.role === 'guru' || u.role === 'admin') &&
              (u.uid === cls.homeroomTeacherUid ||
                u.displayName.trim().toLowerCase() === cls.homeroomTeacherName.trim().toLowerCase())
          );
      const matchedTeacher = findMatchedTeacherForClass(cls);
      const classStudents = students.filter((s) => s.classId === cls.id);

      await clearHomeroomTeacher({
        schoolClass: cls,
        teacherRecord: matchedTeacher,
        syncTeacherPosition: syncPosition && Boolean(matchedTeacher),
        linkedUser,
        classStudents,
      });

      setSelectedMap((prev) => ({ ...prev, [cls.id]: '' }));
      setFeedback({
        type: 'success',
        text: `Penetapan wali kelas untuk Kelas ${cls.name} berhasil dihapus.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: `Gagal menghapus penetapan wali kelas untuk Kelas ${cls.name}.`,
      });
    } finally {
      setClearingClassId(null);
    }
  };

  const handleDeleteClass = async (cls: SchoolClass) => {
    setDeletingClassId(cls.id);
    setFeedback(null);
    try {
      await deleteSchoolClass(cls);
      setConfirmDeleteClassId(null);
      setFeedback({
        type: 'success',
        text: `Kelas ${cls.name} berhasil dihapus dari daftar kelas madrasah.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: `Gagal menghapus Kelas ${cls.name}. Pastikan Anda memiliki hak akses pengelola/pembuat kelas.`,
      });
    } finally {
      setDeletingClassId(null);
    }
  };

  const handleCreateClassSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) return;
    if (newClassName.trim().length < 1) {
      setFeedback({
        type: 'error',
        text: 'Nama kelas wajib diisi (minimal 1 karakter atau angka, misal: 1 atau I A).',
      });
      return;
    }

    const chosen = candidates.find((c) => c.key === newHomeroomKey);
    setCreatingClass(true);
    setFeedback(null);
    try {
      await createSchoolClass({
        name: newClassName.trim(),
        gradeLevel: newGradeLevel,
        academicYear: newAcademicYear.trim() || '2026/2027',
        subjects: [
          "Al-Qur'an Hadis",
          'Akidah Akhlak',
          'Fikih',
          'SKI',
          'Bahasa Arab',
          'Matematika',
          'Bahasa Indonesia',
          'IPAS',
        ],
        teacherUid: firebaseUser.uid,
        teacherName: profile.displayName,
        homeroomTeacherUid: chosen?.uid || 'unassigned',
        homeroomTeacherName: chosen?.name || 'Belum Ditentukan',
      });
      setNewClassName('');
      setNewHomeroomKey('');
      setShowAddClass(false);
      setFeedback({
        type: 'success',
        text: `Kelas ${newClassName.trim()} berhasil ditambahkan${chosen ? ` dengan Wali Kelas ${chosen.name}` : ''}.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menambahkan kelas baru. Periksa kembali isian Anda.',
      });
    } finally {
      setCreatingClass(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Submenu Banner */}
      <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#F3D88B]">
            Submenu Data Guru · Manajemen Rombel MI
          </p>
          <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
            Pengaturan Wali Kelas Madrasah (MI)
          </h1>
          <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1 max-w-2xl">
            Tetapkan guru dari Direktori Data Guru atau akun pengajar sebagai Wali Kelas untuk setiap rombongan belajar kelas I hingga VI.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFeedback(null);
            setShowAddClass((prev) => !prev);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A74A] text-[#062C21] text-sm font-semibold hover:bg-[#DFB763] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas &amp; Wali Kelas</span>
        </button>
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
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Rombel / Kelas MI</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {stats.totalClasses} Kelas
          </p>
          <p className="text-xs text-slate-500 mt-1">Tingkat I – VI</p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Terhubung Data Guru</p>
          <p className="font-mono text-2xl font-bold text-[#064E3B] tabular-nums mt-1.5">
            {stats.matchedInDirectory} / {stats.totalClasses}
          </p>
          <p className="text-xs text-slate-500 mt-1">Kelas cocok dengan Data Guru</p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Wali Kelas Menjabat</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {stats.uniqueHomerooms}
          </p>
          <p className="text-xs text-slate-500 mt-1">Pendidik penanggung jawab</p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Guru di Direktori</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {stats.totalTeachers} Guru
          </p>
          <p className="text-xs text-slate-500 mt-1">Siap ditugaskan sebagai wali kelas</p>
        </div>
      </div>

      {/* Add Class + Assign Homeroom Form */}
      {showAddClass && (
        <form
          onSubmit={handleCreateClassSubmit}
          className="bg-[#FCFBF8] border border-[#D8D3C6] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Buat Kelas MI &amp; Tentukan Wali Kelas
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Tambahkan rombongan belajar baru sekaligus memilih wali kelas dari daftar guru.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddClass(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-slate-700 text-xs font-medium hover:bg-[#EAE7DC] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Kelas <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                minLength={1}
                maxLength={LIMITS.CLASS_NAME_MAX}
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Contoh: 1, I A, atau VI B"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Jika 1 rombel per tingkat, cukup isi 1 angka/karakter (misal: 1, 2, I).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tingkat MI
              </label>
              <select
                value={newGradeLevel}
                onChange={(e) => setNewGradeLevel(e.target.value as GradeLevel)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                {(['I', 'II', 'III', 'IV', 'V', 'VI'] as GradeLevel[]).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Kelas {lvl} MI
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tahun Ajaran
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.ACADEMIC_YEAR_MAX}
                value={newAcademicYear}
                onChange={(e) => setNewAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Wali Kelas
              </label>
              <select
                value={newHomeroomKey}
                onChange={(e) => setNewHomeroomKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                <option value="">Belum Ditentukan (atur nanti)</option>
                {teachers.length > 0 && (
                  <optgroup label="Dari Direktori Data Guru">
                    {teachers.map((t) => (
                      <option key={`tch:${t.id}`} value={`tch:${t.id}`}>
                        {t.fullName} — {t.position}
                      </option>
                    ))}
                  </optgroup>
                )}
                {allUsers.some((u) => u.role === 'guru' || u.role === 'admin') && (
                  <optgroup label="Dari Akun Portal Guru">
                    {allUsers
                      .filter((u) => u.role === 'guru' || u.role === 'admin')
                      .map((u) => (
                        <option key={`usr:${u.uid}`} value={`usr:${u.uid}`}>
                          {u.displayName} ({u.email})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#EAE6DB] bg-[#F5F3EC] flex justify-end">
            <button
              type="submit"
              disabled={creatingClass}
              className="px-5 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] transition-colors cursor-pointer disabled:opacity-60"
            >
              {creatingClass ? 'Menyimpan...' : 'Simpan Kelas Baru'}
            </button>
          </div>
        </form>
      )}

      {/* Homeroom Assignment Table Card */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#064E3B]" />
              <h2 className="text-base font-semibold text-slate-900">
                Penetapan Wali Kelas per Rombongan Belajar
              </h2>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={syncPosition}
                onChange={(e) => setSyncPosition(e.target.checked)}
                className="rounded border-slate-300 text-[#064E3B] focus:ring-[#064E3B]"
              />
              <span>
                Perbarui otomatis kolom Jabatan di Data Guru menjadi &ldquo;Wali Kelas [Nama Kelas]&rdquo; saat menyimpan
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kelas atau wali kelas..."
                className="pl-9 pr-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 w-56"
              />
            </div>

            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value as 'Semua' | GradeLevel)}
              className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            >
              <option value="Semua">Semua Tingkat (I–VI)</option>
              {(['I', 'II', 'III', 'IV', 'V', 'VI'] as GradeLevel[]).map((lvl) => (
                <option key={lvl} value={lvl}>
                  Kelas {lvl} MI
                </option>
              ))}
            </select>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Belum Ada Kelas MI Terdaftar
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mt-1.5">
              Tambahkan kelas MI terlebih dahulu agar Anda dapat menetapkan wali kelas untuk masing-masing rombel.
            </p>
            <button
              type="button"
              onClick={() => setShowAddClass(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Kelas MI Pertama</span>
            </button>
          </div>
        ) : filteredClasses.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Tidak ada kelas yang sesuai filter pencarian.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#EAE6DB] text-slate-600 text-xs font-semibold">
                  <th className="px-4 py-3 whitespace-nowrap">Kelas MI</th>
                  <th className="px-4 py-3 whitespace-nowrap">Tahun Ajaran</th>
                  <th className="px-4 py-3 whitespace-nowrap">Siswa</th>
                  <th className="px-4 py-3 whitespace-nowrap">Wali Kelas Saat Ini</th>
                  <th className="px-4 py-3 whitespace-nowrap">Pilih Wali Kelas Baru</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE2]">
                {filteredClasses.map((cls) => {
                  const classStudentCount = students.filter((s) => s.classId === cls.id).length;
                  const matchedTeacher = findMatchedTeacherForClass(cls);
                  const currentKey = selectedMap[cls.id] || '';
                  const chosenCandidate = candidates.find((c) => c.key === currentKey);
                  const hasChanged =
                    Boolean(chosenCandidate) &&
                    (chosenCandidate!.uid !== cls.homeroomTeacherUid ||
                      chosenCandidate!.name !== cls.homeroomTeacherName);

                  const hasHomeroom =
                    Boolean(cls.homeroomTeacherUid) &&
                    cls.homeroomTeacherUid !== 'unassigned' &&
                    cls.homeroomTeacherName !== 'Belum Ditentukan';

                  return (
                    <tr key={cls.id} className="hover:bg-[#F5F3EC]/70 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-900">{cls.name}</p>
                        <p className="text-xs text-slate-500">Tingkat {cls.gradeLevel} MI</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {cls.academicYear}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800 tabular-nums">
                          <Users className="w-3.5 h-3.5 text-[#064E3B]" />
                          {classStudentCount} Siswa
                        </span>
                      </td>
                      <td className="px-4 py-3.5 min-w-[210px]">
                        {hasHomeroom ? (
                          <>
                            <p className="font-semibold text-slate-900">{cls.homeroomTeacherName}</p>
                            {matchedTeacher ? (
                              <p className="text-xs text-[#064E3B] mt-0.5 font-mono tabular-nums">
                                {matchedTeacher.nuptkNpkPegId
                                  ? `NUPTK/ID: ${matchedTeacher.nuptkNpkPegId}`
                                  : 'Tercatat di Data Guru'}
                                {matchedTeacher.phone ? ` · ${matchedTeacher.phone}` : ''}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Akun Portal / Belum ditautkan ke Data Guru
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-amber-800">Belum Ditentukan</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Pilih guru di samping untuk menetapkan wali kelas
                            </p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3.5 min-w-[250px]">
                        <select
                          value={currentKey}
                          onChange={(e) =>
                            setSelectedMap((prev) => ({
                              ...prev,
                              [cls.id]: e.target.value,
                            }))
                          }
                          disabled={candidates.length === 0}
                          className="w-full px-3 py-2 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                        >
                          <option value="">
                            {candidates.length === 0
                              ? 'Belum ada data guru tersedia'
                              : '-- Pilih Guru / Wali Kelas --'}
                          </option>
                          {teachers.length > 0 && (
                            <optgroup label="Direktori Data Guru MI">
                              {teachers.map((t) => (
                                <option key={`tch:${t.id}`} value={`tch:${t.id}`}>
                                  {t.fullName} ({t.position})
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {allUsers.some((u) => u.role === 'guru' || u.role === 'admin') && (
                            <optgroup label="Akun Login Portal Guru">
                              {allUsers
                                .filter((u) => u.role === 'guru' || u.role === 'admin')
                                .map((u) => (
                                  <option key={`usr:${u.uid}`} value={`usr:${u.uid}`}>
                                    {u.displayName} — {u.email}
                                  </option>
                                ))}
                            </optgroup>
                          )}
                        </select>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        {confirmDeleteClassId === cls.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            {classStudentCount > 0 && (
                              <span className="text-[11px] font-medium text-amber-800 mr-1">
                                ({classStudentCount} siswa)
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={deletingClassId === cls.id}
                              onClick={() => void handleDeleteClass(cls)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50"
                            >
                              {deletingClassId === cls.id ? 'Menghapus...' : 'Ya, Hapus Kelas'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteClassId(null)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveAssignment(cls)}
                              disabled={!currentKey || savingClassId === cls.id}
                              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-45 ${
                                hasChanged
                                  ? 'bg-[#064E3B] text-[#FAF8F2] hover:bg-[#04392B]'
                                  : 'border border-[#D4CFC2] bg-white text-slate-700 hover:bg-[#EAE7DC]'
                              }`}
                            >
                              {savingClassId === cls.id
                                ? 'Menyimpan...'
                                : hasChanged
                                ? 'Simpan Wali Kelas'
                                : 'Terapkan'}
                            </button>

                            {hasHomeroom && (
                              <button
                                type="button"
                                onClick={() => void handleClearHomeroom(cls)}
                                disabled={clearingClassId === cls.id}
                                title="Hapus wali kelas dari kelas ini"
                                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-800 text-xs font-medium hover:bg-amber-100 cursor-pointer disabled:opacity-50"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                <span>{clearingClassId === cls.id ? '...' : 'Hapus Wali'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setFeedback(null);
                                setConfirmDeleteClassId(cls.id);
                              }}
                              title={`Hapus kelas ${cls.name}`}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
