import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "./layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Download, FileText, RefreshCw, Calendar, FileDown, Lock, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();

const formatCurrency = (value: number | string | undefined | null): string => {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return `₹${num.toFixed(2)}`;
};

export default function DmsGstrPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const merchantId = user?.unionId || user?.id || "";

  const [gstr1Month, setGstr1Month] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [gstr1Year, setGstr1Year] = useState(String(currentYear));
  const [gstr1Enabled, setGstr1Enabled] = useState(false);

  const [gstr3bMonth, setGstr3bMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [gstr3bYear, setGstr3bYear] = useState(String(currentYear));
  const [gstr3bEnabled, setGstr3bEnabled] = useState(false);

  const { data: filingPeriods = [] } = useQuery<any[]>({
    queryKey: ["/api/gstr/periods", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/gstr/periods/${merchantId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const lockPeriodMutation = useMutation({
    mutationFn: async ({ month, year }: { month: string; year: string }) => {
      return apiRequest("POST", "/api/gstr/lock-period", { merchantId, month: parseInt(month), year: parseInt(year) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gstr/periods", merchantId] });
      toast({ title: "Period Locked", description: "GST filing period has been locked. No further edits allowed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to lock period", variant: "destructive" });
    },
  });

  const markFiledMutation = useMutation({
    mutationFn: async ({ month, year }: { month: string; year: string }) => {
      return apiRequest("POST", "/api/gstr/mark-filed", { merchantId, month: parseInt(month), year: parseInt(year) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gstr/periods", merchantId] });
      toast({ title: "Marked as Filed", description: "GST return has been marked as filed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to mark as filed", variant: "destructive" });
    },
  });

  const getPeriodStatus = (month: string, year: string) => {
    const period = filingPeriods.find((p: any) => String(p.month).padStart(2, "0") === month && String(p.year) === year);
    return period?.status || "open";
  };

  const isPeriodLocked = (month: string, year: string) => {
    const status = getPeriodStatus(month, year);
    return status === "locked" || status === "filed";
  };

  const { data: gstr1Data, isLoading: gstr1Loading, refetch: refetchGstr1 } = useQuery<any>({
    queryKey: ["/api/gstr/gstr1-enhanced", merchantId, gstr1Month, gstr1Year],
    queryFn: async () => {
      const res = await fetch(`/api/gstr/gstr1-enhanced/${merchantId}?month=${gstr1Month}&year=${gstr1Year}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch GSTR-1 data");
      return res.json();
    },
    enabled: gstr1Enabled && !!merchantId,
  });

  const { data: gstr3bData, isLoading: gstr3bLoading, refetch: refetchGstr3b } = useQuery<any>({
    queryKey: ["/api/gstr/gstr3b", merchantId, gstr3bMonth, gstr3bYear],
    queryFn: async () => {
      const res = await fetch(`/api/gstr/gstr3b/${merchantId}?month=${gstr3bMonth}&year=${gstr3bYear}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch GSTR-3B data");
      return res.json();
    },
    enabled: gstr3bEnabled && !!merchantId,
  });

  const handleGenerateGstr1 = () => {
    if (isPeriodLocked(gstr1Month, gstr1Year)) {
      toast({ title: "Period Locked", description: "This filing period is locked. Cannot re-generate.", variant: "destructive" });
      return;
    }
    setGstr1Enabled(true);
    refetchGstr1();
    toast({ title: "Generating GSTR-1", description: `Fetching data for ${months.find(m => m.value === gstr1Month)?.label} ${gstr1Year}` });
  };

  const handleGenerateGstr3b = () => {
    if (isPeriodLocked(gstr3bMonth, gstr3bYear)) {
      toast({ title: "Period Locked", description: "This filing period is locked. Cannot re-generate.", variant: "destructive" });
      return;
    }
    setGstr3bEnabled(true);
    refetchGstr3b();
    toast({ title: "Generating GSTR-3B", description: `Fetching data for ${months.find(m => m.value === gstr3bMonth)?.label} ${gstr3bYear}` });
  };

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast({ title: "Download Started", description: `${filename} is downloading.` });
  };

  const b2bInvoices = gstr1Data?.b2b || [];
  const b2cSummary = gstr1Data?.b2cs || [];
  const hsnSummary = gstr1Data?.hsn?.data || gstr1Data?.hsn || [];

  const table31 = gstr3bData?.table31 || gstr3bData?.sup_details || {};
  const table32 = gstr3bData?.table32 || gstr3bData?.inter_sup || {};
  const taxLiability = gstr3bData?.taxLiability || gstr3bData?.tax_liability || {};

  return (
    <AdminLayout>
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          DMS - GST Returns
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Generate GSTR-1 and GSTR-3B data for GST portal filing
        </p>
      </div>

      {filingPeriods.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
              Filing Period Status
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Track locked and filed GST periods</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="flex flex-wrap gap-2">
              {filingPeriods.map((period: any, idx: number) => {
                const monthLabel = months.find(m => m.value === String(period.month).padStart(2, "0"))?.label || period.month;
                return (
                  <Badge
                    key={idx}
                    className={
                      period.status === "filed"
                        ? "bg-green-100 text-green-800"
                        : period.status === "locked"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {period.status === "filed" ? <CheckCircle className="h-3 w-3 mr-1" /> :
                     period.status === "locked" ? <Lock className="h-3 w-3 mr-1" /> : null}
                    {monthLabel} {period.year} - {period.status.charAt(0).toUpperCase() + period.status.slice(1)}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="gstr1" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md overflow-x-auto">
          <TabsTrigger value="gstr1" className="text-xs sm:text-sm">GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr3b" className="text-xs sm:text-sm">GSTR-3B</TabsTrigger>
        </TabsList>

        <TabsContent value="gstr1" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                Report Parameters
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Select period to generate GSTR-1 return data</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Month</Label>
                  <Select value={gstr1Month} onValueChange={setGstr1Month}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Year</Label>
                  <Input
                    type="number"
                    value={gstr1Year}
                    onChange={(e) => setGstr1Year(e.target.value)}
                    min={2020}
                    max={2030}
                    className="w-full"
                  />
                </div>
                <div className="col-span-2 md:col-span-2 flex flex-wrap gap-2">
                  {isPeriodLocked(gstr1Month, gstr1Year) && (
                    <div className="w-full flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      <Lock className="h-4 w-4" />
                      Period is {getPeriodStatus(gstr1Month, gstr1Year)} — re-generation blocked
                    </div>
                  )}
                  <Button onClick={handleGenerateGstr1} disabled={gstr1Loading || isPeriodLocked(gstr1Month, gstr1Year)} className="min-h-[44px] flex-1">
                    {gstr1Loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    Generate
                  </Button>
                  {gstr1Data && (
                    <Button
                      variant="outline"
                      onClick={() => downloadJson(gstr1Data, `GSTR1_${gstr1Month}_${gstr1Year}.json`)}
                      className="min-h-[44px]"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download JSON
                    </Button>
                  )}
                  {gstr1Data && !isPeriodLocked(gstr1Month, gstr1Year) && (
                    <Button
                      variant="outline"
                      className="min-h-[44px] border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      onClick={() => lockPeriodMutation.mutate({ month: gstr1Month, year: gstr1Year })}
                      disabled={lockPeriodMutation.isPending}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Lock Period
                    </Button>
                  )}
                  {gstr1Data && getPeriodStatus(gstr1Month, gstr1Year) === "locked" && (
                    <Button
                      variant="outline"
                      className="min-h-[44px] border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => markFiledMutation.mutate({ month: gstr1Month, year: gstr1Year })}
                      disabled={markFiledMutation.isPending}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Mark as Filed
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {gstr1Loading && (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {gstr1Data && !gstr1Loading && (
            <>
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">B2B Invoices</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Business-to-Business supply details</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  {b2bInvoices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">No B2B invoices found for this period.</p>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>GSTIN</TableHead>
                              <TableHead>Invoice No</TableHead>
                              <TableHead>Invoice Date</TableHead>
                              <TableHead className="text-right">Taxable Value</TableHead>
                              <TableHead className="text-right">CGST</TableHead>
                              <TableHead className="text-right">SGST</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {b2bInvoices.map((inv: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono text-sm">{inv.ctin || inv.gstin || "-"}</TableCell>
                                <TableCell>{inv.inum || inv.invoiceNo || "-"}</TableCell>
                                <TableCell>{inv.idt || inv.invoiceDate || "-"}</TableCell>
                                <TableCell className="text-right">{formatCurrency(inv.txval || inv.taxableValue)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(inv.camt || inv.cgst)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(inv.samt || inv.sgst)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(inv.total || ((inv.txval || 0) + (inv.camt || 0) + (inv.samt || 0)))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:hidden space-y-2">
                        {b2bInvoices.map((inv: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-3 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-xs truncate">{inv.ctin || inv.gstin || "-"}</p>
                                <p className="text-sm font-medium">{inv.inum || inv.invoiceNo || "-"}</p>
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0">{inv.idt || inv.invoiceDate || "-"}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground pt-1 border-t">
                              <div>Taxable: {formatCurrency(inv.txval || inv.taxableValue)}</div>
                              <div>CGST: {formatCurrency(inv.camt || inv.cgst)}</div>
                              <div>SGST: {formatCurrency(inv.samt || inv.sgst)}</div>
                              <div className="font-medium text-foreground">Total: {formatCurrency(inv.total || ((inv.txval || 0) + (inv.camt || 0) + (inv.samt || 0)))}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">B2C Summary</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Business-to-Consumer rate-wise summary</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  {b2cSummary.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">No B2C data found for this period.</p>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rate (%)</TableHead>
                              <TableHead className="text-right">Taxable Value</TableHead>
                              <TableHead className="text-right">CGST</TableHead>
                              <TableHead className="text-right">SGST</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {b2cSummary.map((item: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell>{item.rt || item.rate || "0"}%</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.txval || item.taxableValue)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.camt || item.cgst)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.samt || item.sgst)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.total || ((item.txval || 0) + (item.camt || 0) + (item.samt || 0)))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:hidden space-y-2">
                        {b2cSummary.map((item: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-3 space-y-1">
                            <div className="flex justify-between items-center">
                              <Badge variant="outline" className="text-xs">Rate: {item.rt || item.rate || "0"}%</Badge>
                              <span className="font-medium text-sm">{formatCurrency(item.total || ((item.txval || 0) + (item.camt || 0) + (item.samt || 0)))}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                              <div>Taxable: {formatCurrency(item.txval || item.taxableValue)}</div>
                              <div>CGST: {formatCurrency(item.camt || item.cgst)}</div>
                              <div>SGST: {formatCurrency(item.samt || item.sgst)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">HSN Summary</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">HSN-wise summary of outward supplies</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  {(Array.isArray(hsnSummary) ? hsnSummary : []).length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">No HSN data found for this period.</p>
                  ) : (
                    <>
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>HSN Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead className="text-right">Taxable Value</TableHead>
                              <TableHead className="text-right">CGST</TableHead>
                              <TableHead className="text-right">SGST</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(Array.isArray(hsnSummary) ? hsnSummary : []).map((item: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono">{item.hsn_sc || item.hsnCode || "-"}</TableCell>
                                <TableCell>{item.desc || item.description || "-"}</TableCell>
                                <TableCell className="text-right">{item.qty || item.quantity || 0}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.txval || item.taxableValue)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.camt || item.cgst)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.samt || item.sgst)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.total || ((item.txval || 0) + (item.camt || 0) + (item.samt || 0)))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:hidden space-y-2">
                        {(Array.isArray(hsnSummary) ? hsnSummary : []).map((item: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-3 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-mono text-xs">{item.hsn_sc || item.hsnCode || "-"}</p>
                                <p className="text-sm font-medium">{item.desc || item.description || "-"}</p>
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0">Qty: {item.qty || item.quantity || 0}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground pt-1 border-t">
                              <div>Taxable: {formatCurrency(item.txval || item.taxableValue)}</div>
                              <div>CGST: {formatCurrency(item.camt || item.cgst)}</div>
                              <div>SGST: {formatCurrency(item.samt || item.sgst)}</div>
                              <div className="font-medium text-foreground">Total: {formatCurrency(item.total || ((item.txval || 0) + (item.camt || 0) + (item.samt || 0)))}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!gstr1Data && !gstr1Loading && (
            <Card>
              <CardContent className="text-center py-8 sm:py-12 text-muted-foreground">
                <FileDown className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm">Select a month and year, then click Generate to fetch GSTR-1 data.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="gstr3b" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                Report Parameters
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Select period to generate GSTR-3B summary</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Month</Label>
                  <Select value={gstr3bMonth} onValueChange={setGstr3bMonth}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Year</Label>
                  <Input
                    type="number"
                    value={gstr3bYear}
                    onChange={(e) => setGstr3bYear(e.target.value)}
                    min={2020}
                    max={2030}
                    className="w-full"
                  />
                </div>
                <div className="col-span-2 md:col-span-2 flex flex-wrap gap-2">
                  {isPeriodLocked(gstr3bMonth, gstr3bYear) && (
                    <div className="w-full flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      <Lock className="h-4 w-4" />
                      Period is {getPeriodStatus(gstr3bMonth, gstr3bYear)} — re-generation blocked
                    </div>
                  )}
                  <Button onClick={handleGenerateGstr3b} disabled={gstr3bLoading || isPeriodLocked(gstr3bMonth, gstr3bYear)} className="min-h-[44px] flex-1">
                    {gstr3bLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    Generate
                  </Button>
                  {gstr3bData && (
                    <Button
                      variant="outline"
                      onClick={() => downloadJson(gstr3bData, `GSTR3B_${gstr3bMonth}_${gstr3bYear}.json`)}
                      className="min-h-[44px]"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download JSON
                    </Button>
                  )}
                  {gstr3bData && !isPeriodLocked(gstr3bMonth, gstr3bYear) && (
                    <Button
                      variant="outline"
                      className="min-h-[44px] border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      onClick={() => lockPeriodMutation.mutate({ month: gstr3bMonth, year: gstr3bYear })}
                      disabled={lockPeriodMutation.isPending}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Lock Period
                    </Button>
                  )}
                  {gstr3bData && getPeriodStatus(gstr3bMonth, gstr3bYear) === "locked" && (
                    <Button
                      variant="outline"
                      className="min-h-[44px] border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => markFiledMutation.mutate({ month: gstr3bMonth, year: gstr3bYear })}
                      disabled={markFiledMutation.isPending}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Mark as Filed
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {gstr3bLoading && (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {gstr3bData && !gstr3bLoading && (
            <>
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Table 3.1 - Outward Supplies</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Details of outward supplies and inward supplies liable to reverse charge</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nature of Supplies</TableHead>
                          <TableHead className="text-right">Taxable Value</TableHead>
                          <TableHead className="text-right">IGST</TableHead>
                          <TableHead className="text-right">CGST</TableHead>
                          <TableHead className="text-right">SGST</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Outward taxable supplies (other than zero rated, nil rated and exempted)</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_det?.txval || table31.taxable?.taxableValue || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_det?.iamt || table31.taxable?.igst || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_det?.camt || table31.taxable?.cgst || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_det?.samt || table31.taxable?.sgst || 0)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Outward taxable supplies (zero rated)</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_zero?.txval || table31.zeroRated?.taxableValue || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_zero?.iamt || table31.zeroRated?.igst || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_zero?.camt || table31.zeroRated?.cgst || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_zero?.samt || table31.zeroRated?.sgst || 0)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Other outward supplies (nil rated, exempted)</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_nil_exmp?.txval || table31.exempt?.taxableValue || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_nil_exmp?.iamt || table31.exempt?.igst || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_nil_exmp?.camt || table31.exempt?.cgst || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.osup_nil_exmp?.samt || table31.exempt?.sgst || 0)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Inward supplies (liable to reverse charge)</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.isup_rev?.txval || table31.reverseCharge?.taxableValue || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.isup_rev?.iamt || table31.reverseCharge?.igst || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.isup_rev?.camt || table31.reverseCharge?.cgst || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(table31.isup_rev?.samt || table31.reverseCharge?.sgst || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-2">
                    {[
                      { label: "Outward taxable supplies", data: table31.osup_det || table31.taxable || {} },
                      { label: "Zero rated supplies", data: table31.osup_zero || table31.zeroRated || {} },
                      { label: "Nil rated / Exempted", data: table31.osup_nil_exmp || table31.exempt || {} },
                      { label: "Reverse charge", data: table31.isup_rev || table31.reverseCharge || {} },
                    ].map((row, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-1.5">
                        <p className="text-sm font-medium">{row.label}</p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <div>Taxable: {formatCurrency(row.data.txval || row.data.taxableValue || 0)}</div>
                          <div>IGST: {formatCurrency(row.data.iamt || row.data.igst || 0)}</div>
                          <div>CGST: {formatCurrency(row.data.camt || row.data.cgst || 0)}</div>
                          <div>SGST: {formatCurrency(row.data.samt || row.data.sgst || 0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Table 3.2 - Inter-State Supplies</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Inter-state supplies to unregistered persons and composition taxable persons</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Place of Supply (State)</TableHead>
                          <TableHead className="text-right">Taxable Value</TableHead>
                          <TableHead className="text-right">IGST</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(Array.isArray(table32.unreg_details || table32.unregistered) ? (table32.unreg_details || table32.unregistered) : []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">No inter-state supplies found for this period.</TableCell>
                          </TableRow>
                        ) : (
                          (table32.unreg_details || table32.unregistered || []).map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{item.pos || item.placeOfSupply || "-"}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.txval || item.taxableValue)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.iamt || item.igst)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-2">
                    {(Array.isArray(table32.unreg_details || table32.unregistered) ? (table32.unreg_details || table32.unregistered) : []).length === 0 ? (
                      <p className="text-center text-muted-foreground py-4 text-sm">No inter-state supplies found for this period.</p>
                    ) : (
                      (table32.unreg_details || table32.unregistered || []).map((item: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-3 space-y-1">
                          <p className="text-sm font-medium">{item.pos || item.placeOfSupply || "-"}</p>
                          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                            <div>Taxable: {formatCurrency(item.txval || item.taxableValue)}</div>
                            <div>IGST: {formatCurrency(item.iamt || item.igst)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Tax Liability Summary</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Total tax liability for the period</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tax Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">CGST</TableCell>
                          <TableCell className="text-right">{formatCurrency(taxLiability.cgst || 0)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">SGST</TableCell>
                          <TableCell className="text-right">{formatCurrency(taxLiability.sgst || 0)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">IGST</TableCell>
                          <TableCell className="text-right">{formatCurrency(taxLiability.igst || 0)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell className="font-bold">Total</TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency((taxLiability.cgst || 0) + (taxLiability.sgst || 0) + (taxLiability.igst || 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "CGST", value: taxLiability.cgst || 0 },
                        { label: "SGST", value: taxLiability.sgst || 0 },
                        { label: "IGST", value: taxLiability.igst || 0 },
                      ].map((tax, idx) => (
                        <div key={idx} className="border rounded-lg p-2 sm:p-3 text-center">
                          <p className="text-xs text-muted-foreground">{tax.label}</p>
                          <p className="text-sm sm:text-base font-medium">{formatCurrency(tax.value)}</p>
                        </div>
                      ))}
                      <div className="border rounded-lg p-2 sm:p-3 text-center bg-muted/50">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm sm:text-base font-bold">{formatCurrency((taxLiability.cgst || 0) + (taxLiability.sgst || 0) + (taxLiability.igst || 0))}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!gstr3bData && !gstr3bLoading && (
            <Card>
              <CardContent className="text-center py-8 sm:py-12 text-muted-foreground">
                <FileDown className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm">Select a month and year, then click Generate to fetch GSTR-3B summary.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}
