import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FolderOpen,
  MapPin,
  Megaphone,
  Pin,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isValidHttpsUrl, LIMITS, resolveJadwalDownloadUrl, todayIsoDate } from '../lib/validation';
import {
  deleteAnnouncementRecord,
  publishAnnouncementWithNotification,
  updateAnnouncementRecord,
  updateMadrasahScheduleDriveUrl,
} from '../services/schoolService';
import {
  AnnouncementCategory,
  AnnouncementRecord,
  TargetAudience,
} from '../types/school';

interface AnnouncementsViewProps {
  announcements: AnnouncementRecord[];
  canManage: boolean;
  madrasahName?: string;
  jadwalPelajaranUrl?: string;
  isAdmin?: boolean;
  hasMadrasahIdentity?: boolean;
  isPublicBoard?: boolean;
  loading?: boolean;
}

const AUDIENCE_LABEL: Record<TargetAudience, string> = {
  Semua: 'Semua Warga & Wali Murid',
  'Orang Tua': 'Khusus Orang Tua / Wali Murid',
  Siswa: 'Siswa MI',
  Guru: 'Guru & Pegawai',
};

export function AnnouncementsView({
  announcements,
  canManage,
  madrasahName,
  jadwalPelajaranUrl,
  isAdmin = false,
  hasMadrasahIdentity = false,
  isPublicBoard = false,
  loading = false,
}: AnnouncementsViewProps) {
  const { firebaseUser, profile } = useAuth();

  // Form state (create or edit)
  const [formOpen, setFormOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<AnnouncementRecord | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('Ujian');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('Orang Tua');
  const [eventDate, setEventDate] = useState(todayIsoDate());
  const [location, setLocation] = useState('MI Nurul Islam Gedangmas');
  const [driveUrl, setDriveUrl] = useState('');
  const [isPinned, setIsPinned] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Jadwal Pelajaran Drive link inline editor (Admin)
  const [editingScheduleDrive, setEditingScheduleDrive] = useState(false);
  const [scheduleDriveDraft, setScheduleDriveDraft] = useState('');
  const [savingScheduleDrive, setSavingScheduleDrive] = useState(false);
  const [copiedScheduleDrive, setCopiedScheduleDrive] = useState(false);

  // Filters & UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState<'Semua' | AnnouncementCategory>('Semua');
  const [filterAudience, setFilterAudience] = useState<'SemuaFilter' | TargetAudience>('SemuaFilter');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const resetForm = () => {
    setEditingAnn(null);
    setTitle('');
    setContent('');
    setCategory('Ujian');
    setTargetAudience('Orang Tua');
    setEventDate(todayIsoDate());
    setLocation('MI Nurul Islam Gedangmas');
    setDriveUrl('');
    setIsPinned(false);
    setIsPublished(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setFeedback(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (ann: AnnouncementRecord) => {
    setEditingAnn(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setCategory(ann.category);
    setTargetAudience(ann.targetAudience);
    setEventDate(ann.eventDate || todayIsoDate());
    setLocation(ann.location || '');
    setDriveUrl(ann.driveUrl || '');
    setIsPinned(ann.isPinned);
    setIsPublished(ann.isPublished);
    setFeedback(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || title.trim().length < 3 || content.trim().length < 5) {
      setFeedback({
        type: 'error',
        text: 'Judul minimal 3 karakter dan isi pengumuman minimal 5 karakter.',
      });
      return;
    }

    const cleanDriveUrl = driveUrl.trim();
    if (!isValidHttpsUrl(cleanDriveUrl)) {
      setFeedback({
        type: 'error',
        text: 'Link Google Drive harus diawali https:// dengan panjang maksimal 500 karakter.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      if (editingAnn) {
        await updateAnnouncementRecord(editingAnn, {
          title,
          content,
          category,
          targetAudience,
          eventDate,
          location,
          driveUrl: cleanDriveUrl,
          isPinned,
          isPublished,
        });
        setFeedback({
          type: 'success',
          text: `Pengumuman "${title.trim()}" berhasil diperbarui.`,
        });
      } else {
        await publishAnnouncementWithNotification({
          title,
          content,
          category,
          targetAudience,
          eventDate,
          location,
          driveUrl: cleanDriveUrl,
          isPinned,
          isPublished,
          authorUid: firebaseUser.uid,
          authorName: profile.displayName,
        });
        setFeedback({
          type: 'success',
          text: isPublished
            ? 'Pengumuman berhasil diterbitkan dan langsung dapat diakses oleh wali murid serta masyarakat.'
            : 'Pengumuman disimpan sebagai draf (belum tampil untuk publik).',
        });
      }
      resetForm();
      setFormOpen(false);
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menyimpan pengumuman. Periksa kembali isian formulir Anda.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveScheduleDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !isAdmin || !hasMadrasahIdentity) return;

    const cleanUrl = scheduleDriveDraft.trim();
    if (!isValidHttpsUrl(cleanUrl)) {
      setFeedback({
        type: 'error',
        text: 'Link Google Drive Jadwal Pelajaran harus diawali https:// dengan panjang maksimal 500 karakter.',
      });
      return;
    }

    setSavingScheduleDrive(true);
    setFeedback(null);
    try {
      await updateMadrasahScheduleDriveUrl({
        jadwalPelajaranUrl: cleanUrl,
        adminUid: firebaseUser.uid,
        adminName: profile.displayName,
      });
      setEditingScheduleDrive(false);
      setFeedback({
        type: 'success',
        text: cleanUrl
          ? 'Link Google Drive Jadwal Pelajaran berhasil diperbarui dan tampil untuk semua pengguna.'
          : 'Link Google Drive Jadwal Pelajaran telah dihapus.',
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menyimpan link Google Drive Jadwal Pelajaran. Pastikan Identitas Madrasah sudah tersimpan.',
      });
    } finally {
      setSavingScheduleDrive(false);
    }
  };

  const handleCopyScheduleDrive = async () => {
    if (!jadwalPelajaranUrl) return;
    try {
      await navigator.clipboard.writeText(jadwalPelajaranUrl);
      setCopiedScheduleDrive(true);
      window.setTimeout(() => setCopiedScheduleDrive(false), 2500);
    } catch {
      setFeedback({ type: 'error', text: 'Browser menolak penyalinan otomatis ke clipboard.' });
    }
  };

  const handleTogglePin = async (ann: AnnouncementRecord) => {
    try {
      await updateAnnouncementRecord(ann, {
        title: ann.title,
        content: ann.content,
        category: ann.category,
        targetAudience: ann.targetAudience,
        eventDate: ann.eventDate,
        location: ann.location,
        driveUrl: ann.driveUrl || '',
        isPinned: !ann.isPinned,
        isPublished: ann.isPublished,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Gagal mengubah status sematan pengumuman.' });
    }
  };

  const handleTogglePublish = async (ann: AnnouncementRecord) => {
    try {
      await updateAnnouncementRecord(ann, {
        title: ann.title,
        content: ann.content,
        category: ann.category,
        targetAudience: ann.targetAudience,
        eventDate: ann.eventDate,
        location: ann.location,
        driveUrl: ann.driveUrl || '',
        isPinned: ann.isPinned,
        isPublished: !ann.isPublished,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Gagal mengubah status publikasi pengumuman.' });
    }
  };

  const handleDelete = async (ann: AnnouncementRecord) => {
    setDeletingId(ann.id);
    try {
      await deleteAnnouncementRecord(ann);
      setConfirmDeleteId(null);
      setFeedback({
        type: 'success',
        text: `Pengumuman "${ann.title}" telah dihapus.`,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Gagal menghapus pengumuman.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyForWhatsApp = async (ann: AnnouncementRecord) => {
    const schoolPrefix = madrasahName ? `*${madrasahName}*\n` : '*MI NURUL ISLAM GEDANGMAS*\n';
    const lines = [
      `${schoolPrefix}*[${ann.category}] ${ann.title}*`,
      `Tahun Pelajaran 2026/2027`,
      `Ditujukan: ${AUDIENCE_LABEL[ann.targetAudience]}`,
      ann.eventDate ? `Tanggal: ${ann.eventDate}` : null,
      '',
      ann.content,
      ann.driveUrl ? `\n📂 Lampiran Google Drive: ${ann.driveUrl}` : null,
      '',
      `Gedangmas, 21 November 2026`,
      `Kepala Madrasah`,
    ]
      .filter((l) => l !== null)
      .join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setCopiedId(ann.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === ann.id ? null : prev));
      }, 2500);
    } catch {
      setFeedback({ type: 'error', text: 'Browser menolak penyalinan otomatis ke clipboard.' });
    }
  };

  const handleShareWhatsApp = (ann: AnnouncementRecord) => {
    const schoolPrefix = madrasahName ? `*${madrasahName}*\n` : '*MI NURUL ISLAM GEDANGMAS*\n';
    const currentUrl = window.location.href;
    const lines = [
      `${schoolPrefix}*[${ann.category}] ${ann.title}*`,
      `Tahun Pelajaran 2026/2027`,
      `Ditujukan: ${AUDIENCE_LABEL[ann.targetAudience]}`,
      ann.eventDate ? `Tanggal: ${ann.eventDate}` : null,
      '',
      ann.content,
      ann.driveUrl ? `\n📂 Lampiran Google Drive: ${ann.driveUrl}` : null,
      '',
      `🔗 Tautan Resmi & Jadwal Lengkap: ${currentUrl}`,
      '',
      `Gedangmas, 21 November 2026`,
      `Kepala Madrasah`,
    ]
      .filter((l) => l !== null)
      .join('\n');

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(lines)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const stats = useMemo(() => {
    const publishedList = canManage
      ? announcements.filter((a) => a.isPublished)
      : announcements;
    const forParentsOrAll = publishedList.filter(
      (a) => a.targetAudience === 'Orang Tua' || a.targetAudience === 'Semua'
    ).length;
    const pinnedCount = publishedList.filter((a) => a.isPinned).length;
    const upcomingCount = publishedList.filter((a) => Boolean(a.eventDate)).length;
    return {
      total: publishedList.length,
      forParentsOrAll,
      pinnedCount,
      upcomingCount,
    };
  }, [announcements, canManage]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return announcements.filter((a) => {
      if (filterCat !== 'Semua' && a.category !== filterCat) return false;
      if (filterAudience !== 'SemuaFilter') {
        if (filterAudience === 'Orang Tua') {
          if (a.targetAudience !== 'Orang Tua' && a.targetAudience !== 'Semua') return false;
        } else if (a.targetAudience !== filterAudience) {
          return false;
        }
      }
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q) ||
        (a.authorName || '').toLowerCase().includes(q)
      );
    });
  }, [announcements, filterCat, filterAudience, searchQuery]);

  return (
    <div className="space-y-6">

      {!isPublicBoard && (
        <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#F3D88B]">
              Papan Informasi Terbuka · MI Nurul Islam Gedangmas
            </p>
            <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
              Pengumuman &amp; Agenda Kegiatan Madrasah
            </h1>
            <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1 max-w-2xl">
              Informasi resmi ujian sumatif, jadwal kelas, rapat wali murid, dan kegiatan madrasah yang tampil secara real-time untuk orang tua dan masyarakat.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4A74A] text-[#062C21] text-sm font-semibold hover:bg-[#DFB763] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pengumuman Baru</span>
            </button>
          )}
        </div>
      )}

      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Pengumuman Aktif</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.total}
          </p>
          <p className="text-xs text-slate-500 mt-1">Tampil terbuka untuk publik</p>
        </div>
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Untuk Wali Murid</p>
          <p className="font-mono text-2xl font-bold text-[#064E3B] tabular-nums mt-1">
            {stats.forParentsOrAll}
          </p>
          <p className="text-xs text-slate-500 mt-1">Khusus orang tua &amp; umum</p>
        </div>
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Agenda Terjadwal</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.upcomingCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Memiliki tanggal pelaksanaan</p>
        </div>
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Pengumuman Penting</p>
          <p className="font-mono text-2xl font-bold text-amber-700 tabular-nums mt-1">
            {stats.pinnedCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Disematkan di bagian atas</p>
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

      {/* Create / Edit Form for Admin & Guru */}
      {canManage && formOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#064E3B]" />
              <div>
                <h2 className="font-display text-base font-bold text-[#111C18]">
                  {editingAnn ? 'Perbarui Pengumuman Kegiatan' : 'Terbitkan Pengumuman Baru'}
                </h2>
                <p className="text-xs text-[#5C6660]">
                  Pengumuman yang diterbitkan otomatis tampil terbuka di halaman depan untuk seluruh wali murid.
                </p>
              </div>
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

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#4A5550] mb-1.5">
                  Judul Pengumuman Kegiatan <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={LIMITS.ANNOUNCEMENT_TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Undangan Rapat Wali Murid & Pembagian Rapor"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4CFC2] bg-white text-sm text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A5550] mb-1.5">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4CFC2] text-sm bg-white text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
                >
                  {(['Ujian', 'Kegiatan', 'Akademik', 'Libur', 'Umum'] as AnnouncementCategory[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A5550] mb-1.5">
                  Ditujukan Untuk
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4CFC2] text-sm bg-white text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
                >
                  <option value="Orang Tua">Orang Tua / Wali Murid</option>
                  <option value="Semua">Semua Warga &amp; Wali Murid</option>
                  <option value="Siswa">Siswa MI</option>
                  <option value="Guru">Guru &amp; Pegawai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A5550] mb-1.5">
                  Tanggal Pelaksanaan Kegiatan
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4CFC2] bg-white text-sm font-mono tabular-nums text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4A5550] mb-1.5">
                  Lokasi Kegiatan
                </label>
                <input
                  type="text"
                  maxLength={LIMITS.ANNOUNCEMENT_LOCATION_MAX}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="MI Nurul Islam Gedangmas"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4CFC2] bg-white text-sm text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-[#4A5550] mb-1.5">
                  Link Google Drive (Opsional)
                </label>
                <input
                  type="url"
                  maxLength={LIMITS.DRIVE_URL_MAX}
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... atau https://drive.google.com/drive/folders/..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4CFC2] bg-white text-sm text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-[#4A5550] mb-1.5">
                  Rincian Isi Pengumuman <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  minLength={5}
                  maxLength={LIMITS.ANNOUNCEMENT_CONTENT_MAX}
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tuliskan rincian pengumuman atau catatan tambahan..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4CFC2] bg-white text-sm text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#EFECE2]">
              <div className="flex flex-wrap items-center gap-5">
                <label className="inline-flex items-center gap-2 text-sm text-[#4A5550] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-[#D4CFC2] text-[#064E3B] focus:ring-[#064E3B]"
                  />
                  <span>Sematkan di bagian atas</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-[#4A5550] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded border-[#D4CFC2] text-[#064E3B] focus:ring-[#064E3B]"
                  />
                  <span>Terbitkan ke publik &amp; wali murid</span>
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-slate-700 text-sm font-medium hover:bg-[#EAE7DC] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Menyimpan...'
                      : editingAnn
                      ? 'Simpan Perubahan'
                      : isPublished
                      ? 'Terbitkan Pengumuman'
                      : 'Simpan Draf'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Search + Audience & Category Filters */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul kegiatan, lokasi, atau isi pengumuman..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#064E3B]/20 focus:border-[#064E3B]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#064E3B] shrink-0" />
            <select
              value={filterAudience}
              onChange={(e) =>
                setFilterAudience(e.target.value as 'SemuaFilter' | TargetAudience)
              }
              aria-label="Filter sasaran pengumuman"
              className="px-3 py-2 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-800"
            >
              <option value="SemuaFilter">Semua Sasaran Audiens</option>
              <option value="Orang Tua">Khusus Wali Murid / Orang Tua</option>
              <option value="Siswa">Untuk Siswa MI</option>
              <option value="Guru">Untuk Guru</option>
            </select>
          </div>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#E9E6DC] rounded-lg border border-[#D8D3C6]">
          {(['Semua', 'Ujian', 'Kegiatan', 'Akademik', 'Libur', 'Umum'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filterCat === cat
                  ? 'bg-[#064E3B] text-[#FAF8F2]'
                  : 'text-[#4A5550] hover:text-[#111C18]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Download Jadwal Ujian — hanya tampil ketika menu Ujian dipilih */}
      {filterCat === 'Ujian' && (jadwalPelajaranUrl || isAdmin) && (
        <div className="bg-[#FCFBF8] border border-[#D4A74A] rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#062C21] text-[#F3D88B] flex items-center justify-center shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-[#111C18]">
                  Jadwal Ujian Madrasah
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {jadwalPelajaranUrl
                    ? 'Unduh dokumen resmi jadwal ujian madrasah melalui tautan Google Drive.'
                    : hasMadrasahIdentity
                    ? 'Tempel tautan Google Drive berisi jadwal ujian agar wali murid dapat langsung mengunduhnya di menu Ujian.'
                    : 'Simpan Identitas Madrasah terlebih dahulu di menu Identitas Madrasah untuk menautkan link Google Drive jadwal ujian.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {jadwalPelajaranUrl && (
                <>
                  <a
                    href={resolveJadwalDownloadUrl(jadwalPelajaranUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs font-semibold hover:bg-[#04392B] transition-colors whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 text-[#F3D88B]" />
                    <span>Download Jadwal Ujian</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopyScheduleDrive()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-slate-700 hover:bg-[#F5F3EC] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copiedScheduleDrive ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#064E3B]" />
                        <span className="text-[#064E3B] font-semibold">Link Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {isAdmin && hasMadrasahIdentity && !editingScheduleDrive && (
                <button
                  type="button"
                  onClick={() => {
                    setScheduleDriveDraft(jadwalPelajaranUrl || '');
                    setEditingScheduleDrive(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4CFC2] bg-[#FAF9F5] text-xs font-semibold text-slate-800 hover:bg-[#EAE7DC] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#064E3B]" />
                  <span>{jadwalPelajaranUrl ? 'Ubah Link Drive' : 'Atur Link Drive'}</span>
                </button>
              )}
            </div>
          </div>

          {isAdmin && hasMadrasahIdentity && editingScheduleDrive && (
            <form
              onSubmit={handleSaveScheduleDrive}
              className="pt-3 border-t border-[#EAE6DB] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <input
                type="url"
                maxLength={LIMITS.DRIVE_URL_MAX}
                value={scheduleDriveDraft}
                onChange={(e) => setScheduleDriveDraft(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/... atau https://drive.google.com/file/d/.../view"
                className="flex-1 px-3.5 py-2 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={savingScheduleDrive}
                  className="px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs font-semibold hover:bg-[#04392B] transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  {savingScheduleDrive ? 'Menyimpan...' : 'Simpan Link Drive'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingScheduleDrive(false)}
                  className="px-3 py-2 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-slate-700 hover:bg-[#F5F3EC] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((idx) => (
              <div
                key={idx}
                className="h-36 bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-10 text-center">
            <Megaphone className="w-8 h-8 text-[#8A928C] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#111C18]">
              Belum ada pengumuman kegiatan pada filter ini
            </p>
            <p className="text-xs text-[#5C6660] mt-1 max-w-md mx-auto">
              {canManage
                ? 'Klik "Buat Pengumuman Baru" di atas untuk menerbitkan informasi kegiatan bagi wali murid dan warga madrasah.'
                : 'Pengumuman resmi kegiatan madrasah untuk wali murid akan tampil otomatis di halaman ini begitu diterbitkan oleh pihak madrasah.'}
            </p>
          </div>
        ) : (
          filtered.map((ann) => (
              <article
                key={ann.id}
                className={`w-full bg-[#FCFBF8] border rounded-xl p-4 sm:p-6 lg:p-7 transition-colors overflow-hidden ${
                  ann.isPinned ? 'border-[#D4A74A] shadow-xs' : 'border-[#DDD9CE]'
                }`}
              >
                {/* Top Row: Meta Badges & Management Actions */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C6660]">
                    <span className="font-semibold text-[#064E3B]">{ann.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-slate-900">
                      {AUDIENCE_LABEL[ann.targetAudience]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Oleh {ann.authorName}</span>
                    {ann.isPinned && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                          <Pin className="w-3 h-3" />
                          <span>Disematkan</span>
                        </span>
                      </>
                    )}
                    {canManage && !ann.isPublished && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-red-700">
                          Draf (Belum Publik)
                        </span>
                      </>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      {confirmDeleteId === ann.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deletingId === ann.id}
                            onClick={() => void handleDelete(ann)}
                            className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === ann.id ? '...' : 'Ya, Hapus'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white text-xs cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleTogglePin(ann)}
                            title={ann.isPinned ? 'Lepas sematan' : 'Sematkan di atas'}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              ann.isPinned
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                : 'text-[#8A928C] hover:text-amber-700 hover:bg-[#F5F3EC]'
                            }`}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleTogglePublish(ann)}
                            title={
                              ann.isPublished
                                ? 'Jadikan draf (sembunyikan dari publik)'
                                : 'Terbitkan ke publik'
                            }
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              ann.isPublished
                                ? 'text-[#064E3B] hover:bg-emerald-50'
                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                            }`}
                          >
                            {ann.isPublished ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ann)}
                            title="Edit pengumuman"
                            className="p-1.5 rounded-lg text-[#8A928C] hover:text-[#064E3B] hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(ann.id)}
                            title="Hapus pengumuman"
                            className="p-1.5 rounded-lg text-[#8A928C] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Announcement Content */}
                <div className="w-full">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-[#111C18]">
                    {ann.title}
                  </h3>
                  <p className="text-sm text-[#3F4A45] leading-relaxed mt-2.5 whitespace-pre-line">
                    {ann.content}
                  </p>
                  {ann.driveUrl && (
                    <div className="mt-3">
                      <a
                        href={resolveJadwalDownloadUrl(ann.driveUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-emerald-700/30 bg-emerald-50 text-xs font-semibold text-[#064E3B] hover:bg-emerald-100 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Jadwal / Lampiran</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#EFECE2]">
                  <div className="flex flex-wrap items-center gap-5 text-xs text-[#5C6660]">
                    {ann.eventDate && (
                      <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-slate-800 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#064E3B]" />
                        <span>Tanggal: {ann.eventDate}</span>
                      </span>
                    )}
                    {ann.location && (
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-[#064E3B]" />
                        <span>{ann.location}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ann.driveUrl && (
                      <a
                        href={resolveJadwalDownloadUrl(ann.driveUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-[#FAF9F5] text-xs font-semibold text-[#064E3B] hover:bg-[#EFECE2] transition-colors whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(ann)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                      <span>Bagikan ke WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyForWhatsApp(ann)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-[#FAF9F5] text-xs font-medium text-slate-700 hover:bg-[#EFECE2] transition-colors cursor-pointer"
                    >
                      {copiedId === ann.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#064E3B]" />
                          <span className="text-[#064E3B] font-semibold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Teks</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
          ))
        )}
      </div>
    </div>
  );
}
