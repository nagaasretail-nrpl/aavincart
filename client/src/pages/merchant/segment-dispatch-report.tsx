import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMerchantContext } from "./context";
import { Download, Printer, Search, Package, IceCream, ArrowUpDown, EyeOff } from "lucide-react";

type SegmentReportRow = {
  sno: number;
  customerCode: string;
  customerName: string;
  morning: Record<string, number>;
  evening: Record<string, number>;
  morningTotal: number;
  eveningTotal: number;
  grandTotal: number;
  orderValue: number;
};

type SegmentReportData = {
  header: { segment: string; unionId: string; date: string; shift: string };
  products: string[];
  productPrices: Record<string, number>;
  rows: SegmentReportRow[];
  totals: Record<string, number>;
  summary: {
    morningTotalPackets: number;
    eveningTotalPackets: number;
    totalOrderValue: number;
    customersCovered: number;
    totalCustomers: number;
    totalOrders: number;
  };
};

const UNION_NAMES: Record<string, string> = {
  "merchant-3": "Salem District Cooperative Milk Producers Union Ltd",
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(val);
}

function formatNum(val: number): string {
  if (val === 0) return "";
  return val % 1 === 0 ? String(val) : val.toFixed(1);
}

function shortenProductName(name: string): string {
  return name
    .replace(/^(Aavin|Premium|Standard|Standardised)\s*[-–]?\s*/i, "")
    .replace(/\s*[-–]\s*\(.*\)/, "")
    .trim();
}

export default function SegmentDispatchReportPage({ segment }: { segment: string }) {
  const { merchantId } = useMerchantContext();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState("combined");
  const [search, setSearch] = useState("");
  const [hideZero, setHideZero] = useState(false);
  const [sortBy, setSortBy] = useState<"sequence" | "code" | "name">("sequence");

  const unionId = merchantId || "merchant-3";
  const isIceCream = segment === "Ice Cream";
  const segmentLabel = isIceCream ? "Ice Cream" : "Products";
  const SegmentIcon = isIceCream ? IceCream : Package;

  const { data: reportData, isLoading } = useQuery<SegmentReportData>({
    queryKey: ["/api/segment-dispatch/report", unionId, segment, date, shift, search],
    queryFn: async () => {
      const params = new URLSearchParams({ segment, date, shift, merchantId: unionId });
      if (search) params.set("search", search);
      const res = await fetch(`/api/segment-dispatch/report?${params}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!unionId && !!date,
  });

  const displayRows = useMemo(() => {
    if (!reportData?.rows) return [];
    let rows = [...reportData.rows];
    if (hideZero) rows = rows.filter(r => r.grandTotal > 0);
    if (sortBy === "code") rows.sort((a, b) => a.customerCode.localeCompare(b.customerCode));
    else if (sortBy === "name") rows.sort((a, b) => a.customerName.localeCompare(b.customerName));
    return rows;
  }, [reportData?.rows, hideZero, sortBy]);

  const products = reportData?.products || [];

  const handleExcelDownload = () => {
    if (!reportData) return;
    const headers = ["S.No", "Code", "Customer Name"];
    products.forEach(p => headers.push(`Morn ${shortenProductName(p)}`));
    headers.push("Morn Total");
    products.forEach(p => headers.push(`Eve ${shortenProductName(p)}`));
    headers.push("Eve Total", "G.Total", "Order Value");

    const csvRows = [headers.join(",")];
    displayRows.forEach(r => {
      const row: (string | number)[] = [r.sno, r.customerCode, `"${r.customerName}"`];
      products.forEach(p => row.push(r.morning[p] || 0));
      row.push(r.morningTotal);
      products.forEach(p => row.push(r.evening[p] || 0));
      row.push(r.eveningTotal, r.grandTotal, r.orderValue.toFixed(2));
      csvRows.push(row.join(","));
    });

    const t = reportData.totals;
    const totalRow: (string | number)[] = ["", "", "TOTAL"];
    products.forEach(p => totalRow.push(t[`morning_${p}`] || 0));
    totalRow.push(t.morningTotal || 0);
    products.forEach(p => totalRow.push(t[`evening_${p}`] || 0));
    totalRow.push(t.eveningTotal || 0, t.grandTotal || 0, (t.orderValue || 0).toFixed(2));
    csvRows.push(totalRow.join(","));

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${segmentLabel}_Dispatch_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!reportData) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const t = reportData.totals;
    const prodCount = products.length;

    w.document.write(`<!DOCTYPE html><html><head><title>${segmentLabel} Dispatch Report</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 10px; }
      h2 { margin: 0 0 2px; font-size: 16px; }
      h3 { margin: 0 0 5px; font-size: 13px; color: #555; }
      table { border-collapse: collapse; width: 100%; margin-top: 8px; }
      th, td { border: 1px solid #333; padding: 3px 5px; text-align: right; }
      th { background: #e8e8e8; font-size: 10px; }
      td:nth-child(1), td:nth-child(2), td:nth-child(3) { text-align: left; }
      th:nth-child(1), th:nth-child(2), th:nth-child(3) { text-align: left; }
      .total-row { font-weight: bold; background: #f0f0f0; }
      .morning { background: #fffde7; }
      .evening { background: #e8f5e9; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <h2>AavinCart – ${segmentLabel} Dispatch Report</h2>
    <h3>Union: ${UNION_NAMES[unionId] || unionId}</h3>
    <h3>Date: ${new Date(date).toLocaleDateString("en-IN")} | Shift: ${shift === "combined" ? "Combined" : shift}</h3>
    <table>
      <thead>
      <tr>
        <th colspan="3"></th>
        <th colspan="${prodCount + 1}" class="morning">Morning</th>
        <th colspan="${prodCount + 1}" class="evening">Evening</th>
        <th colspan="2"></th>
      </tr>
      <tr>
        <th>S.No</th><th>Code</th><th>Customer</th>`);
    products.forEach(p => w.document.write(`<th class="morning">${shortenProductName(p)}</th>`));
    w.document.write(`<th class="morning">Total</th>`);
    products.forEach(p => w.document.write(`<th class="evening">${shortenProductName(p)}</th>`));
    w.document.write(`<th class="evening">Total</th><th>G.Total</th><th>Value</th></tr></thead><tbody>`);

    displayRows.forEach(r => {
      w.document.write(`<tr><td>${r.sno}</td><td>${r.customerCode}</td><td>${r.customerName}</td>`);
      products.forEach(p => w.document.write(`<td>${formatNum(r.morning[p] || 0)}</td>`));
      w.document.write(`<td><b>${formatNum(r.morningTotal)}</b></td>`);
      products.forEach(p => w.document.write(`<td>${formatNum(r.evening[p] || 0)}</td>`));
      w.document.write(`<td><b>${formatNum(r.eveningTotal)}</b></td>`);
      w.document.write(`<td><b>${formatNum(r.grandTotal)}</b></td><td>${r.orderValue.toFixed(2)}</td></tr>`);
    });

    w.document.write(`<tr class="total-row"><td colspan="2"></td><td>TOTAL</td>`);
    products.forEach(p => w.document.write(`<td>${t[`morning_${p}`] || 0}</td>`));
    w.document.write(`<td>${t.morningTotal || 0}</td>`);
    products.forEach(p => w.document.write(`<td>${t[`evening_${p}`] || 0}</td>`));
    w.document.write(`<td>${t.eveningTotal || 0}</td><td>${t.grandTotal || 0}</td><td>${(t.orderValue || 0).toFixed(2)}</td>`);
    w.document.write(`</tr></tbody></table></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SegmentIcon className="h-6 w-6 text-blue-600" />
            {segmentLabel} Dispatch Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {UNION_NAMES[unionId] || unionId}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Shift</label>
          <Select value={shift} onValueChange={setShift}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="combined">Combined</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <label className="text-xs font-medium text-muted-foreground">Search Customer</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Code or name" className="pl-8 w-44" />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setHideZero(!hideZero)} className={hideZero ? "bg-yellow-50 border-yellow-300" : ""}>
          <EyeOff className="h-4 w-4 mr-1" /> {hideZero ? "Show All" : "Hide Zero"}
        </Button>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-32"><ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sequence">Sequence</SelectItem>
            <SelectItem value="code">By Code</SelectItem>
            <SelectItem value="name">By Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reportData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Morning Units</p>
              <p className="text-xl font-bold text-yellow-700">{reportData.summary.morningTotalPackets.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Evening Units</p>
              <p className="text-xl font-bold text-green-700">{reportData.summary.eveningTotalPackets.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Order Value</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(reportData.summary.totalOrderValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-xl font-bold text-purple-700">{reportData.summary.totalOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Customers</p>
              <p className="text-xl font-bold">{reportData.summary.customersCovered} / {reportData.summary.totalCustomers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="text-xl font-bold text-orange-700">{products.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleExcelDownload}>
          <Download className="h-4 w-4 mr-1" /> Excel
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading dispatch data...</div>
      ) : !reportData || displayRows.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          No {segmentLabel.toLowerCase()} dispatch data found for this date. Orders from the previous day are shown here for next-day dispatch.
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th colSpan={3} className="border-b border-r p-1 text-left text-[10px] font-medium">
                  {segmentLabel} Dispatch — Date: {new Date(date).toLocaleDateString("en-IN")}
                </th>
                <th colSpan={products.length + 1} className="border-b border-r p-1 text-center bg-yellow-50 text-yellow-800 text-[10px] font-medium">
                  Morning
                </th>
                <th colSpan={products.length + 1} className="border-b border-r p-1 text-center bg-green-50 text-green-800 text-[10px] font-medium">
                  Evening
                </th>
                <th colSpan={2} className="border-b p-1"></th>
              </tr>
              <tr className="bg-muted/30 text-[10px]">
                <th className="border-b p-1 text-left w-10">S.No</th>
                <th className="border-b p-1 text-left w-16">Code</th>
                <th className="border-b border-r p-1 text-left min-w-[100px]">Customer</th>
                {products.map(p => (
                  <th key={`mh-${p}`} className="border-b p-1 text-right bg-yellow-50/50 min-w-[50px] max-w-[80px] truncate" title={p}>
                    {shortenProductName(p)}
                  </th>
                ))}
                <th className="border-b border-r p-1 text-right bg-yellow-100/50 w-14 font-semibold">Total</th>
                {products.map(p => (
                  <th key={`eh-${p}`} className="border-b p-1 text-right bg-green-50/50 min-w-[50px] max-w-[80px] truncate" title={p}>
                    {shortenProductName(p)}
                  </th>
                ))}
                <th className="border-b border-r p-1 text-right bg-green-100/50 w-14 font-semibold">Total</th>
                <th className="border-b p-1 text-right w-14 font-semibold">G.Total</th>
                <th className="border-b p-1 text-right w-20">Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r, idx) => (
                <tr key={r.customerCode + idx} className="hover:bg-muted/20">
                  <td className="border-b p-1 text-left">{r.sno}</td>
                  <td className="border-b p-1 text-left font-mono text-[10px]">{r.customerCode}</td>
                  <td className="border-b border-r p-1 text-left font-medium truncate max-w-[140px]">{r.customerName}</td>
                  {products.map(p => (
                    <td key={`m-${p}`} className="border-b p-1 text-right bg-yellow-50/30">{formatNum(r.morning[p] || 0)}</td>
                  ))}
                  <td className="border-b border-r p-1 text-right bg-yellow-100/30 font-semibold">{formatNum(r.morningTotal)}</td>
                  {products.map(p => (
                    <td key={`e-${p}`} className="border-b p-1 text-right bg-green-50/30">{formatNum(r.evening[p] || 0)}</td>
                  ))}
                  <td className="border-b border-r p-1 text-right bg-green-100/30 font-semibold">{formatNum(r.eveningTotal)}</td>
                  <td className="border-b p-1 text-right font-bold">{formatNum(r.grandTotal)}</td>
                  <td className="border-b p-1 text-right">{r.orderValue > 0 ? r.orderValue.toFixed(2) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold text-xs">
                <td colSpan={2} className="border-t-2 p-1"></td>
                <td className="border-t-2 border-r p-1 text-left">TOTAL</td>
                {products.map(p => (
                  <td key={`mt-${p}`} className="border-t-2 p-1 text-right bg-yellow-100/50">{reportData.totals[`morning_${p}`] || 0}</td>
                ))}
                <td className="border-t-2 border-r p-1 text-right bg-yellow-200/50">{reportData.totals.morningTotal || 0}</td>
                {products.map(p => (
                  <td key={`et-${p}`} className="border-t-2 p-1 text-right bg-green-100/50">{reportData.totals[`evening_${p}`] || 0}</td>
                ))}
                <td className="border-t-2 border-r p-1 text-right bg-green-200/50">{reportData.totals.eveningTotal || 0}</td>
                <td className="border-t-2 p-1 text-right">{reportData.totals.grandTotal || 0}</td>
                <td className="border-t-2 p-1 text-right">{(reportData.totals.orderValue || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
