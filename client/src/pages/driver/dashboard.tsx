import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Truck, Package, MapPin, Phone, Clock, CheckCircle2,
  LogOut, User, RefreshCw, Navigation, ChevronRight,
  Milk, IceCream, ShoppingBag, AlertCircle
} from 'lucide-react';
import deliveryLogo from '@assets//aavin-logo.png';

const segmentIcons: Record<string, any> = {
  'Fresh Milk': Milk,
  'Products': ShoppingBag,
  'Ice Cream': IceCream,
};

const segmentColors: Record<string, string> = {
  'Fresh Milk': 'bg-blue-100 text-blue-700 border-blue-200',
  'Products': 'bg-green-100 text-green-700 border-green-200',
  'Ice Cream': 'bg-purple-100 text-purple-700 border-purple-200',
};

const statusConfig: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  pending: { label: 'New Order', color: 'bg-yellow-100 text-yellow-800', next: 'out_for_delivery', nextLabel: 'Pick Up & Deliver' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', next: 'out_for_delivery', nextLabel: 'Pick Up & Deliver' },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-800', next: 'out_for_delivery', nextLabel: 'Pick Up & Deliver' },
  preparing: { label: 'Preparing', color: 'bg-orange-100 text-orange-800', next: 'out_for_delivery', nextLabel: 'Pick Up & Deliver' },
  ready: { label: 'Ready for Pickup', color: 'bg-green-100 text-green-800', next: 'out_for_delivery', nextLabel: 'Pick Up & Deliver' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-800', next: 'delivered', nextLabel: 'Mark Delivered' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

export default function DriverDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: driverData, isLoading: driverLoading, error: driverError } = useQuery({
    queryKey: ['/api/driver/me'],
  });

  const { data: deliveriesData, isLoading: deliveriesLoading, refetch: refetchDeliveries } = useQuery({
    queryKey: ['/api/driver/deliveries'],
    refetchInterval: 15000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/deliveries'] });
      toast({ title: 'Status Updated', description: 'Delivery status updated successfully.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    },
  });

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
    } catch {}
    queryClient.clear();
    document.cookie = 'auth_token=; path=/; max-age=0';
    setLocation('/driver/login');
  };

  useEffect(() => {
    if (driverError) {
      setLocation('/driver/login');
    }
  }, [driverError, setLocation]);

  if (driverLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const driver = driverData as any;
  const deliveries = (deliveriesData as any)?.deliveries || [];
  const segment = driver?.assignedSegment || 'Products';
  const SegmentIcon = segmentIcons[segment] || Package;

  const activeDeliveries = deliveries.filter((d: any) => !['delivered', 'cancelled'].includes(d.status));
  const completedDeliveries = deliveries.filter((d: any) => d.status === 'delivered');
  const displayDeliveries = activeTab === 'active' ? activeDeliveries : completedDeliveries;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 pt-3 pb-4 safe-area-top">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={deliveryLogo} alt="Aavin Delivery" className="w-9 h-9 rounded-lg" />
            <div>
              <h1 className="text-base font-bold leading-tight">Aavin Delivery</h1>
              <p className="text-[11px] text-blue-100">{driver?.name || 'Driver'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchDeliveries()}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Segment Badge & Stats */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${segmentColors[segment] || 'bg-gray-100 text-gray-700'}`}>
            <SegmentIcon className="w-3.5 h-3.5" />
            {segment}
          </div>
          <div className="flex gap-4 ml-auto text-sm">
            <div className="text-center">
              <div className="font-bold text-lg leading-none">{activeDeliveries.length}</div>
              <div className="text-[10px] text-blue-200">Active</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg leading-none">{completedDeliveries.length}</div>
              <div className="text-[10px] text-blue-200">Done</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'active' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
            }`}
          >
            Active ({activeDeliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'completed' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
            }`}
          >
            Completed ({completedDeliveries.length})
          </button>
        </div>
      </div>

      {/* Delivery Cards */}
      <div className="px-4 space-y-3 pb-4">
        {deliveriesLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading deliveries...</p>
          </div>
        ) : displayDeliveries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              {activeTab === 'active' ? <Truck className="w-8 h-8 text-gray-400" /> : <CheckCircle2 className="w-8 h-8 text-gray-400" />}
            </div>
            <p className="text-gray-500 font-medium">
              {activeTab === 'active' ? 'No active deliveries' : 'No completed deliveries yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'active' ? 'New orders will appear here automatically' : 'Completed deliveries will show here'}
            </p>
          </div>
        ) : (
          displayDeliveries.map((delivery: any) => {
            const config = statusConfig[delivery.status] || statusConfig.pending;
            const isExpanded = expandedOrder === delivery.id;
            const itemCount = delivery.items?.length || 0;
            const totalQty = delivery.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0;

            return (
              <Card key={delivery.id} className="overflow-hidden border border-gray-200 shadow-sm">
                {/* Card Header - Clickable */}
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : delivery.id)}
                  className="w-full text-left"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-400">#{delivery.id.slice(-6).toUpperCase()}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${config.color} border-0`}>
                            {config.label}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-sm text-gray-900 truncate">
                          {delivery.customerName || 'Customer'}
                        </h3>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-bold text-sm">₹{parseFloat(delivery.total || '0').toFixed(0)}</div>
                        <div className="text-[10px] text-gray-400">{totalQty} items</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{delivery.deliveryAddress || 'Address not provided'}</span>
                      <ChevronRight className={`w-3.5 h-3.5 ml-auto flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </CardContent>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 px-3 py-3 space-y-3">
                    {/* Customer Info */}
                    <div className="flex items-center gap-4">
                      {delivery.customerPhone && (
                        <a
                          href={`tel:${delivery.customerPhone}`}
                          className="flex items-center gap-1.5 text-xs text-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {delivery.customerPhone}
                        </a>
                      )}
                      {delivery.createdAt && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(delivery.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>

                    {/* Items List */}
                    <div className="bg-white rounded-lg p-2 space-y-1">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Order Items</p>
                      {delivery.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                          <span className="text-gray-700">{item.quantity}x {item.name}</span>
                          <span className="text-gray-500 font-medium">₹{(parseFloat(item.price || '0') * (item.quantity || 1)).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Navigate Button */}
                    {delivery.deliveryAddress && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.deliveryAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Open in Google Maps
                      </a>
                    )}

                    {/* Status Action Button */}
                    {config.next && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatusMutation.mutate({ orderId: delivery.id, status: config.next! });
                        }}
                        disabled={updateStatusMutation.isPending}
                        className={`w-full h-11 text-sm font-semibold ${
                          config.next === 'delivered'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {config.next === 'delivered' ? (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        ) : (
                          <Truck className="w-4 h-4 mr-2" />
                        )}
                        {updateStatusMutation.isPending ? 'Updating...' : config.nextLabel}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 safe-area-bottom z-50">
        <div className="flex justify-around max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex flex-col items-center py-1.5 px-4 ${activeTab === 'active' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Deliveries</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex flex-col items-center py-1.5 px-4 ${activeTab === 'completed' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Completed</span>
          </button>
          <button
            onClick={() => {}}
            className="flex flex-col items-center py-1.5 px-4 text-gray-400"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}