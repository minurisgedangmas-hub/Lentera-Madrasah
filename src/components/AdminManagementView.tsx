import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Database, Search, Shield, UserCheck, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  createOrUpdateRoleInvite,
  seedSampleSchoolData,
  updateUserRoleByAdmin,
} from '../services/schoolService';
import { RoleInvite, StudentRecord, UserProfile, UserRole } from '../types/school';

const PRESET_SUBJECTS = [
  "Al-Qur'an Hadis",
  'Akidah Akhlak',
  'Fikih',
  'SKI',
  'Bahasa Arab',
  'Matematika',
  'Bahasa Indonesia',
  'IPAS',
  'Pendidikan Pancasila',
  'PJOK',
  'Seni Budaya',
];

export function AdminManagementView({
  users,
  invites,
  students,
}: {
  users: UserProfile[];
  invites: RoleInvite[];
  students: StudentRecord[];
}) {
  const { firebaseUser, profile } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'guru' | 'siswa' | 'orangtua'>('orangtua');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [inviteStudentSearch, setInviteStudentSearch] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["Al-Qur'an Hadis"]);
  const [editingSubjectsUid, setEditingSubjectsUid] = useState<string | null>(null);
  const [subjectsDraft, setSubjectsDraft] = useState('');
  const [editingLinkedUid, setEditingLinkedUid] = useState<string | null>(null);
  const [linkedDraftIds, setLinkedDraftIds] = useState<string[]>([]);
  const [userStudentSearch, setUserStudentSearch] = useState('');
  const [savingLinkUid, setSavingLinkUid] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [pendingRoleDrafts, setPendingRoleDrafts] = useState<Record<string, 'orangtua' | 'guru' | 'siswa'>>({});
  const [pendingStudentDrafts, setPendingStudentDrafts] = useState<Record<string, string[]>>({});
  const [pendingSearchDrafts, setPendingSearchDrafts] = useState<Record<string, string>>({});
  const [approvingUid, setApprovingUid] = useState<string | null>(null);

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) => {
        const clsDiff = a.className.localeCompare(b.className, 'id-ID');
        return clsDiff !== 0 ? clsDiff : a.fullName.localeCompare(b.fullName, 'id-ID');
      }),
    [students]
  );

  const filteredInviteStudents = useMemo(() => {
    const q = inviteStudentSearch.trim().toLowerCase();
    if (!q) return sortedStudents;
    return sortedStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }, [sortedStudents, inviteStudentSearch]);

  const filteredUserStudents = useMemo(() => {
    const q = userStudentSearch.trim().toLowerCase();
    if (!q) return sortedStudents;
    return sortedStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }, [sortedStudents, userStudentSearch]);

  const pendingUsers = useMemo(
    () => users.filter((u) => u.role === 'pending'),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return [...users]
      .filter((u) => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;
        if (!q) return true;
        return (
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.uid.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.role === 'pending' && b.role !== 'pending') return -1;
        if (a.role !== 'pending' && b.role === 'pending') return 1;
        return a.displayName.localeCompare(b.displayName, 'id-ID');
      });
  }, [users, userSearch, roleFilter]);

  const handleSeed = async () => {
    if (!firebaseUser || !profile) return;
    setSeeding(true);
    setFeedback(null);
    try {
      await seedSampleSchoolData(firebaseUser.uid, profile.displayName);
      setFeedback('Data contoh kelas, siswa, nilai, absensi, dan pengumuman berhasil dimuat ke Firestore.');
    } finally {
      setSeeding(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !inviteEmail.trim()) return;
    const cleanEmail = inviteEmail.trim().toLowerCase();
    setInviting(true);
    setFeedback(null);
    try {
      await createOrUpdateRoleInvite({
        email: cleanEmail,
        role: inviteRole,
        displayName: inviteName || cleanEmail.split('@')[0],
        linkedStudentIds: selectedStudentIds,
        classIds: [],
        assignedSubjects: inviteRole === 'guru' ? selectedSubjects : [],
        adminUid: firebaseUser.uid,
      });

      const existingUser = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
      if (existingUser) {
        await updateUserRoleByAdmin({
          user: existingUser,
          role: inviteRole,
          linkedStudentIds: selectedStudentIds,
          classIds: existingUser.classIds || [],
          assignedSubjects: inviteRole === 'guru' ? selectedSubjects : [],
          allStudents: students,
        });
      }

      setInviteEmail('');
      setInviteName('');
      setSelectedStudentIds([]);
      setInviteStudentSearch('');
      setFeedback(
        existingUser
          ? `Peran ${inviteRole} dan tautan anak untuk ${existingUser.displayName} langsung diaktifkan.`
          : 'Undangan peran berhasil disimpan. Saat pengguna masuk dengan Google, perannya aktif otomatis.'
      );
    } finally {
      setInviting(false);
    }
  };

  const handleChangeUserRole = async (user: UserProfile, newRole: UserRole) => {
    await updateUserRoleByAdmin({
      user,
      role: newRole,
      linkedStudentIds: user.linkedStudentIds || [],
      classIds: user.classIds || [],
      assignedSubjects: user.assignedSubjects || [],
      allStudents: students,
    });
    if (newRole === 'orangtua' || newRole === 'siswa') {
      setEditingLinkedUid(user.uid);
      setLinkedDraftIds(user.linkedStudentIds || []);
      setUserStudentSearch('');
    }
    setFeedback(`Peran akun ${user.displayName} diperbarui menjadi ${newRole}.`);
  };

  const handleSaveUserSubjects = async (user: UserProfile) => {
    const parsed = subjectsDraft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await updateUserRoleByAdmin({
      user,
      role: user.role,
      linkedStudentIds: user.linkedStudentIds || [],
      classIds: user.classIds || [],
      assignedSubjects: parsed,
      allStudents: students,
    });
    setEditingSubjectsUid(null);
    setFeedback(`Mata pelajaran diampu untuk ${user.displayName} diperbarui.`);
  };

  const handleSaveLinkedStudents = async (user: UserProfile, targetIds: string[]) => {
    setSavingLinkUid(user.uid);
    setFeedback(null);
    try {
      await updateUserRoleByAdmin({
        user,
        role: user.role,
        linkedStudentIds: targetIds,
        classIds: user.classIds || [],
        assignedSubjects: user.assignedSubjects || [],
        allStudents: students,
      });
      setEditingLinkedUid(null);
      setFeedback(
        `Akses ${user.displayName} berhasil ditautkan ke ${targetIds.length} siswa/anak.`
      );
    } finally {
      setSavingLinkUid(null);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleUserLinkedStudent = (id: string) => {
    setLinkedDraftIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSubjectSelection = (subj: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((x) => x !== subj) : [...prev, subj]
    );
  };

  const togglePendingStudent = (uid: string, studentId: string) => {
    setPendingStudentDrafts((prev) => {
      const current = prev[uid] || [];
      const next = current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId];
      return { ...prev, [uid]: next };
    });
  };

  const handleApprovePendingUser = async (user: UserProfile) => {
    const targetRole = pendingRoleDrafts[user.uid] || 'orangtua';
    const targetStudentIds =
      targetRole === 'guru' ? [] : pendingStudentDrafts[user.uid] || [];
    setApprovingUid(user.uid);
    setFeedback(null);
    try {
      await updateUserRoleByAdmin({
        user,
        role: targetRole,
        linkedStudentIds: targetStudentIds,
        classIds: user.classIds || [],
        assignedSubjects: user.assignedSubjects || [],
        allStudents: students,
      });
      setFeedback(
        targetRole === 'orangtua'
          ? `Akun ${user.displayName} (${user.email}) aktif sebagai Orang Tua dan terhubung ke ${targetStudentIds.length} anak.`
          : `Akun ${user.displayName} (${user.email}) berhasil diaktifkan sebagai ${targetRole}.`
      );
    } finally {
      setApprovingUid(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111C18]">
            Panel Admin &amp; Manajemen Akses Madrasah (MI)
          </h1>
          <p className="text-sm text-[#4A5550] mt-1">
            Undang guru, siswa, dan orang tua murid MI melalui email Google, atau muat data contoh untuk uji coba portal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-[#111C18] text-sm font-medium hover:bg-[#F5F3EC] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          <Database className="w-4 h-4 text-[#064E3B]" />
          <span>{seeding ? 'Memuat Data...' : 'Muat Data Contoh MI'}</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-lg bg-[#E4EFE9] border border-[#B8D5C6] text-sm text-[#064E3B] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Cara B: Queue of self-signed-in users waiting verification */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#064E3B]" />
            <h2 className="text-base font-semibold text-[#111C18]">
              Antrean Verifikasi Orang Tua / Pengguna Baru ({pendingUsers.length})
            </h2>
          </div>
          <span className="text-xs font-medium text-[#5C6660]">
            Alur Login Mandiri (Cara B)
          </span>
        </div>

        <div className="p-5">
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-[#4A5550] leading-relaxed">
              Belum ada akun baru yang menunggu verifikasi. Minta orang tua membuka aplikasi dan klik{' '}
              <span className="font-semibold text-[#111C18]">Masuk Portal</span> dengan akun Google mereka—setelah
              itu nama &amp; email mereka otomatis muncul di kotak ini untuk langsung ditautkan ke anaknya.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((u) => {
                const draftRole = pendingRoleDrafts[u.uid] || 'orangtua';
                const draftIds = pendingStudentDrafts[u.uid] || [];
                const queryText = (pendingSearchDrafts[u.uid] || '').trim().toLowerCase();
                const matchingStudents = queryText
                  ? sortedStudents.filter(
                      (s) =>
                        s.fullName.toLowerCase().includes(queryText) ||
                        s.nisn.toLowerCase().includes(queryText) ||
                        s.className.toLowerCase().includes(queryText)
                    )
                  : sortedStudents;

                return (
                  <div
                    key={u.uid}
                    className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#111C18]">{u.displayName}</p>
                        <p className="text-xs text-[#4A5550]">{u.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={draftRole}
                          onChange={(e) =>
                            setPendingRoleDrafts((prev) => ({
                              ...prev,
                              [u.uid]: e.target.value as 'orangtua' | 'guru' | 'siswa',
                            }))
                          }
                          className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-[#111C18]"
                        >
                          <option value="orangtua">Orang Tua Murid</option>
                          <option value="guru">Guru</option>
                          <option value="siswa">Siswa</option>
                        </select>
                        <button
                          type="button"
                          disabled={
                            approvingUid === u.uid ||
                            (draftRole === 'orangtua' && students.length > 0 && draftIds.length === 0)
                          }
                          onClick={() => void handleApprovePendingUser(u)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs font-semibold hover:bg-[#04392B] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>
                            {approvingUid === u.uid
                              ? 'Mengaktifkan...'
                              : draftRole === 'orangtua'
                              ? `Aktifkan & Tautkan Anak (${draftIds.length})`
                              : `Aktifkan sebagai ${draftRole}`}
                          </span>
                        </button>
                      </div>
                    </div>

                    {(draftRole === 'orangtua' || draftRole === 'siswa') && students.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-amber-200/70">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="text-xs font-medium text-[#4A5550]">
                            Pilih Anak yang Dapat Dipantau ({draftIds.length} dipilih):
                          </label>
                          <div className="relative sm:w-64">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={pendingSearchDrafts[u.uid] || ''}
                              onChange={(e) =>
                                setPendingSearchDrafts((prev) => ({
                                  ...prev,
                                  [u.uid]: e.target.value,
                                }))
                              }
                              placeholder="Cari nama anak / kelas / NISN..."
                              className="w-full pl-8 pr-2.5 py-1 rounded-lg border border-[#D4CFC2] bg-white text-xs text-[#111C18]"
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg border border-[#E6E2D6] bg-white">
                          {matchingStudents.length === 0 ? (
                            <p className="text-xs text-[#6B746E] p-1">Siswa tidak ditemukan.</p>
                          ) : (
                            matchingStudents.map((stu) => {
                              const checked = draftIds.includes(stu.id);
                              return (
                                <button
                                  key={stu.id}
                                  type="button"
                                  onClick={() => togglePendingStudent(u.uid, stu.id)}
                                  className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                                    checked
                                      ? 'bg-[#064E3B] text-white border-[#064E3B]'
                                      : 'bg-[#FAF8F2] text-[#4A5550] border-[#D4CFC2] hover:bg-[#EAE6DB]'
                                  }`}
                                >
                                  {stu.fullName} ({stu.className})
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invite Form */}
      <form onSubmit={handleInvite} className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[#064E3B]" />
          <h2 className="text-base font-semibold text-[#111C18]">Undang Pengguna Berdasarkan Email Google</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#4A5550] mb-1">Email Google</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nama@gmail.com"
                className="w-full px-3 py-2 rounded-lg border border-[#D4CFC2] bg-white text-sm text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4A5550] mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-3 py-2 rounded-lg border border-[#D4CFC2] bg-white text-sm text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4A5550] mb-1">Peran di Madrasah</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'guru' | 'siswa' | 'orangtua')}
                className="w-full px-3 py-2 rounded-lg border border-[#D4CFC2] text-sm bg-white text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
              >
                <option value="guru">Guru</option>
                <option value="siswa">Siswa</option>
                <option value="orangtua">Orang Tua Murid</option>
              </select>
            </div>
          </div>

          {inviteRole === 'guru' && (
            <div>
              <label className="block text-xs font-medium text-[#4A5550] mb-2">
                Mata Pelajaran Diampu Guru MI
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_SUBJECTS.map((subj) => {
                  const checked = selectedSubjects.includes(subj);
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => toggleSubjectSelection(subj)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        checked
                          ? 'bg-[#064E3B] text-[#FAF8F2] border-[#064E3B]'
                          : 'bg-[#F5F3EC] text-[#4A5550] border-[#D4CFC2] hover:bg-[#EAE6DB]'
                      }`}
                    >
                      {subj}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(inviteRole === 'siswa' || inviteRole === 'orangtua') && students.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-medium text-[#4A5550]">
                  Tautkan Anak / Siswa Khusus ({selectedStudentIds.length} dipilih)
                </label>
                <div className="relative sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={inviteStudentSearch}
                    onChange={(e) => setInviteStudentSearch(e.target.value)}
                    placeholder="Cari nama anak, kelas, NISN..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-2 rounded-lg border border-[#E6E2D6] bg-[#FAF8F2]">
                {filteredInviteStudents.length === 0 ? (
                  <p className="text-xs text-[#6B746E] p-1">Siswa tidak ditemukan.</p>
                ) : (
                  filteredInviteStudents.map((stu) => {
                    const checked = selectedStudentIds.includes(stu.id);
                    return (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => toggleStudentSelection(stu.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          checked
                            ? 'bg-[#064E3B] text-[#FAF8F2] border-[#064E3B]'
                            : 'bg-white text-[#4A5550] border-[#D4CFC2] hover:bg-[#EAE6DB]'
                        }`}
                      >
                        {stu.fullName} ({stu.className})
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={inviting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] cursor-pointer disabled:opacity-60"
          >
            <UserPlus className="w-4 h-4" />
            <span>{inviting ? 'Menyimpan...' : 'Simpan Undangan Peran'}</span>
          </button>
        </div>
      </form>

      {/* Active Users Table */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#064E3B]" />
            <h2 className="text-base font-semibold text-[#111C18]">
              Pengguna Terdaftar ({filteredUsers.length}
              {filteredUsers.length !== users.length ? ` dari ${users.length}` : ''})
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Cari nama atau email..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs text-[#111C18]"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
              className="px-2.5 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-[#111C18]"
            >
              <option value="all">Semua Peran</option>
              <option value="pending">Menunggu Verifikasi</option>
              <option value="orangtua">Orang Tua</option>
              <option value="guru">Guru</option>
              <option value="siswa">Siswa</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAE6DB] bg-[#F5F3EC]/70 text-xs font-medium text-[#5C6660]">
                <th className="py-3 px-4">Nama</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Mapel / Anak Terkait</th>
                <th className="py-3 px-4">Peran Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE2] text-sm">
              {filteredUsers.map((u) => {
                const linkedStudents = students.filter(
                  (s) =>
                    (u.linkedStudentIds || []).includes(s.id) ||
                    (u.role === 'orangtua' && (s.parentUids || []).includes(u.uid)) ||
                    (u.role === 'siswa' && s.studentUid === u.uid)
                );
                const needsSync =
                  (u.role === 'orangtua' || u.role === 'siswa') &&
                  (u.linkedStudentIds || []).some((sid) => {
                    const st = students.find((s) => s.id === sid);
                    if (!st) return false;
                    return u.role === 'orangtua'
                      ? !(st.parentUids || []).includes(u.uid)
                      : st.studentUid !== u.uid;
                  });

                return (
                  <tr key={u.uid} className="hover:bg-[#F5F3EC]/70 align-top">
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#111C18]">{u.displayName}</p>
                      <p className="font-mono text-[11px] text-[#8A928C]">{u.uid}</p>
                    </td>
                    <td className="py-3 px-4 text-[#4A5550]">{u.email}</td>
                    <td className="py-3 px-4">
                      {u.role === 'guru' || u.role === 'admin' ? (
                        editingSubjectsUid === u.uid ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={subjectsDraft}
                              onChange={(e) => setSubjectsDraft(e.target.value)}
                              placeholder="Al-Qur'an Hadis, Matematika"
                              className="px-2.5 py-1 rounded-lg border border-[#D4CFC2] bg-white text-xs w-44"
                            />
                            <button
                              type="button"
                              onClick={() => void handleSaveUserSubjects(u)}
                              className="text-xs font-medium text-[#064E3B] hover:text-[#04392B] cursor-pointer"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSubjectsUid(null)}
                              className="text-xs text-[#5C6660] cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-[#4A5550]">
                            <span>
                              {(u.assignedSubjects || []).length > 0
                                ? (u.assignedSubjects || []).join(', ')
                                : 'Semua mapel'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSubjectsUid(u.uid);
                                setSubjectsDraft((u.assignedSubjects || []).join(', '));
                              }}
                              className="text-[#064E3B] hover:text-[#04392B] font-medium cursor-pointer"
                            >
                              Ubah
                            </button>
                          </div>
                        )
                      ) : u.role === 'orangtua' || u.role === 'siswa' ? (
                        editingLinkedUid === u.uid ? (
                          <div className="space-y-2 min-w-[260px]">
                            <input
                              type="text"
                              value={userStudentSearch}
                              onChange={(e) => setUserStudentSearch(e.target.value)}
                              placeholder="Cari nama anak / kelas..."
                              className="w-full px-2.5 py-1 rounded-lg border border-[#D4CFC2] bg-white text-xs"
                            />
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 rounded-lg border border-[#E6E2D6] bg-white">
                              {filteredUserStudents.map((stu) => {
                                const checked = linkedDraftIds.includes(stu.id);
                                return (
                                  <button
                                    key={stu.id}
                                    type="button"
                                    onClick={() => toggleUserLinkedStudent(stu.id)}
                                    className={`px-2 py-1 rounded-md border text-[11px] font-medium cursor-pointer ${
                                      checked
                                        ? 'bg-[#064E3B] text-white border-[#064E3B]'
                                        : 'bg-[#F5F3EC] text-[#4A5550] border-[#D4CFC2]'
                                    }`}
                                  >
                                    {stu.fullName} ({stu.className})
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={savingLinkUid === u.uid}
                                onClick={() => void handleSaveLinkedStudents(u, linkedDraftIds)}
                                className="px-2.5 py-1 rounded-md bg-[#064E3B] text-white text-xs font-semibold hover:bg-[#04392B] cursor-pointer disabled:opacity-60"
                              >
                                {savingLinkUid === u.uid ? 'Menyimpan...' : 'Simpan Tautan'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLinkedUid(null)}
                                className="text-xs text-[#5C6660] cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#064E3B] shrink-0" />
                              <span className="text-[#111C18] font-medium">
                                {linkedStudents.length > 0
                                  ? linkedStudents.map((s) => `${s.fullName} (${s.className})`).join(', ')
                                  : 'Belum ditautkan ke anak'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLinkedUid(u.uid);
                                  setLinkedDraftIds(linkedStudents.map((s) => s.id));
                                  setUserStudentSearch('');
                                }}
                                className="text-[#064E3B] hover:text-[#04392B] font-semibold cursor-pointer"
                              >
                                {linkedStudents.length > 0 ? 'Ubah Anak' : 'Pilih Anak'}
                              </button>
                              {needsSync && (
                                <button
                                  type="button"
                                  disabled={savingLinkUid === u.uid}
                                  onClick={() =>
                                    void handleSaveLinkedStudents(u, u.linkedStudentIds || [])
                                  }
                                  className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-950 font-semibold cursor-pointer"
                                >
                                  {savingLinkUid === u.uid ? '...' : 'Sinkronkan Akses Anak'}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-[#8A928C]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => void handleChangeUserRole(u, e.target.value as UserRole)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-[#111C18]"
                      >
                        <option value="pending">Menunggu Verifikasi</option>
                        <option value="guru">Guru</option>
                        <option value="siswa">Siswa</option>
                        <option value="orangtua">Orang Tua</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Invites Table */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#064E3B]" />
          <h2 className="text-base font-semibold text-[#111C18]">Daftar Undangan Peran ({invites.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAE6DB] bg-[#F5F3EC]/70 text-xs font-medium text-[#5C6660]">
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Nama</th>
                <th className="py-3 px-4">Peran</th>
                <th className="py-3 px-4">Mapel / Siswa Terkait</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE2] text-sm">
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#5C6660]">
                    Belum ada undangan peran yang dibuat.
                  </td>
                </tr>
              ) : (
                invites.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F5F3EC]/70">
                    <td className="py-3 px-4 text-[#111C18]">{inv.email}</td>
                    <td className="py-3 px-4 text-[#4A5550]">{inv.displayName}</td>
                    <td className="py-3 px-4 font-semibold text-[#064E3B]">{inv.role}</td>
                    <td className="py-3 px-4 text-xs text-[#4A5550]">
                      {inv.role === 'guru'
                        ? (inv.assignedSubjects || []).join(', ') || 'Semua mapel'
                        : `${inv.linkedStudentIds.length} siswa`}
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
