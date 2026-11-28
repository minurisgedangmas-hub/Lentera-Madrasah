import * as XLSX from 'xlsx';
import { clampString, LIMITS } from '../lib/validation';
import { MIGradeLevel, SchoolClass, StudentRecord, TeacherGender } from '../types/school';

export const STUDENT_EXCEL_HEADERS = [
  'No.',
  'No. Induk',
  'NISN',
  'Nama Lengkap',
  'NIK',
  'Tempat Lahir',
  'Tanggal Lahir',
  'L/P',
  'Kelas',
  'Nama Ayah',
  'Nama Ibu',
  'Alamat',
] as const;

export interface ParsedStudentInput {
  orderNo: number;
  studentIdNumber: string;
  nisn: string;
  fullName: string;
  nik: string;
  birthPlace: string;
  birthDate: string;
  gender: TeacherGender;
  className: string;
  classId?: string;
  fatherName: string;
  motherName: string;
  address: string;
}

export interface ParsedStudentRow {
  rowNumber: number;
  data: ParsedStudentInput;
  errors: string[];
  isValid: boolean;
}

export interface StudentExcelParseResult {
  sheetName: string;
  rows: ParsedStudentRow[];
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

type StudentFieldKey =
  | 'orderNo'
  | 'studentIdNumber'
  | 'nisn'
  | 'fullName'
  | 'nik'
  | 'birthPlace'
  | 'birthDate'
  | 'gender'
  | 'className'
  | 'fatherName'
  | 'motherName'
  | 'address';

function mapStudentHeaderToField(header: string): StudentFieldKey | null {
  if (!header) return null;
  if (['no', 'nomor', 'nourut', 'urut'].includes(header)) return 'orderNo';
  if (
    header.includes('induk') ||
    header === 'noinduk' ||
    header === 'nomorinduk' ||
    header === 'nis' ||
    header === 'nonis'
  ) {
    return 'studentIdNumber';
  }
  if (header.includes('nisn')) return 'nisn';
  if (
    ['nama', 'namalengkap', 'namasiswa', 'namapesertadidik', 'pesertadidik'].includes(header)
  ) {
    return 'fullName';
  }
  if (['nik', 'nomornik', 'nonik', 'niksiswa'].includes(header)) {
    return 'nik';
  }
  if (['tempatlahir', 'lempatlahir', 'tmplahir', 'kotalahir'].includes(header)) {
    return 'birthPlace';
  }
  if (['tanggallahir', 'tgllahir', 'ttl', 'lahirtanggal'].includes(header)) {
    return 'birthDate';
  }
  if (['lp', 'jeniskelamin', 'kelamin', 'jk', 'gender'].includes(header)) {
    return 'gender';
  }
  if (
    header === 'kls' ||
    header.includes('kelas') ||
    header.includes('rombel') ||
    header === 'tingkat' ||
    header === 'tingkatan'
  ) {
    return 'className';
  }
  if (header.includes('ayah') || header === 'bapak' || header === 'namaayah' || header === 'namabapak') {
    return 'fatherName';
  }
  if (header.includes('ibu') || header === 'namaibu' || header === 'ibukandung') {
    return 'motherName';
  }
  if (['alamat', 'alamatlengkap', 'domisili', 'tempattinggal', 'alamatsiswa'].includes(header)) {
    return 'address';
  }
  return null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatExcelDateValue(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';

  if (typeof raw === 'number' && Number.isFinite(raw)) {
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

  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${pad2(Number(isoMatch[2]))}-${pad2(Number(isoMatch[3]))}`;
  }

  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${pad2(Number(dmyMatch[2]))}-${pad2(Number(dmyMatch[1]))}`;
  }

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
      return clampString(cell.w.trim(), 30);
    }
    return clampString(Math.round(raw).toFixed(0), 30);
  }
  return clampString(String(raw).trim(), 30);
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

const ROMAN_TO_ARABIC_GRADE: Record<string, string> = {
  vi: '6',
  iv: '4',
  v: '5',
  iii: '3',
  ii: '2',
  i: '1',
};

const ARABIC_TO_MI_GRADE: Record<string, MIGradeLevel> = {
  '1': 'I',
  '2': 'II',
  '3': 'III',
  '4': 'IV',
  '5': 'V',
  '6': 'VI',
};

export function normalizeClassKey(raw: string): string {
  let s = raw.toLowerCase().trim();
  if (!s) return '';
  s = s.replace(/^(?:kelas|kls|rombel|tingkat)\s+/i, '').trim();
  const romanMatch = s.match(/^(vi|iv|iii|ii|i|v)(?=[^a-z]|$|[a-z](?:[^a-z]|$))/i);
  if (romanMatch) {
    const mapped = ROMAN_TO_ARABIC_GRADE[romanMatch[1].toLowerCase()];
    if (mapped) {
      s = mapped + s.slice(romanMatch[1].length);
    }
  }
  return s.replace(/[^a-z0-9]/g, '');
}

export function inferGradeLevelFromClassName(raw: string): MIGradeLevel {
  const key = normalizeClassKey(raw);
  const digit = key.match(/^([1-6])/)?.[1];
  if (digit && ARABIC_TO_MI_GRADE[digit]) {
    return ARABIC_TO_MI_GRADE[digit];
  }
  return 'I';
}

export function formatAutoClassName(raw: string): string {
  const stripped = raw.replace(/^(?:kelas|kls)\s+/i, '').trim();
  const base = stripped || raw.trim();
  if (!base) return '1';
  return clampString(base, LIMITS.CLASS_NAME_MAX);
}

export function findMatchingSchoolClass(
  rawClassName: string,
  classes: SchoolClass[]
): SchoolClass | undefined {
  const trimmed = rawClassName.trim();
  if (!trimmed || classes.length === 0) return undefined;

  const lower = trimmed.toLowerCase();
  const exact = classes.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact;

  const targetKey = normalizeClassKey(trimmed);
  if (!targetKey) return undefined;

  const byKey = classes.find((c) => normalizeClassKey(c.name) === targetKey);
  if (byKey) return byKey;

  if (/^[1-6]$/.test(targetKey)) {
    const targetGrade = ARABIC_TO_MI_GRADE[targetKey];
    const gradeMatches = classes.filter(
      (c) => c.gradeLevel === targetGrade || normalizeClassKey(c.name).startsWith(targetKey)
    );
    if (gradeMatches.length === 1) {
      return gradeMatches[0];
    }
  }

  return undefined;
}

export function downloadStudentExcelTemplate(classes?: SchoolClass[]): void {
  const wb = XLSX.utils.book_new();

  const sampleClass1 = classes && classes.length > 0 ? classes[0].name : 'IV A';
  const sampleClass2 = classes && classes.length > 1 ? classes[1].name : sampleClass1;

  const sheetData: Array<Array<string | number>> = [
    [...STUDENT_EXCEL_HEADERS],
    [
      1,
      '1001',
      '3154129001',
      'Aisyah Zahra Putri',
      '3508124120160001',
      'Gedangmas',
      '2016-04-12',
      'P',
      sampleClass1,
      'H. Abdullah',
      'Hj. Aminah',
      'Dsn. Gedangmas RT 01 RW 02',
    ],
    [
      2,
      '1002',
      '3154129002',
      'Muhammad Fatih Al-Ghifari',
      '3508122507160002',
      'Gedangmas',
      '2016-07-25',
      'L',
      sampleClass1,
      'Ahmad Ridwan',
      'Nurul Aini',
      'Jl. KH. Hasyim Asyari No. 12',
    ],
    [
      3,
      '1003',
      '3144129004',
      'Ahmad Rayyan Pratama',
      '3508120311150004',
      'Gedangmas',
      '2015-11-03',
      'L',
      sampleClass2,
      'Bambang Irawan',
      'Siti Maryam',
      'Dsn. Gedangmas Krajan',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 16 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 8 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 40 },
  ];

  // Set No. Induk, NISN, and NIK cells to text type
  for (const addr of ['B2', 'B3', 'B4', 'C2', 'C3', 'C4', 'E2', 'E3', 'E4']) {
    if (ws[addr]) {
      ws[addr].t = 's';
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa MI');

  const registeredClassList =
    classes && classes.length > 0
      ? classes.map((c) => c.name).join(', ')
      : 'IV A, V B';

  const guideData: Array<Array<string>> = [
    ['Kolom', 'Format & Keterangan Pengisian'],
    ['No.', 'Nomor urut siswa (contoh: 1, 2, 3)'],
    ['No. Induk', 'Nomor Induk Siswa di madrasah (contoh: 1001, format teks agar tidak terpotong)'],
    ['NISN', 'Nomor Induk Siswa Nasional (10 digit angka, contoh: 3154129001)'],
    ['Nama Lengkap', 'Nama lengkap siswa sesuai akta kelahiran (wajib diisi, minimal 2 karakter)'],
    ['NIK', 'Nomor Induk Kependudukan siswa (16 digit angka sesuai KK/KIA, contoh: 3508124120160001)'],
    ['Tempat Lahir', 'Kota atau kabupaten kelahiran siswa (contoh: Gedangmas / Lumajang)'],
    ['Tanggal Lahir', 'Format YYYY-MM-DD (contoh: 2016-04-12) atau DD/MM/YYYY'],
    ['L/P', 'Jenis kelamin: isi "L" (Laki-laki) atau "P" (Perempuan)'],
    ['Kelas', `Nama rombel kelas MI yang sesuai di sistem (contoh: ${registeredClassList})`],
    ['Nama Ayah', 'Nama lengkap ayah kandung / wali siswa'],
    ['Nama Ibu', 'Nama lengkap ibu kandung siswa'],
    ['Alamat', 'Alamat tempat tinggal lengkap siswa (dusun, RT/RW, desa/kelurahan)'],
  ];
  const guideWs = XLSX.utils.aoa_to_sheet(guideData);
  guideWs['!cols'] = [{ wch: 18 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(wb, guideWs, 'Petunjuk Pengisian');

  XLSX.writeFile(wb, 'Templat_Data_Siswa_MI.xlsx');
}

export function exportStudentsToExcel(students: StudentRecord[], madrasahName?: string): void {
  const wb = XLSX.utils.book_new();
  const headers = [...STUDENT_EXCEL_HEADERS];

  const rows: Array<Array<string | number>> = [
    headers,
    ...students.map((s, idx) => [
      idx + 1,
      s.studentIdNumber || '-',
      s.nisn,
      s.fullName,
      s.nik || '-',
      s.birthPlace || '-',
      s.birthDate || '-',
      s.gender === 'Perempuan' ? 'P' : 'L',
      s.className,
      s.fatherName || '-',
      s.motherName || '-',
      s.address || '-',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 16 },
    { wch: 28 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 6 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 34 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Siswa MI');
  const slug = (madrasahName || 'Madrasah_MI')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  XLSX.writeFile(wb, `Daftar_Siswa_${slug || 'MI'}.xlsx`);
}

export function exportAlumniToExcel(alumni: StudentRecord[], madrasahName?: string): void {
  const wb = XLSX.utils.book_new();
  const headers = [
    'No.',
    'NISN',
    'Nama Alumni',
    'Jenis Kelamin',
    'Tahun Lulus',
    'Kelas Terakhir',
    'No. Ijazah / SKL',
    'Melanjutkan ke (MTs/SMP)',
    'Nama Orang Tua / Wali',
    'No. HP',
    'Alamat',
  ];

  const rows: Array<Array<string | number>> = [
    headers,
    ...alumni.map((s, idx) => [
      idx + 1,
      s.nisn,
      s.fullName,
      s.gender || '-',
      s.graduationYear || '-',
      s.className,
      s.certificateNumber || '-',
      s.nextSchool || '-',
      s.parentName || '-',
      s.phone || '-',
      s.address || '-',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 30 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 22 },
    { wch: 28 },
    { wch: 24 },
    { wch: 16 },
    { wch: 34 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Data Alumni MI');
  const slug = (madrasahName || 'Madrasah_MI')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
  XLSX.writeFile(wb, `Data_Alumni_${slug || 'MI'}.xlsx`);
}

export async function parseStudentExcelFile(
  file: File,
  classes: SchoolClass[]
): Promise<StudentExcelParseResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
  const targetSheetName =
    wb.SheetNames.find((name) => name.toLowerCase().includes('siswa')) || wb.SheetNames[0];

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

  // Find header row
  let headerRowIdx = 0;
  let columnMap: Partial<Record<StudentFieldKey, number>> = {};

  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const candidateMap: Partial<Record<StudentFieldKey, number>> = {};
    const row = matrix[r] || [];
    row.forEach((cellVal, colIdx) => {
      const mapped = mapStudentHeaderToField(normalizeHeaderKey(cellVal));
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
  if (columnMap.fullName === undefined) missingColumns.push('Nama Lengkap');

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
  const rows: ParsedStudentRow[] = [];

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const rawRow = matrix[r] || [];
    const hasAnyValue = rawRow.some((cell) => String(cell ?? '').trim() !== '');
    if (!hasAnyValue) continue;

    const getCellObj = (colIdx: number | undefined): XLSX.CellObject | undefined => {
      if (colIdx === undefined) return undefined;
      const addr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + colIdx });
      return ws[addr] as XLSX.CellObject | undefined;
    };

    const getVal = (key: StudentFieldKey): unknown => {
      const idx = columnMap[key];
      return idx !== undefined ? rawRow[idx] : '';
    };

    const rawOrder = Number(getVal('orderNo'));
    const orderNo =
      Number.isFinite(rawOrder) && rawOrder >= 0
        ? Math.min(LIMITS.TEACHER_ORDER_MAX, Math.round(rawOrder))
        : rows.length + 1;

    const studentIdNumber = formatIdentifierCell(getCellObj(columnMap.studentIdNumber), getVal('studentIdNumber'));
    const rawNisn = formatIdentifierCell(getCellObj(columnMap.nisn), getVal('nisn'));
    const nisn = rawNisn || (studentIdNumber ? `3150${studentIdNumber}` : String(Date.now()).slice(-8));

    const fullName = clampString(String(getVal('fullName') ?? ''), LIMITS.DISPLAY_NAME_MAX);
    const nik = formatIdentifierCell(getCellObj(columnMap.nik), getVal('nik'));
    const birthPlace = clampString(String(getVal('birthPlace') ?? ''), LIMITS.TEACHER_BIRTH_PLACE_MAX);
    const birthDate = formatExcelDateValue(getVal('birthDate'));
    const genderCheck = normalizeGender(getVal('gender'));

    const rawClassName = String(getVal('className') ?? '').trim();
    let matchedClass = findMatchingSchoolClass(rawClassName, classes);

    if (!matchedClass && !rawClassName && classes.length === 1) {
      matchedClass = classes[0];
    }

    const className = matchedClass
      ? matchedClass.name
      : rawClassName
      ? formatAutoClassName(rawClassName)
      : '';
    const classId = matchedClass ? matchedClass.id : undefined;

    const fatherName = clampString(String(getVal('fatherName') ?? ''), LIMITS.PARENT_NAME_MAX);
    const motherName = clampString(String(getVal('motherName') ?? ''), LIMITS.PARENT_NAME_MAX);
    const address = clampString(String(getVal('address') ?? ''), LIMITS.TEACHER_ADDRESS_MAX);

    const errors: string[] = [];
    if (fullName.length < 2) {
      errors.push('Nama lengkap siswa wajib diisi (minimal 2 karakter)');
    }
    if (!className) {
      errors.push('Kolom Kelas kosong. Isi nama kelas siswa (contoh: 1A, 2A, IV A)');
    }

    rows.push({
      rowNumber: r + 1,
      data: {
        orderNo,
        studentIdNumber,
        nisn,
        fullName,
        nik,
        birthPlace,
        birthDate,
        gender: genderCheck.value,
        className,
        classId,
        fatherName,
        motherName,
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
