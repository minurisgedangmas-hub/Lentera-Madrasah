import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMadrasahIdentity, usePublicAnnouncements } from '../hooks/useSchoolData';
import { AnnouncementsView } from './AnnouncementsView';
import { MadrasahLogo } from './MadrasahEmblem';

export function PendingApprovalView() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { madrasahIdentity } = useMadrasahIdentity();
  const { announcements, announcementsLoading } = usePublicAnnouncements();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await refreshProfile();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F0EA] bg-madrasah-lattice">
      <header className="sticky top-0 z-20 bg-[#FAF9F5] border-b border-[#DDD9CE] px-6 py-3.5">
        <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <MadrasahLogo
              logoUrl={madrasahIdentity?.logoUrl}
              alt={madrasahIdentity?.namaMadrasah || 'Logo Madrasah'}
              className="w-8 h-8 shrink-0"
            />
            <div className="min-w-0">
              <p className="font-display text-base font-bold text-[#062C21] truncate">
                {madrasahIdentity?.namaMadrasah || 'Lentera Madrasah'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {profile?.displayName} · {profile?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs font-medium hover:bg-[#04392B] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Memeriksa...' : 'Cek Status Akun'}</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-[#111C18] text-xs font-medium hover:bg-[#F5F3EC] transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#062C21] text-[#F3D88B] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-slate-900">
                Papan Pengumuman Kegiatan Terbuka untuk Wali Murid
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Anda tetap dapat membaca seluruh pengumuman kegiatan madrasah di bawah ini. Menu akademik lainnya (nilai, absensi, dan data siswa) akan dibuka pada pembaruan berikutnya setelah verifikasi admin.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-slate-500 shrink-0">
            ID: {profile?.uid}
          </span>
        </div>

        <AnnouncementsView
          announcements={announcements}
          canManage={false}
          madrasahName={madrasahIdentity?.namaMadrasah}
          jadwalPelajaranUrl={madrasahIdentity?.jadwalPelajaranUrl}
          isPublicBoard
          loading={announcementsLoading}
        />
      </main>
    </div>
  );
}
