import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import deliveryLogo from "@assets/e2a28728-fee4-437b-b9a4-d299198bded0_1771905279331.png";
import {
  Home, Package, User, LogOut, Lock,
  Loader2, MapPin, Clock, CheckCircle, Truck,
  ChevronRight, AlertCircle, Navigation, Settings,
  ChevronDown, ChevronUp, XCircle, RefreshCw,
  Activity, BarChart3, Map as MapIcon, Eye,
  ClipboardList, Plus, Square, CheckSquare,
  FileSpreadsheet, Upload, Download, FileText, Route
} from "lucide-react";

type TabId = 'dashboard' | 'trips' | 'jobs' | 'tracking' | 'exceptions' | 'bulk';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function TransportLoginForm({ onLogin }: { onLogin: (manager: any) => void }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/transport-manager/login", {
        username: username.trim(),
        password,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setLoginError(null);
        localStorage.setItem('transportManager', JSON.stringify(data.manager));
        toast({ title: "Login successful" });
        onLogin(data.manager);
      } else {
        setLoginError(data.message || "Invalid credentials");
      }
    },
    onError: (error: any) => {
      setLoginError(error.message || "Invalid credentials");
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-28 h-28 mx-auto mb-4">
            <img src={deliveryLogo} alt="Transport Manager" className="w-full h-full object-contain rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Logistics & Fleet Management</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setLoginError(null); loginMutation.mutate(); }} className="space-y-4">
          {loginError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{loginError}</div>
          )}
          <div>
            <Label htmlFor="tm-username" className="text-sm font-medium text-gray-700">Employee ID / Username</Label>
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="tm-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Employee ID, username, or phone" className="h-12 pl-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                autoComplete="username" required />
            </div>
          </div>
          <div>
            <Label htmlFor="tm-password" className="text-sm font-medium text-gray-700">Password</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="tm-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password" className="h-12 pl-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                autoComplete="current-password" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-base" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in...</> : "Sign In"}
          </Button>
        </form>
        <div className="mt-6 pt-5 border-t border-gray-200 space-y-2">
          <p className="text-center text-xs text-gray-400 mb-3">Other logins</p>
          <div className="flex gap-2">
            <Link href="/pwa/driver" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Truck className="h-4 w-4" />
              Driver App
            </Link>
            <Link href="/pwa/staff" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Settings className="h-4 w-4" />
              Staff App
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ manager }: { manager: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/transport-manager/dashboard'],
    refetchInterval: 30000,
  });

  const kpi = (data as any)?.kpi || {};
  const segmentBreakdown = (data as any)?.segmentBreakdown || [];
  const recentTrips = (data as any)?.recentTrips || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={deliveryLogo} alt="Aavin" className="w-8 h-8 rounded-lg object-contain" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Transport Dashboard</h1>
            <p className="text-[13px] text-gray-400">{manager?.name} &bull; {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
        <div className="bg-teal-600 text-white rounded-xl px-3 py-3 text-center">
          <Activity className="h-4 w-4 mx-auto mb-1 text-teal-200" />
          <p className="text-2xl font-bold">{kpi.activeTrips || 0}</p>
          <p className="text-[12px] text-teal-200">Active Trips</p>
        </div>
        <div className="bg-blue-600 text-white rounded-xl px-3 py-3 text-center">
          <Truck className="h-4 w-4 mx-auto mb-1 text-blue-200" />
          <p className="text-2xl font-bold">{kpi.vehiclesOut || 0}/{kpi.totalVehicles || 0}</p>
          <p className="text-[12px] text-blue-200">Vehicles Active</p>
        </div>
        <div className="bg-green-600 text-white rounded-xl px-3 py-3 text-center">
          <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-200" />
          <p className="text-2xl font-bold">{kpi.completedTrips || 0}</p>
          <p className="text-[12px] text-green-200">Completed Today</p>
        </div>
        <div className="bg-orange-500 text-white rounded-xl px-3 py-3 text-center">
          <Clock className="h-4 w-4 mx-auto mb-1 text-orange-200" />
          <p className="text-2xl font-bold">{kpi.plannedTrips || 0}</p>
          <p className="text-[12px] text-orange-200">Planned</p>
        </div>
        <div className="bg-purple-600 text-white rounded-xl px-3 py-3 text-center col-span-2">
          <ClipboardList className="h-4 w-4 mx-auto mb-1 text-purple-200" />
          <p className="text-2xl font-bold">{kpi.pendingJobsCount || 0}</p>
          <p className="text-[12px] text-purple-200">Pending Delivery Jobs</p>
        </div>
      </div>

      {kpi.delayedTrips > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">{kpi.delayedTrips} delayed trip{kpi.delayedTrips > 1 ? 's' : ''}</p>
              <p className="text-xs text-red-600">Requires attention</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Bags Loaded</span>
            <span className="font-semibold">{kpi.totalBags || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">On-Time Delivery</span>
            <span className="font-semibold text-green-600">{kpi.onTimePercent || 0}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Trips Today</span>
            <span className="font-semibold">{kpi.totalTripsToday || 0}</span>
          </div>
        </div>
      </div>

      {segmentBreakdown.length > 0 && (
        <div className="px-4 mb-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Segment Breakdown</h3>
          <div className="grid grid-cols-3 gap-2">
            {segmentBreakdown.map((seg: any) => (
              <div key={seg.segment} className="border border-gray-100 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold text-gray-900">{seg.trips}</p>
                <p className="text-[12px] text-gray-500">{seg.segment}</p>
                <p className="text-[12px] text-gray-400">{seg.bags} bags</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentTrips.length > 0 && (
        <div className="px-4">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Recent Activity</h3>
          <div className="space-y-2">
            {recentTrips.map((trip: any) => (
              <div key={trip.id} className="border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{trip.routeName || trip.tripId || `Trip #${trip.id}`}</p>
                    <TripStatusBadge status={trip.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{trip.driverName || 'No driver'} &bull; {trip.vehicleNo || 'No vehicle'}</p>
                </div>
                {trip.segment && <Badge className="bg-gray-100 text-gray-600 text-[12px]">{trip.segment}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TripStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Planned': 'bg-blue-100 text-blue-700',
    'In Progress': 'bg-amber-100 text-amber-700',
    'In-Progress': 'bg-amber-100 text-amber-700',
    'Dispatched': 'bg-indigo-100 text-indigo-700',
    'Completed': 'bg-green-100 text-green-700',
    'Delayed': 'bg-red-100 text-red-700',
    'Cancelled': 'bg-gray-100 text-gray-500',
  };
  return <Badge className={`${colors[status] || 'bg-gray-100 text-gray-700'} text-[12px] font-medium`}>{status}</Badge>;
}

function TripsTab() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const { data: trips, isLoading } = useQuery({
    queryKey: ['/api/transport-manager/trips', { date: today }],
    queryFn: async () => {
      const res = await fetch(`/api/transport-manager/trips?date=${today}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch trips');
      return res.json();
    },
    refetchInterval: 15000,
  });

  const dispatchMutation = useMutation({
    mutationFn: async (tripId: number) => {
      const res = await apiRequest("POST", `/api/transport/dispatch/${tripId}`);
      return await res.json();
    },
    onSuccess: (data: any, tripId: number) => {
      if (data.blocked) {
        toast({
          title: "Dispatch Blocked",
          description: data.reasons?.join('\n') || "Validation failed",
          variant: "destructive",
          duration: 10000,
        });
      } else if (data.success) {
        toast({ title: "Trip Dispatched", description: "Trip is now in progress" });
        queryClient.invalidateQueries({ queryKey: ['/api/transport-manager/trips'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transport-manager/dashboard'] });
      }
    },
    onError: (error: any) => {
      toast({ title: "Dispatch Failed", description: error.message, variant: "destructive" });
    },
  });

  const closeTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      const res = await apiRequest("POST", `/api/transport/close-trip/${tripId}`);
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.blocked) {
        toast({
          title: "Cannot Close Trip",
          description: data.reason || "Some stops are still pending",
          variant: "destructive",
        });
      } else if (data.success) {
        const s = data.summary;
        toast({
          title: "Trip Completed",
          description: `Delivered: ${s?.delivered_count || 0}, Failed: ${s?.failed_count || 0}, Rate: ${s?.completion_rate || 0}%, Score: ${data.performanceScore || '-'}`,
          duration: 8000,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/transport-manager/trips'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transport-manager/dashboard'] });
      }
    },
    onError: (error: any) => {
      toast({ title: "Close Trip Failed", description: error.message, variant: "destructive" });
    },
  });

  const allTrips = (trips as any[]) || [];
  const filteredTrips = statusFilter === 'all'
    ? allTrips
    : allTrips.filter((t: any) => {
        if (statusFilter === 'in_progress') return t.status === 'In Progress' || t.status === 'In-Progress';
        if (statusFilter === 'planned') return t.status === 'Planned';
        if (statusFilter === 'completed') return t.status === 'Completed';
        return true;
      });

  const statusCounts = {
    planned: allTrips.filter((t: any) => t.status === 'Planned').length,
    in_progress: allTrips.filter((t: any) => t.status === 'In Progress' || t.status === 'In-Progress').length,
    completed: allTrips.filter((t: any) => t.status === 'Completed').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Today's Trips</h2>
        <div className="flex gap-2 overflow-x-auto">
          {[
            { key: 'all', label: `All (${allTrips.length})` },
            { key: 'planned', label: `Planned (${statusCounts.planned})` },
            { key: 'in_progress', label: `In Progress (${statusCounts.in_progress})` },
            { key: 'completed', label: `Completed (${statusCounts.completed})` },
          ].map(chip => (
            <button key={chip.key} onClick={() => setStatusFilter(chip.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${statusFilter === chip.key ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3 mt-3">
        {filteredTrips.length > 0 ? filteredTrips.map((trip: any) => {
          const isExpanded = expandedTrip === trip.id;
          const canDispatch = trip.status === 'Planned';
          const canClose = (trip.status === 'In Progress' || trip.status === 'In-Progress') && trip.totalStops > 0 && trip.deliveredStops + (trip.failedStops || 0) >= trip.totalStops;

          return (
            <div key={trip.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="p-3 cursor-pointer" onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm truncate">{trip.routeName || trip.tripId || `Trip #${trip.id}`}</p>
                      <TripStatusBadge status={trip.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{trip.vehicleNo || 'N/A'}</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{trip.driverName || 'Unassigned'}</span>
                    </div>
                    {trip.segment && <Badge className="bg-gray-100 text-gray-600 text-[12px] mt-1">{trip.segment}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {trip.totalStops > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{trip.deliveredStops}/{trip.totalStops}</p>
                        <p className="text-[12px] text-gray-400">stops</p>
                      </div>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {trip.totalStops > 0 && (
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${trip.progress || 0}%` }} />
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white rounded-lg p-2">
                      <p className="font-bold text-gray-900">{trip.totalStops || 0}</p>
                      <p className="text-gray-400">Total</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="font-bold text-green-600">{trip.deliveredStops || 0}</p>
                      <p className="text-gray-400">Delivered</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="font-bold text-orange-500">{(trip.totalStops || 0) - (trip.deliveredStops || 0)}</p>
                      <p className="text-gray-400">Remaining</p>
                    </div>
                  </div>

                  {trip.bagsLoaded && (
                    <div className="flex justify-between text-xs text-gray-600 bg-white rounded-lg p-2">
                      <span>Bags Loaded</span>
                      <span className="font-semibold">{trip.bagsLoaded}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {canDispatch && (
                      <Button size="sm" className="flex-1 h-9 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs"
                        disabled={dispatchMutation.isPending}
                        onClick={(e) => { e.stopPropagation(); dispatchMutation.mutate(trip.id); }}>
                        {dispatchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Navigation className="h-3 w-3 mr-1" />}
                        Dispatch
                      </Button>
                    )}
                    {canClose && (
                      <Button size="sm" className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs"
                        disabled={closeTripMutation.isPending}
                        onClick={(e) => { e.stopPropagation(); closeTripMutation.mutate(trip.id); }}>
                        {closeTripMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                        Close Trip
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-9 rounded-lg text-xs"
                      onClick={(e) => { e.stopPropagation(); window.open(`/admin/transport/trips/${trip.id}`, '_blank'); }}>
                      <Eye className="h-3 w-3 mr-1" /> Details
                    </Button>
                  </div>

                  {dispatchMutation.data && (dispatchMutation.data as any).blocked && dispatchMutation.variables === trip.id && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-800 mb-1">Dispatch Blocked:</p>
                      <ul className="space-y-1">
                        {((dispatchMutation.data as any).reasons || []).map((reason: string, i: number) => (
                          <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                            <XCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">No trips found</p>
            <p className="text-gray-300 text-xs mt-1">Check back later or change the filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackingTab({ manager }: { manager: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/transport-manager/live-tracking'],
    refetchInterval: 10000,
  });

  const trackingData = (data as any)?.tracking || [];
  const depot = (data as any)?.depot;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const activeVehicles = trackingData.filter((t: any) => t.lastLocation);
  const totalStops = trackingData.reduce((s: number, t: any) => s + (t.summary?.totalStops || 0), 0);
  const deliveredStops = trackingData.reduce((s: number, t: any) => s + (t.summary?.deliveredStops || 0), 0);

  return (
    <div className="pb-24">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b">
        <h2 className="text-lg font-bold text-gray-900">Live Tracking</h2>
        <p className="text-xs text-gray-400">{trackingData.length} active trip{trackingData.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="px-4 mt-3 mb-4 grid grid-cols-3 gap-2">
        <div className="bg-teal-50 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-teal-700">{trackingData.length}</p>
          <p className="text-[12px] text-gray-500">Active Trips</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-blue-700">{activeVehicles.length}</p>
          <p className="text-[12px] text-gray-500">GPS Online</p>
        </div>
        <div className="bg-green-50 rounded-xl p-2.5 text-center">
          <p className="text-lg font-bold text-green-700">{deliveredStops}/{totalStops}</p>
          <p className="text-[12px] text-gray-500">Deliveries</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {trackingData.length > 0 ? trackingData.map((item: any) => {
          const trip = item.trip;
          const loc = item.lastLocation;
          const summary = item.summary;
          const isOnTime = !trip.status?.includes('Delayed');

          return (
            <div key={trip.id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${loc ? (isOnTime ? 'bg-green-500' : 'bg-yellow-500') : 'bg-red-500'} animate-pulse`} />
                    <p className="font-bold text-sm truncate">{trip.routeName || trip.tripId}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span>{trip.vehicleNo}</span>
                    <span>{trip.driverName}</span>
                  </div>
                </div>
                <TripStatusBadge status={trip.status} />
              </div>

              {summary && (
                <div className="mb-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${summary.progress || 0}%` }} />
                  </div>
                  <div className="flex justify-between text-[12px] text-gray-400 mt-0.5">
                    <span>{summary.deliveredStops}/{summary.totalStops} stops</span>
                    <span>{summary.progress}%</span>
                  </div>
                </div>
              )}

              {loc && (
                <div className="bg-gray-50 rounded-lg p-2 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> GPS</span>
                    <span className="text-gray-700 font-mono text-[12px]">{Number(loc.lat).toFixed(4)}, {Number(loc.lng).toFixed(4)}</span>
                  </div>
                  {loc.speed !== null && loc.speed !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Speed</span>
                      <span className="text-gray-700">{Number(loc.speed).toFixed(0)} km/h</span>
                    </div>
                  )}
                  {loc.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Last Update</span>
                      <span className="text-gray-700">{new Date(loc.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              )}

              {!loc && (
                <div className="bg-red-50 rounded-lg p-2 text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" />
                  No GPS signal — vehicle location unavailable
                </div>
              )}

              {trip.segment && <Badge className="bg-gray-100 text-gray-600 text-[12px] mt-2">{trip.segment}</Badge>}
            </div>
          );
        }) : (
          <div className="text-center py-12">
            <MapIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">No active trips to track</p>
            <p className="text-gray-300 text-xs mt-1">Dispatched trips will appear here with live GPS updates</p>
          </div>
        )}
      </div>
    </div>
  );
}

function JobsTab({ manager, onTripCreated }: { manager: any; onTripCreated: () => void }) {
  const { toast } = useToast();
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [routeName, setRouteName] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('Fresh Milk');
  const [selectedShift, setSelectedShift] = useState('AM');

  const { data: jobs, isLoading } = useQuery<any[]>({
    queryKey: ['/api/transport-manager/delivery-jobs', 'ready_for_trip'],
    queryFn: async () => {
      const res = await fetch('/api/transport-manager/delivery-jobs?status=ready_for_trip', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: vehiclesList = [] } = useQuery<any[]>({
    queryKey: ['/api/transport-manager/vehicles-list'],
    queryFn: async () => {
      const res = await fetch('/api/transport-manager/vehicles-list', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      return res.json();
    },
    enabled: showCreateForm,
  });

  const createTripMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/transport-manager/create-trip", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Trip Created", description: `Assigned ${data.assignedJobs} jobs to trip ${data.trip?.tripId}` });
        queryClient.invalidateQueries({ queryKey: ['/api/transport-manager/delivery-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transport-manager/trips'] });
        queryClient.invalidateQueries({ queryKey: ['/api/transport-manager/dashboard'] });
        setSelectedJobs(new Set());
        setShowCreateForm(false);
        setSelectedVehicleId('');
        setRouteName('');
        onTripCreated();
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to create trip", description: error.message, variant: "destructive" });
    },
  });

  const jobsList = (jobs as any[]) || [];

  function toggleJob(jobId: number) {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  function toggleAll() {
    if (selectedJobs.size === jobsList.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobsList.map(j => j.id)));
    }
  }

  function handleCreateTrip() {
    if (selectedJobs.size === 0) {
      toast({ title: "Select jobs first", variant: "destructive" });
      return;
    }
    if (!selectedVehicleId) {
      toast({ title: "Select a vehicle", variant: "destructive" });
      return;
    }
    createTripMutation.mutate({
      jobIds: Array.from(selectedJobs),
      vehicleId: selectedVehicleId.toString(),
      routeName: routeName || undefined,
      segment: selectedSegment,
      shift: selectedShift,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const selectedVehicle = vehiclesList.find((v: any) => v.id === selectedVehicleId);

  return (
    <div className="pb-24">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Delivery Jobs</h2>
          <p className="text-xs text-gray-400">{jobsList.length} ready for trip assignment</p>
        </div>
        {selectedJobs.size > 0 && !showCreateForm && (
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs gap-1"
            onClick={() => setShowCreateForm(true)}>
            <Plus className="h-3 w-3" /> Create Trip ({selectedJobs.size})
          </Button>
        )}
      </div>

      {showCreateForm && (
        <div className="px-4 mt-3 mb-4 border border-teal-200 bg-teal-50 rounded-xl mx-4 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-teal-900">Create New Trip</h3>
            <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-teal-700">{selectedJobs.size} job{selectedJobs.size > 1 ? 's' : ''} selected</p>

          <div>
            <Label className="text-xs text-gray-700 mb-1 block">Vehicle</Label>
            <select className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white"
              value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)}>
              <option value="">Select vehicle...</option>
              {vehiclesList.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} — {v.vehicleType || 'Standard'} {v.driverName ? `(${v.driverName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedVehicle && selectedVehicle.driverName && (
            <div className="bg-white rounded-lg p-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Driver</span><span className="font-medium">{selectedVehicle.driverName}</span></div>
              {selectedVehicle.driverPhone && <div className="flex justify-between mt-1"><span className="text-gray-500">Phone</span><span className="font-medium">{selectedVehicle.driverPhone}</span></div>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-700 mb-1 block">Segment</Label>
              <select className="w-full h-9 px-2 text-xs border border-gray-200 rounded-lg bg-white"
                value={selectedSegment} onChange={e => setSelectedSegment(e.target.value)}>
                <option value="Fresh Milk">Fresh Milk</option>
                <option value="Products">Products</option>
                <option value="Ice Cream">Ice Cream</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-700 mb-1 block">Shift</Label>
              <select className="w-full h-9 px-2 text-xs border border-gray-200 rounded-lg bg-white"
                value={selectedShift} onChange={e => setSelectedShift(e.target.value)}>
                <option value="AM">Morning (AM)</option>
                <option value="PM">Evening (PM)</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-700 mb-1 block">Route Name (optional)</Label>
            <Input value={routeName} onChange={e => setRouteName(e.target.value)}
              placeholder="Auto-generated if empty" className="h-9 text-sm rounded-lg" />
          </div>

          <Button className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold"
            onClick={handleCreateTrip} disabled={createTripMutation.isPending || selectedVehicleId === ''}>
            {createTripMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : <><Truck className="h-4 w-4 mr-2" /> Generate Trip Sheet</>}
          </Button>
        </div>
      )}

      <div className="px-4 mt-3">
        {jobsList.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <button onClick={toggleAll} className="flex items-center gap-2 text-xs text-teal-700 font-medium">
              {selectedJobs.size === jobsList.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {selectedJobs.size === jobsList.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedJobs.size > 0 && <span className="text-xs text-gray-500">{selectedJobs.size} selected</span>}
          </div>
        )}

        <div className="space-y-2">
          {jobsList.length > 0 ? jobsList.map((job: any) => {
            const isSelected = selectedJobs.has(job.id);
            return (
              <div key={job.id} onClick={() => toggleJob(job.id)}
                className={`border rounded-xl p-3 cursor-pointer transition-colors ${isSelected ? 'border-teal-400 bg-teal-50' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isSelected ? <CheckSquare className="h-5 w-5 text-teal-600" /> : <Square className="h-5 w-5 text-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm text-gray-900 truncate">{job.customerName || 'Unknown'}</p>
                      <span className="text-sm font-semibold text-gray-900 ml-2 whitespace-nowrap">
                        {Number(job.totalAmount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-500 font-mono">{job.jobId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {job.segment && <Badge className="bg-gray-100 text-gray-600 text-[12px]">{job.segment}</Badge>}
                      <Badge className="bg-green-100 text-green-700 text-[12px]">Ready</Badge>
                    </div>
                    {job.deliveryAddress && (
                      <div className="flex items-start gap-1 mt-1.5 text-[13px] text-gray-500">
                        <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{job.deliveryAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-300 mb-3" />
              <p className="text-gray-400 text-sm">No pending jobs</p>
              <p className="text-gray-300 text-xs mt-1">All delivery jobs have been assigned to trips</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExceptionsTab({ manager }: { manager: any }) {
  const { toast } = useToast();
  const unionId = manager?.unionId || 'federation';

  const { data: exceptions, isLoading, refetch } = useQuery({
    queryKey: ['/api/delivery-jobs/exceptions', unionId],
    queryFn: async () => {
      const res = await fetch(`/api/delivery-jobs/exceptions/${unionId}`, { credentials: 'include' });
      if (!res.ok) {
        return [];
      }
      return res.json();
    },
    refetchInterval: 30000,
  });

  const revalidateMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/delivery-jobs/${jobId}/revalidate`);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Re-validation triggered" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Re-validation failed", description: error.message, variant: "destructive" });
    },
  });

  const exceptionsList = (exceptions as any[]) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Exceptions</h2>
          <p className="text-xs text-gray-400">{exceptionsList.length} validation failure{exceptionsList.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>

      <div className="px-4 space-y-3 mt-3">
        {exceptionsList.length > 0 ? exceptionsList.map((job: any) => {
          const reasons: string[] = [];
          const lat = job.deliveryLat ? String(job.deliveryLat).trim() : '';
          const lng = job.deliveryLng ? String(job.deliveryLng).trim() : '';
          if (!lat || !lng || lat === '0' || lng === '0') reasons.push('Missing delivery coordinates (lat/lng)');
          if (!job.deliveryAddress) reasons.push('Missing delivery address');
          if (!job.gstInvoiceGenerated) reasons.push('Missing invoice');
          if (job.ewayBillRequired && !job.ewayBillGenerated) reasons.push('Missing E-way Bill');
          if (reasons.length === 0) reasons.push('Validation failed — check job details');

          return (
            <div key={job.id} className="border border-red-100 rounded-xl p-3 bg-red-50/30">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{job.jobId || `Job #${job.id}`}</p>
                  <p className="text-xs text-gray-500">{job.customerName || 'Unknown customer'}</p>
                  {job.segment && <Badge className="bg-gray-100 text-gray-600 text-[12px] mt-0.5">{job.segment}</Badge>}
                </div>
                <Badge className="bg-red-100 text-red-700 text-[12px]">Failed</Badge>
              </div>

              <div className="space-y-1 mb-3">
                {reasons.map((reason, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                    <XCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    {reason}
                  </div>
                ))}
              </div>

              <Button size="sm" variant="outline" className="w-full h-8 rounded-lg text-xs border-red-200 text-red-700 hover:bg-red-100"
                disabled={revalidateMutation.isPending}
                onClick={() => revalidateMutation.mutate(job.id)}>
                {revalidateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Re-validate
              </Button>
            </div>
          );
        }) : (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 mx-auto text-green-300 mb-3" />
            <p className="text-gray-400 text-sm">No exceptions</p>
            <p className="text-gray-300 text-xs mt-1">All delivery jobs passed validation</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BulkDeliveryTab({ manager }: { manager: any }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [optimized, setOptimized] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [bagWeightKg, setBagWeightKg] = useState(13);
  const [packSize, setPackSize] = useState(50);
  const [capacityMode, setCapacityMode] = useState<'bags' | 'tons'>('tons');
  const [vehicleCapacityBags, setVehicleCapacityBags] = useState(154);
  const [vehicleCapacityTons, setVehicleCapacityTons] = useState(2.0);
  const [kmPerLiter, setKmPerLiter] = useState(8);
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState(105);

  const merchantId = manager?.merchantId || manager?.unionId || '';

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
      const body: any = { packSize, bagWeightKg, kmPerLiter, fuelPricePerLiter };
      if (capacityMode === 'tons') {
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
    const res = await fetch(urlMap[type], { credentials: 'include' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const ext = (type === 'tripSheet' || type === 'vehicleTripSheets') ? 'pdf' : 'xlsx';
    const a = document.createElement('a'); a.href = url; a.download = `${type}_${uploadResult.batchId}.${ext}`; a.click(); URL.revokeObjectURL(url);
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

  const totalTrips = optimized?.tripSummaries?.length || 0;
  const totalFuelL = optimized?.tripSummaries?.reduce((s: number, t: any) => s + (t.fuelLiters || 0), 0) || 0;
  const totalFuelCost = optimized?.tripSummaries?.reduce((s: number, t: any) => s + (t.fuelCost || 0), 0) || 0;
  const totalKg = optimized?.routeSummary?.reduce((s: number, r: any) => s + (r.totalKg || 0), 0) || 0;
  const totalVehicles = optimized?.routeSummary?.reduce((s: number, r: any) => s + (r.vehiclesNeeded || 1), 0) || 0;

  return (
    <div className="pb-24">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b">
        <h2 className="text-lg font-bold text-gray-900">Bulk Delivery</h2>
        <p className="text-xs text-gray-400">Mode B — Manual Bills Excel Upload</p>
      </div>

      <div className="px-4 mt-3 space-y-3">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1 text-xs rounded-lg flex-1">
            <Download className="h-3 w-3" /> Download Template
          </Button>
        </div>

        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50 cursor-pointer active:bg-gray-100 transition"
          onClick={() => fileInputRef.current?.click()}>
          {loading ? (
            <Loader2 className="h-8 w-8 mx-auto mb-2 text-teal-600 animate-spin" />
          ) : (
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          )}
          <p className="font-medium text-sm text-gray-700">Tap to upload Excel file</p>
          <p className="text-xs text-gray-400 mt-1">Accepts .xlsx files</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
        </div>

        {uploadResult && (
          <div className="bg-white border border-gray-100 rounded-xl p-3">
            <p className="text-sm font-bold text-gray-900 mb-2">Upload Summary</p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{uploadResult.totalRows}</p>
                <p className="text-[11px] text-gray-500">Total</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-green-700">{uploadResult.validRows}</p>
                <p className="text-[11px] text-green-600">Valid</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-blue-700">{uploadResult.matchedRows}</p>
                <p className="text-[11px] text-blue-600">Matched</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-orange-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-orange-700">{uploadResult.unmatchedRows}</p>
                <p className="text-[11px] text-orange-600">Unmatched</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-red-700">{uploadResult.errorRows}</p>
                <p className="text-[11px] text-red-600">Errors</p>
              </div>
            </div>
            <div className="flex gap-2">
              {uploadResult.errorRows > 0 && <Button variant="outline" size="sm" onClick={() => downloadFile('errors')} className="gap-1 text-red-600 text-xs rounded-lg"><Download className="h-3 w-3" /> Errors</Button>}
              {uploadResult.unmatchedRows > 0 && <Button variant="outline" size="sm" onClick={() => downloadFile('unmatched')} className="gap-1 text-orange-600 text-xs rounded-lg"><Download className="h-3 w-3" /> Unmatched</Button>}
            </div>
          </div>
        )}

        {uploadResult && !optimized && (
          <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="h-4 w-4 text-gray-500" />
              <p className="text-sm font-bold text-gray-900">Trip Configuration</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">Bag Weight (kg)</label>
                <Input type="number" min={1} value={bagWeightKg} onChange={e => setBagWeightKg(Number(e.target.value) || 13)} className="h-9 text-sm rounded-lg" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">Pack Size</label>
                <Input type="number" min={1} value={packSize} onChange={e => setPackSize(Number(e.target.value) || 50)} className="h-9 text-sm rounded-lg" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-0.5">Capacity Mode</label>
              <div className="flex gap-2">
                <button onClick={() => setCapacityMode('tons')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition ${capacityMode === 'tons' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  Tons
                </button>
                <button onClick={() => setCapacityMode('bags')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition ${capacityMode === 'bags' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  Bags
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {capacityMode === 'bags' ? (
                <div>
                  <label className="text-[11px] text-gray-500 block mb-0.5">Capacity (bags)</label>
                  <Input type="number" min={1} value={vehicleCapacityBags} onChange={e => setVehicleCapacityBags(Number(e.target.value) || 154)} className="h-9 text-sm rounded-lg" />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] text-gray-500 block mb-0.5">Capacity (tons)</label>
                  <Input type="number" min={0.1} step={0.1} value={vehicleCapacityTons} onChange={e => setVehicleCapacityTons(Number(e.target.value) || 2)} className="h-9 text-sm rounded-lg" />
                </div>
              )}
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">km/L</label>
                <Input type="number" min={1} value={kmPerLiter} onChange={e => setKmPerLiter(Number(e.target.value) || 8)} className="h-9 text-sm rounded-lg" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">Fuel ₹/L</label>
                <Input type="number" min={1} value={fuelPricePerLiter} onChange={e => setFuelPricePerLiter(Number(e.target.value) || 105)} className="h-9 text-sm rounded-lg" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-500">
              Effective: <span className="font-semibold text-gray-700">{capacityMode === 'tons' ? `${vehicleCapacityTons}t (${Math.floor((vehicleCapacityTons * 1000) / bagWeightKg)} bags)` : `${vehicleCapacityBags} bags (${((vehicleCapacityBags * bagWeightKg) / 1000).toFixed(1)}t)`}</span>
            </div>
            <Button onClick={runOptimize} disabled={loading || (uploadResult?.errorRows || 0) > 0}
              className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold gap-2">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Optimizing...</> : <><Route className="h-4 w-4" /> Optimize + Split by Capacity</>}
            </Button>
          </div>
        )}

        {optimized && (
          <div className="space-y-3">
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="text-sm font-bold text-gray-900 mb-2">Summary</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-blue-700">{optimized.routeSummary?.length || 0}</p>
                  <p className="text-[11px] text-blue-500">Routes</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-purple-700">{totalVehicles}</p>
                  <p className="text-[11px] text-purple-500">Vehicles</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-orange-700">{(totalKg / 1000).toFixed(1)}t</p>
                  <p className="text-[11px] text-orange-500">Weight</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-amber-700">{totalFuelL.toFixed(1)} L</p>
                  <p className="text-[11px] text-amber-600">Fuel</p>
                </div>
              </div>
              <div className="mt-2 bg-red-50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-red-700">₹{totalFuelCost.toFixed(0)}</p>
                <p className="text-[11px] text-red-500">Fuel Cost</p>
              </div>
            </div>

            <div className="space-y-2">
              {optimized.routeSummary?.map((r: any) => (
                <div key={r.routeNo} className="bg-white border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Route {r.routeNo}</span>
                    <Badge className="bg-gray-100 text-gray-600 text-[11px]">{r.vehiclesNeeded || 1} vehicle{(r.vehiclesNeeded || 1) > 1 ? 's' : ''}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs text-gray-500">
                    <span>{r.stopsCount} stops</span>
                    <span>{r.totalBags} bags</span>
                    <span>{r.totalDistanceKm} km</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs mt-0.5">
                    <span>{((r.totalKg || 0) / 1000).toFixed(1)}t</span>
                    <span>{(r.totalFuelLiters || 0).toFixed(1)} L</span>
                    <span>₹{(r.totalFuelCost || 0).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalTrips > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-3">
                <p className="text-sm font-bold text-gray-900 mb-2">Trip Breakdown ({totalTrips})</p>
                <div className="overflow-x-auto -mx-3 px-3">
                  <table className="w-full text-xs min-w-[480px]">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-1.5 pr-2">Route</th>
                        <th className="pb-1.5 pr-2">Trip</th>
                        <th className="pb-1.5 pr-2">Stops</th>
                        <th className="pb-1.5 pr-2">Bags</th>
                        <th className="pb-1.5 pr-2">Weight</th>
                        <th className="pb-1.5 pr-2">KM</th>
                        <th className="pb-1.5 pr-2">Fuel L</th>
                        <th className="pb-1.5">Fuel ₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optimized.tripSummaries?.map((t: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1.5 pr-2 font-medium">{t.routeNo}</td>
                          <td className="py-1.5 pr-2"><Badge className="bg-gray-100 text-gray-600 text-[10px]">Trip {t.tripNo}</Badge></td>
                          <td className="py-1.5 pr-2">{t.stopsCount}</td>
                          <td className="py-1.5 pr-2">{t.bags}</td>
                          <td className="py-1.5 pr-2">{(t.kg / 1000).toFixed(2)}t</td>
                          <td className="py-1.5 pr-2">{t.distanceKm}</td>
                          <td className="py-1.5 pr-2">{t.fuelLiters}</td>
                          <td className="py-1.5">₹{t.fuelCost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="text-sm font-bold text-gray-900 mb-2">Optimized Stops ({optimized.optimizedStops?.length || 0})</p>
              <div className="overflow-x-auto -mx-3 px-3">
                <table className="w-full text-xs min-w-[400px]">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-1.5 pr-2">Seq</th>
                      <th className="pb-1.5 pr-2">Rte</th>
                      <th className="pb-1.5 pr-2">Location</th>
                      <th className="pb-1.5 pr-2">Packets</th>
                      <th className="pb-1.5 pr-2">BAGS</th>
                      <th className="pb-1.5 pr-2">Division</th>
                      <th className="pb-1.5">KM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optimized.optimizedStops?.slice(0, 50).map((s: any) => (
                      <tr key={s.stopSeq} className="border-b border-gray-50">
                        <td className="py-1.5 pr-2 font-bold">{s.stopSeq}</td>
                        <td className="py-1.5 pr-2">{s.routeNo}</td>
                        <td className="py-1.5 pr-2">{s.locationName}</td>
                        <td className="py-1.5 pr-2">{s.totalQtyNos}</td>
                        <td className="py-1.5 pr-2">{s.bags}</td>
                        <td className="py-1.5 pr-2">{s.division || '-'}</td>
                        <td className="py-1.5">{s.cumulativeKm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(optimized.optimizedStops?.length || 0) > 50 && (
                <p className="text-[11px] text-center text-gray-400 mt-2">Showing first 50 of {optimized.optimizedStops.length} stops</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadFile('optimizedStops')} className="gap-1 text-xs rounded-lg h-9">
                <FileSpreadsheet className="h-3 w-3" /> Stops XLSX
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile('routeSummary')} className="gap-1 text-xs rounded-lg h-9">
                <FileSpreadsheet className="h-3 w-3" /> Summary
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile('tripsExcel')} className="gap-1 text-xs rounded-lg h-9">
                <FileSpreadsheet className="h-3 w-3" /> Trips XLSX
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile('tripSheet')} className="gap-1 text-xs rounded-lg h-9">
                <FileText className="h-3 w-3" /> Trip Sheet PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile('vehicleTripSheets')} className="gap-1 text-xs rounded-lg h-9 text-purple-600 border-purple-200">
                <Truck className="h-3 w-3" /> Vehicle Trips PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadFile('editable')} className="gap-1 text-xs rounded-lg h-9">
                <FileSpreadsheet className="h-3 w-3" /> Editable
              </Button>
            </div>

            <Button onClick={createTrip} disabled={loading}
              className="w-full h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold gap-2">
              <Truck className="h-4 w-4" /> Dispatch
            </Button>

            <Button variant="outline" size="sm" onClick={() => setOptimized(null)}
              className="w-full gap-1 text-xs rounded-lg">
              <Settings className="h-3 w-3" /> Re-configure & Re-optimize
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function BottomNav({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  const tabs = [
    { id: 'dashboard' as TabId, label: 'Home', icon: Home },
    { id: 'jobs' as TabId, label: 'Jobs', icon: ClipboardList },
    { id: 'trips' as TabId, label: 'Trips', icon: Package },
    { id: 'tracking' as TabId, label: 'Track', icon: MapIcon },
    { id: 'bulk' as TabId, label: 'Bulk', icon: FileSpreadsheet },
    { id: 'exceptions' as TabId, label: 'Alerts', icon: AlertCircle },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="flex">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 pt-2.5 ${activeTab === tab.id ? 'text-teal-600' : 'text-gray-400'}`}>
            <tab.icon className="h-5 w-5" />
            <span className="text-[12px] mt-0.5 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TransportApp() {
  const [manager, setManager] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('transportManager');
    if (stored) {
      try {
        setManager(JSON.parse(stored));
      } catch {}
    }

    fetch('/api/transport-manager/me', { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        setManager(data);
        localStorage.setItem('transportManager', JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem('transportManager');
        setManager(null);
      })
      .finally(() => setIsCheckingAuth(false));
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/transport-manager/logout");
    } catch {}
    queryClient.clear();
    localStorage.removeItem('transportManager');
    setManager(null);
    toast({ title: "Logged out" });
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!manager) {
    return <TransportLoginForm onLogin={(m) => setManager(m)} />;
  }

  return (
    <div className="min-h-screen bg-white">
      {activeTab === 'dashboard' && (
        <div className="absolute top-3 right-3 z-20">
          <button onClick={handleLogout} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
            <LogOut className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      )}

      {activeTab === 'dashboard' && <DashboardTab manager={manager} />}
      {activeTab === 'jobs' && <JobsTab manager={manager} onTripCreated={() => setActiveTab('trips')} />}
      {activeTab === 'trips' && <TripsTab />}
      {activeTab === 'tracking' && <TrackingTab manager={manager} />}
      {activeTab === 'bulk' && <BulkDeliveryTab manager={manager} />}
      {activeTab === 'exceptions' && <ExceptionsTab manager={manager} />}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
