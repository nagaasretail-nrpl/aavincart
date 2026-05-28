import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Droplets, Download, Printer, FileText, Truck, Search, RefreshCw, ArrowUpDown, EyeOff } from "lucide-react";

type DispatchRow = {
  sno: number; agentCode: string; agentName: string; billable: boolean; ob: number;
  morningFcm1000: number; morningFcm500: number; morningDlt500: number; morningStd200: number; morningTotal: number;
  eveningFcm1000: number; eveningFcm500: number; eveningDlt500: number; eveningStd200: number; eveningTotal: number;
  grandTotal: number; milkValue: number; remittance: number; cb: number;
};
type ReportData = {
  header: any; rows: DispatchRow[]; totals: Record<string, number>;
  summary: { morningTotalPackets: number; eveningTotalPackets: number; totalMilkValue: number; netClosingBalance: number; agentsCovered: number; totalAgents: number; collectionEfficiency: number };
  rates: Record<string, number>;
};
type RouteInfo = { routeCode: string; routeName: string; officeCode: string };
type DriverStop = { stopNo: number; agentCode: string; agentName: string; route: string; morningQty: number; eveningQty: number; grandTotal: number; deliveryStatus: string; remarks: string };

const UNIONS = [
  { id: "merchant-3", name: "Salem District Union" },
];

function formatCurrency(val: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(val); }
function formatNum(val: number) { if (val === 0) return ""; return val % 1 === 0 ? String(val) : val.toFixed(1); }

export default function AdminMilkDispatchReport() {
  const [unionId, setUnionId] = useState("merchant-3");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [routeCode, setRouteCode] = useState("");
  const [shift, setShift] = useState("combined");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("report");
  const [hideZero, setHideZero] = useState(false);
  const [sortBy, setSortBy] = useState<"sequence" | "code" | "name">("sequence");

  const { data: routes = [] } = useQuery<RouteInfo[]>({
    queryKey: ["/api/milk-dispatch/routes", unionId],
    queryFn: async () => { const r = await fetch(`/api/milk-dispatch/routes?unionId=${unionId}`, { credentials: "include" }); const d = await r.json(); return Array.isArray(d) ? d : []; },
    enabled: !!unionId,
  });

  const selectedRoute = routeCode || (routes.length > 0 ? routes[0].routeCode : "");

  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/milk-dispatch/report", unionId, date, selectedRoute, shift, search],
    queryFn: async () => {
      const p = new URLSearchParams({ unionId, date, shift });
      if (selectedRoute) p.set("routeCode", selectedRoute);
      if (search) p.set("search", search);
      const r = await fetch(`/api/milk-dispatch/report?${p}`, { credentials: "include" });
      return r.json();
    },
    enabled: !!unionId && !!date,
  });

  const { data: driverData } = useQuery<{ stops: DriverStop[] }>({
    queryKey: ["/api/milk-dispatch/driver-sheet", unionId, date, selectedRoute],
    queryFn: async () => { const r = await fetch(`/api/milk-dispatch/driver-sheet?unionId=${unionId}&date=${date}&routeCode=${selectedRoute}`, { credentials: "include" }); return r.json(); },
    enabled: !!unionId && !!date && !!selectedRoute && activeTab === "driver",
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/milk-dispatch/sync", { unionId, date }),
    onSuccess: () => { queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/milk-dispatch") }); },
  });

  const displayRows = useMemo(() => {
    if (!reportData?.rows) return [];
    let rows = [...reportData.rows];
    if (hideZero) rows = rows.filter(r => r.grandTotal > 0);
    if (sortBy === "code") rows.sort((a, b) => a.agentCode.localeCompare(b.agentCode));
    else if (sortBy === "name") rows.sort((a, b) => a.agentName.localeCompare(b.agentName));
    return rows;
  }, [reportData?.rows, hideZero, sortBy]);

  const routeInfo = routes.find(r => r.routeCode === selectedRoute);

  const handleExcelDownload = () => {
    if (!reportData) return;
    const headers = ["S.No","Code","Agent Name","OB","Morn FCM 1000","Morn FCM 500","Morn DLT 500","Morn STD 200","Morn Total","Eve FCM 1000","Eve FCM 500","Eve DLT 500","Eve STD 200","Eve Total","G.Total","Milk Value","Remittance","CB"];
    const csvRows = [headers.join(",")];
    displayRows.forEach(r => { csvRows.push([r.sno,r.agentCode,`"${r.agentName}"`,r.ob,r.morningFcm1000,r.morningFcm500,r.morningDlt500,r.morningStd200,r.morningTotal,r.eveningFcm1000,r.eveningFcm500,r.eveningDlt500,r.eveningStd200,r.eveningTotal,r.grandTotal,r.milkValue.toFixed(2),r.remittance,r.cb.toFixed(2)].join(",")); });
    const t = reportData.totals;
    csvRows.push(["","","TOTAL",t.ob?.toFixed(2),t.morningFcm1000,t.morningFcm500,t.morningDlt500,t.morningStd200,t.morningTotal,t.eveningFcm1000,t.eveningFcm500,t.eveningDlt500,t.eveningStd200,t.eveningTotal,t.grandTotal,t.milkValue?.toFixed(2),t.remittance,t.cb?.toFixed(2)].join(","));
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `Dispatch_${routeInfo?.routeName||"All"}_${date}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!reportData) return;
    const w = window.open("", "_blank"); if (!w) return;
    const t = reportData.totals; const un = UNIONS.find(u=>u.id===unionId)?.name || unionId;
    w.document.write(`<!DOCTYPE html><html><head><title>Daily Milk Route Dispatch Report</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:10px}h2{margin:0 0 2px;font-size:16px}h3{margin:0 0 5px;font-size:13px;color:#555}table{border-collapse:collapse;width:100%;margin-top:8px}th,td{border:1px solid #333;padding:3px 5px;text-align:right}th{background:#e8e8e8;font-size:10px}td:nth-child(1),td:nth-child(2),td:nth-child(3){text-align:left}th:nth-child(1),th:nth-child(2),th:nth-child(3){text-align:left}.total-row{font-weight:bold;background:#f0f0f0}.negative{color:red}.morning{background:#fffde7}.evening{background:#e8f5e9}@media print{body{margin:0}}</style></head><body><h2>AavinCart - Daily Milk Route Dispatch Report</h2><h3>Union: ${un} | Office: ${routeInfo?.officeCode||"Edappadi"} | Route: ${routeInfo?.routeName||"All"}</h3><h3>Date: ${new Date(date).toLocaleDateString("en-IN")} | Shift: ${shift==="combined"?"Combined":shift}</h3><table><thead><tr><th>S.No</th><th>Code</th><th>Agent Name</th><th>OB</th><th class="morning">FCM 1000</th><th class="morning">FCM 500</th><th class="morning">DLT 500</th><th class="morning">STD 200</th><th class="morning">Total</th><th class="evening">FCM 1000</th><th class="evening">FCM 500</th><th class="evening">DLT 500</th><th class="evening">STD 200</th><th class="evening">Total</th><th>G.Total</th><th>Milk Value</th><th>Remittance</th><th>CB</th></tr></thead><tbody>`);
    displayRows.forEach(r => { w.document.write(`<tr><td>${r.sno}</td><td>${r.agentCode}</td><td>${r.agentName}</td><td${r.ob<0?' class="negative"':''}>${formatNum(r.ob)}</td><td>${formatNum(r.morningFcm1000)}</td><td>${formatNum(r.morningFcm500)}</td><td>${formatNum(r.morningDlt500)}</td><td>${formatNum(r.morningStd200)}</td><td><b>${formatNum(r.morningTotal)}</b></td><td>${formatNum(r.eveningFcm1000)}</td><td>${formatNum(r.eveningFcm500)}</td><td>${formatNum(r.eveningDlt500)}</td><td>${formatNum(r.eveningStd200)}</td><td><b>${formatNum(r.eveningTotal)}</b></td><td><b>${formatNum(r.grandTotal)}</b></td><td>${r.milkValue.toFixed(2)}</td><td>${formatNum(r.remittance)}</td><td${r.cb<0?' class="negative"':''}>${r.cb.toFixed(2)}</td></tr>`); });
    w.document.write(`<tr class="total-row"><td colspan="2"></td><td>TOTAL</td><td>${t.ob?.toFixed(2)}</td><td>${t.morningFcm1000}</td><td>${t.morningFcm500}</td><td>${t.morningDlt500}</td><td>${t.morningStd200}</td><td>${t.morningTotal}</td><td>${t.eveningFcm1000}</td><td>${t.eveningFcm500}</td><td>${t.eveningDlt500}</td><td>${t.eveningStd200}</td><td>${t.eveningTotal}</td><td>${t.grandTotal}</td><td>${t.milkValue?.toFixed(2)}</td><td>${t.remittance}</td><td${t.cb<0?' class="negative"':''}>${t.cb?.toFixed(2)}</td></tr></tbody></table></body></html>`);
    w.document.close(); w.print();
  };

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Droplets className="h-6 w-6 text-blue-600" />Daily Milk Route Dispatch Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Admin View — Federation Level Access</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${syncMutation.isPending?"animate-spin":""}`} />
          {syncMutation.isPending ? "Syncing..." : "Sync Fresh Milk Orders"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Union</label>
          <Select value={unionId} onValueChange={setUnionId}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{UNIONS.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Route</label>
          <Select value={selectedRoute} onValueChange={v => setRouteCode(v)}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Select route" /></SelectTrigger>
            <SelectContent>{routes.map(r => <SelectItem key={r.routeCode} value={r.routeCode}>{r.routeName}</SelectItem>)}</SelectContent>
          </Select>
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
          <label className="text-xs font-medium text-muted-foreground">Search Agent</label>
          <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Code or name" className="pl-8 w-44" /></div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setHideZero(!hideZero)} className={hideZero ? "bg-yellow-50 border-yellow-300" : ""}><EyeOff className="h-4 w-4 mr-1" /> {hideZero ? "Show All" : "Hide Zero"}</Button>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-32"><ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="sequence">Sequence</SelectItem><SelectItem value="code">By Code</SelectItem><SelectItem value="name">By Name</SelectItem></SelectContent>
        </Select>
      </div>

      {reportData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Morning Packets</p><p className="text-xl font-bold text-yellow-700">{reportData.summary.morningTotalPackets.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Evening Packets</p><p className="text-xl font-bold text-green-700">{reportData.summary.eveningTotalPackets.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Milk Value</p><p className="text-xl font-bold text-blue-700">{formatCurrency(reportData.summary.totalMilkValue)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Net Closing Balance</p><p className={`text-xl font-bold ${reportData.summary.netClosingBalance<0?"text-red-600":"text-emerald-700"}`}>{formatCurrency(reportData.summary.netClosingBalance)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Agents Covered</p><p className="text-xl font-bold">{reportData.summary.agentsCovered} / {reportData.summary.totalAgents}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Collection Efficiency</p><p className="text-xl font-bold text-purple-700">{reportData.summary.collectionEfficiency}%</p></CardContent></Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList><TabsTrigger value="report">Dispatch Report</TabsTrigger><TabsTrigger value="driver">Driver Sheet</TabsTrigger></TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
            <Button variant="outline" size="sm" onClick={handleExcelDownload}><Download className="h-4 w-4 mr-1" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={handlePrint}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </div>

        <TabsContent value="report" className="mt-3">
          {isLoading ? <div className="text-center py-10 text-muted-foreground">Loading...</div> :
          !reportData || displayRows.length === 0 ? <div className="text-center py-10 text-muted-foreground">No dispatch data found. Click "Sync Fresh Milk Orders" to pull orders for this date.</div> : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th colSpan={4} className="border-b border-r p-1 text-left text-[10px]">{routeInfo?.routeName || "All Routes"} — {new Date(date).toLocaleDateString("en-IN")}</th>
                    <th colSpan={5} className="border-b border-r p-1 text-center bg-yellow-50 text-yellow-800 text-[10px]">Morning</th>
                    <th colSpan={5} className="border-b border-r p-1 text-center bg-green-50 text-green-800 text-[10px]">Evening</th>
                    <th colSpan={4} className="border-b p-1"></th>
                  </tr>
                  <tr className="bg-muted/30 text-[10px]">
                    <th className="border-b p-1 text-left w-10">S.No</th>
                    <th className="border-b p-1 text-left w-14">Code</th>
                    <th className="border-b p-1 text-left min-w-[100px]">Agent Name</th>
                    <th className="border-b border-r p-1 text-right w-16">OB</th>
                    <th className="border-b p-1 text-right bg-yellow-50/50">FCM 1000</th>
                    <th className="border-b p-1 text-right bg-yellow-50/50">FCM 500</th>
                    <th className="border-b p-1 text-right bg-yellow-50/50">DLT 500</th>
                    <th className="border-b p-1 text-right bg-yellow-50/50">STD 200</th>
                    <th className="border-b border-r p-1 text-right bg-yellow-100/50 font-semibold">Total</th>
                    <th className="border-b p-1 text-right bg-green-50/50">FCM 1000</th>
                    <th className="border-b p-1 text-right bg-green-50/50">FCM 500</th>
                    <th className="border-b p-1 text-right bg-green-50/50">DLT 500</th>
                    <th className="border-b p-1 text-right bg-green-50/50">STD 200</th>
                    <th className="border-b border-r p-1 text-right bg-green-100/50 font-semibold">Total</th>
                    <th className="border-b p-1 text-right font-semibold">G.Total</th>
                    <th className="border-b p-1 text-right">Milk Value</th>
                    <th className="border-b p-1 text-right">Remittance</th>
                    <th className="border-b p-1 text-right">CB</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r, idx) => {
                    const isNegCB = r.cb < 0;
                    const noRem = r.remittance === 0 && r.grandTotal > 0 && r.billable;
                    return (
                      <tr key={r.agentCode + idx} className={`hover:bg-muted/20 ${!r.billable ? "bg-gray-50 italic" : ""} ${isNegCB ? "bg-red-50/50" : ""}`}>
                        <td className="border-b p-1">{r.sno}</td>
                        <td className="border-b p-1 font-mono">{r.agentCode.startsWith("FREE") ? <Badge variant="outline" className="text-[9px] px-1">FREE</Badge> : r.agentCode}</td>
                        <td className="border-b p-1 font-medium truncate max-w-[140px]">{r.agentName}</td>
                        <td className={`border-b border-r p-1 text-right ${r.ob < 0 ? "text-red-600 font-semibold" : ""}`}>{formatNum(r.ob)}</td>
                        <td className="border-b p-1 text-right bg-yellow-50/30">{formatNum(r.morningFcm1000)}</td>
                        <td className="border-b p-1 text-right bg-yellow-50/30">{formatNum(r.morningFcm500)}</td>
                        <td className="border-b p-1 text-right bg-yellow-50/30">{formatNum(r.morningDlt500)}</td>
                        <td className="border-b p-1 text-right bg-yellow-50/30">{formatNum(r.morningStd200)}</td>
                        <td className="border-b border-r p-1 text-right bg-yellow-100/30 font-semibold">{formatNum(r.morningTotal)}</td>
                        <td className="border-b p-1 text-right bg-green-50/30">{formatNum(r.eveningFcm1000)}</td>
                        <td className="border-b p-1 text-right bg-green-50/30">{formatNum(r.eveningFcm500)}</td>
                        <td className="border-b p-1 text-right bg-green-50/30">{formatNum(r.eveningDlt500)}</td>
                        <td className="border-b p-1 text-right bg-green-50/30">{formatNum(r.eveningStd200)}</td>
                        <td className="border-b border-r p-1 text-right bg-green-100/30 font-semibold">{formatNum(r.eveningTotal)}</td>
                        <td className="border-b p-1 text-right font-bold">{formatNum(r.grandTotal)}</td>
                        <td className="border-b p-1 text-right">{r.milkValue > 0 ? r.milkValue.toFixed(2) : ""}</td>
                        <td className={`border-b p-1 text-right ${noRem ? "bg-amber-100 text-amber-800" : ""}`}>{formatNum(r.remittance)}</td>
                        <td className={`border-b p-1 text-right font-semibold ${isNegCB ? "text-red-600 bg-red-100" : ""}`}>{r.cb !== 0 ? r.cb.toFixed(2) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted font-bold text-xs">
                    <td colSpan={2} className="border-t-2 p-1"></td>
                    <td className="border-t-2 p-1">TOTAL</td>
                    <td className="border-t-2 border-r p-1 text-right">{reportData.totals.ob?.toFixed(2)}</td>
                    <td className="border-t-2 p-1 text-right bg-yellow-100/50">{reportData.totals.morningFcm1000}</td>
                    <td className="border-t-2 p-1 text-right bg-yellow-100/50">{reportData.totals.morningFcm500}</td>
                    <td className="border-t-2 p-1 text-right bg-yellow-100/50">{reportData.totals.morningDlt500}</td>
                    <td className="border-t-2 p-1 text-right bg-yellow-100/50">{reportData.totals.morningStd200}</td>
                    <td className="border-t-2 border-r p-1 text-right bg-yellow-200/50">{reportData.totals.morningTotal}</td>
                    <td className="border-t-2 p-1 text-right bg-green-100/50">{reportData.totals.eveningFcm1000}</td>
                    <td className="border-t-2 p-1 text-right bg-green-100/50">{reportData.totals.eveningFcm500}</td>
                    <td className="border-t-2 p-1 text-right bg-green-100/50">{reportData.totals.eveningDlt500}</td>
                    <td className="border-t-2 p-1 text-right bg-green-100/50">{reportData.totals.eveningStd200}</td>
                    <td className="border-t-2 border-r p-1 text-right bg-green-200/50">{reportData.totals.eveningTotal}</td>
                    <td className="border-t-2 p-1 text-right">{reportData.totals.grandTotal}</td>
                    <td className="border-t-2 p-1 text-right">{reportData.totals.milkValue?.toFixed(2)}</td>
                    <td className="border-t-2 p-1 text-right">{reportData.totals.remittance}</td>
                    <td className={`border-t-2 p-1 text-right ${reportData.totals.cb < 0 ? "text-red-600" : ""}`}>{reportData.totals.cb?.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="driver" className="mt-3">
          {!driverData?.stops ? <div className="text-center py-10 text-muted-foreground">Select a route and date to view driver sheet</div> : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50 text-xs">
                  <th className="border-b p-2 text-left">Stop</th><th className="border-b p-2 text-left">Code</th><th className="border-b p-2 text-left">Agent Name</th><th className="border-b p-2 text-left">Route</th><th className="border-b p-2 text-right">Morning</th><th className="border-b p-2 text-right">Evening</th><th className="border-b p-2 text-right font-bold">Total</th><th className="border-b p-2 text-center">Status</th>
                </tr></thead>
                <tbody>{driverData.stops.filter(s => s.grandTotal > 0).map(s => (
                  <tr key={s.stopNo} className="hover:bg-muted/20">
                    <td className="border-b p-2">{s.stopNo}</td><td className="border-b p-2 font-mono">{s.agentCode}</td><td className="border-b p-2 font-medium">{s.agentName}</td><td className="border-b p-2 text-muted-foreground">{s.route}</td><td className="border-b p-2 text-right">{s.morningQty || ""}</td><td className="border-b p-2 text-right">{s.eveningQty || ""}</td><td className="border-b p-2 text-right font-bold">{s.grandTotal}</td>
                    <td className="border-b p-2 text-center"><Badge variant={s.deliveryStatus === "pending" ? "default" : "secondary"} className="text-[10px]">{s.deliveryStatus === "pending" ? "Pending" : "No Supply"}</Badge></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
