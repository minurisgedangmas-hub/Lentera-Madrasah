import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarCheck, CheckCircle2, Megaphone, User } from 'lucide-react';
import {
  AnnouncementRecord,
  AttendanceRecord,
  StudentRecord,
} from '../types/school';

export function StudentParentPortalView({
  mode,
  students,
  attendance,
  announcements,
}: {
  mode: 'siswa' | 'orangtua';
  students: StudentRecord[];
  attendance: AttendanceRecord[];
  announcements: AnnouncementRecord[];
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    if (students.length > 0 && !students.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const activeStudent = students.find((s) => s.id === selectedStudentId) || null;

  const studentAttendance = useMemo(
    () => attendance.filter((a) => a.studentId === activeStudent?.id),
    [attendance, activeStudent]
  );

  const stats = useMemo(() => {
    const hadirCount = studentAttendance.filter((a) => a.status === 'Hadir').length;
    const attendanceRate =
      studentAttendance.length > 0
        ? Math.round((hadirCount / studentAttendance.length) * 100)
        : 100;
    const nonHadirCount = studentAttendance.filter((a) => a.status !== 'Hadir').length;
    return { attendanceRate, hadirCount, nonHadirCount };
  }, [studentAttendance]);

  const relevantAnnouncements = useMemo(
    () =>
      announcements.filter((a) =>
        mode === 'orangtua'
          ? a.targetAudience === 'Semua' || a.targetAudience === 'Orang Tua'
          : a.targetAudience === 'Semua' || a.targetAudience === 'Siswa'
      ),
    [announcements, mode]
  );

  if (students.length === 0) {
    return (
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center mx-auto mb-3.5">
          <User className="w-5 h-5" />
        </div>
        <h2 className="font-display text-lg font-semibold text-[#111C18]">
          {mode === 'orangtua'
            ? 'Belum Ada Data Anak yang Terhubung'
            : 'Data Siswa Belum Terhubung ke Akun Anda'}
        </h2>
        <p className="text-sm text-[#4A5550] max-w-md mx-auto mt-2">
          Hubungi Admin Madrasah atau Wali Kelas MI untuk menautkan akun Google Anda dengan data NISN siswa
          di menu Data Siswa MI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Header Banner + Child/Student Selector */}
      <div className="bg-[#062C21] bg-madrasah-lattice-dark border border-[#144D3C] rounded-xl p-6 text-[#FAF8F2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#F3D88B]">
            {mode === 'orangtua' ? 'Portal Orang Tua Murid MI' : 'Portal Akademik Siswa MI'}
          </p>
          <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-1">
            {activeStudent?.fullName}
          </h1>
          <p className="text-sm text-[#C6DDD4] mt-1">
            Kelas {activeStudent?.className} · NISN{' '}
            <span className="font-mono tabular-nums text-[#FAF8F2]">{activeStudent?.nisn}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {students.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-[#C6DDD4] mb-1.5">
                {mode === 'orangtua' ? 'Pilih Anak' : 'Pilih Profil Siswa'}
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-[#22624E] bg-[#0B3A2C] text-sm text-[#FAF8F2] focus:outline-none focus:ring-2 focus:ring-[#D4A74A]"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.className})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3-Column Academic KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-[#5C6660]">Tingkat Kehadiran</p>
          <p className="font-mono text-2xl font-bold text-[#064E3B] tabular-nums mt-1.5">
            {stats.attendanceRate}%
          </p>
          <p className="text-xs text-[#6B746E] mt-1">
            {stats.hadirCount} dari {studentAttendance.length} pertemuan
          </p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-[#5C6660]">Izin / Sakit / Alpha</p>
          <p className="font-mono text-2xl font-bold text-[#111C18] tabular-nums mt-1.5">
            {stats.nonHadirCount}
          </p>
          <p className="text-xs text-[#6B746E] mt-1">Catatan ketidakhadiran</p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-[#5C6660]">Pengumuman Terkait</p>
          <p className="font-mono text-2xl font-bold text-[#111C18] tabular-nums mt-1.5">
            {relevantAnnouncements.length}
          </p>
          <p className="text-xs text-[#6B746E] mt-1">Informasi aktif madrasah</p>
        </div>
      </div>

      {/* Announcements & Attendance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#064E3B]" />
            <h2 className="text-base font-semibold text-[#111C18]">
              Pengumuman Terkait {mode === 'orangtua' ? 'Orang Tua' : 'Siswa'}
            </h2>
          </div>
          <div className="p-6">
            {relevantAnnouncements.length === 0 ? (
              <p className="text-sm text-[#5C6660] py-6 text-center">Belum ada pengumuman terbaru.</p>
            ) : (
              <div className="divide-y divide-[#EFECE2]">
                {relevantAnnouncements.slice(0, 5).map((ann) => (
                  <div key={ann.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="text-xs text-[#5C6660] mb-1">
                      <span className="font-semibold text-[#064E3B]">{ann.category}</span>
                      {ann.eventDate && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="font-mono tabular-nums">{ann.eventDate}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#111C18]">{ann.title}</p>
                    <p className="text-xs text-[#4A5550] mt-1 line-clamp-2">{ann.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#064E3B]" />
            <h2 className="text-base font-semibold text-[#111C18]">Riwayat Kehadiran Siswa</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAE6DB] bg-[#F5F3EC]/70 text-xs font-medium text-[#5C6660]">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Status Kehadiran</th>
                  <th className="py-3 px-4">Dicatat Oleh</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE2] text-sm">
                {studentAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#5C6660]">
                      Belum ada catatan absensi untuk siswa ini.
                    </td>
                  </tr>
                ) : (
                  studentAttendance.map((a) => (
                    <tr key={a.id} className="hover:bg-[#F5F3EC]/70">
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-[#4A5550]">
                        {a.date}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            a.status === 'Hadir'
                              ? 'text-[#064E3B]'
                              : a.status === 'Alpha'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {a.status === 'Hadir' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                          <span>{a.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#4A5550]">{a.teacherName}</td>
                      <td className="py-3 px-4 text-[#4A5550]">{a.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
