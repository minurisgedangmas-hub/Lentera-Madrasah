import React, { useState } from 'react';
import { CheckCircle2, Database, Shield, UserCheck, UserPlus } from 'lucide-react';
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
  const [inviteRole, setInviteRole] = useState<'guru' | 'siswa' | 'orangtua'>('guru');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["Al-Qur'an Hadis"]);
  const [editingSubjectsUid, setEditingSubjectsUid] = useState<string | null>(null);
  const [subjectsDraft, setSubjectsDraft] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
    setInviting(true);
    setFeedback(null);
    try {
      await createOrUpdateRoleInvite({
        email: inviteEmail,
        role: inviteRole,
        displayName: inviteName || inviteEmail.split('@')[0],
        linkedStudentIds: selectedStudentIds,
        classIds: [],
        assignedSubjects: inviteRole === 'guru' ? selectedSubjects : [],
        adminUid: firebaseUser.uid,
      });
      setInviteEmail('');
      setInviteName('');
      setSelectedStudentIds([]);
      setFeedback('Undangan peran berhasil disimpan. Saat pengguna masuk dengan Google, perannya aktif otomatis.');
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
    });
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
    });
    setEditingSubjectsUid(null);
    setFeedback(`Mata pelajaran diampu untuk ${user.displayName} diperbarui.`);
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSubjectSelection = (subj: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((x) => x !== subj) : [...prev, subj]
    );
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
            <div>
              <label className="block text-xs font-medium text-[#4A5550] mb-2">
                Tautkan Siswa Terkait (opsional)
              </label>
              <div className="flex flex-wrap gap-2">
                {students.map((stu) => {
                  const checked = selectedStudentIds.includes(stu.id);
                  return (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => toggleStudentSelection(stu.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        checked
                          ? 'bg-[#064E3B] text-[#FAF8F2] border-[#064E3B]'
                          : 'bg-[#F5F3EC] text-[#4A5550] border-[#D4CFC2] hover:bg-[#EAE6DB]'
                      }`}
                    >
                      {stu.fullName} ({stu.className})
                    </button>
                  );
                })}
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
        <div className="px-5 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#064E3B]" />
          <h2 className="text-base font-semibold text-[#111C18]">Pengguna Terdaftar ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAE6DB] bg-[#F5F3EC]/70 text-xs font-medium text-[#5C6660]">
                <th className="py-3 px-4">Nama</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Mapel Diampu</th>
                <th className="py-3 px-4">Peran Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE2] text-sm">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-[#F5F3EC]/70">
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
              ))}
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
