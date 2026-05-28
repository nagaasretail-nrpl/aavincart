import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import AdminLayout from "./layout";
import MerchantLayout from "../merchant/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Truck, MapPin, ArrowLeft, CheckCircle, AlertTriangle,
  Package, Clock, Play, Square, User, Phone, Route, Navigation,
  XCircle, AlertCircle,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Planned": return <Badge className="bg-blue-500 hover:bg-blue-600">Planned</Badge>;
    case "In Progress":
    case "In-Progress": return <Badge className="bg-amber-500 hover:bg-amber-600 text-black">In Progress</Badge>;
    case "Completed": return <Badge className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>;
    case "Delayed": return <Badge className="bg-red-500 hover:bg-red-600">Delayed</Badge>;
    case "Dispatched": return <Badge className="bg-purple-500 hover:bg-purple-600">Dispatched</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function StopStatusDot({ status }: { status: string }) {
  const color = status === "delivered" ? "bg-emerald-500" : status === "failed" ? "bg-red-500" : "bg-amber-400";
  return <div className={`w-3 h-3 rounded-full ${color} border-2 border-white shadow`} />;
}

export default function TransportTripDetail() {
  const [, adminParams] = useRoute("/admin/transport/trips/:tripId");
  const [, merchantParams] = useRoute("/merchant/delivery/trips/:tripId");
  const tripId = adminParams?.tripId || merchantParams?.tripId;
  const isMerchant = !!merchantParams?.tripId;
  const backUrl = isMerchant ? "/merchant/regular-delivery?tab=trips" : "/admin/transport/trip-planning";
  const Layout = isMerchant ? MerchantLayout : AdminLayout;
  const { toast } = useToast();

  const [dispatchErrors, setDispatchErrors] = useState<string[]>([]);
  const [closeSummary, setCloseSummary] = useState<any>(null);

  const { data: tripData, isLoading } = useQuery<any>({
    queryKey: ["/api/transport-manager/trips", tripId],
    queryFn: () => fetch(`/api/transport-manager/trips/${tripId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : fetch(`/api/admin/transport/trips/${tripId}/detail`, { credentials: "include" }).then(r2 => r2.json())),
    enabled: !!tripId,
  });

  const trip = tripData?.trip;
  const points = tripData?.points || [];
  const manifest = tripData?.manifest || [];

  const deliveredCount = points.filter((p: any) => p.status === "delivered").length;
  const failedCount = points.filter((p: any) => p.status === "failed").length;
  const pendingCount = points.filter((p: any) => p.status !== "delivered" && p.status !== "failed").length;
  const progress = points.length > 0 ? Math.round((deliveredCount / points.length) * 100) : 0;
  const allStopsDone = points.length > 0 && pendingCount === 0;

  const dispatchMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/transport/dispatch/${tripId}`),
    onSuccess: (data: any) => {
      if (data.blocked) {
        setDispatchErrors(data.reasons || ["Dispatch blocked"]);
        toast({ title: "Dispatch Blocked", description: `${data.reasons?.length || 1} issue(s) found`, variant: "destructive" });
      } else {
        setDispatchErrors([]);
        queryClient.invalidateQueries({ queryKey: ["/api/transport-manager/trips", tripId] });
        toast({ title: "Trip dispatched successfully" });
      }
    },
    onError: async (e: any) => {
      try {
        const body = typeof e.message === "string" ? JSON.parse(e.message) : e;
        if (body.blocked && body.reasons) {
          setDispatchErrors(body.reasons);
        } else {
          setDispatchErrors([e.message || "Dispatch failed"]);
        }
      } catch {
        setDispatchErrors([e.message || "Dispatch failed"]);
      }
      toast({ title: "Dispatch Error", description: e.message, variant: "destructive" });
    },
  });

  const closeTripMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/transport/close-trip/${tripId}`),
    onSuccess: (data: any) => {
      if (data.blocked) {
        toast({ title: "Cannot Close Trip", description: data.reason || "Some stops are still pending", variant: "destructive" });
      } else {
        setCloseSummary(data.summary || { delivered_count: deliveredCount, failed_count: failedCount, completion_rate: progress });
        queryClient.invalidateQueries({ queryKey: ["/api/transport-manager/trips", tripId] });
        toast({ title: "Trip closed successfully" });
      }
    },
    onError: async (e: any) => {
      try {
        const body = typeof e.message === "string" ? JSON.parse(e.message) : e;
        if (body.blocked) {
          toast({ title: "Cannot Close Trip", description: body.reason, variant: "destructive" });
        } else {
          toast({ title: "Error", description: e.message, variant: "destructive" });
        }
      } catch {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
          <h2 className="text-lg font-medium mb-2">Trip Not Found</h2>
          <p className="text-muted-foreground text-sm mb-4">The trip you're looking for doesn't exist or you don't have access.</p>
          <Link href={backUrl}>
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Trips</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isPlanned = trip.status === "Planned";
  const isInProgress = trip.status === "In Progress" || trip.status === "In-Progress" || trip.status === "Dispatched";
  const isCompleted = trip.status === "Completed";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={backUrl}>
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                {trip.routeName || `Trip #${trip.tripId || trip.id}`}
                <StatusBadge status={trip.status} />
              </h1>
              <p className="text-xs text-muted-foreground">
                {trip.date} • {trip.shift} Shift • {trip.segment}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isPlanned && (
              <Button onClick={() => dispatchMutation.mutate()} disabled={dispatchMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                <Play className="h-4 w-4 mr-1" /> {dispatchMutation.isPending ? "Dispatching..." : "Dispatch"}
              </Button>
            )}
            {isInProgress && allStopsDone && (
              <Button onClick={() => closeTripMutation.mutate()} disabled={closeTripMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <Square className="h-4 w-4 mr-1" /> {closeTripMutation.isPending ? "Closing..." : "Close Trip"}
              </Button>
            )}
          </div>
        </div>

        {dispatchErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Dispatch Blocked</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {dispatchErrors.map((err, i) => <li key={i} className="text-sm">{err}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {closeSummary && (
          <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-800 dark:text-emerald-300">Trip Completed</AlertTitle>
            <AlertDescription>
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                <div><span className="text-muted-foreground">Delivered:</span> <strong>{closeSummary.delivered_count}</strong></div>
                <div><span className="text-muted-foreground">Failed:</span> <strong>{closeSummary.failed_count}</strong></div>
                <div><span className="text-muted-foreground">Rate:</span> <strong>{closeSummary.completion_rate?.toFixed(1)}%</strong></div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Stops</p>
              <p className="text-xl font-bold">{points.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Delivered</p>
              <p className="text-xl font-bold text-emerald-600">{deliveredCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-xl font-bold text-red-600">{failedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-xl font-bold">{progress}%</p>
              <Progress value={progress} className="h-1.5 mt-1" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Route Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] rounded-lg bg-muted/30 border flex items-center justify-center relative overflow-hidden">
                {points.length > 0 ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 flex flex-col items-center justify-center gap-3">
                    <Navigation className="h-8 w-8 text-blue-500 animate-pulse" />
                    <p className="text-sm text-muted-foreground">Map view with {points.length} stops</p>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Delivered ({deliveredCount})</span>
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-400" /> Pending ({pendingCount})</span>
                      <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500" /> Failed ({failedCount})</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No route points added yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Vehicle & Driver
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{trip.vehicleNo || "Not assigned"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{trip.driverName || "Not assigned"}</span>
                </div>
                {trip.driverPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{trip.driverPhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Bags: {trip.bagsLoaded || trip.bagsPlanned || 0} / {trip.capacityBags || "—"}</span>
                </div>
              </CardContent>
            </Card>

            {manifest.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" /> Load Manifest
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {manifest.map((m: any, i: number) => (
                    <div key={i} className="text-xs space-y-1">
                      <p><span className="text-muted-foreground">Total Bags:</span> {m.totalBags}</p>
                      <p><span className="text-muted-foreground">Weight:</span> {m.totalWeightKg} kg</p>
                      {m.loadedBy && <p><span className="text-muted-foreground">Loaded by:</span> {m.loadedBy}</p>}
                      {m.verifiedBy && <p><span className="text-muted-foreground">Verified:</span> {m.verifiedBy}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Route className="h-4 w-4" /> Stop Sequence ({points.length} stops)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {points.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No route points for this trip</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Bags/Weight</TableHead>
                        <TableHead>ETA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {points.map((pt: any, idx: number) => (
                        <TableRow key={pt.id}>
                          <TableCell className="font-mono text-xs">{pt.sequenceNo || idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StopStatusDot status={pt.status} />
                              <span className="text-xs capitalize">{pt.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{pt.locationName || "—"}</TableCell>
                          <TableCell className="text-sm">{pt.customerName || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{pt.address || "—"}</TableCell>
                          <TableCell className="text-xs">{pt.bagsToDeliver || "—"}</TableCell>
                          <TableCell className="text-xs">{pt.plannedArrival || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden space-y-2 p-3">
                  {points.map((pt: any, idx: number) => (
                    <div key={pt.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex flex-col items-center gap-1 pt-1">
                        <span className="text-xs font-mono text-muted-foreground">{pt.sequenceNo || idx + 1}</span>
                        <StopStatusDot status={pt.status} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{pt.locationName || pt.customerName || "Stop"}</p>
                        <p className="text-xs text-muted-foreground truncate">{pt.address || "—"}</p>
                        <div className="flex gap-3 text-xs mt-1">
                          <span className="capitalize">{pt.status}</span>
                          {pt.bagsToDeliver && <span>Bags: {pt.bagsToDeliver}</span>}
                          {pt.plannedArrival && <span>ETA: {pt.plannedArrival}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
