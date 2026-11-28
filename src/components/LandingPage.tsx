import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  CalendarCheck,
  Compass,
  ExternalLink,
  Image as ImageIcon,
  Landmark,
  LogIn,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  Phone,
  Trophy,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useMadrasahIdentity,
  usePublicAnnouncements,
  usePublicAttendanceReportLinks,
} from '../hooks/useSchoolData';
import {
  normalizeWhatsAppUrl,
  resolveAttendancePreviewUrl,
  resolveMadrasahLogoCandidates,
} from '../lib/validation';
import { AnnouncementsView } from './AnnouncementsView';
import { MadrasahLogo } from './MadrasahEmblem';
import { PWAInstallButton } from './PWAInstallButton';
import { AttendanceClassRombelPicker } from './TeacherPortalViews';

type PublicModalType =
  | 'profil'
  | 'pengumuman'
  | 'agenda'
  | 'galeri'
  | 'spmb'
  | 'kontak'
  | 'absensi'
  | null;

const DEFAULT_HERO_PHOTO =
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80';

const DEFAULT_GALLERY_PHOTOS = [
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=800&q=80',
];

function SquareGalleryItem({ rawUrl, alt, index = 0 }: { rawUrl: string; alt: string; index?: number }) {
  const isFolder = /drive\.google\.com\/drive\/folders\//i.test(rawUrl);
  const imageCandidates = useMemo(() => {
    if (isFolder) return [];
    return resolveMadrasahLogoCandidates(rawUrl);
  }, [rawUrl, isFolder]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [useFallbackPhoto, setUseFallbackPhoto] = useState(isFolder);

  useEffect(() => {
    setCandidateIdx(0);
    setUseFallbackPhoto(isFolder);
  }, [rawUrl, isFolder]);

  const fallbackPhoto = DEFAULT_GALLERY_PHOTOS[index % DEFAULT_GALLERY_PHOTOS.length];
  const activeSrc =
    useFallbackPhoto || candidateIdx >= imageCandidates.length
      ? fallbackPhoto
      : imageCandidates[candidateIdx];

  return (
    <div className="aspect-square w-full rounded-xl overflow-hidden border border-[#DDD9CE] bg-slate-100 shadow-xs">
      <img
        src={activeSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => {
          if (!useFallbackPhoto && candidateIdx + 1 < imageCandidates.length) {
            setCandidateIdx((prev) => prev + 1);
          } else {
            setUseFallbackPhoto(true);
          }
        }}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function LandingPage() {
  const { signInWithGoogle, authError, clearAuthError } = useAuth();
  const { madrasahIdentity } = useMadrasahIdentity();
  const { announcements, announcementsLoading } = usePublicAnnouncements();
  const { attendanceReportLinks, attendanceLinksLoading } = usePublicAttendanceReportLinks();

  const [signingIn, setSigningIn] = useState(false);
  const [activeModal, setActiveModal] = useState<PublicModalType>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  // Drive-aware hero photo resolution with fallback
  const heroCandidates = useMemo(
    () => resolveMadrasahLogoCandidates(madrasahIdentity?.heroPhotoUrl),
    [madrasahIdentity?.heroPhotoUrl]
  );
  const [heroCandidateIdx, setHeroCandidateIdx] = useState(0);

  useEffect(() => {
    setHeroCandidateIdx(0);
  }, [madrasahIdentity?.heroPhotoUrl]);

  const activeHeroSrc = heroCandidates[heroCandidateIdx] || DEFAULT_HERO_PHOTO;

  const handleLogin = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  const handleSelectMenu = (target: 'beranda' | Exclude<PublicModalType, null>) => {
    setMobileMenuOpen(false);
    setSocialNotice(null);
    if (target === 'beranda') {
      setActiveModal(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setActiveModal(target);
  };

  const madrasahName = madrasahIdentity?.namaMadrasah || 'MI Nurul Islam Gedangmas';
  const yayasanName = madrasahIdentity?.namaYayasan || "Lembaga Pendidikan Ma'arif NU";
  const alamat =
    madrasahIdentity?.alamat || 'Jl. Raya Gedangmas Tengah, RT.013/ RW.004 Desa Gedangmas';
  const kontakPhone = madrasahIdentity?.kontakPhone || '0857 1234 5678';
  const kontakEmail = madrasahIdentity?.kontakEmail || 'mi.nurulislam@gmail.com';
  const headmaster = madrasahIdentity?.namaKepalaMadrasah || 'H. Ahmad Fauzi, S.Pd.I., M.Pd.';
  const heroBadge = madrasahIdentity?.heroBadge?.trim() || 'Selamat Datang di Portal Madrasah';
  const heroTitle = madrasahIdentity?.heroTitle?.trim() || 'Pusat Informasi dan Layanan';
  const heroSlogan =
    madrasahIdentity?.heroSlogan?.trim() || 'Berilmu, Berakhlak Mulia, dan Berprestasi';
  const heroDescription =
    madrasahIdentity?.heroDescription?.trim() ||
    "Membangun generasi berilmu, berakhlak mulia, dan berprestasi melalui pendidikan berkualitas berlandaskan Islam ahlussunnah wal jama'ah.";
  const heroPhotoCaption =
    madrasahIdentity?.heroPhotoCaption?.trim() || 'Madrasah Ibtidaiyah Unggulan';
  const telHref = `tel:${kontakPhone.replace(/[^0-9+]/g, '')}`;

  const youtubeUrl = madrasahIdentity?.youtubeUrl?.trim() || '';
  const instagramUrl = madrasahIdentity?.instagramUrl?.trim() || '';
  const whatsappHref =
    madrasahIdentity?.whatsappUrl?.trim() || normalizeWhatsAppUrl(kontakPhone);

  const scheduledAnnouncements = useMemo(
    () => announcements.filter((a) => Boolean(a.eventDate)),
    [announcements]
  );

  const galleryUrls = useMemo(() => {
    const raw = madrasahIdentity?.galeriDriveUrl || '';
    const parts = raw
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (parts.length > 0) return parts;
    return DEFAULT_GALLERY_PHOTOS;
  }, [madrasahIdentity?.galeriDriveUrl]);

  return (
    <div className="min-h-screen bg-[#F1F0EA] text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#FAF9F5]/95 backdrop-blur-md border-b border-[#DDD9CE] shadow-xs">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => handleSelectMenu('beranda')}
            className="inline-flex items-center gap-3 font-display text-base sm:text-lg font-bold tracking-tight text-[#062C21] min-w-0 text-left cursor-pointer"
          >
            <MadrasahLogo
              logoUrl={madrasahIdentity?.logoUrl}
              alt={madrasahName}
              className="w-10 h-10 shrink-0"
            />
            <div className="min-w-0">
              <span className="block truncate leading-tight text-slate-900">
                {madrasahName}
              </span>
              <span className="block text-[11px] font-medium text-emerald-800 truncate">
                {yayasanName}
              </span>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-5 text-sm font-semibold text-slate-700">
            <button
              type="button"
              onClick={() => handleSelectMenu('beranda')}
              className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeModal === null ? 'text-emerald-800' : 'hover:text-emerald-800'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>Beranda</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('profil')}
              className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeModal === 'profil' ? 'text-emerald-800' : 'hover:text-emerald-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Profil</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('pengumuman')}
              className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeModal === 'pengumuman' ? 'text-emerald-800' : 'hover:text-emerald-800'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Informasi</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('agenda')}
              className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeModal === 'agenda' ? 'text-emerald-800' : 'hover:text-emerald-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Agenda</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('galeri')}
              className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeModal === 'galeri' ? 'text-emerald-800' : 'hover:text-emerald-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Galeri</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('spmb')}
              className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeModal === 'spmb' ? 'text-emerald-800' : 'hover:text-emerald-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>SPMB</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('kontak')}
              className={`transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeModal === 'kontak' ? 'text-emerald-800' : 'hover:text-emerald-800'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Kontak</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={handleLogin}
              disabled={signingIn}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs sm:text-sm font-semibold hover:bg-[#04392B] transition-colors whitespace-nowrap shadow-sm cursor-pointer disabled:opacity-60"
            >
              <LogIn className="w-4 h-4 text-[#F3D88B]" />
              <span>{signingIn ? 'Menghubungkan...' : 'Masuk Pengelola'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2.5 rounded-lg border border-[#D4CFC2] bg-white text-slate-700 hover:bg-[#EFECE2] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#EAE6DB] bg-[#FAF9F5] px-4 py-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
            <button
              type="button"
              onClick={() => handleSelectMenu('beranda')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-[#E5E1D6] hover:border-emerald-700 text-left cursor-pointer"
            >
              <Landmark className="w-4 h-4 text-[#064E3B]" />
              <span>Beranda</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('profil')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-[#E5E1D6] hover:border-emerald-700 text-left cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-[#064E3B]" />
              <span>Profil Madrasah</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('pengumuman')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-[#E5E1D6] hover:border-emerald-700 text-left cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-[#064E3B]" />
              <span>Pengumuman</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('agenda')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-[#E5E1D6] hover:border-emerald-700 text-left cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#064E3B]" />
              <span>Agenda Madrasah</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('galeri')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-[#E5E1D6] hover:border-emerald-700 text-left cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#064E3B]" />
              <span>Galeri &amp; Foto</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('spmb')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-[#E5E1D6] hover:border-emerald-700 text-left cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#064E3B]" />
              <span>SPMB</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMenu('kontak')}
              className="col-span-2 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-[#E5E1D6] hover:border-emerald-700 text-left cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#064E3B]" />
              <span>Kontak Madrasah</span>
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] relative overflow-hidden">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4A74A]/20 border border-[#D4A74A]/40 text-[#F3D88B] text-xs font-semibold tracking-wide">
                  <span>{heroBadge}</span>
                </div>
                <h1
                  className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FAF8F2] leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  {heroTitle} <br className="hidden sm:inline" />
                  <span className="text-[#F3D88B]">{madrasahName}</span>
                </h1>

                {/* Prominent Slogan Spotlight */}
                <div className="border-l-4 border-[#D4A74A] bg-[#04231A]/75 px-5 sm:px-6 py-4 rounded-r-2xl shadow-md">
                  <p
                    className="font-slogan text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wide bg-gradient-to-r from-[#FFF5D6] via-[#F3D88B] to-[#D4A74A] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(212,167,74,0.45)] leading-tight py-1"
                    style={{ textWrap: 'balance' }}
                  >
                    “{heroSlogan}”
                  </p>
                </div>

                <p className="text-sm sm:text-base text-[#D3E3DC] leading-relaxed max-w-xl whitespace-pre-line">
                  {heroDescription}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectMenu('pengumuman')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D4A74A] text-[#062C21] text-sm font-bold hover:bg-[#DFB763] transition-colors shadow-md whitespace-nowrap cursor-pointer"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>Lihat Pengumuman</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectMenu('absensi')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#064E3B] border border-[#22624E] text-[#FAF8F2] text-sm font-bold hover:bg-[#04392B] transition-colors shadow-md whitespace-nowrap cursor-pointer"
                  >
                    <CalendarCheck className="w-4 h-4 text-[#F3D88B]" />
                    <span>Lihat Laporan Absensi</span>
                  </button>
                </div>

                {authError && (
                  <div className="p-3.5 rounded-lg bg-red-950/80 border border-red-400/40 text-sm text-red-100 flex items-center justify-between gap-3">
                    <span>{authError}</span>
                    <button
                      type="button"
                      onClick={clearAuthError}
                      className="text-red-300 hover:text-white font-bold text-xs px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-[#144D3C] bg-[#04231A] aspect-[4/3]">
                  <img
                    src={activeHeroSrc}
                    alt={madrasahName}
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (heroCandidateIdx < heroCandidates.length) {
                        setHeroCandidateIdx((prev) => prev + 1);
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#062C21]/80 via-transparent to-transparent flex items-end p-6">
                    <div className="text-white">
                      <p className="text-xs font-semibold text-[#F3D88B]">{heroPhotoCaption}</p>
                      <p className="font-display text-lg font-bold mt-0.5">{madrasahName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Interactive Modal: Profil Madrasah (Identitas Madrasah) */}
      {activeModal === 'profil' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-[#FAF9F5] border border-[#DDD9CE] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] px-6 py-5 flex items-start justify-between gap-4 border-b border-[#144D3C]">
              <div className="flex items-start gap-4 min-w-0">
                <MadrasahLogo
                  logoUrl={madrasahIdentity?.logoUrl}
                  alt={madrasahName}
                  className="w-14 h-14 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#F3D88B]">{yayasanName}</p>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-0.5">
                    {madrasahName}
                  </h2>
                  {madrasahIdentity && (
                    <p className="text-xs text-[#C6DDD4] mt-1 font-mono tabular-nums">
                      NSM {madrasahIdentity.nsm} · NPSN {madrasahIdentity.npsn} · Berdiri {madrasahIdentity.tahunBerdiri}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-lg text-[#C6DDD4] hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-[#E5E1D6] rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500">Nama Yayasan Penyelenggara</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#064E3B] shrink-0" />
                    <span>{yayasanName}</span>
                  </p>
                </div>
                <div className="bg-white border border-[#E5E1D6] rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500">Kepala Madrasah</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#064E3B] shrink-0" />
                    <span>{headmaster}</span>
                  </p>
                </div>
                <div className="bg-white border border-[#E5E1D6] rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500">NSM &amp; NPSN</p>
                  <p className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-1">
                    {madrasahIdentity
                      ? `NSM ${madrasahIdentity.nsm} · NPSN ${madrasahIdentity.npsn}`
                      : 'Belum dilengkapi admin'}
                  </p>
                </div>
                <div className="bg-white border border-[#E5E1D6] rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500">Akreditasi &amp; Tahun Berdiri</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#064E3B] shrink-0" />
                    <span>
                      {madrasahIdentity
                        ? `${
                            madrasahIdentity.statusAkreditasi === 'Belum Terakreditasi'
                              ? 'Belum Terakreditasi'
                              : `Akreditasi ${madrasahIdentity.statusAkreditasi}`
                          } · Tahun ${madrasahIdentity.tahunBerdiri}`
                        : 'Akreditasi A'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#E5E1D6] rounded-xl p-4">
                <p className="text-xs font-medium text-slate-500">Alamat Resmi Madrasah</p>
                <p className="text-sm text-slate-800 mt-1 flex items-start gap-2 leading-relaxed">
                  <MapPin className="w-4 h-4 text-[#064E3B] shrink-0 mt-0.5" />
                  <span>{alamat}</span>
                </p>
              </div>

              {(madrasahIdentity?.programContent || madrasahIdentity?.prestasiContent) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {madrasahIdentity?.programContent && (
                    <div className="bg-white border border-[#E5E1D6] rounded-xl p-4">
                      <h3 className="text-xs font-bold text-[#064E3B] flex items-center gap-1.5 mb-2">
                        <BookOpen className="w-4 h-4" />
                        <span>Program Pendidikan</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {madrasahIdentity.programContent}
                      </p>
                    </div>
                  )}
                  {madrasahIdentity?.prestasiContent && (
                    <div className="bg-white border border-[#E5E1D6] rounded-xl p-4">
                      <h3 className="text-xs font-bold text-[#064E3B] flex items-center gap-1.5 mb-2">
                        <Trophy className="w-4 h-4" />
                        <span>Prestasi Madrasah</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {madrasahIdentity.prestasiContent}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modal: Pengumuman Kegiatan */}
      {activeModal === 'pengumuman' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-[#FAF9F5] border border-[#DDD9CE] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DB] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Pengumuman Kegiatan Madrasah
                  </h3>
                  <p className="text-xs text-slate-600">
                    Informasi resmi kegiatan, ujian, dan pemberitahuan untuk wali murid.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AnnouncementsView
              announcements={announcements}
              canManage={false}
              madrasahName={madrasahName}
              jadwalPelajaranUrl={madrasahIdentity?.jadwalPelajaranUrl}
              isPublicBoard={true}
              loading={announcementsLoading}
            />
          </div>
        </div>
      )}

      {/* Interactive Modal: Agenda Madrasah */}
      {activeModal === 'agenda' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-[#FAF9F5] border border-[#DDD9CE] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DB] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">Agenda Madrasah</h3>
                  <p className="text-xs text-slate-600">
                    Jadwal kegiatan dan agenda penting {madrasahName}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {madrasahIdentity?.agendaContent ? (
                <div className="bg-white border border-[#E5E1D6] rounded-xl p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#064E3B] mb-2.5">
                    Agenda Resmi Madrasah
                  </p>
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                    {madrasahIdentity.agendaContent}
                  </p>
                </div>
              ) : null}

              {scheduledAnnouncements.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Agenda Kegiatan Terjadwal
                  </p>
                  {scheduledAnnouncements.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-[#E5E1D6] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-[11px] font-semibold text-[#064E3B] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                        <h4 className="font-display text-sm font-bold text-slate-900 mt-1.5">
                          {item.title}
                        </h4>
                        {item.location && (
                          <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#064E3B]" />
                            <span>{item.location}</span>
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-800 bg-[#F5F3EC] border border-[#DDD9CE] px-3 py-1.5 rounded-lg shrink-0 tabular-nums">
                        {item.eventDate}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!madrasahIdentity?.agendaContent && scheduledAnnouncements.length === 0 && (
                <div className="bg-white border border-[#E5E1D6] rounded-xl p-8 text-center">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
                  <p className="text-sm font-semibold text-slate-900">Agenda Madrasah Belum Diisi</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Administrator dapat mengisi daftar agenda melalui menu Identitas Madrasah atau menerbitkan pengumuman bertanggal kegiatan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modal: Galeri & Dokumentasi */}
      {activeModal === 'galeri' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-[#FAF9F5] border border-[#DDD9CE] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DB] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Galeri &amp; Dokumentasi Kegiatan
                  </h3>
                  <p className="text-xs text-slate-600">
                    Dokumentasi foto kegiatan resmi {madrasahName}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {galleryUrls.length > 0 ? (
              <div
                className={
                  galleryUrls.length === 1
                    ? 'max-w-lg mx-auto'
                    : 'grid grid-cols-1 sm:grid-cols-2 gap-4'
                }
              >
                {galleryUrls.map((url, idx) => (
                  <SquareGalleryItem
                    key={`${url}_${idx}`}
                    rawUrl={url}
                    alt={`Galeri ${madrasahName} ${idx + 1}`}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#E5E1D6] rounded-xl p-8 text-center">
                <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
                <p className="text-sm font-semibold text-slate-900">
                  Belum Ada Foto Galeri
                </p>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Foto dokumentasi kegiatan madrasah akan tampil di sini setelah ditambahkan oleh administrator.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Modal: SPMB */}
      {activeModal === 'spmb' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-[#FAF9F5] border border-[#DDD9CE] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DB] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    SPMB {madrasahName}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Informasi Seleksi Penerimaan Murid Baru Tahun Ajaran 2026/2027.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-[#E5E1D6] rounded-xl p-5">
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {madrasahIdentity?.spmbContent ||
                    `Pendaftaran Peserta Didik Baru ${madrasahName} terbuka untuk calon siswa kelas I serta siswa pindahan. Silakan hubungi panitia SPMB madrasah melalui WhatsApp atau datang langsung ke kantor madrasah pada jam kerja.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {madrasahIdentity?.spmbUrl && (
                  <a
                    href={madrasahIdentity.spmbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs sm:text-sm font-semibold hover:bg-[#04392B] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-[#F3D88B]" />
                    <span>Buka Formulir Pendaftaran SPMB</span>
                  </a>
                )}
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-700/30 bg-emerald-50 text-[#064E3B] text-xs sm:text-sm font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Konsultasi SPMB via WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modal: Kontak Madrasah */}
      {activeModal === 'kontak' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-[#FAF9F5] border border-[#DDD9CE] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DB] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">Kontak Madrasah</h3>
                  <p className="text-xs text-slate-600">{madrasahName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-[#E5E1D6] rounded-xl p-4 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#064E3B] shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Alamat Madrasah</p>
                    <p className="text-slate-900 mt-0.5">{alamat}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#064E3B] shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Telepon / WhatsApp</p>
                    <a href={telHref} className="text-emerald-800 font-semibold hover:underline">
                      {kontakPhone}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#064E3B] shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Email Resmi</p>
                    <a
                      href={`mailto:${kontakEmail}`}
                      className="text-emerald-800 font-semibold hover:underline break-all"
                    >
                      {kontakEmail}
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {madrasahIdentity?.googleMapsUrl && (
                  <a
                    href={madrasahIdentity.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs font-semibold hover:bg-[#04392B] transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#F3D88B]" />
                    <span>Buka di Google Maps</span>
                  </a>
                )}
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-700/30 bg-emerald-50 text-[#064E3B] text-xs font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Chat WhatsApp</span>
                  </a>
                )}
                {youtubeUrl && (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#D4CFC2] bg-white text-slate-800 text-xs font-semibold hover:bg-[#F5F3EC] transition-colors"
                  >
                    <span>YouTube</span>
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#D4CFC2] bg-white text-slate-800 text-xs font-semibold hover:bg-[#F5F3EC] transition-colors"
                  >
                    <span>Instagram</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Report Modal Picker */}
      {activeModal === 'absensi' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-[#FAF9F5] border border-[#DDD9CE] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DB] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Lihat Laporan Absensi Per Kelas &amp; Rombel
                  </h3>
                  <p className="text-xs text-slate-600">
                    Pilih tingkat kelas dan rombel untuk melihat preview absensi resmi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AttendanceClassRombelPicker
              links={attendanceReportLinks}
              loading={attendanceLinksLoading}
              requireClassClickFirst={true}
              onClose={() => setActiveModal(null)}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer id="kontak" className="border-t border-[#1D5744] bg-[#062C21] text-[#C8DDD4] py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MadrasahLogo
                logoUrl={madrasahIdentity?.logoUrl}
                alt={madrasahName}
                className="w-10 h-10 shrink-0"
              />
              <div>
                <span className="block font-display text-base font-bold text-white leading-tight">
                  {madrasahName}
                </span>
                <span className="block text-xs text-[#F3D88B]">{yayasanName}</span>
              </div>
            </div>
            <p className="text-xs text-[#A8C6BB] leading-relaxed">
              Berilmu, Berakhlak Mulia, dan Berprestasi untuk Masyarakat dan Bangsa.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-white mb-4">Tautan Cepat</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleSelectMenu('beranda')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  · Beranda
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSelectMenu('profil')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  · Profil Madrasah
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSelectMenu('pengumuman')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  · Pengumuman Kegiatan
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSelectMenu('agenda')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  · Agenda Madrasah
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSelectMenu('galeri')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  · Galeri &amp; Dokumentasi
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSelectMenu('spmb')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  · SPMB
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleSelectMenu('kontak')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  · Kontak Madrasah
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-white mb-4">Hubungi Kami</h3>
            <ul className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#F3D88B] shrink-0 mt-0.5" />
                <span>{alamat}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#F3D88B] shrink-0" />
                <a href={telHref} className="hover:text-white transition-colors">
                  {kontakPhone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#F3D88B] shrink-0" />
                <a href={`mailto:${kontakEmail}`} className="hover:text-white transition-colors break-all">
                  {kontakEmail}
                </a>
              </li>
            </ul>
            {madrasahIdentity?.googleMapsUrl && (
              <div className="mt-3">
                <a
                  href={madrasahIdentity.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#F3D88B] hover:underline"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Buka di Google Maps</span>
                </a>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-white mb-4">Ikuti Kami</h3>
            <p className="text-xs text-[#A8C6BB] mb-3">
              Dapatkan informasi terbaru seputar kegiatan madrasah melalui media sosial resmi kami.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {youtubeUrl ? (
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#0A3A2B] border border-[#22624E] text-[#F3D88B] font-medium hover:bg-[#11503C] transition-colors"
                >
                  YouTube
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setSocialNotice('Tautan YouTube belum diatur oleh admin madrasah.')}
                  className="px-3 py-1.5 rounded-lg bg-[#0A3A2B]/60 border border-[#22624E]/60 text-[#A8C6BB] font-medium hover:text-[#F3D88B] transition-colors cursor-pointer"
                >
                  YouTube
                </button>
              )}

              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#0A3A2B] border border-[#22624E] text-[#F3D88B] font-medium hover:bg-[#11503C] transition-colors"
                >
                  Instagram
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setSocialNotice('Tautan Instagram belum diatur oleh admin madrasah.')}
                  className="px-3 py-1.5 rounded-lg bg-[#0A3A2B]/60 border border-[#22624E]/60 text-[#A8C6BB] font-medium hover:text-[#F3D88B] transition-colors cursor-pointer"
                >
                  Instagram
                </button>
              )}

              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#0A3A2B] border border-[#22624E] text-[#F3D88B] font-medium hover:bg-[#11503C] transition-colors"
                >
                  WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setSocialNotice('Nomor WhatsApp belum diatur oleh admin madrasah.')}
                  className="px-3 py-1.5 rounded-lg bg-[#0A3A2B]/60 border border-[#22624E]/60 text-[#A8C6BB] font-medium hover:text-[#F3D88B] transition-colors cursor-pointer"
                >
                  WhatsApp
                </button>
              )}
            </div>
            {socialNotice && (
              <p className="text-[11px] text-[#F3D88B] mt-2">{socialNotice}</p>
            )}
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 mt-10 pt-6 border-t border-[#144D3C] text-center text-xs text-[#8BB7A7]">
          © {new Date().getFullYear()} {madrasahName}. Semua Hak Dilindungi.
        </div>
      </footer>
    </div>
  );
}
