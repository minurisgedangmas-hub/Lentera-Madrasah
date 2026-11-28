import * as XLSX from 'xlsx';
import { OutgoingMailCategory, OutgoingMailRecord } from '../types/school';

const CATEGORY_LABEL_MAP: Record<OutgoingMailCategory, string> = {
  surat_keterangan: 'Surat Keterangan',
  undangan: 'Undangan',
  pemberitahuan: 'Pemberitahuan',
  surat_mutasi: 'Surat Mutasi',
  surat_lainnya: 'Surat Lainnya',
};

export function exportOutgoingMailsToExcel(input: {
  mails: OutgoingMailRecord[];
  sheetTitle: string;
  filePrefix: string;
  madrasahName?: string;
}) {
  const rows = input.mails.map((mail, idx) => ({
    'No.': idx + 1,
    'Tanggal Surat': mail.letterDate,
    'Nomor Surat': mail.letterNumber,
    'Jenis Surat': CATEGORY_LABEL_MAP[mail.category] || mail.category,
    Perihal: mail.subject,
    'Tujuan / Penerima': mail.recipient,
    Sifat: mail.priority,
    Lampiran: mail.attachmentCount || '-',
    'Siswa Terkait': mail.studentName || '-',
    Status: mail.status,
    Penandatangan: `${mail.signerName} (${mail.signerTitle})`,
    'Link Arsip Digital': mail.driveUrl || '-',
    'Dicatat Oleh': mail.createdByName,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 24 },
    { wch: 18 },
    { wch: 32 },
    { wch: 26 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 28 },
    { wch: 28 },
    { wch: 22 },
  ];

  const safeSheetName = input.sheetTitle.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'SuratKeluar';
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const safeBrand = (input.madrasahName || 'Madrasah')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 28);
  const dateTag = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${input.filePrefix}_${safeBrand}_${dateTag}.xlsx`);
}
