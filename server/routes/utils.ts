import ExcelJS from "exceljs";

async function xlsxReadToJson(buffer: Buffer): Promise<any[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  const rows: any[] = [];
  let headers: string[] = [];
  sheet.eachRow((row, rowNum) => {
    const vals = (row.values as any[]).slice(1);
    if (rowNum === 1) {
      headers = vals.map(v => String(v ?? ''));
    } else {
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      rows.push(obj);
    }
  });
  return rows;
}

async function xlsxWriteAoa(sheets: { name: string; data: any[][] }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    for (const row of s.data) { ws.addRow(row); }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function xlsxWriteJson(data: any[], sheetName: string): Promise<{ xlsx: Buffer; csv: string }> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    ws.addRow(keys);
    for (const row of data) { ws.addRow(keys.map(k => row[k])); }
  }
  const xlsxBuf = Buffer.from(await wb.xlsx.writeBuffer());
  const csvRows: string[] = [];
  ws.eachRow(row => {
    const vals = (row.values as any[]).slice(1).map(v => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    });
    csvRows.push(vals.join(','));
  });
  return { xlsx: xlsxBuf, csv: csvRows.join('\n') };
}

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60_000;

function getCached(key: string): any | null {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  if (entry) apiCache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  apiCache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) { apiCache.clear(); return; }
  for (const key of apiCache.keys()) {
    if (key.startsWith(prefix)) apiCache.delete(key);
  }
}

export { xlsxReadToJson, xlsxWriteAoa, xlsxWriteJson, getCached, setCache };
