import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import FleetVehiclesPanel from "@/components/delivery/fleet-vehicles-panel";
import DriversPanel from "@/components/delivery/drivers-panel";
import TripPlanningWizard from "@/components/delivery/trip-planning-wizard";
import { Package, Truck, Users, Sun, Moon, Search, ExternalLink, Clock, CheckCircle, RefreshCw, Route } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const TABS = [
  { value: "dashboard", label: "Dashboard", icon: Package },
  { value: "orders", label: "Order Deliveries", icon: Truck },
  { value: "trips", label: "Trip Planning", icon: Route },
  { value: "fleet", label: "Fleet & Vehicles", icon: Truck },
  { value: "drivers", label: "Drivers", icon: Users },
];

export default function MerchantRegularDelivery() {
  const [location] = useLocation();
  const { merchantId } = useMerchantContext();
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.value === tabFromUrl) ? tabFromUrl : "dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && TABS.some(t => t.value === tab)) setActiveTab(tab);
  }, [location]);

  const mid = merchantId || "federation";

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Regular Delivery</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">B2B/B2C order deliveries — segment & shift wise</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
          window.history.replaceState(null, '', `/merchant/regular-delivery?tab=${val}`);
        }}>
          <TabsList className="grid grid-cols-5 w-full">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1">
                  <Icon className="h-3.5 w-3.5 hidden sm:inline" /> {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="dashboard">
            <RegularDashboard merchantId={mid} />
          </TabsContent>
          <TabsContent value="orders">
            <OrderDeliveriesPanel merchantId={mid} onAssign={() => { setActiveTab("trips"); window.history.replaceState(null, '', '/merchant/regular-delivery?tab=trips'); }} />
          </TabsContent>
          <TabsContent value="trips">
            <TripPlanningWizard merchantId={mid} isAdmin={false} canCreateTrips={true} deliveryType="regular" />
          </TabsContent>
          <TabsContent value="fleet">
            <FleetVehiclesPanel merchantId={mid} isAdmin={false} />
          </TabsContent>
          <TabsContent value="drivers">
            <DriversPanel merchantId={mid} isAdmin={false} />
          </TabsContent>
        </Tabs>
      </div>
    </MerchantLayout>
  );
}

function RegularDashboard({ merchantId }: { merchantId: string }) {
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/delivery-jobs/stats", merchantId, "regular"],
    queryFn: async () => {
      const res = await fetch(`/api/delivery-jobs/stats/${merchantId}?deliveryType=regular`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: jobs } = useQuery<any[]>({
    queryKey: ["/api/delivery-jobs", merchantId, "regular"],
    queryFn: async () => {
      const res = await fetch(`/api/delivery-jobs/${merchantId}?deliveryType=regular`, { credentials: "include" });
      return res.json();
    },
  });

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  const todayJobs = (jobs || []);
  const fmJobs = todayJobs.filter((j: any) => j.segment === "Fresh Milk");
  const dpJobs = todayJobs.filter((j: any) => j.segment === "Products");
  const icJobs = todayJobs.filter((j: any) => j.segment === "Ice Cream");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-orange-500" /><span className="text-sm font-medium">Pending</span></div><p className="text-2xl font-bold">{stats?.pendingValidation || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 mb-2"><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm font-medium">Ready for Trip</span></div><p className="text-2xl font-bold">{stats?.readyForTrip || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 mb-2"><Truck className="h-4 w-4 text-blue-500" /><span className="text-sm font-medium">In Transit</span></div><p className="text-2xl font-bold">{stats?.inTransit || 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2 mb-2"><CheckCircle className="h-4 w-4 text-emerald-500" /><span className="text-sm font-medium">Delivered</span></div><p className="text-2xl font-bold">{stats?.delivered || 0}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Fresh Milk", jobs: fmJobs },
          { label: "Products", jobs: dpJobs },
          { label: "Ice Cream", jobs: icJobs },
        ].map(seg => (
          <Card key={seg.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{seg.label}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Total:</span> <strong>{seg.jobs.length}</strong></div>
                <div><span className="text-muted-foreground">Ready:</span> <strong>{seg.jobs.filter((j: any) => j.status === "ready_for_trip").length}</strong></div>
                <div><span className="text-muted-foreground">In Transit:</span> <strong>{seg.jobs.filter((j: any) => j.status === "in_transit").length}</strong></div>
                <div><span className="text-muted-foreground">Delivered:</span> <strong>{seg.jobs.filter((j: any) => j.status === "delivered").length}</strong></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function OrderDeliveriesPanel({ merchantId, onAssign }: { merchantId: string; onAssign?: () => void }) {
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: jobs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery-jobs", merchantId, "regular", segmentFilter],
    queryFn: async () => {
      let url = `/api/delivery-jobs/${merchantId}?deliveryType=regular`;
      if (segmentFilter !== "all") url += `&segment=${encodeURIComponent(segmentFilter)}`;
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
  });

  const filtered = (jobs || []).filter((j: any) => {
    if (search) {
      const s = search.toLowerCase();
      if (!j.customerName?.toLowerCase().includes(s) && !j.jobId?.toLowerCase().includes(s) && !j.deliveryAddress?.toLowerCase().includes(s)) return false;
    }
    if (shiftFilter === "morning") {
      const hour = j.createdAt ? new Date(j.createdAt).getHours() : 12;
      if (hour >= 12) return false;
    }
    if (shiftFilter === "evening") {
      const hour = j.createdAt ? new Date(j.createdAt).getHours() : 0;
      if (hour < 12) return false;
    }
    return true;
  });

  const statusColors: Record<string, string> = {
    pending_validation: "bg-orange-100 text-orange-800",
    validation_failed: "bg-red-100 text-red-800",
    ready_for_trip: "bg-green-100 text-green-800",
    assigned: "bg-blue-100 text-blue-800",
    in_transit: "bg-indigo-100 text-indigo-800",
    delivered: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by customer, job ID, address..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            <SelectItem value="Fresh Milk">Fresh Milk</SelectItem>
            <SelectItem value="Products">Products</SelectItem>
            <SelectItem value="Ice Cream">Ice Cream</SelectItem>
          </SelectContent>
        </Select>
        <Select value={shiftFilter} onValueChange={setShiftFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            <SelectItem value="morning">Morning (AM)</SelectItem>
            <SelectItem value="evening">Evening (PM)</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/delivery-jobs", merchantId, "regular"] })}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" /><p className="font-medium">No delivery jobs found</p><p className="text-sm text-muted-foreground">Orders will appear here when assigned to delivery</p></CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((job: any) => {
                const hour = job.createdAt ? new Date(job.createdAt).getHours() : 12;
                const shift = hour < 12 ? "AM" : "PM";
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">{job.jobId}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{job.customerName}</div>
                      <div className="text-xs text-muted-foreground">{job.customerPhone}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{job.segment}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${shift === "AM" ? "border-orange-300 text-orange-700" : "border-indigo-300 text-indigo-700"}`}>
                        {shift === "AM" ? <Sun className="h-3 w-3 mr-1" /> : <Moon className="h-3 w-3 mr-1" />} {shift}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{job.deliveryAddress}</TableCell>
                    <TableCell className="font-medium">₹{Number(job.totalAmount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${statusColors[job.status] || "bg-gray-100 text-gray-800"}`}>{job.status?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>
                      {job.status === "ready_for_trip" && onAssign && (
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={onAssign}>
                          <Route className="h-3 w-3" /> Assign
                        </Button>
                      )}
                      {(job.status === "assigned" || job.status === "in_transit") && (
                        <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">In Trip</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
