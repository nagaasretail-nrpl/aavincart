import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Factory, 
  ArrowLeft, 
  Save, 
  Clock, 
  AlertTriangle, 
  Package,
  ThermometerSnowflake,
  Calendar,
  BarChart3,
  Plus,
  Play,
  CheckCircle,
  Truck,
  RefreshCw,
  Timer,
  Bell,
  Milk,
  Droplets
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface ProductionOrder {
  id: string;
  productName: string;
  productCategory: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'in_production' | 'quality_check' | 'ready' | 'dispatched';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  productionDate: string;
  expiryDate: string;
  storageTemp: string;
  unionName: string;
  estimatedTime: number;
  progress: number;
  productSegment?: 'Fresh Milk' | 'Products' | 'Ice Cream';
}

interface ExpiryAlert {
  id: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  daysUntilExpiry: number;
  status: 'warning' | 'critical' | 'expired';
}

export default function ProductionManagement() {
  const { toast } = useToast();
  const [productionEnabled, setProductionEnabled] = useState(true);
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [batchTracking, setBatchTracking] = useState(true);
  const [coldChainMonitoring, setColdChainMonitoring] = useState(true);
  const [alertThresholdDays, setAlertThresholdDays] = useState('3');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all'); // Fresh Milk | Products | all

  const { data: productionOrders = [] } = useQuery<ProductionOrder[]>({
    queryKey: ['/api/admin/production-orders'],
    queryFn: async () => [
      { 
        id: '1', 
        productName: 'Aavin Full Cream Milk',
        productCategory: 'Milk',
        batchNumber: 'MILK-2026-0129-001',
        quantity: 5000,
        unit: 'liters',
        status: 'in_production', 
        priority: 'high',
        productionDate: '2026-01-29',
        expiryDate: '2026-02-01',
        storageTemp: '4°C',
        unionName: 'Salem Dairy',
        estimatedTime: 45,
        progress: 65
      },
      { 
        id: '2', 
        productName: 'Aavin Curd',
        productCategory: 'Curd',
        batchNumber: 'CURD-2026-0129-001',
        quantity: 2000,
        unit: 'kg',
        status: 'pending', 
        priority: 'medium',
        productionDate: '2026-01-29',
        expiryDate: '2026-02-05',
        storageTemp: '4°C',
        unionName: 'Erode Dairy',
        estimatedTime: 120,
        progress: 0
      },
      { 
        id: '3', 
        productName: 'Aavin Butter',
        productCategory: 'Butter',
        batchNumber: 'BUTR-2026-0129-001',
        quantity: 500,
        unit: 'kg',
        status: 'quality_check', 
        priority: 'medium',
        productionDate: '2026-01-29',
        expiryDate: '2026-03-29',
        storageTemp: '2°C',
        unionName: 'Coimbatore Dairy',
        estimatedTime: 30,
        progress: 85
      },
      { 
        id: '4', 
        productName: 'Aavin Ghee',
        productCategory: 'Ghee',
        batchNumber: 'GHEE-2026-0128-002',
        quantity: 300,
        unit: 'kg',
        status: 'ready', 
        priority: 'low',
        productionDate: '2026-01-28',
        expiryDate: '2026-07-28',
        storageTemp: 'Room temp',
        unionName: 'Madurai Dairy',
        estimatedTime: 0,
        progress: 100
      },
      { 
        id: '5', 
        productName: 'Aavin Ice Cream - Vanilla',
        productCategory: 'Ice Cream',
        batchNumber: 'ICRM-2026-0129-001',
        quantity: 1000,
        unit: 'liters',
        status: 'in_production', 
        priority: 'urgent',
        productionDate: '2026-01-29',
        expiryDate: '2026-04-29',
        storageTemp: '-18°C',
        unionName: 'Chennai Dairy',
        estimatedTime: 90,
        progress: 40
      },
    ],
  });

  const { data: expiryAlertsList = [] } = useQuery<ExpiryAlert[]>({
    queryKey: ['/api/admin/expiry-alerts'],
    queryFn: async () => [
      {
        id: '1',
        productName: 'Aavin Toned Milk',
        batchNumber: 'MILK-2026-0126-003',
        expiryDate: '2026-01-30',
        quantity: 200,
        daysUntilExpiry: 1,
        status: 'critical'
      },
      {
        id: '2',
        productName: 'Aavin Buttermilk',
        batchNumber: 'BTML-2026-0127-001',
        expiryDate: '2026-01-31',
        quantity: 150,
        daysUntilExpiry: 2,
        status: 'warning'
      },
      {
        id: '3',
        productName: 'Aavin Paneer',
        batchNumber: 'PANR-2026-0125-001',
        expiryDate: '2026-01-29',
        quantity: 50,
        daysUntilExpiry: 0,
        status: 'expired'
      },
    ],
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Production settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update production settings",
        variant: "destructive",
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { orderId, status };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Production order status updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/production-orders'] });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate({ 
      productionEnabled, 
      expiryAlerts, 
      autoScheduling,
      batchTracking,
      coldChainMonitoring,
      alertThresholdDays
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; className: string }> = {
      pending: { variant: 'secondary', label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      in_production: { variant: 'default', label: 'In Production', className: 'bg-blue-100 text-blue-800' },
      quality_check: { variant: 'outline', label: 'Quality Check', className: 'bg-purple-100 text-purple-800' },
      ready: { variant: 'default', label: 'Ready', className: 'bg-green-100 text-green-800' },
      dispatched: { variant: 'outline', label: 'Dispatched', className: 'bg-gray-100 text-gray-800' },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
      low: { variant: 'outline', className: 'border-gray-300 text-gray-600' },
      medium: { variant: 'secondary', className: 'bg-blue-100 text-blue-800' },
      high: { variant: 'default', className: 'bg-orange-100 text-orange-800' },
      urgent: { variant: 'destructive', className: 'bg-red-100 text-red-800' },
    };
    
    const config = priorityConfig[priority] || priorityConfig.low;
    return <Badge variant={config.variant} className={config.className}>{priority}</Badge>;
  };

  const getExpiryStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'destructive' | 'secondary'; label: string }> = {
      warning: { variant: 'secondary', label: 'Expiring Soon' },
      critical: { variant: 'destructive', label: 'Critical' },
      expired: { variant: 'destructive', label: 'Expired' },
    };
    
    const config = statusConfig[status] || statusConfig.warning;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'milk':
        return <Milk className="h-4 w-4" />;
      case 'curd':
      case 'buttermilk':
        return <Droplets className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Filter by segment first, then by status
  const segmentFilteredOrders = segmentFilter === 'all'
    ? productionOrders
    : productionOrders.filter(order => order.productSegment === segmentFilter);
  
  const filteredOrders = statusFilter === 'all' 
    ? segmentFilteredOrders 
    : segmentFilteredOrders.filter(order => order.status === statusFilter);

  const pendingCount = productionOrders.filter(o => o.status === 'pending').length;
  const inProductionCount = productionOrders.filter(o => o.status === 'in_production').length;
  const readyCount = productionOrders.filter(o => o.status === 'ready').length;
  const criticalExpiryCount = expiryAlertsList.filter(a => a.status === 'critical' || a.status === 'expired').length;

  // Calculate total production required per product (aggregate quantities by product name)
  const totalProductionByProduct = productionOrders.reduce((acc, order) => {
    const key = order.productName;
    if (!acc[key]) {
      acc[key] = {
        productName: order.productName,
        productCategory: order.productCategory,
        totalQuantity: 0,
        unit: order.unit,
        orderCount: 0,
        pendingQty: 0,
        inProductionQty: 0,
        readyQty: 0
      };
    }
    acc[key].totalQuantity += order.quantity;
    acc[key].orderCount += 1;
    if (order.status === 'pending') acc[key].pendingQty += order.quantity;
    if (order.status === 'in_production') acc[key].inProductionQty += order.quantity;
    if (order.status === 'ready' || order.status === 'dispatched') acc[key].readyQty += order.quantity;
    return acc;
  }, {} as Record<string, { productName: string; productCategory: string; totalQuantity: number; unit: string; orderCount: number; pendingQty: number; inProductionQty: number; readyQty: number }>);

  const productionSummary = Object.values(totalProductionByProduct).sort((a, b) => b.totalQuantity - a.totalQuantity);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-production-management">
              Production Management
            </h1>
            <p className="text-gray-600">Manage dairy production, track batches, and monitor expiry dates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-800">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">In Production</p>
                  <p className="text-2xl font-bold text-blue-800">{inProductionCount}</p>
                </div>
                <Factory className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Ready</p>
                  <p className="text-2xl font-bold text-green-800">{readyCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className={`${criticalExpiryCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${criticalExpiryCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>Expiry Alerts</p>
                  <p className={`text-2xl font-bold ${criticalExpiryCount > 0 ? 'text-red-800' : 'text-gray-800'}`}>{criticalExpiryCount}</p>
                </div>
                <AlertTriangle className={`h-8 w-8 ${criticalExpiryCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="totals">Total Production</TabsTrigger>
            <TabsTrigger value="orders">Production Orders</TabsTrigger>
            <TabsTrigger value="expiry">Expiry Tracking</TabsTrigger>
            <TabsTrigger value="schedule">Production Schedule</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="totals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Total Production Required</span>
                </CardTitle>
                <CardDescription>Aggregated production quantities for each product based on all orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total Quantity</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">In Production</TableHead>
                      <TableHead className="text-right">Ready/Dispatched</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionSummary.map((item) => {
                      const completionPercent = item.totalQuantity > 0 
                        ? Math.round((item.readyQty / item.totalQuantity) * 100) 
                        : 0;
                      return (
                        <TableRow key={item.productName} data-testid={`total-production-${item.productName.replace(/\s+/g, '-').toLowerCase()}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(item.productCategory)}
                              <span className="font-medium">{item.productName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.productCategory}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {item.totalQuantity.toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{item.orderCount} order{item.orderCount !== 1 ? 's' : ''}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.pendingQty > 0 ? (
                              <span className="text-yellow-600 font-medium">{item.pendingQty.toLocaleString()} {item.unit}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.inProductionQty > 0 ? (
                              <span className="text-blue-600 font-medium">{item.inProductionQty.toLocaleString()} {item.unit}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.readyQty > 0 ? (
                              <span className="text-green-600 font-medium">{item.readyQty.toLocaleString()} {item.unit}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="w-24">
                              <Progress value={completionPercent} className="h-2" />
                              <span className="text-xs text-gray-500">{completionPercent}% complete</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
                
                {productionSummary.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No production orders found</p>
                  </div>
                )}
                
                <div className="mt-6 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Total Products</p>
                      <p className="text-2xl font-bold">{productionSummary.length}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600">Total Orders</p>
                      <p className="text-2xl font-bold text-blue-800">{productionOrders.length}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600">Total Volume</p>
                      <p className="text-2xl font-bold text-green-800">
                        {productionOrders.reduce((sum, o) => sum + o.quantity, 0).toLocaleString()} units
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Factory className="h-5 w-5" />
                      <span>Production Orders</span>
                    </CardTitle>
                    <CardDescription>Active production orders based on incoming orders</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Filter by segment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Segments</SelectItem>
                        <SelectItem value="Fresh Milk">🥛 Fresh Milk</SelectItem>
                        <SelectItem value="Products">📦 Products</SelectItem>
                        <SelectItem value="Ice Cream">🍦 Ice Cream</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_production">In Production</SelectItem>
                        <SelectItem value="quality_check">Quality Check</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="dispatched">Dispatched</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button data-testid="button-new-production">
                      <Plus className="h-4 w-4 mr-2" />
                      New Production
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch No.</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Union</TableHead>
                      <TableHead>Storage</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} data-testid={`production-order-${order.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(order.productCategory)}
                            <div>
                              <div className="font-medium">{order.productName}</div>
                              <div className="text-xs text-gray-500">{order.productCategory}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{order.batchNumber}</TableCell>
                        <TableCell>{order.quantity.toLocaleString()} {order.unit}</TableCell>
                        <TableCell>{order.unionName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ThermometerSnowflake className="h-4 w-4 text-blue-500" />
                            {order.storageTemp}
                          </div>
                        </TableCell>
                        <TableCell>{order.expiryDate}</TableCell>
                        <TableCell>
                          <div className="w-20">
                            <Progress value={order.progress} className="h-2" />
                            <span className="text-xs text-gray-500">{order.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {order.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'in_production' })}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            {order.status === 'in_production' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'quality_check' })}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {order.status === 'quality_check' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'ready' })}
                              >
                                <Package className="h-3 w-3" />
                              </Button>
                            )}
                            {order.status === 'ready' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'dispatched' })}
                              >
                                <Truck className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="expiry" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span>Expiry Alerts</span>
                </CardTitle>
                <CardDescription>Products approaching or past expiry date - take action to avoid waste</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Until Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiryAlertsList.map((alert) => (
                      <TableRow key={alert.id} className={alert.status === 'expired' ? 'bg-red-50' : ''} data-testid={`expiry-alert-${alert.id}`}>
                        <TableCell className="font-medium">{alert.productName}</TableCell>
                        <TableCell className="font-mono text-sm">{alert.batchNumber}</TableCell>
                        <TableCell>{alert.quantity} units</TableCell>
                        <TableCell>{alert.expiryDate}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${alert.daysUntilExpiry <= 1 ? 'text-red-600' : 'text-orange-600'}`}>
                            {alert.daysUntilExpiry === 0 ? 'Today' : `${alert.daysUntilExpiry} day${alert.daysUntilExpiry !== 1 ? 's' : ''}`}
                          </span>
                        </TableCell>
                        <TableCell>{getExpiryStatusBadge(alert.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">Discount Sale</Button>
                            <Button size="sm" variant="destructive">Write Off</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                
                {expiryAlertsList.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
                    <p className="text-gray-500">No expiry alerts at this time</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Production Schedule</span>
                </CardTitle>
                <CardDescription>Daily production schedule based on demand forecast</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Morning Shift (6 AM - 2 PM)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between">
                          <span>Full Cream Milk</span>
                          <span className="font-medium">10,000 L</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Toned Milk</span>
                          <span className="font-medium">8,000 L</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Curd</span>
                          <span className="font-medium">3,000 kg</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Afternoon Shift (2 PM - 10 PM)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between">
                          <span>Butter</span>
                          <span className="font-medium">500 kg</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Ghee</span>
                          <span className="font-medium">300 kg</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Paneer</span>
                          <span className="font-medium">200 kg</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Night Shift (10 PM - 6 AM)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex justify-between">
                          <span>Ice Cream</span>
                          <span className="font-medium">1,500 L</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Buttermilk</span>
                          <span className="font-medium">2,000 L</span>
                        </li>
                        <li className="flex justify-between">
                          <span>Flavored Milk</span>
                          <span className="font-medium">1,000 L</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6 flex justify-center gap-4">
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Schedule
                  </Button>
                  <Button>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Demand Forecast
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Factory className="h-5 w-5" />
                  <span>Production Settings</span>
                </CardTitle>
                <CardDescription>Configure production management features for dairy operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={productionEnabled}
                        onCheckedChange={setProductionEnabled}
                        data-testid="switch-production-enabled"
                      />
                      <Label>Enable Production Management</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={expiryAlerts}
                        onCheckedChange={setExpiryAlerts}
                        data-testid="switch-expiry-alerts"
                      />
                      <Label>Expiry Date Alerts</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={autoScheduling}
                        onCheckedChange={setAutoScheduling}
                        data-testid="switch-auto-scheduling"
                      />
                      <Label>Auto Schedule Based on Orders</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={batchTracking}
                        onCheckedChange={setBatchTracking}
                        data-testid="switch-batch-tracking"
                      />
                      <Label>Batch Number Tracking</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={coldChainMonitoring}
                        onCheckedChange={setColdChainMonitoring}
                        data-testid="switch-cold-chain"
                      />
                      <Label>Cold Chain Monitoring</Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="alert-threshold">Expiry Alert Threshold (Days)</Label>
                      <Input 
                        id="alert-threshold"
                        type="number"
                        value={alertThresholdDays}
                        onChange={(e) => setAlertThresholdDays(e.target.value)}
                        className="w-32"
                        data-testid="input-alert-threshold"
                      />
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleSave} 
                  disabled={saveSettingsMutation.isPending}
                  data-testid="button-save-production"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Settings</span>
                </CardTitle>
                <CardDescription>Configure how you receive production alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked data-testid="switch-email-prod-alerts" />
                  <Label>Email alerts for expiring products</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked data-testid="switch-sms-prod-alerts" />
                  <Label>SMS alerts for critical expiry (within 24 hours)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch defaultChecked data-testid="switch-push-prod-alerts" />
                  <Label>Push notifications for production status changes</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
