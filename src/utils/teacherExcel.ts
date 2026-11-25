import * as XLSX from 'xlsx';
import { clampString, LIMITS } from '../lib/validation';
import { TeacherGender, TeacherRecord } from '../types/school';

export const TEACHER_EXCEL_HEADERS = [
  'No.',
  'Nama',
  'Tempat Lahir',
  'Tanggal Lahir',
  'Jenis Kelamin',
  'NUPTK / NPK / Peg. Id',
  'TMT',
  'Jabatan',
  'No. HP',
  'Alamat',
] as const;

export interface ParsedTeacherInput {
  orderNo: number;
  fullName: string;
  birthPlace: string;
  birthDate: string;
  gender: TeacherGender;
  nuptkNpkPegId: string;
  tmt: string;
  position: string;
  phone: string;
  address: string;
}

export interface ParsedTeacherRow {
  rowNumber: number;
  data: ParsedTeacherInput;
  errors: string[];
  isValid: boolean;
}

export interface TeacherExcelParseResult {
  sheetName: string;
  rows: ParsedTeacherRow[];
  validCount: number;
  invalidCount: number;
  missingColumns: string[];
}

const INDONESIAN_MONTHS: Record<string, string> = {
  januari: '01',
  jan: '01',
  februari: '02',
  feb: '02',
  pebruari: '02',
  maret: '03',
  mar: '03',
  april: '04',
  apr: '04',
  mei: '05',
  may: '05',
  juni: '06',
  jun: '06',
  juli: '07',
  jul: '07',
  agustus: '08',
  agu: '08',
  ags: '08',
  september: '09',
  sep: '09',
  sept: '09',
  oktober: '10',
  okt: '10',
  oct: '10',
  november: '11',
  nov: '11',
  nopember: '11',
  desember: '12',
  des: '12',
  dec: '12',
};

function normalizeHeaderKey(raw: unknown): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

type FieldKey =
  | 'orderNo'
  | 'fullName'
  | 'birthPlace'
  | 'birthDate'
  | 'gender'
  | 'nuptkNpkPegId'
  | 'tmt'
  | 'position'
  | 'phone'
  | 'address';

function mapHeaderToField(header: string): FieldKey | null {
  if (!header) return null;
  if (['no', 'nomor', 'nourut', 'urut'].includes(header)) return 'orderNo';
  if (['nama', 'namalengkap', 'namaguru', 'namapendidik'].includes(header)) return 'fullName';
  if (['tempatlahir', 'lempatlahir', 'tmplahir', 'kotalahir'].includes(header)) return 'birthPlace';
  if (['tanggallahir', 'tgllahir', 'ttl'].includes(header)) return 'birthDate';
  if (['jeniskelamin', 'kelamin', 'jk', 'gender', 'lp'].includes(header)) return 'gender';
  if (
    header.includes('nuptk') ||
    header.includes('nupt') ||
    header.includes('npk') ||
    header.includes('pegid') ||
    header === 'nip' ||
    header === 'niy'
  ) {
    return 'nuptkNpkPegId';
  }
  if (['tmt', 'tanggalmulaitugas', 'tglmulaitugas', 'mulaitugas'].includes(header)) return 'tmt';
  if (['jabatan', 'jabatanstruktural', 'tugas', 'posisijabatan'].includes(header)) return 'position';
  if (['nohp', 'hp', 'nomorhp', 'telepon', 'notelp', 'telp', 'wa', 'nowa', 'whatsapp'].includes(header)) {
    return 'phone';
  }
  if (['alamat', 'alamatlengkap', 'domisili', 'tempattinggal'].includes(header)) return 'address';
  return null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatExcelDateValue(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Valid Excel date serial range (1900..2100 roughly 1..73050)
    if (raw >= 1 && raw <= 90000) {
      const parsed = XLSX.SSF.parse_date_code(raw);
      if (parsed && parsed.y >= 1900 && parsed.m >= 1 && parsed.d >= 1) {
        return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`;
      }
    }
    return clampString(String(raw), LIMITS.TEACHER_DATE_MAX);
  }

  const str = String(raw).trim();
  if (!str) return '';

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${pad2(Number(isoMatch[2]))}-${pad2(Number(isoMatch[3]))}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${pad2(Number(dmyMatch[2]))}-${pad2(Number(dmyMatch[1]))}`;
  }

  // Indonesian text date e.g. "14 Mei 1978"
  const textMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (textMatch) {
    const month = INDONESIAN_MONTHS[textMatch[2].toLowerCase()];
    if (month) {
      return `${textMatch[3]}-${month}-${pad2(Number(textMatch[1]))}`;
    }
  }

  return clampString(str, LIMITS.TEACHER_DATE_MAX);
}

function formatIdentifierCell(cell: XLSX.CellObject | undefined, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (cell?.w && !/[eE][+-]?\d+/.test(cell.w)) {
      return clampString(cell.w, LIMITS.TEACHER_ID_NUMBER_MAX);
    }
    return clampString(Math.round(raw).toFixed(0), LIMITS.TEACHER_ID_NUMBER_MAX);
  }
  return clampString(String(raw), LIMITS.TEACHER_ID_NUMBER_MAX);
}

function formatPhoneCell(cell: XLSX.CellObject | undefined, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    let digits = cell?.w && !/[eE][+-]?\d+/.test(cell.w)
      ? cell.w.trim()
      : Math.round(raw).toFixed(0);
    if (/^8\d{7,14}$/.test(digits)) {
      digits = `0${digits}`;
    }
    return clampString(digits, LIMITS.TEACHER_PHONE_MAX);
  }
  return clampString(String(raw), LIMITS.TEACHER_PHONE_MAX);
}

function normalizeGender(raw: unknown): { value: TeacherGender; valid: boolean } {
  const clean = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  if (!clean) return { value: 'Laki-laki', valid: false };
  if (['l', 'lk', 'laki', 'lakilaki', 'pria', 'male', 'm'].includes(clean)) {
    return { value: 'Laki-laki', valid: true };
  }
  if (['p', 'pr', 'perempuan', 'wanita', 'female', 'f'].includes(clean)) {
    return { value: 'Perempuan', valid: true };
  }
  return { value: 'Laki-laki', valid: false };
}

export function downloadTeacherExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const sheetData: Array<Array<string | number>> = [
    [...TEACHER_EXCEL_HEADERS],
    [
      1,
      'H. Ahmad Fauzi, S.Pd.I., M.Pd.',
      'Bekasi',
      '1978-05-14',
      'Laki-laki',
      '197805142005011004',
      '2005-01-10',
      'Kepala Madrasah',
      '081234567890',
      'Jl. KH. Ahmad Dahlan No. 24, Bekasi Timur',
    ],
    [
      2,
      'Ustadzah Siti Aminah, S.Pd.I.',
      'Bandung',
      '1986-09-21',
      'Perempuan',
      '8253764665300012',
      '2011-07-01',
      'Wali Kelas IV A',
      '085698765432',
      'Jl. Pesantren Raya No. 12, Bekasi',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 24 },
    { wch: 15 },
    { wch: 22 },
    { wch: 16 },
    { wch: 42 },
  ];

  // Format identifier and phone cells as text in sample rows
  for (const addr of ['F2', 'F3', 'I2', 'I3']) {
    if (ws[addr]) {
      ws[addr].t = 's';
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Data Guru MI');

  const guideData: Array<Array<string>> = [
    ['Kolom', 'Keterangan & Format Pengisian'],
    ['No.', 'Nomor urut guru (angka bulat, contoh: 1, 2, 3)'],
    ['Nama', 'Nama lengkap beserta gelar (wajib diisi, minimal 2 karakter)'],
    ['Tempat Lahir', 'Kota atau kabupaten kelahiran guru'],
    ['Tanggal Lahir', 'Format YYYY-MM-DD (contoh: 1986-09-21) atau DD/MM/YYYY'],
    ['Jenis Kelamin', 'Isi "Laki-laki" / "Perempuan" atau disingkat "L" / "P"'],
    ['NUPTK / NPK / Peg. Id', 'Nomor NUPTK, NPK, Peg. Id, atau NIP/NIY (format teks agar angka tidak terpotong)'],
    ['TMT', 'Terhitung Mulai Tanggal bertugas (format YYYY-MM-DD atau DD/MM/YYYY)'],
    ['Jabatan', 'Jabatan / tugas utama di Madrasah (wajib diisi, contoh: Kepala Madrasah, Wali Kelas IV A, Guru PAI)'],
    ['No. HP', 'Nomor telepon / WhatsApp aktif (contoh: 081234567890)'],
    ['Alamat', 'Alamat domisili lengkap guru'],
  ];
  const guideWs = XLSX.utils.aoa_to_sheet(guideData);
  guideWs['!cols'] = [{ wch: 24 }, { wch: 68 }];
  XLSX.utils.book_append_sheet(wb, guideWs, 'Petunjuk Pengisian');

  XLSX.writeFile(wb, 'Templat_Data_Guru_MI.xlsx');
}

export function exportTeachersToExcel(teachers: TeacherRecord[], madrasahName?: string): void {
  const wb = XLSX.utils.book_new();
  const rows: Array<Array<string | number>> = [
    [...TEACHER_EXCEL_HEADERS],
    ...teachers.map((t, idx) => [
      t.orderNo || idx + 1,
      t.fullName,
      t.birthPlace,
      t.birthDate,
      t.gender,
      t.nuptkNpkPegId,
      t.tmt,
      t.position,
      t.phone,
      t.address,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 24 },
    { wch: 15 },
    { wch: 22 },
    { wch: 16 },
    { wch: 42 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Data Guru MI');
  const slug = (madrasahName || 'Madrasah_MI')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
  XLSX.writeFile(wb, `Data_Guru_${slug || 'MI'}.xlsx`);
}

export async function parseTeacherExcelFile(file: File): Promise<TeacherExcelParseResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const targetSheetName =
    wb.SheetNames.find((name) => name.toLowerCase().includes('guru')) || wb.SheetNames[0];

  if (!targetSheetName) {
    return {
      sheetName: '',
      rows: [],
      validCount: 0,
      invalidCount: 0,
      missingColumns: ['Sheet Excel tidak ditemukan'],
    };
  }

  const ws = wb.Sheets[targetSheetName];
  const matrix = XLSX.utils.sheet_to_json<Array<unknown>>(ws, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (matrix.length === 0) {
    return {
      sheetName: targetSheetName,
      rows: [],
      validCount: 0,
      invalidCount: 0,
      missingColumns: ['Berkas Excel kosong'],
    };
  }

  // Locate header row (first row containing at least "nama" and one other expected column)
  let headerRowIdx = 0;
  let columnMap: Partial<Record<FieldKey, number>> = {};

  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const candidateMap: Partial<Record<FieldKey, number>> = {};
    const row = matrix[r] || [];
    row.forEach((cellVal, colIdx) => {
      const mapped = mapHeaderToField(normalizeHeaderKey(cellVal));
      if (mapped && candidateMap[mapped] === undefined) {
        candidateMap[mapped] = colIdx;
      }
    });
    if (candidateMap.fullName !== undefined && Object.keys(candidateMap).length >= 3) {
      headerRowIdx = r;
      columnMap = candidateMap;
      break;
    }
  }

  const missingColumns: string[] = [];
  if (columnMap.fullName === undefined) missingColumns.push('Nama');
  if (columnMap.position === undefined) missingColumns.push('Jabatan');

  if (missingColumns.length > 0 && Object.keys(columnMap).length < 2) {
    return {
      sheetName: targetSheetName,
      rows: [],
      validCount: 0,
      invalidCount: 0,
      missingColumns,
    };
  }

  const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 } };
  const rows: ParsedTeacherRow[] = [];

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const rawRow = matrix[r] || [];
    const hasAnyValue = rawRow.some((cell) => String(cell ?? '').trim() !== '');
    if (!hasAnyValue) continue;

    const getCellObj = (colIdx: number | undefined): XLSX.CellObject | undefined => {
      if (colIdx === undefined) return undefined;
      const addr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + colIdx });
      return ws[addr] as XLSX.CellObject | undefined;
    };

    const getVal = (key: FieldKey): unknown => {
      const idx = columnMap[key];
      return idx !== undefined ? rawRow[idx] : '';
    };

    const rawOrder = Number(getVal('orderNo'));
    const orderNo =
      Number.isFinite(rawOrder) && rawOrder >= 0
        ? Math.min(LIMITS.TEACHER_ORDER_MAX, Math.round(rawOrder))
        : rows.length + 1;

    const fullName = clampString(String(getVal('fullName') ?? ''), LIMITS.DISPLAY_NAME_MAX);
    const birthPlace = clampString(String(getVal('birthPlace') ?? ''), LIMITS.TEACHER_BIRTH_PLACE_MAX);
    const birthDate = formatExcelDateValue(getVal('birthDate'));
    const genderCheck = normalizeGender(getVal('gender'));
    const nuptkNpkPegId = formatIdentifierCell(getCellObj(columnMap.nuptkNpkPegId), getVal('nuptkNpkPegId'));
    const tmt = formatExcelDateValue(getVal('tmt'));
    const position = clampString(String(getVal('position') ?? ''), LIMITS.TEACHER_POSITION_MAX);
    const phone = formatPhoneCell(getCellObj(columnMap.phone), getVal('phone'));
    const address = clampString(String(getVal('address') ?? ''), LIMITS.TEACHER_ADDRESS_MAX);

    const errors: string[] = [];
    if (fullName.length < 2) {
      errors.push('Nama guru wajib diisi (minimal 2 karakter)');
    }
    if (position.length < 1) {
      errors.push('Jabatan wajib diisi');
    }
    if (String(getVal('gender') ?? '').trim() !== '' && !genderCheck.valid) {
      errors.push('Jenis Kelamin harus Laki-laki/Perempuan (atau L/P)');
    }

    rows.push({
      rowNumber: r + 1,
      data: {
        orderNo,
        fullName,
        birthPlace,
        birthDate,
        gender: genderCheck.value,
        nuptkNpkPegId,
        tmt,
        position,
        phone,
        address,
      },
      errors,
      isValid: errors.length === 0,
    });
  }

  return {
    sheetName: targetSheetName,
    rows,
    validCount: rows.filter((r) => r.isValid).length,
    invalidCount: rows.filter((r) => !r.isValid).length,
    missingColumns,
  };
}
