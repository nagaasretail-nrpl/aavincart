import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Truck, Activity, CheckCircle, AlertTriangle, Clock, Package,
  TrendingUp, Trophy, BarChart3, Zap,
} from "lucide-react";

interface PerformancePanelProps {
  merchantId?: string | null;
  isAdmin?: boolean;
  isFederation?: boolean;
  deliveryType?: string;
}

interface KpiData {
  activeTrips: number;
  vehiclesOut: number;
  totalVehicles: number;
  pendingJobs: number;
  onTimePercent: number;
  delayedTrips: number;
  totalBags: number;
  completedTrips: number;
  plannedTrips: number;
  totalTripsToday: number;
}

interface SegmentBreakdown {
  segment: string;
  trips: number;
  bags: number;
}

interface RecentTrip {
  id: number;
  tripId: string;
  routeName: string;
  driverName: string;
  vehicleNo: string;
  status: string;
  segment: string;
  bagsLoaded: number;
}

interface UnionPerformance {
  unionId: string;
  unionName: string;
  totalTrips: number;
  delivered: number;
  onTimePercent: number;
  delayed: number;
  totalBags: number;
  rank: number;
}

interface FederationData {
  unions: UnionPerformance[];
  totals: {
    totalTrips: number;
    delivered: number;
    onTimePercent: number;
    delayed: number;
    totalBags: number;
  };
}

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

function UnionView({ merchantId }: { merchantId?: string | null }) {
  const dashboardEndpoint = merchantId
    ? `/api/transport-manager/dashboard`
    : `/api/transport-manager/dashboard`;

  const { data: tmDash, isLoading: tmLoading } = useQuery<any>({
    queryKey: ["/api/transport-manager/dashboard", "performance"],
    queryFn: () =>
      fetch("/api/transport-manager/dashboard", { credentials: "include" })
        .then(r => r.ok ? r.json() : fetch("/api/admin/transport/dashboard", { credentials: "include" }).then(r2 => r2.json())),
  });

  const statsKey = merchantId || "federation";
  const { data: djStats } = useQuery<any>({
    queryKey: ["/api/delivery-jobs/stats", statsKey],
  });

  const kpi: KpiData = {
    activeTrips: tmDash?.kpi?.activeTrips || 0,
    vehiclesOut: tmDash?.kpi?.vehiclesOut || 0,
    totalVehicles: tmDash?.kpi?.totalVehicles || 0,
    pendingJobs: djStats?.readyForTrip || djStats?.pendingValidation || 0,
    onTimePercent: tmDash?.kpi?.onTimePercent || 0,
    delayedTrips: tmDash?.kpi?.delayedTrips || 0,
    totalBags: tmDash?.kpi?.totalBags || 0,
    completedTrips: tmDash?.kpi?.completedTrips || 0,
    plannedTrips: tmDash?.kpi?.plannedTrips || 0,
    totalTripsToday: tmDash?.kpi?.totalTripsToday || 0,
  };

  const segmentBreakdown: SegmentBreakdown[] = tmDash?.segmentBreakdown || [];
  const recentTrips: RecentTrip[] = tmDash?.recentTrips || [];

  if (tmLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Active Trips" value={kpi.activeTrips} icon={<Activity className="h-5 w-5 text-blue-500" />} color="text-blue-600" />
        <KpiCard title="Vehicles Out" value={`${kpi.vehiclesOut}/${kpi.totalVehicles}`} icon={<Truck className="h-5 w-5 text-indigo-500" />} color="text-indigo-600" />
        <KpiCard title="Pending Jobs" value={kpi.pendingJobs} icon={<Clock className="h-5 w-5 text-amber-500" />} color="text-amber-600" subtitle="Ready for planning" />
        <KpiCard title="On-Time %" value={`${kpi.onTimePercent}%`} icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} color={kpi.onTimePercent >= 80 ? "text-emerald-600" : "text-amber-600"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Delayed Trips" value={kpi.delayedTrips} icon={<AlertTriangle className="h-5 w-5 text-red-500" />} color="text-red-600" />
        <KpiCard title="Total Bags" value={kpi.totalBags} icon={<Package className="h-5 w-5 text-purple-500" />} color="text-purple-600" />
        <KpiCard title="Completed Today" value={kpi.completedTrips} icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} color="text-emerald-600" />
        <KpiCard title="Today's Trips" value={kpi.totalTripsToday} icon={<BarChart3 className="h-5 w-5 text-gray-500" />} color="text-gray-800 dark:text-gray-200" />
      </div>

      {segmentBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Segment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {segmentBreakdown.map((seg) => (
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

      {(djStats?.validationFailed || 0) > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Exceptions Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-2 rounded bg-red-50 dark:bg-red-950/30 text-center">
                <p className="text-xs text-muted-foreground">Validation Failed</p>
                <p className="text-lg font-bold text-red-600">{djStats?.validationFailed || 0}</p>
              </div>
              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 text-center">
                <p className="text-xs text-muted-foreground">Missing Address</p>
                <p className="text-lg font-bold text-amber-600">{djStats?.missingAddress || 0}</p>
              </div>
              <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/30 text-center">
                <p className="text-xs text-muted-foreground">Missing E-way Bill</p>
                <p className="text-lg font-bold text-orange-600">{djStats?.missingEwayBill || 0}</p>
              </div>
              <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-950/30 text-center">
                <p className="text-xs text-muted-foreground">Missing Payment</p>
                <p className="text-lg font-bold text-yellow-600">{djStats?.missingPayment || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Trip Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTrips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No trips today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTrips.map((trip) => (
                <div key={trip.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FederationView() {
  const { data: fedData, isLoading } = useQuery<FederationData>({
    queryKey: ["/api/delivery/performance/federation"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  const totals = fedData?.totals || { totalTrips: 0, delivered: 0, onTimePercent: 0, delayed: 0, totalBags: 0 };
  const unions = fedData?.unions || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="Total Trips (All Unions)" value={totals.totalTrips} icon={<Activity className="h-5 w-5 text-blue-500" />} color="text-blue-600" />
        <KpiCard title="Delivered" value={totals.delivered} icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} color="text-emerald-600" />
        <KpiCard title="Federation On-Time %" value={`${totals.onTimePercent}%`} icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} color={totals.onTimePercent >= 80 ? "text-emerald-600" : "text-amber-600"} />
        <KpiCard title="Delayed" value={totals.delayed} icon={<AlertTriangle className="h-5 w-5 text-red-500" />} color="text-red-600" />
        <KpiCard title="Total Bags" value={totals.totalBags} icon={<Package className="h-5 w-5 text-purple-500" />} color="text-purple-600" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Union-wise Performance Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No trip data available yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Union Name</TableHead>
                    <TableHead className="text-right">Total Trips</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">On-Time %</TableHead>
                    <TableHead className="text-right">Delayed</TableHead>
                    <TableHead className="text-right">Total Bags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unions.map((union) => (
                    <TableRow key={union.unionId}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {union.rank <= 3 ? (
                            <span className={`text-sm font-bold ${
                              union.rank === 1 ? "text-amber-500" :
                              union.rank === 2 ? "text-gray-400" :
                              "text-amber-700"
                            }`}>
                              {union.rank === 1 ? "🥇" : union.rank === 2 ? "🥈" : "🥉"}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground font-medium">#{union.rank}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{union.unionName}</TableCell>
                      <TableCell className="text-right">{union.totalTrips}</TableCell>
                      <TableCell className="text-right">{union.delivered}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`text-[10px] ${
                          union.onTimePercent >= 90 ? "border-emerald-500 text-emerald-600" :
                          union.onTimePercent >= 70 ? "border-amber-500 text-amber-600" :
                          "border-red-500 text-red-600"
                        }`}>
                          {union.onTimePercent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {union.delayed > 0 ? (
                          <span className="text-red-600 font-medium">{union.delayed}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{union.totalBags}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell></TableCell>
                    <TableCell>Federation Total</TableCell>
                    <TableCell className="text-right">{totals.totalTrips}</TableCell>
                    <TableCell className="text-right">{totals.delivered}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-blue-600 text-[10px]">{totals.onTimePercent}%</Badge>
                    </TableCell>
                    <TableCell className="text-right text-red-600">{totals.delayed}</TableCell>
                    <TableCell className="text-right">{totals.totalBags}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PerformancePanel({ merchantId, isAdmin, isFederation }: PerformancePanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Zap className="h-5 w-5 text-blue-600" />
        <div>
          <h2 className="text-lg font-semibold">
            {isFederation ? "Federation Performance" : "Delivery Performance"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isFederation
              ? "Aggregated performance across all district unions"
              : "KPIs and metrics for your delivery operations"}
          </p>
        </div>
      </div>

      {isFederation ? (
        <FederationView />
      ) : (
        <UnionView merchantId={merchantId} />
      )}
    </div>
  );
}
