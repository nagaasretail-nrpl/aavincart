import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Truck,
  Route,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Radio,
  Navigation,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

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

export default function MerchantDeliveryTracking() {
  const { merchantId } = useMerchantContext();
  const [liveLocations, setLiveLocations] = useState<LiveLocation[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const { data: trips = [], isLoading: tripsLoading, refetch: refetchTrips } = useQuery<any[]>({
    queryKey: ["/api/trip-sheets", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/trip-sheets?merchantId=${merchantId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ["/api/vehicles", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles?merchantId=${merchantId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const activeTrips = trips.filter((t: any) => t.status === "in_progress" || t.status === "In Progress");
  const activeVehicles = vehicles.filter((v: any) => v.status === "on_delivery");

  useEffect(() => {
    if (!merchantId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setSseConnected(false);
      }
      return;
    }

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
  }, [merchantId]);

  const getTripProgress = (trip: any) => {
    const delivered = trip.deliveredStops || trip.completedDropPoints || 0;
    const total = trip.totalStops || trip.totalDropPoints || 1;
    return Math.round((delivered / total) * 100);
  };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Navigation className="h-6 w-6 text-green-600" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Live Tracking</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Real-time vehicle and delivery tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={sseConnected ? "default" : "destructive"} className="text-xs">
              {sseConnected ? "Live Connected" : "Disconnected"}
            </Badge>
            <Link href="/merchant/delivery">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => refetchTrips()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Play className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{activeTrips.length}</p>
              <p className="text-xs text-muted-foreground">Active Trips</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Truck className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{activeVehicles.length}</p>
              <p className="text-xs text-muted-foreground">Vehicles Out</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Radio className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{liveLocations.length}</p>
              <p className="text-xs text-muted-foreground">Live Signals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">{liveLocations.filter(l => l.alerts && l.alerts.length > 0).length}</p>
              <p className="text-xs text-muted-foreground">Alerts</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="h-4 w-4 text-green-500" />
              Live Vehicle Positions
              {sseConnected && <span className="ml-1 w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveLocations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">Waiting for vehicle location updates...</p>
                <p className="text-xs mt-1">Active trips will show real-time positions here</p>
                <p className="text-xs mt-1">Ensure vehicles have GPS tracking enabled</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {liveLocations.map((loc, idx) => (
                  <div key={loc.vehicleId || idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Truck className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-medium text-sm">{loc.vehicleNumber || "Vehicle"}</span>
                          <p className="text-xs text-muted-foreground">{loc.driverName || "Driver N/A"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {loc.speed !== undefined ? `${Math.round(Number(loc.speed))} km/h` : "N/A"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <span className="font-medium">{loc.tripStatus || "Active"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Position:</span>{" "}
                        <span>{loc.lat && loc.lng ? `${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)}` : "N/A"}</span>
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
                      <div className="mt-2 space-y-1 border-t pt-2">
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
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-4 w-4" /> Active Trips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tripsLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : activeTrips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active trips at the moment</p>
                <p className="text-xs mt-1">Trips will appear here once dispatched</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTrips.map((trip: any) => {
                  const progress = getTripProgress(trip);
                  const delivered = trip.deliveredStops || trip.completedDropPoints || 0;
                  const total = trip.totalStops || trip.totalDropPoints || 0;

                  return (
                    <div key={trip.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Route className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Trip #{trip.tripId || trip.id?.toString().slice(-6)}</span>
                        </div>
                        <Badge className="bg-green-500">In Progress</Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Vehicle</p>
                          <p>{trip.vehicleNumber || trip.vehicleNo || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Driver</p>
                          <p>{trip.driverName || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Stops</p>
                          <p>{delivered}/{total}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Segment</p>
                          <p>{trip.segment || "Mixed"}</p>
                        </div>
                      </div>
                      {total > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Delivery Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
