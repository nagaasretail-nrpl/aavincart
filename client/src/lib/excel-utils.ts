import JSZip from 'jszip';

export interface B2BUserRow {
  sno: number;
  district: string;
  districtUnion: string;
  office: string;
  businessType: string;
  businessTypeCode: string;
  businessRoute: string;
  businessPoint: string;
  businessCode: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  role: string;
  pricingTier: string;
  gstin: string;
  pan: string;
  aadhaar: string;
  msme: string;
  securityDeposit: string;
  address: string;
  freshMilkTier: string;
  productsTier: string;
  iceCreamTier: string;
  errors: string[];
  isValid: boolean;
}

const VALID_TIER_CODES = ['DLR', 'WSD', 'RTL', 'FED', 'INT', 'MRP', 'X', ''];
const VALID_ROLES = ['FEDERATION', 'INTER_UNION', 'WHOLESALE_DEALER', 'DEALER', 'RETAILER', 'MRP', 'federation', 'inter_union', 'wsd', 'wholesale_dealer', 'dealer', 'retailer', 'agent', 'fmd'];

const HEADER_MAP: Record<string, string> = {
  's.no': 'sno', 'sno': 'sno', 's no': 'sno', 'serial': 'sno',
  'district': 'district',
  'district union': 'districtUnion', 'districtunion': 'districtUnion',
  'office': 'office',
  'business type': 'businessType', 'businesstype': 'businessType',
  'business type code': 'businessTypeCode', 'businesstypecode': 'businessTypeCode',
  'business route': 'businessRoute', 'businessroute': 'businessRoute',
  'business pinbot': 'businessPoint', 'business point': 'businessPoint', 'businesspoint': 'businessPoint',
  'business code': 'businessCode', 'businesscode': 'businessCode',
  'business name': 'businessName', 'businessname': 'businessName', 'business name *': 'businessName',
  'contact person': 'contactName', 'contactperson': 'contactName', 'contact person *': 'contactName',
  'phone': 'phone', 'phone *': 'phone', 'mobile': 'phone',
  'email': 'email',
  'role': 'role',
  'pricing tier': 'pricingTier', 'pricingtier': 'pricingTier',
  'gstin': 'gstin',
  'pan number': 'pan', 'pannumber': 'pan', 'pan': 'pan',
  'aadhaar number': 'aadhaar', 'aadhaar': 'aadhaar', 'aadhaarnumber': 'aadhaar', 'aadhaar no': 'aadhaar', 'aadhar': 'aadhaar', 'aadhar number': 'aadhaar',
  'msme number': 'msme', 'msmenumber': 'msme', 'msme': 'msme', 'udyam number': 'msme', 'udyam': 'msme', 'msme/udyam': 'msme',
  'security deposit': 'securityDeposit', 'securitydeposit': 'securityDeposit', 'deposit': 'securityDeposit', 'security deposit (₹)': 'securityDeposit',
  'business address': 'address', 'address': 'address',
  'fresh milk segment with pricing tier': 'freshMilkTier',
  'fresh milk segment': 'freshMilkTier',
  'freshmilktier': 'freshMilkTier',
  'products segment with pricing tier': 'productsTier',
  'products segment': 'productsTier',
  'productstier': 'productsTier',
  'ice cream segment with pricing tier': 'iceCreamTier',
  'ice cream segment': 'iceCreamTier',
  'icecreamtier': 'iceCreamTier',
  'business milk segment': 'freshMilkTier',
};

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function parseSharedStrings(ssXml: string): string[] {
  const strings: string[] = [];
  const siMatches = ssXml.match(/<si>[\s\S]*?<\/si>/g) || [];
  for (const si of siMatches) {
    const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
    const combined = tMatches.map(m => m.replace(/<t[^>]*>/, '').replace(/<\/t>/, '')).join('');
    strings.push(decodeXmlEntities(combined));
  }
  return strings;
}

async function resolveSheetFile(zip: JSZip, targetRId: string): Promise<JSZip.JSZipObject | null> {
  const relsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (relsFile) {
    const relsXml = await relsFile.async('string');
    const relMatches = relsXml.match(/<Relationship[^>]*\/>/g) || [];
    for (const rel of relMatches) {
      const idMatch = rel.match(/Id="([^"]+)"/);
      const targetMatch = rel.match(/Target="([^"]+)"/);
      if (idMatch && targetMatch && idMatch[1] === targetRId) {
        const target = targetMatch[1];
        const filePath = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
        return zip.file(filePath);
      }
    }
  }
  return null;
}

async function parseXlsxToRows(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const zip = await JSZip.loadAsync(buffer);

  const ssFile = zip.file('xl/sharedStrings.xml');
  let sharedStrings: string[] = [];
  if (ssFile) {
    const ssXml = await ssFile.async('string');
    sharedStrings = parseSharedStrings(ssXml);
  }

  const wbFile = zip.file('xl/workbook.xml');
  if (!wbFile) return { headers: [], rows: [] };

  const wbXml = await wbFile.async('string');
  const sheetEntries: { name: string; rId: string }[] = [];
  const sheetTagMatches = wbXml.match(/<sheet\b[^>]*\/>/g) || [];
  for (const tag of sheetTagMatches) {
    const nameMatch = tag.match(/name="([^"]+)"/);
    const rIdMatch = tag.match(/r:id="([^"]+)"/i);
    if (nameMatch && rIdMatch) {
      sheetEntries.push({ name: decodeXmlEntities(nameMatch[1]), rId: rIdMatch[1] });
    }
  }

  if (sheetEntries.length === 0) return { headers: [], rows: [] };

  let targetEntry = sheetEntries.find(e => {
    const lower = e.name.toLowerCase();
    return lower.includes('b2b') || lower.includes('data') || lower.includes('user');
  });
  if (!targetEntry) {
    targetEntry = sheetEntries.length > 1
      ? sheetEntries.find(e => e.name.toLowerCase() !== 'instructions') || sheetEntries[1]
      : sheetEntries[0];
  }

  let sheetFile = await resolveSheetFile(zip, targetEntry.rId);
  if (!sheetFile) {
    const idx = sheetEntries.indexOf(targetEntry);
    sheetFile = zip.file(`xl/worksheets/sheet${idx + 1}.xml`);
  }
  if (!sheetFile) {
    const files = Object.keys(zip.files).filter(f => f.startsWith('xl/worksheets/sheet'));
    if (files.length === 0) return { headers: [], rows: [] };
    sheetFile = zip.file(files[0]);
  }
  if (!sheetFile) return { headers: [], rows: [] };

  return parseSheetXml(await sheetFile.async('string'), sharedStrings);
}

function parseCellValue(cellXml: string, sharedStrings: string[]): string {
  const typeMatch = cellXml.match(/t="([^"]+)"/);
  const type = typeMatch ? typeMatch[1] : '';
  const valMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);

  if (type === 'inlineStr') {
    const tMatches = cellXml.match(/<is>[\s\S]*?<\/is>/);
    if (tMatches) {
      const tVals = tMatches[0].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
      return decodeXmlEntities(tVals.map(m => m.replace(/<t[^>]*>/, '').replace(/<\/t>/, '')).join(''));
    }
    return '';
  }

  if (!valMatch) return '';
  const rawVal = valMatch[1];

  if (type === 's') {
    const idx = parseInt(rawVal);
    return sharedStrings[idx] !== undefined ? sharedStrings[idx] : rawVal;
  }

  if (type === 'b') {
    return rawVal === '1' ? 'TRUE' : 'FALSE';
  }

  return decodeXmlEntities(rawVal);
}

function parseSheetXml(sheetXml: string, sharedStrings: string[]): { headers: string[]; rows: Record<string, any>[] } {
  const allRows: string[][] = [];
  const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [];

  for (const rowXml of rowMatches) {
    const cells: { col: number; value: string }[] = [];
    const cellMatches = rowXml.match(/<c\b[^>]*>[\s\S]*?<\/c>|<c\b[^/]*\/>/g) || [];

    for (const cellXml of cellMatches) {
      const refMatch = cellXml.match(/r="([A-Z]+)/);
      const col = refMatch ? refMatch[1] : '';

      const value = parseCellValue(cellXml, sharedStrings);

      let colIdx = 0;
      for (let i = 0; i < col.length; i++) {
        colIdx = colIdx * 26 + (col.charCodeAt(i) - 64);
      }
      colIdx--;

      cells.push({ col: colIdx, value });
    }

    if (cells.length === 0) continue;
    const maxCol = Math.max(...cells.map(c => c.col), 0);
    const rowArr = new Array(maxCol + 1).fill('');
    for (const cell of cells) {
      rowArr[cell.col] = cell.value;
    }
    allRows.push(rowArr);
  }

  if (allRows.length === 0) return { headers: [], rows: [] };

  const headers = allRows[0].map(h => String(h ?? ''));
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = allRows[i][idx] ?? '';
    });
    rows.push(obj);
  }

  return { headers, rows };
}

export async function parseB2BUsersExcel(file: File): Promise<B2BUserRow[]> {
  const buffer = await file.arrayBuffer();
  const { headers: headerKeys, rows: rawRows } = await parseXlsxToRows(buffer);

  if (rawRows.length === 0) return [];

  const colMap: Record<string, string> = {};
  headerKeys.filter(Boolean).forEach(h => {
    const normalized = h.toLowerCase().trim().replace(/\s+/g, ' ');
    if (HEADER_MAP[normalized]) {
      colMap[h] = HEADER_MAP[normalized];
    } else {
      for (const [pattern, field] of Object.entries(HEADER_MAP)) {
        if (normalized.includes(pattern)) { colMap[h] = field; break; }
      }
    }
  });

  const rows: B2BUserRow[] = rawRows.map((raw, idx) => {
    const get = (field: string): string => {
      const key = headerKeys.find(h => colMap[h] === field);
      return key ? String(raw[key] ?? '').trim() : '';
    };

    const freshMilkTier = get('freshMilkTier').toUpperCase();
    const productsTier = get('productsTier').toUpperCase();
    const iceCreamTier = get('iceCreamTier').toUpperCase();

    const row: B2BUserRow = {
      sno: idx + 1,
      district: get('district'),
      districtUnion: get('districtUnion'),
      office: get('office'),
      businessType: get('businessType'),
      businessTypeCode: get('businessTypeCode'),
      businessRoute: get('businessRoute'),
      businessPoint: get('businessPoint'),
      businessCode: get('businessCode'),
      businessName: get('businessName'),
      contactName: get('contactName'),
      phone: get('phone').replace(/\D/g, ''),
      email: get('email'),
      role: get('role'),
      pricingTier: get('pricingTier'),
      gstin: get('gstin'),
      pan: get('pan'),
      aadhaar: get('aadhaar').replace(/\D/g, ''),
      msme: get('msme'),
      securityDeposit: get('securityDeposit'),
      address: get('address'),
      freshMilkTier: freshMilkTier === 'YES' ? 'DLR' : freshMilkTier === 'NO' ? 'X' : freshMilkTier,
      productsTier: productsTier === 'YES' ? 'DLR' : productsTier === 'NO' ? 'X' : productsTier,
      iceCreamTier: iceCreamTier === 'YES' ? 'DLR' : iceCreamTier === 'NO' ? 'X' : iceCreamTier,
      errors: [],
      isValid: true,
    };

    if (!row.businessName && !row.contactName && !row.phone) {
      row.errors.push('Empty row');
      row.isValid = false;
      return row;
    }

    if (!row.businessName) row.errors.push('Business Name is required');
    if (!row.phone) row.errors.push('Phone is required');
    if (row.phone && row.phone.length !== 10) row.errors.push('Phone must be 10 digits');
    if (row.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(row.pan.toUpperCase())) row.errors.push(`Invalid PAN format: ${row.pan}`);
    if (row.aadhaar && row.aadhaar.length !== 12) row.errors.push(`Aadhaar must be 12 digits: ${row.aadhaar}`);
    if (row.role && !VALID_ROLES.includes(row.role)) row.errors.push(`Invalid Role: ${row.role}`);
    if (row.freshMilkTier && !VALID_TIER_CODES.includes(row.freshMilkTier)) row.errors.push(`Invalid Fresh Milk tier: ${row.freshMilkTier}`);
    if (row.productsTier && !VALID_TIER_CODES.includes(row.productsTier)) row.errors.push(`Invalid Products tier: ${row.productsTier}`);
    if (row.iceCreamTier && !VALID_TIER_CODES.includes(row.iceCreamTier)) row.errors.push(`Invalid Ice Cream tier: ${row.iceCreamTier}`);
    const isUpdate = !!(row.businessCode || row.phone);
    if (!isUpdate && !row.freshMilkTier && !row.productsTier && !row.iceCreamTier) row.errors.push('At least one segment tier is required (for new users)');

    row.isValid = row.errors.length === 0;
    return row;
  }).filter(r => !(r.errors.length === 1 && r.errors[0] === 'Empty row'));

  return rows;
}

export { parseXlsxToRows };

interface SampleExcelConfig {
  fileName: string;
  sheetName: string;
  columns: { header: string; key: string; width?: number }[];
  sampleRows: Record<string, string | number>[];
  instructions?: string[];
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colLetter(idx: number): string {
  let s = '';
  let n = idx + 1;
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

export async function buildXlsxBuffer(sheets: { name: string; rows: string[][] }[]): Promise<Uint8Array> {
  const zip = new JSZip();

  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  ${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n  ')}
</Types>`);

  zip.file('_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  const wbRels = sheets.map((_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join('\n  ');

  zip.file('xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${wbRels}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId${sheets.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`);

  const sheetEntries = sheets.map((s, i) =>
    `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
  ).join('\n    ');

  zip.file('xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetEntries}
  </sheets>
</workbook>`);

  zip.file('xl/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="2">
    <xf/>
    <xf fontId="1" fillId="2" applyFont="1" applyFill="1"/>
  </cellXfs>
</styleSheet>`);

  const allStrings: string[] = [];
  const stringMap = new Map<string, number>();
  function getStringIdx(s: string): number {
    if (stringMap.has(s)) return stringMap.get(s)!;
    const idx = allStrings.length;
    allStrings.push(s);
    stringMap.set(s, idx);
    return idx;
  }

  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      for (const cell of row) {
        getStringIdx(cell);
      }
    }
  }

  sheets.forEach((sheet, sheetIdx) => {
    let sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>`;

    sheet.rows.forEach((row, rowIdx) => {
      const rowNum = rowIdx + 1;
      const isHeader = rowIdx === 0;
      sheetXml += `\n    <row r="${rowNum}">`;
      row.forEach((cell, colIdx) => {
        const ref = `${colLetter(colIdx)}${rowNum}`;
        const sIdx = getStringIdx(cell);
        const style = isHeader ? ' s="1"' : '';
        sheetXml += `<c r="${ref}" t="s"${style}><v>${sIdx}</v></c>`;
      });
      sheetXml += `</row>`;
    });

    sheetXml += `\n  </sheetData>
</worksheet>`;
    zip.file(`xl/worksheets/sheet${sheetIdx + 1}.xml`, sheetXml);
  });

  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${allStrings.length}" uniqueCount="${allStrings.length}">
${allStrings.map(s => `  <si><t>${escapeXml(s)}</t></si>`).join('\n')}
</sst>`;
  zip.file('xl/sharedStrings.xml', ssXml);

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

export async function downloadSampleExcel(config: SampleExcelConfig) {
  const sheets: { name: string; rows: string[][] }[] = [];

  if (config.instructions && config.instructions.length > 0) {
    const instrRows: string[][] = [
      ['INSTRUCTIONS'],
      [''],
      ...config.instructions.map(inst => [inst]),
      [''],
      ['Please fill the data in the "Data" sheet and upload.'],
    ];
    sheets.push({ name: 'Instructions', rows: instrRows });
  }

  const headers = config.columns.map(c => c.header);
  const dataRows = config.sampleRows.map(row =>
    config.columns.map(c => String(row[c.key] ?? ''))
  );
  sheets.push({ name: config.sheetName, rows: [headers, ...dataRows] });

  const xlsxBuf = await buildXlsxBuffer(sheets);
  const blob = new Blob([xlsxBuf.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${config.fileName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export const SAMPLE_EXCEL_CONFIGS = {
  b2bUsers: {
    fileName: 'B2B_Users_Sample_Import',
    sheetName: 'B2B Users',
    columns: [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'District', key: 'district', width: 15 },
      { header: 'District Union', key: 'districtUnion', width: 22 },
      { header: 'Office', key: 'office', width: 15 },
      { header: 'Business Type', key: 'businessType', width: 18 },
      { header: 'Business Type Code', key: 'businessTypeCode', width: 12 },
      { header: 'Business Route', key: 'businessRoute', width: 22 },
      { header: 'Business Point', key: 'businessPoint', width: 20 },
      { header: 'Business Code', key: 'businessCode', width: 14 },
      { header: 'Business Name *', key: 'businessName', width: 25 },
      { header: 'Contact Person *', key: 'contactName', width: 20 },
      { header: 'Phone *', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Role', key: 'role', width: 18 },
      { header: 'Pricing Tier', key: 'pricingTier', width: 18 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'PAN Number', key: 'pan', width: 15 },
      { header: 'Aadhaar Number', key: 'aadhaar', width: 16 },
      { header: 'MSME/Udyam Number', key: 'msme', width: 20 },
      { header: 'Security Deposit (₹)', key: 'securityDeposit', width: 18 },
      { header: 'Business Address', key: 'address', width: 35 },
      { header: 'Fresh Milk Segment with pricing tier', key: 'freshMilkTier', width: 30 },
      { header: 'Products Segment with pricing tier', key: 'productsTier', width: 28 },
      { header: 'Ice Cream Segment with pricing tier', key: 'iceCreamTier', width: 28 },
    ],
    sampleRows: [
      {
        sno: 1, district: 'Salem', districtUnion: 'Salem District Union', office: 'City MMO',
        businessType: 'WSD (Wholesale Dealer)', businessTypeCode: 'AA', businessRoute: 'Salem City',
        businessPoint: 'Suramangalam', businessCode: 'AA0001',
        businessName: 'M/S ROJAMAL & SONS', contactName: 'Rojamal', email: '',
        phone: '9843777001', role: 'WHOLESALE_DEALER', pricingTier: 'WSD', gstin: '33AABCR1234H1ZQ',
        pan: 'AABCR1234H', aadhaar: '987654321012', msme: 'UDYAM-TN-01-0012345', securityDeposit: '100000',
        address: '262 Sugreev Nagar, Dharmapuri Road, Salem-636001', freshMilkTier: 'DLR', productsTier: 'WSD', iceCreamTier: 'WSD',
      },
      {
        sno: 2, district: 'Salem', districtUnion: 'Salem District Union', office: 'City MMO',
        businessType: 'WSD (Wholesale Dealer)', businessTypeCode: 'AA', businessRoute: 'Salem City',
        businessPoint: 'Ammapet', businessCode: 'AA0002',
        businessName: 'M/S REVATI AGENCY', contactName: '', email: '',
        phone: '9843777002', role: 'WHOLESALE_DEALER', pricingTier: 'WSD', gstin: '',
        pan: 'BBCDE2345F', aadhaar: '876543210987', msme: '', securityDeposit: '75000',
        address: '15 Ammapet Main Road, Salem-636003', freshMilkTier: 'WSD', productsTier: 'WSD', iceCreamTier: 'WSD',
      },
      {
        sno: 3, district: 'Salem', districtUnion: 'Salem District Union', office: 'City MMO',
        businessType: 'Dealer / Agent', businessTypeCode: 'AA', businessRoute: 'Salem City',
        businessPoint: 'Fairlands', businessCode: 'AA0003',
        businessName: 'M/S SELVA AGENCIES', contactName: 'Selvam K', email: '',
        phone: '9843777003', role: 'DEALER', pricingTier: 'DLR', gstin: '',
        pan: 'CDEFG3456H', aadhaar: '', msme: '', securityDeposit: '50000',
        address: '42 Fairlands Main Road, Salem-636016', freshMilkTier: 'DLR', productsTier: 'DLR', iceCreamTier: 'X',
      },
      {
        sno: 4, district: 'Salem', districtUnion: 'Salem District Union', office: 'Attur',
        businessType: 'WSD (Wholesale Dealer)', businessTypeCode: 'AA', businessRoute: 'Attur',
        businessPoint: 'Attur Bus Stand', businessCode: 'AA0004',
        businessName: 'M/S UMA TRADERS', contactName: 'Uma Devi', email: '',
        phone: '9843777004', role: 'WHOLESALE_DEALER', pricingTier: 'WSD', gstin: '33DEFGH4567J1ZR',
        pan: 'DEFGH4567J', aadhaar: '765432109876', msme: 'UDYAM-TN-01-0098765', securityDeposit: '100000',
        address: 'Near Bus Stand, Attur, Salem-636102', freshMilkTier: 'WSD', productsTier: 'WSD', iceCreamTier: 'WSD',
      },
      {
        sno: 5, district: 'Salem', districtUnion: 'Salem District Union', office: 'Omalur',
        businessType: 'Retailer', businessTypeCode: 'GS', businessRoute: 'Omalur',
        businessPoint: 'Omalur Town', businessCode: 'GS0001',
        businessName: 'LAKSHMI PROVISION STORES', contactName: 'Lakshmi R', email: '',
        phone: '9843777005', role: 'RETAILER', pricingTier: 'RTL', gstin: '',
        pan: '', aadhaar: '654321098765', msme: '', securityDeposit: '25000',
        address: 'Omalur Main Bazaar, Salem-636455', freshMilkTier: 'RTL', productsTier: 'RTL', iceCreamTier: 'RTL',
      },
      {
        sno: 6, district: 'Salem', districtUnion: 'Salem District Union', office: 'City MMO',
        businessType: 'Hotel', businessTypeCode: 'HT', businessRoute: 'Salem City',
        businessPoint: 'Junction', businessCode: 'HT0001',
        businessName: 'HOTEL SARAVANA BHAVAN', contactName: 'Saravanan P', email: '',
        phone: '9843777006', role: 'DEALER', pricingTier: 'DLR', gstin: '33AABCS1234R1ZP',
        pan: 'AABCS1234R', aadhaar: '543210987654', msme: 'UDYAM-TN-01-0045678', securityDeposit: '50000',
        address: '5 Junction Road, Salem-636001', freshMilkTier: 'DLR', productsTier: 'DLR', iceCreamTier: 'DLR',
      },
    ],
    instructions: [
      '* Fields marked with * are mandatory.',
      '* S.No is auto-generated serial number.',
      '* District: Tamil Nadu district name (e.g., Salem, Madurai, Chennai).',
      '* Office: City / MMO office (e.g., City MMO, Attur, Omalur).',
      '* Business Type: WSD (Wholesale Dealer), Dealer / Agent, MPCS, Hotel, Institution, Private Parlour, Union Parlour, General Shop / Retail.',
      '* Business Type Code: AA (WSD/Dealer), MP (MPCS), HT (Hotel), IN (Institution), PP (Private Parlour), UP (Union Parlour), GS (General Shop).',
      '* Business Route: Delivery route name.',
      '* Business Point: Specific delivery point or area on the route.',
      '* Business Code: TypeCode+SerialNumber (e.g., AA0001, AA0002, HT0001).',
      '* Role must be one of: FEDERATION, INTER_UNION, WHOLESALE_DEALER, DEALER, RETAILER, MRP.',
      '* GSTIN format: 2-digit state code + 10-char PAN + 1Z + check digit (15 chars total).',
      '* PAN format: 5 letters + 4 digits + 1 letter (e.g., AABCS1234R).',
      '* Aadhaar Number: 12-digit unique identification number.',
      '* MSME/Udyam Number: UDYAM registration number (e.g., UDYAM-TN-01-0012345).',
      '* Security Deposit: Amount in INR (₹) paid as security deposit by the B2B customer.',
      '* SEGMENT PRICING TIERS: Each segment column accepts a tier code that determines both access and pricing.',
      '  - DLR = Dealer pricing',
      '  - WSD = Wholesale Dealer pricing',
      '  - RTL = Retailer pricing',
      '  - FED = Federation pricing',
      '  - INT = Inter-Union pricing',
      '  - MRP = Consumer (MRP) pricing',
      '  - X = No access to this segment',
      '  - Leave blank = No access',
      '* A user can have different tiers per segment (e.g., DLR for Fresh Milk, WSD for Products).',
      '* Phone numbers should be 10-digit Indian mobile numbers.',
    ],
  } as SampleExcelConfig,

  b2cUsers: {
    fileName: 'B2C_Users_Sample_Import',
    sheetName: 'B2C Users',
    columns: [
      { header: 'Full Name *', key: 'name', width: 22 },
      { header: 'Email *', key: 'email', width: 25 },
      { header: 'Phone *', key: 'phone', width: 15 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'District', key: 'district', width: 15 },
      { header: 'Pincode', key: 'pincode', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
    ],
    sampleRows: [
      { name: 'Priya Sharma', email: 'priya@gmail.com', phone: '9843000001', address: '15, MG Road, T.Nagar', city: 'Chennai', district: 'Chennai', pincode: '600017', status: 'active' },
      { name: 'Karthik Rajan', email: 'karthik@yahoo.com', phone: '9843000002', address: '22, Anna Salai, KK Nagar', city: 'Madurai', district: 'Madurai', pincode: '625020', status: 'active' },
      { name: 'Meena Devi', email: 'meena@outlook.com', phone: '9843000003', address: '8, Temple Street, RS Puram', city: 'Coimbatore', district: 'Coimbatore', pincode: '641002', status: 'active' },
    ],
    instructions: [
      '* Fields marked with * are mandatory.',
      '* Status must be one of: active, inactive, pending',
      '* Phone numbers should be 10-digit Indian mobile numbers',
      '* All B2C users are priced at MRP (consumer pricing)',
    ],
  } as SampleExcelConfig,

  b2bRegistrations: {
    fileName: 'B2B_Registration_Sample_Import',
    sheetName: 'B2B Registrations',
    columns: [
      { header: 'Business Name *', key: 'businessName', width: 25 },
      { header: 'Business Type *', key: 'businessType', width: 20 },
      { header: 'Business Code', key: 'businessCode', width: 15 },
      { header: 'Contact Person *', key: 'contactName', width: 20 },
      { header: 'Phone *', key: 'phone', width: 15 },
      { header: 'Mobile 2', key: 'mobile2', width: 15 },
      { header: 'District *', key: 'district', width: 15 },
      { header: 'District Union *', key: 'districtUnion', width: 20 },
      { header: 'Office', key: 'office', width: 20 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Route', key: 'route', width: 15 },
      { header: 'Point', key: 'point', width: 15 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'Fresh Milk', key: 'freshMilk', width: 12 },
      { header: 'FM Tier', key: 'fmTier', width: 10 },
      { header: 'Products', key: 'products', width: 12 },
      { header: 'Prod Tier', key: 'prodTier', width: 10 },
      { header: 'Ice Cream', key: 'iceCream', width: 12 },
      { header: 'IC Tier', key: 'icTier', width: 10 },
    ],
    sampleRows: [
      {
        businessName: 'Ganesh Dairy Products', businessType: 'dealer', businessCode: 'DLR-001',
        contactName: 'Ganesh R', phone: '9843500001', mobile2: '9843500010',
        district: 'Salem', districtUnion: 'Salem District Union', office: 'Salem MMO',
        address: '10, Main Road, Salem', route: 'Route-1', point: 'Salem Main',
        gstin: '33AABCU9603R1ZM', freshMilk: 'Yes', fmTier: 'D', products: 'Yes', prodTier: 'D',
        iceCream: 'No', icTier: 'X',
      },
      {
        businessName: 'Sri Meenakshi WSD', businessType: 'wsd', businessCode: 'WSD-005',
        contactName: 'Meenakshi K', phone: '9843500002', mobile2: '',
        district: 'Madurai', districtUnion: 'Madurai District Union', office: 'Madurai MMO',
        address: '45, Temple Road, Madurai', route: 'Route-3', point: 'Madurai South',
        gstin: '33BCDEF1234G1Z5', freshMilk: 'Yes', fmTier: 'W', products: 'Yes', prodTier: 'W',
        iceCream: 'Yes', icTier: 'W',
      },
    ],
    instructions: [
      '* Fields marked with * are mandatory.',
      '* Business Type: federation, inter_union, wsd, dealer, retailer, mpcs, hotel, institution, private_parlour, union_parlour',
      '* Segment Tiers: F=Federation, U=District Union, W=WSD, D=Dealer, R=Retailer, M=MRP, X=No Access',
      '* Fresh Milk / Products / Ice Cream: Enter "Yes" or "No"',
      '* GSTIN format: 15-character alphanumeric GST number',
      '* Phone numbers should be 10-digit Indian mobile numbers',
    ],
  } as SampleExcelConfig,

  allUsers: {
    fileName: 'All_Users_Sample_Import',
    sheetName: 'All Users',
    columns: [
      { header: 'Full Name *', key: 'name', width: 22 },
      { header: 'Email *', key: 'email', width: 25 },
      { header: 'Phone *', key: 'phone', width: 15 },
      { header: 'Role *', key: 'role', width: 18 },
      { header: 'Pricing Tier', key: 'pricingTier', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'District', key: 'district', width: 15 },
      { header: 'GSTIN (B2B only)', key: 'gstin', width: 18 },
    ],
    sampleRows: [
      { name: 'Anitha M', email: 'anitha@gmail.com', phone: '9843100001', role: 'customer', pricingTier: 'MRP', status: 'active', address: '10, Park Road, Chennai', district: 'Chennai', gstin: '' },
      { name: 'Suresh Kumar', email: 'suresh@wholesale.in', phone: '9843100002', role: 'wsd', pricingTier: 'WHOLESALE_DEALER', status: 'active', address: '25, Industrial Area, Salem', district: 'Salem', gstin: '33AABCU9603R1ZM' },
      { name: 'Velu R', email: 'velu@dealer.com', phone: '9843100003', role: 'dealer', pricingTier: 'DEALER', status: 'active', address: '5, Market Road, Trichy', district: 'Trichy', gstin: '33BCDEF1234G1Z5' },
    ],
    instructions: [
      '* Fields marked with * are mandatory.',
      '* Role: customer, consumer, dealer, wsd, wholesale_dealer, retailer, inter_union, federation, agent, fmd',
      '* Pricing Tier: FEDERATION, INTER_UNION, WHOLESALE_DEALER, DEALER, RETAILER, MRP',
      '* Status: active, inactive, pending',
      '* GSTIN is required only for B2B roles',
    ],
  } as SampleExcelConfig,

  orders: {
    fileName: 'Orders_Sample_Import',
    sheetName: 'Orders',
    columns: [
      { header: 'Customer Name *', key: 'customerName', width: 22 },
      { header: 'Customer Email *', key: 'customerEmail', width: 25 },
      { header: 'Customer Phone *', key: 'customerPhone', width: 15 },
      { header: 'Product Name *', key: 'productName', width: 25 },
      { header: 'Quantity *', key: 'quantity', width: 10 },
      { header: 'Unit Price *', key: 'unitPrice', width: 12 },
      { header: 'Payment Method', key: 'paymentMethod', width: 18 },
      { header: 'Delivery Address *', key: 'deliveryAddress', width: 30 },
      { header: 'Pricing Role', key: 'pricingRole', width: 15 },
      { header: 'Product Segment', key: 'productSegment', width: 18 },
      { header: 'Is Credit Order', key: 'isCredit', width: 15 },
    ],
    sampleRows: [
      { customerName: 'Raj Kumar', customerEmail: 'raj@gmail.com', customerPhone: '9843200001', productName: 'Aavin Full Cream Milk 500ml', quantity: 10, unitPrice: 28, paymentMethod: 'online', deliveryAddress: '12, Main Road, Salem', pricingRole: 'DEALER', productSegment: 'Fresh Milk', isCredit: 'No' },
      { customerName: 'Priya Stores', customerEmail: 'priya@stores.com', customerPhone: '9843200002', productName: 'Aavin Curd 200g', quantity: 50, unitPrice: 15, paymentMethod: 'credit', deliveryAddress: '45, Market Street, Madurai', pricingRole: 'WHOLESALE_DEALER', productSegment: 'Products', isCredit: 'Yes' },
    ],
    instructions: [
      '* Fields marked with * are mandatory.',
      '* Payment Method: online, cod, credit, upi, razorpay',
      '* Pricing Role: FEDERATION, INTER_UNION, WHOLESALE_DEALER, DEALER, RETAILER, MRP',
      '* Product Segment: Fresh Milk, Products, Ice Cream',
      '* Is Credit Order: Yes or No',
    ],
  } as SampleExcelConfig,

  masterProducts: {
    fileName: 'Master_Products_Sample_Import',
    sheetName: 'Products',
    columns: [
      { header: 'Product Code *', key: 'productCode', width: 15 },
      { header: 'Product Name *', key: 'name', width: 25 },
      { header: 'Segment *', key: 'segment', width: 15 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Subcategory', key: 'subcategory', width: 18 },
      { header: 'HSN Code', key: 'hsnCode', width: 12 },
      { header: 'GST %', key: 'gstPercent', width: 8 },
      { header: 'Unit Size', key: 'unitSize', width: 10 },
      { header: 'Unit Type', key: 'unitType', width: 10 },
      { header: 'Federation Price', key: 'federationPrice', width: 15 },
      { header: 'Inter-Union Price', key: 'interUnionPrice', width: 15 },
      { header: 'Wholesale/WSD Price', key: 'wholesalePrice', width: 18 },
      { header: 'Dealer Price', key: 'dealerPrice', width: 12 },
      { header: 'Retailer Price', key: 'retailerPrice', width: 13 },
      { header: 'MRP *', key: 'mrp', width: 10 },
      { header: 'Description', key: 'description', width: 30 },
    ],
    sampleRows: [
      { productCode: 'FM-001', name: 'Aavin Full Cream Milk 500ml', segment: 'Fresh Milk', category: 'Milk', subcategory: 'Full Cream', hsnCode: '0401', gstPercent: '5', unitSize: '500', unitType: 'ml', federationPrice: '22', interUnionPrice: '24', wholesalePrice: '25', dealerPrice: '26', retailerPrice: '27', mrp: '28', description: 'Full cream milk pouch 500ml' },
      { productCode: 'PR-001', name: 'Aavin Curd 200g', segment: 'Products', category: 'Curd', subcategory: '', hsnCode: '0403', gstPercent: '5', unitSize: '200', unitType: 'g', federationPrice: '12', interUnionPrice: '13', wholesalePrice: '14', dealerPrice: '14', retailerPrice: '15', mrp: '15', description: 'Fresh curd 200g cup' },
    ],
    instructions: [
      '* Fields marked with * are mandatory.',
      '* Product Code: Unique product identifier',
      '* Segment: Fresh Milk, Products, or Ice Cream',
      '* Prices: Enter prices in INR for each pricing tier',
      '* MRP is the consumer price and is mandatory',
    ],
  } as SampleExcelConfig,

  agents: {
    fileName: 'Agents_Sample_Import',
    sheetName: 'Agents',
    columns: [
      { header: 'Agent Name *', key: 'name', width: 22 },
      { header: 'Agent Code *', key: 'agentCode', width: 15 },
      { header: 'Agent Type *', key: 'agentType', width: 18 },
      { header: 'Phone *', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Fresh Milk Tier', key: 'freshMilkTier', width: 15 },
      { header: 'Product Tier', key: 'productTier', width: 15 },
      { header: 'District', key: 'district', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ],
    sampleRows: [
      { name: 'Kumar S', agentCode: 'SLM-1001', agentType: 'SALES', phone: '9843300001', email: '', freshMilkTier: 'DLR', productTier: 'DLR', district: 'Salem', status: 'active' },
      { name: 'Ravi M', agentCode: 'SLM-1002', agentType: 'DELIVERY', phone: '9843300002', email: '', freshMilkTier: 'WSD', productTier: 'WSD', district: 'Salem', status: 'active' },
    ],
    instructions: [
      '* Fields marked with * are mandatory.',
      '* Agent Type: SALES, DELIVERY, COLLECTION, SUPERVISOR',
      '* Tier codes: DLR (Dealer), WSD (Wholesale Dealer), RTL (Retailer), FED (Federation), INT (Inter-Union), MRP',
      '* Phone numbers should be 10-digit Indian mobile numbers',
    ],
  } as SampleExcelConfig,
};
