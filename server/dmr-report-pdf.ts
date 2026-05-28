// @ts-ignore
import PDFDocument from 'pdfkit';

interface DMRRoute {
  sNo: number;
  routeName: string;
  arrivalTime: string;
  dispatchTime: string;
  std200: number;
  dlt500: number;
  fcm500: number;
  fcm1000: number;
  gm450: number;
  noOfTubs: number;
  totalLtrs: number;
  leakAll: number;
}

interface DMRAreaGroup {
  areaName: string;
  routes: DMRRoute[];
}

interface DMRReturn {
  milkType: string;
  returnLtrs: number;
}

interface DMRData {
  unionName: string;
  date: string;
  shift: string;
  areaGroups: DMRAreaGroup[];
  returns: DMRReturn[];
  grandTotals: { std: number; dlt: number; fcm: number; gm: number };
}

const COL_HEADERS = [
  'S.No', 'Route Name', 'Arr.Time', 'Desp.Time',
  'STD 200', 'DLT 500', 'FCM 500', 'FCM 1000',
  'G.M 450', 'No.of Tubs', 'Total Ltrs', 'Leak All.'
];

const COL_WIDTHS = [30, 120, 55, 55, 50, 50, 50, 55, 50, 55, 60, 50];

function drawTableRow(
  doc: any,
  y: number,
  values: (string | number)[],
  opts: { bold?: boolean; fontSize?: number; height?: number } = {}
) {
  const fontSize = opts.fontSize || 7;
  const rowHeight = opts.height || 16;
  const startX = 30;

  doc.fontSize(fontSize);
  if (opts.bold) doc.font('Helvetica-Bold');
  else doc.font('Helvetica');

  let x = startX;
  for (let i = 0; i < values.length; i++) {
    const val = values[i] !== undefined && values[i] !== null ? String(values[i]) : '';
    const w = COL_WIDTHS[i];
    const align = i <= 1 ? 'left' : 'right';
    const padding = 2;
    doc.text(val, x + padding, y + 3, { width: w - padding * 2, align, lineBreak: false });
    x += w;
  }

  return y + rowHeight;
}

function drawTableHeader(doc: any, y: number): number {
  const startX = 30;
  const totalWidth = COL_WIDTHS.reduce((a, b) => a + b, 0);

  doc.lineWidth(0.5);
  doc.rect(startX, y, totalWidth, 18).stroke();

  let x = startX;
  for (let i = 0; i < COL_WIDTHS.length; i++) {
    if (i > 0) {
      doc.moveTo(x, y).lineTo(x, y + 18).stroke();
    }
    x += COL_WIDTHS[i];
  }

  doc.font('Helvetica-Bold').fontSize(7);
  x = startX;
  for (let i = 0; i < COL_HEADERS.length; i++) {
    const w = COL_WIDTHS[i];
    doc.text(COL_HEADERS[i], x + 2, y + 4, { width: w - 4, align: 'center', lineBreak: false });
    x += w;
  }

  return y + 18;
}

function drawRowBorders(doc: any, y: number, height: number) {
  const startX = 30;
  const totalWidth = COL_WIDTHS.reduce((a, b) => a + b, 0);

  doc.lineWidth(0.3);
  doc.rect(startX, y, totalWidth, height).stroke();

  let x = startX;
  for (let i = 1; i < COL_WIDTHS.length; i++) {
    x += COL_WIDTHS[i - 1];
    doc.moveTo(x, y).lineTo(x, y + height).stroke();
  }
}

export function generateDMRReportPDF(data: DMRData): any {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 30, bottom: 30, left: 30, right: 30 },
  });

  doc.font('Helvetica-Bold').fontSize(14);
  doc.text(data.unionName, 30, 30, { align: 'center', width: 782 });

  doc.fontSize(11);
  doc.text(`QUANTITY OF MILK DESPATCHED DETAILS ${data.date} ${data.shift}`, 30, 50, {
    align: 'center',
    width: 782,
  });

  let y = 75;

  for (const area of data.areaGroups) {
    if (y > 480) {
      doc.addPage();
      y = 30;
    }

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(area.areaName, 30, y);
    y += 16;

    y = drawTableHeader(doc, y);

    const totals = {
      std200: 0, dlt500: 0, fcm500: 0, fcm1000: 0,
      gm450: 0, noOfTubs: 0, totalLtrs: 0, leakAll: 0,
    };

    for (const route of area.routes) {
      if (y > 500) {
        doc.addPage();
        y = 30;
        y = drawTableHeader(doc, y);
      }

      const rowY = y;
      const values = [
        route.sNo,
        route.routeName,
        route.arrivalTime,
        route.dispatchTime,
        route.std200 || '',
        route.dlt500 || '',
        route.fcm500 || '',
        route.fcm1000 || '',
        route.gm450 || '',
        route.noOfTubs || '',
        route.totalLtrs || '',
        route.leakAll || '',
      ];

      drawRowBorders(doc, rowY, 16);
      y = drawTableRow(doc, rowY, values);

      totals.std200 += route.std200 || 0;
      totals.dlt500 += route.dlt500 || 0;
      totals.fcm500 += route.fcm500 || 0;
      totals.fcm1000 += route.fcm1000 || 0;
      totals.gm450 += route.gm450 || 0;
      totals.noOfTubs += route.noOfTubs || 0;
      totals.totalLtrs += route.totalLtrs || 0;
      totals.leakAll += route.leakAll || 0;
    }

    const totalsRow = [
      '', 'TOTAL', '', '',
      totals.std200, totals.dlt500, totals.fcm500, totals.fcm1000,
      totals.gm450, totals.noOfTubs, totals.totalLtrs, totals.leakAll,
    ];
    drawRowBorders(doc, y, 16);
    y = drawTableRow(doc, y, totalsRow, { bold: true });

    const pktsRow = [
      '', 'Total No. of Pkts', '', '',
      totals.std200 ? Math.round(totals.std200 / 0.2) : '',
      totals.dlt500 ? Math.round(totals.dlt500 / 0.5) : '',
      totals.fcm500 ? Math.round(totals.fcm500 / 0.5) : '',
      totals.fcm1000 ? Math.round(totals.fcm1000 / 1.0) : '',
      totals.gm450 ? Math.round(totals.gm450 / 0.45) : '',
      '', '', '',
    ];
    drawRowBorders(doc, y, 16);
    y = drawTableRow(doc, y, pktsRow, { bold: true });

    y += 10;

    if (y > 420) {
      doc.addPage();
      y = 30;
    }

    const summaryHeaders = [
      'Milk', 'Total Tubs', 'Total Pkts', 'Issued Mkg in Ltrs',
      'Leak All. in Ltrs', 'Total Desp. in Ltrs',
      'Return to Dairy in Ltrs', 'Grand Total in Ltrs'
    ];
    const summaryColWidths = [60, 70, 70, 100, 90, 100, 110, 100];
    const summaryStartX = 30;
    const summaryTotalWidth = summaryColWidths.reduce((a, b) => a + b, 0);

    doc.lineWidth(0.5);
    doc.rect(summaryStartX, y, summaryTotalWidth, 18).stroke();
    doc.font('Helvetica-Bold').fontSize(7);

    let sx = summaryStartX;
    for (let i = 0; i < summaryHeaders.length; i++) {
      if (i > 0) doc.moveTo(sx, y).lineTo(sx, y + 18).stroke();
      doc.text(summaryHeaders[i], sx + 2, y + 4, {
        width: summaryColWidths[i] - 4, align: 'center', lineBreak: false
      });
      sx += summaryColWidths[i];
    }
    y += 18;

    const milkTypes = [
      { name: 'STD', litres: totals.std200, pktDiv: 0.2 },
      { name: 'DLT', litres: totals.dlt500, pktDiv: 0.5 },
      { name: 'FCM', litres: totals.fcm500 + totals.fcm1000, pktDiv: 0.5 },
      { name: 'GM', litres: totals.gm450, pktDiv: 0.45 },
    ];

    let summaryTotals = {
      tubs: 0, pkts: 0, issued: 0, leak: 0, desp: 0, ret: 0, grand: 0
    };

    for (const mt of milkTypes) {
      const tubs = mt.litres ? Math.round(mt.litres / 10) : 0;
      const pkts = mt.litres ? Math.round(mt.litres / mt.pktDiv) : 0;
      const returnEntry = data.returns.find(r => r.milkType.toUpperCase() === mt.name);
      const retLtrs = returnEntry ? returnEntry.returnLtrs : 0;
      const leakLtrs = mt.name === 'STD' ? totals.leakAll : 0;
      const desp = mt.litres;
      const grand = desp + retLtrs;

      summaryTotals.tubs += tubs;
      summaryTotals.pkts += pkts;
      summaryTotals.issued += mt.litres;
      summaryTotals.leak += leakLtrs;
      summaryTotals.desp += desp;
      summaryTotals.ret += retLtrs;
      summaryTotals.grand += grand;

      const rowVals = [mt.name, tubs, pkts, mt.litres, leakLtrs, desp, retLtrs, grand];

      doc.rect(summaryStartX, y, summaryTotalWidth, 16).stroke();
      sx = summaryStartX;
      doc.font('Helvetica').fontSize(7);
      for (let i = 0; i < rowVals.length; i++) {
        if (i > 0) doc.moveTo(sx, y).lineTo(sx, y + 16).stroke();
        const val = String(rowVals[i]);
        const align = i === 0 ? 'left' : 'right';
        doc.text(val, sx + 2, y + 4, {
          width: summaryColWidths[i] - 4, align, lineBreak: false
        });
        sx += summaryColWidths[i];
      }
      y += 16;
    }

    const totalRowVals = [
      'TOTAL',
      summaryTotals.tubs, summaryTotals.pkts, summaryTotals.issued,
      summaryTotals.leak, summaryTotals.desp, summaryTotals.ret, summaryTotals.grand
    ];

    doc.rect(summaryStartX, y, summaryTotalWidth, 16).stroke();
    sx = summaryStartX;
    doc.font('Helvetica-Bold').fontSize(7);
    for (let i = 0; i < totalRowVals.length; i++) {
      if (i > 0) doc.moveTo(sx, y).lineTo(sx, y + 16).stroke();
      const val = String(totalRowVals[i]);
      const align = i === 0 ? 'left' : 'right';
      doc.text(val, sx + 2, y + 4, {
        width: summaryColWidths[i] - 4, align, lineBreak: false
      });
      sx += summaryColWidths[i];
    }
    y += 16;

    y += 20;
  }

  y += 30;
  if (y > 500) {
    doc.addPage();
    y = 450;
  }

  doc.font('Helvetica').fontSize(9);
  doc.text('Duty Staff / Milk Recorder', 60, y, { width: 200, align: 'left' });
  doc.text('Shift Technical Officer', 550, y, { width: 200, align: 'right' });

  y += 25;
  doc.moveTo(60, y).lineTo(220, y).stroke();
  doc.moveTo(600, y).lineTo(760, y).stroke();

  return doc;
}
