import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type PdfDeviceRow = {
  deviceId: string;
  deviceName?: string;
  deviceLocation?: string;
  totalEnergy: number;
  totalWater: number;
};

export type PdfDailyReport = {
  date: string;
  devices: PdfDeviceRow[];
  totalEnergy: number;
  totalWater: number;
};

export type PdfWeeklyReport = {
  weekStart: string;
  weekEnd: string;
  devices: PdfDeviceRow[];
  totalEnergy: number;
  totalWater: number;
};

export type PdfMonthlyReport = {
  month: string;
  devices: PdfDeviceRow[];
  totalEnergy: number;
  totalWater: number;
};

export type PdfYearlyReport = {
  year: string;
  devices: PdfDeviceRow[];
  totalEnergy: number;
  totalWater: number;
};

export type ReportPdfPayload =
  | { kind: 'daily'; report: PdfDailyReport; title: string }
  | { kind: 'weekly'; report: PdfWeeklyReport; title: string }
  | { kind: 'monthly'; report: PdfMonthlyReport; title: string }
  | { kind: 'yearly'; report: PdfYearlyReport; title: string };

function deviceTableBody(devices: PdfDeviceRow[]) {
  return devices.map((d) => [
    d.deviceName || d.deviceId,
    d.deviceLocation ?? '—',
    `${d.totalEnergy.toFixed(2)} kWh`,
    `${d.totalWater.toFixed(2)} L`
  ]);
}

function safeFilenamePart(s: string) {
  return s.replace(/[/\\?%*:|"<>]/g, '-');
}

export function buildReportPdfPayload(payload: ReportPdfPayload): {
  base64: string;
  filename: string;
} {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  let y = margin;

  doc.setFontSize(16);
  doc.text(payload.title, margin, y);
  y += 8;

  doc.setFontSize(10);
  let period = '';
  let devices: PdfDeviceRow[] = [];
  let totalE = 0;
  let totalW = 0;

  if (payload.kind === 'daily') {
    period = payload.report.date;
    devices = payload.report.devices;
    totalE = payload.report.totalEnergy;
    totalW = payload.report.totalWater;
  } else if (payload.kind === 'weekly') {
    period = `${payload.report.weekStart} – ${payload.report.weekEnd}`;
    devices = payload.report.devices;
    totalE = payload.report.totalEnergy;
    totalW = payload.report.totalWater;
  } else if (payload.kind === 'monthly') {
    period = payload.report.month;
    devices = payload.report.devices;
    totalE = payload.report.totalEnergy;
    totalW = payload.report.totalWater;
  } else {
    period = payload.report.year;
    devices = payload.report.devices;
    totalE = payload.report.totalEnergy;
    totalW = payload.report.totalWater;
  }

  doc.text(`Period: ${period}`, margin, y);
  y += 6;
  doc.text(`Total energy: ${totalE.toFixed(2)} kWh`, margin, y);
  y += 5;
  doc.text(`Total water: ${totalW.toFixed(2)} L`, margin, y);
  y += 10;

  if (devices.length === 0) {
    doc.setFontSize(11);
    doc.text('No device rows for this period.', margin, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Device', 'Location', 'Energy', 'Water']],
      body: deviceTableBody(devices),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 98, 255] },
      margin: { left: margin, right: margin }
    });
  }

  const dataUri = doc.output('datauristring') as string;
  const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;

  const tag =
    payload.kind === 'daily'
      ? `daily-${safeFilenamePart(payload.report.date)}`
      : payload.kind === 'weekly'
        ? `weekly-${safeFilenamePart(payload.report.weekStart)}`
        : payload.kind === 'monthly'
          ? `monthly-${safeFilenamePart(payload.report.month)}`
          : `yearly-${safeFilenamePart(payload.report.year)}`;

  return {
    base64,
    filename: `water-report-${tag}.pdf`
  };
}
