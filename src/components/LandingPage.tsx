import { useState } from 'react';
import {
  CalendarCheck,
  Clock,
  Landmark,
  LogIn,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useMadrasahIdentity,
  usePublicAnnouncements,
  usePublicAttendanceReportLinks,
} from '../hooks/useSchoolData';
import { AnnouncementsView } from './AnnouncementsView';
import { MadrasahLogo } from './MadrasahEmblem';
import { PWAInstallButton } from './PWAInstallButton';
import { AttendanceClassRombelPicker } from './TeacherPortalViews';

export function LandingPage() {
  const { signInWithGoogle, authError } = useAuth();
  const { madrasahIdentity } = useMadrasahIdentity();
  const { announcements, announcementsLoading } = usePublicAnnouncements();
  const { attendanceReportLinks, attendanceLinksLoading } = usePublicAttendanceReportLinks();
  const [signingIn, setSigningIn] = useState(false);
  const [showAbsensiMenu, setShowAbsensiMenu] = useState(false);

  const handleLogin = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F0EA] text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 bg-[#FAF9F5]/95 backdrop-blur-sm border-b border-[#DDD9CE]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-6">
          <a
            href="#pengumuman"
            className="inline-flex items-center gap-2.5 font-display text-base sm:text-lg font-bold tracking-tight text-[#062C21] min-w-0"
          >
            <MadrasahLogo
              logoUrl={madrasahIdentity?.logoUrl}
              alt={madrasahIdentity?.namaMadrasah || 'Logo Madrasah'}
              className="w-8 h-8 shrink-0"
            />
            <span className="truncate">
              {madrasahIdentity?.namaMadrasah || 'Lentera Madrasah MI'}
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-700">
            <a
              href="#pengumuman"
              className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0"
            >
              Pengumuman Kegiatan
            </a>
            {madrasahIdentity && (
              <a
                href="#profil"
                className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0"
              >
                Profil Madrasah
              </a>
            )}
            <a
              href="#tahap-berikutnya"
              className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0"
            >
              Menu Tahap Berikutnya
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={handleLogin}
              disabled={signingIn}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs sm:text-sm font-medium hover:bg-[#04392B] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{signingIn ? 'Menghubungkan...' : 'Masuk Pengelola'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Executive Madrasah Announcement Hero */}
        <section className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] border-b border-[#0E4A38]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4 min-w-0 max-w-3xl">
                <MadrasahLogo
                  logoUrl={madrasahIdentity?.logoUrl}
                  alt={madrasahIdentity?.namaMadrasah || 'Logo Madrasah'}
                  className="w-14 h-14 shrink-0 hidden sm:flex"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-[#F3D88B]">
                    {madrasahIdentity
                      ? `${madrasahIdentity.namaMadrasah} · ${madrasahIdentity.namaYayasan}`
                      : 'Papan Informasi Terbuka · Madrasah Ibtidaiyah (MI)'}
                  </p>
                  <h1
                    className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#FAF8F2] leading-tight mt-1"
                    style={{ textWrap: 'balance' }}
                  >
                    Pengumuman Kegiatan Madrasah untuk Wali Murid &amp; Masyarakat
                  </h1>
                  <p className="text-sm text-[#D3E3DC] leading-relaxed mt-2">
                    Seluruh pengumuman agenda kegiatan, undangan rapat orang tua, jadwal ujian, dan informasi libur madrasah dapat diakses langsung oleh semua orang tanpa perlu login.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <a
                  href="#pengumuman"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4A74A] text-[#062C21] text-sm font-semibold hover:bg-[#DFB763] transition-colors whitespace-nowrap"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Lihat Pengumuman</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowAbsensiMenu((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    showAbsensiMenu
                      ? 'bg-[#FAF8F2] text-[#062C21] border-[#FAF8F2]'
                      : 'border-[#2C6B57] bg-[#0B3A2C] text-[#FAF8F2] hover:bg-[#104A39]'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4 text-[#D4A74A]" />
                  <span>Lihat Laporan Absensi</span>
                </button>
              </div>
            </div>

            {authError && (
              <div className="mt-5 p-3.5 rounded-lg bg-red-950/80 border border-red-400/40 text-sm text-red-100">
                {authError}
              </div>
            )}
          </div>
        </section>

        {/* Class & Rombel Attendance Preview Picker (Appears after clicking Lihat Laporan Absensi) */}
        {showAbsensiMenu && (
          <section
            id="laporan-absensi"
            className="border-b border-[#DDD9CE] bg-[#FAF9F5] py-6 sm:py-8"
          >
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
              <AttendanceClassRombelPicker
                links={attendanceReportLinks}
                loading={attendanceLinksLoading}
                requireClassClickFirst
                onClose={() => setShowAbsensiMenu(false)}
              />
            </div>
          </section>
        )}

        {/* Primary Focus: Public & Wali Murid Announcements Board */}
        <section id="pengumuman" className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <AnnouncementsView
            announcements={announcements}
            canManage={false}
            madrasahName={madrasahIdentity?.namaMadrasah}
            jadwalPelajaranUrl={madrasahIdentity?.jadwalPelajaranUrl}
            isPublicBoard
            loading={announcementsLoading}
          />
        </section>

        {/* Official Madrasah Identity Strip (when configured) */}
        {madrasahIdentity && (
          <section id="profil" className="border-t border-[#DDD9CE] bg-[#FAF9F5] py-10">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
              <div className="bg-[#FCFBF8] border border-[#D8D3C6] rounded-xl overflow-hidden">
                <div className="bg-[#0B3A2C] text-[#FAF8F2] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Landmark className="w-5 h-5 text-[#F3D88B] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#F3D88B] truncate">
                        {madrasahIdentity.namaYayasan}
                      </p>
                      <h2 className="font-display text-lg font-bold text-[#FAF8F2] truncate">
                        {madrasahIdentity.namaMadrasah}
                      </h2>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-[#F3D88B] shrink-0">
                    {madrasahIdentity.statusAkreditasi === 'Belum Terakreditasi'
                      ? 'Belum Terakreditasi'
                      : `Terakreditasi ${madrasahIdentity.statusAkreditasi}`}
                  </p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500">NSM</p>
                      <p className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                        {madrasahIdentity.nsm}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">NPSN</p>
                      <p className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                        {madrasahIdentity.npsn}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Tahun Berdiri</p>
                      <p className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                        {madrasahIdentity.tahunBerdiri}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Kepala Madrasah</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
                        {madrasahIdentity.namaKepalaMadrasah}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#EAE6DB]">
                    <p className="text-xs text-slate-600">
                      Alamat Madrasah: {madrasahIdentity.alamat}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Roadmap Note for Paused Menus */}
        <section id="tahap-berikutnya" className="border-t border-[#DDD9CE] bg-[#F1F0EA] py-8">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#064E3B] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Pembaruan Bertahap Layanan Portal Madrasah
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Saat ini layanan difokuskan pada papan Pengumuman Kegiatan Madrasah untuk wali murid. Menu akademik lainnya (Identitas Madrasah, Data Guru, Data Siswa, Input Nilai, dan Absensi) sedang ditangguhkan untuk pembaruan berikutnya.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1D5744] bg-[#062C21] text-[#C8DDD4] py-6">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="font-medium text-[#FAF8F2]">
            {madrasahIdentity
              ? `${madrasahIdentity.namaMadrasah} · NSM ${madrasahIdentity.nsm} · NPSN ${madrasahIdentity.npsn}`
              : 'Lentera Madrasah · Informasi Kegiatan Madrasah Ibtidaiyah (MI)'}
          </p>
          <p>Terbuka untuk Wali Murid, Guru, dan Masyarakat</p>
        </div>
      </footer>
    </div>
  );
}
