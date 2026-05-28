import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { buildXlsxBuffer, parseXlsxToRows } from "@/lib/excel-utils";
import {
  Truck, Plus, Edit, MapPin, ArrowLeft, RefreshCw, Activity,
  BarChart3, TrendingUp, Package, Thermometer, Clock, CheckCircle,
  AlertTriangle, PlayCircle, PauseCircle, Navigation, Award, Users,
  Warehouse, Route, Eye, Trash2, Crosshair, Layers, SplitSquareHorizontal,
  Compass, ExternalLink, ChevronDown, ChevronUp, Map, Gauge, Timer, X, Maximize2,
  Download, Upload, FileDown, AlertCircle, ShieldCheck,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEPOT_COORDS: [number, number] = [13.111401, 80.174373];

const TRIP_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];

function createSvgIcon(color: string, label: string, size: number = 32) {
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="9" r="3" fill="#fff"/></svg>
      ${label ? `<div style="position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);white-space:nowrap;background:${color};color:#fff;font-size:9px;padding:1px 4px;border-radius:3px;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.3)">${label}</div>` : ''}
    </div>`,
  });
}

function createStopIcon(delivered: boolean) {
  const color = delivered ? '#22c55e' : '#ef4444';
  return L.divIcon({
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
  });
}

const depotIcon = L.divIcon({
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
  html: `<div style="position:relative;width:36px;height:36px;">
    <svg viewBox="0 0 24 24" width="36" height="36"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#1d4ed8" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="9" r="3" fill="#fff"/></svg>
    <div style="position:absolute;top:38px;left:50%;transform:translateX(-50%);white-space:nowrap;background:#1d4ed8;color:#fff;font-size:9px;padding:1px 5px;border-radius:3px;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,.3)">DEPOT</div>
  </div>`,
});

function MapFlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1 });
  }, [center[0], center[1], zoom]);
  return null;
}

function getVehicleColor(status: string) {
  switch (status) {
    case 'In Progress': return '#22c55e';
    case 'Planned': return '#f59e0b';
    case 'Completed': return '#3b82f6';
    case 'Delayed': return '#ef4444';
    default: return '#6b7280';
  }
}

const SEGMENTS = ["Fresh Milk", "Products", "Ice Cream"];
const STATUSES = ["Planned", "In-Progress", "Completed", "Delayed"];
const SHIFTS = ["AM", "PM"];
const PIE_COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#ef4444"];

function statusBadge(status: string) {
  switch (status) {
    case "Planned": return <Badge className="bg-blue-500 hover:bg-blue-600">Planned</Badge>;
    case "In-Progress": return <Badge className="bg-amber-500 hover:bg-amber-600 text-black">In Progress</Badge>;
    case "Completed": return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
    case "Delayed": return <Badge className="bg-red-500 hover:bg-red-600">Delayed</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function kpiColor(value: number, good: number) {
  if (value >= good) return "text-emerald-600";
  if (value >= good * 0.8) return "text-amber-600";
  return "text-rose-600";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDmsTransport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  const [dateFilter, setDateFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [searchFilter, setSearchFilter] = useState("");

  const [tripDialog, setTripDialog] = useState(false);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [pointsDialog, setPointsDialog] = useState<any>(null);
  const [manifestDialog, setManifestDialog] = useState<any>(null);
  const [hubDialog, setHubDialog] = useState(false);
  const [editingHub, setEditingHub] = useState<any>(null);

  const [tripForm, setTripForm] = useState({
    date: todayStr(), shift: "AM", hubName: "Ambattur Dairy Transport Center",
    hubId: 1, unionName: "", routeName: "", vehicleNo: "",
    driverName: "", driverPhone: "", segment: "Fresh Milk",
    plannedDropPoints: 0, bagsPlanned: 0, capacityBags: 120,
    startTime: "", etaTime: "", tempMinC: "", tempMaxC: "", notes: "",
  });

  const [hubForm, setHubForm] = useState({
    hubName: "", location: "", lat: "", lng: "",
    segments: ["Fresh Milk", "Products", "Ice Cream"],
  });

  const [pointForm, setPointForm] = useState({
    locationName: "", lat: "", lng: "", plannedArrival: "",
    bagsToDeliver: 0, notes: "",
  });

  const [manifestForm, setManifestForm] = useState({
    totalBags: 0, totalWeightKg: "", batchInfo: "", loadedBy: "", verifiedBy: "",
    items: "[]",
  });

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (dateFilter) p.date = dateFilter;
    if (segmentFilter !== "All") p.segment = segmentFilter;
    if (statusFilter !== "All") p.status = statusFilter;
    if (shiftFilter !== "All") p.shift = shiftFilter;
    if (searchFilter) p.search = searchFilter;
    return new URLSearchParams(p).toString();
  }, [dateFilter, segmentFilter, statusFilter, shiftFilter, searchFilter]);

  const { data: trips = [], isLoading: tripsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/transport/trips", queryParams],
    queryFn: () => fetch(`/api/admin/transport/trips?${queryParams}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: hubs = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/transport/hubs"],
  });

  const { data: dashboardData } = useQuery<any>({
    queryKey: ["/api/admin/transport/dashboard", dateFilter],
    queryFn: () => fetch(`/api/admin/transport/dashboard?${dateFilter ? `date=${dateFilter}` : ""}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: perfData } = useQuery<any>({
    queryKey: ["/api/admin/transport/driver-performance"],
  });

  const createTripMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/transport/trips", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/dashboard"] });
      setTripDialog(false);
      toast({ title: "Trip created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTripMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/admin/transport/trips/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/dashboard"] });
      setTripDialog(false);
      setEditingTrip(null);
      toast({ title: "Trip updated" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest("PATCH", `/api/admin/transport/trips/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/driver-performance"] });
      toast({ title: "Status updated" });
    },
  });

  const createHubMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/transport/hubs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/hubs"] });
      setHubDialog(false);
      toast({ title: "Hub created" });
    },
  });

  const updateHubMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/admin/transport/hubs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/hubs"] });
      setHubDialog(false);
      setEditingHub(null);
      toast({ title: "Hub updated" });
    },
  });

  const deleteHubMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/transport/hubs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/hubs"] });
      toast({ title: "Hub deleted" });
    },
  });

  const addPointMutation = useMutation({
    mutationFn: ({ tripId, data }: { tripId: number; data: any }) => apiRequest("POST", `/api/admin/transport/trips/${tripId}/points`, data),
    onSuccess: () => {
      if (pointsDialog) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/trips", pointsDialog.id, "points"] });
      }
      setPointForm({ locationName: "", lat: "", lng: "", plannedArrival: "", bagsToDeliver: 0, notes: "" });
      toast({ title: "Drop point added" });
    },
  });

  const addManifestMutation = useMutation({
    mutationFn: ({ tripId, data }: { tripId: number; data: any }) => apiRequest("POST", `/api/admin/transport/trips/${tripId}/manifest`, data),
    onSuccess: () => {
      setManifestDialog(null);
      toast({ title: "Manifest saved" });
    },
  });

  function openCreateTrip() {
    setEditingTrip(null);
    setTripForm({
      date: todayStr(), shift: "AM", hubName: hubs[0]?.hubName || "Ambattur Dairy Transport Center",
      hubId: hubs[0]?.id || 1, unionName: "", routeName: "", vehicleNo: "",
      driverName: "", driverPhone: "", segment: "Fresh Milk",
      plannedDropPoints: 0, bagsPlanned: 0, capacityBags: 120,
      startTime: "", etaTime: "", tempMinC: "", tempMaxC: "", notes: "",
    });
    setTripDialog(true);
  }

  function openEditTrip(trip: any) {
    setEditingTrip(trip);
    setTripForm({
      date: trip.date, shift: trip.shift, hubName: trip.hubName || "",
      hubId: trip.hubId || 1, unionName: trip.unionName || "", routeName: trip.routeName,
      vehicleNo: trip.vehicleNo || "", driverName: trip.driverName || "",
      driverPhone: trip.driverPhone || "", segment: trip.segment,
      plannedDropPoints: trip.plannedDropPoints, bagsPlanned: trip.bagsPlanned,
      capacityBags: trip.capacityBags, startTime: trip.startTime || "",
      etaTime: trip.etaTime || "", tempMinC: trip.tempMinC || "",
      tempMaxC: trip.tempMaxC || "", notes: trip.notes || "",
    });
    setTripDialog(true);
  }

  function handleSaveTrip() {
    const data = {
      ...tripForm,
      plannedDropPoints: Number(tripForm.plannedDropPoints),
      bagsPlanned: Number(tripForm.bagsPlanned),
      capacityBags: Number(tripForm.capacityBags),
      tempMinC: tripForm.tempMinC ? String(tripForm.tempMinC) : null,
      tempMaxC: tripForm.tempMaxC ? String(tripForm.tempMaxC) : null,
    };
    if (editingTrip) {
      updateTripMutation.mutate({ id: editingTrip.id, data });
    } else {
      createTripMutation.mutate(data);
    }
  }

  function openHubDialog(hub?: any) {
    if (hub) {
      setEditingHub(hub);
      setHubForm({
        hubName: hub.hubName, location: hub.location,
        lat: hub.lat || "", lng: hub.lng || "",
        segments: hub.segments || ["Fresh Milk", "Products", "Ice Cream"],
      });
    } else {
      setEditingHub(null);
      setHubForm({ hubName: "", location: "", lat: "", lng: "", segments: ["Fresh Milk", "Products", "Ice Cream"] });
    }
    setHubDialog(true);
  }

  function handleSaveHub() {
    const data = {
      ...hubForm,
      lat: hubForm.lat || null,
      lng: hubForm.lng || null,
    };
    if (editingHub) {
      updateHubMutation.mutate({ id: editingHub.id, data });
    } else {
      createHubMutation.mutate(data);
    }
  }

  const [sseConnected, setSseConnected] = useState(false);

  const { data: liveTrackingData, isLoading: liveTrackingLoading, refetch: refetchLiveTracking } = useQuery({
    queryKey: ["/api/admin/transport/live-tracking"],
    refetchInterval: (activeTab === "live-tracking" && !sseConnected) ? 30000 : false,
    enabled: activeTab === "live-tracking",
  });

  const { data: djStats } = useQuery<any>({
    queryKey: ['/api/delivery-jobs/stats/federation'],
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (activeTab !== "live-tracking") return;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      try {
        es = new EventSource(`/api/delivery/live-stream/federation`);
        es.onopen = () => setSseConnected(true);
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'location_update') {
              refetchLiveTracking();
            }
          } catch {}
        };
        es.onerror = () => {
          setSseConnected(false);
          es?.close();
          reconnectTimer = setTimeout(connect, 5000);
        };
      } catch {
        setSseConnected(false);
      }
    }

    connect();
    return () => {
      es?.close();
      setSseConnected(false);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [activeTab, refetchLiveTracking]);

  const d = dashboardData || {};

  return (
    <AdminLayout>
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 shrink-0" /> Trip Planning & Delivery
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Plan routes, assign vehicles & track daily deliveries</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button size="sm" onClick={openCreateTrip} className="bg-blue-600 hover:bg-blue-700 shrink-0">
            <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">New Trip</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-auto gap-1 p-1">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5"><BarChart3 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Dashboard</span></TabsTrigger>
            <TabsTrigger value="live-tracking" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5"><Activity className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Live Tracking</span></TabsTrigger>
            <TabsTrigger value="hubs" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5"><Warehouse className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Hubs</span></TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5"><Award className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Performance</span></TabsTrigger>
            <TabsTrigger value="optimizer" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5"><Route className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Optimizer</span></TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-end">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full sm:w-40" />
            </div>
            <div>
              <Label className="text-xs">Segment</Label>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Segments</SelectItem>
                  {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Shift</Label>
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger className="w-full sm:w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Search</Label>
              <Input placeholder="Route, driver, vehicle..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="w-full sm:w-48" />
            </div>
            <Button variant="outline" size="sm" className="col-span-2 sm:col-span-1" onClick={() => { setDateFilter(""); setSegmentFilter("All"); setStatusFilter("All"); setShiftFilter("All"); setSearchFilter(""); }}>
              <RefreshCw className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
            <Card><CardContent className="p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total Trips</p>
              <p className="text-xl sm:text-2xl font-bold">{d.totalTrips || 0}</p>
            </CardContent></Card>
            <Card><CardContent className="p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1"><PlayCircle className="h-3 w-3 hidden sm:inline" /> In Progress</p>
              <p className={`text-xl sm:text-2xl font-bold ${kpiColor(d.inProgress || 0, 0)}`}>{d.inProgress || 0}</p>
            </CardContent></Card>
            <Card><CardContent className="p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1"><CheckCircle className="h-3 w-3 hidden sm:inline" /> Completed</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">{d.completed || 0}</p>
            </CardContent></Card>
            <Card><CardContent className="p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1"><AlertTriangle className="h-3 w-3 hidden sm:inline" /> Delayed</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-600">{d.delayed || 0}</p>
            </CardContent></Card>
            <Card><CardContent className="p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Drop Success</p>
              <p className={`text-xl sm:text-2xl font-bold ${kpiColor(d.dropSuccess || 0, 80)}`}>{d.dropSuccess || 0}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Capacity</p>
              <p className={`text-xl sm:text-2xl font-bold ${kpiColor(d.capacityUtil || 0, 70)}`}>{d.capacityUtil || 0}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1"><Package className="h-3 w-3 hidden sm:inline" /> Bags</p>
              <p className="text-xl sm:text-2xl font-bold">{d.totalBagsLoaded || 0}</p>
            </CardContent></Card>
            <Card><CardContent className="p-2 sm:p-3 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Tonnage</p>
              <p className="text-xl sm:text-2xl font-bold">{d.totalTonnage || 0}t</p>
            </CardContent></Card>
          </div>

          {(djStats?.readyForTrip > 0 || djStats?.validationFailed > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30"><CardContent className="p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-400">Ready for Trip</p>
                <p className="text-xl font-bold text-emerald-600">{djStats?.readyForTrip || 0}</p>
              </CardContent></Card>
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30"><CardContent className="p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-400">Pending Validation</p>
                <p className="text-xl font-bold text-amber-600">{djStats?.pendingValidation || 0}</p>
              </CardContent></Card>
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/30"><CardContent className="p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-red-700 dark:text-red-400">Exceptions</p>
                <p className="text-xl font-bold text-red-600">{djStats?.validationFailed || 0}</p>
              </CardContent></Card>
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30"><CardContent className="p-2 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-400">In Transit</p>
                <p className="text-xl font-bold text-blue-600">{djStats?.inTransit || 0}</p>
              </CardContent></Card>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Segment-wise Bags</CardTitle></CardHeader>
              <CardContent className="h-48 sm:h-64">
                {(d.segmentData?.length > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.segmentData}>
                      <XAxis dataKey="segment" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="plannedBags" fill="#93c5fd" name="Planned" />
                      <Bar dataKey="loadedBags" fill="#2563eb" name="Loaded" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Trip Status Distribution</CardTitle></CardHeader>
              <CardContent className="h-48 sm:h-64">
                {(d.statusData?.some((s: any) => s.value > 0)) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={d.statusData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }: any) => value > 0 ? `${name}: ${value}` : ""}>
                        {d.statusData?.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Route className="h-4 w-4" /> Trip Sheets
                {tripsLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No trips found. Create your first trip to get started.
                </div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Trip ID</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Segment</TableHead>
                          <TableHead>Drops</TableHead>
                          <TableHead>Bags</TableHead>
                          <TableHead>Tonnage</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trips.map((trip: any) => (
                          <TableRow key={trip.id}>
                            <TableCell className="font-mono text-xs">{trip.tripId}</TableCell>
                            <TableCell>{trip.date}</TableCell>
                            <TableCell><Badge variant="outline">{trip.shift}</Badge></TableCell>
                            <TableCell className="max-w-[150px] truncate">{trip.routeName}</TableCell>
                            <TableCell className="font-mono text-xs">{trip.vehicleNo || "–"}</TableCell>
                            <TableCell>{trip.driverName || "–"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={
                                trip.segment === "Fresh Milk" ? "bg-green-100 text-green-800" :
                                trip.segment === "Ice Cream" ? "bg-cyan-100 text-cyan-800" :
                                "bg-orange-100 text-orange-800"
                              }>{trip.segment}</Badge>
                            </TableCell>
                            <TableCell>{trip.completedDropPoints}/{trip.plannedDropPoints}</TableCell>
                            <TableCell>{trip.bagsLoaded}/{trip.bagsPlanned}</TableCell>
                            <TableCell>{Number(trip.tonnageLoaded || 0).toFixed(2)}t</TableCell>
                            <TableCell className="text-xs">{trip.startTime || "–"} → {trip.etaTime || "–"}</TableCell>
                            <TableCell>{statusBadge(trip.status)}</TableCell>
                            <TableCell>
                              {trip.performanceScore ? (
                                <span className={`font-bold ${Number(trip.performanceScore) >= 80 ? "text-emerald-600" : Number(trip.performanceScore) >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                                  {Number(trip.performanceScore).toFixed(0)}
                                </span>
                              ) : "–"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTrip(trip)} title="Edit">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPointsDialog(trip)} title="Route Points">
                                  <MapPin className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setManifestDialog(trip)} title="Load Manifest">
                                  <Package className="h-3 w-3" />
                                </Button>
                                {trip.status === "Planned" && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => statusMutation.mutate({ id: trip.id, status: "In-Progress" })} title="Start">
                                    <PlayCircle className="h-3 w-3" />
                                  </Button>
                                )}
                                {trip.status === "In-Progress" && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => statusMutation.mutate({ id: trip.id, status: "Completed" })} title="Complete">
                                      <CheckCircle className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => statusMutation.mutate({ id: trip.id, status: "Delayed" })} title="Mark Delayed">
                                      <AlertTriangle className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                                {trip.status === "Delayed" && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => statusMutation.mutate({ id: trip.id, status: "Completed" })} title="Complete">
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {trips.map((trip: any) => (
                      <Card key={trip.id} className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-muted-foreground">{trip.tripId}</span>
                                <Badge variant="outline" className="text-[10px]">{trip.shift}</Badge>
                                {statusBadge(trip.status)}
                              </div>
                              <p className="font-medium text-sm truncate">{trip.routeName}</p>
                            </div>
                            <Badge variant="secondary" className={`shrink-0 text-[10px] ${
                              trip.segment === "Fresh Milk" ? "bg-green-100 text-green-800" :
                              trip.segment === "Ice Cream" ? "bg-cyan-100 text-cyan-800" :
                              "bg-orange-100 text-orange-800"
                            }`}>{trip.segment}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                            <div><span className="text-muted-foreground">Driver:</span> <span className="font-medium">{trip.driverName || "–"}</span></div>
                            <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-mono">{trip.vehicleNo || "–"}</span></div>
                            <div><span className="text-muted-foreground">Date:</span> <span>{trip.date}</span></div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                            <div className="text-center bg-muted rounded p-1">
                              <div className="text-muted-foreground">Drops</div>
                              <div className="font-bold">{trip.completedDropPoints}/{trip.plannedDropPoints}</div>
                            </div>
                            <div className="text-center bg-muted rounded p-1">
                              <div className="text-muted-foreground">Bags</div>
                              <div className="font-bold">{trip.bagsLoaded}/{trip.bagsPlanned}</div>
                            </div>
                            <div className="text-center bg-muted rounded p-1">
                              <div className="text-muted-foreground">Tonnage</div>
                              <div className="font-bold">{Number(trip.tonnageLoaded || 0).toFixed(1)}t</div>
                            </div>
                            <div className="text-center bg-muted rounded p-1">
                              <div className="text-muted-foreground">Score</div>
                              <div className={`font-bold ${trip.performanceScore ? (Number(trip.performanceScore) >= 80 ? "text-emerald-600" : Number(trip.performanceScore) >= 60 ? "text-amber-600" : "text-rose-600") : ""}`}>
                                {trip.performanceScore ? Number(trip.performanceScore).toFixed(0) : "–"}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 border-t pt-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => openEditTrip(trip)}>
                              <Edit className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => setPointsDialog(trip)}>
                              <MapPin className="h-3 w-3 mr-1" /> Points
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => setManifestDialog(trip)}>
                              <Package className="h-3 w-3 mr-1" /> Load
                            </Button>
                            {trip.status === "Planned" && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600" onClick={() => statusMutation.mutate({ id: trip.id, status: "In-Progress" })}>
                                <PlayCircle className="h-3 w-3 mr-1" /> Start
                              </Button>
                            )}
                            {trip.status === "In-Progress" && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => statusMutation.mutate({ id: trip.id, status: "Completed" })}>
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => statusMutation.mutate({ id: trip.id, status: "Delayed" })}>
                                  <AlertTriangle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {trip.status === "Delayed" && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => statusMutation.mutate({ id: trip.id, status: "Completed" })}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live-tracking" className="space-y-4">
          <LiveTrackingSection liveTrackingData={liveTrackingData} liveTrackingLoading={liveTrackingLoading} sseConnected={sseConnected} />
        </TabsContent>

        <TabsContent value="hubs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Warehouse className="h-5 w-5" /> Transport Hubs</h2>
            <Button onClick={() => openHubDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" /> Add Hub
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hubs.map((hub: any) => (
              <Card key={hub.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{hub.hubName}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {hub.location}
                      </p>
                      {hub.lat && hub.lng && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Number(hub.lat).toFixed(4)}°N, {Number(hub.lng).toFixed(4)}°E
                        </p>
                      )}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {hub.segments?.map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Badge className={hub.status === "active" ? "bg-green-500" : "bg-gray-400"}>
                        {hub.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3">
                    <Button variant="outline" size="sm" onClick={() => openHubDialog(hub)}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteHubMutation.mutate(hub.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {hubs.length === 0 && (
              <div className="col-span-3 text-center py-8 text-muted-foreground">No hubs configured.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2"><Award className="h-5 w-5" /> Driver Performance Rankings</h2>
          </div>
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Scoring Formula (Weighted Composite):</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-background rounded p-2 text-center"><div className="font-bold text-blue-600">40%</div><div>On-Time Delivery</div></div>
                <div className="bg-background rounded p-2 text-center"><div className="font-bold text-emerald-600">30%</div><div>Route Efficiency</div></div>
                <div className="bg-background rounded p-2 text-center"><div className="font-bold text-amber-600">15%</div><div>Fuel Efficiency</div></div>
                <div className="bg-background rounded p-2 text-center"><div className="font-bold text-purple-600">15%</div><div>Customer Feedback</div></div>
              </div>
            </CardContent>
          </Card>
          {perfData?.rankings?.length > 0 ? (
            <>
              <div className="hidden md:block">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Total Trips</TableHead>
                          <TableHead>Avg Score</TableHead>
                          <TableHead>Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {perfData.rankings.map((r: any, i: number) => (
                          <TableRow key={r.driverName}>
                            <TableCell>
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                            </TableCell>
                            <TableCell className="font-medium">{r.driverName}</TableCell>
                            <TableCell>{r.driverPhone || "–"}</TableCell>
                            <TableCell>{r.totalTrips}</TableCell>
                            <TableCell>
                              <span className={`font-bold ${r.avgScore >= 80 ? "text-emerald-600" : r.avgScore >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                                {r.avgScore}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={r.avgScore >= 80 ? "bg-emerald-500" : r.avgScore >= 60 ? "bg-amber-500" : "bg-rose-500"}>
                                {r.avgScore >= 80 ? "Excellent" : r.avgScore >= 60 ? "Good" : "Needs Improvement"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
              <div className="md:hidden space-y-2">
                {perfData.rankings.map((r: any, i: number) => (
                  <Card key={r.driverName}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                          <span className="font-medium text-sm">{r.driverName}</span>
                        </div>
                        <Badge className={`text-[10px] ${r.avgScore >= 80 ? "bg-emerald-500" : r.avgScore >= 60 ? "bg-amber-500" : "bg-rose-500"}`}>
                          {r.avgScore >= 80 ? "Excellent" : r.avgScore >= 60 ? "Good" : "Improve"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{r.driverPhone || "–"}</span>
                        <span>{r.totalTrips} trips</span>
                        <span className={`font-bold ${r.avgScore >= 80 ? "text-emerald-600" : r.avgScore >= 60 ? "text-amber-600" : "text-rose-600"}`}>Score: {r.avgScore}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No performance data yet. Scores are automatically calculated when trips are completed.</p>
              <p className="text-xs mt-2">Formula: (On-time % x 40) + (Route efficiency % x 30) + (Fuel efficiency x 15) + (Feedback x 15)</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="optimizer" className="space-y-4">
          <RouteOptimizerPipeline />
        </TabsContent>
      </Tabs>

      <Dialog open={tripDialog} onOpenChange={setTripDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>{editingTrip ? "Edit Trip" : "Create New Trip"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={tripForm.date} onChange={e => setTripForm({ ...tripForm, date: e.target.value })} />
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={tripForm.shift} onValueChange={v => setTripForm({ ...tripForm, shift: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hub</Label>
              <Select value={String(tripForm.hubId)} onValueChange={v => {
                const hub = hubs.find((h: any) => h.id === parseInt(v));
                setTripForm({ ...tripForm, hubId: parseInt(v), hubName: hub?.hubName || "" });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {hubs.map((h: any) => <SelectItem key={h.id} value={String(h.id)}>{h.hubName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Segment</Label>
              <Select value={tripForm.segment} onValueChange={v => setTripForm({ ...tripForm, segment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Route Name</Label>
              <Input value={tripForm.routeName} onChange={e => setTripForm({ ...tripForm, routeName: e.target.value })} placeholder="e.g. Route A – North Chennai" />
            </div>
            <div>
              <Label>Vehicle No</Label>
              <Input value={tripForm.vehicleNo} onChange={e => setTripForm({ ...tripForm, vehicleNo: e.target.value })} placeholder="TN-01-AB-1020" />
            </div>
            <div>
              <Label>Union Name</Label>
              <Input value={tripForm.unionName} onChange={e => setTripForm({ ...tripForm, unionName: e.target.value })} placeholder="Salem Union" />
            </div>
            <div>
              <Label>Driver Name</Label>
              <Input value={tripForm.driverName} onChange={e => setTripForm({ ...tripForm, driverName: e.target.value })} />
            </div>
            <div>
              <Label>Driver Phone</Label>
              <Input value={tripForm.driverPhone} onChange={e => setTripForm({ ...tripForm, driverPhone: e.target.value })} />
            </div>
            <div>
              <Label>Planned Drop Points</Label>
              <Input type="number" value={tripForm.plannedDropPoints} onChange={e => setTripForm({ ...tripForm, plannedDropPoints: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Bags Planned</Label>
              <Input type="number" value={tripForm.bagsPlanned} onChange={e => setTripForm({ ...tripForm, bagsPlanned: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Capacity (Bags)</Label>
              <Input type="number" value={tripForm.capacityBags} onChange={e => setTripForm({ ...tripForm, capacityBags: parseInt(e.target.value) || 120 })} />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={tripForm.startTime} onChange={e => setTripForm({ ...tripForm, startTime: e.target.value })} />
            </div>
            <div>
              <Label>ETA</Label>
              <Input type="time" value={tripForm.etaTime} onChange={e => setTripForm({ ...tripForm, etaTime: e.target.value })} />
            </div>
            {tripForm.segment === "Ice Cream" && (
              <>
                <div>
                  <Label>Temp Min (°C)</Label>
                  <Input type="number" value={tripForm.tempMinC} onChange={e => setTripForm({ ...tripForm, tempMinC: e.target.value })} placeholder="-21" />
                </div>
                <div>
                  <Label>Temp Max (°C)</Label>
                  <Input type="number" value={tripForm.tempMaxC} onChange={e => setTripForm({ ...tripForm, tempMaxC: e.target.value })} placeholder="-16" />
                </div>
              </>
            )}
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={tripForm.notes} onChange={e => setTripForm({ ...tripForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTripDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTrip} disabled={createTripMutation.isPending || updateTripMutation.isPending}>
              {(createTripMutation.isPending || updateTripMutation.isPending) ? "Saving..." : editingTrip ? "Update Trip" : "Create Trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hubDialog} onOpenChange={setHubDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHub ? "Edit Hub" : "Add Transport Hub"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Hub Name</Label>
              <Input value={hubForm.hubName} onChange={e => setHubForm({ ...hubForm, hubName: e.target.value })} placeholder="Ambattur Dairy Transport Center" />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={hubForm.location} onChange={e => setHubForm({ ...hubForm, location: e.target.value })} placeholder="Ambattur Industrial Area, Chennai" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Latitude</Label>
                <Input value={hubForm.lat} onChange={e => setHubForm({ ...hubForm, lat: e.target.value })} placeholder="13.1087" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input value={hubForm.lng} onChange={e => setHubForm({ ...hubForm, lng: e.target.value })} placeholder="80.1793" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHubDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveHub} disabled={createHubMutation.isPending || updateHubMutation.isPending}>
              {editingHub ? "Update Hub" : "Create Hub"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RoutePointsDialog trip={pointsDialog} open={!!pointsDialog} onClose={() => setPointsDialog(null)} pointForm={pointForm} setPointForm={setPointForm} addPointMutation={addPointMutation} />

      <ManifestDialog trip={manifestDialog} open={!!manifestDialog} onClose={() => setManifestDialog(null)} manifestForm={manifestForm} setManifestForm={setManifestForm} addManifestMutation={addManifestMutation} />
    </div>
    </AdminLayout>
  );
}

function RoutePointsDialog({ trip, open, onClose, pointForm, setPointForm, addPointMutation }: any) {
  const { data: points = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/transport/trips", trip?.id, "points"],
    queryFn: () => fetch(`/api/admin/transport/trips/${trip?.id}/points`, { credentials: "include" }).then(r => r.json()),
    enabled: !!trip?.id,
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Route Points — {trip?.tripId}</DialogTitle>
        </DialogHeader>
        {points.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Bags</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.sequenceNo}</TableCell>
                  <TableCell>{p.locationName}</TableCell>
                  <TableCell>{p.bagsDelivered}/{p.bagsToDeliver}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "completed" ? "default" : "outline"} className={p.status === "completed" ? "bg-green-500" : ""}>
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">No route points added yet.</p>
        )}
        <div className="border-t pt-3 space-y-2">
          <p className="text-sm font-medium">Add Drop Point</p>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Location name" value={pointForm.locationName} onChange={e => setPointForm({ ...pointForm, locationName: e.target.value })} />
            <Input type="number" placeholder="Bags to deliver" value={pointForm.bagsToDeliver || ""} onChange={e => setPointForm({ ...pointForm, bagsToDeliver: parseInt(e.target.value) || 0 })} />
            <Input placeholder="Planned arrival (HH:MM)" value={pointForm.plannedArrival} onChange={e => setPointForm({ ...pointForm, plannedArrival: e.target.value })} />
            <Input placeholder="Notes" value={pointForm.notes} onChange={e => setPointForm({ ...pointForm, notes: e.target.value })} />
          </div>
          <Button size="sm" disabled={!pointForm.locationName || addPointMutation.isPending} onClick={() => {
            addPointMutation.mutate({
              tripId: trip.id,
              data: { ...pointForm, sequenceNo: points.length + 1 },
            });
          }}>
            <Plus className="h-3 w-3 mr-1" /> Add Point
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManifestDialog({ trip, open, onClose, manifestForm, setManifestForm, addManifestMutation }: any) {
  const { data: manifests = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/transport/trips", trip?.id, "manifest"],
    queryFn: () => fetch(`/api/admin/transport/trips/${trip?.id}/manifest`, { credentials: "include" }).then(r => r.json()),
    enabled: !!trip?.id,
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load Manifest — {trip?.tripId}</DialogTitle>
        </DialogHeader>
        {manifests.length > 0 ? (
          <div className="space-y-2">
            {manifests.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Bags: <strong>{m.totalBags}</strong></span>
                    <span>Weight: <strong>{m.totalWeightKg} kg</strong></span>
                  </div>
                  {m.batchInfo && <p className="text-muted-foreground mt-1">Batch: {m.batchInfo}</p>}
                  <p className="text-muted-foreground">Loaded by: {m.loadedBy || "–"} | Verified: {m.verifiedBy || "–"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">No manifest recorded yet.</p>
        )}
        <div className="border-t pt-3 space-y-2">
          <p className="text-sm font-medium">Add Manifest</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Total Bags</Label>
              <Input type="number" value={manifestForm.totalBags || ""} onChange={e => setManifestForm({ ...manifestForm, totalBags: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Weight (kg)</Label>
              <Input value={manifestForm.totalWeightKg} onChange={e => setManifestForm({ ...manifestForm, totalWeightKg: e.target.value })} placeholder="1500" />
            </div>
            <div>
              <Label className="text-xs">Batch Info</Label>
              <Input value={manifestForm.batchInfo} onChange={e => setManifestForm({ ...manifestForm, batchInfo: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Loaded By</Label>
              <Input value={manifestForm.loadedBy} onChange={e => setManifestForm({ ...manifestForm, loadedBy: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Verified By</Label>
              <Input value={manifestForm.verifiedBy} onChange={e => setManifestForm({ ...manifestForm, verifiedBy: e.target.value })} />
            </div>
          </div>
          <Button size="sm" disabled={addManifestMutation.isPending} onClick={() => {
            addManifestMutation.mutate({
              tripId: trip.id,
              data: {
                totalBags: manifestForm.totalBags,
                totalWeightKg: manifestForm.totalWeightKg || "0",
                batchInfo: manifestForm.batchInfo,
                loadedBy: manifestForm.loadedBy,
                verifiedBy: manifestForm.verifiedBy,
                items: [],
              },
            });
          }}>
            <Plus className="h-3 w-3 mr-1" /> Save Manifest
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CLUSTER_COLORS: Record<string, string> = { A: "bg-blue-100 text-blue-800", B: "bg-emerald-100 text-emerald-800", C: "bg-purple-100 text-purple-800" };

function LiveTrackingSection({ liveTrackingData, liveTrackingLoading, sseConnected }: { liveTrackingData: any; liveTrackingLoading: boolean; sseConnected: boolean }) {
  const [showMap, setShowMap] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEPOT_COORDS);
  const [mapZoom, setMapZoom] = useState(12);

  const tracking = liveTrackingData?.tracking || [];
  const fleetStats = liveTrackingData?.fleetStats || { avgSpeedKmh: 0, totalDistanceKm: 0, onTimePercent: 0 };

  const handleVehicleClick = (item: any) => {
    setSelectedVehicle(item);
    if (item.lastLocation) {
      setMapCenter([Number(item.lastLocation.lat), Number(item.lastLocation.lng)]);
      setMapZoom(15);
    }
    setShowMap(true);
  };

  const nextPendingStop = (item: any) => {
    const stops = item.stops || [];
    return stops.find((s: any) => s.status !== 'delivered');
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2"><Activity className="h-5 w-5" /> Live Vehicle Tracking</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${sseConnected ? "text-emerald-600 border-emerald-300" : "text-amber-600 border-amber-300"}`}>
            <span className={`h-2 w-2 rounded-full inline-block mr-1 ${sseConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            {sseConnected ? "Live" : "Polling 30s"}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => { setSelectedVehicle(null); setMapCenter(DEPOT_COORDS); setMapZoom(12); setShowMap(true); }}>
            <Map className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Open Live Map</span>
          </Button>
        </div>
      </div>

      {liveTrackingLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading tracking data...</div>
      ) : !tracking.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No active trips at the moment</p>
            <p className="text-xs mt-1">Trips will appear here when drivers start their routes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card><CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{tracking.length}</div>
              <div className="text-xs text-muted-foreground">Active Trips</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{tracking.reduce((s: number, t: any) => s + (t.summary?.deliveredStops || 0), 0)}</div>
              <div className="text-xs text-muted-foreground">Delivered</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{tracking.reduce((s: number, t: any) => s + (t.summary?.pendingStops || 0), 0)}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{tracking.reduce((s: number, t: any) => s + (t.summary?.totalBags || 0), 0)}</div>
              <div className="text-xs text-muted-foreground">Total Bags</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <Gauge className="h-4 w-4 mx-auto mb-1 text-cyan-500" />
              <div className="text-2xl font-bold text-cyan-600">{fleetStats.avgSpeedKmh}</div>
              <div className="text-xs text-muted-foreground">Avg Speed km/h</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <Navigation className="h-4 w-4 mx-auto mb-1 text-indigo-500" />
              <div className="text-2xl font-bold text-indigo-600">{fleetStats.totalDistanceKm}</div>
              <div className="text-xs text-muted-foreground">KM Today</div>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <Timer className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
              <div className="text-2xl font-bold text-emerald-600">{fleetStats.onTimePercent}%</div>
              <div className="text-xs text-muted-foreground">On-Time</div>
            </CardContent></Card>
          </div>

          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Load</TableHead>
                    <TableHead>Stops</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Speed</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Route</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracking.map((item: any) => {
                    const nextStop = nextPendingStop(item);
                    return (
                      <TableRow
                        key={item.trip.id}
                        className={`cursor-pointer hover:bg-accent/50 ${selectedVehicle?.trip?.id === item.trip.id ? 'bg-accent' : ''}`}
                        onClick={() => handleVehicleClick(item)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getVehicleColor(item.trip.status) }} />
                            {item.trip.vehicleNo}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{item.trip.driverName}</div>
                          <div className="text-xs text-muted-foreground">{item.trip.driverPhone}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            item.trip.status === 'In Progress' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            item.trip.status === 'Planned' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-blue-100 text-blue-800'
                          }>{item.trip.status}</Badge>
                        </TableCell>
                        <TableCell>{item.summary.totalBags} bags</TableCell>
                        <TableCell>
                          <span className="text-green-600 font-semibold">{item.summary.deliveredStops}</span>
                          <span className="text-muted-foreground">/{item.summary.totalStops}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${item.summary.progress}%` }} />
                            </div>
                            <span className="text-xs">{item.summary.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.lastLocation?.speed ? (
                            <span className="text-xs font-medium">{Number(item.lastLocation.speed).toFixed(1)} km/h</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.lastLocation ? (
                            <a href={`https://www.google.com/maps?q=${item.lastLocation.lat},${item.lastLocation.lng}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <MapPin className="h-3 w-3" /> View
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">No GPS</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.routeUrl ? (
                            <a href={item.routeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3" /> Open Route
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
          <div className="md:hidden space-y-2">
            {tracking.map((item: any) => (
              <Card key={item.trip.id} className={`cursor-pointer ${selectedVehicle?.trip?.id === item.trip.id ? 'border-primary' : ''}`} onClick={() => handleVehicleClick(item)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getVehicleColor(item.trip.status) }} />
                      <span className="font-medium text-sm">{item.trip.vehicleNo}</span>
                    </div>
                    <Badge className={`text-[10px] ${
                      item.trip.status === 'In Progress' ? 'bg-green-100 text-green-800' :
                      item.trip.status === 'Planned' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>{item.trip.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{item.trip.driverName} · {item.trip.driverPhone}</div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${item.summary.progress}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-medium">{item.summary.progress}%</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
                    <div className="bg-muted rounded p-1"><div className="text-muted-foreground">Stops</div><div className="font-bold">{item.summary.deliveredStops}/{item.summary.totalStops}</div></div>
                    <div className="bg-muted rounded p-1"><div className="text-muted-foreground">Bags</div><div className="font-bold">{item.summary.totalBags}</div></div>
                    <div className="bg-muted rounded p-1"><div className="text-muted-foreground">Speed</div><div className="font-bold">{item.lastLocation?.speed ? `${Number(item.lastLocation.speed).toFixed(0)}` : '—'}</div></div>
                    <div className="bg-muted rounded p-1"><div className="text-muted-foreground">ETA</div><div className="font-bold">{item.trip.etaTime || '—'}</div></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedVehicle && !showMap && (
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    {selectedVehicle.trip.vehicleNo} — {selectedVehicle.trip.routeName}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedVehicle(null)}><X className="h-4 w-4" /></Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-xs text-muted-foreground">Speed</div>
                    <div className="font-bold">{selectedVehicle.lastLocation?.speed ? `${Number(selectedVehicle.lastLocation.speed).toFixed(1)} km/h` : '—'}</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-xs text-muted-foreground">Last GPS</div>
                    <div className="font-bold text-xs">{selectedVehicle.lastLocation?.updatedAt ? new Date(selectedVehicle.lastLocation.updatedAt).toLocaleTimeString('en-IN') : '—'}</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-xs text-muted-foreground">Next Stop</div>
                    <div className="font-bold text-xs truncate">{nextPendingStop(selectedVehicle)?.locationName || 'Done'}</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-xs text-muted-foreground">ETA</div>
                    <div className="font-bold">{selectedVehicle.trip.etaTime || '—'}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {selectedVehicle.stops.map((stop: any, idx: number) => (
                    <div key={stop.id} className="flex items-center gap-2 text-xs py-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        stop.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700'
                      }`}>{stop.status === 'delivered' ? '✓' : idx + 1}</div>
                      <span className={`flex-1 ${stop.status === 'delivered' ? 'text-green-700 dark:text-green-400' : ''}`}>{stop.locationName}</span>
                      <span className="text-muted-foreground">{stop.bagsToDeliver} bags</span>
                      {stop.actualArrival && <Badge variant="outline" className="text-[10px]">{stop.actualArrival}</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedVehicle && tracking.map((item: any) => (
            <Card key={`detail-${item.trip.id}`} className="cursor-pointer hover:border-primary/50" onClick={() => handleVehicleClick(item)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{item.trip.vehicleNo} — {item.trip.routeName}</span>
                  <span className="text-xs text-muted-foreground">{item.trip.startTime || 'Not started'} → {item.trip.etaTime}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {item.stops.map((stop: any, idx: number) => (
                    <div key={stop.id} className="flex items-center gap-2 text-xs py-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        stop.status === 'delivered' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700'
                      }`}>{stop.status === 'delivered' ? '✓' : idx + 1}</div>
                      <span className={`flex-1 ${stop.status === 'delivered' ? 'text-green-700 dark:text-green-400' : ''}`}>{stop.locationName}</span>
                      <span className="text-muted-foreground">{stop.bagsToDeliver} bags</span>
                      {stop.actualArrival && <Badge variant="outline" className="text-[10px]">{stop.actualArrival}</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showMap && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-2 md:inset-4 bg-background rounded-lg border shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b bg-muted/50">
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2"><Map className="h-4 w-4" /> <span className="hidden sm:inline">Live Fleet Map — Ambattur Dairy</span><span className="sm:hidden">Fleet Map</span></h3>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="hidden sm:flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#1d4ed8] inline-block" /> Depot</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#22c55e] inline-block" /> In Progress</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block" /> Planned</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#22c55e] inline-block" style={{ width: 10, height: 10 }} /> Delivered</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#ef4444] inline-block" style={{ width: 10, height: 10 }} /> Pending</span>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setMapCenter(DEPOT_COORDS); setMapZoom(12); }}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowMap(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 flex">
              <div className="w-64 border-r overflow-y-auto bg-muted/30 hidden md:block">
                <div className="p-2 space-y-1">
                  {tracking.map((item: any) => (
                    <button
                      key={item.trip.id}
                      onClick={() => {
                        setSelectedVehicle(item);
                        if (item.lastLocation) {
                          setMapCenter([Number(item.lastLocation.lat), Number(item.lastLocation.lng)]);
                          setMapZoom(15);
                        }
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors ${
                        selectedVehicle?.trip?.id === item.trip.id ? 'bg-primary/10 border border-primary' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getVehicleColor(item.trip.status) }} />
                        <span className="font-medium">{item.trip.vehicleNo}</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5">{item.trip.driverName}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span>{item.summary.deliveredStops}/{item.summary.totalStops} stops</span>
                        <span>{item.summary.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1 dark:bg-gray-700">
                        <div className="bg-green-500 h-1 rounded-full" style={{ width: `${item.summary.progress}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 relative">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapFlyTo center={mapCenter} zoom={mapZoom} />

                  <Marker position={DEPOT_COORDS} icon={depotIcon}>
                    <Popup><b>Ambattur Dairy Depot</b><br />Products Dairy Ambattur<br />13.1114, 80.1744</Popup>
                  </Marker>

                  {tracking.map((item: any, tripIdx: number) => {
                    const color = TRIP_COLORS[tripIdx % TRIP_COLORS.length];
                    const stops = (item.stops || []).filter((s: any) => s.lat && s.lng);
                    const routeCoords: [number, number][] = [
                      DEPOT_COORDS,
                      ...stops.map((s: any) => [Number(s.lat), Number(s.lng)] as [number, number]),
                      DEPOT_COORDS,
                    ];

                    return (
                      <Fragment key={item.trip.id}>
                        {routeCoords.length > 1 && (
                          <Polyline positions={routeCoords} pathOptions={{ color, weight: 3, opacity: 0.7, dashArray: item.trip.status === 'Planned' ? '10, 5' : undefined }} />
                        )}

                        {item.lastLocation && (
                          <Marker
                            position={[Number(item.lastLocation.lat), Number(item.lastLocation.lng)]}
                            icon={createSvgIcon(getVehicleColor(item.trip.status), item.trip.vehicleNo)}
                          >
                            <Popup>
                              <div className="text-xs space-y-1 min-w-[160px]">
                                <div className="font-bold text-sm">{item.trip.vehicleNo}</div>
                                <div>Driver: {item.trip.driverName}</div>
                                <div>Phone: {item.trip.driverPhone}</div>
                                <div>Speed: {item.lastLocation.speed ? `${Number(item.lastLocation.speed).toFixed(1)} km/h` : '—'}</div>
                                <div>Status: {item.trip.status}</div>
                                <div>Progress: {item.summary.deliveredStops}/{item.summary.totalStops} stops ({item.summary.progress}%)</div>
                                {nextPendingStop(item) && <div>Next: {nextPendingStop(item).locationName}</div>}
                                <div>ETA: {item.trip.etaTime || '—'}</div>
                                {item.lastLocation.updatedAt && <div>Updated: {new Date(item.lastLocation.updatedAt).toLocaleTimeString('en-IN')}</div>}
                              </div>
                            </Popup>
                          </Marker>
                        )}

                        {stops.map((stop: any, si: number) => (
                          <Marker
                            key={`stop-${item.trip.id}-${si}`}
                            position={[Number(stop.lat), Number(stop.lng)]}
                            icon={createStopIcon(stop.status === 'delivered')}
                          >
                            <Popup>
                              <div className="text-xs">
                                <div className="font-bold">{stop.locationName}</div>
                                <div>Stop #{si + 1} — {stop.bagsToDeliver} bags</div>
                                <div>Status: {stop.status === 'delivered' ? '✅ Delivered' : '⏳ Pending'}</div>
                                {stop.actualArrival && <div>Arrived: {stop.actualArrival}</div>}
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </Fragment>
                    );
                  })}
                </MapContainer>

                {selectedVehicle && (
                  <div className="absolute bottom-3 left-3 right-3 bg-background/95 backdrop-blur rounded-lg border shadow-lg p-3 z-[1000]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getVehicleColor(selectedVehicle.trip.status) }} />
                        {selectedVehicle.trip.vehicleNo} — {selectedVehicle.trip.driverName}
                      </div>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedVehicle(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-muted rounded p-1.5">
                        <div className="text-muted-foreground">Speed</div>
                        <div className="font-bold">{selectedVehicle.lastLocation?.speed ? `${Number(selectedVehicle.lastLocation.speed).toFixed(1)}` : '—'} km/h</div>
                      </div>
                      <div className="bg-muted rounded p-1.5">
                        <div className="text-muted-foreground">Progress</div>
                        <div className="font-bold">{selectedVehicle.summary.deliveredStops}/{selectedVehicle.summary.totalStops}</div>
                      </div>
                      <div className="bg-muted rounded p-1.5">
                        <div className="text-muted-foreground">Next Stop</div>
                        <div className="font-bold truncate">{nextPendingStop(selectedVehicle)?.locationName || 'Done'}</div>
                      </div>
                      <div className="bg-muted rounded p-1.5">
                        <div className="text-muted-foreground">ETA</div>
                        <div className="font-bold">{selectedVehicle.trip.etaTime || '—'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RouteOptimizerPipeline() {
  const { toast } = useToast();
  const [pipelineStep, setPipelineStep] = useState(1);
  const [demandData, setDemandData] = useState<any>(null);
  const [clusterData, setClusterData] = useState<any>(null);
  const [splitData, setSplitData] = useState<any>(null);
  const [optimizeData, setOptimizeData] = useState<any>(null);
  const [expandedTrips, setExpandedTrips] = useState<Set<number>>(new Set());
  const [editingStop, setEditingStop] = useState<any>(null);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const { data: stops = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/transport/stops"],
  });

  async function handleDownloadTemplate() {
    const rows = [
      ["Zone", "Division", "Location Name", "Address", "Latitude", "Longitude", "Total Pockets"],
      ["1", "5", "Division Office Zone 1", "NO. 1 RAMAKRISHNA NAGAR, CH-19", "13.112", "80.21852", "565"],
      ["2", "18", "Division Office Manali", "CPCL layout, Manali, Chennai-68", "13.175544", "80.256157", "379"],
    ];
    const buf = await buildXlsxBuffer([{ name: "Delivery Stops Template", rows }]);
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "delivery-stops-template.xlsx"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const { headers, rows } = await parseXlsxToRows(buffer);
      const HEADER_MAP: Record<string, string> = {
        'zone': 'zone', 'division': 'division', 'div': 'division',
        'location name': 'locationName', 'locationname': 'locationName', 'location': 'locationName', 'name': 'locationName',
        'address': 'address', 'addr': 'address',
        'latitude': 'lat', 'lat': 'lat',
        'longitude': 'lng', 'lng': 'lng', 'long': 'lng',
        'total pockets': 'totalPockets', 'totalpockets': 'totalPockets', 'pockets': 'totalPockets', 'qty': 'totalPockets', 'quantity': 'totalPockets',
      };
      const mappedRows = rows.map((row: any) => {
        const mapped: any = {};
        for (const [key, val] of Object.entries(row)) {
          const normalized = key.toLowerCase().trim();
          const field = HEADER_MAP[normalized];
          if (field) mapped[field] = val;
        }
        return mapped;
      }).filter((r: any) => r.locationName);

      if (mappedRows.length === 0) {
        toast({ title: "No valid rows found", description: "Check that your Excel has columns: Zone, Division, Location Name, Address, Latitude, Longitude, Total Pockets", variant: "destructive" });
        return;
      }
      const res = await apiRequest("POST", "/api/admin/transport/stops/bulk", { stops: mappedRows });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/stops"] });
      toast({ title: `Imported ${data.count} delivery stops` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleExportOptimizedRoutes() {
    if (!optimizeData) return;
    const summaryRows = [
      ["Trip Label", "Cluster", "Stops", "Distance (km)", "Time (min)"],
      ...optimizeData.trips.map((t: any) => [
        t.tripLabel, t.cluster || "-", String(t.optimizedStops?.length || 0),
        String(t.totalDistKm), String(t.totalTimeMin),
      ]),
      ["", "", "", "", ""],
      ["TOTAL", "", String(optimizeData.totalTrips), String(optimizeData.totalKm), String(optimizeData.totalTimeMin)],
    ];
    const sheets = [{ name: "Summary", rows: summaryRows }];
    for (const trip of optimizeData.trips) {
      const tripRows = [
        ["Sequence", "Location Name", "Pockets", "Bags", "Dist from Prev (km)", "Cumulative Dist (km)", "ETA"],
        ["0", "Ambattur Depot (Start)", "", "", "0", "0", "Depart"],
        ...(trip.optimizedStops || []).map((s: any) => [
          String(s.sequence), s.locationName, String(s.totalPockets), String(s.bags),
          String(s.distFromPrev), String(s.cumulativeDist), s.eta,
        ]),
        ["R", "Return to Depot", "", "", "", String(trip.totalDistKm), `${trip.totalTimeMin} min`],
      ];
      const sheetName = (trip.tripLabel || `Trip-${sheets.length}`).slice(0, 31);
      sheets.push({ name: sheetName, rows: tripRows });
    }
    const buf = await buildXlsxBuffer(sheets);
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `optimized-routes-${today}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }

  const validateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/transport/validate-pins"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/stops"] });
      toast({ title: `Pin validation: ${data.valid} valid, ${data.errors} errors out of ${data.total}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const demandMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/transport/compute-demand"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setDemandData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/stops"] });
      setPipelineStep(Math.max(pipelineStep, 2));
      toast({ title: `Demand computed: ${data.totalBags} bags, ${data.totalWeightKg} kg` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clusterMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/transport/cluster"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setClusterData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/stops"] });
      setPipelineStep(Math.max(pipelineStep, 3));
      toast({ title: `Clustered into ${data.clusters.length} groups, ${data.totalVehicles} vehicles needed` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const splitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/transport/split-trips"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setSplitData(data);
      setPipelineStep(Math.max(pipelineStep, 4));
      toast({ title: `Split into ${data.totalTrips} trips` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const optimizeMutation = useMutation({
    mutationFn: (trips: any[]) => apiRequest("POST", "/api/admin/transport/optimize-trips", { trips }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setOptimizeData(data);
      setPipelineStep(5);
      toast({ title: `Routes optimized: ${data.totalKm} km total across ${data.totalTrips} trips` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStopMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/admin/transport/stops/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/stops"] });
      setEditingStop(null);
      toast({ title: "Stop updated" });
    },
  });

  const toggleTrip = (idx: number) => {
    const next = new Set(expandedTrips);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setExpandedTrips(next);
  };

  const stepsConfig = [
    { num: 1, label: "Load & Validate Pins", icon: <Crosshair className="h-4 w-4" /> },
    { num: 2, label: "Convert Demand", icon: <Package className="h-4 w-4" /> },
    { num: 3, label: "Geo Clustering", icon: <Layers className="h-4 w-4" /> },
    { num: 4, label: "Trip Splitting", icon: <SplitSquareHorizontal className="h-4 w-4" /> },
    { num: 5, label: "Optimize Routes", icon: <Compass className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {stepsConfig.map((s, i) => (
          <button
            key={s.num}
            onClick={() => setPipelineStep(s.num)}
            className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
              pipelineStep === s.num
                ? "bg-primary text-primary-foreground shadow"
                : pipelineStep > s.num
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {pipelineStep > s.num ? <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : s.icon}
            <span className="hidden sm:inline">Step {s.num}: {s.label}</span>
            <span className="sm:hidden">{s.num}</span>
            {i < stepsConfig.length - 1 && <span className="ml-1 sm:ml-2 text-muted-foreground">→</span>}
          </button>
        ))}
      </div>

      {pipelineStep === 1 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2"><Crosshair className="h-5 w-5" /> Step 1: Load & Validate Pins</CardTitle>
              <div className="flex flex-wrap gap-2">
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                <Button onClick={handleDownloadTemplate} size="sm" variant="outline">
                  <FileDown className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Template</span>
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} disabled={importing} size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{importing ? "Importing..." : "Import Excel"}</span>
                </Button>
                <Button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending || stops.length === 0} size="sm" variant="outline">
                  <CheckCircle className="h-4 w-4 mr-1" /> {validateMutation.isPending ? "Validating..." : "Validate"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading stops...</p>
            ) : stops.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No delivery stops loaded yet. Import stops from an Excel file using the Import button above, or add them manually.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Zone</TableHead>
                      <TableHead className="w-12">Div</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="w-24">Lat</TableHead>
                      <TableHead className="w-24">Lng</TableHead>
                      <TableHead className="w-20">Pockets</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead className="w-16">Fix</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stops.map((s: any) => (
                      <TableRow key={s.id} className={s.pinStatus === "error" ? "bg-red-50 dark:bg-red-950" : ""}>
                        <TableCell className="font-mono text-xs">{s.zone}</TableCell>
                        <TableCell className="font-mono text-xs">{s.division}</TableCell>
                        <TableCell className="text-sm font-medium">{s.locationName}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={s.address}>{s.address}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {editingStop === s.id ? (
                            <Input value={editLat} onChange={e => setEditLat(e.target.value)} className="h-7 w-24 text-xs" />
                          ) : Number(s.lat).toFixed(4)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {editingStop === s.id ? (
                            <Input value={editLng} onChange={e => setEditLng(e.target.value)} className="h-7 w-24 text-xs" />
                          ) : Number(s.lng).toFixed(4)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{s.totalPockets}</TableCell>
                        <TableCell>
                          <Badge className={s.pinStatus === "valid" ? "bg-green-100 text-green-800" : s.pinStatus === "fixed" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                            {s.pinStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editingStop === s.id ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
                                updateStopMutation.mutate({ id: s.id, data: { lat: editLat, lng: editLng, pinStatus: "fixed" } });
                              }}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingStop(null)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
                              setEditingStop(s.id);
                              setEditLat(String(s.lat));
                              setEditLng(String(s.lng));
                            }}>
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{stops.length} stops loaded</span>
                  <span className="text-green-600">{stops.filter((s: any) => s.pinStatus === "valid").length} valid</span>
                  <span className="text-red-600">{stops.filter((s: any) => s.pinStatus === "error").length} errors</span>
                  <span className="text-yellow-600">{stops.filter((s: any) => s.pinStatus === "fixed").length} fixed</span>
                </div>
              </div>
            )}
            {stops.length > 0 && (
              <div className="flex justify-end mt-4">
                <Button onClick={() => { demandMutation.mutate(); setPipelineStep(2); }}>
                  Next: Convert Demand →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {pipelineStep === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Step 2: Demand Conversion (Pockets → Bags → Weight)</CardTitle>
              <Button onClick={() => demandMutation.mutate()} disabled={demandMutation.isPending} size="sm">
                <RefreshCw className={`h-4 w-4 mr-1 ${demandMutation.isPending ? "animate-spin" : ""}`} /> {demandMutation.isPending ? "Computing..." : "Compute Demand"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {demandData ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                  <Card className="p-2 sm:p-3 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-primary">{demandData.totalStops}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Total Stops</div>
                  </Card>
                  <Card className="p-2 sm:p-3 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{demandData.totalPockets.toLocaleString()}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Total Pockets</div>
                  </Card>
                  <Card className="p-2 sm:p-3 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-emerald-600">{demandData.totalBags}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Total Bags</div>
                  </Card>
                  <Card className="p-2 sm:p-3 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-amber-600">{demandData.totalWeightKg.toLocaleString()} kg</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">Total Weight</div>
                  </Card>
                </div>
                <div className="bg-primary/5 rounded-lg p-3 mb-4 flex items-center gap-3">
                  <Truck className="h-6 w-6 text-primary" />
                  <div>
                    <span className="font-semibold text-lg">{demandData.minVehicles}</span>
                    <span className="text-sm text-muted-foreground ml-2">minimum vehicles needed (115 bags/vehicle capacity)</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Pockets</TableHead>
                        <TableHead className="text-right">Bags</TableHead>
                        <TableHead className="text-right">Weight (kg)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demandData.perStop.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-sm">{s.locationName}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{s.pockets.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{s.bags}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{s.weightKg.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Click "Compute Demand" to convert pockets into bags and weight for all stops.</p>
              </div>
            )}
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setPipelineStep(1)}>← Back</Button>
              <Button onClick={() => { if (!demandData) demandMutation.mutate(); clusterMutation.mutate(); setPipelineStep(3); }} disabled={!demandData && demandMutation.isPending}>
                Next: Geo Clustering →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pipelineStep === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Step 3: Geo Clustering (K-Means, K=3)</CardTitle>
              <Button onClick={() => clusterMutation.mutate()} disabled={clusterMutation.isPending} size="sm">
                <RefreshCw className={`h-4 w-4 mr-1 ${clusterMutation.isPending ? "animate-spin" : ""}`} /> {clusterMutation.isPending ? "Clustering..." : "Run Clustering"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {clusterData ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                  {clusterData.clusters.map((c: any) => (
                    <Card key={c.cluster} className={`p-3 sm:p-4 border-2 ${c.cluster === "A" ? "border-blue-300" : c.cluster === "B" ? "border-emerald-300" : "border-purple-300"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={CLUSTER_COLORS[c.cluster]}>Cluster {c.cluster}</Badge>
                        <span className="text-sm text-muted-foreground">{c.stopCount} stops</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                        <div><span className="text-muted-foreground">Pockets:</span> <strong>{c.totalPockets.toLocaleString()}</strong></div>
                        <div><span className="text-muted-foreground">Bags:</span> <strong>{c.totalBags}</strong></div>
                        <div><span className="text-muted-foreground">Weight:</span> <strong>{c.totalWeightKg.toLocaleString()} kg</strong></div>
                        <div><span className="text-muted-foreground">Vehicles:</span> <strong>{c.vehiclesNeeded}</strong></div>
                      </div>
                      <div className="mt-3 space-y-1">
                        {c.stops.map((s: any) => (
                          <div key={s.id} className="text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>Z{s.zone}/{s.division} - {s.locationName}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="bg-primary/5 rounded-lg p-3 flex items-center gap-3">
                  <Truck className="h-6 w-6 text-primary" />
                  <span className="font-semibold">{clusterData.totalVehicles} total vehicles</span>
                  <span className="text-muted-foreground text-sm">across 3 clusters</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Click "Run Clustering" to group delivery stops into 3 geographic clusters using K-Means.</p>
              </div>
            )}
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setPipelineStep(2)}>← Back</Button>
              <Button onClick={() => { if (!clusterData) clusterMutation.mutate(); splitMutation.mutate(); setPipelineStep(4); }} disabled={!clusterData && clusterMutation.isPending}>
                Next: Split Trips →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pipelineStep === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><SplitSquareHorizontal className="h-5 w-5" /> Step 4: Capacity-Based Trip Splitting</CardTitle>
              <Button onClick={() => splitMutation.mutate()} disabled={splitMutation.isPending} size="sm">
                <RefreshCw className={`h-4 w-4 mr-1 ${splitMutation.isPending ? "animate-spin" : ""}`} /> {splitMutation.isPending ? "Splitting..." : "Split Trips"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {splitData ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{splitData.totalTrips}</div>
                    <div className="text-xs text-muted-foreground">Total Trips</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{splitData.totalVehicles}</div>
                    <div className="text-xs text-muted-foreground">Vehicles Required</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600">{splitData.trips.reduce((a: number, t: any) => a + t.stops.length, 0)}</div>
                    <div className="text-xs text-muted-foreground">Total Stops</div>
                  </Card>
                </div>
                <div className="space-y-3">
                  {splitData.trips.map((trip: any, idx: number) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleTrip(idx)}>
                        <div className="flex items-center gap-3">
                          <Badge className={CLUSTER_COLORS[trip.cluster] || "bg-gray-100 text-gray-800"}>{trip.tripLabel}</Badge>
                          <span className="text-sm">{trip.stops.length} stops</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-xs text-right">
                            <div>{trip.totalPockets.toLocaleString()} pockets / {trip.totalBags} bags / {trip.totalWeightKg} kg</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={trip.capacityPct} className="h-2 w-24" />
                              <span className={trip.capacityPct > 90 ? "text-red-600 font-bold" : ""}>{trip.capacityPct}%</span>
                            </div>
                          </div>
                          {expandedTrips.has(idx) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                      {expandedTrips.has(idx) && (
                        <div className="mt-2 border-t pt-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead className="text-right">Pockets</TableHead>
                                <TableHead className="text-right">Bags</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {trip.stops.map((s: any, si: number) => (
                                <TableRow key={si}>
                                  <TableCell className="font-mono text-xs">{si + 1}</TableCell>
                                  <TableCell className="text-sm">{s.locationName}</TableCell>
                                  <TableCell className="text-right font-mono text-xs">{s.totalPockets}</TableCell>
                                  <TableCell className="text-right font-mono text-xs">{s.bags}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <SplitSquareHorizontal className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Click "Split Trips" to divide cluster stops into vehicle-capacity trips (max 115 bags / 5750 pockets / 1500 kg).</p>
              </div>
            )}
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setPipelineStep(3)}>← Back</Button>
              <Button onClick={() => { if (!splitData) splitMutation.mutate(); else { optimizeMutation.mutate(splitData.trips); setPipelineStep(5); } }} disabled={!splitData && splitMutation.isPending}>
                Next: Optimize Routes →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pipelineStep === 5 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Compass className="h-5 w-5" /> Step 5: Route Optimization (Nearest Neighbor + 2-Opt)</CardTitle>
              <div className="flex gap-2">
                {splitData && (
                  <Button onClick={() => optimizeMutation.mutate(splitData.trips)} disabled={optimizeMutation.isPending} size="sm">
                    <RefreshCw className={`h-4 w-4 mr-1 ${optimizeMutation.isPending ? "animate-spin" : ""}`} /> {optimizeMutation.isPending ? "Optimizing..." : "Re-Optimize"}
                  </Button>
                )}
                {optimizeData && (
                  <Button onClick={handleExportOptimizedRoutes} size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" /> Export Excel
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {optimizeData ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{optimizeData.totalTrips}</div>
                    <div className="text-xs text-muted-foreground">Optimized Trips</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{optimizeData.totalKm} km</div>
                    <div className="text-xs text-muted-foreground">Total Distance</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600">{optimizeData.totalTimeMin} min</div>
                    <div className="text-xs text-muted-foreground">Est. Total Time</div>
                  </Card>
                </div>
                <div className="space-y-3">
                  {optimizeData.trips.map((trip: any, idx: number) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleTrip(100 + idx)}>
                        <div className="flex items-center gap-3">
                          <Badge className={CLUSTER_COLORS[trip.cluster] || "bg-gray-100 text-gray-800"}>{trip.tripLabel}</Badge>
                          <span className="text-sm">{trip.optimizedStops?.length || 0} stops</span>
                          <span className="text-sm text-muted-foreground">{trip.totalDistKm} km / {trip.totalTimeMin} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {trip.googleMapsUrl && (
                            <Button size="sm" variant="outline" className="h-7" asChild>
                              <a href={trip.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                                <Navigation className="h-3 w-3 mr-1" /> Maps
                              </a>
                            </Button>
                          )}
                          {expandedTrips.has(100 + idx) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                      {expandedTrips.has(100 + idx) && (
                        <div className="mt-2 border-t pt-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">Seq</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead className="text-right">Pockets</TableHead>
                                <TableHead className="text-right">Bags</TableHead>
                                <TableHead className="text-right">Dist (km)</TableHead>
                                <TableHead className="text-right">Cumul. (km)</TableHead>
                                <TableHead className="text-right">ETA</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="bg-primary/5">
                                <TableCell className="font-mono text-xs">0</TableCell>
                                <TableCell className="text-sm font-medium">Ambattur Depot (Start)</TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell className="text-right font-mono text-xs">0</TableCell>
                                <TableCell className="text-right font-mono text-xs">0</TableCell>
                                <TableCell className="text-right text-xs">Depart</TableCell>
                              </TableRow>
                              {trip.optimizedStops?.map((s: any) => (
                                <TableRow key={s.sequence}>
                                  <TableCell className="font-mono text-xs">{s.sequence}</TableCell>
                                  <TableCell className="text-sm">{s.locationName}</TableCell>
                                  <TableCell className="text-right font-mono text-xs">{s.totalPockets}</TableCell>
                                  <TableCell className="text-right font-mono text-xs">{s.bags}</TableCell>
                                  <TableCell className="text-right font-mono text-xs">{s.distFromPrev}</TableCell>
                                  <TableCell className="text-right font-mono text-xs">{s.cumulativeDist}</TableCell>
                                  <TableCell className="text-right text-xs">{s.eta}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-primary/5">
                                <TableCell className="font-mono text-xs">R</TableCell>
                                <TableCell className="text-sm font-medium">Return to Ambattur Depot</TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell />
                                <TableCell className="text-right font-mono text-xs">{trip.totalDistKm}</TableCell>
                                <TableCell className="text-right text-xs">{trip.totalTimeMin} min</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Compass className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{optimizeMutation.isPending ? "Optimizing routes..." : "Click steps 1-4 first, then optimize."}</p>
              </div>
            )}
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setPipelineStep(4)}>← Back</Button>
              <Button variant="outline" onClick={() => setPipelineStep(1)}>
                <RefreshCw className="h-4 w-4 mr-1" /> Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
