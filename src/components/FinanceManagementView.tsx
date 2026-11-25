import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Compass,
  Download,
  Edit3,
  PiggyBank,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LIMITS, todayIsoDate } from '../lib/validation';
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  updateFinanceTransaction,
} from '../services/schoolService';
import {
  FinanceCategory,
  FinanceClassLevel,
  FinancePaymentStatus,
  FinanceTransactionRecord,
  FinanceTransactionType,
  StudentRecord,
} from '../types/school';
import { exportFinanceToExcel } from '../utils/financeExcel';

export type KeuanganSubmenu =
  | 'kas_kelas'
  | 'tabungan_siswa'
  | 'tabungan_wajib_6'
  | 'pembayaran_kursus'
  | 'ekstra_pramuka';

export const CLASS_LEVELS_1_TO_6: FinanceClassLevel[] = [
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
];

const SUBMENU_META: Record<
  KeuanganSubmenu,
  {
    label: string;
    classItemPrefix: string;
    subtitle: string;
    bannerTitle: string;
    bannerDesc: string;
    defaultTitleMasuk: string;
    defaultTitleKeluar: string;
  }
> = {
  kas_kelas: {
    label: 'KAS Kelas 1-6',
    classItemPrefix: 'Kas',
    subtitle: 'Submenu Keuangan Madrasah · Kas Per Kelas (1–6)',
    bannerTitle: 'KAS Kelas 1–6 (Terpisah Per Kelas)',
    bannerDesc:
      'Catat pemasukan dan pengeluaran uang kas secara terpisah untuk masing-masing Kelas 1, Kelas 2, Kelas 3, Kelas 4, Kelas 5, dan Kelas 6.',
    defaultTitleMasuk: 'Iuran Kas Kelas',
    defaultTitleKeluar: 'Pengeluaran Kas Kelas',
  },
  tabungan_siswa: {
    label: 'Tabungan Siswa Kelas 1-6',
    classItemPrefix: 'Tabungan',
    subtitle: 'Submenu Keuangan Madrasah · Tabungan Per Kelas (1–6)',
    bannerTitle: 'Tabungan Siswa Kelas 1–6 (Terpisah Per Kelas)',
    bannerDesc:
      'Kelola setoran dan penarikan tabungan siswa secara terpisah per tingkat Kelas 1 sampai Kelas 6 lengkap dengan saldo masing-masing siswa.',
    defaultTitleMasuk: 'Setoran Tabungan Siswa',
    defaultTitleKeluar: 'Penarikan Tabungan Siswa',
  },
  tabungan_wajib_6: {
    label: 'Tabungan Wajib Kelas 6',
    classItemPrefix: 'Tabungan Wajib',
    subtitle: 'Submenu Keuangan Madrasah · Khusus Kelas 6 MI',
    bannerTitle: 'Tabungan Wajib Kelas 6',
    bannerDesc:
      'Pencatatan khusus tabungan wajib siswa Kelas 6 (persiapan ujian akhir, perpisahan/wisuda, dan kegiatan akhir tahun).',
    defaultTitleMasuk: 'Setoran Tabungan Wajib Kelas 6',
    defaultTitleKeluar: 'Penarikan Tabungan Wajib Kelas 6',
  },
  pembayaran_kursus: {
    label: 'Pembayaran Kursus',
    classItemPrefix: 'Kursus',
    subtitle: 'Submenu Keuangan Madrasah · Pembayaran Kursus Per Kelas (1–6)',
    bannerTitle: 'Pembayaran Kursus Madrasah',
    bannerDesc:
      'Pantau pembayaran kursus dan bimbingan belajar siswa per kelas (Kelas 1–6) beserta status lunas atau cicilan.',
    defaultTitleMasuk: 'Pembayaran Kursus',
    defaultTitleKeluar: 'Pengeluaran Operasional Kursus',
  },
  ekstra_pramuka: {
    label: 'Kegiatan Ekstra Pramuka',
    classItemPrefix: 'Pramuka',
    subtitle: 'Submenu Keuangan Madrasah · Kegiatan Pramuka Per Kelas (1–6)',
    bannerTitle: 'Keuangan Kegiatan Ekstra Pramuka',
    bannerDesc:
      'Catat iuran anggota, pemasukan dana, dan pengeluaran kegiatan ekstrakurikuler Pramuka Madrasah secara terpisah per Kelas 1–6.',
    defaultTitleMasuk: 'Iuran / Dana Kegiatan Pramuka',
    defaultTitleKeluar: 'Pengeluaran Kegiatan Pramuka',
  },
};

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function studentMatchesClassLevel(studentClassName: string, target: FinanceClassLevel): boolean {
  if (target === 'Umum') return true;
  const upper = studentClassName.trim().toUpperCase();
  const levelMap: Record<string, string[]> = {
    'Kelas 1': ['1', 'I'],
    'Kelas 2': ['2', 'II'],
    'Kelas 3': ['3', 'III'],
    'Kelas 4': ['4', 'IV'],
    'Kelas 5': ['5', 'V'],
    'Kelas 6': ['6', 'VI'],
  };
  const tokens = levelMap[target] || [];
  const cleaned = upper.replace(/^KELAS\s+/i, '').trim();
  const firstToken = cleaned.split(/[\s-]+/)[0] || '';
  return tokens.includes(firstToken);
}

const SUBMENU_CARDS: Array<{
  id: KeuanganSubmenu;
  icon: typeof Wallet;
  tag: string;
}> = [
  { id: 'kas_kelas', icon: Wallet, tag: 'Dipisahkan Kelas 1 – 6' },
  { id: 'tabungan_siswa', icon: PiggyBank, tag: 'Dipisahkan Kelas 1 – 6' },
  { id: 'tabungan_wajib_6', icon: ShieldCheck, tag: 'Khusus Kelas 6' },
  { id: 'pembayaran_kursus', icon: BookOpenCheck, tag: 'Lunas & Cicilan' },
  { id: 'ekstra_pramuka', icon: Compass, tag: 'Kegiatan Ekstra' },
];

interface FinanceManagementViewProps {
  transactions: FinanceTransactionRecord[];
  students: StudentRecord[];
  madrasahName?: string;
  activeSubmenu: KeuanganSubmenu | null;
  onChangeSubmenu: (sub: KeuanganSubmenu | null) => void;
  selectedClass: FinanceClassLevel | null;
  onChangeClass: (cls: FinanceClassLevel | null) => void;
}

export function FinanceManagementView({
  transactions,
  students,
  madrasahName,
  activeSubmenu,
  onChangeSubmenu,
  selectedClass,
  onChangeClass,
}: FinanceManagementViewProps) {
  const { firebaseUser, profile } = useAuth();
  const meta = activeSubmenu ? SUBMENU_META[activeSubmenu] : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Semua' | FinanceTransactionType>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Lunas' | 'Cicilan' | 'Belum Lunas'>('Semua');

  // Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransactionRecord | null>(null);
  const [formClassLevel, setFormClassLevel] = useState<FinanceClassLevel>('Kelas 1');
  const [transactionType, setTransactionType] = useState<FinanceTransactionType>('Masuk');
  const [amountInput, setAmountInput] = useState('');
  const [transactionDate, setTransactionDate] = useState(todayIsoDate());
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<FinancePaymentStatus>('Lunas');
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isPerClassSubmenu =
    activeSubmenu === 'kas_kelas' ||
    activeSubmenu === 'tabungan_siswa' ||
    activeSubmenu === 'pembayaran_kursus' ||
    activeSubmenu === 'ekstra_pramuka';
  const isStudentSavingsSubmenu =
    activeSubmenu === 'tabungan_siswa' || activeSubmenu === 'tabungan_wajib_6';
  const activeClassLabel = selectedClass ?? 'Kelas 1';

  // Reset filters/form gracefully when switching submenu or class
  useEffect(() => {
    setFormOpen(false);
    setEditingTx(null);
    setSearchQuery('');
    setTypeFilter('Semua');
    setStatusFilter('Semua');
    setConfirmDeleteId(null);
    setFeedback(null);
    if (activeSubmenu === 'tabungan_wajib_6') {
      setFormClassLevel('Kelas 6');
    } else if (isPerClassSubmenu && selectedClass) {
      setFormClassLevel(selectedClass);
    } else {
      setFormClassLevel('Kelas 1');
    }
  }, [activeSubmenu, selectedClass, isPerClassSubmenu]);

  const activeStudents = useMemo(
    () =>
      students
        .filter((s) => !s.status || s.status === 'Aktif')
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'id-ID')),
    [students]
  );

  // Filter candidate students for dropdown based on active class context
  const candidateStudents = useMemo(() => {
    const targetLvl: FinanceClassLevel =
      activeSubmenu === 'tabungan_wajib_6'
        ? 'Kelas 6'
        : isPerClassSubmenu && selectedClass
        ? selectedClass
        : formClassLevel;

    if (targetLvl === 'Umum') return activeStudents;
    const matched = activeStudents.filter((s) => studentMatchesClassLevel(s.className, targetLvl));
    return matched.length > 0 ? matched : activeStudents;
  }, [activeStudents, activeSubmenu, isPerClassSubmenu, selectedClass, formClassLevel]);

  // Summary per submenu for Keuangan Madrasah hub view
  const submenuSummaries = useMemo(() => {
    return SUBMENU_CARDS.map((card) => {
      const items = transactions.filter((tx) => tx.category === card.id);
      const masuk = items
        .filter((t) => t.transactionType === 'Masuk')
        .reduce((acc, t) => acc + t.amount, 0);
      const keluar = items
        .filter((t) => t.transactionType === 'Keluar')
        .reduce((acc, t) => acc + t.amount, 0);
      return {
        ...card,
        meta: SUBMENU_META[card.id],
        count: items.length,
        saldo: masuk - keluar,
      };
    });
  }, [transactions]);

  // Transactions in the active category
  const categoryTransactions = useMemo(
    () =>
      activeSubmenu
        ? transactions
            .filter((tx) => tx.category === (activeSubmenu as FinanceCategory))
            .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
        : [],
    [transactions, activeSubmenu]
  );

  // Per-class breakdown for Kelas 1-6 (used in KAS Kelas 1-6 & Tabungan Siswa Kelas 1-6)
  const perClassBreakdown = useMemo(() => {
    return CLASS_LEVELS_1_TO_6.map((lvl) => {
      const items = categoryTransactions.filter((t) => t.classLevel === lvl);
      const masuk = items
        .filter((t) => t.transactionType === 'Masuk')
        .reduce((acc, t) => acc + t.amount, 0);
      const keluar = items
        .filter((t) => t.transactionType === 'Keluar')
        .reduce((acc, t) => acc + t.amount, 0);
      const uniqueStudents = new Set(
        items.map((t) => t.studentName.trim().toLowerCase()).filter(Boolean)
      ).size;
      return {
        classLevel: lvl,
        masuk,
        keluar,
        saldo: masuk - keluar,
        count: items.length,
        uniqueStudents,
      };
    });
  }, [categoryTransactions]);

  // Transactions scoped to selected class when inside per-class submenu
  const scopedTransactions = useMemo(() => {
    if (isPerClassSubmenu) {
      return selectedClass
        ? categoryTransactions.filter((tx) => tx.classLevel === selectedClass)
        : categoryTransactions;
    }
    if (activeSubmenu === 'tabungan_wajib_6') {
      return categoryTransactions.filter((tx) => tx.classLevel === 'Kelas 6');
    }
    return categoryTransactions;
  }, [categoryTransactions, isPerClassSubmenu, selectedClass, activeSubmenu]);

  // Summary KPIs for the current view
  const viewStats = useMemo(() => {
    const masuk = scopedTransactions
      .filter((t) => t.transactionType === 'Masuk')
      .reduce((acc, t) => acc + t.amount, 0);
    const keluar = scopedTransactions
      .filter((t) => t.transactionType === 'Keluar')
      .reduce((acc, t) => acc + t.amount, 0);
    const saldo = masuk - keluar;
    const lunasCount = scopedTransactions.filter((t) => t.paymentStatus === 'Lunas').length;
    const cicilanCount = scopedTransactions.filter(
      (t) => t.paymentStatus === 'Cicilan' || t.paymentStatus === 'Belum Lunas'
    ).length;
    const uniqueStudents = new Set(
      scopedTransactions.map((t) => t.studentName.trim().toLowerCase()).filter(Boolean)
    ).size;

    return {
      masuk,
      keluar,
      saldo,
      count: scopedTransactions.length,
      lunasCount,
      cicilanCount,
      uniqueStudents,
    };
  }, [scopedTransactions]);

  // Per-student savings ledger (for Tabungan Siswa Kelas 1-6 & Tabungan Wajib Kelas 6)
  const studentSavingsSummary = useMemo(() => {
    if (!isStudentSavingsSubmenu) return [];
    const map = new Map<
      string,
      { studentName: string; studentId: string; totalSetor: number; totalTarik: number; txCount: number; lastDate: string }
    >();
    for (const tx of scopedTransactions) {
      const displayName = tx.studentName.trim() || 'Siswa Tanpa Nama';
      const key = tx.studentId || displayName.toLowerCase();
      const prev = map.get(key) || {
        studentName: displayName,
        studentId: tx.studentId,
        totalSetor: 0,
        totalTarik: 0,
        txCount: 0,
        lastDate: tx.transactionDate,
      };
      if (tx.transactionType === 'Masuk') {
        prev.totalSetor += tx.amount;
      } else {
        prev.totalTarik += tx.amount;
      }
      prev.txCount += 1;
      if (tx.transactionDate > prev.lastDate) {
        prev.lastDate = tx.transactionDate;
      }
      map.set(key, prev);
    }
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        saldo: item.totalSetor - item.totalTarik,
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'id-ID'));
  }, [scopedTransactions, isStudentSavingsSubmenu]);

  // Filtered table rows
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedTransactions.filter((tx) => {
      if (typeFilter !== 'Semua' && tx.transactionType !== typeFilter) return false;
      if (
        activeSubmenu === 'pembayaran_kursus' &&
        statusFilter !== 'Semua' &&
        tx.paymentStatus !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        tx.title.toLowerCase().includes(q) ||
        tx.studentName.toLowerCase().includes(q) ||
        tx.notes.toLowerCase().includes(q) ||
        tx.classLevel.toLowerCase().includes(q)
      );
    });
  }, [scopedTransactions, searchQuery, typeFilter, activeSubmenu, statusFilter]);

  const resetForm = (overrideType: FinanceTransactionType = 'Masuk') => {
    setEditingTx(null);
    setTransactionType(overrideType);
    setAmountInput('');
    setTransactionDate(todayIsoDate());
    setSelectedStudentId('');
    setStudentNameInput('');
    setTitleInput(
      meta ? (overrideType === 'Masuk' ? meta.defaultTitleMasuk : meta.defaultTitleKeluar) : ''
    );
    setPaymentStatus(activeSubmenu === 'pembayaran_kursus' ? 'Lunas' : '');
    setNotesInput('');
    setFormClassLevel(
      activeSubmenu === 'tabungan_wajib_6'
        ? 'Kelas 6'
        : isPerClassSubmenu && selectedClass
        ? selectedClass
        : 'Kelas 1'
    );
  };

  const handleOpenAdd = (initialType: FinanceTransactionType = 'Masuk') => {
    setFeedback(null);
    resetForm(initialType);
    setFormOpen(true);
  };

  const handleOpenEdit = (tx: FinanceTransactionRecord) => {
    setFeedback(null);
    setEditingTx(tx);
    setFormClassLevel(tx.classLevel);
    setTransactionType(tx.transactionType);
    setAmountInput(String(tx.amount));
    setTransactionDate(tx.transactionDate);
    setSelectedStudentId(tx.studentId || '');
    setStudentNameInput(tx.studentName || '');
    setTitleInput(tx.title);
    setPaymentStatus(tx.paymentStatus || (activeSubmenu === 'pembayaran_kursus' ? 'Lunas' : ''));
    setNotesInput(tx.notes || '');
    setFormOpen(true);
  };

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    if (!id) {
      return;
    }
    const found = activeStudents.find((s) => s.id === id);
    if (found) {
      setStudentNameInput(found.fullName);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile || !activeSubmenu || !meta) return;

    const numericAmount = Number(amountInput.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFeedback({ type: 'error', text: 'Masukkan nominal uang lebih dari Rp 0.' });
      return;
    }
    if (numericAmount > LIMITS.FINANCE_AMOUNT_MAX) {
      setFeedback({
        type: 'error',
        text: `Nominal maksimal ${formatRupiah(LIMITS.FINANCE_AMOUNT_MAX)}.`,
      });
      return;
    }

    const effectiveTitle = titleInput.trim() || (transactionType === 'Masuk' ? meta.defaultTitleMasuk : meta.defaultTitleKeluar);
    if (effectiveTitle.length < 2) {
      setFeedback({ type: 'error', text: 'Keterangan transaksi minimal 2 karakter.' });
      return;
    }

    if (
      (isStudentSavingsSubmenu || activeSubmenu === 'pembayaran_kursus') &&
      studentNameInput.trim().length < 2
    ) {
      setFeedback({ type: 'error', text: 'Pilih atau ketik nama siswa minimal 2 karakter.' });
      return;
    }

    const effectiveClassLevel: FinanceClassLevel =
      activeSubmenu === 'tabungan_wajib_6'
        ? 'Kelas 6'
        : isPerClassSubmenu && selectedClass
        ? selectedClass
        : formClassLevel;

    setSaving(true);
    setFeedback(null);
    try {
      if (editingTx) {
        await updateFinanceTransaction(editingTx, {
          classLevel: effectiveClassLevel,
          transactionType,
          amount: numericAmount,
          transactionDate,
          studentId: selectedStudentId,
          studentName: studentNameInput.trim(),
          title: effectiveTitle,
          paymentStatus: activeSubmenu === 'pembayaran_kursus' ? paymentStatus || 'Lunas' : '',
          notes: notesInput.trim(),
        });
        setFeedback({
          type: 'success',
          text: `Catatan "${effectiveTitle}" (${formatRupiah(numericAmount)}) berhasil diperbarui.`,
        });
      } else {
        await createFinanceTransaction({
          category: activeSubmenu,
          classLevel: effectiveClassLevel,
          transactionType,
          amount: numericAmount,
          transactionDate,
          studentId: selectedStudentId,
          studentName: studentNameInput.trim(),
          title: effectiveTitle,
          paymentStatus: activeSubmenu === 'pembayaran_kursus' ? paymentStatus || 'Lunas' : '',
          notes: notesInput.trim(),
          actorUid: firebaseUser.uid,
          actorName: profile.displayName,
        });
        setFeedback({
          type: 'success',
          text: `Transaksi "${effectiveTitle}" sebesar ${formatRupiah(numericAmount)} (${effectiveClassLevel}) tersimpan.`,
        });
      }
      setFormOpen(false);
      resetForm();
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menyimpan catatan keuangan. Periksa kembali isian formulir Anda.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tx: FinanceTransactionRecord) => {
    setDeletingId(tx.id);
    setFeedback(null);
    try {
      await deleteFinanceTransaction(tx);
      setConfirmDeleteId(null);
      setFeedback({
        type: 'success',
        text: `Catatan "${tx.title}" telah dihapus.`,
      });
    } catch {
      setFeedback({ type: 'error', text: 'Gagal menghapus transaksi.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCurrent = () => {
    if (!meta) return;
    const scopeName =
      isPerClassSubmenu && selectedClass ? `${meta.label}_${selectedClass}` : meta.label;
    exportFinanceToExcel({
      transactions: filteredTransactions,
      sheetTitle: isPerClassSubmenu && selectedClass ? selectedClass : meta.label,
      filePrefix: scopeName.replace(/\s+/g, '_'),
      madrasahName,
    });
  };

  if (!activeSubmenu || !meta) {
    return (
      <div className="space-y-6">
        <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C]">
          <p className="text-xs font-semibold text-[#F3D88B]">
            Administrasi Keuangan Madrasah
          </p>
          <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
            Keuangan Madrasah
          </h1>
          <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1 max-w-2xl">
            Pilih salah satu submenu keuangan di bawah ini (atau melalui bilah menu Keuangan Madrasah) untuk mengelola kas, tabungan, maupun pembayaran per kelas.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {submenuSummaries.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChangeSubmenu(item.id);
                  onChangeClass(item.id === 'tabungan_wajib_6' ? 'Kelas 6' : null);
                }}
                className="w-full text-left bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-4 sm:p-5 hover:border-[#064E3B]/60 hover:bg-[#F5F3EC] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#064E3B]/10 text-[#064E3B] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base font-bold text-slate-900 group-hover:text-[#064E3B] transition-colors">
                        {item.meta.label}
                      </h2>
                      <span className="text-[11px] font-semibold text-[#064E3B] bg-[#064E3B]/8 px-2 py-0.5 rounded-md">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {item.meta.bannerDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EAE6DB]">
                  <div className="sm:text-right">
                    <p className="font-mono text-sm font-bold text-[#062C21] tabular-nums">
                      {formatRupiah(item.saldo)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {item.count} transaksi tercatat
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#064E3B]">
                    <span>Buka</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical Class Submenu Selector (Kelas 1 - Kelas 6 berjejer kebawah) when inside KAS / Tabungan / Kursus / Pramuka without selectedClass
  if (isPerClassSubmenu && !selectedClass) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onChangeClass(null);
              onChangeSubmenu(null);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#DDD9CE] bg-[#FCFBF8] text-xs sm:text-sm font-semibold text-[#064E3B] hover:bg-[#F5F3EC] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Submenu Keuangan Madrasah</span>
          </button>
        </div>

        <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C]">
          <p className="text-xs font-semibold text-[#F3D88B]">{meta.subtitle}</p>
          <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
            {meta.label}
          </h1>
          <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1 max-w-2xl">
            Pilih kelas di bawah ini (Kelas 1 sampai Kelas 6) untuk melihat dan mencatat transaksi khusus kelas tersebut.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {perClassBreakdown.map((item) => (
            <button
              key={item.classLevel}
              type="button"
              onClick={() => onChangeClass(item.classLevel)}
              className="w-full text-left bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl px-5 py-4 hover:border-[#064E3B]/60 hover:bg-[#F5F3EC] transition-colors flex items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-slate-900 group-hover:text-[#064E3B] transition-colors">
                  {meta.classItemPrefix} {item.classLevel}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                  {activeSubmenu === 'tabungan_siswa'
                    ? `${item.uniqueStudents} penabung · ${item.count} transaksi`
                    : `${item.count} transaksi · Masuk ${formatRupiah(item.masuk)}`}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="font-mono text-sm sm:text-base font-bold text-[#062C21] tabular-nums">
                    {formatRupiah(item.saldo)}
                  </p>
                  <p className="text-[11px] text-slate-500">Saldo</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#064E3B] shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex flex-wrap items-center gap-2.5">
        {isPerClassSubmenu ? (
          <>
            <button
              type="button"
              onClick={() => onChangeClass(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#DDD9CE] bg-[#FCFBF8] text-xs sm:text-sm font-semibold text-[#064E3B] hover:bg-[#F5F3EC] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Pilih Kelas Lain ({meta.label})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeClass(null);
                onChangeSubmenu(null);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#DDD9CE] bg-[#FCFBF8] text-xs sm:text-sm font-medium text-slate-700 hover:bg-[#F5F3EC] transition-colors cursor-pointer"
            >
              <span>Menu Keuangan Madrasah</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              onChangeClass(null);
              onChangeSubmenu(null);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#DDD9CE] bg-[#FCFBF8] text-xs sm:text-sm font-semibold text-[#064E3B] hover:bg-[#F5F3EC] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Submenu Keuangan Madrasah</span>
          </button>
        )}
      </div>

      {/* Executive Banner */}
      <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#F3D88B]">
            {meta.subtitle}
            {isPerClassSubmenu ? ` · ${activeClassLabel}` : ''}
          </p>
          <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
            {isPerClassSubmenu ? `${meta.classItemPrefix} ${activeClassLabel}` : meta.bannerTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1 max-w-2xl">{meta.bannerDesc}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {filteredTransactions.length > 0 && (
            <button
              type="button"
              onClick={handleExportCurrent}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2C6B57] bg-[#0B3A2C] text-[#FAF8F2] text-sm font-medium hover:bg-[#104A39] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleOpenAdd('Masuk')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A74A] text-[#062C21] text-sm font-semibold hover:bg-[#DFB763] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {isStudentSavingsSubmenu
                ? 'Catat Setor / Tarik'
                : activeSubmenu === 'pembayaran_kursus'
                ? 'Catat Pembayaran'
                : 'Catat Transaksi'}
            </span>
          </button>
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

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {isStudentSavingsSubmenu
              ? `Total Setoran${isPerClassSubmenu ? ` (${selectedClass})` : ''}`
              : activeSubmenu === 'pembayaran_kursus'
              ? 'Total Pembayaran Masuk'
              : `Total Pemasukan${isPerClassSubmenu ? ` (${selectedClass})` : ''}`}
          </p>
          <p className="font-mono text-xl sm:text-2xl font-bold text-[#064E3B] tabular-nums mt-1.5">
            {formatRupiah(viewStats.masuk)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Akumulasi dana masuk</p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {isStudentSavingsSubmenu
              ? `Total Penarikan${isPerClassSubmenu ? ` (${selectedClass})` : ''}`
              : `Total Pengeluaran${isPerClassSubmenu ? ` (${selectedClass})` : ''}`}
          </p>
          <p className="font-mono text-xl sm:text-2xl font-bold text-amber-700 tabular-nums mt-1.5">
            {formatRupiah(viewStats.keluar)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Akumulasi dana keluar</p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {activeSubmenu === 'pembayaran_kursus'
              ? 'Status Lunas / Cicilan'
              : `Saldo Bersih${isPerClassSubmenu ? ` (${selectedClass})` : ''}`}
          </p>
          {activeSubmenu === 'pembayaran_kursus' ? (
            <>
              <p className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
                {viewStats.lunasCount} Lunas
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {viewStats.cicilanCount} cicilan / belum lunas
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
                {formatRupiah(viewStats.saldo)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Pemasukan dikurangi pengeluaran</p>
            </>
          )}
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            {isStudentSavingsSubmenu ? 'Siswa Menabung' : 'Total Catatan'}
          </p>
          <p className="font-mono text-xl sm:text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {isStudentSavingsSubmenu ? `${viewStats.uniqueStudents} Siswa` : `${viewStats.count} Trx`}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {viewStats.count} riwayat transaksi
          </p>
        </div>
      </div>

      {/* Add / Edit Transaction Form */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#FCFBF8] border border-[#D8D3C6] rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                {editingTx
                  ? `Perbarui Catatan ${meta.label}`
                  : `Tambah Catatan ${meta.label}${isPerClassSubmenu ? ` (${selectedClass})` : ''}`}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Data transaksi tersimpan langsung di basis data Keuangan Madrasah.
              </p>
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

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jenis Transaksi <span className="text-red-600">*</span>
              </label>
              <select
                value={transactionType}
                onChange={(e) => {
                  const nextType = e.target.value as FinanceTransactionType;
                  setTransactionType(nextType);
                  if (!editingTx) {
                    setTitleInput(
                      nextType === 'Masuk' ? meta.defaultTitleMasuk : meta.defaultTitleKeluar
                    );
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              >
                <option value="Masuk">
                  {isStudentSavingsSubmenu
                    ? 'Setor Tabungan (Masuk)'
                    : activeSubmenu === 'pembayaran_kursus'
                    ? 'Pembayaran Kursus (Masuk)'
                    : 'Pemasukan (Masuk)'}
                </option>
                <option value="Keluar">
                  {isStudentSavingsSubmenu ? 'Penarikan Tabungan (Keluar)' : 'Pengeluaran (Keluar)'}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kelas <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                readOnly
                value={activeSubmenu === 'tabungan_wajib_6' ? 'Kelas 6' : activeClassLabel}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-[#064E3B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Transaksi <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums"
              />
            </div>

            {(isStudentSavingsSubmenu || activeSubmenu === 'pembayaran_kursus' || candidateStudents.length > 0) && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih dari Daftar Siswa (Opsional)
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                >
                  <option value="">-- Ketik Nama Manual / Pilih Siswa --</option>
                  {candidateStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.className})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Siswa / Pihak{' '}
                {(isStudentSavingsSubmenu || activeSubmenu === 'pembayaran_kursus') && (
                  <span className="text-red-600">*</span>
                )}
              </label>
              <input
                type="text"
                required={isStudentSavingsSubmenu || activeSubmenu === 'pembayaran_kursus'}
                maxLength={LIMITS.DISPLAY_NAME_MAX}
                value={studentNameInput}
                onChange={(e) => {
                  setStudentNameInput(e.target.value);
                  if (selectedStudentId) setSelectedStudentId('');
                }}
                placeholder="Nama lengkap siswa / penyetor"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nominal (Rp) <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={amountInput}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                  setAmountInput(digitsOnly);
                }}
                placeholder="Contoh: 25000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-sm text-slate-900 tabular-nums"
              />
            </div>

            <div className={activeSubmenu === 'pembayaran_kursus' ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {activeSubmenu === 'pembayaran_kursus'
                  ? 'Nama Kursus / Program'
                  : activeSubmenu === 'ekstra_pramuka'
                  ? 'Nama Kegiatan / Uraian Pramuka'
                  : 'Uraian / Keterangan Transaksi'}{' '}
                <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={LIMITS.FINANCE_TITLE_MAX}
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder={
                  activeSubmenu === 'pembayaran_kursus'
                    ? 'Contoh: Kursus Bahasa Inggris - November'
                    : activeSubmenu === 'ekstra_pramuka'
                    ? 'Contoh: Iuran Persami / Pembelian Tali & Tongkat'
                    : 'Contoh: Iuran Kas Mingguan / Setoran Tabungan'
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>

            {activeSubmenu === 'pembayaran_kursus' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Status Pembayaran
                </label>
                <select
                  value={paymentStatus || 'Lunas'}
                  onChange={(e) => setPaymentStatus(e.target.value as FinancePaymentStatus)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                >
                  <option value="Lunas">Lunas</option>
                  <option value="Cicilan">Cicilan</option>
                  <option value="Belum Lunas">Belum Lunas</option>
                </select>
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                maxLength={LIMITS.FINANCE_NOTES_MAX}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Nomor kuitansi atau catatan khusus lainnya"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#EAE6DB] bg-[#F5F3EC] flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : editingTx ? 'Perbarui Catatan' : 'Simpan Catatan Keuangan'}
            </button>
          </div>
        </form>
      )}

      {/* Per-Student Savings Balance Summary (only for Tabungan Siswa 1-6 & Tabungan Wajib Kelas 6) */}
      {isStudentSavingsSubmenu && studentSavingsSummary.length > 0 && (
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Rekap Saldo Tabungan per Siswa{' '}
              {activeSubmenu === 'tabungan_wajib_6' ? '(Kelas 6)' : `(${selectedClass})`}
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-600">
              {studentSavingsSummary.length} siswa tercatat
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#EAE6DB] text-slate-600 text-xs font-semibold">
                  <th className="px-4 py-3 whitespace-nowrap">No.</th>
                  <th className="px-4 py-3 whitespace-nowrap">Nama Siswa</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Total Setor</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Total Penarikan</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Saldo Akhir</th>
                  <th className="px-4 py-3 whitespace-nowrap">Update Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE2]">
                {studentSavingsSummary.map((row, idx) => (
                  <tr key={`${row.studentId}_${row.studentName}`} className="hover:bg-[#F5F3EC]/70">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {row.studentName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-[#064E3B] text-right whitespace-nowrap">
                      {formatRupiah(row.totalSetor)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-amber-700 text-right whitespace-nowrap">
                      {formatRupiah(row.totalTarik)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-bold tabular-nums text-slate-900 text-right whitespace-nowrap">
                      {formatRupiah(row.saldo)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-500 whitespace-nowrap">
                      {row.lastDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Transaction Ledger Table */}
      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            Riwayat Transaksi {isPerClassSubmenu ? `${meta.label} · ${selectedClass}` : meta.label}
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, uraian, catatan..."
                className="pl-9 pr-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-900 w-52"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'Semua' | FinanceTransactionType)}
              className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-800"
            >
              <option value="Semua">Semua Jenis</option>
              <option value="Masuk">{isStudentSavingsSubmenu ? 'Setor (Masuk)' : 'Pemasukan'}</option>
              <option value="Keluar">{isStudentSavingsSubmenu ? 'Tarik (Keluar)' : 'Pengeluaran'}</option>
            </select>

            {activeSubmenu === 'pembayaran_kursus' && (
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'Semua' | 'Lunas' | 'Cicilan' | 'Belum Lunas')
                }
                className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-white text-xs sm:text-sm text-slate-800"
              >
                <option value="Semua">Semua Status</option>
                <option value="Lunas">Lunas</option>
                <option value="Cicilan">Cicilan</option>
                <option value="Belum Lunas">Belum Lunas</option>
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#FAF9F5] border-b border-[#EAE6DB] text-slate-600 text-xs font-semibold">
                <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3 whitespace-nowrap">Kelas</th>
                <th className="px-4 py-3 whitespace-nowrap">Jenis</th>
                <th className="px-4 py-3 whitespace-nowrap">Nama Siswa / Pihak</th>
                <th className="px-4 py-3 whitespace-nowrap">Uraian / Keterangan</th>
                {activeSubmenu === 'pembayaran_kursus' && (
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                )}
                <th className="px-4 py-3 whitespace-nowrap text-right">Nominal</th>
                <th className="px-4 py-3 whitespace-nowrap">Catatan</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE2]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeSubmenu === 'pembayaran_kursus' ? 9 : 8}
                    className="py-10 text-center text-slate-500"
                  >
                    Belum ada catatan keuangan untuk{' '}
                    {isPerClassSubmenu ? selectedClass : meta.label}. Klik tombol di atas untuk menambah catatan pertama.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F5F3EC]/70">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {tx.transactionDate}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {tx.classLevel}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold ${
                          tx.transactionType === 'Masuk' ? 'text-[#064E3B]' : 'text-amber-700'
                        }`}
                      >
                        {isStudentSavingsSubmenu
                          ? tx.transactionType === 'Masuk'
                            ? 'Setor'
                            : 'Tarik'
                          : tx.transactionType === 'Masuk'
                          ? 'Pemasukan'
                          : 'Pengeluaran'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {tx.studentName || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-800 min-w-[180px]">{tx.title}</td>
                    {activeSubmenu === 'pembayaran_kursus' && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            tx.paymentStatus === 'Lunas'
                              ? 'text-[#064E3B]'
                              : tx.paymentStatus === 'Belum Lunas'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {tx.paymentStatus || 'Lunas'}
                        </span>
                      </td>
                    )}
                    <td
                      className={`px-4 py-3 font-mono text-xs sm:text-sm font-bold tabular-nums text-right whitespace-nowrap ${
                        tx.transactionType === 'Masuk' ? 'text-[#064E3B]' : 'text-amber-700'
                      }`}
                    >
                      {tx.transactionType === 'Masuk' ? '+' : '-'} {formatRupiah(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={tx.notes}>
                      {tx.notes || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {confirmDeleteId === tx.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deletingId === tx.id}
                            onClick={() => void handleDelete(tx)}
                            className="px-2 py-1 rounded bg-red-600 text-white text-xs cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === tx.id ? '...' : 'Hapus'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded border border-slate-300 bg-white text-xs cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tx)}
                            title="Edit catatan"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#064E3B] hover:bg-emerald-50 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(tx.id)}
                            title="Hapus catatan"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
