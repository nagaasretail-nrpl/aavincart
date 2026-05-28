import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  MapPin, Truck, Navigation, Phone, Signal, SignalZero, Route, Clock, Package, RefreshCw,
} from 'lucide-react';
import AdminLayout from './layout';

interface DriverLocation {
  latitude: number;
  longitude: number;
  updatedAt: string;
  name: string;
  phone: string;
  segment: string;
  vehicleNumber: string;
  isOnline: boolean;
}

interface ActiveRoute {
  id: string;
  driverId: string;
  driverName: string;
  segment: string;
  routeDate: string;
  totalOrders: number;
  completedOrders: number;
  status: string;
  deliverySequence: any[];
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
}

interface DriverData {
  id: string;
  name: string;
  phone: string;
  segment: string;
  vehicleNumber: string;
  vehicleType: string;
  isOnline: boolean;
  location: DriverLocation | null;
  activeRoute: ActiveRoute | null;
}

export default function DriverTracking() {
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [onlineFilter, setOnlineFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);

  const { data: drivers = [], isLoading, refetch } = useQuery<DriverData[]>({
    queryKey: ['/api/admin/driver-locations'],
    refetchInterval: 30000,
  });

  const filtered = drivers.filter((d) => {
    if (segmentFilter !== 'all' && d.segment?.toLowerCase() !== segmentFilter.toLowerCase()) return false;
    if (onlineFilter === 'online' && !d.isOnline) return false;
    if (onlineFilter === 'offline' && d.isOnline) return false;
    if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase()) && !d.phone?.includes(searchQuery)) return false;
    return true;
  });

  const totalActive = drivers.length;
  const onlineNow = drivers.filter((d) => d.isOnline).length;
  const activeRoutes = drivers.filter((d) => d.activeRoute).length;
  const deliveriesToday = drivers.reduce((sum, d) => sum + (d.activeRoute?.completedOrders || 0), 0);

  const formatTimestamp = (ts: string) => {
    if (!ts) return '-';
    const date = new Date(ts);
    return date.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Navigation className="h-6 w-6" />
              Driver Location Tracking
            </h1>
            <p className="text-muted-foreground">Real-time driver locations and route status</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Active Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{totalActive}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Online Now</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Signal className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{onlineNow}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold">{activeRoutes}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Deliveries Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">{deliveriesToday}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Segment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Segments</SelectItem>
              <SelectItem value="Fresh Milk">Fresh Milk</SelectItem>
              <SelectItem value="Products">Products</SelectItem>
              <SelectItem value="Ice Cream">Ice Cream</SelectItem>
            </SelectContent>
          </Select>
          <Select value={onlineFilter} onValueChange={setOnlineFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Online Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mt-2">No drivers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Vehicle Number</TableHead>
                      <TableHead>Vehicle Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Location</TableHead>
                      <TableHead>Active Route</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((driver) => (
                      <>
                        <TableRow
                          key={driver.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedDriverId(expandedDriverId === driver.id ? null : driver.id)}
                        >
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {driver.phone || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{driver.segment || '-'}</Badge>
                          </TableCell>
                          <TableCell>{driver.vehicleNumber || '-'}</TableCell>
                          <TableCell>{driver.vehicleType || '-'}</TableCell>
                          <TableCell>
                            {driver.isOnline ? (
                              <Badge className="bg-green-500 text-white">
                                <Signal className="h-3 w-3 mr-1" />Online
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500 text-white">
                                <SignalZero className="h-3 w-3 mr-1" />Offline
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {driver.location ? (
                              <div className="text-xs space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  {Number(driver.location.latitude).toFixed(4)}, {Number(driver.location.longitude).toFixed(4)}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatTimestamp(driver.location.updatedAt)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No location</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {driver.activeRoute ? (
                              <div className="text-xs space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <Package className="h-3 w-3 text-muted-foreground" />
                                  {driver.activeRoute.completedOrders}/{driver.activeRoute.totalOrders} orders
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {driver.activeRoute.status}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No route</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedDriverId === driver.id && driver.activeRoute && (
                          <TableRow key={`${driver.id}-expanded`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="font-semibold">Route Details</span>
                                  <span className="text-muted-foreground">
                                    <Route className="h-4 w-4 inline mr-1" />
                                    {driver.activeRoute.totalDistanceKm?.toFixed(1)} km
                                  </span>
                                  <span className="text-muted-foreground">
                                    <Clock className="h-4 w-4 inline mr-1" />
                                    ~{driver.activeRoute.estimatedDurationMinutes} min
                                  </span>
                                  <span className="text-muted-foreground">
                                    Segment: {driver.activeRoute.segment}
                                  </span>
                                </div>
                                {Array.isArray(driver.activeRoute.deliverySequence) && driver.activeRoute.deliverySequence.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="w-12">#</TableHead>
                                          <TableHead>Customer</TableHead>
                                          <TableHead>Address</TableHead>
                                          <TableHead>Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {driver.activeRoute.deliverySequence.map((stop: any, idx: number) => (
                                          <TableRow key={idx}>
                                            <TableCell className="font-mono text-sm">{idx + 1}</TableCell>
                                            <TableCell>{stop.customerName || stop.customer || '-'}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{stop.address || stop.deliveryAddress || '-'}</TableCell>
                                            <TableCell>
                                              <Badge variant={stop.status === 'delivered' ? 'default' : 'outline'} className={stop.status === 'delivered' ? 'bg-green-500 text-white' : ''}>
                                                {stop.status || 'pending'}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No delivery sequence available</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}