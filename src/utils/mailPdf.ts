import { jsPDF } from 'jspdf';
import { resolveMadrasahLogoCandidates } from '../lib/validation';
import { MadrasahIdentity, OutgoingMailRecord } from '../types/school';

const INDONESIAN_MONTHS = [
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

function formatIndoDate(isoDate: string): string {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${INDONESIAN_MONTHS[(m - 1) % 12]} ${y}`;
}

async function renderImageUrlToPngDataUrl(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    const timer = window.setTimeout(() => resolve(null), 3500);

    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        const ratio = Math.min(size / (img.naturalWidth || size), size / (img.naturalHeight || size));
        const drawW = (img.naturalWidth || size) * ratio;
        const drawH = (img.naturalHeight || size) * ratio;
        ctx.drawImage(img, (size - drawW) / 2, (size - drawH) / 2, drawW, drawH);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };

    img.src = src;
  });
}

async function createDefaultEmblemPngDataUrl(): Promise<string | null> {
  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 36 36" fill="none">
    <rect width="36" height="36" rx="9" fill="#047857"/>
    <rect x="10.5" y="10.5" width="15" height="15" rx="1.5" stroke="#FDE68A" stroke-width="1.5"/>
    <rect x="10.5" y="10.5" width="15" height="15" rx="1.5" transform="rotate(45 18 18)" stroke="#FDE68A" stroke-width="1.5"/>
    <circle cx="18" cy="18" r="2.75" fill="#FDE68A"/>
  </svg>`;
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  return renderImageUrlToPngDataUrl(dataUri);
}

async function resolveLogoPng(logoUrl?: string): Promise<string | null> {
  const candidates = resolveMadrasahLogoCandidates(logoUrl);
  for (const src of candidates) {
    const png = await renderImageUrlToPngDataUrl(src);
    if (png) return png;
  }
  return createDefaultEmblemPngDataUrl();
}

export interface DownloadOutgoingMailPdfInput {
  mail: OutgoingMailRecord;
  madrasahIdentity: MadrasahIdentity | null;
}

export async function downloadOutgoingMailPdf({
  mail,
  madrasahIdentity,
}: DownloadOutgoingMailPdfInput): Promise<void> {
  // Strict A4 Portrait: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 18;
  const marginRight = 18;
  const contentWidth = pageWidth - marginLeft - marginRight; // 174mm
  const bottomEdgeMargin = 27; // Comfortable 2.7cm margin from bottom A4 edge
  const signatureBlockHeight = 35;
  const signatureAnchorY = pageHeight - bottomEdgeMargin - signatureBlockHeight; // 235mm

  const madrasahName = madrasahIdentity?.namaMadrasah || 'MI Nurul Islam Gedangmas';
  const yayasanName = madrasahIdentity?.namaYayasan || "Lembaga Pendidikan Ma'arif NU";

  // 1. Kop Surat Madrasah
  let y = 14;
  const logoPng = await resolveLogoPng(madrasahIdentity?.logoUrl);
  const logoSize = 21;
  if (logoPng) {
    doc.addImage(logoPng, 'PNG', marginLeft, y, logoSize, logoSize);
  }

  const headerTextX = marginLeft + logoSize + 4;
  const headerTextWidth = contentWidth - logoSize - 4;
  const headerCenterX = headerTextX + headerTextWidth / 2;

  doc.setTextColor(15, 23, 42);
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(yayasanName.toUpperCase(), headerCenterX, y + 4.5, {
    align: 'center',
    maxWidth: headerTextWidth,
  });

  doc.setFontSize(15.5);
  doc.text(madrasahName.toUpperCase(), headerCenterX, y + 10.5, {
    align: 'center',
    maxWidth: headerTextWidth,
  });

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  const accreditationLine = madrasahIdentity
    ? `NSM: ${madrasahIdentity.nsm}  ·  NPSN: ${madrasahIdentity.npsn}  ·  Akreditasi: ${madrasahIdentity.statusAkreditasi}`
    : 'Madrasah Ibtidaiyah';
  doc.text(accreditationLine, headerCenterX, y + 15.5, {
    align: 'center',
    maxWidth: headerTextWidth,
  });

  const contactParts = [
    madrasahIdentity?.alamat || 'Alamat Madrasah',
    madrasahIdentity?.kontakPhone ? `Telp: ${madrasahIdentity.kontakPhone}` : '',
    madrasahIdentity?.kontakEmail ? `Email: ${madrasahIdentity.kontakEmail}` : '',
  ].filter(Boolean);
  const addressLines = doc.splitTextToSize(contactParts.join(' · '), headerTextWidth);
  doc.setFontSize(8.5);
  doc.text(addressLines, headerCenterX, y + 19.8, { align: 'center' });

  const headerBottomY = Math.max(y + logoSize + 2, y + 19.8 + addressLines.length * 3.6 + 1.5);

  // Double Official Line under Kop Surat
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.85);
  doc.line(marginLeft, headerBottomY, pageWidth - marginRight, headerBottomY);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, headerBottomY + 1.3, pageWidth - marginRight, headerBottomY + 1.3);

  // 2. Metadata Surat & Tanggal
  y = headerBottomY + 8.5;
  const dateText = `Lumajang, ${formatIndoDate(mail.letterDate)}`;
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text(dateText, pageWidth - marginRight, y, { align: 'right' });

  const labelX = marginLeft;
  const colonX = marginLeft + 21;
  const valueX = marginLeft + 24;
  const metaMaxWidth = contentWidth - 62;

  const metaRows: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: 'Nomor', value: mail.letterNumber, bold: true },
    { label: 'Sifat', value: mail.priority },
    { label: 'Lampiran', value: mail.attachmentCount || '-' },
    { label: 'Perihal', value: mail.subject, bold: true },
  ];

  for (const row of metaRows) {
    doc.setFont('times', 'normal');
    doc.text(row.label, labelX, y);
    doc.text(':', colonX, y);
    doc.setFont('times', row.bold ? 'bold' : 'normal');
    const wrapped = doc.splitTextToSize(row.value, metaMaxWidth);
    doc.text(wrapped, valueX, y);
    y += Math.max(1, wrapped.length) * 5.2;
  }

  // 3. Tujuan Surat
  y += 4;
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text('Kepada Yth.', marginLeft, y);
  y += 5.2;
  doc.setFont('times', 'bold');
  const recipientLines = doc.splitTextToSize(mail.recipient, contentWidth);
  doc.text(recipientLines, marginLeft, y);
  y += Math.max(1, recipientLines.length) * 5.2;
  doc.setFont('times', 'normal');
  doc.text('di Tempat', marginLeft, y);
  y += 9;

  // 4. Isi Surat (auto-paginated, leaving room for bottom signature)
  const lineHeight = 5.4;
  const maxBodyBottomOnSignaturePage = signatureAnchorY - 6;
  const paragraphs = mail.content.split('\n');

  doc.setFont('times', 'normal');
  doc.setFontSize(11);

  for (const para of paragraphs) {
    if (!para.trim()) {
      y += 3.5;
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 18;
      }
      continue;
    }

    const wrappedLines = doc.splitTextToSize(para, contentWidth);
    for (const line of wrappedLines) {
      if (y + lineHeight > pageHeight - 20) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, marginLeft, y);
      y += lineHeight;
    }
  }

  // If body extended past the signature anchor on the current page, move signature to bottom of next A4 page
  if (y > maxBodyBottomOnSignaturePage) {
    doc.addPage();
  }

  // 5. Tanda Tangan di bagian bawah, dekat dengan tepi bawah A4
  const sigX = pageWidth - marginRight - 64; // 64mm signature column aligned right
  let sigY = signatureAnchorY;

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text(dateText, sigX, sigY);
  sigY += 5.2;

  const titleLines = doc.splitTextToSize(`${mail.signerTitle || 'Kepala Madrasah'},`, 64);
  doc.text(titleLines, sigX, sigY);
  sigY += Math.max(1, titleLines.length) * 5.2;

  // Space for wet signature & stamp
  const signerNameY = pageHeight - bottomEdgeMargin - 2; // 283mm -> very close to bottom edge (297mm)
  const finalNameY = Math.max(sigY + 19, signerNameY);

  doc.setFont('times', 'bold');
  const signerText = mail.signerName || 'Kepala Madrasah';
  doc.text(signerText, sigX, finalNameY);
  const nameWidth = doc.getTextWidth(signerText);
  doc.setLineWidth(0.35);
  doc.line(sigX, finalNameY + 1, sigX + nameWidth, finalNameY + 1);

  const safeFileNumber = mail.letterNumber.replace(/[^a-zA-Z0-9._-]+/g, '_');
  doc.save(`Surat_${safeFileNumber}.pdf`);
}
