import { useState, useEffect, useCallback } from "react";
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
  Home, Package, User, LogOut, Lock, Mail,
  Loader2, MapPin, Clock, CheckCircle, Truck,
  ChevronRight, AlertCircle, Navigation, Settings,
  Store, Phone, Route, Play, Square, ExternalLink
} from "lucide-react";

type TabId = 'home' | 'stops' | 'account';

interface DriverInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  unionId: string;
  assignedSegment: string;
}

interface TripStop {
  id: number;
  tripId: number;
  sequenceNo: number;
  customerName: string | null;
  address: string | null;
  lat: string | null;
  lng: string | null;
  bagsToDeliver: number | null;
  bagsDelivered: number | null;
  status: string;
  actualArrival: string | null;
  geoTagConfirmed: boolean | null;
}

interface TripData {
  id: number;
  routeName: string;
  status: string;
  vehicleNo: string;
  driverName: string;
  driverId: string | null;
  totalDropPoints: number;
  completedDropPoints: number;
  googleMapsUrl?: string;
  startTime?: string;
  createdAt: string;
}

interface TripResponse {
  trip: TripData | null;
  stops: TripStop[];
  manifest: any;
  summary: {
    totalStops: number;
    deliveredStops: number;
    pendingStops: number;
    totalBags: number;
    totalWeightKg: number;
    progress: number;
  };
  message?: string;
}

function DriverLoginForm({ onLogin }: { onLogin: (driver: DriverInfo) => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/driver/login", {
        driverCode: email.trim(),
        password,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setLoginError(null);
        localStorage.setItem('driverUser', JSON.stringify(data.driver));
        toast({ title: "Login successful", description: `Welcome, ${data.driver.name}` });
        onLogin(data.driver);
      } else {
        setLoginError(data.message || "Invalid credentials");
      }
    },
    onError: (error: any) => {
      setLoginError(error.message || "Invalid credentials");
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-28 h-28 mx-auto mb-4">
            <img src={deliveryLogo} alt="Aavin Driver" className="w-full h-full object-contain rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Aavin Driver</h1>
          <p className="text-sm text-gray-500 mt-1">Transport Driver Portal</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setLoginError(null); loginMutation.mutate(); }} className="space-y-4">
          {loginError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {loginError}
            </div>
          )}
          <div>
            <Label htmlFor="driver-email" className="text-sm font-medium text-gray-700">Email / Mobile Number</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="driver-email" type="text" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email or mobile number" className="h-12 pl-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                autoComplete="username" required />
            </div>
          </div>
          <div>
            <Label htmlFor="driver-password" className="text-sm font-medium text-gray-700">Password</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="driver-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password" className="h-12 pl-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
                autoComplete="current-password" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-base" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in...</> : "Sign In"}
          </Button>
        </form>
        <div className="mt-6 pt-5 border-t border-gray-200 space-y-2">
          <p className="text-center text-xs text-gray-400 mb-3">Other logins</p>
          <div className="flex gap-2">
            <Link href="/pwa/transport" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Truck className="h-4 w-4" />
              Transport Mgr
            </Link>
            <Link href="/pwa/staff" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Store className="h-4 w-4" />
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TripHomeTab({ tripData, driver, onSwitchTab, onStartTrip, isStarting }: {
  tripData: TripResponse | null;
  driver: DriverInfo;
  onSwitchTab: (tab: TabId) => void;
  onStartTrip: () => void;
  isStarting: boolean;
}) {
  const trip = tripData?.trip;
  const summary = tripData?.summary;

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={deliveryLogo} alt="Aavin" className="w-8 h-8 rounded-lg object-contain" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Hi, {driver.name}</h1>
            <p className="text-[13px] text-gray-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <Badge className="bg-blue-100 text-blue-700 text-[13px]">{driver.assignedSegment}</Badge>
      </div>

      {!trip ? (
        <div className="px-4 mt-8">
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-600">No Active Trip</h3>
            <p className="text-sm text-gray-400 mt-1">You have no trip assigned right now. Check back later or contact your transport manager.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 mb-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{trip.routeName}</h2>
                  <p className="text-xs text-gray-500">Trip #{trip.id} &middot; {trip.vehicleNo}</p>
                </div>
                <Badge className={`text-xs ${trip.status === 'In Progress' ? 'bg-green-100 text-green-700' : trip.status === 'Planned' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                  {trip.status}
                </Badge>
              </div>

              {summary && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                    <p className="text-xl font-bold text-blue-700">{summary.totalStops}</p>
                    <p className="text-[12px] text-blue-500">Total Stops</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2.5 text-center">
                    <p className="text-xl font-bold text-green-700">{summary.deliveredStops}</p>
                    <p className="text-[12px] text-green-500">Delivered</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-2.5 text-center">
                    <p className="text-xl font-bold text-orange-700">{summary.pendingStops}</p>
                    <p className="text-[12px] text-orange-500">Pending</p>
                  </div>
                </div>
              )}

              {summary && summary.totalStops > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{summary.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${summary.progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {trip.status === 'Planned' && (
                  <Button onClick={onStartTrip} disabled={isStarting} className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold">
                    {isStarting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    Start Trip
                  </Button>
                )}
                <Button onClick={() => onSwitchTab('stops')} variant="outline" className="flex-1 h-11 rounded-xl font-semibold border-blue-200 text-blue-700">
                  <MapPin className="h-4 w-4 mr-2" />
                  View Stops ({summary?.pendingStops || 0} pending)
                </Button>
              </div>

              {trip.googleMapsUrl && (
                <a href={trip.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-2 h-10 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  <ExternalLink className="h-4 w-4" />
                  Open in Google Maps
                </a>
              )}
            </div>
          </div>

          {summary && (
            <div className="px-4">
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <h3 className="text-sm font-bold text-gray-700">Load Summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Bags</span>
                  <span className="font-semibold">{summary.totalBags}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Weight</span>
                  <span className="font-semibold">{summary.totalWeightKg} kg</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StopsTab({ tripData, onDeliverStop, deliveringId }: {
  tripData: TripResponse | null;
  onDeliverStop: (pointId: number) => void;
  deliveringId: number | null;
}) {
  const stops = tripData?.stops || [];
  const trip = tripData?.trip;

  if (!trip) {
    return (
      <div className="pb-24 px-4 pt-6">
        <p className="text-center text-gray-400 py-8">No active trip</p>
      </div>
    );
  }

  const pendingStops = stops.filter(s => s.status !== 'delivered');
  const deliveredStops = stops.filter(s => s.status === 'delivered');

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-base font-bold text-gray-900">Delivery Stops</h2>
        <p className="text-xs text-gray-400">{trip.routeName} &middot; {deliveredStops.length}/{stops.length} completed</p>
      </div>

      {pendingStops.length > 0 && (
        <div className="px-4 mb-4">
          <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Pending ({pendingStops.length})
          </h3>
          <div className="space-y-2">
            {pendingStops.map((stop) => (
              <div key={stop.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-orange-700">{stop.sequenceNo}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{stop.customerName || `Stop ${stop.sequenceNo}`}</p>
                      {stop.address && <p className="text-xs text-gray-500 mt-0.5 truncate">{stop.address}</p>}
                      {(stop.bagsToDeliver ?? 0) > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          <Package className="h-3 w-3 inline mr-1" />
                          {stop.bagsToDeliver} bags
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 text-[12px]">Pending</Badge>
                </div>
                <div className="flex gap-2 mt-2">
                  {stop.lat && stop.lng && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 h-9 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                      <Navigation className="h-3 w-3" /> Navigate
                    </a>
                  )}
                  <Button
                    onClick={() => onDeliverStop(stop.id)}
                    disabled={deliveringId === stop.id}
                    className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold"
                  >
                    {deliveringId === stop.id ? (
                      <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Updating...</>
                    ) : (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Mark Delivered</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deliveredStops.length > 0 && (
        <div className="px-4">
          <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" />
            Delivered ({deliveredStops.length})
          </h3>
          <div className="space-y-2">
            {deliveredStops.map((stop) => (
              <div key={stop.id} className="bg-green-50 border border-green-100 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center">
                      <CheckCircle className="h-3.5 w-3.5 text-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{stop.customerName || `Stop ${stop.sequenceNo}`}</p>
                      {stop.actualArrival && <p className="text-xs text-green-600">Delivered at {stop.actualArrival}</p>}
                    </div>
                  </div>
                  <Badge className="bg-green-200 text-green-700 text-[12px]">Done</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountTab({ driver, onLogout }: { driver: DriverInfo; onLogout: () => void }) {
  return (
    <div className="pb-24 pt-4">
      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-3">
          <User className="h-10 w-10 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{driver.name}</h2>
        <Badge className="mt-2 bg-blue-100 text-blue-700 text-xs">Transport Driver</Badge>
      </div>

      <div className="px-4 space-y-2">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <span className="text-sm text-gray-600">Email</span>
          <span className="text-sm font-medium">{driver.email}</span>
        </div>
        {driver.phone && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-sm text-gray-600">Phone</span>
            <span className="text-sm font-medium">{driver.phone}</span>
          </div>
        )}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <span className="text-sm text-gray-600">Union</span>
          <span className="text-sm font-medium">{driver.unionId}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <span className="text-sm text-gray-600">Segment</span>
          <span className="text-sm font-medium">{driver.assignedSegment}</span>
        </div>
      </div>

      <div className="px-4 mt-6">
        <Button onClick={onLogout} variant="outline" className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export default function DriverApp() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [deliveringId, setDeliveringId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('driverUser');
    if (saved) {
      try {
        setDriver(JSON.parse(saved));
        setIsLoggedIn(true);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !driver?.id) return;
    const sendLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          fetch('/api/driver/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          }).catch(() => {});
        }, () => {}, { enableHighAccuracy: true, timeout: 10000 });
      }
    };
    sendLocation();
    const interval = setInterval(sendLocation, 60000);
    return () => clearInterval(interval);
  }, [isLoggedIn, driver?.id]);

  const { data: tripData = null, refetch: refetchTrip } = useQuery<TripResponse>({
    queryKey: ["/api/driver/my-trip"],
    queryFn: async () => {
      const res = await fetch('/api/driver/my-trip', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isLoggedIn,
    refetchInterval: 30000,
  });

  const startTripMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/driver/start-trip", {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Trip started!" });
      refetchTrip();
    },
    onError: (err: any) => {
      toast({ title: "Failed to start trip", description: err.message, variant: "destructive" });
    },
  });

  const handleDeliverStop = useCallback(async (pointId: number) => {
    setDeliveringId(pointId);
    try {
      const res = await fetch(`/api/driver/stop/${pointId}/deliver`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Stop delivered!", description: data.message });
        await refetchTrip();
      } else {
        toast({ title: "Failed", description: data.error || "Could not mark as delivered", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeliveringId(null);
    }
  }, [refetchTrip, toast]);

  const handleLogin = (d: DriverInfo) => {
    setDriver(d);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try { await fetch('/api/driver/logout', { method: 'POST', credentials: 'include' }); } catch {}
    localStorage.removeItem('driverUser');
    setIsLoggedIn(false);
    setDriver(null);
    setActiveTab('home');
    queryClient.clear();
    toast({ title: "Signed out" });
  };

  if (!isLoggedIn || !driver) {
    return <DriverLoginForm onLogin={handleLogin} />;
  }

  const tabs = [
    { id: 'home' as TabId, label: 'Home', icon: Home },
    { id: 'stops' as TabId, label: 'Stops', icon: MapPin },
    { id: 'account' as TabId, label: 'Account', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {activeTab === 'home' && (
        <TripHomeTab
          tripData={tripData}
          driver={driver}
          onSwitchTab={setActiveTab}
          onStartTrip={() => startTripMutation.mutate()}
          isStarting={startTripMutation.isPending}
        />
      )}
      {activeTab === 'stops' && (
        <StopsTab
          tripData={tripData}
          onDeliverStop={handleDeliverStop}
          deliveringId={deliveringId}
        />
      )}
      {activeTab === 'account' && <AccountTab driver={driver} onLogout={handleLogout} />}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 max-w-md mx-auto">
        <div className="flex justify-around py-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center gap-0.5 py-1 px-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-[12px] ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>
    </div>
  );
}
