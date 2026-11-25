import * as XLSX from 'xlsx';
import { FinanceTransactionRecord } from '../types/school';

function formatRupiahPlain(amount: number): number {
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

export function exportFinanceToExcel(input: {
  transactions: FinanceTransactionRecord[];
  sheetTitle: string;
  filePrefix: string;
  madrasahName?: string;
}) {
  const rows = input.transactions.map((tx, idx) => ({
    'No.': idx + 1,
    Tanggal: tx.transactionDate,
    Kelas: tx.classLevel,
    Jenis: tx.transactionType === 'Masuk' ? 'Pemasukan' : 'Pengeluaran',
    'Nama Siswa / Pihak': tx.studentName || '-',
    'Uraian / Keterangan': tx.title,
    'Nominal (Rp)': formatRupiahPlain(tx.amount),
    Status: tx.paymentStatus || '-',
    Catatan: tx.notes || '-',
    'Dicatat Oleh': tx.createdByName,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 13 },
    { wch: 11 },
    { wch: 13 },
    { wch: 24 },
    { wch: 30 },
    { wch: 16 },
    { wch: 14 },
    { wch: 26 },
    { wch: 22 },
  ];

  const safeSheetName = input.sheetTitle.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Keuangan';
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const safeBrand = (input.madrasahName || 'Madrasah')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 28);
  const dateTag = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${input.filePrefix}_${safeBrand}_${dateTag}.xlsx`);
}
