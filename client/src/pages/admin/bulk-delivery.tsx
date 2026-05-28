import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "./layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import TripPlanningWizard from "@/components/delivery/trip-planning-wizard";
import ActiveTripsPanel from "@/components/delivery/active-trips-panel";
import FleetVehiclesPanel from "@/components/delivery/fleet-vehicles-panel";
import DriversPanel from "@/components/delivery/drivers-panel";
import PerformancePanel from "@/components/delivery/performance-panel";
import { Package, Truck, Route, Play, Users, BarChart3, ExternalLink, Clock, CheckCircle, AlertTriangle, Search, RefreshCw, MapPin, Upload, Download, FileSpreadsheet, FileText, Zap, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Settings } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const TABS = [
  { value: "mode-a", label: "System Invoices", icon: Zap },
  { value: "mode-b", label: "Manual Bills", icon: FileSpreadsheet },
  { value: "locations", label: "Locations", icon: MapPin },
  { value: "pending", label: "Pending Jobs", icon: Clock },
  { value: "trips", label: "Trip Planning", icon: Route },
  { value: "active", label: "Active Trips", icon: Play },
  { value: "fleet", label: "Fleet", icon: Truck },
  { value: "drivers", label: "Drivers", icon: Users },
  { value: "performance", label: "Performance", icon: BarChart3 },
];

export default function AdminBulkDelivery() {
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get("tab") || "mode-a";
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.value === tabFromUrl) ? tabFromUrl : "mode-a");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && TABS.some(t => t.value === tab)) setActiveTab(tab);
  }, [location]);

  const { data: authMe, isLoading: authLoading } = useQuery<{ user?: { role?: string; unionId?: string; designationId?: string } }>({
    queryKey: ["/api/auth/me"],
    staleTime: 5 * 60 * 1000,
  });

  const isTransportStaff = authMe?.user?.role === 'union_staff' &&
    (authMe.user.designationId === 'transport_manager' || authMe.user.designationId?.includes('transport'));
  const merchantId = isTransportStaff && authMe?.user?.unionId ? authMe.user.unionId : (authMe?.user?.role === 'union_staff' ? '' : "federation");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-purple-600" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Bulk Delivery</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">System invoices & manual bills — route optimization, trip planning, GPS tracking</p>
            </div>
          </div>
          <a href="/pwa/transport" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" /> Transport Mgr
            </Button>
          </a>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); window.history.replaceState(null, '', `/admin/bulk-delivery?tab=${val}`); }}>
          <TabsList className="flex flex-wrap w-full h-auto gap-1 p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1 flex-shrink-0">
                  <Icon className="h-3.5 w-3.5 hidden sm:inline" /> {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="mode-a"><ModeAPanel merchantId={merchantId} /></TabsContent>
          <TabsContent value="mode-b"><ModeBPanel merchantId={merchantId} /></TabsContent>
          <TabsContent value="locations"><LocationsPanel merchantId={merchantId} /></TabsContent>
          <TabsContent value="pending"><BulkPendingJobs merchantId={merchantId} onAssign={() => { setActiveTab("trips"); window.history.replaceState(null, '', '/admin/bulk-delivery?tab=trips'); }} /></TabsContent>
          <TabsContent value="trips"><TripPlanningWizard merchantId={merchantId} isAdmin={true} canCreateTrips={true} deliveryType="bulk" /></TabsContent>
          <TabsContent value="active"><ActiveTripsPanel merchantId={merchantId} isAdmin={true} deliveryType="bulk" /></TabsContent>
          <TabsContent value="fleet"><FleetVehiclesPanel merchantId={merchantId} isAdmin={true} /></TabsContent>
          <TabsContent value="drivers"><DriversPanel merchantId={merchantId} isAdmin={true} /></TabsContent>
          <TabsContent value="performance"><PerformancePanel merchantId={merchantId} isAdmin={true} isFederation={true} /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function ModeAPanel({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const [step, setStep] = useState<'filter' | 'invoices' | 'stops' | 'optimized' | 'assign'>('filter');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterSegment, setFilterSegment] = useState('all');
  const [filterUnion, setFilterUnion] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [optimizedStops, setOptimizedStops] = useState<any[]>([]);
  const [routeSummary, setRouteSummary] = useState<any[]>([]);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [loading, setLoading] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/bulk-delivery/mode-a/load-invoices", {
        date: filterDate, merchantId, segment: filterSegment === 'all' ? undefined : filterSegment,
      });
      const data = await res.json();
      setInvoices(data);
      setStep('invoices');
      setSelectedIds(data.map((i: any) => i.id));
    } catch { toast({ title: "Failed to load invoices", variant: "destructive" }); }
    setLoading(false);
  };

  const buildStops = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/bulk-delivery/mode-a/build-stops", { invoiceIds: selectedIds });
      const data = await res.json();
      setStops(data.stops);
      setStep('stops');
    } catch { toast({ title: "Failed to build stops", variant: "destructive" }); }
    setLoading(false);
  };

  const optimizeRoutes = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/bulk-delivery/mode-a/optimize", { stops, unionId: filterUnion || 'default' });
      const data = await res.json();
      setOptimizedStops(data.optimizedStops);
      setRouteSummary(data.routeSummary);
      setStep('optimized');
    } catch { toast({ title: "Failed to optimize", variant: "destructive" }); }
    setLoading(false);
  };

  const createTrip = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/bulk-delivery/mode-a/create-trip", {
        optimizedStops, invoiceIds: selectedIds, vehicleNo, driverName,
        segment: filterSegment === 'all' ? 'Mixed' : filterSegment, unionId: filterUnion || 'default',
        merchantId, date: filterDate,
      });
      const data = await res.json();
      toast({ title: `Trip created! ${data.splitInto > 1 ? `Split into ${data.splitInto} trips` : ''}` });
      setStep('filter');
      setInvoices([]);
      setStops([]);
      setOptimizedStops([]);
    } catch { toast({ title: "Failed to create trip", variant: "destructive" }); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Mode A: System Bulk Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">Date</Label><Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-40" /></div>
            <div><Label className="text-xs">Segment</Label>
              <Select value={filterSegment} onValueChange={setFilterSegment}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="Fresh Milk">Fresh Milk</SelectItem>
                  <SelectItem value="Milk Products">Milk Products</SelectItem>
                  <SelectItem value="Ice Cream">Ice Cream</SelectItem>
                  <SelectItem value="Butter Milk">Butter Milk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Union ID</Label><Input value={filterUnion} onChange={e => setFilterUnion(e.target.value)} placeholder="e.g. UNI-AMB-01" className="w-40" /></div>
            <Button onClick={loadInvoices} disabled={loading} className="gap-2"><Search className="h-4 w-4" /> Load Invoices</Button>
          </div>
        </CardContent>
      </Card>

      {step === 'invoices' && invoices.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Confirmed Invoices ({invoices.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto mb-3">
              <Table>
                <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Segment</TableHead><TableHead>Amount</TableHead><TableHead>GPS</TableHead></TableRow></TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell><input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, inv.id] : prev.filter(id => id !== inv.id))} /></TableCell>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{inv.customerName}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{inv.productSegment}</Badge></TableCell>
                      <TableCell className="font-medium">₹{Number(inv.totalAmount).toLocaleString('en-IN')}</TableCell>
                      <TableCell>{inv.deliveryLat ? <MapPin className="h-4 w-4 text-green-500" /> : <MapPin className="h-4 w-4 text-red-400" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button onClick={buildStops} disabled={loading || selectedIds.length === 0} className="gap-2"><Package className="h-4 w-4" /> Build Stops ({selectedIds.length} invoices)</Button>
          </CardContent>
        </Card>
      )}
      {step === 'invoices' && invoices.length === 0 && (
        <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">No confirmed invoices found for the selected filters</p></CardContent></Card>
      )}

      {step === 'stops' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Stop-wise Summary ({stops.length} stops)</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto mb-3">
              <Table>
                <TableHeader><TableRow><TableHead>Location</TableHead><TableHead>Route</TableHead><TableHead>Qty (Nos)</TableHead><TableHead>Bags</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stops.map((s: any, i: number) => (
                    <TableRow key={i}><TableCell className="text-sm">{s.locationName}</TableCell><TableCell>{s.routeNo}</TableCell><TableCell className="font-medium">{s.totalQtyNos}</TableCell><TableCell className="font-medium">{s.bags}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2 items-center">
              <Badge className="bg-blue-100 text-blue-800">Total: {stops.reduce((s: number, st: any) => s + st.totalQtyNos, 0)} Nos / {stops.reduce((s: number, st: any) => s + st.bags, 0)} Bags</Badge>
              <Button onClick={optimizeRoutes} disabled={loading} className="gap-2"><Route className="h-4 w-4" /> Optimize Route</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'optimized' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Optimized Route ({optimizedStops.length} stops)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {routeSummary.map((r: any) => (
                <div key={r.routeNo} className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-500">Route {r.routeNo}</p>
                  <p className="text-lg font-bold text-blue-700">{r.stopsCount} stops</p>
                  <p className="text-xs text-blue-500">{r.totalBags} bags · {r.totalDistanceKm} km</p>
                </div>
              ))}
            </div>
            <div className="border rounded-lg overflow-x-auto mb-4">
              <Table>
                <TableHeader><TableRow><TableHead>Seq</TableHead><TableHead>Location</TableHead><TableHead>Qty</TableHead><TableHead>Bags</TableHead><TableHead>Dist (km)</TableHead><TableHead>Cumul. KM</TableHead></TableRow></TableHeader>
                <TableBody>
                  {optimizedStops.map((s: any) => (
                    <TableRow key={s.stopSeq}><TableCell className="font-bold">{s.stopSeq}</TableCell><TableCell className="text-sm">{s.locationName}</TableCell><TableCell>{s.totalQtyNos}</TableCell><TableCell>{s.bags}</TableCell><TableCell>{s.distanceFromPrevKm}</TableCell><TableCell className="font-medium">{s.cumulativeKm}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div><Label className="text-xs">Vehicle No</Label><Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="TN 01 AB 1234" className="w-40" /></div>
              <div><Label className="text-xs">Driver Name</Label><Input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Driver name" className="w-40" /></div>
              <Button onClick={createTrip} disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700"><CheckCircle className="h-4 w-4" /> Create Trip</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ModeBPanel({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [optimized, setOptimized] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [unionId, setUnionId] = useState('');

  const [bagWeightKg, setBagWeightKg] = useState(13);
  const [packSize, setPackSize] = useState(50);
  const [capacityMode, setCapacityMode] = useState<'bags' | 'tons'>('tons');
  const [vehicleCapacityBags, setVehicleCapacityBags] = useState(154);
  const [vehicleCapacityTons, setVehicleCapacityTons] = useState(2.0);
  const [kmPerLiter, setKmPerLiter] = useState(8);
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState(105);
  const [optimizeMode, setOptimizeMode] = useState<'capacity' | 'vehicleCount'>('capacity');
  const [vehicleCount, setVehicleCount] = useState(3);
  const [vehicleDetails, setVehicleDetails] = useState<Record<number, { vehicleNo: string; driverName: string }>>({});

  const downloadTemplate = async () => {
    const res = await fetch('/api/bulk-delivery/template-download', { credentials: 'include' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Manual_Bills_Import_Template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('merchantId', merchantId);
      formData.append('unionId', unionId);
      const res = await fetch('/api/bulk-delivery/manual-bills/upload', { method: 'POST', body: formData, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadResult(data);
      setOptimized(null);
      toast({ title: `Upload complete: ${data.totalRows} rows processed` });
    } catch (err: any) { toast({ title: err.message || "Upload failed", variant: "destructive" }); }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runOptimize = async () => {
    if (!uploadResult?.batchId) return;
    setLoading(true);
    try {
      const body: any = { packSize, bagWeightKg, kmPerLiter, fuelPricePerLiter, optimizeMode };
      if (optimizeMode === 'vehicleCount') {
        body.vehicleCount = vehicleCount;
      } else if (capacityMode === 'tons') {
        body.vehicleCapacityTons = vehicleCapacityTons;
      } else {
        body.vehicleCapacityBags = vehicleCapacityBags;
      }
      const res = await apiRequest("POST", `/api/bulk-delivery/mode-b/optimize/${uploadResult.batchId}`, body);
      const data = await res.json();
      setOptimized(data);
      toast({ title: "Optimization complete" });
    } catch { toast({ title: "Optimization failed", variant: "destructive" }); }
    setLoading(false);
  };

  const downloadFile = async (type: string) => {
    if (!uploadResult?.batchId) return;
    const urlMap: Record<string, string> = {
      errors: `/api/bulk-delivery/manual-bills/${uploadResult.batchId}/errors-excel`,
      unmatched: `/api/bulk-delivery/manual-bills/${uploadResult.batchId}/unmatched-excel`,
      optimizedStops: `/api/bulk-delivery/mode-b/optimized-stops/${uploadResult.batchId}`,
      routeSummary: `/api/bulk-delivery/mode-b/route-summary/${uploadResult.batchId}`,
      tripSheet: `/api/bulk-delivery/mode-b/trip-sheet/${uploadResult.batchId}`,
      editable: `/api/bulk-delivery/mode-b/editable-stops/${uploadResult.batchId}`,
      tripsExcel: `/api/bulk-delivery/mode-b/trips-excel/${uploadResult.batchId}`,
      vehicleTripSheets: `/api/bulk-delivery/mode-b/vehicle-trip-sheets/${uploadResult.batchId}`,
    };
    let url = urlMap[type];
    if (type === 'vehicleTripSheets' && Object.keys(vehicleDetails).length > 0) {
      url += `?vehicleDetails=${encodeURIComponent(JSON.stringify(vehicleDetails))}`;
    }
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const ext = (type === 'tripSheet' || type === 'vehicleTripSheets') ? 'pdf' : 'xlsx';
    const a = document.createElement('a'); a.href = blobUrl; a.download = `${type}_${uploadResult.batchId}.${ext}`; a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const createTrip = async () => {
    if (!uploadResult?.batchId) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", `/api/bulk-delivery/mode-b/create-trip/${uploadResult.batchId}`, { merchantId, unionId: unionId || 'default' });
      const data = await res.json();
      toast({ title: `Trip created!${data.splitInto > 1 ? ` Split into ${data.splitInto} trips` : ''}` });
    } catch { toast({ title: "Failed to create trip", variant: "destructive" }); }
    setLoading(false);
  };

  const isVehicleCountMode = !!optimized?.vehicleCount;
  const totalTrips = optimized?.tripSummaries?.length || 0;
  const totalFuelL = optimized?.tripSummaries?.reduce((s: number, t: any) => s + (t.fuelLiters || 0), 0) || 0;
  const totalFuelCost = optimized?.tripSummaries?.reduce((s: number, t: any) => s + (t.fuelCost || 0), 0) || 0;
  const totalKg = isVehicleCountMode
    ? (optimized?.tripSummaries?.reduce((s: number, t: any) => s + (t.kg || 0), 0) || 0)
    : (optimized?.routeSummary?.reduce((s: number, r: any) => s + (r.totalKg || 0), 0) || 0);
  const totalVehicles = isVehicleCountMode
    ? (optimized?.vehicleCount || 0)
    : (optimized?.routeSummary?.reduce((s: number, r: any) => s + (r.vehiclesNeeded || 1), 0) || 0);
  const totalDistKm = optimized?.tripSummaries?.reduce((s: number, t: any) => s + (t.distanceKm || 0), 0) || 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-green-600" /> Mode B: Manual Bills (Excel Import)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">Union ID</Label><Input value={unionId} onChange={e => setUnionId(e.target.value)} placeholder="e.g. UNI-AMB-01" className="w-40" /></div>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2"><Download className="h-4 w-4" /> Download Template</Button>
          </div>
          <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium text-sm">Click to upload Excel file</p>
            <p className="text-xs text-muted-foreground mt-1">Accepts .xlsx files with manual bills data</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
          </div>
        </CardContent>
      </Card>

      {uploadResult && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Upload Summary — {uploadResult.batchId}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Total Rows</p><p className="text-xl font-bold">{uploadResult.totalRows}</p></div>
              <div className="bg-green-50 rounded-lg p-3 text-center"><p className="text-xs text-green-600">Valid</p><p className="text-xl font-bold text-green-700">{uploadResult.validRows}</p></div>
              <div className="bg-blue-50 rounded-lg p-3 text-center"><p className="text-xs text-blue-600">Matched</p><p className="text-xl font-bold text-blue-700">{uploadResult.matchedRows}</p></div>
              <div className="bg-orange-50 rounded-lg p-3 text-center"><p className="text-xs text-orange-600">Unmatched</p><p className="text-xl font-bold text-orange-700">{uploadResult.unmatchedRows}</p></div>
              <div className="bg-red-50 rounded-lg p-3 text-center"><p className="text-xs text-red-600">Errors</p><p className="text-xl font-bold text-red-700">{uploadResult.errorRows}</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {uploadResult.errorRows > 0 && <Button variant="outline" size="sm" onClick={() => downloadFile('errors')} className="gap-1 text-red-600"><Download className="h-3 w-3" /> Errors Excel</Button>}
              {uploadResult.unmatchedRows > 0 && <Button variant="outline" size="sm" onClick={() => downloadFile('unmatched')} className="gap-1 text-orange-600"><Download className="h-3 w-3" /> Unmatched Excel</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {uploadResult && !optimized && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" /> Trip Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-medium mb-1 block">Optimization Mode</Label>
              <div className="flex gap-2">
                <Button size="sm" variant={optimizeMode === 'capacity' ? 'default' : 'outline'} onClick={() => setOptimizeMode('capacity')} className="flex-1 text-xs">By Capacity</Button>
                <Button size="sm" variant={optimizeMode === 'vehicleCount' ? 'default' : 'outline'} onClick={() => setOptimizeMode('vehicleCount')} className="flex-1 text-xs">By Vehicle Count</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {optimizeMode === 'capacity' && (
                <div>
                  <Label className="text-xs">Bag Weight (kg)</Label>
                  <Input type="number" min={1} value={bagWeightKg} onChange={e => setBagWeightKg(Number(e.target.value) || 13)} />
                </div>
              )}
              {optimizeMode === 'capacity' && (
                <div>
                  <Label className="text-xs">Pack Size (items/bag)</Label>
                  <Input type="number" min={1} value={packSize} onChange={e => setPackSize(Number(e.target.value) || 50)} />
                </div>
              )}
              {optimizeMode === 'vehicleCount' ? (
                <div>
                  <Label className="text-xs">Number of Vehicles</Label>
                  <Input type="number" min={1} max={50} value={vehicleCount} onChange={e => setVehicleCount(Math.max(1, Number(e.target.value) || 1))} />
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Capacity Mode</Label>
                  <Select value={capacityMode} onValueChange={(v: 'bags' | 'tons') => setCapacityMode(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="tons">Tons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {optimizeMode === 'capacity' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {capacityMode === 'bags' ? (
                  <div>
                    <Label className="text-xs">Vehicle Capacity (bags)</Label>
                    <Input type="number" min={1} value={vehicleCapacityBags} onChange={e => setVehicleCapacityBags(Number(e.target.value) || 154)} />
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs">Vehicle Capacity (tons)</Label>
                    <Input type="number" min={0.1} step={0.1} value={vehicleCapacityTons} onChange={e => setVehicleCapacityTons(Number(e.target.value) || 2)} />
                  </div>
                )}
                <div>
                  <Label className="text-xs">Fuel Efficiency (km/L)</Label>
                  <Input type="number" min={1} value={kmPerLiter} onChange={e => setKmPerLiter(Number(e.target.value) || 8)} />
                </div>
                <div>
                  <Label className="text-xs">Fuel Price (₹/L)</Label>
                  <Input type="number" min={1} value={fuelPricePerLiter} onChange={e => setFuelPricePerLiter(Number(e.target.value) || 105)} />
                </div>
              </div>
            )}
            {optimizeMode === 'vehicleCount' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Fuel Efficiency (km/L)</Label>
                  <Input type="number" min={1} value={kmPerLiter} onChange={e => setKmPerLiter(Number(e.target.value) || 8)} />
                </div>
                <div>
                  <Label className="text-xs">Fuel Price (₹/L)</Label>
                  <Input type="number" min={1} value={fuelPricePerLiter} onChange={e => setFuelPricePerLiter(Number(e.target.value) || 105)} />
                </div>
              </div>
            )}
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              {optimizeMode === 'vehicleCount' ? (
                <p>Routes will be split across <span className="font-semibold text-foreground">{vehicleCount} vehicle{vehicleCount > 1 ? 's' : ''}</span> with balanced load distribution</p>
              ) : (
                <p>Effective capacity: <span className="font-semibold text-foreground">{capacityMode === 'tons' ? `${vehicleCapacityTons} tons (${Math.floor((vehicleCapacityTons * 1000) / bagWeightKg)} bags)` : `${vehicleCapacityBags} bags (${((vehicleCapacityBags * bagWeightKg) / 1000).toFixed(1)} tons)`}</span></p>
              )}
            </div>
            <Button onClick={runOptimize} disabled={loading || (uploadResult?.errorRows || 0) > 0} className="gap-2 w-full">
              <Route className="h-4 w-4" /> {loading ? 'Optimizing...' : optimizeMode === 'vehicleCount' ? `Optimize + Split into ${vehicleCount} Vehicles` : 'Optimize + Split by Capacity'}
            </Button>
            {(uploadResult?.errorRows || 0) > 0 && <p className="text-xs text-red-500">Fix all error rows before optimizing</p>}
          </CardContent>
        </Card>
      )}

      {optimized && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{isVehicleCountMode ? 'Vehicle-Based Route Plan' : 'Optimized Route & Trip Breakdown'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-500">{isVehicleCountMode ? 'Vehicles' : 'Routes'}</p>
                <p className="text-xl font-bold text-blue-700">{isVehicleCountMode ? totalVehicles : (optimized.routeSummary?.length || 0)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-xs text-purple-500">{isVehicleCountMode ? 'Total Stops' : 'Vehicles Needed'}</p>
                <p className="text-xl font-bold text-purple-700">{isVehicleCountMode ? (optimized.optimizedStops?.length || 0) : totalVehicles}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-xs text-orange-500">{isVehicleCountMode ? 'Total Distance' : 'Total Weight'}</p>
                <p className="text-xl font-bold text-orange-700">{isVehicleCountMode ? `${totalDistKm.toFixed(1)} km` : `${(totalKg / 1000).toFixed(1)}t`}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-xs text-amber-600">Total Fuel</p>
                <p className="text-xl font-bold text-amber-700">{totalFuelL.toFixed(1)} L</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xs text-red-500">Fuel Cost</p>
                <p className="text-xl font-bold text-red-700">₹{totalFuelCost.toFixed(0)}</p>
              </div>
            </div>

            {isVehicleCountMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {optimized.tripSummaries?.map((t: any, i: number) => {
                  const vNo = t.vehicleNo || (i + 1);
                  const vd = vehicleDetails[vNo] || { vehicleNo: '', driverName: '' };
                  return (
                    <div key={i} className="bg-white border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">Vehicle {vNo}</span>
                        <Badge variant="outline" className="text-xs">{t.stopsCount} stop{t.stopsCount > 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground mb-2">
                        <span>{t.distanceKm} km</span>
                        <span>{t.fuelLiters} L</span>
                        <span>₹{t.fuelCost}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Vehicle No</Label>
                          <Input value={vd.vehicleNo} onChange={e => setVehicleDetails(prev => ({ ...prev, [vNo]: { ...vd, vehicleNo: e.target.value } }))} placeholder="TN 01 AB 1234" className="h-7 text-xs" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Driver</Label>
                          <Input value={vd.driverName} onChange={e => setVehicleDetails(prev => ({ ...prev, [vNo]: { ...vd, driverName: e.target.value } }))} placeholder="Driver name" className="h-7 text-xs" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {optimized.routeSummary?.map((r: any) => (
                  <div key={r.routeNo} className="bg-white border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">Route {r.routeNo}</span>
                      <Badge variant="outline" className="text-xs">{r.vehiclesNeeded || 1} vehicle{(r.vehiclesNeeded || 1) > 1 ? 's' : ''}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                      <span>{r.stopsCount} stops</span>
                      <span>{r.totalBags} bags</span>
                      <span>{r.totalDistanceKm} km</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                      <span>{((r.totalKg || 0) / 1000).toFixed(1)}t</span>
                      <span>{(r.totalFuelLiters || 0).toFixed(1)} L</span>
                      <span>₹{(r.totalFuelCost || 0).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalTrips > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">{`Vehicle Breakdown (${totalTrips} vehicle${totalTrips > 1 ? 's' : ''})`}</p>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Vehicle</TableHead>
                        {!isVehicleCountMode && <TableHead className="text-xs">Route</TableHead>}
                        <TableHead className="text-xs">Stops</TableHead>
                        <TableHead className="text-xs">KM</TableHead>
                        <TableHead className="text-xs">Fuel L</TableHead>
                        <TableHead className="text-xs">Fuel ₹</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optimized.tripSummaries?.map((t: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{isVehicleCountMode ? `Vehicle ${t.vehicleNo || (i + 1)}` : `Vehicle ${t.vehicleNo || (i + 1)}`}</TableCell>
                          {!isVehicleCountMode && <TableCell className="text-xs"><Badge variant="outline" className="text-xs">Route {t.routeNo}</Badge></TableCell>}
                          <TableCell className="text-xs">{t.stopsCount}</TableCell>
                          <TableCell className="text-xs">{t.distanceKm}</TableCell>
                          <TableCell className="text-xs">{t.fuelLiters}</TableCell>
                          <TableCell className="text-xs">₹{t.fuelCost}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold mb-2">Optimized Stops ({optimized.optimizedStops?.length || 0})</p>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="text-xs">Seq</TableHead><TableHead className="text-xs">Rte</TableHead><TableHead className="text-xs">Location</TableHead><TableHead className="text-xs">Packets</TableHead><TableHead className="text-xs">BAGS</TableHead><TableHead className="text-xs">Division</TableHead><TableHead className="text-xs">KM</TableHead></TableRow></TableHeader>
                  <TableBody>{optimized.optimizedStops?.slice(0, 50).map((s: any) => (<TableRow key={s.stopSeq}><TableCell className="text-xs font-bold">{s.stopSeq}</TableCell><TableCell className="text-xs">{s.routeNo}</TableCell><TableCell className="text-xs">{s.locationName}</TableCell><TableCell className="text-xs">{s.totalQtyNos}</TableCell><TableCell className="text-xs">{s.bags}</TableCell><TableCell className="text-xs">{s.division || '—'}</TableCell><TableCell className="text-xs">{s.cumulativeKm}</TableCell></TableRow>))}</TableBody>
                </Table>
                {(optimized.optimizedStops?.length || 0) > 50 && <p className="text-xs text-center text-muted-foreground py-2">Showing first 50 of {optimized.optimizedStops.length} stops. Download XLSX for full list.</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadFile('optimizedStops')} className="gap-1"><FileSpreadsheet className="h-3 w-3" /> Stops XLSX</Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile('routeSummary')} className="gap-1"><FileSpreadsheet className="h-3 w-3" /> Summary</Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile('tripsExcel')} className="gap-1"><FileSpreadsheet className="h-3 w-3" /> Trips XLSX</Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile('tripSheet')} className="gap-1"><FileText className="h-3 w-3" /> Trip Sheet PDF</Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile('vehicleTripSheets')} className="gap-1 text-purple-600 border-purple-200"><Truck className="h-3 w-3" /> Vehicle Trip Sheets</Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile('editable')} className="gap-1"><FileSpreadsheet className="h-3 w-3" /> Editable</Button>
              <Button onClick={createTrip} disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700"><Truck className="h-4 w-4" /> Dispatch</Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => setOptimized(null)} className="gap-1 text-xs">
              <Settings className="h-3 w-3" /> Re-configure & Re-optimize
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LocationsPanel({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const [routeFilter, setRouteFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editLoc, setEditLoc] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: locations = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/bulk-delivery-locations', merchantId],
    queryFn: async () => { const res = await fetch(`/api/bulk-delivery-locations/${merchantId}`, { credentials: 'include' }); return res.json(); },
  });

  const filtered = locations.filter((l: any) => {
    if (routeFilter !== 'all' && l.routeNo !== Number(routeFilter)) return false;
    if (segmentFilter !== 'all' && l.defaultSegment !== segmentFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return l.locationName?.toLowerCase().includes(s) || l.address?.toLowerCase().includes(s) || l.zone?.includes(s);
    }
    return true;
  });

  const toggleActive = async (loc: any) => {
    try {
      await apiRequest("PATCH", `/api/bulk-delivery-locations/${loc.id}`, { isActive: !loc.isActive });
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-delivery-locations', merchantId] });
    } catch { toast({ title: "Failed to update", variant: "destructive" }); }
  };

  const deleteLoc = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/bulk-delivery-locations/${id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-delivery-locations', merchantId] });
      toast({ title: "Location deactivated" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('merchantId', merchantId);
    try {
      const res = await fetch('/api/bulk-delivery-locations/bulk-import', { method: 'POST', body: formData, credentials: 'include' });
      const data = await res.json();
      toast({ title: `Imported ${data.imported} locations` });
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-delivery-locations', merchantId] });
    } catch { toast({ title: "Import failed", variant: "destructive" }); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveLoc = async (data: any) => {
    try {
      if (data.id) {
        await apiRequest("PATCH", `/api/bulk-delivery-locations/${data.id}`, data);
      } else {
        await apiRequest("POST", "/api/bulk-delivery-locations", { ...data, merchantId });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-delivery-locations', merchantId] });
      toast({ title: data.id ? "Location updated" : "Location created" });
      setEditLoc(null);
      setShowAdd(false);
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search locations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={routeFilter} onValueChange={setRouteFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Route" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Routes</SelectItem>{[1,2,3,4,5].map(r => <SelectItem key={r} value={String(r)}>Route {r}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Segment" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Segments</SelectItem><SelectItem value="Fresh Milk">Fresh Milk</SelectItem><SelectItem value="Milk Products">Milk Products</SelectItem><SelectItem value="Ice Cream">Ice Cream</SelectItem><SelectItem value="Butter Milk">Butter Milk</SelectItem></SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1"><Upload className="h-3 w-3" /> Bulk Import</Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleBulkImport} className="hidden" />
        <Button size="sm" onClick={() => { setShowAdd(true); setEditLoc({ routeNo: 1, locationName: '', locationType: '', address: '', defaultSegment: 'Butter Milk', isActive: true, zone: '', division: '', unionId: '' }); }} className="gap-1"><Plus className="h-3 w-3" /> Add Location</Button>
      </div>

      {isLoading ? <Skeleton className="h-40" /> : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Route</TableHead><TableHead>Zone</TableHead><TableHead>Div</TableHead><TableHead>Location</TableHead><TableHead>Type</TableHead><TableHead>Address</TableHead><TableHead>Lat/Long</TableHead><TableHead>Segment</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((l: any) => (
                <TableRow key={l.id} className={!l.isActive ? 'opacity-50' : ''}>
                  <TableCell className="font-bold">{l.routeNo}</TableCell>
                  <TableCell>{l.zone}</TableCell>
                  <TableCell>{l.division}</TableCell>
                  <TableCell className="text-sm font-medium max-w-[200px] truncate">{l.locationName}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{l.locationType}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{l.address}</TableCell>
                  <TableCell className="text-xs font-mono">{l.latitude ? `${Number(l.latitude).toFixed(4)}, ${Number(l.longitude).toFixed(4)}` : '—'}</TableCell>
                  <TableCell><Badge className="text-xs bg-blue-100 text-blue-800">{l.defaultSegment}</Badge></TableCell>
                  <TableCell><button onClick={() => toggleActive(l)}>{l.isActive ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}</button></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditLoc(l)}><Edit className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteLoc(l.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{filtered.length} of {locations.length} locations shown</p>

      {(editLoc || showAdd) && <LocationEditDialog loc={editLoc} onSave={saveLoc} onClose={() => { setEditLoc(null); setShowAdd(false); }} />}
    </div>
  );
}

function LocationEditDialog({ loc, onSave, onClose }: { loc: any; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState(loc || {});
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{form.id ? 'Edit Location' : 'Add Location'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Location Name</Label><Input value={form.locationName || ''} onChange={e => setForm({ ...form, locationName: e.target.value })} /></div>
          <div><Label className="text-xs">Type</Label><Input value={form.locationType || ''} onChange={e => setForm({ ...form, locationType: e.target.value })} placeholder="Division Office" /></div>
          <div><Label className="text-xs">Route No</Label><Input type="number" value={form.routeNo || ''} onChange={e => setForm({ ...form, routeNo: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Union ID</Label><Input value={form.unionId || ''} onChange={e => setForm({ ...form, unionId: e.target.value })} /></div>
          <div><Label className="text-xs">Zone</Label><Input value={form.zone || ''} onChange={e => setForm({ ...form, zone: e.target.value })} /></div>
          <div><Label className="text-xs">Division</Label><Input value={form.division || ''} onChange={e => setForm({ ...form, division: e.target.value })} /></div>
          <div className="col-span-2"><Label className="text-xs">Address</Label><Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label className="text-xs">Latitude</Label><Input value={form.latitude || ''} onChange={e => setForm({ ...form, latitude: e.target.value })} /></div>
          <div><Label className="text-xs">Longitude</Label><Input value={form.longitude || ''} onChange={e => setForm({ ...form, longitude: e.target.value })} /></div>
          <div><Label className="text-xs">Segment</Label>
            <Select value={form.defaultSegment || 'Butter Milk'} onValueChange={v => setForm({ ...form, defaultSegment: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Fresh Milk">Fresh Milk</SelectItem><SelectItem value="Milk Products">Milk Products</SelectItem><SelectItem value="Ice Cream">Ice Cream</SelectItem><SelectItem value="Butter Milk">Butter Milk</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkPendingJobs({ merchantId, onAssign }: { merchantId: string; onAssign?: () => void }) {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: jobs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery-jobs", merchantId, "bulk", "pending"],
    queryFn: async () => { const res = await fetch(`/api/delivery-jobs/${merchantId}?deliveryType=bulk`, { credentials: "include" }); return res.json(); },
  });

  const handleRevalidate = async (jobId: number) => {
    try {
      const res = await apiRequest("POST", `/api/delivery-jobs/${jobId}/revalidate`);
      const data = await res.json();
      toast({ title: data.status === "ready_for_trip" ? "Validation passed" : "Still has errors" });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-jobs"] });
    } catch { toast({ title: "Revalidation failed", variant: "destructive" }); }
  };

  const filtered = (jobs || []).filter((j: any) => !search || j.customerName?.toLowerCase().includes(search.toLowerCase()) || j.jobId?.toLowerCase().includes(search.toLowerCase()));
  const statusColors: Record<string, string> = { pending_validation: "bg-orange-100 text-orange-800", validation_failed: "bg-red-100 text-red-800", ready_for_trip: "bg-green-100 text-green-800", assigned: "bg-blue-100 text-blue-800", in_transit: "bg-indigo-100 text-indigo-800", delivered: "bg-emerald-100 text-emerald-800" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/delivery-jobs"] })}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      {isLoading ? <Skeleton className="h-20" /> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" /><p className="font-medium">No bulk delivery jobs</p></CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Job ID</TableHead><TableHead>Customer</TableHead><TableHead>Segment</TableHead><TableHead>GPS</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((job: any) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs">{job.jobId}</TableCell>
                  <TableCell><div className="font-medium text-sm">{job.customerName}</div><div className="text-xs text-muted-foreground">{job.deliveryAddress?.slice(0, 40)}</div></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{job.segment}</Badge></TableCell>
                  <TableCell>{job.deliveryLat && job.deliveryLat !== "0" ? <MapPin className="h-4 w-4 text-green-500" /> : <MapPin className="h-4 w-4 text-red-400" />}</TableCell>
                  <TableCell className="font-medium">₹{Number(job.totalAmount || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell><Badge className={`text-xs ${statusColors[job.status] || "bg-gray-100"}`}>{job.status?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {job.status === "validation_failed" && <Button size="sm" variant="outline" onClick={() => handleRevalidate(job.id)} className="text-xs">Revalidate</Button>}
                      {job.status === "ready_for_trip" && onAssign && <Button size="sm" variant="outline" className="text-xs" onClick={onAssign}>Assign</Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
