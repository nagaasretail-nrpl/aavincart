// @ts-ignore
import PDFDocument from "pdfkit";

interface DispatchItem {
  milkType: string;
  qtyPackets: number;
  litres: number;
}

interface TripSheetData {
  unionName: string;
  date: string;
  shift: string;
  routeName: string;
  areaGroup: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  dispatchItems: DispatchItem[];
  arrivalTime: string;
  dispatchTime: string;
  leakAllowance: number;
  totalLitres: number;
  totalPackets: number;
}

const MILK_TYPE_LABELS: Record<string, string> = {
  STD200: "Standardized Milk (200ml)",
  DLT500: "Delite Milk (500ml)",
  FCM500: "Full Cream Milk (500ml)",
  FCM1000: "Full Cream Milk (1000ml)",
  GM450: "Good Morning Milk (450ml)",
};

const PACK_SIZES: Record<string, number> = {
  STD200: 0.2,
  DLT500: 0.5,
  FCM500: 0.5,
  FCM1000: 1.0,
  GM450: 0.45,
};

export function generateTripSheetPDF(data: TripSheetData): any {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  const pageWidth = doc.page.width - 80;
  const leftMargin = 40;

  doc.font("Helvetica-Bold").fontSize(13).text(
    "THE SALEM DISTRICT CO-OPERATIVE MILK PRODUCERS UNION LTD., SALEM",
    leftMargin,
    40,
    { width: pageWidth, align: "center" }
  );

  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(11).text(
    "TRIP SHEET - FRESH MILK DISPATCH",
    leftMargin,
    doc.y,
    { width: pageWidth, align: "center" }
  );

  doc.moveDown(1);

  const infoY = doc.y;
  const col1X = leftMargin;
  const col2X = leftMargin + pageWidth / 2;

  doc.font("Helvetica").fontSize(9);

  const infoLines = [
    { left: `Date: ${data.date}`, right: `Vehicle No: ${data.vehicleNo}` },
    { left: `Shift: ${data.shift}`, right: `Driver Name: ${data.driverName}` },
    { left: `Route: ${data.routeName}`, right: `Driver Phone: ${data.driverPhone}` },
    { left: `Area: ${data.areaGroup}`, right: "" },
  ];

  let currentY = infoY;
  for (const line of infoLines) {
    doc.text(line.left, col1X, currentY);
    if (line.right) {
      doc.text(line.right, col2X, currentY);
    }
    currentY += 14;
  }

  doc.y = currentY + 10;

  const colWidths = [40, 200, 70, 90, 80];
  const tableX = leftMargin;
  const headers = ["S.No", "Product", "Pack Size", "Qty (Packets)", "Litres"];

  const drawTableRow = (cols: string[], y: number, bold: boolean = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    let x = tableX;
    for (let i = 0; i < cols.length; i++) {
      doc.rect(x, y, colWidths[i], 20).stroke();
      doc.text(cols[i], x + 4, y + 5, {
        width: colWidths[i] - 8,
        align: i === 0 || i >= 2 ? "center" : "left",
      });
      x += colWidths[i];
    }
  };

  let tableY = doc.y;

  drawTableRow(headers, tableY, true);
  tableY += 20;

  data.dispatchItems.forEach((item, index) => {
    const label = MILK_TYPE_LABELS[item.milkType] || item.milkType;
    const packSize = PACK_SIZES[item.milkType];
    const packSizeStr = packSize !== undefined ? `${packSize} L` : "-";

    drawTableRow(
      [
        String(index + 1),
        label,
        packSizeStr,
        String(item.qtyPackets),
        item.litres.toFixed(2),
      ],
      tableY
    );
    tableY += 20;
  });

  drawTableRow(
    ["", "TOTAL", "", String(data.totalPackets), data.totalLitres.toFixed(2)],
    tableY,
    true
  );
  tableY += 20;

  doc.y = tableY + 15;
  doc.font("Helvetica").fontSize(9);

  doc.text(`Arrival Time: ${data.arrivalTime}`, leftMargin, doc.y);
  doc.moveDown(0.4);
  doc.text(`Dispatch Time: ${data.dispatchTime}`, leftMargin, doc.y);
  doc.moveDown(0.4);
  doc.text(`Leak Allowance: ${data.leakAllowance} litres`, leftMargin, doc.y);

  doc.moveDown(2.5);

  const sigY = doc.y;
  const sigWidth = pageWidth / 3;

  doc.font("Helvetica").fontSize(9);

  doc.moveTo(leftMargin, sigY).lineTo(leftMargin + sigWidth - 20, sigY).stroke();
  doc.text("Driver Signature", leftMargin, sigY + 5, { width: sigWidth - 20, align: "center" });

  doc.moveTo(leftMargin + sigWidth, sigY).lineTo(leftMargin + sigWidth * 2 - 20, sigY).stroke();
  doc.text("Duty Staff / Milk Recorder", leftMargin + sigWidth, sigY + 5, { width: sigWidth - 20, align: "center" });

  doc.moveTo(leftMargin + sigWidth * 2, sigY).lineTo(leftMargin + sigWidth * 3, sigY).stroke();
  doc.text("Shift Technical Officer", leftMargin + sigWidth * 2, sigY + 5, { width: sigWidth, align: "center" });

  doc.moveDown(3);
  doc.font("Helvetica").fontSize(8).text(
    "This is a computer generated document",
    leftMargin,
    doc.y,
    { width: pageWidth, align: "center" }
  );

  return doc;
}
