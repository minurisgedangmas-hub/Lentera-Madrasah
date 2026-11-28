import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FileBadge2,
  FileCheck2,
  FileDown,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Mail,
  MailPlus,
  Printer,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserRoundCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LIMITS, todayIsoDate } from '../lib/validation';
import {
  createOutgoingMail,
  deleteOutgoingMail,
  updateOutgoingMail,
} from '../services/schoolService';
import {
  MadrasahIdentity,
  OutgoingMailCategory,
  OutgoingMailPriority,
  OutgoingMailRecord,
  OutgoingMailStatus,
  StudentRecord,
} from '../types/school';
import { exportOutgoingMailsToExcel } from '../utils/mailExcel';
import { downloadOutgoingMailPdf } from '../utils/mailPdf';
import { MadrasahLogo } from './MadrasahEmblem';

export type AdministrasiSubmenu = 'surat_menyurat';
export type SuratMenyuratSubmenu = 'surat_keluar';
export type SuratKeluarCategoryFilter = 'semua' | OutgoingMailCategory;

export const SURAT_KELUAR_CATEGORIES: Array<{
  id: OutgoingMailCategory;
  label: string;
  shortLabel: string;
  code: string;
  description: string;
  icon: typeof FileText;
  cardGradient: string;
  tabActiveClass: string;
  textColorClass: string;
}> = [
  {
    id: 'surat_keterangan',
    label: 'Surat Keterangan',
    shortLabel: 'Keterangan',
    code: 'SK',
    description: 'Surat keterangan aktif belajar, berkelakuan baik, dan keterangan siswa lainnya.',
    icon: FileCheck2,
    cardGradient: 'from-emerald-800 via-emerald-950 to-[#04231A] border-emerald-600/50',
    tabActiveClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-sm',
    textColorClass: 'text-emerald-200',
  },
  {
    id: 'undangan',
    label: 'Undangan',
    shortLabel: 'Undangan',
    code: 'UND',
    description: 'Surat undangan rapat wali murid, pertemuan komite, dan kegiatan resmi madrasah.',
    icon: Mail,
    cardGradient: 'from-cyan-800 via-cyan-950 to-[#041E28] border-cyan-600/50',
    tabActiveClass: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-500 shadow-sm',
    textColorClass: 'text-cyan-200',
  },
  {
    id: 'pemberitahuan',
    label: 'Pemberitahuan',
    shortLabel: 'Pemberitahuan',
    code: 'PMB',
    description: 'Surat edaran dan pemberitahuan libur, ujian, pembagian rapor, atau agenda resmi.',
    icon: BellRing,
    cardGradient: 'from-amber-800 via-amber-950 to-[#2A1804] border-amber-600/50',
    tabActiveClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 shadow-sm font-bold',
    textColorClass: 'text-amber-200',
  },
  {
    id: 'surat_mutasi',
    label: 'Surat Mutasi',
    shortLabel: 'Mutasi',
    code: 'SM',
    description: 'Surat keterangan pindah/mutasi siswa keluar atau pengantar mutasi antar madrasah.',
    icon: UserRoundCheck,
    cardGradient: 'from-violet-800 via-purple-950 to-[#18082E] border-violet-600/50',
    tabActiveClass: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-500 shadow-sm',
    textColorClass: 'text-violet-200',
  },
  {
    id: 'surat_lainnya',
    label: 'Surat Lainnya',
    shortLabel: 'Surat Lain',
    code: 'SL',
    description: 'Surat tugas guru, surat pengantar dinas/Kemenag, rekomendasi, dan surat umum lainnya.',
    icon: FileBadge2,
    cardGradient: 'from-rose-800 via-rose-950 to-[#280814] border-rose-600/50',
    tabActiveClass: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-500 shadow-sm',
    textColorClass: 'text-rose-200',
  },
];

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function formatIndonesianDate(isoDate: string): string {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${d} ${months[(m - 1) % 12]} ${y}`;
}

function suggestLetterNumber(
  category: OutgoingMailCategory,
  existingMails: OutgoingMailRecord[],
  isoDate: string
): string {
  const catMeta = SURAT_KELUAR_CATEGORIES.find((c) => c.id === category);
  const code = catMeta?.code || 'SK';
  const [yearStr, monthStr] = (isoDate || todayIsoDate()).split('-');
  const targetYear = yearStr || String(new Date().getFullYear());

  let maxSeq = 0;
  let yearCount = 0;
  for (const m of existingMails) {
    const isSameYear = !m.letterDate || m.letterDate.startsWith(targetYear);
    if (isSameYear) {
      yearCount += 1;
      const match = m.letterNumber.trim().match(/^(\d+)\//);
      if (match) {
        const parsed = Number(match[1]);
        if (Number.isFinite(parsed) && parsed > maxSeq) maxSeq = parsed;
      }
    }
  }

  const seq = String(Math.max(yearCount, maxSeq) + 1).padStart(3, '0');
  const monthIdx = Math.max(0, Math.min(11, (Number(monthStr) || 1) - 1));
  return `${seq}/${code}/MI.NI/${ROMAN_MONTHS[monthIdx]}/${targetYear}`;
}

function buildLetterTemplate(input: {
  category: OutgoingMailCategory;
  madrasahName: string;
  student?: StudentRecord;
}): { subject: string; recipient: string; content: string } {
  const mName = input.madrasahName || 'MI Nurul Islam Gedangmas';
  const s = input.student;
  const studentBio = s
    ? `Nama Lengkap : ${s.fullName}\nNISN / No. Induk : ${s.nisn}${s.studentIdNumber ? ` / ${s.studentIdNumber}` : ''}${s.nik ? `\nNIK : ${s.nik}` : ''}\nKelas : ${s.className}${s.birthPlace || s.birthDate ? `\nTempat, Tgl Lahir : ${[s.birthPlace, s.birthDate].filter(Boolean).join(', ')}` : ''}${s.fatherName || s.parentName ? `\nNama Orang Tua / Wali : ${s.fatherName || s.parentName}` : ''}${s.address ? `\nAlamat : ${s.address}` : ''}`
    : `Nama Lengkap : [Nama Siswa]\nNISN / No. Induk : [NISN]\nNIK : [NIK]\nKelas : [Kelas]\nTempat, Tgl Lahir : [Tempat, Tanggal Lahir]\nNama Orang Tua / Wali : [Nama Orang Tua]\nAlamat : [Alamat Siswa]`;

  switch (input.category) {
    case 'surat_keterangan':
      return {
        subject: s ? `Surat Keterangan Aktif Belajar — ${s.fullName}` : 'Surat Keterangan Aktif Belajar Siswa',
        recipient: s ? `Orang Tua / Wali / Instansi Terkait (${s.fullName})` : 'Pihak / Instansi yang Berkepentingan',
        content: `Yang bertanda tangan di bawah ini Kepala ${mName}, dengan ini menerangkan bahwa:\n\n${studentBio}\n\nAdalah benar-benar peserta didik yang terdaftar dan aktif mengikuti kegiatan belajar mengajar di ${mName} pada Tahun Pelajaran 2026/2027.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`,
      };
    case 'undangan':
      return {
        subject: 'Undangan Rapat Wali Murid & Koordinasi Kegiatan Madrasah',
        recipient: 'Yth. Bapak/Ibu Orang Tua / Wali Murid Kelas I – VI',
        content: `Assalamu'alaikum Wr. Wb.\n\nDengan memohon rahmat dan ridho Allah SWT, bersama ini kami mengundang Bapak/Ibu untuk hadir pada acara yang insyaAllah akan dilaksanakan pada:\n\nHari / Tanggal : [Hari, Tanggal]\nWaktu : Pukul 08.00 WIB – selesai\nTempat : Aula / Ruang Kelas ${mName}\nAcara : Koordinasi Program Pembelajaran & Kegiatan Madrasah\n\nMengingat pentingnya acara tersebut, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja samanya kami sampaikan terima kasih.\n\nWassalamu'alaikum Wr. Wb.`,
      };
    case 'pemberitahuan':
      return {
        subject: 'Pemberitahuan Kegiatan & Jadwal Pelaksanaan Ujian Madrasah',
        recipient: 'Yth. Bapak/Ibu Orang Tua / Wali Murid',
        content: `Assalamu'alaikum Wr. Wb.\n\nBersama surat ini kami sampaikan kepada Bapak/Ibu Orang Tua/Wali Murid ${mName} bahwa kegiatan pembelajaran dan agenda madrasah akan dilaksanakan sesuai jadwal terlampir mulai tanggal [Tanggal Mulai] s.d. [Tanggal Selesai].\n\nMohon Bapak/Ibu berkenan memantau kesiapan belajar putra-putri di rumah serta menjaga kedisiplinan kehadiran di madrasah.\n\nDemikian surat pemberitahuan ini kami sampaikan. Atas perhatian dan dukungan Bapak/Ibu kami ucapkan terima kasih.\n\nWassalamu'alaikum Wr. Wb.`,
      };
    case 'surat_mutasi':
      return {
        subject: s ? `Surat Keterangan Pindah Sekolah (Mutasi) — ${s.fullName}` : 'Surat Keterangan Pindah Sekolah (Mutasi Siswa)',
        recipient: 'Yth. Kepala Sekolah / Madrasah Tujuan',
        content: `Yang bertanda tangan di bawah ini Kepala ${mName}, menerangkan dengan sesungguhnya bahwa:\n\n${studentBio}\n\nBerdasarkan permohonan orang tua/wali murid, peserta didik tersebut di atas telah mengajukan pindah/mutasi sekolah ke [Nama Sekolah/Madrasah Tujuan] dengan alasan [Alasan Mutasi].\n\nBersama ini kami sertakan dokumen kelengkapan administrasi dan rapor peserta didik yang bersangkutan. Demikian surat keterangan pindah sekolah ini dibuat agar dapat dipergunakan sebagaimana mestinya.`,
      };
    case 'surat_lainnya':
    default:
      return {
        subject: 'Surat Pengantar / Tugas Kedinasan Madrasah',
        recipient: 'Yth. Kepala Kantor Kementerian Agama / Instansi Tujuan',
        content: `Assalamu'alaikum Wr. Wb.\n\nDengan hormat, bersama surat ini Kepala ${mName} menyampaikan pengantar / permohonan terkait pelaksanaan tugas dan administrasi madrasah sebagaimana tercantum pada perihal di atas.\n\nAdapun rincian pelaksanaan kegiatan adalah sebagai berikut:\nHari / Tanggal : [Hari, Tanggal]\nTempat : [Lokasi Kegiatan]\nKeterangan : [Penjelasan Singkat]\n\nDemikian surat ini kami sampaikan. Atas perhatian dan kerja samanya kami ucapkan terima kasih.\n\nWassalamu'alaikum Wr. Wb.`,
      };
  }
}

interface AdministrationMailViewProps {
  mails: OutgoingMailRecord[];
  students: StudentRecord[];
  madrasahIdentity: MadrasahIdentity | null;
  activeSubmenu: AdministrasiSubmenu | null;
  onChangeSubmenu: (sub: AdministrasiSubmenu | null) => void;
  activeSecondSubmenu: SuratMenyuratSubmenu | null;
  onChangeSecondSubmenu: (sub: SuratMenyuratSubmenu | null) => void;
  selectedCategory: SuratKeluarCategoryFilter;
  onChangeCategory: (cat: SuratKeluarCategoryFilter) => void;
}

export function AdministrationMailView({
  mails,
  students,
  madrasahIdentity,
  activeSubmenu,
  onChangeSubmenu,
  activeSecondSubmenu,
  onChangeSecondSubmenu,
  selectedCategory,
  onChangeCategory,
}: AdministrationMailViewProps) {
  const { firebaseUser, profile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | OutgoingMailStatus>('Semua');
  const [formOpen, setFormOpen] = useState(false);
  const [editingMail, setEditingMail] = useState<OutgoingMailRecord | null>(null);
  const [previewMail, setPreviewMail] = useState<OutgoingMailRecord | null>(null);

  // Form fields
  const [formCategory, setFormCategory] = useState<OutgoingMailCategory>('surat_keterangan');
  const [letterNumber, setLetterNumber] = useState('');
  const [letterDate, setLetterDate] = useState(todayIsoDate());
  const [subject, setSubject] = useState('');
  const [recipient, setRecipient] = useState('');
  const [priority, setPriority] = useState<OutgoingMailPriority>('Biasa');
  const [attachmentCount, setAttachmentCount] = useState('-');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [content, setContent] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('Kepala Madrasah');
  const [status, setStatus] = useState<OutgoingMailStatus>('Terbit');
  const [driveUrl, setDriveUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const madrasahName = madrasahIdentity?.namaMadrasah || 'MI Nurul Islam Gedangmas';
  const defaultHeadmaster = madrasahIdentity?.namaKepalaMadrasah || 'Kepala Madrasah';

  useEffect(() => {
    setFormOpen(false);
    setEditingMail(null);
    setConfirmDeleteId(null);
    setFeedback(null);
    if (selectedCategory !== 'semua') {
      setFormCategory(selectedCategory);
    }
  }, [activeSubmenu, activeSecondSubmenu, selectedCategory]);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.fullName.localeCompare(b.fullName, 'id-ID')),
    [students]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<OutgoingMailCategory, number> = {
      surat_keterangan: 0,
      undangan: 0,
      pemberitahuan: 0,
      surat_mutasi: 0,
      surat_lainnya: 0,
    };
    for (const m of mails) {
      if (counts[m.category] !== undefined) {
        counts[m.category] += 1;
      }
    }
    return counts;
  }, [mails]);

  const stats = useMemo(() => {
    const ketMutasi = categoryCounts.surat_keterangan + categoryCounts.surat_mutasi;
    const undPmb = categoryCounts.undangan + categoryCounts.pemberitahuan;
    const publishedCount = mails.filter(
      (m) => m.status === 'Terbit' || m.status === 'Terkirim' || m.status === 'Diarsipkan'
    ).length;
    return {
      total: mails.length,
      ketMutasi,
      undPmb,
      publishedCount,
    };
  }, [mails, categoryCounts]);

  const filteredMails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mails.filter((m) => {
      if (selectedCategory !== 'semua' && m.category !== selectedCategory) return false;
      if (statusFilter !== 'Semua' && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.letterNumber.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.recipient.toLowerCase().includes(q) ||
        m.studentName.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q)
      );
    });
  }, [mails, selectedCategory, statusFilter, searchQuery]);

  const applyTemplateToForm = (cat: OutgoingMailCategory, studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    const tpl = buildLetterTemplate({ category: cat, madrasahName, student });
    setSubject(tpl.subject);
    setRecipient(tpl.recipient);
    setContent(tpl.content);
  };

  const handleOpenCreateForm = (preferredCategory?: OutgoingMailCategory) => {
    const targetCat: OutgoingMailCategory =
      preferredCategory || (selectedCategory !== 'semua' ? selectedCategory : 'surat_keterangan');
    const today = todayIsoDate();
    setEditingMail(null);
    setFormCategory(targetCat);
    setLetterDate(today);
    setLetterNumber(suggestLetterNumber(targetCat, mails, today));
    setPriority('Biasa');
    setAttachmentCount('-');
    setSelectedStudentId('');
    setSignerName(defaultHeadmaster);
    setSignerTitle('Kepala Madrasah');
    setStatus('Terbit');
    setDriveUrl('');
    const tpl = buildLetterTemplate({ category: targetCat, madrasahName });
    setSubject(tpl.subject);
    setRecipient(tpl.recipient);
    setContent(tpl.content);
    setFeedback(null);
    setFormOpen(true);

    // Ensure user lands inside Surat Keluar view when creating from Hub
    if (activeSubmenu !== 'surat_menyurat') onChangeSubmenu('surat_menyurat');
    if (activeSecondSubmenu !== 'surat_keluar') onChangeSecondSubmenu('surat_keluar');
  };

  const handleOpenEditForm = (mail: OutgoingMailRecord) => {
    setEditingMail(mail);
    setFormCategory(mail.category);
    setLetterNumber(mail.letterNumber);
    setLetterDate(mail.letterDate);
    setSubject(mail.subject);
    setRecipient(mail.recipient);
    setPriority(mail.priority);
    setAttachmentCount(mail.attachmentCount || '-');
    setSelectedStudentId(mail.studentId || '');
    setContent(mail.content);
    setSignerName(mail.signerName || defaultHeadmaster);
    setSignerTitle(mail.signerTitle || 'Kepala Madrasah');
    setStatus(mail.status);
    setDriveUrl(mail.driveUrl || '');
    setFeedback(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    const cleanNumber = letterNumber.trim();
    const cleanSubject = subject.trim();
    const cleanRecipient = recipient.trim();
    const cleanContent = content.trim();
    const cleanSigner = signerName.trim() || defaultHeadmaster;
    const cleanDrive = driveUrl.trim();

    if (!cleanNumber) {
      setFeedback({ type: 'error', text: 'Nomor surat wajib diisi.' });
      return;
    }
    if (cleanSubject.length < 2) {
      setFeedback({ type: 'error', text: 'Perihal / judul surat minimal 2 karakter.' });
      return;
    }
    if (cleanRecipient.length < 2) {
      setFeedback({ type: 'error', text: 'Tujuan / penerima surat wajib diisi.' });
      return;
    }
    if (cleanContent.length < 5) {
      setFeedback({ type: 'error', text: 'Isi surat minimal 5 karakter.' });
      return;
    }
    if (cleanDrive && !/^https:\/\/.+/i.test(cleanDrive)) {
      setFeedback({
        type: 'error',
        text: 'Link arsip digital Google Drive harus diawali dengan https://',
      });
      return;
    }

    const linkedStudent = students.find((s) => s.id === selectedStudentId);

    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        category: formCategory,
        letterNumber: cleanNumber,
        letterDate,
        subject: cleanSubject,
        recipient: cleanRecipient,
        priority,
        attachmentCount: attachmentCount.trim() || '-',
        studentId: linkedStudent?.id || '',
        studentName: linkedStudent?.fullName || '',
        content: cleanContent,
        signerName: cleanSigner,
        signerTitle: signerTitle.trim() || 'Kepala Madrasah',
        status,
        driveUrl: cleanDrive,
      };

      if (editingMail) {
        await updateOutgoingMail(editingMail, payload);
        setFeedback({
          type: 'success',
          text: `Surat "${cleanNumber}" berhasil diperbarui.`,
        });
      } else {
        await createOutgoingMail({
          ...payload,
          actorUid: firebaseUser.uid,
          actorName: profile?.displayName || firebaseUser.email || 'Pengelola Madrasah',
        });
        setFeedback({
          type: 'success',
          text: `Surat Keluar "${cleanNumber}" berhasil disimpan ke agenda administrasi.`,
        });
      }
      setFormOpen(false);
      setEditingMail(null);
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error && err.message.includes('permission')
            ? 'Anda tidak memiliki izin untuk menyimpan surat ini.'
            : 'Gagal menyimpan data surat ke Firestore. Periksa input Anda lalu coba lagi.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mail: OutgoingMailRecord) => {
    setDeletingId(mail.id);
    setFeedback(null);
    try {
      await deleteOutgoingMail(mail);
      setConfirmDeleteId(null);
      if (previewMail?.id === mail.id) setPreviewMail(null);
      setFeedback({
        type: 'success',
        text: `Surat "${mail.letterNumber}" telah dihapus dari agenda.`,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Gagal menghapus data surat.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrintLetter = () => {
    document.body.classList.add('printing-letter');
    const cleanup = () => {
      document.body.classList.remove('printing-letter');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    window.setTimeout(cleanup, 1500);
  };

  const handleDownloadPdf = async (mail: OutgoingMailRecord) => {
    setDownloadingPdfId(mail.id);
    try {
      await downloadOutgoingMailPdf({ mail, madrasahIdentity });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal membuat file PDF A4. Silakan coba lagi atau gunakan tombol Cetak A4.',
      });
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const activeCategoryMeta =
    selectedCategory === 'semua'
      ? null
      : SURAT_KELUAR_CATEGORIES.find((c) => c.id === selectedCategory) || null;

  const isInsideSuratKeluar =
    activeSubmenu === 'surat_menyurat' && activeSecondSubmenu === 'surat_keluar';

  return (
    <div className="space-y-6">
      {/* Top Executive Header Banner */}
      <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-2xl p-6 border border-[#144D3C] shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#F3D88B]">
            <FolderKanban className="w-4 h-4" />
            <span>Administrasi Madrasah</span>
            {activeSubmenu === 'surat_menyurat' && (
              <>
                <span className="text-[#F3D88B]/70">/</span>
                <span>Surat Menyurat</span>
              </>
            )}
            {isInsideSuratKeluar && (
              <>
                <span className="text-[#F3D88B]/70">/</span>
                <span>Surat Keluar</span>
              </>
            )}
            {isInsideSuratKeluar && activeCategoryMeta && (
              <>
                <span className="text-[#F3D88B]/70">/</span>
                <span>{activeCategoryMeta.label}</span>
              </>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FFFFFF] mt-1">
            {isInsideSuratKeluar
              ? activeCategoryMeta
                ? `Surat Keluar — ${activeCategoryMeta.label}`
                : 'Buku Agenda & Layanan Surat Keluar'
              : activeSubmenu === 'surat_menyurat'
              ? 'Administrasi Surat Menyurat Madrasah'
              : 'Administrasi Tata Usaha Madrasah'}
          </h1>
          <p className="text-xs sm:text-sm text-[#E2EFEA] mt-1 max-w-2xl">
            {isInsideSuratKeluar
              ? 'Kelola penomoran otomatis, redaksi templat resmi, arsip digital, pratinjau Kop Madrasah, dan cetak PDF untuk seluruh kategori Surat Keluar.'
              : 'Pusat pengelolaan administrasi persuratan resmi madrasah yang terintegrasi langsung dengan biodata siswa dan Kop Surat Madrasah.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenCreateForm()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-sm font-bold shadow-md hover:from-amber-300 hover:to-yellow-300 transition-all transform hover:scale-[1.02] whitespace-nowrap cursor-pointer border border-amber-300"
          >
            <MailPlus className="w-4 h-4" />
            <span>Buat Surat Keluar</span>
          </button>

          <button
            type="button"
            onClick={() =>
              exportOutgoingMailsToExcel({
                mails: filteredMails,
                sheetTitle: activeCategoryMeta?.label || 'Surat Keluar',
                filePrefix: 'Buku_Agenda_Surat_Keluar',
                madrasahName,
              })
            }
            disabled={filteredMails.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-sm font-semibold shadow-md hover:from-cyan-500 hover:to-blue-600 transition-all transform hover:scale-[1.02] whitespace-nowrap cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed border border-cyan-400"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Agenda (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 4 Colorful KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-[#04231A] border border-emerald-700/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Total Surat Keluar</p>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#F3D88B] tabular-nums mt-2">
            {stats.total} <span className="text-sm font-sans font-medium text-emerald-100">Surat</span>
          </p>
          <p className="text-xs text-emerald-300/80 mt-1">Tercatat di buku agenda</p>
        </div>

        <div className="bg-gradient-to-br from-teal-800 via-teal-950 to-[#042018] border border-teal-600/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
          <p className="text-xs font-semibold text-teal-200 uppercase tracking-wider">Keterangan &amp; Mutasi</p>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-teal-300 tabular-nums mt-2">
            {stats.ketMutasi}
          </p>
          <p className="text-xs text-teal-300/80 mt-1">Surat siswa &amp; pindah</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-800 via-cyan-950 to-[#041E28] border border-cyan-600/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <p className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">Undangan &amp; Edaran</p>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-cyan-300 tabular-nums mt-2">
            {stats.undPmb}
          </p>
          <p className="text-xs text-cyan-300/80 mt-1">Undangan &amp; pemberitahuan</p>
        </div>

        <div className="bg-gradient-to-br from-amber-800 via-amber-950 to-[#2A1804] border border-amber-600/50 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <p className="text-xs font-semibold text-amber-200 uppercase tracking-wider">Terbit &amp; Arsip</p>
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-300 tabular-nums mt-2">
            {stats.publishedCount}
          </p>
          <p className="text-xs text-amber-300/80 mt-1">Siap cetak atau terkirim</p>
        </div>
      </div>

      {/* Breadcrumb / Level Bar */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onChangeSubmenu('surat_menyurat');
              onChangeSecondSubmenu(null);
              onChangeCategory('semua');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeSubmenu === 'surat_menyurat' && !activeSecondSubmenu
                ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-xs'
                : 'bg-[#F3F0E6] text-slate-700 hover:bg-[#E7E2D2]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Surat Menyurat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeSubmenu('surat_menyurat');
              onChangeSecondSubmenu('surat_keluar');
              onChangeCategory('semua');
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              isInsideSuratKeluar && selectedCategory === 'semua'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-xs'
                : isInsideSuratKeluar
                ? 'bg-emerald-900 text-[#F3D88B]'
                : 'bg-[#F3F0E6] text-slate-700 hover:bg-[#E7E2D2]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Surat Keluar ({mails.length})</span>
          </button>
        </div>

        <span className="text-xs text-slate-500">
          5 Jenis Surat Keluar Tersedia
        </span>
      </div>

      {/* Hub / Category Colorful Cards when at Administrasi or Surat Menyurat overview */}
      {!isInsideSuratKeluar && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Submenu Surat Menyurat · Surat Keluar
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Pilih jenis surat keluar di bawah ini untuk membuat, mengelola nomor surat, dan mencetak surat resmi Kop Madrasah.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onChangeSubmenu('surat_menyurat');
                onChangeSecondSubmenu('surat_keluar');
                onChangeCategory('semua');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#064E3B] text-white text-xs font-semibold hover:bg-[#04392B] transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Buka Semua Surat Keluar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SURAT_KELUAR_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = categoryCounts[cat.id];
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onChangeSubmenu('surat_menyurat');
                    onChangeSecondSubmenu('surat_keluar');
                    onChangeCategory(cat.id);
                  }}
                  className={`text-left bg-gradient-to-br ${cat.cardGradient} border rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all transform hover:scale-[1.01] cursor-pointer relative overflow-hidden flex flex-col justify-between gap-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#F3D88B]" />
                    </div>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white/15 text-[#F3D88B] tabular-nums">
                      {count} Surat
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-bold text-white">{cat.label}</h3>
                    <p className={`text-xs mt-1 leading-relaxed ${cat.textColorClass}`}>
                      {cat.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/15 text-xs font-semibold text-[#F3D88B]">
                    <span>Kode: {cat.code}</span>
                    <span className="inline-flex items-center gap-1">
                      Kelola {cat.shortLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Surat Keluar Category Filter Tabs (Always visible inside Surat Keluar) */}
      {isInsideSuratKeluar && (
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-2xl p-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeCategory('semua')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'semua'
                ? 'bg-gradient-to-r from-[#064E3B] to-[#0F533F] text-[#FAF8F2] border-[#1A6851] shadow-sm'
                : 'bg-white text-slate-700 border-[#DDD9CE] hover:bg-[#F5F3EC]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Semua Jenis ({mails.length})</span>
          </button>

          {SURAT_KELUAR_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChangeCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? cat.tabActiveClass
                    : 'bg-white text-slate-700 border-[#DDD9CE] hover:bg-[#F5F3EC]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>
                  {cat.label} ({categoryCounts[cat.id]})
                </span>
              </button>
            );
          })}
        </div>
      )}

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

      {/* Create / Edit Form */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#FCFBF8] border border-[#D4CFC2] rounded-2xl overflow-hidden shadow-sm"
        >
          <div className="px-6 py-4 bg-gradient-to-r from-[#062C21] to-[#0B4635] text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#FAF8F2]">
                {editingMail ? 'Perbarui Surat Keluar' : 'Buat Surat Keluar Baru'}
              </h2>
              <p className="text-xs text-[#C6DDD4] mt-0.5">
                Gunakan tombol templat resmi untuk mengisi draf surat secara cepat sesuai jenis surat yang dipilih.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingMail(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2C6B57] bg-[#0B3A2C] text-[#FAF8F2] text-xs font-medium hover:bg-[#104A39] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Surat Keluar *
              </label>
              <select
                value={formCategory}
                onChange={(e) => {
                  const nextCat = e.target.value as OutgoingMailCategory;
                  setFormCategory(nextCat);
                  if (!editingMail) {
                    setLetterNumber(suggestLetterNumber(nextCat, mails, letterDate));
                    applyTemplateToForm(nextCat, selectedStudentId);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                {SURAT_KELUAR_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Nomor Surat *</label>
                <button
                  type="button"
                  onClick={() =>
                    setLetterNumber(suggestLetterNumber(formCategory, mails, letterDate))
                  }
                  className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                >
                  Nomor Otomatis
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={LIMITS.MAIL_NUMBER_MAX}
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                placeholder="001/SK/MI.NI/VII/2026"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Format: urut/jenis/MI.NI/bulan romawi/tahun (contoh: 001/SK/MI.NI/VII/2026)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Surat *
              </label>
              <input
                type="date"
                required
                value={letterDate}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setLetterDate(nextDate);
                  if (!editingMail && /^\d+\/[A-Z]+\/MI\.NI\/[IVX]+\/\d{4}$/.test(letterNumber.trim())) {
                    setLetterNumber(suggestLetterNumber(formCategory, mails, nextDate));
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Perihal / Judul Surat *
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.MAIL_SUBJECT_MAX}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Contoh: Surat Keterangan Aktif Belajar"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status Surat *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OutgoingMailStatus)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                <option value="Draf">Draf</option>
                <option value="Terbit">Terbit</option>
                <option value="Terkirim">Terkirim</option>
                <option value="Diarsipkan">Diarsipkan</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tujuan / Kepada Yth. *
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.MAIL_RECIPIENT_MAX}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Contoh: Bapak/Ibu Wali Murid Kelas VI"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tautkan Siswa (Opsional)
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  const sid = e.target.value;
                  setSelectedStudentId(sid);
                  if (sid && (formCategory === 'surat_keterangan' || formCategory === 'surat_mutasi')) {
                    applyTemplateToForm(formCategory, sid);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                <option value="">-- Tidak ditautkan ke siswa --</option>
                {sortedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.className})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sifat Surat
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as OutgoingMailPriority)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                <option value="Biasa">Biasa</option>
                <option value="Penting">Penting</option>
                <option value="Segera">Segera</option>
                <option value="Rahasia">Rahasia</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Lampiran
              </label>
              <input
                type="text"
                maxLength={LIMITS.MAIL_ATTACHMENT_MAX}
                value={attachmentCount}
                onChange={(e) => setAttachmentCount(e.target.value)}
                placeholder="Contoh: - atau 1 Berkas"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Link Arsip PDF / Drive (Opsional)
              </label>
              <input
                type="url"
                maxLength={LIMITS.DRIVE_URL_MAX}
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Isi / Redaksi Surat Resmi *
                </label>
                <button
                  type="button"
                  onClick={() => applyTemplateToForm(formCategory, selectedStudentId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 text-xs font-semibold hover:bg-amber-200 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Isi Templat {SURAT_KELUAR_CATEGORIES.find((c) => c.id === formCategory)?.label}</span>
                </button>
              </div>
              <textarea
                rows={8}
                required
                maxLength={LIMITS.MAIL_CONTENT_MAX}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tuliskan isi surat resmi madrasah..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Penandatangan *
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.MAIL_SIGNER_NAME_MAX}
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Nama Kepala Madrasah"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jabatan Penandatangan *
              </label>
              <input
                type="text"
                required
                maxLength={LIMITS.MAIL_SIGNER_TITLE_MAX}
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder="Kepala Madrasah"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-[#F5F3EC] border-t border-[#EAE6DB] flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingMail(null);
              }}
              className="px-4 py-2 rounded-lg border border-[#D4CFC2] bg-white text-slate-700 text-xs sm:text-sm font-medium hover:bg-[#EAE7DC] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs sm:text-sm font-semibold hover:bg-[#04392B] transition-colors cursor-pointer disabled:opacity-60"
            >
              <FilePlus2 className="w-4 h-4 text-[#F3D88B]" />
              <span>{saving ? 'Menyimpan...' : editingMail ? 'Simpan Perubahan' : 'Simpan Surat Keluar'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Outgoing Mail Table & Search */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#064E3B]" />
            <h2 className="font-display text-base font-bold text-slate-900">
              {activeCategoryMeta
                ? `Daftar ${activeCategoryMeta.label} (${filteredMails.length})`
                : `Buku Agenda Surat Keluar (${filteredMails.length})`}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor, perihal, tujuan, siswa..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'Semua' | OutgoingMailStatus)}
              className="px-3 py-2 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            >
              <option value="Semua">Semua Status</option>
              <option value="Draf">Draf</option>
              <option value="Terbit">Terbit</option>
              <option value="Terkirim">Terkirim</option>
              <option value="Diarsipkan">Diarsipkan</option>
            </select>
          </div>
        </div>

        {filteredMails.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-900/10 text-emerald-800 mx-auto flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="font-display text-base font-bold text-slate-900">
                Belum Ada Data {activeCategoryMeta ? activeCategoryMeta.label : 'Surat Keluar'}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                Klik tombol di bawah untuk membuat surat baru lengkap dengan nomor otomatis, templat resmi madrasah, dan cetak Kop Madrasah.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleOpenCreateForm(
                  selectedCategory !== 'semua' ? selectedCategory : 'surat_keterangan'
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-semibold hover:from-emerald-500 hover:to-teal-500 transition-colors cursor-pointer"
            >
              <MailPlus className="w-4 h-4" />
              <span>Buat {activeCategoryMeta ? activeCategoryMeta.label : 'Surat Baru'}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F5F3EC] border-b border-[#EAE6DB] text-slate-700 font-semibold text-xs">
                  <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                  <th className="px-4 py-3 whitespace-nowrap">Nomor Surat</th>
                  <th className="px-4 py-3 whitespace-nowrap">Jenis Surat</th>
                  <th className="px-4 py-3 min-w-[220px]">Perihal &amp; Tujuan</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE2]">
                {filteredMails.map((mail) => {
                  const catMeta = SURAT_KELUAR_CATEGORIES.find((c) => c.id === mail.category);
                  const isDeleting = confirmDeleteId === mail.id;
                  return (
                    <tr key={mail.id} className="hover:bg-[#F5F3EC]/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {mail.letterDate}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {mail.letterNumber}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-emerald-900 whitespace-nowrap">
                        {catMeta?.label || mail.category}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 leading-snug">{mail.subject}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Kepada: {mail.recipient}
                          {mail.studentName ? ` · Siswa: ${mail.studentName}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            mail.status === 'Terbit' || mail.status === 'Terkirim'
                              ? 'text-emerald-800'
                              : mail.status === 'Draf'
                              ? 'text-amber-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {mail.status} · {mail.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(mail)}
                            disabled={downloadingPdfId === mail.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-semibold hover:from-rose-500 hover:to-pink-500 transition-colors cursor-pointer disabled:opacity-60"
                            title="Unduh Surat Resmi Format PDF (A4)"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>{downloadingPdfId === mail.id ? '...' : 'PDF'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPreviewMail(mail)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#064E3B] text-white text-xs font-medium hover:bg-[#04392B] transition-colors cursor-pointer"
                            title="Pratinjau & Cetak A4 Kop Madrasah"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#F3D88B]" />
                            <span>Cetak</span>
                          </button>

                          {mail.driveUrl && (
                            <a
                              href={mail.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-cyan-300 bg-cyan-50 text-cyan-900 text-xs font-medium hover:bg-cyan-100 transition-colors"
                              title="Buka Arsip Digital"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(mail)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-slate-700 text-xs font-medium hover:bg-[#F5F3EC] transition-colors cursor-pointer"
                            title="Edit Surat"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {isDeleting ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={deletingId === mail.id}
                                onClick={() => handleDelete(mail)}
                                className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50"
                              >
                                {deletingId === mail.id ? '...' : 'Yakin Hapus'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(mail.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors cursor-pointer"
                              title="Hapus Surat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Madrasah Letterhead Preview, Download PDF (A4) & Print A4 Modal */}
      {previewMail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="bg-[#EAE6DC] rounded-2xl max-w-[230mm] w-full shadow-2xl border border-slate-300 overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#062C21] to-[#0B4635] text-white flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F3D88B]">
                  Pratinjau Surat Resmi A4 · Tanda Tangan di Tepi Bawah
                </p>
                <p className="text-sm font-bold truncate">{previewMail.letterNumber}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(previewMail)}
                  disabled={downloadingPdfId === previewMail.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-xs font-bold hover:from-amber-300 hover:to-yellow-300 cursor-pointer shadow-sm disabled:opacity-60"
                >
                  <FileDown className="w-4 h-4" />
                  <span>
                    {downloadingPdfId === previewMail.id ? 'Menyiapkan PDF...' : 'Unduh PDF (A4)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintLetter}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold hover:from-emerald-400 hover:to-teal-400 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMail(null)}
                  className="p-2 rounded-lg bg-[#0B3A2C] text-white hover:bg-[#104A39] cursor-pointer"
                  aria-label="Tutup pratinjau"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-6 max-h-[82vh] overflow-y-auto">
              <div className="w-full max-w-[210mm] min-h-[297mm] mx-auto px-5 py-6 sm:px-[18mm] sm:pt-[14mm] sm:pb-[28mm] bg-white text-slate-900 shadow-md border border-slate-200 flex flex-col justify-between print-letter-sheet">
                <div className="flex-1">
                  {/* Kop Surat Madrasah */}
                  <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center gap-4">
                    <MadrasahLogo
                      logoUrl={madrasahIdentity?.logoUrl}
                      alt={madrasahName}
                      className="w-16 h-16 sm:w-20 sm:h-20 shrink-0"
                    />
                    <div className="flex-1 text-center">
                      <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-slate-800">
                        {madrasahIdentity?.namaYayasan || "Lembaga Pendidikan Ma'arif NU"}
                      </p>
                      <h3 className="text-lg sm:text-2xl font-extrabold uppercase tracking-tight text-slate-950 mt-0.5">
                        {madrasahName}
                      </h3>
                      <p className="text-xs text-slate-700 mt-0.5">
                        {madrasahIdentity
                          ? `NSM: ${madrasahIdentity.nsm} · NPSN: ${madrasahIdentity.npsn} · Akreditasi: ${madrasahIdentity.statusAkreditasi}`
                          : 'Madrasah Ibtidaiyah'}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                        {madrasahIdentity?.alamat || 'Alamat Madrasah'}
                        {madrasahIdentity?.kontakPhone ? ` · Telp: ${madrasahIdentity.kontakPhone}` : ''}
                        {madrasahIdentity?.kontakEmail ? ` · Email: ${madrasahIdentity.kontakEmail}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Surat */}
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-4 text-sm mb-6">
                    <table className="text-sm border-collapse">
                      <tbody>
                        <tr>
                          <td className="pr-3 py-0.5 font-medium text-slate-700">Nomor</td>
                          <td className="pr-2">:</td>
                          <td className="font-mono font-semibold text-slate-900">{previewMail.letterNumber}</td>
                        </tr>
                        <tr>
                          <td className="pr-3 py-0.5 font-medium text-slate-700">Sifat</td>
                          <td className="pr-2">:</td>
                          <td>{previewMail.priority}</td>
                        </tr>
                        <tr>
                          <td className="pr-3 py-0.5 font-medium text-slate-700">Lampiran</td>
                          <td className="pr-2">:</td>
                          <td>{previewMail.attachmentCount || '-'}</td>
                        </tr>
                        <tr>
                          <td className="pr-3 py-0.5 font-medium text-slate-700 align-top">Perihal</td>
                          <td className="pr-2 align-top">:</td>
                          <td className="font-bold text-slate-950">{previewMail.subject}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="text-sm text-slate-800 sm:text-right shrink-0">
                      Lumajang, {formatIndonesianDate(previewMail.letterDate)}
                    </div>
                  </div>

                  <div className="text-sm mb-6">
                    <p>Kepada Yth.</p>
                    <p className="font-semibold text-slate-950">{previewMail.recipient}</p>
                    <p>di Tempat</p>
                  </div>

                  {/* Isi Surat */}
                  <div className="text-sm text-slate-900 leading-relaxed whitespace-pre-line">
                    {previewMail.content}
                  </div>
                </div>

                {/* Tanda Tangan Kepala Madrasah */}
                <div className="flex justify-end mt-auto pt-8 pb-4 sm:pb-0 print-letter-signature">
                  <div className="w-64 text-sm text-slate-900">
                    <p>Lumajang, {formatIndonesianDate(previewMail.letterDate)}</p>
                    <p className="font-medium mt-0.5">{previewMail.signerTitle},</p>
                    <div className="h-16" />
                    <p className="font-bold underline">{previewMail.signerName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
