import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Link2,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isValidHttpsUrl, LIMITS, resolveAttendancePreviewUrl } from '../lib/validation';
import {
  deleteAttendanceReportLink,
  saveAttendanceReportLink,
} from '../services/schoolService';
import {
  AttendanceClassLevel,
  AttendanceReportLink,
  GradeLevel,
  SchoolClass,
} from '../types/school';

export const ATTENDANCE_CLASS_LEVELS: AttendanceClassLevel[] = [
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
];

const GRADE_TO_CLASS_LEVEL: Partial<Record<GradeLevel, AttendanceClassLevel>> = {
  I: 'Kelas 1',
  II: 'Kelas 2',
  III: 'Kelas 3',
  IV: 'Kelas 4',
  V: 'Kelas 5',
  VI: 'Kelas 6',
};

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function AttendanceReportIframeBox({
  reportUrl,
  titleLabel,
}: {
  reportUrl: string;
  titleLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const trimmedUrl = reportUrl.trim();
  const embedUrl = resolveAttendancePreviewUrl(trimmedUrl);
  const sourceHost = getHostname(trimmedUrl);

  const handleCopy = async () => {
    if (!trimmedUrl) return;
    try {
      await navigator.clipboard.writeText(trimmedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure silently
    }
  };

  if (!trimmedUrl) return null;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#FCFBF8] flex flex-col'
          : 'bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden'
      }
    >
      <div className="px-4 sm:px-5 py-3.5 bg-[#F5F3EC] border-b border-[#EAE6DB] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#062C21] text-[#F3D88B] flex items-center justify-center shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111C18] truncate">{titleLabel}</p>
            {sourceHost && (
              <p className="text-xs font-mono text-[#5C6660] truncate">Sumber: {sourceHost}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIframeKey((prev) => prev + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-[#111C18] hover:bg-[#EAE7DC] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-[#111C18] hover:bg-[#EAE7DC] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#064E3B]" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-[#111C18] hover:bg-[#EAE7DC] transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Tutup Layar Penuh</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Layar Penuh</span>
              </>
            )}
          </button>

          <a
            href={trimmedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs font-semibold hover:bg-[#04392B] transition-colors whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#F3D88B]" />
            <span>Buka di Tab Baru</span>
          </a>
        </div>
      </div>

      <div className={isFullscreen ? 'flex-1 bg-white' : 'bg-white'}>
        <iframe
          key={`${embedUrl}-${iframeKey}`}
          src={embedUrl}
          title={titleLabel}
          className={
            isFullscreen ? 'w-full h-full border-0' : 'w-full h-[70vh] min-h-[500px] border-0'
          }
          loading="lazy"
          allow="fullscreen"
        />
      </div>

      <div className="px-4 sm:px-5 py-2.5 bg-[#FAF9F5] border-t border-[#EAE6DB] text-xs text-[#5C6660]">
        Jika halaman pratinjau diblokir oleh pengaturan keamanan situs tujuan, silakan klik tombol{' '}
        <span className="font-semibold text-[#111C18]">Buka di Tab Baru</span>.
      </div>
    </div>
  );
}

export function AttendanceClassRombelPicker({
  links,
  loading = false,
  requireClassClickFirst = false,
  onClose,
}: {
  links: AttendanceReportLink[];
  loading?: boolean;
  requireClassClickFirst?: boolean;
  onClose?: () => void;
}) {
  const [selectedClass, setSelectedClass] = useState<AttendanceClassLevel | null>(() => {
    if (requireClassClickFirst) return null;
    return links[0]?.classLevel || 'Kelas 1';
  });
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');

  const linksByClass = useMemo(() => {
    const map = new Map<AttendanceClassLevel, AttendanceReportLink[]>();
    for (const lvl of ATTENDANCE_CLASS_LEVELS) {
      map.set(lvl, []);
    }
    for (const item of links) {
      const arr = map.get(item.classLevel);
      if (arr) arr.push(item);
    }
    return map;
  }, [links]);

  const classRombels = useMemo(() => {
    if (!selectedClass) return [];
    return linksByClass.get(selectedClass) || [];
  }, [linksByClass, selectedClass]);

  useEffect(() => {
    if (!requireClassClickFirst && !selectedClass && links.length > 0) {
      setSelectedClass(links[0].classLevel);
    }
  }, [links, requireClassClickFirst, selectedClass]);

  useEffect(() => {
    if (!selectedClass) {
      setSelectedLinkId('');
      return;
    }
    const list = linksByClass.get(selectedClass) || [];
    if (list.length === 0) {
      setSelectedLinkId('');
    } else if (!list.some((item) => item.id === selectedLinkId)) {
      setSelectedLinkId(list[0].id);
    }
  }, [selectedClass, linksByClass, selectedLinkId]);

  const activeLink = classRombels.find((item) => item.id === selectedLinkId) || null;

  return (
    <div className="space-y-4">
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#062C21] text-[#F3D88B] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-[#111C18]">
                Pilih Kelas &amp; Rombel Laporan Absensi
              </h2>
              <p className="text-xs text-[#5C6660]">
                Pilih tingkat kelas terlebih dahulu, lalu pilih rombel untuk melihat pratinjau laporan absensi.
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-[#4A5550] hover:text-[#111C18] hover:bg-[#EAE7DC] cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {ATTENDANCE_CLASS_LEVELS.map((lvl) => (
                <div key={lvl} className="h-14 rounded-lg bg-[#EAE6DB] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-[#4A5550] mb-2">1. Pilih Kelas</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {ATTENDANCE_CLASS_LEVELS.map((lvl) => {
                    const count = (linksByClass.get(lvl) || []).length;
                    const active = selectedClass === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedClass(lvl)}
                        className={`px-3.5 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#064E3B] text-[#FAF8F2] border-[#064E3B]'
                            : count > 0
                            ? 'bg-white text-[#111C18] border-[#D4CFC2] hover:bg-[#F5F3EC]'
                            : 'bg-[#FAF9F5] text-[#6B746E] border-[#E5E1D6] hover:bg-[#F5F3EC]'
                        }`}
                      >
                        <span className="block text-sm font-semibold">{lvl}</span>
                        <span
                          className={`block text-[11px] mt-0.5 ${
                            active ? 'text-[#F3D88B]' : count > 0 ? 'text-[#064E3B]' : 'text-[#8A928C]'
                          }`}
                        >
                          {count > 0 ? `${count} Rombel` : 'Belum ada link'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedClass && (
                <div className="pt-3 border-t border-[#EAE6DB]">
                  <p className="text-xs font-semibold text-[#4A5550] mb-2">
                    2. Pilih Rombel ({selectedClass})
                  </p>
                  {classRombels.length === 0 ? (
                    <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#EAE6DB] text-xs text-[#5C6660]">
                      Link laporan absensi untuk <span className="font-semibold text-[#111C18]">{selectedClass}</span> belum ditambahkan oleh pengelola madrasah.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {classRombels.map((item) => {
                        const active = item.id === activeLink?.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedLinkId(item.id)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#D4A74A] text-[#062C21] border-[#C4963A]'
                                : 'bg-white text-[#111C18] border-[#D4CFC2] hover:bg-[#F5F3EC]'
                            }`}
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>
                              {item.classLevel} · Rombel {item.rombel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {activeLink && (
        <AttendanceReportIframeBox
          reportUrl={activeLink.reportUrl}
          titleLabel={`Laporan Absensi · ${activeLink.classLevel} — Rombel ${activeLink.rombel}`}
        />
      )}
    </div>
  );
}

interface AbsensiPreviewViewProps {
  links: AttendanceReportLink[];
  classes?: SchoolClass[];
  fallbackAbsensiReportUrl?: string;
  madrasahName?: string;
  canEdit: boolean;
  isAdmin?: boolean;
}

export function AbsensiPreviewView({
  links,
  classes = [],
  fallbackAbsensiReportUrl,
  madrasahName,
  canEdit,
  isAdmin = false,
}: AbsensiPreviewViewProps) {
  const { firebaseUser, profile } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [classLevel, setClassLevel] = useState<AttendanceClassLevel>('Kelas 1');
  const [rombel, setRombel] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const registeredRombelsForClass = useMemo(() => {
    const names = classes
      .filter((c) => GRADE_TO_CLASS_LEVEL[c.gradeLevel] === classLevel)
      .map((c) => c.name.trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [classes, classLevel]);

  const resetForm = () => {
    setEditingId(null);
    setClassLevel('Kelas 1');
    setRombel('');
    setReportUrl('');
  };

  const handleStartEdit = (item: AttendanceReportLink) => {
    setEditingId(item.id);
    setClassLevel(item.classLevel);
    setRombel(item.rombel);
    setReportUrl(item.reportUrl);
    setFeedback(null);
    setFormOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !canEdit) return;

    const cleanRombel = rombel.trim();
    const cleanUrl = reportUrl.trim();

    if (!cleanRombel) {
      setFeedback({
        type: 'error',
        text: 'Nama rombel wajib diisi (contoh: A, B, C, atau Reguler).',
      });
      return;
    }

    if (cleanUrl.length < 10 || !/^https:\/\/.+/i.test(cleanUrl) || !isValidHttpsUrl(cleanUrl)) {
      setFeedback({
        type: 'error',
        text: 'Link laporan absensi harus diawali https:// dengan panjang 10–500 karakter.',
      });
      return;
    }

    const matchedExisting = editingId
      ? links.find((l) => l.id === editingId)
      : links.find(
          (l) =>
            l.classLevel === classLevel &&
            l.rombel.trim().toLowerCase() === cleanRombel.toLowerCase()
        );

    setSaving(true);
    setFeedback(null);
    try {
      await saveAttendanceReportLink({
        existingId: matchedExisting?.id,
        classLevel,
        rombel: cleanRombel,
        reportUrl: cleanUrl,
        actorUid: firebaseUser.uid,
        actorName: profile.displayName,
      });
      setFeedback({
        type: 'success',
        text: `Link laporan absensi ${classLevel} · Rombel ${cleanRombel} berhasil disimpan.`,
      });
      resetForm();
      setFormOpen(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error && err.message
            ? err.message
            : 'Gagal menyimpan link laporan absensi. Periksa hak akses Anda.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: AttendanceReportLink) => {
    setDeletingId(item.id);
    setFeedback(null);
    try {
      await deleteAttendanceReportLink(item);
      if (editingId === item.id) {
        resetForm();
        setFormOpen(false);
      }
      setFeedback({
        type: 'success',
        text: `Link laporan absensi ${item.classLevel} · Rombel ${item.rombel} dihapus.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menghapus link laporan absensi.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const showForm = canEdit && (formOpen || links.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111C18]">
            Laporan Absensi Per Kelas &amp; Rombel
          </h1>
          <p className="text-sm text-[#4A5550] mt-1">
            Tempel tautan laporan absensi dari aplikasi eksternal {madrasahName || 'madrasah'} yang dipisahkan per kelas (1–6) dan rombel.
          </p>
        </div>

        {canEdit && !showForm && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setFeedback(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Link Kelas &amp; Rombel</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-[#E4EFE9] border-[#B8D5C6] text-[#064E3B]'
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

      {/* Admin / Guru Per-Class & Rombel Link Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#062C21] text-[#F3D88B] flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#111C18]">
                  {editingId
                    ? 'Edit Link Laporan Absensi Kelas & Rombel'
                    : 'Tempel Link Laporan Absensi Per Kelas & Rombel'}
                </h2>
                <p className="text-xs text-[#5C6660]">
                  Tautan ini akan muncul pada pilihan kelas di menu Lihat Laporan Absensi halaman depan.
                </p>
              </div>
            </div>

            {links.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setFormOpen(false);
                }}
                className="text-xs font-medium text-[#5C6660] hover:text-[#111C18] cursor-pointer"
              >
                Batal
              </button>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#3A4540] mb-1.5">
                  Pilih Kelas <span className="text-red-600">*</span>
                </label>
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value as AttendanceClassLevel)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4CFC2] bg-white text-sm text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
                >
                  {ATTENDANCE_CLASS_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3A4540] mb-1.5">
                  Rombel <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={rombel}
                  onChange={(e) => setRombel(e.target.value)}
                  placeholder="Contoh: A, B, C, atau 1A"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4CFC2] bg-white text-sm text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-[#5C6660]">Pilih cepat:</span>
                  {Array.from(new Set([...registeredRombelsForClass, 'A', 'B', 'C'])).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRombel(r)}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border cursor-pointer transition-colors ${
                        rombel.trim() === r
                          ? 'bg-[#064E3B] text-[#FAF8F2] border-[#064E3B]'
                          : 'bg-white text-[#4A5550] border-[#D4CFC2] hover:bg-[#F5F3EC]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3A4540] mb-1.5">
                URL Laporan Absensi (https://) <span className="text-red-600">*</span>
              </label>
              <input
                type="url"
                required
                maxLength={LIMITS.DRIVE_URL_MAX}
                value={reportUrl}
                onChange={(e) => setReportUrl(e.target.value)}
                placeholder="https://aplikasi-absensi-anda.vercel.app/laporan-1a atau https://docs.google.com/spreadsheets/..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4CFC2] bg-white text-sm text-[#111C18] focus:outline-none focus:ring-2 focus:ring-[#064E3B]/25 focus:border-[#064E3B]"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>
                  {saving
                    ? 'Menyimpan...'
                    : editingId
                    ? 'Perbarui Link Kelas & Rombel'
                    : 'Simpan Link Kelas & Rombel'}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List of Configured Class & Rombel Links */}
      {links.length > 0 && (
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#111C18]">
              Daftar Link Absensi Tersimpan ({links.length} Rombel)
            </h2>
          </div>

          <div className="divide-y divide-[#EFECE2]">
            {links.map((item) => {
              const canModifyItem =
                canEdit && (isAdmin || item.createdBy === firebaseUser?.uid);
              return (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F5F3EC]/50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#E4EFE9] text-[#064E3B] text-xs font-semibold">
                        {item.classLevel}
                      </span>
                      <span className="text-sm font-semibold text-[#111C18]">
                        Rombel {item.rombel}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-[#5C6660] truncate mt-1">
                      {item.reportUrl}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={item.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-[#111C18] hover:bg-[#F5F3EC]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka</span>
                    </a>

                    {canModifyItem && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Edit link"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs font-medium text-[#111C18] hover:bg-[#F5F3EC] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#064E3B]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          disabled={deletingId === item.id}
                          title="Hapus link"
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Per-Class & Per-Rombel Preview */}
      {links.length > 0 ? (
        <AttendanceClassRombelPicker links={links} />
      ) : fallbackAbsensiReportUrl ? (
        <AttendanceReportIframeBox
          reportUrl={fallbackAbsensiReportUrl}
          titleLabel="Pratinjau Laporan Absensi Madrasah"
        />
      ) : (
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#062C21] text-[#F3D88B] flex items-center justify-center mb-3">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <h2 className="font-display text-lg font-bold text-[#111C18]">
            Belum Ada Link Laporan Absensi Per Kelas &amp; Rombel
          </h2>
          <p className="text-sm text-[#4A5550] max-w-md mx-auto mt-1.5">
            {canEdit
              ? 'Tambahkan link laporan absensi untuk masing-masing kelas dan rombel pada formulir di atas agar dapat dipratinjau di sini dan di halaman depan.'
              : 'Pengelola Madrasah belum menambahkan link laporan absensi per kelas dan rombel.'}
          </p>
        </div>
      )}
    </div>
  );
}

export const AbsensiManagerView = AbsensiPreviewView;
