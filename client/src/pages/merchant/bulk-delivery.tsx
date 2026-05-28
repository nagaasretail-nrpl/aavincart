import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TripPlanningWizard from "@/components/delivery/trip-planning-wizard";
import ActiveTripsPanel from "@/components/delivery/active-trips-panel";
import FleetVehiclesPanel from "@/components/delivery/fleet-vehicles-panel";
import DriversPanel from "@/components/delivery/drivers-panel";
import PerformancePanel from "@/components/delivery/performance-panel";
import { Package, Truck, Route, Play, Users, BarChart3, Clock, CheckCircle, AlertTriangle, Search, RefreshCw, MapPin, Upload, Download, FileSpreadsheet, FileText, Zap, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Settings } from "lucide-react";
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

export default function MerchantBulkDelivery() {
  return (
    <MerchantLayout>
      <MerchantBulkDeliveryContent />
    </MerchantLayout>
  );
}

function MerchantBulkDeliveryContent() {
  const { merchantId } = useMerchantContext();
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get("tab") || "mode-a";
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.value === tabFromUrl) ? tabFromUrl : "mode-a");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && TABS.some(t => t.value === tab)) setActiveTab(tab);
  }, [location]);

  if (!merchantId) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-purple-600" />
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Bulk Delivery</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">System invoices & manual bills — route optimization, trip planning</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); window.history.replaceState(null, '', `/merchant/bulk-delivery?tab=${val}`); }}>
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
        <TabsContent value="pending"><PendingJobsPanel merchantId={merchantId} onAssign={() => { setActiveTab("trips"); window.history.replaceState(null, '', '/merchant/bulk-delivery?tab=trips'); }} /></TabsContent>
        <TabsContent value="trips"><TripPlanningWizard merchantId={merchantId} isAdmin={false} canCreateTrips={true} deliveryType="bulk" /></TabsContent>
        <TabsContent value="active"><ActiveTripsPanel merchantId={merchantId} isAdmin={false} deliveryType="bulk" /></TabsContent>
        <TabsContent value="fleet"><FleetVehiclesPanel merchantId={merchantId} isAdmin={false} /></TabsContent>
        <TabsContent value="drivers"><DriversPanel merchantId={merchantId} isAdmin={false} /></TabsContent>
        <TabsContent value="performance"><PerformancePanel merchantId={merchantId} isAdmin={false} isFederation={false} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ModeAPanel({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const [step, setStep] = useState<'filter' | 'invoices' | 'stops' | 'optimized'>('filter');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterSegment, setFilterSegment] = useState('all');
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
      const res = await apiRequest("POST", "/api/bulk-delivery/mode-a/load-invoices", { date: filterDate, merchantId, segment: filterSegment === 'all' ? undefined : filterSegment });
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
      const res = await apiRequest("POST", "/api/bulk-delivery/mode-a/optimize", { stops });
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
      const res = await apiRequest("POST", "/api/bulk-delivery/mode-a/create-trip", { optimizedStops, invoiceIds: selectedIds, vehicleNo, driverName, segment: filterSegment === 'all' ? 'Mixed' : filterSegment, merchantId, date: filterDate });
      const data = await res.json();
      toast({ title: `Trip created!${data.splitInto > 1 ? ` Split into ${data.splitInto} trips` : ''}` });
      setStep('filter'); setInvoices([]); setStops([]); setOptimizedStops([]);
    } catch { toast({ title: "Failed to create trip", variant: "destructive" }); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Mode A: System Bulk Invoices</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">Date</Label><Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-40" /></div>
            <div><Label className="text-xs">Segment</Label>
              <Select value={filterSegment} onValueChange={setFilterSegment}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Segments</SelectItem><SelectItem value="Fresh Milk">Fresh Milk</SelectItem><SelectItem value="Milk Products">Milk Products</SelectItem><SelectItem value="Ice Cream">Ice Cream</SelectItem><SelectItem value="Butter Milk">Butter Milk</SelectItem></SelectContent>
              </Select>
            </div>
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
                <TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>GPS</TableHead></TableRow></TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell><input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, inv.id] : prev.filter(id => id !== inv.id))} /></TableCell>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{inv.customerName}</TableCell>
                      <TableCell className="font-medium">₹{Number(inv.totalAmount).toLocaleString('en-IN')}</TableCell>
                      <TableCell>{inv.deliveryLat ? <MapPin className="h-4 w-4 text-green-500" /> : <MapPin className="h-4 w-4 text-red-400" />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button onClick={buildStops} disabled={loading || selectedIds.length === 0} className="gap-2"><Package className="h-4 w-4" /> Build Stops</Button>
          </CardContent>
        </Card>
      )}
      {step === 'invoices' && invoices.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No confirmed invoices found</CardContent></Card>}

      {step === 'stops' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Stop Summary ({stops.length} stops)</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto mb-3">
              <Table>
                <TableHeader><TableRow><TableHead>Location</TableHead><TableHead>Route</TableHead><TableHead>Qty</TableHead><TableHead>Bags</TableHead></TableRow></TableHeader>
                <TableBody>{stops.map((s: any, i: number) => (<TableRow key={i}><TableCell>{s.locationName}</TableCell><TableCell>{s.routeNo}</TableCell><TableCell>{s.totalQtyNos}</TableCell><TableCell>{s.bags}</TableCell></TableRow>))}</TableBody>
              </Table>
            </div>
            <Button onClick={optimizeRoutes} disabled={loading} className="gap-2"><Route className="h-4 w-4" /> Optimize Route</Button>
          </CardContent>
        </Card>
      )}

      {step === 'optimized' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Optimized Route</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {routeSummary.map((r: any) => (<div key={r.routeNo} className="bg-blue-50 rounded-lg p-3 text-center"><p className="text-xs text-blue-500">Route {r.routeNo}</p><p className="text-lg font-bold text-blue-700">{r.stopsCount} stops</p><p className="text-xs">{r.totalBags} bags</p></div>))}
            </div>
            <div className="border rounded-lg overflow-x-auto mb-4">
              <Table>
                <TableHeader><TableRow><TableHead>Seq</TableHead><TableHead>Location</TableHead><TableHead>Qty</TableHead><TableHead>Bags</TableHead><TableHead>KM</TableHead></TableRow></TableHeader>
                <TableBody>{optimizedStops.map((s: any) => (<TableRow key={s.stopSeq}><TableCell className="font-bold">{s.stopSeq}</TableCell><TableCell>{s.locationName}</TableCell><TableCell>{s.totalQtyNos}</TableCell><TableCell>{s.bags}</TableCell><TableCell>{s.cumulativeKm}</TableCell></TableRow>))}</TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div><Label className="text-xs">Vehicle</Label><Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} className="w-40" /></div>
              <div><Label className="text-xs">Driver</Label><Input value={driverName} onChange={e => setDriverName(e.target.value)} className="w-40" /></div>
              <Button onClick={createTrip} disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700"><CheckCircle className="h-4 w-4" /> Create Trip</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TruckLoadSVG({
  loadPct, loadedKg, capacityKg, idx = 0, size = 'lg', colorVariant,
}: {
  loadPct: number; loadedKg?: number; capacityKg?: number; idx?: number; size?: 'sm' | 'lg';
  colorVariant?: 'normal' | 'warn' | 'danger';
}) {
  const filled = Math.min(100, Math.max(0, Math.round(loadPct)));
  const isDanger = colorVariant ? colorVariant === 'danger' : filled >= 95;
  const isWarn = colorVariant ? colorVariant === 'warn' : (filled >= 80 && !isDanger);
  const c1 = isDanger ? '#f87171' : isWarn ? '#fbbf24' : '#38bdf8';
  const c2 = isDanger ? '#dc2626' : isWarn ? '#d97706' : '#0ea5e9';
  const gId = `tg${idx}`, cId = `tc${idx}`, sId = `ts${idx}`, fId = `tf${idx}`;

  if (size === 'sm') {
    const tx = 32, ty = 4, tw = 56, th = 22;
    const fw = Math.round((tw * filled) / 100);
    return (
      <svg viewBox="0 0 90 46" width={90} height={46} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id={`${gId}s`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} /><stop offset="100%" stopColor={c2} />
          </linearGradient>
          <clipPath id={`${cId}s`}><rect x={tx} y={ty} width={tw} height={th} rx="2" /></clipPath>
        </defs>
        <rect x={tx} y={ty} width={tw} height={th} rx="2" fill="#f9fafb" stroke="#d1d5db" strokeWidth="1" />
        <rect x={tx} y={ty} width={fw} height={th} rx="2" fill={`url(#${gId}s)`} clipPath={`url(#${cId}s)`} />
        <rect x={tx} y={ty} width={tw} height={th} rx="2" fill="none" stroke="#d1d5db" strokeWidth="1" />
        <line x1={tx+18} y1={ty+1} x2={tx+18} y2={ty+th-1} stroke="#e5e7eb" strokeWidth="1" />
        <line x1={tx+36} y1={ty+1} x2={tx+36} y2={ty+th-1} stroke="#e5e7eb" strokeWidth="1" />
        <rect x="8" y="10" width="26" height="16" rx="2" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.75" />
        <rect x="10" y="12" width="19" height="10" rx="1" fill="#93c5fd" opacity="0.75" />
        <rect x="27" y="4" width="3" height="8" rx="1.5" fill="#9ca3af" />
        <rect x="6" y="26" width="80" height="3.5" rx="1.5" fill="#6b7280" />
        <circle cx="20" cy="37" r="8" fill="#1f2937" /><circle cx="20" cy="37" r="5" fill="#4b5563" /><circle cx="20" cy="37" r="2.5" fill="#9ca3af" />
        <circle cx="58" cy="37" r="8" fill="#1f2937" /><circle cx="58" cy="37" r="5" fill="#4b5563" /><circle cx="58" cy="37" r="2.5" fill="#9ca3af" />
        <circle cx="70" cy="37" r="8" fill="#1f2937" /><circle cx="70" cy="37" r="5" fill="#4b5563" /><circle cx="70" cy="37" r="2.5" fill="#9ca3af" />
      </svg>
    );
  }

  const tx = 118, ty = 8, tw = 420, th = 114;
  const fw = Math.round((tw * filled) / 100);
  const tcx = tx + tw / 2;
  return (
    <svg viewBox="0 0 560 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full" style={{ maxHeight: 155 }}>
      <defs>
        <linearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c1} stopOpacity="0.9" /><stop offset="100%" stopColor={c2} />
        </linearGradient>
        <clipPath id={cId}><rect x={tx} y={ty} width={tw} height={th} rx="7" /></clipPath>
        <pattern id={sId} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="24" fill="white" opacity="0.12" />
        </pattern>
        <filter id={fId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>
      <rect x={tx} y={ty} width={tw} height={th} rx="7" fill="#f9fafb" />
      <rect x={tx} y={ty} width={fw} height={th} fill={`url(#${gId})`} clipPath={`url(#${cId})`} />
      <rect x={tx} y={ty} width={fw} height={th} fill={`url(#${sId})`} clipPath={`url(#${cId})`} />
      <rect x={tx} y={ty} width={tw} height={th} rx="7" fill="none" stroke="#d1d5db" strokeWidth="2" />
      <line x1={tx+140} y1={ty+3} x2={tx+140} y2={ty+th-3} stroke="#e5e7eb" strokeWidth="1.5" />
      <line x1={tx+280} y1={ty+3} x2={tx+280} y2={ty+th-3} stroke="#e5e7eb" strokeWidth="1.5" />
      <text x={tcx} y={ty+th*0.48} textAnchor="middle" fill={filled>=25?'white':c2} fontSize="38" fontWeight="bold" fontFamily="system-ui,sans-serif" filter={filled>=25?`url(#${fId})`:undefined}>{filled}%</text>
      <text x={tcx} y={ty+th*0.67} textAnchor="middle" fill={filled>=25?'rgba(255,255,255,0.92)':'#6b7280'} fontSize="15" fontWeight="600" fontFamily="system-ui,sans-serif" filter={filled>=25?`url(#${fId})`:undefined}>Loaded</text>
      {loadedKg!==undefined&&capacityKg!==undefined&&(
        <text x={tcx} y={ty+th*0.87} textAnchor="middle" fill={filled>=25?'rgba(255,255,255,0.80)':'#9ca3af'} fontSize="13" fontFamily="system-ui,sans-serif" filter={filled>=25?`url(#${fId})`:undefined}>
          {Math.round(loadedKg).toLocaleString('en-IN')} kg / {Math.round(capacityKg).toLocaleString('en-IN')} kg
        </text>
      )}
      <rect x="106" y={ty} width="14" height="28" fill="#e5e7eb" />
      <rect x="52" y="36" width="68" height="86" rx="6" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1.5" />
      <rect x="58" y="42" width="56" height="50" rx="4" fill="#93c5fd" opacity="0.75" />
      <line x1="58" y1="96" x2="114" y2="96" stroke="#d1d5db" strokeWidth="1" />
      <rect x="74" y="107" width="16" height="3.5" rx="1.75" fill="#9ca3af" />
      <rect x="36" y="108" width="22" height="14" rx="3" fill="#d1d5db" />
      <rect x="38" y="98" width="18" height="10" rx="2.5" fill="#fef9c3" stroke="#fde68a" strokeWidth="1" />
      <rect x="40" y="100" width="14" height="6" rx="1.5" fill="#fde68a" opacity="0.8" />
      <rect x="104" y="10" width="7" height="28" rx="3.5" fill="#9ca3af" />
      <rect x="36" y="122" width="514" height="7" rx="3" fill="#6b7280" />
      <rect x="548" y="108" width="14" height="21" rx="3" fill="#d1d5db" />
      <circle cx="86" cy="148" r="20" fill="#1f2937" /><circle cx="86" cy="148" r="13" fill="#4b5563" /><circle cx="86" cy="148" r="6" fill="#9ca3af" />
      <circle cx="420" cy="148" r="20" fill="#1f2937" /><circle cx="420" cy="148" r="13" fill="#4b5563" /><circle cx="420" cy="148" r="6" fill="#9ca3af" />
      <circle cx="462" cy="148" r="20" fill="#1f2937" /><circle cx="462" cy="148" r="13" fill="#4b5563" /><circle cx="462" cy="148" r="6" fill="#9ca3af" />
    </svg>
  );
}

function ModeBPanel({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [optimized, setOptimized] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState(0);

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
  const [mobileTab, setMobileTab] = useState<'fleet' | 'detail'>('fleet');

  useEffect(() => { setSelectedVehicleIdx(0); setMobileTab('fleet'); }, [optimized]);

  const downloadTemplate = async () => {
    const res = await fetch('/api/bulk-delivery/template-download', { credentials: 'include' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Manual_Bills_Import_Template.xlsx'; a.click(); URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('merchantId', merchantId);
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
    let fetchUrl = urlMap[type];
    if (type === 'vehicleTripSheets' && Object.keys(vehicleDetails).length > 0) {
      fetchUrl += `?vehicleDetails=${encodeURIComponent(JSON.stringify(vehicleDetails))}`;
    }
    const res = await fetch(fetchUrl, { credentials: 'include' });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const ext = (type === 'tripSheet' || type === 'vehicleTripSheets') ? 'pdf' : 'xlsx';
    const a = document.createElement('a'); a.href = blobUrl; a.download = `${type}_${uploadResult.batchId}.${ext}`; a.click(); URL.revokeObjectURL(blobUrl);
  };

  const createTrip = async () => {
    if (!uploadResult?.batchId) return;
    setLoading(true);
    try {
      const res = await apiRequest("POST", `/api/bulk-delivery/mode-b/create-trip/${uploadResult.batchId}`, { merchantId });
      const data = await res.json();
      toast({ title: `Trip created!${data.splitInto > 1 ? ` Split into ${data.splitInto} trips` : ''}` });
    } catch { toast({ title: "Failed to create trip", variant: "destructive" }); }
    setLoading(false);
  };

  const isVehicleCountMode = !!optimized?.vehicleCount;
  const tripSummaries: any[] = optimized?.tripSummaries || [];
  const totalFuelL = tripSummaries.reduce((s, t) => s + (t.fuelLiters || 0), 0);
  const totalFuelCost = tripSummaries.reduce((s, t) => s + (t.fuelCost || 0), 0);
  const totalKg = tripSummaries.reduce((s: number, t: any) => s + (t.kg || 0), 0);
  const totalVehicles = isVehicleCountMode
    ? (optimized?.vehicleCount || tripSummaries.length)
    : tripSummaries.length;
  const totalDistKm = tripSummaries.reduce((s, t) => s + (t.distanceKm || 0), 0);
  const allStops: any[] = optimized?.optimizedStops || [];

  const effectiveCapacityKg = isVehicleCountMode
    ? (totalVehicles > 0 ? totalKg / totalVehicles : 0)
    : (capacityMode === 'tons' ? vehicleCapacityTons * 1000 : vehicleCapacityBags * bagWeightKg);

  const selectedTrip = tripSummaries[selectedVehicleIdx] || null;
  const vehicleStops: any[] = selectedTrip
    ? (optimized?.vehicleTrips?.[selectedVehicleIdx] || [])
    : [];

  const selectedKg = selectedTrip?.kg || 0;
  const loadPct = effectiveCapacityKg > 0 ? Math.min(100, Math.round((selectedKg / effectiveCapacityKg) * 100)) : 0;
  const loadColor = loadPct >= 95 ? 'from-red-500 to-red-600' : loadPct >= 80 ? 'from-amber-400 to-orange-500' : 'from-blue-500 to-indigo-600';

  const effectiveCapacityBags = bagWeightKg > 0 ? Math.floor(effectiveCapacityKg / bagWeightKg) : 0;
  const vehicleStopOverflow: boolean[] = (() => {
    let running = 0;
    return vehicleStops.map((s: any) => {
      running += s.bags || 0;
      return effectiveCapacityBags > 0 && running > effectiveCapacityBags;
    });
  })();

  return (
    <div className="space-y-4">

      {/* ── Step 1: Upload ── */}
      <div className="flex gap-3 items-start">
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${uploadResult ? 'bg-green-500' : 'bg-blue-600'}`}>
          {uploadResult ? <CheckCircle className="h-4 w-4" /> : '1'}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Upload Manual Bills</p>
          <div className="border rounded-xl p-4 bg-white dark:bg-gray-900 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs"><Download className="h-3.5 w-3.5" /> Template</Button>
              <span className="text-xs text-muted-foreground">Download the template, fill it, then upload</span>
            </div>
            <div
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition ${loading ? 'opacity-60 pointer-events-none' : 'hover:border-blue-400 hover:bg-blue-50/40'} ${uploadResult ? 'border-green-400 bg-green-50/40' : 'border-gray-300 bg-muted/20'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-1">
                  <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
                  <p className="text-xs text-muted-foreground">Processing…</p>
                </div>
              ) : uploadResult ? (
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <p className="text-xs font-medium text-green-700">{uploadResult.totalRows} rows uploaded</p>
                  <p className="text-[11px] text-muted-foreground">Click to replace file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-xs font-medium">Click to upload Excel file</p>
                  <p className="text-[11px] text-muted-foreground">Accepts .xlsx files</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
            </div>
            {uploadResult && (
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Total', value: uploadResult.totalRows, bg: 'bg-gray-50 dark:bg-gray-800', lbl: 'text-gray-500', val: 'text-gray-700 dark:text-gray-200' },
                  { label: 'Valid', value: uploadResult.validRows, bg: 'bg-green-50 dark:bg-green-950/30', lbl: 'text-green-600', val: 'text-green-700 dark:text-green-300' },
                  { label: 'Matched', value: uploadResult.matchedRows, bg: 'bg-blue-50 dark:bg-blue-950/30', lbl: 'text-blue-600', val: 'text-blue-700 dark:text-blue-300' },
                  { label: 'Unmatched', value: uploadResult.unmatchedRows, bg: 'bg-orange-50 dark:bg-orange-950/30', lbl: 'text-orange-600', val: 'text-orange-700 dark:text-orange-300' },
                  { label: 'Errors', value: uploadResult.errorRows, bg: 'bg-red-50 dark:bg-red-950/30', lbl: 'text-red-600', val: 'text-red-700 dark:text-red-300' },
                ].map(({ label, value, bg, lbl, val }) => (
                  <div key={label} className={`rounded-lg p-2 text-center ${bg}`}>
                    <p className={`text-[10px] font-medium ${lbl}`}>{label}</p>
                    <p className={`text-lg font-bold ${val}`}>{value}</p>
                  </div>
                ))}
              </div>
            )}
            {uploadResult && (uploadResult.errorRows > 0 || uploadResult.unmatchedRows > 0) && (
              <div className="flex gap-2">
                {uploadResult.errorRows > 0 && <Button variant="outline" size="sm" onClick={() => downloadFile('errors')} className="gap-1 text-red-600 text-xs"><Download className="h-3 w-3" /> Download Errors</Button>}
                {uploadResult.unmatchedRows > 0 && <Button variant="outline" size="sm" onClick={() => downloadFile('unmatched')} className="gap-1 text-orange-600 text-xs"><Download className="h-3 w-3" /> Unmatched</Button>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Step 2: Configure ── */}
      {uploadResult && !optimized && (
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">2</div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Configure & Optimise</p>
            <div className="border rounded-xl p-4 bg-white dark:bg-gray-900 shadow-sm space-y-4">
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Split by</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant={optimizeMode === 'capacity' ? 'default' : 'outline'} onClick={() => setOptimizeMode('capacity')} className="flex-1 text-xs gap-1"><Truck className="h-3 w-3" /> Vehicle Capacity</Button>
                  <Button size="sm" variant={optimizeMode === 'vehicleCount' ? 'default' : 'outline'} onClick={() => setOptimizeMode('vehicleCount')} className="flex-1 text-xs gap-1"><Users className="h-3 w-3" /> Vehicle Count</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {optimizeMode === 'capacity' && <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bag Weight (kg)</Label>
                    <Input type="number" min={1} value={bagWeightKg} onChange={e => setBagWeightKg(Number(e.target.value) || 13)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Pack Size (items/bag)</Label>
                    <Input type="number" min={1} value={packSize} onChange={e => setPackSize(Number(e.target.value) || 50)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Capacity Unit</Label>
                    <Select value={capacityMode} onValueChange={(v: 'bags' | 'tons') => setCapacityMode(v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="tons">Tons</SelectItem><SelectItem value="bags">Bags</SelectItem></SelectContent>
                    </Select>
                  </div>
                  {capacityMode === 'bags'
                    ? <div><Label className="text-xs text-muted-foreground">Capacity (bags)</Label><Input type="number" min={1} value={vehicleCapacityBags} onChange={e => setVehicleCapacityBags(Number(e.target.value) || 154)} className="h-8 text-sm" /></div>
                    : <div><Label className="text-xs text-muted-foreground">Capacity (tons)</Label><Input type="number" min={0.1} step={0.1} value={vehicleCapacityTons} onChange={e => setVehicleCapacityTons(Number(e.target.value) || 2)} className="h-8 text-sm" /></div>
                  }
                </>}
                {optimizeMode === 'vehicleCount' && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Number of Vehicles</Label>
                    <Input type="number" min={1} max={50} value={vehicleCount} onChange={e => setVehicleCount(Math.max(1, Number(e.target.value) || 1))} className="h-8 text-sm" />
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Fuel Efficiency (km/L)</Label>
                  <Input type="number" min={1} value={kmPerLiter} onChange={e => setKmPerLiter(Number(e.target.value) || 8)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fuel Price (₹/L)</Label>
                  <Input type="number" min={1} value={fuelPricePerLiter} onChange={e => setFuelPricePerLiter(Number(e.target.value) || 105)} className="h-8 text-sm" />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                {optimizeMode === 'vehicleCount'
                  ? <>Split across <strong>{vehicleCount}</strong> vehicle{vehicleCount > 1 ? 's' : ''} with balanced load</>
                  : <>Effective capacity: <strong>{capacityMode === 'tons' ? `${vehicleCapacityTons} t` : `${vehicleCapacityBags} bags`}</strong> = <strong>{capacityMode === 'tons' ? `${Math.floor((vehicleCapacityTons * 1000) / bagWeightKg)} bags` : `${((vehicleCapacityBags * bagWeightKg) / 1000).toFixed(1)} t`}</strong></>
                }
              </div>

              <Button onClick={runOptimize} disabled={loading || (uploadResult?.errorRows || 0) > 0} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                <Route className="h-4 w-4" />
                {loading ? 'Optimising…' : optimizeMode === 'vehicleCount' ? `Optimise → ${vehicleCount} Vehicles` : 'Optimise Route'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Visual Results Dashboard ── */}
      {optimized && (
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Route Plan — {isVehicleCountMode ? 'Vehicle Count Mode' : 'Capacity Mode'}</p>

            {/* Summary KPI bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: isVehicleCountMode ? 'Vehicles' : 'Routes', value: isVehicleCountMode ? totalVehicles : (optimized.routeSummary?.length || 0), icon: <Truck className="h-3.5 w-3.5" />, bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', sub: 'text-blue-500' },
                { label: 'Total Stops', value: allStops.length, icon: <MapPin className="h-3.5 w-3.5" />, bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', sub: 'text-purple-500' },
                { label: 'Distance', value: `${totalDistKm.toFixed(0)} km`, icon: <Route className="h-3.5 w-3.5" />, bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', sub: 'text-orange-500' },
                { label: 'Fuel', value: `${totalFuelL.toFixed(0)} L`, icon: <Zap className="h-3.5 w-3.5" />, bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', sub: 'text-amber-500' },
                { label: 'Fuel Cost', value: `₹${totalFuelCost.toFixed(0)}`, icon: <BarChart3 className="h-3.5 w-3.5" />, bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', sub: 'text-red-500' },
              ].map(({ label, value, icon, bg, text, sub }) => (
                <div key={label} className={`${bg} rounded-xl p-3 flex flex-col gap-0.5`}>
                  <div className={`flex items-center gap-1 ${sub} text-[10px] font-medium`}>{icon}{label}</div>
                  <p className={`text-lg font-bold ${text} leading-tight`}>{value}</p>
                </div>
              ))}
            </div>

            {/* ── Mobile tab bar (only visible < lg) ── */}
            <div className="flex lg:hidden rounded-xl border overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
              <button
                onClick={() => setMobileTab('fleet')}
                className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${mobileTab === 'fleet' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <Truck className="h-3.5 w-3.5" /> Fleet ({tripSummaries.length})
              </button>
              <button
                onClick={() => setMobileTab('detail')}
                className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${mobileTab === 'detail' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <MapPin className="h-3.5 w-3.5" /> Details {selectedTrip ? `— V${selectedTrip.vehicleNo || (selectedVehicleIdx + 1)}` : ''}
              </button>
            </div>

            {/* ── Split panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3" style={{ minHeight: 480 }}>

              {/* LEFT: Fleet list */}
              <div className={`flex-col gap-2 border rounded-xl p-2 bg-gray-50 dark:bg-gray-900 overflow-y-auto ${mobileTab === 'fleet' ? 'flex' : 'hidden lg:flex'}`} style={{ maxHeight: 560 }}>
                <p className="text-[11px] font-semibold text-muted-foreground px-1 pt-1">Fleet — {tripSummaries.length} vehicle{tripSummaries.length !== 1 ? 's' : ''}</p>
                {tripSummaries.map((t: any, i: number) => {
                  const vNo = t.vehicleNo || (i + 1);
                  const vd = vehicleDetails[vNo] || { vehicleNo: '', driverName: '' };
                  const vKg = t.kg || 0;
                  const vPct = effectiveCapacityKg > 0 ? Math.min(100, Math.round((vKg / effectiveCapacityKg) * 100)) : 0;
                  const isSelected = i === selectedVehicleIdx;
                  const barColor = vPct >= 95 ? 'bg-red-500' : vPct >= 80 ? 'bg-amber-500' : 'bg-blue-500';
                  return (
                    <div
                      key={i}
                      onClick={() => { setSelectedVehicleIdx(i); setMobileTab('detail'); }}
                      className={`rounded-xl p-3 cursor-pointer transition border-2 select-none ${isSelected ? 'border-blue-500 bg-white dark:bg-gray-800 shadow-md' : 'border-transparent bg-white dark:bg-gray-800 hover:border-blue-300 shadow-sm'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-shrink-0">
                          <TruckLoadSVG idx={i} loadPct={vPct} size="sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">
                            {isVehicleCountMode ? `Vehicle ${vNo}` : `Route ${t.routeNo} — V${t.vehicleNo || (i + 1)}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{t.stopsCount} stop{t.stopsCount !== 1 ? 's' : ''} · {t.distanceKm} km</p>
                        </div>
                        {vPct >= 95 && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                      </div>

                      {/* Load bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                          <span>{vKg > 0 ? `${Math.round(vKg).toLocaleString('en-IN')} kg` : `${t.stopsCount} stops`}</span>
                          <span className="font-semibold">{vKg > 0 ? `${vPct}%` : ''}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${vKg > 0 ? vPct : 0}%` }} />
                        </div>
                      </div>

                      {/* Vehicle no + driver inputs */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">Reg. No</Label>
                          <Input
                            value={vd.vehicleNo}
                            onChange={e => { e.stopPropagation(); setVehicleDetails(prev => ({ ...prev, [vNo]: { ...vd, vehicleNo: e.target.value } })); }}
                            onClick={e => e.stopPropagation()}
                            placeholder="TN 01 AB 1234"
                            className="h-6 text-[10px] px-1.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">Driver</Label>
                          <Input
                            value={vd.driverName}
                            onChange={e => { e.stopPropagation(); setVehicleDetails(prev => ({ ...prev, [vNo]: { ...vd, driverName: e.target.value } })); }}
                            onClick={e => e.stopPropagation()}
                            placeholder="Name"
                            className="h-6 text-[10px] px-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT: Selected vehicle detail */}
              <div className={`flex-col gap-3 ${mobileTab === 'detail' ? 'flex' : 'hidden lg:flex'}`}>
                {selectedTrip ? (
                  <>
                    {/* Capacity visualiser — truck SVG */}
                    <div className="border rounded-xl p-4 bg-white dark:bg-gray-900 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold">
                            {isVehicleCountMode ? `Vehicle ${selectedTrip.vehicleNo || (selectedVehicleIdx + 1)}` : `Route ${selectedTrip.routeNo} — V${selectedTrip.vehicleNo || (selectedVehicleIdx + 1)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{selectedTrip.stopsCount} stops · {selectedTrip.distanceKm} km · {selectedTrip.fuelLiters} L fuel</p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-white text-sm font-bold bg-gradient-to-r ${loadColor}`}>
                          {selectedKg > 0 ? `${loadPct}% Loaded` : `${selectedTrip.stopsCount} stops`}
                        </div>
                      </div>
                      <TruckLoadSVG
                        idx={selectedVehicleIdx}
                        loadPct={loadPct}
                        loadedKg={selectedKg > 0 ? selectedKg : undefined}
                        capacityKg={selectedKg > 0 ? effectiveCapacityKg : undefined}
                        size="lg"
                      />
                      {selectedKg > 0 && (
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>0 kg</span>
                          <span>{Math.round(selectedKg).toLocaleString('en-IN')} kg loaded</span>
                          <span>{Math.round(effectiveCapacityKg).toLocaleString('en-IN')} kg capacity</span>
                        </div>
                      )}
                    </div>

                    {/* Stops table for selected vehicle */}
                    <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm flex-1">
                      <div className="px-4 py-2.5 border-b flex items-center justify-between bg-gray-50 dark:bg-gray-800">
                        <p className="text-xs font-semibold">Stops ({vehicleStops.length})</p>
                      </div>
                      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 320 }}>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/80 dark:bg-gray-800/80">
                              <TableHead className="text-[10px] w-10 py-2">Seq</TableHead>
                              <TableHead className="text-[10px] py-2 w-24 hidden sm:table-cell">Bill No</TableHead>
                              <TableHead className="text-[10px] py-2">Location / Customer</TableHead>
                              <TableHead className="text-[10px] py-2 text-right">Qty</TableHead>
                              <TableHead className="text-[10px] py-2 text-right">Bags</TableHead>
                              <TableHead className="text-[10px] py-2 text-right hidden md:table-cell">Cum. KM</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vehicleStops.length > 0 ? vehicleStops.map((s: any, si: number) => {
                              const isOverload = vehicleStopOverflow[si];
                              return (
                                <TableRow key={si} className={isOverload ? 'bg-amber-50 dark:bg-amber-950/30' : undefined}>
                                  <TableCell className="text-xs font-bold py-2 text-blue-600">{s.stopSeq}</TableCell>
                                  <TableCell className="text-[10px] py-2 font-mono text-muted-foreground hidden sm:table-cell">{s.billNo || '—'}</TableCell>
                                  <TableCell className="text-xs py-2">
                                    <p className="font-medium leading-tight">{s.locationName}</p>
                                    {s.customerName && <p className="text-[10px] text-muted-foreground">{s.customerName}</p>}
                                  </TableCell>
                                  <TableCell className="text-xs py-2 text-right">{s.totalQtyNos}</TableCell>
                                  <TableCell className={`text-xs py-2 text-right font-medium ${isOverload ? 'text-amber-700 dark:text-amber-400' : ''}`}>{s.bags}</TableCell>
                                  <TableCell className="text-xs py-2 text-right text-muted-foreground hidden md:table-cell">{s.cumulativeKm}</TableCell>
                                </TableRow>
                              );
                            }) : (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                                  {allStops.length > 0 ? 'Select a vehicle to see its stops' : 'No stops available'}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="border rounded-xl flex items-center justify-center text-sm text-muted-foreground" style={{ minHeight: 200 }}>
                    Select a vehicle from the fleet list
                  </div>
                )}
              </div>
            </div>

            {/* Downloads + Actions */}
            <div className="border rounded-xl p-4 bg-white dark:bg-gray-900 shadow-sm space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Export & Dispatch</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadFile('optimizedStops')} className="gap-1.5 text-xs"><FileSpreadsheet className="h-3 w-3" /> Stops XLSX</Button>
                <Button variant="outline" size="sm" onClick={() => downloadFile('routeSummary')} className="gap-1.5 text-xs"><FileSpreadsheet className="h-3 w-3" /> Route Summary</Button>
                <Button variant="outline" size="sm" onClick={() => downloadFile('tripsExcel')} className="gap-1.5 text-xs"><FileSpreadsheet className="h-3 w-3" /> Trips XLSX</Button>
                <Button variant="outline" size="sm" onClick={() => downloadFile('tripSheet')} className="gap-1.5 text-xs"><FileText className="h-3 w-3" /> Trip Sheet PDF</Button>
                <Button variant="outline" size="sm" onClick={() => downloadFile('vehicleTripSheets')} className="gap-1.5 text-xs text-purple-600 border-purple-300"><Truck className="h-3 w-3" /> Vehicle Sheets</Button>
                <Button variant="outline" size="sm" onClick={() => downloadFile('editable')} className="gap-1.5 text-xs"><FileSpreadsheet className="h-3 w-3" /> Editable</Button>
              </div>
              <div className="flex gap-2 pt-1 border-t">
                <Button onClick={createTrip} disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none">
                  <Truck className="h-4 w-4" /> {loading ? 'Dispatching…' : 'Dispatch All Trips'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setOptimized(null)} className="gap-1 text-xs">
                  <Settings className="h-3.5 w-3.5" /> Re-configure
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationsPanel({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const [routeFilter, setRouteFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editLoc, setEditLoc] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: locations = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/bulk-delivery-locations', merchantId],
    queryFn: async () => { const res = await fetch(`/api/bulk-delivery-locations/${merchantId}`, { credentials: 'include' }); return res.json(); },
  });

  const filtered = locations.filter((l: any) => {
    if (routeFilter !== 'all' && l.routeNo !== Number(routeFilter)) return false;
    if (search) return l.locationName?.toLowerCase().includes(search.toLowerCase()) || l.address?.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const toggleActive = async (loc: any) => {
    try {
      await apiRequest("PATCH", `/api/bulk-delivery-locations/${loc.id}`, { isActive: !loc.isActive });
      queryClient.invalidateQueries({ queryKey: ['/api/bulk-delivery-locations', merchantId] });
    } catch { toast({ title: "Failed to update", variant: "destructive" }); }
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
      toast({ title: data.id ? "Updated" : "Created" });
      setEditLoc(null);
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={routeFilter} onValueChange={setRouteFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Routes</SelectItem>{[1,2,3,4,5].map(r => <SelectItem key={r} value={String(r)}>Route {r}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1"><Upload className="h-3 w-3" /> Import</Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleBulkImport} className="hidden" />
        <Button size="sm" onClick={() => setEditLoc({ routeNo: 1, locationName: '', locationType: '', address: '', defaultSegment: 'Butter Milk', isActive: true, zone: '', division: '', unionId: '' })} className="gap-1"><Plus className="h-3 w-3" /> Add</Button>
      </div>

      {isLoading ? <Skeleton className="h-40" /> : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Route</TableHead><TableHead>Zone</TableHead><TableHead>Location</TableHead><TableHead>Type</TableHead><TableHead>Address</TableHead><TableHead>Segment</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((l: any) => (
                <TableRow key={l.id} className={!l.isActive ? 'opacity-50' : ''}>
                  <TableCell className="font-bold">{l.routeNo}</TableCell>
                  <TableCell>{l.zone}</TableCell>
                  <TableCell className="text-sm font-medium max-w-[180px] truncate">{l.locationName}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{l.locationType}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{l.address}</TableCell>
                  <TableCell><Badge className="text-xs bg-blue-100 text-blue-800">{l.defaultSegment}</Badge></TableCell>
                  <TableCell><button onClick={() => toggleActive(l)}>{l.isActive ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}</button></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setEditLoc(l)}><Edit className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{filtered.length} locations</p>

      {editLoc && (
        <Dialog open={true} onOpenChange={() => setEditLoc(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editLoc.id ? 'Edit' : 'Add'} Location</DialogTitle></DialogHeader>
            <LocationForm loc={editLoc} onSave={saveLoc} onClose={() => setEditLoc(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LocationForm({ loc, onSave, onClose }: { loc: any; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState(loc);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Name</Label><Input value={form.locationName || ''} onChange={e => setForm({ ...form, locationName: e.target.value })} /></div>
        <div><Label className="text-xs">Type</Label><Input value={form.locationType || ''} onChange={e => setForm({ ...form, locationType: e.target.value })} /></div>
        <div><Label className="text-xs">Route</Label><Input type="number" value={form.routeNo || ''} onChange={e => setForm({ ...form, routeNo: Number(e.target.value) })} /></div>
        <div><Label className="text-xs">Union</Label><Input value={form.unionId || ''} onChange={e => setForm({ ...form, unionId: e.target.value })} /></div>
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
    </div>
  );
}

function PendingJobsPanel({ merchantId, onAssign }: { merchantId: string; onAssign?: () => void }) {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { data: jobs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery-jobs", merchantId, "bulk"],
    queryFn: async () => { const res = await fetch(`/api/delivery-jobs/${merchantId}?deliveryType=bulk`, { credentials: "include" }); return res.json(); },
  });

  const filtered = (jobs || []).filter((j: any) => !search || j.customerName?.toLowerCase().includes(search.toLowerCase()) || j.jobId?.toLowerCase().includes(search.toLowerCase()));
  const statusColors: Record<string, string> = { pending_validation: "bg-orange-100 text-orange-800", validation_failed: "bg-red-100 text-red-800", ready_for_trip: "bg-green-100 text-green-800", assigned: "bg-blue-100 text-blue-800", in_transit: "bg-indigo-100 text-indigo-800", delivered: "bg-emerald-100 text-emerald-800" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/delivery-jobs"] })}><RefreshCw className="h-4 w-4" /></Button>
      </div>
      {isLoading ? <Skeleton className="h-20" /> : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Package className="h-12 w-12 mx-auto mb-3 opacity-50" /><p className="font-medium">No delivery jobs</p></CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((j: any) => (
                <TableRow key={j.id}>
                  <TableCell className="font-mono text-xs">{j.jobId}</TableCell>
                  <TableCell className="text-sm">{j.customerName}</TableCell>
                  <TableCell>₹{Number(j.totalAmount || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell><Badge className={`text-xs ${statusColors[j.status] || 'bg-gray-100'}`}>{j.status?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{j.status === "ready_for_trip" && onAssign && <Button size="sm" variant="outline" className="text-xs" onClick={onAssign}>Assign</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
