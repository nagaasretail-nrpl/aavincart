import { useState, useRef, useCallback } from "react";
import AdminLayout from "./layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Download, Upload, FileText, Calendar, Info, Clock, CheckCircle, AlertCircle, Eye, ArrowRight, Users, Package, Receipt, Loader2, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ExportRecord {
  id: string;
  startDate: string;
  endDate: string;
  exportedAt: string;
  filename: string;
}

interface PreviewData {
  masters: {
    ledgers: number;
    stockItems: number;
    groups: number;
    stockGroups: number;
    units: number;
    godowns: number;
    voucherTypes: number;
  };
  transactions: {
    totalVouchers: number;
    byType: Record<string, number>;
  };
  sampleLedgers: Array<{ name: string; parent: string; gstin: string }>;
  sampleStockItems: Array<{ name: string; parent: string; baseUnit: string; hsnCode: string }>;
}

interface ImportSummary {
  importId: number;
  summary: {
    ledgers: { found: number; imported: number };
    stockItems: { found: number; imported: number };
    vouchers: { found: number; imported: number };
    errors: number;
    errorSamples: string[];
  };
}

interface ImportLog {
  id: number;
  filename: string;
  ledgersFound: number;
  stockitemsFound: number;
  vouchersFound: number;
  ledgersImported: number;
  stockitemsImported: number;
  vouchersImported: number;
  status: string;
  createdAt: string;
}

export default function DmsTallyPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const [exportApprovedOnly, setExportApprovedOnly] = useState(true);
  const [exportIncludeCreditNotes, setExportIncludeCreditNotes] = useState(true);
  const [exportIncludePayments, setExportIncludePayments] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const [mapResult, setMapResult] = useState<any>(null);

  const { data: importLogs, refetch: refetchLogs } = useQuery<ImportLog[]>({
    queryKey: ['/api/tally/imports'],
  });

  const merchantId = user?.unionId || user?.id || "default";

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Missing Dates", description: "Please select both start and end dates.", variant: "destructive" });
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast({ title: "Invalid Date Range", description: "Start date must be before end date.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (exportApprovedOnly) params.append('includeApprovedOnly', 'true');
      if (exportIncludeCreditNotes) params.append('includeCreditNotes', 'true');
      if (exportIncludePayments) params.append('includePayments', 'true');
      const useFiltered = exportApprovedOnly || exportIncludeCreditNotes || exportIncludePayments;
      const response = await fetch(`/api/tally/${useFiltered ? 'export-filtered' : 'export'}/${merchantId}?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const xmlText = await response.text();
      const blob = new Blob([xmlText], { type: "application/xml" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tally_export_${startDate}_${endDate}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setExportHistory((prev) => [{ id: Date.now().toString(), startDate, endDate, exportedAt: new Date().toLocaleString(), filename: `tally_export_${startDate}_${endDate}.xml` }, ...prev]);
      toast({ title: "Export Successful", description: "Tally XML file has been downloaded." });
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message || "Failed to export.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewData(null);
      setImportResult(null);
      setMapResult(null);
    }
  };

  const handlePreview = useCallback(async () => {
    if (!selectedFile) return;
    setIsPreviewing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('/api/tally/import/preview', { method: 'POST', body: formData, credentials: 'include' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Preview failed');
      }
      const data = await res.json();
      setPreviewData(data.preview);
      toast({ title: "Preview Ready", description: "Review the data below before importing." });
    } catch (error: any) {
      toast({ title: "Preview Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  }, [selectedFile, toast]);

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('merchantId', merchantId);
      const res = await fetch('/api/tally/import', { method: 'POST', body: formData, credentials: 'include' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }
      const data = await res.json();
      setImportResult(data);
      refetchLogs();
      toast({ title: "Import Completed", description: `Imported ${data.summary.ledgers.imported} ledgers, ${data.summary.stockItems.imported} products, ${data.summary.vouchers.imported} vouchers.` });
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleMapToApp = async () => {
    if (!importResult?.importId) return;
    setIsMapping(true);
    try {
      const res = await fetch(`/api/tally/import/${importResult.importId}/map-to-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Mapping failed');
      const data = await res.json();
      setMapResult(data.results);
      refetchLogs();
      toast({ title: "Mapping Completed", description: `Created ${data.results.usersCreated} users, mapped ${data.results.ordersCreated} orders.` });
    } catch (error: any) {
      toast({ title: "Mapping Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsMapping(false);
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Tally Integration</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Import from and export to Tally accounting software</p>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2 overflow-x-auto">
          <TabsTrigger value="import" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"><Upload className="w-3 h-3 sm:w-4 sm:h-4" /> Import</TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"><Download className="w-3 h-3 sm:w-4 sm:h-4" /> Export</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Upload className="w-4 h-4 sm:w-5 sm:h-5" /> Upload Tally Export File</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Upload your Master.xml, Transactions.xml, or a ZIP containing both files exported from Tally</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="border-2 border-dashed rounded-lg p-6 sm:p-8 text-center">
                <input ref={fileInputRef} type="file" accept=".xml,.zip" onChange={handleFileSelect} className="hidden" />
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="font-medium text-sm sm:text-base truncate max-w-[250px] mx-auto">{selectedFile.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="min-h-[44px]">Change File</Button>
                      <Button onClick={handlePreview} disabled={isPreviewing} className="min-h-[44px]">
                        {isPreviewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                        Preview
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="min-h-[44px]">Select File</Button>
                    <p className="text-xs text-muted-foreground">Supports .xml (UTF-8/UTF-16) and .zip files up to 100MB</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {previewData && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Eye className="w-4 h-4 sm:w-5 sm:h-5" /> Preview Summary</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Review the data that will be imported</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2 sm:p-4 text-center">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-blue-600" />
                    <p className="text-xl sm:text-2xl font-bold">{previewData.masters.ledgers}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Ledgers</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2 sm:p-4 text-center">
                    <Package className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-green-600" />
                    <p className="text-xl sm:text-2xl font-bold">{previewData.masters.stockItems}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Stock Items</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-2 sm:p-4 text-center">
                    <Receipt className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-purple-600" />
                    <p className="text-xl sm:text-2xl font-bold">{previewData.transactions.totalVouchers}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Vouchers</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-2 sm:p-4 text-center">
                    <FileText className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-orange-600" />
                    <p className="text-xl sm:text-2xl font-bold">{previewData.masters.groups + previewData.masters.stockGroups}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Groups</p>
                  </div>
                </div>

                {Object.keys(previewData.transactions.byType).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm sm:text-base">Vouchers by Type</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(previewData.transactions.byType).map(([type, count]) => (
                        <Badge key={type} variant="outline" className="text-xs sm:text-sm">
                          {type}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {previewData.sampleLedgers.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm sm:text-base">Sample Ledgers (first 5)</h4>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead>GSTIN</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.sampleLedgers.map((l, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{l.name}</TableCell>
                              <TableCell>{l.parent}</TableCell>
                              <TableCell><code className="text-xs">{l.gstin || '-'}</code></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-2">
                      {previewData.sampleLedgers.map((l, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <p className="font-medium text-sm">{l.name}</p>
                          <p className="text-xs text-muted-foreground">Group: {l.parent}</p>
                          <p className="text-xs text-muted-foreground">GSTIN: {l.gstin || '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewData.sampleStockItems.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm sm:text-base">Sample Stock Items (first 5)</h4>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>HSN</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.sampleStockItems.map((s, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell>{s.parent}</TableCell>
                              <TableCell>{s.baseUnit || '-'}</TableCell>
                              <TableCell><code className="text-xs">{s.hsnCode || '-'}</code></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-2">
                      {previewData.sampleStockItems.map((s, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">Group: {s.parent}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">Unit: {s.baseUnit || '-'}</span>
                            <span className="text-xs text-muted-foreground">HSN: {s.hsnCode || '-'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button onClick={handleImport} disabled={isImporting} className="flex-1 min-h-[44px]">
                    {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Import to Staging Tables
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {importResult && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  {importResult.summary.errors > 0 ? <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" /> : <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="border rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs sm:text-sm font-medium">Ledgers</span>
                      <Badge variant={importResult.summary.ledgers.imported === importResult.summary.ledgers.found ? "default" : "secondary"}>
                        {importResult.summary.ledgers.imported}/{importResult.summary.ledgers.found}
                      </Badge>
                    </div>
                    <Progress value={importResult.summary.ledgers.found > 0 ? (importResult.summary.ledgers.imported / importResult.summary.ledgers.found) * 100 : 0} />
                  </div>
                  <div className="border rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs sm:text-sm font-medium">Stock Items</span>
                      <Badge variant={importResult.summary.stockItems.imported === importResult.summary.stockItems.found ? "default" : "secondary"}>
                        {importResult.summary.stockItems.imported}/{importResult.summary.stockItems.found}
                      </Badge>
                    </div>
                    <Progress value={importResult.summary.stockItems.found > 0 ? (importResult.summary.stockItems.imported / importResult.summary.stockItems.found) * 100 : 0} />
                  </div>
                  <div className="border rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs sm:text-sm font-medium">Vouchers</span>
                      <Badge variant={importResult.summary.vouchers.imported === importResult.summary.vouchers.found ? "default" : "secondary"}>
                        {importResult.summary.vouchers.imported}/{importResult.summary.vouchers.found}
                      </Badge>
                    </div>
                    <Progress value={importResult.summary.vouchers.found > 0 ? (importResult.summary.vouchers.imported / importResult.summary.vouchers.found) * 100 : 0} />
                  </div>
                </div>

                {importResult.summary.errors > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2 text-sm sm:text-base">{importResult.summary.errors} errors occurred</p>
                    <ul className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 space-y-1 max-h-40 overflow-y-auto">
                      {importResult.summary.errorSamples.map((err, i) => (
                        <li key={i} className="truncate">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button onClick={handleMapToApp} disabled={isMapping} className="w-full min-h-[44px]">
                    {isMapping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                    <span className="text-xs sm:text-sm">Map to App Tables (Create Users, Link Products, Map Orders)</span>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This will create B2B users from ledgers, link stock items to products, and map vouchers to orders/payments.
                  </p>
                </div>

                {mapResult && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4 mt-4">
                    <p className="font-medium text-green-800 dark:text-green-200 mb-2 text-sm sm:text-base">Mapping Completed</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div><span className="font-medium">{mapResult.usersCreated}</span> users created</div>
                      <div><span className="font-medium">{mapResult.productsCreated}</span> products matched</div>
                      <div><span className="font-medium">{mapResult.ordersCreated}</span> orders mapped</div>
                      <div><span className="font-medium">{mapResult.paymentsCreated}</span> payments mapped</div>
                    </div>
                    {mapResult.errors?.length > 0 && (
                      <p className="text-xs text-yellow-600 mt-2">{mapResult.errors.length} mapping errors occurred</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Clock className="w-4 h-4 sm:w-5 sm:h-5" /> Import History</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Previous Tally imports</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {(!importLogs || importLogs.length === 0) ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm">No imports yet.</p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File</TableHead>
                          <TableHead>Ledgers</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Vouchers</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">{log.filename}</TableCell>
                            <TableCell>{log.ledgersImported}/{log.ledgersFound}</TableCell>
                            <TableCell>{log.stockitemsImported}/{log.stockitemsFound}</TableCell>
                            <TableCell>{log.vouchersImported}/{log.vouchersFound}</TableCell>
                            <TableCell>
                              <Badge variant={log.status === 'completed' ? 'default' : log.status === 'completed_with_errors' ? 'secondary' : 'outline'}>
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{new Date(log.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-2">
                    {importLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate flex-1">{log.filename}</p>
                          <Badge variant={log.status === 'completed' ? 'default' : log.status === 'completed_with_errors' ? 'secondary' : 'outline'} className="text-xs shrink-0">
                            {log.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="block font-medium text-foreground">Ledgers</span>
                            {log.ledgersImported}/{log.ledgersFound}
                          </div>
                          <div>
                            <span className="block font-medium text-foreground">Items</span>
                            {log.stockitemsImported}/{log.stockitemsFound}
                          </div>
                          <div>
                            <span className="block font-medium text-foreground">Vouchers</span>
                            {log.vouchersImported}/{log.vouchersFound}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Download className="w-4 h-4 sm:w-5 sm:h-5" /> Export to Tally</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Select a date range and export sales vouchers as Tally XML</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="flex items-center gap-1 text-xs sm:text-sm"><Calendar className="w-3 h-3 sm:w-4 sm:h-4" /> Start Date</Label>
                  <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="flex items-center gap-1 text-xs sm:text-sm"><Calendar className="w-3 h-3 sm:w-4 sm:h-4" /> End Date</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
                </div>
                <Button onClick={handleExport} disabled={isExporting} className="w-full col-span-2 md:col-span-1 min-h-[44px]">
                  {isExporting ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Export to Tally
                </Button>
              </div>

              <div className="mt-4 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Export Filters</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="export-approved-only"
                      checked={exportApprovedOnly}
                      onCheckedChange={(checked) => setExportApprovedOnly(!!checked)}
                    />
                    <label htmlFor="export-approved-only" className="text-sm cursor-pointer">Approved Invoices Only</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="export-credit-notes"
                      checked={exportIncludeCreditNotes}
                      onCheckedChange={(checked) => setExportIncludeCreditNotes(!!checked)}
                    />
                    <label htmlFor="export-credit-notes" className="text-sm cursor-pointer">Include Credit Notes</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="export-payments"
                      checked={exportIncludePayments}
                      onCheckedChange={(checked) => setExportIncludePayments(!!checked)}
                    />
                    <label htmlFor="export-payments" className="text-sm cursor-pointer">Include Payments</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><FileText className="w-4 h-4 sm:w-5 sm:h-5" /> Export History</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Recent exports from this session</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {exportHistory.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm">No exports yet.</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {exportHistory.map((record) => (
                    <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{record.filename}</p>
                          <p className="text-xs text-muted-foreground">{record.startDate} to {record.endDate} &middot; {record.exportedAt}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="self-start sm:self-auto shrink-0">Downloaded</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><Info className="w-4 h-4 sm:w-5 sm:h-5" /> How to Import in Tally</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground text-xs sm:text-sm">
                <li>Exports sales vouchers in Tally-compatible XML format</li>
                <li>Import the downloaded XML in <strong>Tally &gt; Gateway &gt; Import Data</strong></li>
              </ul>
              <div>
                <p className="text-xs sm:text-sm font-medium mb-1">Supported Data:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Sales Invoices</Badge>
                  <Badge variant="outline" className="text-xs">Customer Details</Badge>
                  <Badge variant="outline" className="text-xs">Tax Breakdowns</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}
