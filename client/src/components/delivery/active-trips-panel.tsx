import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Truck,
  Route,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  ChevronRight,
  ChevronDown,
  Radio,
  Package,
} from "lucide-react";

interface ActiveTripsPanelProps {
  merchantId: string;
  isAdmin: boolean;
  deliveryType?: string;
}

interface LiveLocation {
  vehicleId?: string;
  vehicleNumber?: string;
  driverName?: string;
  lat?: number;
  lng?: number;
  speed?: number;
  tripStatus?: string;
  alerts?: string[];
  nextStop?: string;
  progress?: string;
  timestamp?: string;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase().replace(/[_\s-]+/g, "_");
  switch (normalized) {
    case "dispatched":
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-[10px]">Dispatched</Badge>;
    case "in_progress":
      return <Badge className="bg-amber-500 hover:bg-amber-600 text-black text-[10px]">In Progress</Badge>;
    case "completed":
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px]">Completed</Badge>;
    case "delayed":
      return <Badge className="bg-red-500 hover:bg-red-600 text-[10px]">Delayed</Badge>;
    case "planned":
      return <Badge className="bg-cyan-500 hover:bg-cyan-600 text-[10px]">Planned</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

function normalizeStatus(status: string): string {
  return (status || "").toLowerCase().replace(/[_\s-]+/g, "_");
}

export default function ActiveTripsPanel({ merchantId, isAdmin, deliveryType }: ActiveTripsPanelProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [liveTrackingOpen, setLiveTrackingOpen] = useState(false);
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: trips = [], isLoading: tripsLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/transport/trips", merchantId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/admin/transport/trips?date=${today}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    const activeStatuses = ["dispatched", "in_progress", "completed", "delayed", "planned"];
    let filtered = trips.filter((t: any) => {
      const ns = normalizeStatus(t.status);
      return activeStatuses.includes(ns);
    });

    if (statusFilter !== "all") {
      filtered = filtered.filter((t: any) => normalizeStatus(t.status) === statusFilter);
    }

    return filtered;
  }, [trips, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, dispatched: 0, in_progress: 0, completed: 0, delayed: 0 };
    (trips || []).forEach((t: any) => {
      const ns = normalizeStatus(t.status);
      if (ns in counts) counts[ns]++;
      counts.all++;
    });
    return counts;
  }, [trips]);

  const activeTripsCount = useMemo(() => {
    return (trips || []).filter((t: any) => {
      const ns = normalizeStatus(t.status);
      return ns === "dispatched" || ns === "in_progress";
    }).length;
  }, [trips]);

  useEffect(() => {
    if (!merchantId || activeTripsCount === 0) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setSseConnected(false);
      }
      return;
    }

    if (!liveTrackingOpen) return;

    const es = new EventSource(`/api/delivery/live-stream/${merchantId}`, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => setSseConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "location_update") {
          setLiveLocations(prev => {
            const filtered = prev.filter(l => l.vehicleId !== data.vehicleId);
            return [...filtered, data];
          });
        }
      } catch {}
    };

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setSseConnected(false);
    };
  }, [merchantId, activeTripsCount, liveTrackingOpen]);

  const getTripProgress = (trip: any) => {
    const delivered = trip.deliveredStops || trip.completedDropPoints || 0;
    const total = trip.totalStops || trip.totalDropPoints || trip.plannedDropPoints || 1;
    return Math.round((delivered / total) * 100);
  };

  const getTripDetailUrl = (tripId: string) => {
    return isAdmin ? `/admin/transport/trips/${tripId}` : `/merchant/delivery?tab=active`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="h-5 w-5 text-green-600" />
          <h2 className="text-sm font-semibold">Active Trips</h2>
          {activeTripsCount > 0 && (
            <span className="ml-1 w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all" className="text-xs">
            All ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="dispatched" className="text-xs">
            Dispatched ({statusCounts.dispatched})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs">
            In Progress ({statusCounts.in_progress})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed ({statusCounts.completed})
          </TabsTrigger>
          <TabsTrigger value="delayed" className="text-xs">
            Delayed ({statusCounts.delayed})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tripsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filteredTrips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Route className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-muted-foreground">No trips found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter === "all" ? "No trips for today" : `No ${statusFilter.replace("_", " ")} trips`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTrips.map((trip: any) => {
            const progress = getTripProgress(trip);
            const delivered = trip.deliveredStops || trip.completedDropPoints || 0;
            const total = trip.totalStops || trip.totalDropPoints || trip.plannedDropPoints || 0;
            const ns = normalizeStatus(trip.status);
            const isActive = ns === "dispatched" || ns === "in_progress";

            return (
              <Link key={trip.id} href={getTripDetailUrl(trip.id)}>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${isActive ? "bg-green-50 dark:bg-green-950/30" : "bg-blue-50 dark:bg-blue-950/30"}`}>
                      <Truck className={`h-4 w-4 ${isActive ? "text-green-600" : "text-blue-600"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {trip.routeName || `Trip #${trip.tripId || trip.id?.toString().slice(-6)}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>{trip.date}</span>
                        {trip.shift && <span>• {trip.shift}</span>}
                        <span>• {trip.driverName || "Unassigned"}</span>
                        {(trip.vehicleNo || trip.vehicleNumber) && (
                          <span>• {trip.vehicleNo || trip.vehicleNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {total > 0 && (
                      <div className="text-right mr-2">
                        <p className="text-xs font-medium">{delivered}/{total}</p>
                        <Progress value={progress} className="w-16 h-1.5" />
                      </div>
                    )}
                    {ns === "delayed" && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    {isActive && progress === 100 && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    )}
                    {trip.segment && (
                      <Badge variant="outline" className="text-[10px]">{trip.segment}</Badge>
                    )}
                    <StatusBadge status={trip.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {activeTripsCount > 0 && (
        <Collapsible open={liveTrackingOpen} onOpenChange={setLiveTrackingOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Radio className="h-4 w-4 text-green-500" />
                    Live Tracking
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {liveTrackingOpen && (
                      <Badge variant={sseConnected ? "default" : "destructive"} className="text-xs">
                        {sseConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    )}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${liveTrackingOpen ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {liveLocations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Waiting for vehicle location updates...</p>
                    <p className="text-xs mt-1">Active trips will show real-time positions here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {liveLocations.map((loc, idx) => (
                      <div key={loc.vehicleId || idx} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-sm">{loc.vehicleNumber || "Vehicle"}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {loc.speed !== undefined ? `${Math.round(Number(loc.speed))} km/h` : "N/A"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Driver:</span>{" "}
                            <span>{loc.driverName || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>{" "}
                            <span>{loc.tripStatus || "Active"}</span>
                          </div>
                          {loc.nextStop && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Next Stop:</span>{" "}
                              <span>{loc.nextStop}</span>
                            </div>
                          )}
                          {loc.progress && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Progress:</span>{" "}
                              <span>{loc.progress}</span>
                            </div>
                          )}
                        </div>
                        {loc.alerts && loc.alerts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {loc.alerts.map((alert, i) => (
                              <div key={i} className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span>{alert}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}