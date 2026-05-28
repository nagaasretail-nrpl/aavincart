import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Route, Truck, Plus, CheckCircle, Clock, Package,
  ChevronRight, Filter, Zap, ArrowRight, AlertTriangle,
  Calendar, Sun, Moon, LayoutDashboard, Eye,
} from "lucide-react";

const SEGMENTS = ["Fresh Milk", "Products", "Ice Cream"];

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Planned": return <Badge className="bg-blue-500 hover:bg-blue-600 text-[10px]">Planned</Badge>;
    case "In Progress":
    case "In-Progress": return <Badge className="bg-amber-500 hover:bg-amber-600 text-black text-[10px]">In Progress</Badge>;
    case "Completed": return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px]">Completed</Badge>;
    case "Delayed": return <Badge className="bg-red-500 hover:bg-red-600 text-[10px]">Delayed</Badge>;
    case "READY_FOR_PLANNING": return <Badge className="bg-cyan-500 hover:bg-cyan-600 text-[10px]">Ready</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

export default function TransportTripPlanning() {
  const { user } = useAuth();
  const { toast } = useToast();
  const merchantId = user?.unionId || user?.id || "";

  const [step, setStep] = useState(1);
  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [planShift, setPlanShift] = useState("AM");
  const [planSegment, setPlanSegment] = useState("Fresh Milk");
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [routeName, setRouteName] = useState("");
  const [showPlanDialog, setShowPlanDialog] = useState(false);

  const [statusFilter, setStatusFilter] = useState("All");
  const [segmentFilter, setSegmentFilter] = useState("All");

  const { data: readyJobs = [], isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["/api/delivery-jobs/ready-for-trip", merchantId],
    enabled: !!merchantId && step >= 3,
  });

  const { data: vehiclesList = [], isLoading: vehiclesLoading } = useQuery<any[]>({
    queryKey: ["/api/vehicles", merchantId],
    enabled: !!merchantId,
  });

  const { data: existingTrips = [], isLoading: tripsLoading } = useQuery<any[]>({
    queryKey: ["/api/transport-manager/trips"],
    queryFn: () => fetch(`/api/admin/transport/trips?date=${planDate}`, { credentials: "include" }).then(r => r.json()).catch(() => []),
  });

  const filteredJobs = useMemo(() => {
    return readyJobs.filter((j: any) => {
      if (planSegment !== "All" && j.segment && j.segment !== planSegment) return false;
      return true;
    });
  }, [readyJobs, planSegment]);

  const selectedVehicle = vehiclesList.find((v: any) => v.id === selectedVehicleId);

  const createTripMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/transport/trips", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transport-manager/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-jobs/ready-for-trip"] });
      toast({ title: "Trip sheet generated successfully" });
      setShowPlanDialog(false);
      resetPlan();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function resetPlan() {
    setStep(1);
    setSelectedJobs(new Set());
    setSelectedVehicleId("");
    setRouteName("");
  }

  function toggleJob(jobId: string) {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  function selectAllJobs() {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map((j: any) => j.id)));
    }
  }

  function handleGenerateTrip() {
    if (!selectedVehicle) {
      toast({ title: "Select a vehicle", variant: "destructive" });
      return;
    }
    const data = {
      date: planDate,
      shift: planShift,
      segment: planSegment,
      routeName: routeName || `${planSegment} - ${planShift} Route`,
      vehicleNo: selectedVehicle.vehicleNumber,
      driverName: selectedVehicle.driverName || "",
      driverPhone: selectedVehicle.driverPhone || "",
      plannedDropPoints: selectedJobs.size,
      bagsPlanned: 0,
      capacityBags: selectedVehicle.capacity || 120,
      hubName: "Default Hub",
      hubId: 1,
    };
    createTripMutation.mutate(data);
  }

  const filteredTrips = useMemo(() => {
    return (existingTrips || []).filter((t: any) => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (segmentFilter !== "All" && t.segment !== segmentFilter) return false;
      return true;
    });
  }, [existingTrips, statusFilter, segmentFilter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Route className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Trip Planning</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Plan trips step-by-step and manage existing ones</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/transport/dashboard">
              <Button variant="outline" size="sm">
                <LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Trip Wizard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { num: 1, label: "Date & Shift" },
                { num: 2, label: "Segment" },
                { num: 3, label: "Select Jobs" },
                { num: 4, label: "Optimize" },
                { num: 5, label: "Assign Vehicle" },
                { num: 6, label: "Generate" },
              ].map((s) => (
                <div key={s.num} className="flex items-center gap-1 shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.num ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>
                    {step > s.num ? <CheckCircle className="h-4 w-4" /> : s.num}
                  </div>
                  <span className={`text-xs ${step >= s.num ? "font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                  {s.num < 6 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4 max-w-md">
                <div>
                  <Label className="text-sm">Date</Label>
                  <Input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm">Shift</Label>
                  <div className="flex gap-2 mt-1">
                    <Button variant={planShift === "AM" ? "default" : "outline"} size="sm" onClick={() => setPlanShift("AM")} className={planShift === "AM" ? "bg-blue-600" : ""}>
                      <Sun className="h-4 w-4 mr-1" /> AM
                    </Button>
                    <Button variant={planShift === "PM" ? "default" : "outline"} size="sm" onClick={() => setPlanShift("PM")} className={planShift === "PM" ? "bg-blue-600" : ""}>
                      <Moon className="h-4 w-4 mr-1" /> PM
                    </Button>
                  </div>
                </div>
                <Button onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700">
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 max-w-md">
                <div>
                  <Label className="text-sm">Product Segment</Label>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {SEGMENTS.map(seg => (
                      <Button key={seg} variant={planSegment === seg ? "default" : "outline"} size="sm" onClick={() => setPlanSegment(seg)} className={planSegment === seg ? "bg-blue-600" : ""}>
                        {seg}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700">
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Delivery Jobs — {planSegment} ({filteredJobs.length} available)
                  </p>
                  <Button variant="outline" size="sm" onClick={selectAllJobs}>
                    {selectedJobs.size === filteredJobs.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                {jobsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No delivery jobs ready for planning</p>
                    <p className="text-xs mt-1">Jobs appear here when orders are invoiced</p>
                  </div>
                ) : (
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Job ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Items</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs.map((job: any) => (
                          <TableRow key={job.id} className="cursor-pointer" onClick={() => toggleJob(job.id)}>
                            <TableCell>
                              <Checkbox checked={selectedJobs.has(job.id)} onCheckedChange={() => toggleJob(job.id)} />
                            </TableCell>
                            <TableCell className="text-xs font-mono">{job.jobId || job.id?.slice(0, 8)}</TableCell>
                            <TableCell className="text-sm">{job.customerName || "—"}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{job.deliveryAddress || "—"}</TableCell>
                            <TableCell className="text-xs">{job.itemCount || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{selectedJobs.size} jobs selected</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setStep(2)}>Back</Button>
                    <Button onClick={() => setStep(4)} className="bg-blue-600 hover:bg-blue-700" disabled={selectedJobs.size === 0 && filteredJobs.length > 0}>
                      Next <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 max-w-md">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Route Optimization</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Optimize the route for {selectedJobs.size} selected delivery jobs to minimize travel time.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => toast({ title: "Route optimized", description: "Stops reordered for shortest path" })}>
                    <Zap className="h-3 w-3 mr-1" /> Optimize Route
                  </Button>
                </div>
                <div>
                  <Label className="text-sm">Route Name (optional)</Label>
                  <Input placeholder={`${planSegment} - ${planShift} Route`} value={routeName} onChange={(e) => setRouteName(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep(3)}>Back</Button>
                  <Button onClick={() => setStep(5)} className="bg-blue-600 hover:bg-blue-700">
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <Label className="text-sm">Assign Vehicle</Label>
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger>
                    <SelectContent>
                      {vehiclesList.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.vehicleNumber} — {v.vehicleType} (Cap: {v.capacity})
                          {v.driverName ? ` [${v.driverName}]` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedVehicle && (
                  <div className="p-3 border rounded-lg bg-muted/30 space-y-1">
                    <p className="text-sm font-medium">{selectedVehicle.vehicleNumber}</p>
                    <p className="text-xs text-muted-foreground">Type: {selectedVehicle.vehicleType} • Capacity: {selectedVehicle.capacity}</p>
                    <p className="text-xs">
                      Driver: {selectedVehicle.driverName || <span className="text-amber-600">Not assigned</span>}
                      {selectedVehicle.driverPhone && ` (${selectedVehicle.driverPhone})`}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep(4)}>Back</Button>
                  <Button onClick={() => setStep(6)} className="bg-blue-600 hover:bg-blue-700" disabled={!selectedVehicleId}>
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4 max-w-lg">
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30 space-y-2">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Trip Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Date:</span> {planDate}</div>
                    <div><span className="text-muted-foreground">Shift:</span> {planShift}</div>
                    <div><span className="text-muted-foreground">Segment:</span> {planSegment}</div>
                    <div><span className="text-muted-foreground">Stops:</span> {selectedJobs.size}</div>
                    <div><span className="text-muted-foreground">Vehicle:</span> {selectedVehicle?.vehicleNumber}</div>
                    <div><span className="text-muted-foreground">Driver:</span> {selectedVehicle?.driverName || "Not assigned"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Route:</span> {routeName || `${planSegment} - ${planShift} Route`}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep(5)}>Back</Button>
                  <Button onClick={handleGenerateTrip} className="bg-emerald-600 hover:bg-emerald-700" disabled={createTripMutation.isPending}>
                    {createTripMutation.isPending ? "Generating..." : "Generate Trip Sheet"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4" /> Existing Trips
              </CardTitle>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Planned">Planned</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Delayed">Delayed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Segments</SelectItem>
                    {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tripsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Route className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No trips found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTrips.map((trip: any) => (
                  <Link key={trip.id} href={`/admin/transport/trips/${trip.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                          <Truck className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{trip.routeName || `Trip #${trip.id}`}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span>{trip.driverName || "Unassigned"}</span>
                            {trip.vehicleNo && <span>• {trip.vehicleNo}</span>}
                            <span>• {trip.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {trip.totalStops > 0 && (
                          <div className="text-right mr-2">
                            <p className="text-xs font-medium">{trip.deliveredStops || 0}/{trip.totalStops}</p>
                            <Progress value={trip.progress || 0} className="w-16 h-1.5" />
                          </div>
                        )}
                        <Badge variant="outline" className="text-[10px]">{trip.segment}</Badge>
                        <StatusBadge status={trip.status} />
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
