import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ORDER_WORKFLOW_STAGES, WORKFLOW_SEGMENTS, getWorkflowTeam } from '@shared/schema';
import {
  Package, Milk, IceCream, ShoppingBag,
  Search, Filter, Eye, CheckCircle, XCircle,
  Clock, ArrowRight, LogOut, RefreshCw,
  ChevronRight, User, MapPin, Phone, CreditCard, Truck,
  BarChart3, AlertCircle
} from 'lucide-react';
import aavinLogo from "@assets//aavin-logo.png";

const SEGMENT_MAP: Record<string, string> = { FM: 'Fresh Milk', DP: 'Products', IC: 'Ice Cream' };
const SEGMENT_REVERSE: Record<string, string> = { 'Fresh Milk': 'FM', 'Products': 'DP', 'Ice Cream': 'IC' };

const OFFICE_SCOPED_DESIGNATIONS = [
  'data_entry_operator', 'marketing_executive',
  'segment_mgr_marketing_fm', 'segment_mgr_marketing_dp', 'segment_mgr_marketing_ic',
];

const OFFICE_LABELS: Record<string, string> = {
  'city_mmo': 'City MMO',
  'mettur_mmo': 'Mettur MMO',
  'edappadi_mmo': 'Edappadi MMO',
  'head_office': 'Head Office',
};

const SEGMENT_COLORS: Record<string, { bg: string; text: string; border: string; light: string }> = {
  'Fresh Milk': { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-200', light: 'bg-blue-50' },
  'Products': { bg: 'bg-amber-600', text: 'text-amber-700', border: 'border-amber-200', light: 'bg-amber-50' },
  'Ice Cream': { bg: 'bg-pink-600', text: 'text-pink-700', border: 'border-pink-200', light: 'bg-pink-50' },
};

const SEGMENT_ICONS: Record<string, any> = {
  'Fresh Milk': Milk,
  'Products': Package,
  'Ice Cream': IceCream,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  marketing_approved: 'bg-blue-100 text-blue-700',
  assigned_to_delivery: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  customer_acknowledged: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  marketing_approved: 'Marketing Approved',
  assigned_to_delivery: 'Assigned to Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  customer_acknowledged: 'Acknowledged',
  cancelled: 'Cancelled',
};

function getNextStatus(current: string, team: string | null): string | null {
  const flow = ['pending', 'marketing_approved', 'assigned_to_delivery', 'out_for_delivery', 'delivered'];
  const teamStageMap: Record<string, string[]> = {
    marketing: ['marketing_approved'],
    delivery: ['assigned_to_delivery', 'out_for_delivery', 'delivered'],
  };
  if (!team) return null;
  const allowedStages = teamStageMap[team] || [];
  const currentIdx = flow.indexOf(current);
  if (currentIdx < 0) return null;
  const nextStatus = flow[currentIdx + 1];
  if (!nextStatus) return null;
  if (allowedStages.includes(nextStatus)) return nextStatus;
  return null;
}

export default function SegmentManagerDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [staffSession, setStaffSession] = useState<any>(null);
  const [activeSegment, setActiveSegment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('staffSession');
    if (!stored) {
      setLocation('/union-staff-login');
      return;
    }
    try {
      const data = JSON.parse(stored);
      const desId = data.designationId || '';
      const isOfficeScoped = OFFICE_SCOPED_DESIGNATIONS.includes(desId);
      if (data.department !== 'segment_workflow' && !isOfficeScoped) {
        setLocation('/union-staff-login');
        return;
      }
      setStaffSession(data);
      if (!isOfficeScoped) {
        const segs = data.assignedSegments || [];
        if (segs.length === 1) {
          setActiveSegment(SEGMENT_MAP[segs[0]] || 'all');
        }
      }
    } catch {
      setLocation('/union-staff-login');
    }
  }, []);

  const isOfficeScoped = staffSession ? OFFICE_SCOPED_DESIGNATIONS.includes(staffSession.designationId || '') : false;
  const officeName = staffSession?.assignedOffice ? (OFFICE_LABELS[staffSession.assignedOffice] || staffSession.assignedOffice) : '';
  const staffTeam = staffSession ? (isOfficeScoped ? 'marketing' : getWorkflowTeam(staffSession.designationId || '')) : null;
  const allowedSegments = isOfficeScoped
    ? ['Fresh Milk', 'Products', 'Ice Cream']
    : (staffSession?.assignedSegments || []).map((s: string) => SEGMENT_MAP[s]).filter(Boolean);

  const apiBase = isOfficeScoped ? '/api/office-staff' : '/api/segment-staff';

  const ordersQuery = useQuery<any[]>({
    queryKey: [apiBase + '/my-orders', activeSegment, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeSegment !== 'all') params.set('segment', activeSegment);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const sessionData = sessionStorage.getItem('staffSession') || '';
      const res = await fetch(`${apiBase}/my-orders?${params}`, {
        headers: { 'x-staff-session': sessionData },
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    enabled: !!staffSession,
    refetchInterval: 30000,
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ orderId, workflowStatus }: { orderId: string; workflowStatus: string }) => {
      const sessionData = sessionStorage.getItem('staffSession') || '';
      const res = await fetch(`${apiBase}/orders/${orderId}/workflow`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-session': sessionData,
        },
        body: JSON.stringify({ workflowStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiBase + '/my-orders'] });
      toast({ title: 'Order Updated', description: 'Workflow status updated successfully.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const orders = ordersQuery.data || [];
  const filteredOrders = orders.filter((o: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.displayId || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerPhone || '').includes(q) ||
      (o.deliveryAddress || '').toLowerCase().includes(q)
    );
  });

  const segmentCounts: Record<string, { total: number; pending: number; inProgress: number; completed: number }> = {};
  for (const seg of allowedSegments) {
    const segOrders = orders.filter((o: any) => o.productSegment === seg);
    segmentCounts[seg] = {
      total: segOrders.length,
      pending: segOrders.filter((o: any) => (o.workflowStatus || o.status) === 'pending').length,
      inProgress: segOrders.filter((o: any) => {
        const ws = o.workflowStatus || o.status;
        return !['pending', 'delivered', 'customer_acknowledged', 'cancelled'].includes(ws);
      }).length,
      completed: segOrders.filter((o: any) => ['delivered', 'customer_acknowledged'].includes(o.workflowStatus || o.status)).length,
    };
  }

  const handleApprove = (order: any) => {
    const current = order.workflowStatus || order.status || 'pending';
    const next = getNextStatus(current, staffTeam);
    if (next) {
      updateWorkflowMutation.mutate({ orderId: order.id, workflowStatus: next });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('staffSession');
    setLocation('/union-staff-login');
  };

  if (!staffSession) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={aavinLogo} alt="Aavin" className="h-10 w-10 object-contain rounded-lg" />
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{isOfficeScoped ? 'Office Orders' : 'Segment Manager'}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {staffSession.name} — {staffSession.designation}
                  {isOfficeScoped && officeName ? ` · ${officeName}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5">
                {allowedSegments.map((seg: string) => {
                  const color = SEGMENT_COLORS[seg];
                  return (
                    <Badge key={seg} className={`${color?.bg} text-white text-xs`}>
                      {seg}
                    </Badge>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" onClick={() => ordersQuery.refetch()}>
                <RefreshCw className={`h-4 w-4 ${ordersQuery.isFetching ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {allowedSegments.map((seg: string) => {
            const counts = segmentCounts[seg] || { total: 0, pending: 0, inProgress: 0, completed: 0 };
            const color = SEGMENT_COLORS[seg];
            const Icon = SEGMENT_ICONS[seg] || Package;
            return (
              <Card key={seg} className={`${color?.border} border-2 cursor-pointer transition-all hover:shadow-md ${activeSegment === seg ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                onClick={() => setActiveSegment(activeSegment === seg ? 'all' : seg)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${color?.light}`}>
                      <Icon className={`h-5 w-5 ${color?.text}`} />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{counts.total}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">{seg}</h3>
                  <div className="flex gap-3 text-xs">
                    <span className="text-orange-600 font-medium">{counts.pending} pending</span>
                    <span className="text-blue-600 font-medium">{counts.inProgress} active</span>
                    <span className="text-green-600 font-medium">{counts.completed} done</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Card className="border-2 border-gray-200 cursor-pointer transition-all hover:shadow-md"
            onClick={() => { setActiveSegment('all'); setStatusFilter('all'); }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</span>
              </div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">All Segments</h3>
              <div className="flex gap-3 text-xs">
                <span className="text-gray-600">Total orders across segments</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders by ID, customer name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="marketing_approved">Marketing Approved</SelectItem>
                  <SelectItem value="assigned_to_delivery">Assigned to Delivery</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="customer_acknowledged">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
              {allowedSegments.length > 1 && (
                <Select value={activeSegment} onValueChange={setActiveSegment}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Segments</SelectItem>
                    {allowedSegments.map((seg: string) => (
                      <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {ordersQuery.isLoading ? (
          <div className="text-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
            <p className="text-gray-500">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Orders Found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'No orders match your search criteria.' : 'There are no orders for your assigned segments yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Orders ({filteredOrders.length})</span>
                {activeSegment !== 'all' && (
                  <Badge className={`${SEGMENT_COLORS[activeSegment]?.bg} text-white`}>{activeSegment}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden md:table-cell">Segment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Amount</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order: any) => {
                      const ws = order.workflowStatus || order.status || 'pending';
                      const nextStatus = getNextStatus(ws, staffTeam);
                      const segColor = SEGMENT_COLORS[order.productSegment] || SEGMENT_COLORS['Products'];
                      const items = Array.isArray(order.items) ? order.items : [];
                      return (
                        <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => { setSelectedOrder(order); setDetailOpen(true); }}>
                          <TableCell className="font-mono text-sm font-medium">
                            {order.displayId || `#${order.orderNumber}`}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{order.customerName}</p>
                              <p className="text-xs text-gray-500">{order.customerPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className={`${segColor.text} ${segColor.border} text-xs`}>
                              {order.productSegment}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_COLORS[ws] || 'bg-gray-100 text-gray-700'} text-xs`}>
                              {STATUS_LABELS[ws] || ws}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right font-medium">
                            ₹{Number(order.total || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-gray-500">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setDetailOpen(true); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {nextStatus && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                  disabled={updateWorkflowMutation.isPending}
                                  onClick={() => handleApprove(order)}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Approve
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>Order {selectedOrder.displayId || `#${selectedOrder.orderNumber}`}</span>
                  <Badge className={`${SEGMENT_COLORS[selectedOrder.productSegment]?.bg || 'bg-gray-500'} text-white text-xs`}>
                    {selectedOrder.productSegment}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <User className="h-4 w-4" /> Customer Details
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm space-y-1">
                      <p className="font-medium">{selectedOrder.customerName}</p>
                      <p className="text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedOrder.customerPhone}</p>
                      <p className="text-gray-500">{selectedOrder.customerEmail}</p>
                      {selectedOrder.pricingRole && selectedOrder.pricingRole !== 'MRP' && (
                        <p className="text-gray-500"><CreditCard className="h-3 w-3 inline mr-1" />{selectedOrder.pricingRole}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" /> Delivery Address
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">{selectedOrder.deliveryAddress || 'No address'}</p>
                      {selectedOrder.deliveryInstructions && (
                        <p className="text-gray-500 mt-1 text-xs italic">{selectedOrder.deliveryInstructions}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4" /> Order Items
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-sm">{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">₹{Number(item.price || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">₹{(Number(item.price || 0) * (item.quantity || 1)).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span>₹{Number(selectedOrder.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Delivery Fee</span>
                      <span>₹{Number(selectedOrder.deliveryFee || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span>₹{Number(selectedOrder.tax || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t pt-1">
                      <span>Total</span>
                      <span>₹{Number(selectedOrder.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                    <Truck className="h-4 w-4" /> Workflow Progress
                  </h4>
                  <div className="space-y-1">
                    {ORDER_WORKFLOW_STAGES.map((stage, idx) => {
                      const ws = selectedOrder.workflowStatus || selectedOrder.status || 'pending';
                      const currentIdx = ORDER_WORKFLOW_STAGES.findIndex(s => s.id === ws);
                      const stageIdx = idx;
                      const isCompleted = stageIdx <= currentIdx;
                      const isCurrent = stageIdx === currentIdx;
                      return (
                        <div key={stage.id} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${isCurrent ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' : ''}`}>
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <span className={`flex-1 ${isCurrent ? 'font-semibold text-blue-700 dark:text-blue-300' : isCompleted ? 'text-green-700 dark:text-green-400' : 'text-gray-400'}`}>
                            {stage.label}
                          </span>
                          {stage.team && (
                            <Badge variant="outline" className="text-[10px]">{stage.team}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-gray-500 border-t pt-3">
                  <div className="space-y-0.5">
                    {selectedOrder.createdAt && <p>Created: {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}</p>}
                    {selectedOrder.managerAssignedAt && <p>Manager Assigned: {new Date(selectedOrder.managerAssignedAt).toLocaleString('en-IN')}</p>}
                    {selectedOrder.deliveredAt && <p>Delivered: {new Date(selectedOrder.deliveredAt).toLocaleString('en-IN')}</p>}
                    {selectedOrder.paymentMethod && <p>Payment: {selectedOrder.paymentMethod}</p>}
                    {selectedOrder.isCredit && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Credit Order</Badge>}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {(() => {
                  const ws = selectedOrder.workflowStatus || selectedOrder.status || 'pending';
                  const next = getNextStatus(ws, staffTeam);
                  if (!next) return (
                    <p className="text-xs text-gray-500 italic">
                      {['delivered', 'customer_acknowledged'].includes(ws) ? 'This order is complete.' : `Waiting for ${STATUS_LABELS[ORDER_WORKFLOW_STAGES[ORDER_WORKFLOW_STAGES.findIndex(s => s.id === ws) + 1]?.id] || 'next'} step (not your team's action).`}
                    </p>
                  );
                  return (
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={updateWorkflowMutation.isPending}
                      onClick={() => {
                        handleApprove(selectedOrder);
                        setDetailOpen(false);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve → {STATUS_LABELS[next]}
                    </Button>
                  );
                })()}
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
