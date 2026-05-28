import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AdminLayout from './layout';
import { formatTimestamp } from '@/lib/format-timestamp';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Eye, Check, X, Download, Bell, BellRing, Volume2, VolumeX, GitBranch, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { downloadSampleExcel, SAMPLE_EXCEL_CONFIGS } from '@/lib/excel-utils';
import { formatOrderId as formatOrderIdLib } from '@/lib/format-order-id';

interface Order {
  id: string;
  orderNumber?: number;
  displayId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: string;
  status: string;
  createdAt: Date;
  paymentMethod: string;
  deliveryAddress: string;
  pricingRole?: string;
  productSegment?: string;
  isCredit?: boolean;
  parentOrderId?: string;
  masterOrderId?: string;
  segmentSuffix?: string;
  workflowStatus?: string;
}

interface MasterOrderWithSegments {
  id: string;
  masterOrderNumber: number;
  displayId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: string;
  status: string;
  segmentCount: number;
  deliveredCount: number;
  createdAt: string;
  segmentOrders: Order[];
}

function formatOrderId(order: Order): string {
  return formatOrderIdLib({ id: order.id, orderNumber: order.orderNumber, displayId: order.displayId });
}

function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + duration);
      osc.start(audioCtx.currentTime + start);
      osc.stop(audioCtx.currentTime + start + duration);
    };
    playTone(880, 0, 0.15);
    playTone(1100, 0.15, 0.15);
    playTone(1320, 0.3, 0.25);
  } catch (e) {
    console.debug('Audio not available');
  }
}

function WorkflowBadge({ status }: { status?: string }) {
  const s = status || 'pending';
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    marketing_approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Marketing' },
    assigned_to_delivery: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Assigned' },
    out_for_delivery: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Delivery' },
    delivered: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Delivered' },
    customer_acknowledged: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Acknowledged' },
  };
  const c = config[s] || config.pending;
  return <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
}

function MasterOrderRow({ master, expanded, onToggle }: { master: MasterOrderWithSegments; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <TableRow className="bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={onToggle}>
        <TableCell className="py-2">
          <div className="flex items-center gap-1">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="font-mono text-xs font-bold text-gray-900">{master.displayId}</span>
          </div>
        </TableCell>
        <TableCell className="py-2">
          <div className="font-medium text-sm">{master.customerName}</div>
          <div className="text-xs text-gray-400">{master.customerPhone}</div>
        </TableCell>
        <TableCell className="py-2">
          <div className="flex gap-1">
            {master.segmentOrders.map(o => (
              <span key={o.id} className={`text-[10px] px-1 py-0.5 rounded ${
                o.productSegment === 'Fresh Milk' ? 'bg-blue-50 text-blue-700' :
                o.productSegment === 'Ice Cream' ? 'bg-orange-50 text-orange-700' :
                'bg-green-50 text-green-700'
              }`}>{o.segmentSuffix || o.productSegment?.charAt(0)}</span>
            ))}
          </div>
        </TableCell>
        <TableCell className="py-2 text-xs text-gray-600">{(master.segmentOrders[0]?.pricingRole || 'MRP').replace('WHOLESALE_', 'W')}</TableCell>
        <TableCell className="py-2 text-right font-semibold text-sm">₹{parseFloat(master.totalAmount || '0').toFixed(0)}</TableCell>
        <TableCell className="py-2">
          <Badge variant="outline" className={`text-[10px] ${master.status === 'closed' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
            {master.status === 'closed' ? 'Closed' : 'Open'} ({master.deliveredCount}/{master.segmentCount})
          </Badge>
        </TableCell>
        <TableCell className="py-2 text-xs text-gray-500">{formatTimestamp(master.createdAt)}</TableCell>
        <TableCell className="py-2">
          <Link href={`/admin/order-workflow/${master.id}`}>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <GitBranch size={12} /> Workflow
            </Button>
          </Link>
        </TableCell>
      </TableRow>
      {expanded && master.segmentOrders.map(order => (
        <TableRow key={order.id} className="text-sm border-l-4 border-l-blue-200">
          <TableCell className="py-1.5 pl-8">
            <Link href={`/admin/orders/view/${order.id}`}>
              <span className="font-mono text-xs text-blue-600 hover:underline">{order.displayId || formatOrderId(order)}</span>
            </Link>
          </TableCell>
          <TableCell className="py-1.5 text-xs text-gray-500">{order.productSegment}</TableCell>
          <TableCell className="py-1.5"><WorkflowBadge status={order.workflowStatus} /></TableCell>
          <TableCell className="py-1.5"></TableCell>
          <TableCell className="py-1.5 text-right text-xs">₹{parseFloat(order.total || '0').toFixed(0)}</TableCell>
          <TableCell className="py-1.5">{getStatusBadgeSimple(order.status)}</TableCell>
          <TableCell className="py-1.5"></TableCell>
          <TableCell className="py-1.5">
            <Link href={`/admin/orders/view/${order.id}`}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Eye size={13} /></Button>
            </Link>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function getStatusBadgeSimple(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-purple-100 text-purple-800',
    out_for_delivery: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full ${colors[status] || colors.pending}`}>{status}</span>;
}

export default function OrderManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [viewMode, setViewMode] = useState<'orders' | 'master'>('orders');
  const [expandedMasters, setExpandedMasters] = useState<Set<string>>(new Set());
  const prevOrderCountRef = useRef<number | null>(null);
  const { toast } = useToast();

  const { data: orders = [], isLoading, error } = useQuery<Order[]>({
    queryKey: ['/api/admin/orders'],
    refetchInterval: 15000,
  });

  const { data: masterOrders = [] } = useQuery<MasterOrderWithSegments[]>({
    queryKey: ['/api/admin/master-orders'],
    refetchInterval: 15000,
    enabled: viewMode === 'master',
  });

  useEffect(() => {
    if (orders.length > 0) {
      const pendingCount = orders.filter(o => o.status === 'pending').length;
      if (prevOrderCountRef.current !== null && pendingCount > prevOrderCountRef.current) {
        const newCount = pendingCount - prevOrderCountRef.current;
        setNewOrderAlert(true);
        if (soundEnabled) {
          playNotificationSound();
        }
        toast({
          title: `🔔 ${newCount} New Order${newCount > 1 ? 's' : ''} Received!`,
          description: `You have ${pendingCount} pending order${pendingCount > 1 ? 's' : ''} to review.`,
        });
        setTimeout(() => setNewOrderAlert(false), 5000);
      }
      prevOrderCountRef.current = pendingCount;
    }
  }, [orders, soundEnabled, toast]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({ title: "Success", description: "Order updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update order", variant: "destructive" });
    },
  });

  const filteredOrders = orders.filter((order: Order) => {
    const displayId = formatOrderId(order);
    const matchesSearch = order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSegment = segmentFilter === 'all' || order.productSegment === segmentFilter;
    const matchesTier = tierFilter === 'all' || order.pricingRole === tierFilter || (!order.pricingRole && tierFilter === 'MRP');
    return matchesSearch && matchesStatus && matchesSegment && matchesTier;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'secondary' | 'default' | 'destructive'; className: string }> = {
      pending: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      confirmed: { variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      preparing: { variant: 'default', className: 'bg-purple-100 text-purple-800 border-purple-300' },
      ready: { variant: 'default', className: 'bg-orange-100 text-orange-800 border-orange-300' },
      out_for_delivery: { variant: 'default', className: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
      delivered: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-300' },
      cancelled: { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-300' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant="outline" className={`text-xs ${config.className}`}>{status}</Badge>;
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load orders</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] })}>
            Retry
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-orders">
              Orders ({filteredOrders.length})
            </h1>
            {pendingCount > 0 && (
              <Badge className={`text-xs ${newOrderAlert ? 'bg-red-600 animate-pulse' : 'bg-orange-500'}`}>
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">All orders in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('orders')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'orders' ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >Orders</button>
            <button
              onClick={() => setViewMode('master')}
              className={`px-3 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${viewMode === 'master' ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            ><GitBranch size={12} /> Master</button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-green-600" /> : <VolumeX className="h-4 w-4 text-gray-400" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadSampleExcel(SAMPLE_EXCEL_CONFIGS.orders)}>
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by order ID, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
                data-testid="input-search-orders"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Segment:</span>
            <div className="flex gap-1">
              {[
                { key: 'all', label: 'All', icon: '📋' },
                { key: 'Fresh Milk', label: 'Fresh Milk', icon: '🥛' },
                { key: 'Products', label: 'Products', icon: '📦' },
                { key: 'Ice Cream', label: 'Ice Cream', icon: '🍦' },
              ].map(s => (
                <button key={s.key}
                  onClick={() => { setSegmentFilter(s.key); setTierFilter('all'); }}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    segmentFilter === s.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                  }`}
                >{s.icon} {s.label}</button>
              ))}
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <span className="text-xs font-medium text-gray-500">Tier:</span>
            <div className="flex gap-1 flex-wrap">
              {[
                { key: 'all', label: 'All' },
                { key: 'FEDERATION', label: 'Fed 50%' },
                { key: 'INTER_UNION', label: 'IU 55%' },
                { key: 'WHOLESALE_DEALER', label: 'WSD 65%' },
                { key: 'DEALER', label: 'Dlr 85%' },
                { key: 'RETAILER', label: 'Rtl 90%' },
                { key: 'MRP', label: 'MRP' },
              ].map(t => (
                <button key={t.key}
                  onClick={() => setTierFilter(t.key)}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    tierFilter === t.key
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >{t.label}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === 'master' ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[120px] text-xs">Master Order</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="w-[100px] text-xs">Segments</TableHead>
                <TableHead className="w-[70px] text-xs">Tier</TableHead>
                <TableHead className="w-[80px] text-xs text-right">Total</TableHead>
                <TableHead className="w-[110px] text-xs">Status</TableHead>
                <TableHead className="w-[90px] text-xs">Date</TableHead>
                <TableHead className="w-[90px] text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterOrders.map((master) => (
                <MasterOrderRow
                  key={master.id}
                  master={master}
                  expanded={expandedMasters.has(master.id)}
                  onToggle={() => {
                    setExpandedMasters(prev => {
                      const next = new Set(prev);
                      if (next.has(master.id)) next.delete(master.id);
                      else next.add(master.id);
                      return next;
                    });
                  }}
                />
              ))}
            </TableBody>
          </Table>
          {masterOrders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No master orders found. B2B orders with segment splitting will appear here.</p>
            </div>
          )}
        </div>
      ) : (
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[100px] text-xs">Order #</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="w-[80px] text-xs">Segment</TableHead>
              <TableHead className="w-[70px] text-xs">Tier</TableHead>
              <TableHead className="w-[80px] text-xs text-right">Amount</TableHead>
              <TableHead className="w-[80px] text-xs">Status</TableHead>
              <TableHead className="w-[50px] text-xs">Pay</TableHead>
              <TableHead className="w-[90px] text-xs">Date</TableHead>
              <TableHead className="w-[80px] text-xs"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order: Order) => (
              <TableRow key={order.id} className="text-sm" data-testid={`row-order-${order.id}`}>
                <TableCell className="py-2">
                  <Link href={`/admin/orders/view/${order.id}`}>
                    <span className="font-mono text-xs font-semibold text-blue-600 hover:underline cursor-pointer" data-testid={`text-order-id-${order.id}`}>
                      {formatOrderId(order)}
                    </span>
                  </Link>
                  {order.masterOrderId && (
                    <Link href={`/admin/order-workflow/${order.masterOrderId}`}>
                      <span className="block text-[10px] text-gray-400 hover:text-blue-500 cursor-pointer mt-0.5">
                        <GitBranch size={10} className="inline mr-0.5" />workflow
                      </span>
                    </Link>
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate" data-testid={`text-customer-name-${order.id}`}>
                      {order.customerName}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {order.customerEmail}
                      {order.customerPhone ? ` · ${order.customerPhone}` : ''}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded-full ${
                    order.productSegment === 'Fresh Milk' ? 'bg-blue-50 text-blue-700' :
                    order.productSegment === 'Ice Cream' ? 'bg-pink-50 text-pink-700' :
                    'bg-green-50 text-green-700'
                  }`}>
                    {order.productSegment === 'Fresh Milk' ? '🥛' : order.productSegment === 'Ice Cream' ? '🍦' : '📦'}
                    <span className="ml-0.5 hidden sm:inline">{order.productSegment || 'N/A'}</span>
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-xs text-gray-600">
                    {(order.pricingRole || 'MRP').replace('WHOLESALE_', 'W').replace('INTER_', 'I').replace('_', '')}
                  </span>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <span className="font-semibold text-sm" data-testid={`text-amount-${order.id}`}>
                    ₹{parseFloat(order.total || '0').toFixed(0)}
                  </span>
                </TableCell>
                <TableCell className="py-2" data-testid={`status-${order.id}`}>
                  {getStatusBadge(order.status)}
                </TableCell>
                <TableCell className="py-2 text-xs text-gray-500" data-testid={`text-payment-${order.id}`}>
                  {order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod === 'credit' ? 'Cr' : order.paymentMethod}
                </TableCell>
                <TableCell className="py-2 text-xs text-gray-500" data-testid={`text-date-${order.id}`}>
                  {formatTimestamp(order.createdAt)}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1">
                    <Link href={`/admin/orders/view/${order.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" data-testid={`button-view-${order.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    {order.status === 'pending' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                        onClick={() => updateOrderMutation.mutate({ id: order.id, status: 'confirmed' })}
                        data-testid={`button-confirm-${order.id}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                        onClick={() => updateOrderMutation.mutate({ id: order.id, status: 'cancelled' })}
                        data-testid={`button-cancel-${order.id}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredOrders.length === 0 && (
          <div className="text-center py-8" data-testid="no-orders-message">
            <p className="text-gray-500 text-sm">
              {searchQuery || statusFilter !== 'all' ? 'No orders found matching your criteria.' : 'No orders found.'}
            </p>
          </div>
        )}
      </div>
      )}
    </div>
    </AdminLayout>
  );
}
