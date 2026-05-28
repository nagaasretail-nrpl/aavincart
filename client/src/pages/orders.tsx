import { useState, useEffect, useMemo } from "react";
import { formatTimestamp } from '@/lib/format-timestamp';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, User, Phone, MessageCircle, LogIn, RefreshCw, ShoppingCart, CheckCircle2, Share2, Calendar, TrendingUp, Filter, Package, IndianRupee, ChevronDown, ChevronUp, Download } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { getShortOrderId } from "@/lib/format-order-id";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useCartStore } from "@/lib/store";
import type { Order } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500",
  ready: "bg-green-500",
  out_for_delivery: "bg-purple-500",
  delivered: "bg-emerald-500",
  customer_acknowledged: "bg-green-700",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "Order Pending",
  confirmed: "Order Confirmed",
  preparing: "Preparing",
  ready: "Ready for Pickup",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  customer_acknowledged: "Delivery Confirmed",
  cancelled: "Cancelled",
};

type PeriodFilter = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom' | 'all';

function getDateRange(period: PeriodFilter, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  switch (period) {
    case 'today': {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case 'this_week': {
      const from = new Date(now);
      from.setDate(now.getDate() - now.getDay());
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to };
    }
    case 'this_year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to };
    }
    case 'custom': {
      const from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      const toDate = customTo ? new Date(customTo) : to;
      toDate.setHours(23, 59, 59, 999);
      return { from, to: toDate };
    }
    default:
      return { from: new Date(0), to };
  }
}

function formatWhatsAppMessage(order: any): string {
  const orderId = getShortOrderId(order);
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });

  const items = (order.items || []).map((item: any) => {
    const qty = item.quantity || 1;
    const caseInfo = item.unitsPerPackage && qty >= item.unitsPerPackage
      ? ` (${Math.floor(qty / item.unitsPerPackage)} ${item.packagingType || 'Box'})`
      : '';
    return `- ${item.name} (Qty: ${qty}${caseInfo}) - ₹${(parseFloat(item.price) * qty).toFixed(2)}`;
  }).join('\n');

  const paymentStatus = order.paymentMethod === 'credit' ? 'Credit' :
    order.paymentMethod === 'cod' ? 'Cash on Delivery' :
    order.paymentMethod || 'Pending Payment';

  const statusText = statusLabels[order.status] || order.status;

  let addressBlock = '';
  if (order.deliveryAddress) {
    addressBlock = `\nDelivery Address:\n${order.deliveryAddress}`;
    if (order.gpsLocation) {
      const lat = order.gpsLocation.lat || order.gpsLocation.latitude;
      const lng = order.gpsLocation.lng || order.gpsLocation.longitude;
      if (lat && lng) {
        addressBlock += `\n\nLat/Lon: ${lat}, ${lng}`;
        addressBlock += `\nMaps: https://maps.google.com/?q=${lat},${lng}`;
      }
    }
  }

  let businessBlock = '';
  if (order.customerName) {
    businessBlock = `\nBusiness Info:\nBusiness: ${order.customerName}`;
    if (order.pricingRole) businessBlock += `\nRole: ${order.pricingRole}`;
  }

  return `*Order Details*
---------------------
Order ID: ${orderId}
Date: ${orderDate}
---------------------${businessBlock}
---------------------
Items:
${items}
---------------------
Total Amount: ₹${parseFloat(order.total || '0').toFixed(2)}
Status: ${statusText}
Payment: ${paymentStatus}
---------------------${addressBlock}`;
}

function shareViaWhatsApp(order: any) {
  const message = formatWhatsAppMessage(order);
  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
}

export default function Orders() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('orders');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  
  const isAuthenticated = !!user;

  useEffect(() => {
    if (user) {
      const userPhone = (user as any).phone;
      if (userPhone) {
        setCustomerPhone(userPhone);
        setSearchPhone(userPhone);
        localStorage.setItem('customerPhone', userPhone);
      } else if (user.email) {
        setSearchPhone('__auth__');
      } else {
        const savedPhone = localStorage.getItem('customerPhone');
        if (savedPhone) {
          setCustomerPhone(savedPhone);
          setSearchPhone(savedPhone);
        }
      }
    }
  }, [user]);

  const { addItem, clearCart } = useCartStore();

  const reorderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setReorderingId(orderId);
      const response = await apiRequest('POST', `/api/orders/${orderId}/reorder`);
      return response.json();
    },
    onSuccess: (data) => {
      clearCart();
      if (Array.isArray(data.items)) {
        data.items.forEach((item: any) => {
          addItem({
            id: item.itemId || item.id || item.productId || String(Math.random()),
            name: item.name,
            price: String(item.price || item.unitPrice || '0'),
            quantity: item.quantity || 1,
            image: item.image || '',
            restaurantId: data.restaurantId,
            productSegment: item.productSegment || item.category || 'Products',
          });
        });
      }
      toast({
        title: "Items Added to Cart",
        description: "Your previous order items have been added to your cart. Proceed to checkout."
      });
      setLocation('/checkout');
      setReorderingId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reorder. Please try again.",
        variant: "destructive"
      });
      setReorderingId(null);
    }
  });
  
  const acknowledgeMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/acknowledge`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Delivery Confirmed",
        description: "Thank you for confirming the delivery!"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/orders"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm delivery. Please try again.",
        variant: "destructive"
      });
    }
  });

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/customer/orders", searchPhone, user?.id, user?.email],
    queryFn: async () => {
      if (!user) return [];
      if (!searchPhone) return [];
      const params = new URLSearchParams();
      const effectivePhone = searchPhone === '__auth__' ? '' : searchPhone;
      if (effectivePhone) params.set('phone', effectivePhone);
      if (user.email) params.set('email', user.email);
      if (!params.toString()) return [];
      const response = await fetch(`/api/customer/orders?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    enabled: !!user && !!searchPhone,
  });

  const filteredOrders = useMemo(() => {
    if (periodFilter === 'all') return orders;
    const { from, to } = getDateRange(periodFilter, customFrom, customTo);
    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt || Date.now());
      return orderDate >= from && orderDate <= to;
    });
  }, [orders, periodFilter, customFrom, customTo]);

  const summary = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalAmount = filteredOrders.reduce((sum, o) => sum + parseFloat(String(o.total || '0')), 0);
    const pendingOrders = filteredOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length;
    const deliveredOrders = filteredOrders.filter(o => ['delivered', 'customer_acknowledged'].includes(o.status)).length;
    const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;
    const pendingAmount = filteredOrders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).reduce((sum, o) => sum + parseFloat(String(o.total || '0')), 0);
    const deliveredAmount = filteredOrders.filter(o => ['delivered', 'customer_acknowledged'].includes(o.status)).reduce((sum, o) => sum + parseFloat(String(o.total || '0')), 0);
    return { totalOrders, totalAmount, pendingOrders, deliveredOrders, cancelledOrders, pendingAmount, deliveredAmount };
  }, [filteredOrders]);

  const handleSearch = () => {
    if (customerPhone) {
      setSearchPhone(customerPhone);
      localStorage.setItem('customerPhone', customerPhone);
    }
  };

  const periodLabels: Record<PeriodFilter, string> = {
    all: 'All Time',
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    this_year: 'This Year',
    custom: 'Custom Range',
  };

  if (!user) {
    return (
      <div className="min-h-screen py-6 sm:py-12">
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Your Orders</h1>
          <Card>
            <CardContent className="p-4 sm:p-8 text-center">
              <LogIn className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl font-semibold mb-2">Sign in to view your orders</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">Please sign in to track and view your orders.</p>
              <Link href="/login">
                <Button size="lg" className="min-h-11">Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen py-6 sm:py-12">
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <Skeleton className="h-8 w-48 mb-6 sm:mb-8" />
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="mb-4 sm:mb-6">
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="h-6 w-64 mb-4" />
                <Skeleton className="h-4 w-48 mb-6" />
                <div className="space-y-4">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!searchPhone || orders.length === 0) {
    return (
      <div className="min-h-screen py-6 sm:py-12">
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8" data-testid="text-orders-title">Your Orders</h1>
          <Card>
            <CardContent className="p-3 sm:p-6">
              {isAuthenticated && searchPhone ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No orders yet</p>
                  <p className="text-muted-foreground mb-6" data-testid="text-no-orders">
                    You haven't placed any orders yet. Browse products to get started.
                  </p>
                  <Button onClick={() => setLocation('/')} variant="default">
                    Browse Products
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <Label htmlFor="phone" className="text-base font-medium">Track Your Orders</Label>
                    <p className="text-sm text-muted-foreground mb-3">Enter your phone number to view your orders</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <Button onClick={handleSearch} disabled={!customerPhone} className="min-h-11">
                        Track Orders
                      </Button>
                    </div>
                  </div>
                  {searchPhone && orders.length === 0 && (
                    <p className="text-muted-foreground text-center py-6" data-testid="text-no-orders">
                      No orders found for this phone number.
                    </p>
                  )}
                  {!searchPhone && (
                    <p className="text-muted-foreground text-center py-6" data-testid="text-no-orders">
                      Enter your phone number above to view your orders.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 sm:py-6 md:py-12 page-content">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6" data-testid="text-orders-title">Your Orders</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4 sm:mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders" className="flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              <span>Orders</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span>Statement</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Period Filter
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  {(['all', 'today', 'this_week', 'this_month', 'this_year', 'custom'] as PeriodFilter[]).map((p) => (
                    <Button
                      key={p}
                      variant={periodFilter === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPeriodFilter(p)}
                      className="text-xs sm:text-sm"
                    >
                      {periodLabels[p]}
                    </Button>
                  ))}
                </div>
                {periodFilter === 'custom' && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Package className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-lg sm:text-2xl font-bold">{summary.totalOrders}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <IndianRupee className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <p className="text-lg sm:text-2xl font-bold">₹{summary.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Amount</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                  <p className="text-lg sm:text-2xl font-bold">{summary.pendingOrders}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                  <p className="text-lg sm:text-2xl font-bold">{summary.deliveredOrders}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Delivered</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-base sm:text-lg">
                  Order Statement - {periodLabels[periodFilter]}
                  {periodFilter === 'custom' && customFrom && customTo && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({new Date(customFrom).toLocaleDateString('en-IN')} to {new Date(customTo).toLocaleDateString('en-IN')})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {filteredOrders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 px-4">No orders found for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 sm:p-3 font-medium">Order</th>
                          <th className="text-left p-2 sm:p-3 font-medium hidden sm:table-cell">Date</th>
                          <th className="text-left p-2 sm:p-3 font-medium hidden md:table-cell">Items</th>
                          <th className="text-right p-2 sm:p-3 font-medium">Amount</th>
                          <th className="text-center p-2 sm:p-3 font-medium">Status</th>
                          <th className="text-center p-2 sm:p-3 font-medium">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-muted/30">
                            <td className="p-2 sm:p-3">
                              <span className="font-medium text-blue-600">{getShortOrderId(order)}</span>
                              <p className="text-[10px] text-muted-foreground sm:hidden">
                                {new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </p>
                            </td>
                            <td className="p-2 sm:p-3 text-muted-foreground hidden sm:table-cell">
                              {new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="p-2 sm:p-3 hidden md:table-cell">
                              {(order.items as any[])?.length || 0} items
                            </td>
                            <td className="p-2 sm:p-3 text-right font-semibold">
                              ₹{parseFloat(String(order.total || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 sm:p-3 text-center">
                              <Badge className={`${statusColors[order.status] || 'bg-gray-500'} text-white text-[10px]`}>
                                {statusLabels[order.status] || order.status}
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-3 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => shareViaWhatsApp(order)}
                                title="Share via WhatsApp"
                              >
                                <Share2 className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/50 font-semibold">
                          <td className="p-2 sm:p-3" colSpan={3}>
                            Total ({filteredOrders.length} orders)
                          </td>
                          <td className="p-2 sm:p-3 text-right">
                            ₹{summary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                        {summary.deliveredAmount > 0 && (
                          <tr className="text-emerald-700">
                            <td className="p-2 sm:p-3 text-xs" colSpan={3}>Delivered</td>
                            <td className="p-2 sm:p-3 text-right text-xs font-medium">
                              ₹{summary.deliveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        )}
                        {summary.pendingAmount > 0 && (
                          <tr className="text-yellow-700">
                            <td className="p-2 sm:p-3 text-xs" colSpan={3}>Pending</td>
                            <td className="p-2 sm:p-3 text-right text-xs font-medium">
                              ₹{summary.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-3 sm:space-y-4 md:space-y-6 mt-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {(['all', 'today', 'this_week', 'this_month'] as PeriodFilter[]).map((p) => (
                <Button
                  key={p}
                  variant={periodFilter === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodFilter(p)}
                  className="text-xs"
                >
                  {periodLabels[p]}
                </Button>
              ))}
            </div>

            <div data-testid="orders-list">
              {filteredOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No orders found for {periodLabels[periodFilter].toLowerCase()}.
                  </CardContent>
                </Card>
              ) : filteredOrders.map((order: Order) => (
                <Card key={order.id} className="mb-3 sm:mb-4" data-testid={`order-card-${order.id}`}>
                  <CardHeader className="p-3 sm:p-4 md:p-6 cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-sm sm:text-base md:text-lg" data-testid={`text-order-id-${order.id}`}>
                              Order {getShortOrderId(order)}
                            </CardTitle>
                            <Badge 
                              className={`${statusColors[order.status as keyof typeof statusColors]} text-white text-[10px]`}
                              data-testid={`badge-order-status-${order.id}`}
                            >
                              {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5" data-testid={`text-order-date-${order.id}`}>
                            {new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-semibold text-sm sm:text-base">₹{parseFloat(String(order.total || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); shareViaWhatsApp(order); }} title="Share via WhatsApp">
                          <Share2 className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        {expandedOrder === order.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedOrder === order.id && (
                    <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4 md:space-y-6">
                      <div>
                        <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Order Progress</h4>
                        <div className="flex items-start justify-between relative">
                          {[
                            { status: "confirmed", label: "Confirmed" },
                            { status: "preparing", label: "Preparing" },
                            { status: "out_for_delivery", label: "Out for Delivery" },
                            { status: "delivered", label: "Delivered" },
                            { status: "customer_acknowledged", label: "You Confirmed" },
                          ].map((step, index, arr) => {
                            const currentStepIdx = getStepIndex(order.status);
                            const isPending = order.status === 'pending';
                            const isCompleted = !isPending && currentStepIdx > index;
                            const isCurrent = isPending ? index === 0 : currentStepIdx === index;
                            
                            return (
                              <div key={step.status} className="flex flex-col items-center flex-1 relative">
                                {index < arr.length - 1 && (
                                  <div className={`absolute top-3.5 sm:top-4 left-[calc(50%+14px)] sm:left-[calc(50%+16px)] right-[calc(-50%+14px)] sm:right-[calc(-50%+16px)] h-0.5 ${
                                    isCompleted ? "bg-green-500" : "bg-gray-200"
                                  }`} />
                                )}
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                                  isCurrent
                                    ? "bg-green-500 text-white ring-2 ring-green-200"
                                    : isCompleted 
                                      ? "bg-green-500 text-white" 
                                      : "bg-gray-200 text-gray-400 border border-gray-300"
                                }`}>
                                  {isCompleted ? "✓" : index + 1}
                                </div>
                                <span className={`mt-1.5 text-[10px] sm:text-xs text-center leading-tight max-w-[70px] sm:max-w-[80px] ${
                                  isCurrent ? "font-semibold text-green-600" : isCompleted ? "text-green-600" : "text-muted-foreground"
                                }`}>
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 text-sm sm:text-base">Customer Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Name: </span>
                            <span>{order.customerName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Phone: </span>
                            <span>{order.customerPhone}</span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">Address: </span>
                            <span>{order.deliveryAddress}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Order Items</h4>
                        <div className="space-y-2">
                          {(order.items as any[]).map((item, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span>
                                {item.quantity}x {item.name}
                              </span>
                              <span>
                                ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-border pt-2 mt-2">
                            <div className="flex justify-between font-semibold text-sm sm:text-base">
                              <span>Total</span>
                              <span>₹{order.total}</span>
                            </div>
                            {(order as any).bankRef && (
                              <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                                <span>Bank Ref No.</span>
                                <span className="font-mono">{(order as any).bankRef}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border space-y-2">
                            {(order.status === 'delivered' || (order as any).workflowStatus === 'delivered') && (
                              <Button
                                onClick={() => acknowledgeMutation.mutate(order.id)}
                                disabled={acknowledgeMutation.isPending}
                                className="w-full min-h-11 bg-green-600 hover:bg-green-700 text-white"
                              >
                                {acknowledgeMutation.isPending ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Confirming...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Confirm Delivery Received
                                  </>
                                )}
                              </Button>
                            )}
                            {(order.status === 'customer_acknowledged' || (order as any).workflowStatus === 'customer_acknowledged') && (
                              <div className="flex items-center justify-center gap-2 py-2 text-green-700 bg-green-50 rounded-lg">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium text-sm">Delivery Confirmed</span>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button
                                onClick={() => shareViaWhatsApp(order)}
                                className="flex-1 min-h-11 bg-green-500 hover:bg-green-600 text-white"
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share on WhatsApp
                              </Button>
                              <Button
                                onClick={() => reorderMutation.mutate(order.id)}
                                disabled={reorderingId === order.id}
                                className="flex-1 min-h-11"
                                variant="outline"
                              >
                                {reorderingId === order.id ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart className="h-4 w-4 mr-2" />
                                    Re-order
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {order.orderType === "delivery" && order.status === "out_for_delivery" && (
                        <div className="bg-muted p-3 sm:p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="ml-2 sm:ml-3">
                                <h4 className="font-medium text-sm sm:text-base">Delivery Driver</h4>
                                <p className="text-xs sm:text-sm text-muted-foreground">Your order is on the way</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="secondary" size="icon" className="h-10 w-10 sm:h-9 sm:w-9">
                                <Phone className="h-4 w-4" />
                              </Button>
                              <Button variant="secondary" size="icon" className="h-10 w-10 sm:h-9 sm:w-9">
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function getStepIndex(status: string): number {
  const steps = ["confirmed", "preparing", "out_for_delivery", "delivered", "customer_acknowledged"];
  return steps.indexOf(status);
}
