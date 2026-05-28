import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Truck, Package, MapPin, Phone, Clock, CheckCircle2,
  LogOut, Navigation, PlayCircle, StopCircle,
  ChevronDown, ChevronUp, ExternalLink, Weight, Boxes,
  Route, CircleDot, Loader2
} from 'lucide-react';
import deliveryLogo from '@assets/aavin-logo.png';

export default function DriverTripDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [expandedStop, setExpandedStop] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const trackingRef = useRef<number | null>(null);

  const { data: driverData, isLoading: driverLoading } = useQuery({
    queryKey: ['/api/driver/me'],
  });

  const { data: tripData, isLoading: tripLoading, refetch: refetchTrip } = useQuery({
    queryKey: ['/api/driver/my-trip'],
    refetchInterval: 30000,
  });

  const startTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      const res = await apiRequest('POST', '/api/driver/start-trip', { tripId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Trip Started', description: 'GPS tracking is now active. Drive safely!' });
      queryClient.invalidateQueries({ queryKey: ['/api/driver/my-trip'] });
      startGpsTracking();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to start trip', variant: 'destructive' });
    },
  });

  const deliverStopMutation = useMutation({
    mutationFn: async (pointId: number) => {
      const res = await apiRequest('PATCH', `/api/driver/stop/${pointId}/deliver`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: 'Delivered!', description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/driver/my-trip'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to mark delivery', variant: 'destructive' });
    },
  });

  const completeTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      const res = await apiRequest('POST', '/api/driver/complete-trip', { tripId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Trip Completed', description: 'Great job! Trip has been marked as complete.' });
      stopGpsTracking();
      queryClient.invalidateQueries({ queryKey: ['/api/driver/my-trip'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to complete trip', variant: 'destructive' });
    },
  });

  const sendLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await apiRequest('POST', '/api/driver/location', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0,
          });
        } catch (e) {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const startGpsTracking = useCallback(() => {
    if (trackingRef.current) return;
    setIsTracking(true);
    sendLocation();
    trackingRef.current = window.setInterval(() => {
      sendLocation();
    }, 30000);
  }, [sendLocation]);

  const stopGpsTracking = useCallback(() => {
    if (trackingRef.current) {
      clearInterval(trackingRef.current);
      trackingRef.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    if (tripData?.trip?.status === 'In Progress' && !isTracking) {
      startGpsTracking();
    }
    return () => stopGpsTracking();
  }, [tripData?.trip?.status]);

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
    } catch {}
    queryClient.clear();
    setLocation('/driver/login');
  };

  if (driverLoading || tripLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading your trip...</p>
        </div>
      </div>
    );
  }

  const driver = driverData as any;
  const trip = tripData?.trip;
  const stops = tripData?.stops || [];
  const summary = tripData?.summary;

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <img src={deliveryLogo} alt="Aavin" className="w-8 h-8 rounded" />
            <div>
              <h1 className="font-semibold text-sm">Aavin Delivery</h1>
              <p className="text-xs text-blue-100">{driver?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-blue-700">
            <LogOut className="w-4 h-4" />
          </Button>
        </header>
        <div className="flex flex-col items-center justify-center p-8 mt-20">
          <Truck className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-600 mb-2">No Active Trip</h2>
          <p className="text-sm text-gray-500 text-center">You don't have any trip assigned right now. Please check with your supervisor.</p>
        </div>
      </div>
    );
  }

  const isPlanned = trip.status === 'Planned';
  const isInProgress = trip.status === 'In Progress';
  const allDelivered = summary && summary.deliveredStops === summary.totalStops && summary.totalStops > 0;
  const nextStop = stops.find((s: any) => s.status !== 'delivered');

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img src={deliveryLogo} alt="Aavin" className="w-8 h-8 rounded" />
          <div>
            <h1 className="font-semibold text-sm">Aavin Delivery</h1>
            <p className="text-xs text-blue-100">{driver?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTracking && (
            <Badge className="bg-green-500 text-white text-[10px] animate-pulse">
              GPS ON
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-blue-700">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-blue-800 text-base">{trip.routeName}</h2>
              <Badge className={isInProgress ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {trip.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
              <div className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {trip.vehicleNo}</div>
              <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {trip.shift} Shift</div>
              <div className="flex items-center gap-1"><Route className="w-3.5 h-3.5" /> {trip.date}</div>
              <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {trip.hubName}</div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <MapPin className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <div className="text-xl font-bold text-gray-800">{summary?.totalStops}</div>
              <div className="text-[10px] text-gray-500 uppercase">Stops</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Boxes className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <div className="text-xl font-bold text-gray-800">{summary?.totalBags}</div>
              <div className="text-[10px] text-gray-500 uppercase">Bags</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Weight className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <div className="text-xl font-bold text-gray-800">{summary?.totalWeightKg}</div>
              <div className="text-[10px] text-gray-500 uppercase">KG</div>
            </CardContent>
          </Card>
        </div>

        {isInProgress && summary && (
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-gray-800">{summary.deliveredStops}/{summary.totalStops} stops</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${summary.progress}%` }} />
            </div>
          </div>
        )}

        {trip.googleMapsUrl && (
          <a
            href={trip.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-white border-2 border-blue-500 text-blue-600 rounded-lg py-3 font-semibold text-sm hover:bg-blue-50 transition-colors"
          >
            <Navigation className="w-5 h-5" />
            Open Route in Google Maps
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <div>
          <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Route className="w-4 h-4" />
            Delivery Stops ({summary?.deliveredStops || 0}/{summary?.totalStops || 0})
          </h3>

          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center gap-2 text-xs text-gray-500">
              <CircleDot className="w-3 h-3 text-green-500" /> Depot - Products Dairy Ambattur
            </div>

            {stops.map((stop: any, idx: number) => {
              const isDelivered = stop.status === 'delivered';
              const isNext = !isDelivered && nextStop?.id === stop.id && isInProgress;
              const isExpanded = expandedStop === stop.id;

              return (
                <div
                  key={stop.id}
                  className={`border-b last:border-b-0 ${isNext ? 'bg-orange-50 border-l-4 border-l-orange-500' : isDelivered ? 'bg-green-50' : ''}`}
                >
                  <div
                    className="px-3 py-2.5 flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isDelivered ? 'bg-green-500 text-white' : isNext ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {isDelivered ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{stop.locationName}</div>
                      <div className="text-xs text-gray-500">{stop.bagsToDeliver} bags · ETA {stop.plannedArrival}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isDelivered && <Badge className="bg-green-100 text-green-700 text-[10px]">Done</Badge>}
                      {isNext && <Badge className="bg-orange-100 text-orange-700 text-[10px]">Next</Badge>}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                        <div className="flex justify-between"><span className="text-gray-500">Bags:</span><span className="font-semibold">{stop.bagsToDeliver}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Weight:</span><span className="font-semibold">{stop.bagsToDeliver * 13} kg</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">ETA:</span><span className="font-semibold">{stop.plannedArrival}</span></div>
                        {stop.actualArrival && <div className="flex justify-between"><span className="text-gray-500">Arrived:</span><span className="font-semibold text-green-600">{stop.actualArrival}</span></div>}
                        {stop.notes && <div className="text-gray-500 mt-1">{stop.notes}</div>}
                      </div>
                      <div className="flex gap-2">
                        {stop.lat && stop.lng && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=driving`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <Button variant="outline" size="sm" className="w-full text-xs">
                              <Navigation className="w-3 h-3 mr-1" /> Navigate
                            </Button>
                          </a>
                        )}
                        {!isDelivered && isInProgress && (
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              deliverStopMutation.mutate(stop.id);
                            }}
                            disabled={deliverStopMutation.isPending}
                          >
                            {deliverStopMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                            Mark Delivered
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="px-3 py-2 bg-gray-50 border-t flex items-center gap-2 text-xs text-gray-500">
              <CircleDot className="w-3 h-3 text-red-500" /> Return to Depot
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {isPlanned && (
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
            onClick={() => startTripMutation.mutate(trip.id)}
            disabled={startTripMutation.isPending}
          >
            {startTripMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <PlayCircle className="w-5 h-5 mr-2" />}
            Start Trip
          </Button>
        )}
        {isInProgress && !allDelivered && (
          <div className="text-center text-sm text-gray-500">
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Trip in progress · {summary?.pendingStops} stops remaining
            </div>
          </div>
        )}
        {isInProgress && allDelivered && (
          <Button
            className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-semibold"
            onClick={() => completeTripMutation.mutate(trip.id)}
            disabled={completeTripMutation.isPending}
          >
            {completeTripMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <StopCircle className="w-5 h-5 mr-2" />}
            Complete Trip
          </Button>
        )}
      </div>
    </div>
  );
}
