import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Truck, ArrowLeft, Search, MapPin, Route, Clock, IndianRupee, Navigation, RefreshCw, Package, Plus, Pencil, Trash2, Eye, EyeOff, UserPlus, Loader2, Mail, Phone, Download, Upload, CheckCircle, XCircle, BarChart3, AlertTriangle, ShieldCheck, FileWarning, MapPinOff, Receipt, CreditCard } from 'lucide-react';
import { Link } from 'wouter';
import AdminLayout from './layout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { buildXlsxBuffer, parseXlsxToRows } from '@/lib/excel-utils';
import type { Order, Restaurant } from '@shared/schema';

interface DeliveryDriver {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  unionId: string | null;
  assignedSegment: string | null;
  createdAt: string | null;
}

const DISTRICT_UNIONS = [
  { value: "chennai", label: "Chennai Union" },
  { value: "coimbatore", label: "Coimbatore Union" },
  { value: "cuddalore", label: "Cuddalore Union" },
  { value: "dharmapuri", label: "Dharmapuri Union" },
  { value: "dindigul", label: "Dindigul Union" },
  { value: "erode", label: "Erode Union" },
  { value: "kancheepuram", label: "Kancheepuram Union" },
  { value: "kanniyakumari", label: "Kanniyakumari Union" },
  { value: "karur", label: "Karur Union" },
  { value: "krishnagiri", label: "Krishnagiri Union" },
  { value: "madurai", label: "Madurai Union" },
  { value: "nagapattinam", label: "Nagapattinam Union" },
  { value: "namakkal", label: "Namakkal Union" },
  { value: "nilgiris", label: "Nilgiris Union" },
  { value: "perambalur", label: "Perambalur Union" },
  { value: "pudukottai", label: "Pudukottai Union" },
  { value: "ramanathapuram", label: "Ramanathapuram Union" },
  { value: "salem", label: "Salem Union" },
  { value: "sivagangai", label: "Sivagangai Union" },
  { value: "thanjavur", label: "Thanjavur Union" },
  { value: "theni", label: "Theni Union" },
  { value: "thiruvallur", label: "Thiruvallur Union" },
  { value: "tirunelveli", label: "Tirunelveli Union" },
  { value: "tiruppur", label: "Tiruppur Union" },
  { value: "tiruchirappalli", label: "Tiruchirappalli Union" },
  { value: "tiruvannamalai", label: "Tiruvannamalai Union" },
  { value: "vellore", label: "Vellore Union" },
  { value: "villupuram", label: "Villupuram Union" },
  { value: "virudhunagar", label: "Virudhunagar Union" },
  { value: "ariyalur", label: "Ariyalur Union" },
  { value: "tenkasi", label: "Tenkasi Union" },
];

const SEGMENTS = [
  { value: "Fresh Milk", label: "Fresh Milk" },
  { value: "Products", label: "Products" },
  { value: "Ice Cream", label: "Ice Cream" },
];

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  unionId: '',
  assignedSegment: '',
};

export default function DeliveryManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('drivers');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<DeliveryDriver | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [driverImporting, setDriverImporting] = useState(false);
  const driverFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Route optimization state
  const [routeSegmentFilter, setRouteSegmentFilter] = useState<string>('all');
  const [selectedDriverForRoute, setSelectedDriverForRoute] = useState<string>('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [routeCreating, setRouteCreating] = useState(false);

  const { data: drivers = [], isLoading: driversLoading } = useQuery<DeliveryDriver[]>({
    queryKey: ['/api/admin/delivery-drivers'],
  });

  const { data: restaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
  });

  const { data: assignableOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<any[]>({
    queryKey: ['/api/admin/assignable-orders'],
    queryFn: async () => {
      const res = await fetch('/api/admin/assignable-orders', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: allRoutes = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/all-delivery-routes'],
    queryFn: async () => {
      const allRoutesArr: any[] = [];
      for (const driver of drivers) {
        try {
          const res = await fetch(`/api/delivery-routes/driver/${driver.id}`, { credentials: 'include' });
          if (res.ok) {
            const routes = await res.json();
            allRoutesArr.push(...routes);
          }
        } catch {}
      }
      return allRoutesArr;
    },
    enabled: drivers.length > 0,
  });

  const { data: deliveryJobStats } = useQuery<any>({
    queryKey: ['/api/delivery-jobs/stats/federation'],
    refetchInterval: 60000,
  });

  const { data: exceptionJobs = [] } = useQuery<any[]>({
    queryKey: ['/api/delivery-jobs/exceptions/federation'],
    enabled: activeTab === 'exceptions',
  });

  const revalidateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/delivery-jobs/${id}/revalidate`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Re-validated" });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-jobs/exceptions/federation'] });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-jobs/stats/federation'] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createDriverMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/admin/delivery-drivers', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Driver Created", description: "New delivery driver added successfully." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-drivers'] });
      setShowAddDialog(false);
      setFormData(emptyForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create driver", variant: "destructive" });
    }
  });

  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/admin/delivery-drivers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Driver Updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-drivers'] });
      setShowEditDialog(false);
      setEditingDriver(null);
      setFormData(emptyForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update driver", variant: "destructive" });
    }
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/delivery-drivers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Driver Deleted" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-drivers'] });
      setShowDeleteDialog(false);
      setDeletingDriver(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete driver", variant: "destructive" });
    }
  });

  const filteredDrivers = drivers.filter((driver: DeliveryDriver) =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (driver.email && driver.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (driver.phone && driver.phone.includes(searchQuery))
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string }> = {
      available: { className: 'bg-green-500 text-white' },
      planned: { className: 'bg-blue-500 text-white' },
      in_progress: { className: 'bg-yellow-500 text-white' },
      completed: { className: 'bg-green-600 text-white' },
      pending: { className: 'bg-orange-500 text-white' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{status.replace(/_/g, ' ')}</Badge>;
  };

  const getUnionLabel = (unionId: string | null) => {
    if (!unionId) return 'Not assigned';
    const union = DISTRICT_UNIONS.find(u => u.value === unionId);
    return union ? union.label : unionId;
  };

  const openEditDialog = (driver: DeliveryDriver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone || '',
      password: '',
      unionId: driver.unionId || '',
      assignedSegment: driver.assignedSegment || '',
    });
    setShowEditDialog(true);
  };

  const handleSubmitAdd = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: "Missing Fields", description: "Name, email, and password are required", variant: "destructive" });
      return;
    }
    createDriverMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    if (!editingDriver) return;
    const updateData: any = { name: formData.name, email: formData.email, phone: formData.phone, unionId: formData.unionId, assignedSegment: formData.assignedSegment };
    if (formData.password) updateData.password = formData.password;
    updateDriverMutation.mutate({ id: editingDriver.id, data: updateData });
  };

  // Route optimization logic
  const filteredAssignableOrders = assignableOrders.filter(o =>
    routeSegmentFilter === 'all' || (o.segment || '').toLowerCase() === routeSegmentFilter.toLowerCase()
  );

  const segmentDrivers = drivers.filter(d =>
    routeSegmentFilter === 'all' || !d.assignedSegment || d.assignedSegment.toLowerCase() === routeSegmentFilter.toLowerCase()
  );

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectAllOrders = () => {
    if (selectedOrders.size === filteredAssignableOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredAssignableOrders.map(o => String(o.id))));
    }
  };

  const handleCreateRoute = async () => {
    if (!selectedDriverForRoute) {
      toast({ title: "Select a Driver", description: "Please select a driver to assign orders to", variant: "destructive" });
      return;
    }
    if (selectedOrders.size === 0) {
      toast({ title: "Select Orders", description: "Please select orders to assign", variant: "destructive" });
      return;
    }

    const driver = drivers.find(d => d.id === selectedDriverForRoute);
    if (!driver) return;

    const ordersToAssign = filteredAssignableOrders.filter(o => selectedOrders.has(String(o.id)));
    const segment = routeSegmentFilter !== 'all' ? routeSegmentFilter : (driver.assignedSegment || 'Products');

    setRouteCreating(true);
    try {
      const res = await apiRequest('POST', '/api/admin/delivery-routes', {
        driverId: driver.id,
        driverName: driver.name,
        districtUnionId: driver.unionId || 'default',
        segment,
        startLocation: 'Union Warehouse',
        startLatitude: '11.6643',
        startLongitude: '78.1460',
        orders: ordersToAssign.map(o => ({
          orderId: String(o.id),
          customerName: o.customerName || 'Customer',
          address: o.deliveryAddress || '',
          routeName: o.routeName || '',
          agentPoint: o.agentPoint || '',
          latitude: o.latitude || '0',
          longitude: o.longitude || '0',
          total: o.total || '0',
          deliveryAddress: o.deliveryAddress || '',
        })),
      });

      toast({ title: "Route Created!", description: `${selectedOrders.size} orders assigned to ${driver.name} with optimized route` });
      setSelectedOrders(new Set());
      setSelectedDriverForRoute('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assignable-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-delivery-routes'] });
      refetchOrders();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create route", variant: "destructive" });
    }
    setRouteCreating(false);
  };

  const handleExportDrivers = async () => {
    const rows = drivers.map(d => ({
      Name: d.name, Email: d.email, Phone: d.phone || '', Union: getUnionLabel(d.unionId), Segment: d.assignedSegment || 'All',
      Joined: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
    }));
    const buffer = await buildXlsxBuffer([{ name: 'Drivers', rows }]);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'delivery-drivers.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDrivers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDriverImporting(true);
    try {
      const rows = await parseXlsxToRows(file);
      const res = await apiRequest('POST', '/api/admin/delivery-drivers/bulk-import', { drivers: rows });
      const data = await res.json();
      toast({ title: "Import Complete", description: `${data.created || 0} drivers imported, ${data.errors || 0} errors` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-drivers'] });
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message || "Failed to import drivers", variant: "destructive" });
    }
    setDriverImporting(false);
    if (driverFileRef.current) driverFileRef.current.value = '';
  };

  const driverFormContent = (isEdit: boolean) => (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Full Name *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Driver name" />
        </div>
        <div>
          <Label>Email / Login ID *</Label>
          <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="driver@email.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Phone</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone number" />
        </div>
        <div>
          <Label>{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
          <div className="relative">
            <Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={isEdit ? 'Leave blank to keep' : 'Set password'} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>District Union</Label>
          <Select value={formData.unionId} onValueChange={(v) => setFormData({ ...formData, unionId: v })}>
            <SelectTrigger><SelectValue placeholder="Select union" /></SelectTrigger>
            <SelectContent>
              {DISTRICT_UNIONS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Assigned Segment</Label>
          <Select value={formData.assignedSegment} onValueChange={(v) => setFormData({ ...formData, assignedSegment: v })}>
            <SelectTrigger><SelectValue placeholder="All segments" /></SelectTrigger>
            <SelectContent>
              {SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  // Group orders by route name for the routes view
  const routeGroupedOrders: Record<string, any[]> = {};
  filteredAssignableOrders.forEach(o => {
    const routeName = o.routeName || 'Unassigned Route';
    if (!routeGroupedOrders[routeName]) routeGroupedOrders[routeName] = [];
    routeGroupedOrders[routeName].push(o);
  });

  // Segment counts
  const segmentCounts = {
    all: assignableOrders.length,
    'Fresh Milk': assignableOrders.filter(o => (o.segment || '').toLowerCase() === 'fresh milk').length,
    'Products': assignableOrders.filter(o => (o.segment || '').toLowerCase() === 'products').length,
    'Ice Cream': assignableOrders.filter(o => (o.segment || '').toLowerCase() === 'ice cream').length,
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Delivery Management</h1>
              <p className="text-muted-foreground">Manage drivers, optimize routes, and assign deliveries</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input type="file" ref={driverFileRef} onChange={handleImportDrivers} accept=".xlsx,.xls" className="hidden" />
            <Button variant="outline" onClick={handleExportDrivers}><Download className="h-4 w-4 mr-2" />Export</Button>
            <Button variant="outline" onClick={() => driverFileRef.current?.click()} disabled={driverImporting}>
              {driverImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Import
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="routes">Route Optimization</TabsTrigger>
            <TabsTrigger value="pending">Pending Orders ({assignableOrders.length})</TabsTrigger>
            <TabsTrigger value="active-routes">Active Routes ({allRoutes.length})</TabsTrigger>
            <TabsTrigger value="exceptions" className="relative">
              Exceptions
              {(deliveryJobStats?.validationFailed || 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{deliveryJobStats.validationFailed}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* DRIVERS TAB */}
          <TabsContent value="drivers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Truck className="h-5 w-5" />
                      <span>Delivery Drivers ({drivers.length})</span>
                    </CardTitle>
                    <CardDescription>Manage delivery team members</CardDescription>
                  </div>
                  <Button onClick={() => { setFormData(emptyForm); setShowPassword(false); setShowAddDialog(true); }} className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />Add Driver
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input placeholder="Search by name, email, or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                {driversLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Driver Name</TableHead>
                          <TableHead>Email / Login ID</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>District Union</TableHead>
                          <TableHead>Segment</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDrivers.map((driver) => (
                          <TableRow key={driver.id}>
                            <TableCell className="font-medium">{driver.name}</TableCell>
                            <TableCell><div className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3 text-muted-foreground" />{driver.email}</div></TableCell>
                            <TableCell>{driver.phone ? <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3 text-muted-foreground" />{driver.phone}</div> : <span className="text-muted-foreground text-sm">-</span>}</TableCell>
                            <TableCell><div className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3 text-muted-foreground" />{getUnionLabel(driver.unionId)}</div></TableCell>
                            <TableCell>{driver.assignedSegment ? <Badge variant="outline">{driver.assignedSegment}</Badge> : <span className="text-muted-foreground text-sm">All</span>}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(driver)}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setDeletingDriver(driver); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {!driversLoading && filteredDrivers.length === 0 && (
                  <div className="text-center py-8">
                    <UserPlus className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <p className="text-gray-500 mt-2">No delivery drivers yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ROUTE OPTIMIZATION TAB */}
          <TabsContent value="routes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Route className="h-5 w-5" />
                  <span>Segment-wise Route Optimization</span>
                </CardTitle>
                <CardDescription>Select segment, choose driver, pick orders, and create optimized delivery route</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Step 1: Segment Filter */}
                <div className="mb-5">
                  <Label className="text-sm font-semibold mb-2 block">Step 1: Select Segment</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'all', label: 'All Segments', count: segmentCounts.all },
                      { value: 'Fresh Milk', label: 'Fresh Milk', count: segmentCounts['Fresh Milk'] },
                      { value: 'Products', label: 'Products', count: segmentCounts['Products'] },
                      { value: 'Ice Cream', label: 'Ice Cream', count: segmentCounts['Ice Cream'] },
                    ].map(seg => (
                      <button key={seg.value} onClick={() => { setRouteSegmentFilter(seg.value); setSelectedOrders(new Set()); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          routeSegmentFilter === seg.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                        {seg.label} ({seg.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Driver Selection */}
                <div className="mb-5">
                  <Label className="text-sm font-semibold mb-2 block">Step 2: Assign Driver</Label>
                  <Select value={selectedDriverForRoute} onValueChange={setSelectedDriverForRoute}>
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Select a driver for this segment" />
                    </SelectTrigger>
                    <SelectContent>
                      {segmentDrivers.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} {d.assignedSegment ? `(${d.assignedSegment})` : '(All Segments)'} - {getUnionLabel(d.unionId)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {segmentDrivers.length === 0 && (
                    <p className="text-sm text-orange-600 mt-1">No drivers available for this segment. Add drivers in the Drivers tab first.</p>
                  )}
                </div>

                {/* Step 3: Order Selection */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Step 3: Select Orders ({selectedOrders.size} of {filteredAssignableOrders.length})</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllOrders}>
                        {selectedOrders.size === filteredAssignableOrders.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => refetchOrders()}>
                        <RefreshCw className="h-3 w-3 mr-1" />Refresh
                      </Button>
                    </div>
                  </div>

                  {ordersLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : filteredAssignableOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No assignable orders for {routeSegmentFilter === 'all' ? 'any segment' : routeSegmentFilter}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {Object.entries(routeGroupedOrders).map(([routeName, orders]) => (
                        <div key={routeName} className="border rounded-lg overflow-hidden">
                          <div className="bg-blue-50 px-3 py-2 flex items-center gap-2 border-b">
                            <Route className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-sm text-blue-800">{routeName}</span>
                            <Badge variant="outline" className="ml-auto text-xs">{orders.length} orders</Badge>
                          </div>
                          {orders.map((order: any) => (
                            <div key={order.id} className={`flex items-start gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-gray-50 cursor-pointer ${selectedOrders.has(String(order.id)) ? 'bg-blue-50' : ''}`}
                              onClick={() => toggleOrderSelection(String(order.id))}>
                              <Checkbox
                                checked={selectedOrders.has(String(order.id))}
                                onCheckedChange={() => toggleOrderSelection(String(order.id))}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs">#{String(order.id).slice(-6)}</span>
                                  <Badge variant="outline" className="text-[10px]">{order.segment || 'Products'}</Badge>
                                  <Badge className="bg-orange-100 text-orange-700 text-[10px]">{order.status?.replace(/_/g, ' ')}</Badge>
                                </div>
                                <p className="text-sm font-medium mt-0.5">{order.customerName || 'Customer'}</p>
                                {order.agentPoint && <p className="text-xs text-blue-600 flex items-center gap-1"><MapPin className="h-3 w-3" />{order.agentPoint}</p>}
                                {order.deliveryAddress && <p className="text-xs text-gray-500 truncate">{typeof order.deliveryAddress === 'string' ? order.deliveryAddress.substring(0, 60) : ''}</p>}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-semibold text-sm">₹{parseFloat(order.total || 0).toFixed(0)}</p>
                                <p className="text-[10px] text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 4: Create Route */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{selectedOrders.size} orders selected</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedDriverForRoute ? `Assigned to: ${drivers.find(d => d.id === selectedDriverForRoute)?.name}` : 'No driver selected'}
                      </p>
                    </div>
                    <Button onClick={handleCreateRoute} disabled={routeCreating || selectedOrders.size === 0 || !selectedDriverForRoute}
                      className="bg-green-600 hover:bg-green-700 text-white">
                      {routeCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Navigation className="h-4 w-4 mr-2" />}
                      Optimize & Assign Route
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PENDING ORDERS TAB */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="h-5 w-5" />
                      <span>Pending Deliveries ({assignableOrders.length})</span>
                    </CardTitle>
                    <CardDescription>Orders waiting to be assigned to drivers</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchOrders()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
                </div>
              </CardHeader>
              <CardContent>
                {assignableOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending orders for delivery</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Delivery Point</TableHead>
                          <TableHead>Segment</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignableOrders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">#{String(order.id).slice(-6)}</TableCell>
                            <TableCell>{order.customerName || 'Customer'}</TableCell>
                            <TableCell>{order.routeName ? <Badge variant="outline" className="text-xs">{order.routeName}</Badge> : <span className="text-muted-foreground text-xs">-</span>}</TableCell>
                            <TableCell>{order.agentPoint || <span className="text-muted-foreground text-xs">-</span>}</TableCell>
                            <TableCell><Badge variant="outline">{order.segment || 'Products'}</Badge></TableCell>
                            <TableCell>₹{parseFloat(order.total || 0).toFixed(0)}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell><div className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3 w-3" />{new Date(order.createdAt || Date.now()).toLocaleTimeString()}</div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACTIVE ROUTES TAB */}
          <TabsContent value="active-routes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Active Delivery Routes ({allRoutes.length})</span>
                </CardTitle>
                <CardDescription>Currently assigned routes with delivery progress</CardDescription>
              </CardHeader>
              <CardContent>
                {allRoutes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active routes. Create routes from the Route Optimization tab.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allRoutes.map((route: any) => {
                      const seq = Array.isArray(route.deliverySequence) ? route.deliverySequence : [];
                      const completed = seq.filter((s: any) => s.status === 'completed' || s.status === 'delivered').length;
                      return (
                        <div key={route.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold flex items-center gap-2">
                                <Route className="h-4 w-4 text-blue-600" />
                                {route.segment} Route - {route.driverName}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Created: {route.createdAt ? new Date(route.createdAt).toLocaleDateString() : 'N/A'} | 
                                Distance: {route.totalDistanceKm || '0'} km
                              </p>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(route.status)}
                              <p className="text-xs text-muted-foreground mt-1">{completed}/{seq.length} delivered</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 mb-3 p-2 bg-muted rounded-lg">
                            <div className="text-center">
                              <p className="text-xl font-bold text-primary">{seq.length}</p>
                              <p className="text-xs text-muted-foreground">Total Stops</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-primary">{route.totalDistanceKm || '0'} km</p>
                              <p className="text-xs text-muted-foreground">Distance</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-green-600">{completed}</p>
                              <p className="text-xs text-muted-foreground">Completed</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Delivery Sequence</h4>
                            {seq.map((stop: any, idx: number) => (
                              <div key={stop.orderId || idx} className={`flex items-center gap-3 p-2 rounded-lg border ${stop.status === 'completed' || stop.status === 'delivered' ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white ${stop.status === 'completed' || stop.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                  {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{stop.customerName || 'Customer'}</p>
                                  {stop.routeName && <p className="text-xs text-blue-600">{stop.routeName}</p>}
                                  {stop.agentPoint && <p className="text-xs text-gray-500">{stop.agentPoint}</p>}
                                  {stop.address && <p className="text-xs text-muted-foreground truncate">{stop.address}</p>}
                                </div>
                                <div className="text-right text-sm flex-shrink-0">
                                  <p className="flex items-center gap-1"><Navigation className="h-3 w-3" />{stop.distanceFromPrevious || '0'} km</p>
                                  {stop.total && <p className="text-green-600">₹{parseFloat(stop.total).toFixed(0)}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXCEPTIONS TAB (T009) */}
          <TabsContent value="exceptions" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
                <div className="text-xl font-bold text-red-600">{deliveryJobStats?.validationFailed || 0}</div>
                <div className="text-xs text-muted-foreground">Total Exceptions</div>
              </Card>
              <Card className="p-3 text-center">
                <MapPinOff className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                <div className="text-xl font-bold text-orange-600">{deliveryJobStats?.missingAddress || 0}</div>
                <div className="text-xs text-muted-foreground">Missing Address</div>
              </Card>
              <Card className="p-3 text-center">
                <Receipt className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                <div className="text-xl font-bold text-purple-600">{deliveryJobStats?.missingEwayBill || 0}</div>
                <div className="text-xs text-muted-foreground">Missing E-way Bill</div>
              </Card>
              <Card className="p-3 text-center">
                <CreditCard className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <div className="text-xl font-bold text-blue-600">{deliveryJobStats?.missingPayment || 0}</div>
                <div className="text-xs text-muted-foreground">Missing Payment</div>
              </Card>
            </div>

            {exceptionJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No delivery exceptions</p>
                  <p className="text-sm">All delivery jobs have passed validation checks.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {exceptionJobs.map((job: any) => (
                  <Card key={job.id} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {job.sourceType === "order" ? `Order #${job.sourceId}` : `Bulk Invoice #${job.sourceId}`}
                            </Badge>
                            <Badge className={job.dispatchType === "REGULAR" ? "bg-blue-100 text-blue-800" : job.dispatchType === "CORPORATE" ? "bg-purple-100 text-purple-800" : job.dispatchType === "INTER_UNION" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
                              {job.dispatchType}
                            </Badge>
                            {job.segment && <Badge variant="secondary" className="text-xs">{job.segment}</Badge>}
                          </div>
                          <p className="font-medium">{job.customerName || "Unknown Customer"}</p>
                          <p className="text-sm text-muted-foreground">{job.deliveryAddress || "No address"}</p>
                          {job.totalAmount && <p className="text-sm">Amount: ₹{Number(job.totalAmount).toLocaleString()}</p>}
                        </div>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            {((job.validationErrors as string[]) || []).map((err: string, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-sm text-red-600">
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{err}</span>
                              </div>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revalidateMutation.mutate(job.id)}
                            disabled={revalidateMutation.isPending}
                          >
                            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${revalidateMutation.isPending ? "animate-spin" : ""}`} />
                            Re-validate
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Driver Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Add New Delivery Driver</DialogTitle>
            <DialogDescription>Create login credentials for a new delivery driver.</DialogDescription>
          </DialogHeader>
          {driverFormContent(false)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitAdd} disabled={createDriverMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {createDriverMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />Edit Driver: {editingDriver?.name}</DialogTitle>
            <DialogDescription>Update driver details. Leave password blank to keep the current one.</DialogDescription>
          </DialogHeader>
          {driverFormContent(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitEdit} disabled={updateDriverMutation.isPending}>
              {updateDriverMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Driver Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Driver: {deletingDriver?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this driver. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingDriver && deleteDriverMutation.mutate(deletingDriver.id)} disabled={deleteDriverMutation.isPending}>
              {deleteDriverMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Driver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
