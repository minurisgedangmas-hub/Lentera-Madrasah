import { FormEvent, useEffect, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  extractGoogleDriveFileId,
  isValidHttpsLogoUrl,
  isValidHttpsUrl,
  LIMITS,
  normalizeWhatsAppUrl,
  resolveJadwalDownloadUrl,
  YEAR_PATTERN,
} from '../lib/validation';
import { saveMadrasahIdentity } from '../services/schoolService';
import { AccreditationStatus, MadrasahIdentity } from '../types/school';
import { MadrasahLogo } from './MadrasahEmblem';

interface IdentitasMadrasahViewProps {
  identity: MadrasahIdentity | null;
  canEdit: boolean;
}

const ACCREDITATION_OPTIONS: AccreditationStatus[] = ['A', 'B', 'C', 'Belum Terakreditasi'];

export function IdentitasMadrasahView({ identity, canEdit }: IdentitasMadrasahViewProps) {
  const { firebaseUser, profile } = useAuth();
  const [editing, setEditing] = useState(false);

  const [namaYayasan, setNamaYayasan] = useState('');
  const [namaMadrasah, setNamaMadrasah] = useState('');
  const [nsm, setNsm] = useState('');
  const [npsn, setNpsn] = useState('');
  const [statusAkreditasi, setStatusAkreditasi] = useState<AccreditationStatus>('A');
  const [alamat, setAlamat] = useState('');
  const [tahunBerdiri, setTahunBerdiri] = useState('');
  const [namaKepalaMadrasah, setNamaKepalaMadrasah] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [heroPhotoUrl, setHeroPhotoUrl] = useState('');
  const [heroBadge, setHeroBadge] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSlogan, setHeroSlogan] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [heroPhotoCaption, setHeroPhotoCaption] = useState('');
  const [jadwalPelajaranUrl, setJadwalPelajaranUrl] = useState('');
  const [absensiReportUrl, setAbsensiReportUrl] = useState('');
  const [galeriDriveUrl, setGaleriDriveUrl] = useState('');
  const [agendaContent, setAgendaContent] = useState('');
  const [programContent, setProgramContent] = useState('');
  const [prestasiContent, setPrestasiContent] = useState('');
  const [spmbContent, setSpmbContent] = useState('');
  const [spmbUrl, setSpmbUrl] = useState('');
  const [kontakPhone, setKontakPhone] = useState('');
  const [kontakEmail, setKontakEmail] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [logoPreviewStatus, setLogoPreviewStatus] = useState<'empty' | 'loaded' | 'error'>('empty');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const syncFormFromIdentity = (data: MadrasahIdentity) => {
    setNamaYayasan(data.namaYayasan);
    setNamaMadrasah(data.namaMadrasah);
    setNsm(data.nsm);
    setNpsn(data.npsn);
    setStatusAkreditasi(data.statusAkreditasi);
    setAlamat(data.alamat);
    setTahunBerdiri(data.tahunBerdiri);
    setNamaKepalaMadrasah(data.namaKepalaMadrasah);
    setLogoUrl(data.logoUrl || '');
    setHeroPhotoUrl(data.heroPhotoUrl || '');
    setHeroBadge(data.heroBadge || '');
    setHeroTitle(data.heroTitle || '');
    setHeroSlogan(data.heroSlogan || '');
    setHeroDescription(data.heroDescription || '');
    setHeroPhotoCaption(data.heroPhotoCaption || '');
    setJadwalPelajaranUrl(data.jadwalPelajaranUrl || '');
    setAbsensiReportUrl(data.absensiReportUrl || '');
    setGaleriDriveUrl(data.galeriDriveUrl || '');
    setAgendaContent(data.agendaContent || '');
    setProgramContent(data.programContent || '');
    setPrestasiContent(data.prestasiContent || '');
    setSpmbContent(data.spmbContent || '');
    setSpmbUrl(data.spmbUrl || '');
    setKontakPhone(data.kontakPhone || '');
    setKontakEmail(data.kontakEmail || '');
    setGoogleMapsUrl(data.googleMapsUrl || '');
    setYoutubeUrl(data.youtubeUrl || '');
    setInstagramUrl(data.instagramUrl || '');
    setWhatsappUrl(data.whatsappUrl || '');
  };

  useEffect(() => {
    if (identity) {
      syncFormFromIdentity(identity);
    }
  }, [identity]);

  const handleOpenEdit = () => {
    setFeedback(null);
    if (identity) {
      syncFormFromIdentity(identity);
    }
    setEditing(true);
  };

  const handleFillSample = () => {
    setNamaYayasan("Lembaga Pendidikan Ma'arif NU");
    setNamaMadrasah('MI Nurul Islam Gedangmas');
    setNsm('111235080012');
    setNpsn('60715412');
    setStatusAkreditasi('A');
    setTahunBerdiri('1998');
    setNamaKepalaMadrasah('H. Ahmad Fauzi, S.Pd.I., M.Pd.');
    setAlamat('Jl. Raya Gedangmas Tengah, RT.013/ RW.004 Desa Gedangmas');
    setKontakPhone('0857 1234 5678');
    setKontakEmail('mi.nurulislam@gmail.com');
    setFeedback(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !canEdit) return;

    const cleanYayasan = namaYayasan.trim();
    const cleanMadrasah = namaMadrasah.trim();
    const cleanNsm = nsm.trim();
    const cleanNpsn = npsn.trim();
    const cleanAlamat = alamat.trim();
    const cleanTahun = tahunBerdiri.trim();
    const cleanKepala = namaKepalaMadrasah.trim();
    const cleanLogoUrl = logoUrl.trim();
    const cleanHeroPhotoUrl = heroPhotoUrl.trim();
    const cleanHeroBadge = heroBadge.trim();
    const cleanHeroTitle = heroTitle.trim();
    const cleanHeroSlogan = heroSlogan.trim();
    const cleanHeroDescription = heroDescription.trim();
    const cleanHeroPhotoCaption = heroPhotoCaption.trim();
    const cleanScheduleUrl = jadwalPelajaranUrl.trim();
    const cleanAbsensiReportUrl = absensiReportUrl.trim();
    const cleanGaleriUrl = galeriDriveUrl.trim();
    const cleanAgenda = agendaContent.trim();
    const cleanProgram = programContent.trim();
    const cleanPrestasi = prestasiContent.trim();
    const cleanSpmb = spmbContent.trim();
    const cleanSpmbUrl = spmbUrl.trim();
    const cleanPhone = kontakPhone.trim();
    const cleanEmail = kontakEmail.trim();
    const cleanMaps = googleMapsUrl.trim();
    const cleanYoutube = youtubeUrl.trim();
    const cleanInstagram = instagramUrl.trim();
    const cleanWhatsapp = normalizeWhatsAppUrl(whatsappUrl);

    if (cleanYayasan.length < 2) {
      setFeedback({ type: 'error', text: 'Nama Yayasan minimal terdiri dari 2 karakter.' });
      return;
    }
    if (cleanMadrasah.length < 2) {
      setFeedback({ type: 'error', text: 'Nama Madrasah minimal terdiri dari 2 karakter.' });
      return;
    }
    if (cleanNsm.length < 4) {
      setFeedback({ type: 'error', text: 'NSM minimal terdiri dari 4 karakter.' });
      return;
    }
    if (cleanNpsn.length < 4) {
      setFeedback({ type: 'error', text: 'NPSN minimal terdiri dari 4 karakter.' });
      return;
    }
    if (!YEAR_PATTERN.test(cleanTahun)) {
      setFeedback({ type: 'error', text: 'Tahun Berdiri harus berupa 4 digit angka (contoh: 1998).' });
      return;
    }
    if (cleanKepala.length < 2) {
      setFeedback({ type: 'error', text: 'Nama Kepala Madrasah minimal terdiri dari 2 karakter.' });
      return;
    }
    if (cleanAlamat.length < 5) {
      setFeedback({ type: 'error', text: 'Alamat lengkap madrasah minimal terdiri dari 5 karakter.' });
      return;
    }
    if (!isValidHttpsLogoUrl(cleanLogoUrl)) {
      setFeedback({
        type: 'error',
        text: 'Link logo harus diawali https:// dengan panjang maksimal 500 karakter.',
      });
      return;
    }
    if (!isValidHttpsUrl(cleanHeroPhotoUrl)) {
      setFeedback({
        type: 'error',
        text: 'Link Foto Beranda (Google Drive) harus diawali https:// dengan panjang maksimal 500 karakter.',
      });
      return;
    }
    if (!isValidHttpsUrl(cleanScheduleUrl)) {
      setFeedback({
        type: 'error',
        text: 'Link Google Drive Jadwal Ujian harus diawali https:// dengan panjang maksimal 500 karakter.',
      });
      return;
    }
    if (!isValidHttpsUrl(cleanAbsensiReportUrl)) {
      setFeedback({
        type: 'error',
        text: 'Link Laporan Absensi harus diawali https:// dengan panjang maksimal 500 karakter.',
      });
      return;
    }
    const cleanGaleriParts = cleanGaleriUrl
      ? cleanGaleriUrl.split(',').map((u) => u.trim()).filter(Boolean)
      : [];
    if (
      cleanGaleriUrl.length > LIMITS.DRIVE_URL_MAX ||
      cleanGaleriParts.some((u) => !isValidHttpsUrl(u))
    ) {
      setFeedback({
        type: 'error',
        text: 'Link Galeri & Dokumentasi harus diawali https:// (pisahkan dengan koma untuk beberapa foto, total maks. 500 karakter).',
      });
      return;
    }
    if (!isValidHttpsUrl(cleanSpmbUrl)) {
      setFeedback({
        type: 'error',
        text: 'Link Portal/Formulir SPMB harus diawali https:// dengan panjang maksimal 500 karakter.',
      });
      return;
    }
    if (!isValidHttpsUrl(cleanMaps)) {
      setFeedback({
        type: 'error',
        text: 'Link Google Maps harus diawali https:// dengan panjang maksimal 500 karakter.',
      });
      return;
    }
    if (!isValidHttpsUrl(cleanYoutube)) {
      setFeedback({
        type: 'error',
        text: 'Link YouTube harus diawali https:// dengan panjang maksimal 500 karakter.',
      });
      return;
    }
    if (!isValidHttpsUrl(cleanInstagram)) {
      setFeedback({
        type: 'error',
        text: 'Link Instagram harus diawali https:// dengan panjang maksimal 500 karakter.',
      });
      return;
    }
    if (!isValidHttpsUrl(cleanWhatsapp)) {
      setFeedback({
        type: 'error',
        text: 'Link WhatsApp harus berupa link https://wa.me/... atau nomor telepon yang valid (min. 8 digit).',
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await saveMadrasahIdentity({
        namaYayasan: cleanYayasan,
        namaMadrasah: cleanMadrasah,
        nsm: cleanNsm,
        npsn: cleanNpsn,
        statusAkreditasi,
        alamat: cleanAlamat,
        tahunBerdiri: cleanTahun,
        namaKepalaMadrasah: cleanKepala,
        logoUrl: cleanLogoUrl,
        heroPhotoUrl: cleanHeroPhotoUrl,
        heroBadge: cleanHeroBadge,
        heroTitle: cleanHeroTitle,
        heroSlogan: cleanHeroSlogan,
        heroDescription: cleanHeroDescription,
        heroPhotoCaption: cleanHeroPhotoCaption,
        jadwalPelajaranUrl: cleanScheduleUrl,
        absensiReportUrl: cleanAbsensiReportUrl,
        galeriDriveUrl: cleanGaleriUrl,
        agendaContent: cleanAgenda,
        programContent: cleanProgram,
        prestasiContent: cleanPrestasi,
        spmbContent: cleanSpmb,
        spmbUrl: cleanSpmbUrl,
        kontakPhone: cleanPhone,
        kontakEmail: cleanEmail,
        googleMapsUrl: cleanMaps,
        youtubeUrl: cleanYoutube,
        instagramUrl: cleanInstagram,
        whatsappUrl: cleanWhatsapp,
        adminUid: firebaseUser.uid,
        adminName: profile.displayName,
      });
      setEditing(false);
      setFeedback({
        type: 'success',
        text: 'Identitas Madrasah serta pengaturan menu halaman depan, kontak, dan media sosial berhasil disimpan.',
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menyimpan identitas madrasah. Periksa kembali isian atau hak akses admin Anda.',
      });
    } finally {
      setSaving(false);
    }
  };

  const formattedUpdatedAt = identity?.updatedAt?.toDate
    ? identity.updatedAt.toDate().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Identitas Madrasah Ibtidaiyah (MI)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Profil resmi satuan pendidikan MI yang tampil terintegrasi bagi guru, siswa, orang tua, dan halaman depan portal.
          </p>
        </div>

        {canEdit && !editing && (
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>{identity ? 'Perbarui Identitas' : 'Isi Identitas Madrasah'}</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Admin Edit Form */}
      {canEdit && editing && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#FCFBF8] border border-[#D8D3C6] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Formulir Identitas Resmi Madrasah
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Pastikan NSM, NPSN, dan status akreditasi sesuai dokumen resmi Kementerian Agama.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFillSample}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-800/30 bg-emerald-50 text-emerald-900 text-xs font-medium hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Isi Contoh MI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-slate-700 text-xs font-medium hover:bg-[#EAE7DC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Yayasan
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.YAYASAN_MAX}
                value={namaYayasan}
                onChange={(e) => setNamaYayasan(e.target.value)}
                placeholder="Contoh: Yayasan Pendidikan Islam Al-Hidayah"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Madrasah
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.MADRASAH_NAME_MAX}
                value={namaMadrasah}
                onChange={(e) => setNamaMadrasah(e.target.value)}
                placeholder="Contoh: MI Al-Hidayah Nusantara"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                NSM (Nomor Statistik Madrasah)
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.NSM_MAX}
                value={nsm}
                onChange={(e) => setNsm(e.target.value)}
                placeholder="Contoh: 111232750012"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                NPSN (Nomor Pokok Sekolah Nasional)
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.NPSN_MAX}
                value={npsn}
                onChange={(e) => setNpsn(e.target.value)}
                placeholder="Contoh: 60708912"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status Akreditasi
              </label>
              <select
                value={statusAkreditasi}
                onChange={(e) => setStatusAkreditasi(e.target.value as AccreditationStatus)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                {ACCREDITATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'Belum Terakreditasi' ? opt : `Terakreditasi ${opt}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tahun Berdiri
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={4}
                value={tahunBerdiri}
                onChange={(e) => setTahunBerdiri(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="Contoh: 1998"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Kepala Madrasah
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.HEADMASTER_MAX}
                value={namaKepalaMadrasah}
                onChange={(e) => setNamaKepalaMadrasah(e.target.value)}
                placeholder="Contoh: H. Ahmad Fauzi, S.Pd.I., M.Pd."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Lengkap Madrasah
              </label>
              <textarea
                rows={3}
                required
                maxLength={LIMITS.ADDRESS_MAX}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Jalan, nomor, kelurahan/desa, kecamatan, kabupaten/kota, provinsi, dan kode pos"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 resize-y"
              />
            </div>

            <div className="md:col-span-2 pt-2 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="shrink-0">
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Pratinjau Logo</p>
                  <MadrasahLogo
                    logoUrl={logoUrl}
                    alt={namaMadrasah || 'Logo Madrasah'}
                    className="w-16 h-16"
                    onStatusChange={setLogoPreviewStatus}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Link Logo Madrasah (Google Drive)</span>
                    </label>
                    {logoUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Hapus Link
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    maxLength={LIMITS.LOGO_URL_MAX}
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/ID_FILE_LOGO/view?usp=sharing"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Tempel link file gambar logo dari Google Drive (format PNG/JPG/WebP). Pastikan akses berbagi file diatur ke{' '}
                    <span className="font-medium text-slate-700">Siapa saja yang memiliki link (Pelihat)</span>.
                  </p>
                  {logoUrl.trim() && extractGoogleDriveFileId(logoUrl) && logoPreviewStatus === 'loaded' && (
                    <p className="text-xs font-medium text-emerald-700 mt-1">
                      Link Google Drive valid dan logo berhasil dimuat.
                    </p>
                  )}
                  {logoUrl.trim() && logoPreviewStatus === 'error' && (
                    <p className="text-xs font-medium text-amber-700 mt-1">
                      Gambar belum bisa dimuat. Periksa kembali izin akses publik Google Drive atau pastikan file berupa gambar.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Foto & Teks Banner / Slogan Halaman Depan (Beranda) */}
            <div className="md:col-span-2 pt-3 border-t border-slate-200 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Pengaturan Banner &amp; Slogan Halaman Depan (Beranda)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ubah seluruh kata-kata pada banner utama, slogan besar, dan foto sampul halaman depan. Kosongkan jika ingin memakai teks standar.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Teks Lencana Atas Banner
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={heroBadge}
                    onChange={(e) => setHeroBadge(e.target.value)}
                    placeholder="Selamat Datang di Portal Madrasah"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Judul Pembuka Banner
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="Pusat Informasi dan Layanan"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Slogan Utama Madrasah (Tampil Besar &amp; Menonjol di Banner)
                </label>
                <input
                  type="text"
                  maxLength={240}
                  value={heroSlogan}
                  onChange={(e) => setHeroSlogan(e.target.value)}
                  placeholder="Contoh: Berilmu, Berakhlak Mulia, dan Berprestasi"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-emerald-700/40 bg-emerald-50/30 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kata-Kata / Deskripsi Banner
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={heroDescription}
                  onChange={(e) => setHeroDescription(e.target.value)}
                  placeholder="Membangun generasi berilmu, berakhlak mulia, dan berprestasi melalui pendidikan berkualitas berlandaskan Islam ahlussunnah wal jama'ah."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Link Foto Halaman Depan (Google Drive)</span>
                    </label>
                    {heroPhotoUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => setHeroPhotoUrl('')}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Hapus Link
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    maxLength={LIMITS.DRIVE_URL_MAX}
                    value={heroPhotoUrl}
                    onChange={(e) => setHeroPhotoUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/ID_FOTO_GEDUNG/view?usp=sharing"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Keterangan Di Atas Foto Banner
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={heroPhotoCaption}
                    onChange={(e) => setHeroPhotoCaption(e.target.value)}
                    placeholder="Madrasah Ibtidaiyah Unggulan"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Link Jadwal Ujian (Google Drive)</span>
                </label>
                {jadwalPelajaranUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => setJadwalPelajaranUrl('')}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Hapus Link
                  </button>
                )}
              </div>
              <input
                type="url"
                maxLength={LIMITS.DRIVE_URL_MAX}
                value={jadwalPelajaranUrl}
                onChange={(e) => setJadwalPelajaranUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/... atau https://drive.google.com/file/d/.../view"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Tempel tautan folder atau file Google Drive berisi Jadwal Ujian Madrasah agar dapat diunduh wali murid ketika membuka menu Pengumuman / Ujian.
              </p>
            </div>

            <div className="md:col-span-2 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Link Galeri &amp; Dokumentasi (Folder / Album Google Drive)</span>
                </label>
                {galeriDriveUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => setGaleriDriveUrl('')}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Hapus Link
                  </button>
                )}
              </div>
              <input
                type="text"
                maxLength={LIMITS.DRIVE_URL_MAX}
                value={galeriDriveUrl}
                onChange={(e) => setGaleriDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view (atau pisahkan dengan koma untuk beberapa foto)"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Tempel tautan foto kegiatan (format rasio 1:1) untuk menu <strong>Galeri &amp; Dokumentasi</strong>. Untuk beberapa foto sekaligus, pisahkan tautan dengan tanda koma (,).
              </p>
            </div>

            {/* Konten Menu Publik: Agenda, Profil Tambahan, SPMB */}
            <div className="md:col-span-2 pt-3 border-t border-slate-200 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Pengaturan Konten Menu Halaman Depan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atur isi menu Agenda Madrasah, Profil (Program &amp; Prestasi), dan SPMB yang tampil ketika pengunjung mengklik menu.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Agenda Madrasah (Menu Agenda)
                  </label>
                  <textarea
                    rows={4}
                    maxLength={LIMITS.CONTENT_TEXT_MAX}
                    value={agendaContent}
                    onChange={(e) => setAgendaContent(e.target.value)}
                    placeholder={"Contoh:\n• 25 Nov 2026: Rapat Evaluasi Semester (08.00 WIB - Ruang Guru)\n• 01 Des 2026: Ujian Akhir Semester (UAS) Ganjil Kelas I-VI\n• 12 Des 2026: Pembagian Rapor & Konsultasi Wali Murid"}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Informasi SPMB (Menu SPMB)
                  </label>
                  <textarea
                    rows={4}
                    maxLength={LIMITS.CONTENT_TEXT_MAX}
                    value={spmbContent}
                    onChange={(e) => setSpmbContent(e.target.value)}
                    placeholder="Contoh: Pendaftaran Peserta Didik Baru (SPMB) MI Nurul Islam Gedangmas Tahun Ajaran 2026/2027 dibuka mulai Januari - Juni. Persyaratan: Fotokopi Akta Kelahiran, Kartu Keluarga, dan pas foto..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Link Portal / Formulir Pendaftaran SPMB (Opsional)
                </label>
                <input
                  type="url"
                  maxLength={LIMITS.DRIVE_URL_MAX}
                  value={spmbUrl}
                  onChange={(e) => setSpmbUrl(e.target.value)}
                  placeholder="https://forms.gle/... atau tautan pendaftaran online madrasah"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Program Pendidikan (Ditampilkan di Profil Madrasah)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={LIMITS.CONTENT_TEXT_MAX}
                    value={programContent}
                    onChange={(e) => setProgramContent(e.target.value)}
                    placeholder="Kurikulum Merdeka & Kemenag, Tahfidz Al-Qur'an, Pembiasaan Akhlak, Pramuka..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Prestasi Madrasah (Ditampilkan di Profil Madrasah)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={LIMITS.CONTENT_TEXT_MAX}
                    value={prestasiContent}
                    onChange={(e) => setPrestasiContent(e.target.value)}
                    placeholder="Juara KSM Matematika, Juara MTQ Kecamatan, Prestasi Pramuka..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Hubungi Kami & Kontak Madrasah */}
            <div className="md:col-span-2 pt-3 border-t border-slate-200 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Kontak Madrasah &amp; Hubungi Kami (Footer &amp; Menu Kontak)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Alamat di atas serta nomor telepon, email, dan Google Maps di bawah otomatis tampil pada menu Kontak dan footer Hubungi Kami.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nomor Telepon / HP</label>
                  <input
                    type="text"
                    maxLength={LIMITS.PHONE_MAX}
                    value={kontakPhone}
                    onChange={(e) => setKontakPhone(e.target.value)}
                    placeholder="0857 1234 5678"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Resmi Madrasah</label>
                  <input
                    type="email"
                    maxLength={LIMITS.EMAIL_MAX}
                    value={kontakEmail}
                    onChange={(e) => setKontakEmail(e.target.value)}
                    placeholder="mi.nurulislam@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link Google Maps / Lokasi</label>
                <input
                  type="url"
                  maxLength={LIMITS.DRIVE_URL_MAX}
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... atau https://www.google.com/maps/..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                />
              </div>
            </div>

            {/* Ikuti Kami (Media Sosial Resmi) */}
            <div className="md:col-span-2 pt-3 border-t border-slate-200 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Ikuti Kami (Media Sosial Resmi di Footer)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isi tautan YouTube, Instagram, dan WhatsApp resmi madrasah agar tombol di bagian Ikuti Kami dapat diklik langsung.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link YouTube</label>
                  <input
                    type="url"
                    maxLength={LIMITS.DRIVE_URL_MAX}
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/@minurulislam"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link Instagram</label>
                  <input
                    type="url"
                    maxLength={LIMITS.DRIVE_URL_MAX}
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/minurulislam"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link / Nomor WhatsApp</label>
                  <input
                    type="text"
                    maxLength={LIMITS.DRIVE_URL_MAX}
                    value={whatsappUrl}
                    onChange={(e) => setWhatsappUrl(e.target.value)}
                    placeholder="085712345678 atau https://wa.me/62857..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#EAE6DB] bg-[#F5F3EC] flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Identitas Madrasah'}
            </button>
          </div>
        </form>
      )}

      {/* Empty State when no identity configured yet */}
      {!identity && !editing && (
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center mb-3">
            <Landmark className="w-6 h-6" />
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Identitas Madrasah Belum Diatur
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-1.5">
            {canEdit
              ? 'Lengkapi Nama Yayasan, Nama Madrasah, NSM, NPSN, Status Akreditasi, Tahun Berdiri, Kepala Madrasah, dan Alamat agar profil satuan pendidikan tampil resmi di seluruh portal.'
              : 'Administrator Madrasah belum melengkapi profil resmi madrasah. Data identitas akan otomatis tampil di sini setelah disimpan.'}
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={handleOpenEdit}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Lengkapi Identitas Sekarang</span>
            </button>
          )}
        </div>
      )}

      {/* Official Institutional Profile Sheet */}
      {identity && (
        <div className="bg-[#FCFBF8] border border-[#D8D3C6] rounded-xl overflow-hidden">
          <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] px-6 py-6 border-b border-[#144D3C] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <MadrasahLogo
                logoUrl={identity.logoUrl}
                alt={`Logo ${identity.namaMadrasah}`}
                className="w-14 h-14 shrink-0 mt-0.5"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F3D88B] tracking-wide">
                  {identity.namaYayasan}
                </p>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#FAF8F2] mt-0.5">
                  {identity.namaMadrasah}
                </h2>
                <p className="text-xs text-[#C6DDD4] mt-1 font-mono tabular-nums">
                  NSM {identity.nsm} · NPSN {identity.npsn} · Berdiri Tahun {identity.tahunBerdiri}
                </p>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <p className="text-[11px] font-medium text-[#A8C6BB]">Status Akreditasi</p>
              <p className="font-display text-lg font-bold mt-0.5 text-[#F3D88B]">
                {identity.statusAkreditasi === 'Belum Terakreditasi'
                  ? 'Belum Terakreditasi'
                  : `Peringkat ${identity.statusAkreditasi}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#EAE6DB]">
            <div className="divide-y divide-[#EFECE2]">
              <div className="px-6 py-4">
                <p className="text-xs font-medium text-slate-500">Nama Yayasan Penyelenggara</p>
                <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#064E3B] shrink-0" />
                  <span>{identity.namaYayasan}</span>
                </p>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs font-medium text-slate-500">Nama Satuan Pendidikan / Madrasah</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{identity.namaMadrasah}</p>
              </div>
              <div className="px-6 py-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">NSM</p>
                  <p className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-1">
                    {identity.nsm}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">NPSN</p>
                  <p className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-1">
                    {identity.npsn}
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#EFECE2]">
              <div className="px-6 py-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Status Akreditasi</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {identity.statusAkreditasi === 'Belum Terakreditasi'
                      ? 'Belum Terakreditasi'
                      : `Akreditasi ${identity.statusAkreditasi}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Tahun Berdiri</p>
                  <p className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-1">
                    {identity.tahunBerdiri}
                  </p>
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs font-medium text-slate-500">Nama Kepala Madrasah</p>
                <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#064E3B] shrink-0" />
                  <span>{identity.namaKepalaMadrasah}</span>
                </p>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs font-medium text-slate-500">Alamat Lengkap</p>
                <p className="text-sm text-slate-800 mt-1 flex items-start gap-2 leading-relaxed">
                  <MapPin className="w-4 h-4 text-[#064E3B] shrink-0 mt-0.5" />
                  <span>{identity.alamat}</span>
                </p>
              </div>
            </div>
          </div>

          {identity.jadwalPelajaranUrl && (
            <div className="px-6 py-4 bg-[#FAF9F5] border-t border-[#EAE6DB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">Jadwal Ujian Madrasah</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  Tautan Dokumen Resmi Google Drive
                </p>
              </div>
              <a
                href={resolveJadwalDownloadUrl(identity.jadwalPelajaranUrl)}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs font-semibold hover:bg-[#04392B] transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-[#F3D88B]" />
                <span>Download Jadwal Ujian</span>
              </a>
            </div>
          )}

          {identity.absensiReportUrl && (
            <div className="px-6 py-4 bg-[#FAF9F5] border-t border-[#EAE6DB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">Laporan Absensi Eksternal</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  Tautan Preview Aplikasi Absensi Madrasah
                </p>
              </div>
              <a
                href={identity.absensiReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs font-semibold hover:bg-[#04392B] transition-colors whitespace-nowrap shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#F3D88B]" />
                <span>Buka Laporan Absensi</span>
              </a>
            </div>
          )}

          {/* Ringkasan Pengaturan Menu Halaman Depan, Kontak & Media Sosial */}
          <div className="border-t border-[#EAE6DB] bg-[#FAF9F5] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Pengaturan Menu Publik, Kontak &amp; Media Sosial
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seluruh data di bawah langsung terhubung ke menu Beranda, Profil, Agenda, Galeri, SPMB, Kontak, dan Footer.
                </p>
              </div>
              {canEdit && !editing && (
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-semibold text-slate-700 hover:bg-[#EFECE2] transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#064E3B]" />
                  <span>Kelola Menu &amp; Kontak</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E5E1D6] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#064E3B]">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Hubungi Kami</span>
                </div>
                <p className="text-xs text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{identity.kontakPhone || 'Belum diisi'}</span>
                </p>
                <p className="text-xs text-slate-700 flex items-center gap-1.5 truncate">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{identity.kontakEmail || 'Belum diisi'}</span>
                </p>
                {identity.googleMapsUrl && (
                  <a
                    href={identity.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Buka Google Maps</span>
                  </a>
                )}
              </div>

              <div className="bg-white border border-[#E5E1D6] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#064E3B]">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Ikuti Kami (Media Sosial)</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className={`px-2 py-1 rounded border ${identity.youtubeUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    YouTube {identity.youtubeUrl ? '✓' : '· Kosong'}
                  </span>
                  <span className={`px-2 py-1 rounded border ${identity.instagramUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    Instagram {identity.instagramUrl ? '✓' : '· Kosong'}
                  </span>
                  <span className={`px-2 py-1 rounded border ${identity.whatsappUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    WhatsApp {identity.whatsappUrl ? '✓' : '· Kosong'}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-[#E5E1D6] rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#064E3B]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Banner, Galeri, Agenda &amp; SPMB</span>
                </div>
                <p className="text-xs text-slate-600 truncate">
                  Slogan: <span className="font-semibold text-slate-800">{identity.heroSlogan || 'Standar'}</span>
                </p>
                <p className="text-xs text-slate-600">
                  Foto Beranda: <span className="font-semibold text-slate-800">{identity.heroPhotoUrl ? 'Tautan Drive Aktif' : 'Default'}</span> · Galeri:{' '}
                  <span className="font-semibold text-slate-800">{identity.galeriDriveUrl ? 'Terhubung' : 'Belum diisi'}</span>
                </p>
                <p className="text-xs text-slate-600">
                  Agenda: <span className="font-semibold text-slate-800">{identity.agendaContent ? 'Tersedia' : 'Belum diisi'}</span> · SPMB:{' '}
                  <span className="font-semibold text-slate-800">{identity.spmbContent || identity.spmbUrl ? 'Tersedia' : 'Belum diisi'}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-3 bg-[#F5F3EC] border-t border-[#EAE6DB] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Diperbarui oleh {identity.updatedByName}</span>
            {formattedUpdatedAt && (
              <span className="font-mono tabular-nums">{formattedUpdatedAt}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
