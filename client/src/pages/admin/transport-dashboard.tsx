import { useQuery } from "@tanstack/react-query";
import AdminLayout from "./layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Truck, Activity, CheckCircle, AlertTriangle, Clock, Package,
  Route, TrendingUp, LayoutDashboard, ChevronRight, MapPin,
} from "lucide-react";

function KpiCard({ title, value, icon, color, subtitle }: { title: string; value: string | number; icon: React.ReactNode; color: string; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TransportDashboard() {
  const { data: tmDash, isLoading: tmLoading } = useQuery<any>({
    queryKey: ["/api/transport-manager/dashboard"],
    queryFn: () => fetch("/api/transport-manager/dashboard", { credentials: "include" }).then(r => r.ok ? r.json() : fetch("/api/admin/transport/dashboard", { credentials: "include" }).then(r2 => r2.json())),
  });

  const { data: djStats, isLoading: djLoading } = useQuery<any>({
    queryKey: ["/api/delivery-jobs/stats/federation"],
  });

  const kpi = tmDash?.kpi || {};
  const recentTrips = tmDash?.recentTrips || [];
  const segmentBreakdown = tmDash?.segmentBreakdown || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Transport Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Overview of logistics operations</p>
            </div>
          </div>
          <Link href="/admin/transport/trip-planning">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Route className="h-4 w-4 mr-1" /> Plan New Trip
            </Button>
          </Link>
        </div>

        {tmLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard title="Active Trips" value={kpi.activeTrips || 0} icon={<Activity className="h-5 w-5 text-blue-500" />} color="text-blue-600" />
            <KpiCard title="Vehicles Out" value={`${kpi.vehiclesOut || 0}/${kpi.totalVehicles || 0}`} icon={<Truck className="h-5 w-5 text-indigo-500" />} color="text-indigo-600" />
            <KpiCard title="Pending Jobs" value={djStats?.readyForTrip || djStats?.pendingValidation || 0} icon={<Clock className="h-5 w-5 text-amber-500" />} color="text-amber-600" subtitle="Ready for planning" />
            <KpiCard title="Completed Today" value={kpi.completedTrips || 0} icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} color="text-emerald-600" />
            <KpiCard title="Delayed Trips" value={kpi.delayedTrips || 0} icon={<AlertTriangle className="h-5 w-5 text-red-500" />} color="text-red-600" />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Total Bags" value={kpi.totalBags || 0} icon={<Package className="h-5 w-5 text-purple-500" />} color="text-purple-600" />
          <KpiCard title="On-Time %" value={`${kpi.onTimePercent || 0}%`} icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} color={kpi.onTimePercent >= 80 ? "text-emerald-600" : "text-amber-600"} />
          <KpiCard title="Planned" value={kpi.plannedTrips || 0} icon={<Clock className="h-5 w-5 text-blue-500" />} color="text-blue-600" />
          <KpiCard title="Today's Trips" value={kpi.totalTripsToday || 0} icon={<Route className="h-5 w-5 text-gray-500" />} color="text-gray-800 dark:text-gray-200" />
        </div>

        {segmentBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Segment Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {segmentBreakdown.map((seg: any) => (
                  <div key={seg.segment} className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">{seg.segment}</p>
                    <p className="text-lg font-bold">{seg.trips}</p>
                    <p className="text-[10px] text-muted-foreground">{seg.bags} bags</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Recent Trip Activity</CardTitle>
              <Link href="/admin/transport/trip-planning">
                <Button variant="ghost" size="sm" className="text-xs">View All <ChevronRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentTrips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No trips today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTrips.map((trip: any) => (
                  <Link key={trip.id} href={`/admin/transport/trips/${trip.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                          <Truck className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{trip.routeName || `Trip #${trip.tripId || trip.id}`}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{trip.driverName || "Unassigned"}</span>
                            {trip.vehicleNo && <span>• {trip.vehicleNo}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Planned": return <Badge className="bg-blue-500 hover:bg-blue-600 text-[10px]">Planned</Badge>;
    case "In Progress":
    case "In-Progress": return <Badge className="bg-amber-500 hover:bg-amber-600 text-black text-[10px]">In Progress</Badge>;
    case "Completed": return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px]">Completed</Badge>;
    case "Delayed": return <Badge className="bg-red-500 hover:bg-red-600 text-[10px]">Delayed</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}
