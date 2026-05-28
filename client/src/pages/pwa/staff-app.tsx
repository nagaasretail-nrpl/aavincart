import { useState, useEffect, useCallback, Fragment } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatOrderId } from "@/lib/format-order-id";
import aavinUnionLogo from "@assets/aavin_union_single_1771870721210.png";
import {
  Home, ShoppingBag, Package, Store, User,
  LogOut, Lock, Mail, Bell, Search, ChevronLeft,
  Printer, MoreHorizontal, Loader2, Share2,
  MapPin, Clock, CheckCircle, XCircle,
  TrendingUp, Users, Settings, FileText,
  BarChart3, ChevronRight, AlertCircle, X,
  ClipboardList, Truck, Box, Activity, Calendar, Phone,
  Navigation, Target, Eye, MapPinned, UserCheck, UserX, Briefcase, Route, Download, Filter, Camera, Plus, FileSpreadsheet, Upload, Droplets, RefreshCw,
  Building2, Milk, IceCream, Info, Receipt
} from "lucide-react";

type TabId = 'home' | 'orders' | 'products' | 'union' | 'account' | 'b2b' | 'tracking' | 'sfa' | 'reports' | 'delivery' | 'route_optimizer' | 'bulk_delivery' | 'mmo_offices';
type OrderFilter = 'all' | 'pending' | 'processing' | 'completed';

interface OrderItem {
  name?: string;
  productName?: string;
  quantity?: number;
  price?: number;
  unitPrice?: number;
  image?: string;
  segment?: string;
  addons?: Array<{ name: string; price: number; quantity: number }>;
}

function parseItems(order: any): OrderItem[] {
  const items = order.items || [];
  if (typeof items === 'string') { try { return JSON.parse(items); } catch { return []; } }
  return Array.isArray(items) ? items : [];
}

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function timeAgo(date: string) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function StaffLoginForm({ onLogin }: { onLogin: () => void }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/union-staff/login", { username, password });
      const data = await res.json();
      if (!data.success || !data.staff) {
        throw new Error(data.message || "Invalid staff credentials. Only union staff can login here.");
      }
      const staffSessionData = {
        ...data.staff,
        isStaff: true,
        isDirectLogin: true,
        staffId: data.staff.id,
      };
      localStorage.setItem('pwaStaffSession', JSON.stringify(staffSessionData));

      const unionId = data.staff.unionId;
      if (unionId) {
        const authRes = await apiRequest("POST", "/api/union-staff/pwa-auth", {
          unionId,
          staffId: data.staff.id,
          username: username.trim(),
          password,
        });
        const authData = await authRes.json();
        if (authData.merchantId) {
          localStorage.setItem('pwaStaffMerchantId', String(authData.merchantId));
        }
      }
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        setLoginError(null);
        toast({ title: "Login successful" });
        onLogin();
      }
    },
    onError: (error: any) => {
      const msg = error.message || "Invalid credentials";
      if (msg.includes('Union not found') || msg.includes('Authentication failed')) {
        setLoginError("Staff login OK but union setup failed. Please contact your administrator.");
      } else {
        setLoginError(msg);
      }
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4">
            <img src={aavinUnionLogo} alt="Aavin Union" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Aavin Union</h1>
          <p className="text-[15px] text-gray-500 mt-1">Staff Operations Portal</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setLoginError(null); loginMutation.mutate(); }} className="space-y-4">
          {loginError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[15px] text-red-700">{loginError}</div>
          )}
          <div>
            <Label htmlFor="pwa-username" className="text-[15px] font-medium text-gray-700">Staff Username / Mobile Number</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="pwa-username" type="text" inputMode="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username or mobile number" className="h-12 pl-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white" required />
            </div>
          </div>
          <div>
            <Label htmlFor="pwa-password" className="text-[15px] font-medium text-gray-700">Password</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="pwa-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="h-12 pl-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-base" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in...</> : "Sign In"}
          </Button>
          <div className="text-center text-[15px] text-gray-600">
            New Staff?{" "}
            <Link href="/union-staff-register" className="text-blue-600 hover:underline font-medium">Register Here</Link>
          </div>
        </form>
        <div className="mt-6 pt-5 border-t border-gray-200 space-y-2">
          <p className="text-center text-[13px] text-gray-400 mb-3">Other logins</p>
          <div className="flex flex-col gap-2">
            <Link href="/login" className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-[15px] text-gray-600 hover:bg-gray-50 transition-colors">
              <User className="h-4 w-4" />
              Customer / Business Login
            </Link>
            <div className="flex gap-2">
              <Link href="/admin/login" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-[15px] text-gray-600 hover:bg-gray-50 transition-colors">
                <Settings className="h-4 w-4" />
                Admin / Union
              </Link>
              <Link href="/pwa/driver" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-[15px] text-gray-600 hover:bg-gray-50 transition-colors">
                <Truck className="h-4 w-4" />
                Driver Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'pending': 'bg-orange-100 text-orange-700',
    'accepted': 'bg-blue-100 text-blue-700',
    'processing': 'bg-blue-100 text-blue-700',
    'marketing_approved': 'bg-cyan-100 text-cyan-700',
    'assigned_to_delivery': 'bg-violet-100 text-violet-700',
    'ready': 'bg-purple-100 text-purple-700',
    'completed': 'bg-green-100 text-green-700',
    'delivered': 'bg-green-100 text-green-700',
    'cancelled': 'bg-red-100 text-red-700',
    'out_for_delivery': 'bg-indigo-100 text-indigo-700',
  };
  const label = status?.replace(/_/g, ' ');
  return <Badge className={`${colors[status] || 'bg-gray-100 text-gray-700'} text-[13px] font-medium capitalize`}>{label}</Badge>;
}

function HomeTab({ ordersData, onViewOrder, onNotificationClick }: {
  ordersData: any[];
  onViewOrder: (order: any) => void;
  onNotificationClick: () => void;
}) {
  const pendingOrders = ordersData.filter((o: any) => o.status === 'pending');
  const processingOrders = ordersData.filter((o: any) =>
    ['accepted', 'processing', 'marketing_approved', 'ready'].includes(o.status)
  );
  const deliveryOrders = ordersData.filter((o: any) =>
    ['assigned_to_delivery', 'out_for_delivery'].includes(o.status)
  );
  const completedToday = ordersData.filter((o: any) => {
    if (o.status !== 'completed' && o.status !== 'delivered') return false;
    const d = o.createdAt ? new Date(o.createdAt) : null;
    if (!d) return false;
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const todayOrders = ordersData.filter((o: any) => {
    const d = o.createdAt ? new Date(o.createdAt) : null;
    if (!d) return false;
    return d.toDateString() === new Date().toDateString();
  });

  const recentOrders = ordersData.slice(0, 5);

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={aavinUnionLogo} alt="Aavin" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Operations Dashboard</h1>
            <p className="text-[13px] text-gray-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <button className="relative" onClick={onNotificationClick}>
          <Bell className="h-5 w-5 text-gray-600" />
          {pendingOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[11px] text-white flex items-center justify-center font-bold">{pendingOrders.length}</span>
          )}
        </button>
      </div>

      {pendingOrders.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3 cursor-pointer" onClick={onNotificationClick}>
            <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-orange-800">{pendingOrders.length} order{pendingOrders.length > 1 ? 's' : ''} need approval</p>
              <p className="text-[13px] text-orange-600">Tap to review and process</p>
            </div>
            <ChevronRight className="h-4 w-4 text-orange-400" />
          </div>
        </div>
      )}

      <div className="px-4 mb-5 grid grid-cols-2 gap-3">
        <div className="bg-blue-600 text-white rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-4 w-4 text-blue-200" />
            <p className="text-[13px] text-blue-200">Today's Orders</p>
          </div>
          <p className="text-2xl font-bold">{todayOrders.length}</p>
        </div>
        <div className="bg-orange-500 text-white rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-orange-200" />
            <p className="text-[13px] text-orange-200">Pending Approval</p>
          </div>
          <p className="text-2xl font-bold">{pendingOrders.length}</p>
        </div>
        <div className="bg-indigo-600 text-white rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-indigo-200" />
            <p className="text-[13px] text-indigo-200">In Processing</p>
          </div>
          <p className="text-2xl font-bold">{processingOrders.length}</p>
        </div>
        <div className="bg-green-600 text-white rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-green-200" />
            <p className="text-[13px] text-green-200">Out for Delivery</p>
          </div>
          <p className="text-2xl font-bold">{deliveryOrders.length}</p>
        </div>
      </div>

      <div className="px-4 mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Recent Orders</h3>
          <p className="text-[13px] text-gray-400">Latest 5 orders to process</p>
        </div>
      </div>

      <div className="px-4 space-y-2 mt-2">
        {recentOrders.length > 0 ? recentOrders.map((order: any) => {
          const items = parseItems(order);
          const itemCount = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
          const customerName = order.customerName || order.customer_name || 'Customer';

          return (
            <div key={order.id} className="border border-gray-100 rounded-xl p-3 cursor-pointer active:bg-gray-50 transition-colors" onClick={() => onViewOrder(order)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-[15px]">{formatOrderId({ id: String(order.id), orderNumber: order.orderNumber, displayId: order.displayId })}</p>
                    {order.status === 'pending' && <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 animate-pulse" />}
                  </div>
                  <p className="text-[13px] text-gray-500">{itemCount} item{itemCount !== 1 ? 's' : ''} - {customerName}</p>
                  <p className="text-[13px] text-gray-400 mt-0.5">{timeAgo(order.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={order.status} />
                  <p className="text-[13px] font-semibold text-gray-700">₹{fmt(parseFloat(order.total || 0))}</p>
                </div>
              </div>
            </div>
          );
        }) : (
          <p className="text-center text-gray-400 py-6 text-[15px]">No orders yet</p>
        )}
      </div>

      <div className="px-4 mt-4 mb-2">
        <h3 className="text-[15px] font-bold text-gray-900 mb-2">Today's Summary</h3>
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Completed Today</span>
            <span className="font-semibold">{completedToday.length} orders</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Total Value Today</span>
            <span className="font-semibold">₹{fmtShort(todayOrders.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0))}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">All Orders</span>
            <span className="font-semibold">{ordersData.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onAccept, onReject, isUpdating }: {
  order: any;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  isUpdating: boolean;
}) {
  const items = parseItems(order);
  const subtotal = items.reduce((s, i) => s + ((i.price || i.unitPrice || 0) * (i.quantity || 1)), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-base">{formatOrderId({ id: String(order.id), orderNumber: order.orderNumber, displayId: order.displayId })}</h3>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 text-[13px] text-gray-500">
            <p>Customer: <span className="font-medium text-gray-700">{order.customerName || order.customer_name || 'N/A'}</span></p>
            <p>Placed: {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : 'N/A'}</p>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Package className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[15px]">{item.name || item.productName || 'Product'}</p>
                <p className="text-[13px] text-gray-500">{item.quantity || 1} x ₹{fmt(item.price || item.unitPrice || 0)}</p>
                {item.segment && <p className="text-[13px] text-gray-400">{item.segment}</p>}
              </div>
              <p className="font-semibold text-[15px]">₹{fmt((item.price || item.unitPrice || 0) * (item.quantity || 1))}</p>
            </div>
          ))}

          <div className="border-t pt-3 mt-2 space-y-1.5">
            <div className="flex justify-between text-[15px]">
              <span className="text-gray-600">Sub total ({items.reduce((s, i) => s + (i.quantity || 1), 0)} items)</span>
              <span>₹{fmt(subtotal)}</span>
            </div>
            {order.gstAmount && parseFloat(order.gstAmount) > 0 && (
              <div className="flex justify-between text-[15px]">
                <span className="text-gray-600">GST</span>
                <span>₹{fmt(parseFloat(order.gstAmount))}</span>
              </div>
            )}
            {order.deliveryFee && parseFloat(order.deliveryFee) > 0 && (
              <div className="flex justify-between text-[15px]">
                <span className="text-gray-600">Delivery Fee</span>
                <span>₹{fmt(parseFloat(order.deliveryFee))}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between font-bold text-base mt-3 pt-2 border-t">
            <span>Total</span>
            <span>₹{fmt(parseFloat(order.total || 0))}</span>
          </div>
        </div>

        {(order.status === 'pending') && (
          <div className="px-4 py-3 border-t flex gap-3">
            <Button onClick={onAccept} disabled={isUpdating}
              className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1.5" /> Approve</>}
            </Button>
            <Button onClick={onReject} disabled={isUpdating} variant="outline"
              className="flex-1 h-11 rounded-xl font-semibold border-red-200 text-red-600 hover:bg-red-50">
              <XCircle className="h-4 w-4 mr-1.5" /> Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderDetailPage({ order, onBack, onAccept, onReject, isUpdating, onSendToDelivery, isSendingToDelivery }: {
  order: any;
  onBack: () => void;
  onAccept: () => void;
  onReject: () => void;
  isUpdating: boolean;
  onSendToDelivery?: () => void;
  isSendingToDelivery?: boolean;
}) {
  const items = parseItems(order);
  const subtotal = items.reduce((s, i) => s + ((i.price || i.unitPrice || 0) * (i.quantity || 1)), 0);
  const customerName = order.customerName || order.customer_name || 'Customer';

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
          <h2 className="font-bold text-base">{formatOrderId({ id: String(order.id), orderNumber: order.orderNumber, displayId: order.displayId })}</h2>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium">{customerName}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Order Type</span>
            <span className="font-medium">{order.orderType || 'Delivery'}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Payment</span>
            <span className="font-medium">{order.paymentMethod || 'Cash On Delivery'}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Placed</span>
            <span className="font-medium">
              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </span>
          </div>
          {order.deliveryAddress && (
            <div className="flex justify-between text-[15px]">
              <span className="text-gray-500">Address</span>
              <span className="font-medium text-right max-w-[60%]">{typeof order.deliveryAddress === 'string' ? order.deliveryAddress : 'Provided'}</span>
            </div>
          )}
        </div>

        <div>
          <p className="font-bold text-[15px] mb-2">Order Timeline</p>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              order.status === 'pending' ? 'bg-orange-500' :
              order.status === 'cancelled' ? 'bg-red-500' :
              order.status === 'completed' || order.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'
            }`} />
            <p className="text-[13px] text-gray-600">
              {order.status === 'pending' ? 'Waiting for approval' :
               order.status === 'accepted' || order.status === 'processing' ? 'Approved — Awaiting marketing' :
               order.status === 'marketing_approved' ? 'Marketing approved — Ready for delivery' :
               order.status === 'assigned_to_delivery' ? 'Assigned to delivery' :
               order.status === 'out_for_delivery' ? 'Out for delivery' :
               order.status === 'completed' || order.status === 'delivered' ? 'Delivered successfully' :
               order.status === 'cancelled' ? 'Order cancelled' : order.status?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-bold text-[15px]">Items</p>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[15px]">{item.quantity || 1} x {item.name || item.productName || 'Product'}</p>
                {item.segment && <p className="text-[13px] text-gray-400">{item.segment}</p>}
              </div>
              <p className="font-semibold text-[15px]">₹{fmt((item.price || item.unitPrice || 0) * (item.quantity || 1))}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <p className="font-bold text-[15px]">Order Summary</p>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Sub total ({items.reduce((s, i) => s + (i.quantity || 1), 0)} items)</span>
            <span>₹{fmt(subtotal)}</span>
          </div>
          {order.gstAmount && parseFloat(order.gstAmount) > 0 && (
            <div className="flex justify-between text-[15px]">
              <span className="text-gray-500">GST</span>
              <span>₹{fmt(parseFloat(order.gstAmount))}</span>
            </div>
          )}
          {order.deliveryFee && parseFloat(order.deliveryFee) > 0 && (
            <div className="flex justify-between text-[15px]">
              <span className="text-gray-500">Delivery Fee</span>
              <span>₹{fmt(parseFloat(order.deliveryFee))}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-[15px] pt-1 border-t">
            <span>Total</span>
            <span>₹{fmt(parseFloat(order.total || 0))}</span>
          </div>
        </div>
      </div>

      {order.status === 'pending' && (
        <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t flex gap-3 max-w-md mx-auto">
          <Button onClick={onAccept} disabled={isUpdating}
            className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold">
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1.5" /> Approve</>}
          </Button>
          <Button onClick={onReject} disabled={isUpdating} variant="outline"
            className="flex-1 h-11 rounded-xl font-semibold border-red-200 text-red-600 hover:bg-red-50">
            <XCircle className="h-4 w-4 mr-1.5" /> Reject
          </Button>
        </div>
      )}

      {onSendToDelivery && ['accepted', 'confirmed', 'marketing_approved', 'ready'].includes(order.status) && (
        <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white border-t max-w-md mx-auto">
          <Button onClick={onSendToDelivery} disabled={isSendingToDelivery}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold">
            {isSendingToDelivery ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Truck className="h-4 w-4 mr-1.5" /> Send to Delivery</>}
          </Button>
        </div>
      )}
    </div>
  );
}

function OrdersTab({ ordersData, onViewOrder }: { ordersData: any[]; onViewOrder: (order: any) => void }) {
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterSegment, setFilterSegment] = useState('all');
  const [filterAgentType, setFilterAgentType] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [filterAgentCode, setFilterAgentCode] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const uniqueAgentTypes = Array.from(new Set(ordersData.map((o: any) => o.pricingRole).filter(Boolean))).sort() as string[];
  const uniqueAgentCodes = Array.from(new Set(ordersData.map((o: any) => o.agentId ? String(o.agentId) : null).filter(Boolean))).sort() as string[];

  const hasActiveFilters = filterSegment !== 'all' || filterAgentType !== 'all' || filterPaymentStatus !== 'all' || filterAgentCode !== 'all';

  let filtered = filter === 'all' ? ordersData
    : filter === 'pending' ? ordersData.filter((o: any) => o.status === 'pending')
    : filter === 'processing' ? ordersData.filter((o: any) =>
        ['accepted', 'processing', 'marketing_approved', 'assigned_to_delivery', 'out_for_delivery'].includes(o.status))
    : ordersData.filter((o: any) => o.status === 'completed' || o.status === 'delivered');

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((o: any) => {
      const oid = formatOrderId({ id: String(o.id), orderNumber: o.orderNumber, displayId: o.displayId });
      const cname = String(o.customerName || o.customer_name || '');
      const agent = String(o.agentId ?? '');
      return oid.toLowerCase().includes(q) || cname.toLowerCase().includes(q) || agent.toLowerCase().includes(q);
    });
  }

  if (filterSegment !== 'all') {
    filtered = filtered.filter((o: any) => (o.productSegment || '').toLowerCase() === filterSegment.toLowerCase());
  }
  if (filterAgentType !== 'all') {
    filtered = filtered.filter((o: any) => o.pricingRole === filterAgentType);
  }
  if (filterPaymentStatus !== 'all') {
    filtered = filtered.filter((o: any) => {
      const ps = String(o.paymentStatus || 'unpaid').toLowerCase();
      if (filterPaymentStatus === 'paid') return ps === 'paid' || ps === 'completed';
      return ps !== 'paid' && ps !== 'completed';
    });
  }
  if (filterAgentCode !== 'all') {
    filtered = filtered.filter((o: any) => String(o.agentId ?? '') === filterAgentCode);
  }

  const updateMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order updated" });
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['/api/union'] });
    },
    onError: () => {
      toast({ title: "Failed to update order", variant: "destructive" });
    },
  });

  function clearAllFilters() {
    setFilterSegment('all');
    setFilterAgentType('all');
    setFilterPaymentStatus('all');
    setFilterAgentCode('all');
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">Order Management</h3>
          <p className="text-[13px] text-gray-400">{ordersData.length} total orders{filtered.length !== ordersData.length ? ` (${filtered.length} shown)` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch(!showSearch)} className={showSearch ? 'text-blue-600' : 'text-gray-600'}>
            <Search className="h-5 w-5" />
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className={`relative ${showFilters || hasActiveFilters ? 'text-purple-600' : 'text-gray-600'}`}>
            <Filter className="h-5 w-5" />
            {hasActiveFilters && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full" />}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="px-4 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search Order ID, Customer, Agent Code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {showFilters && (
        <div className="px-4 mb-3">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Filters</p>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-[12px] text-red-500 font-medium">Clear All</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-medium mb-0.5 block">Segment</label>
                <select
                  value={filterSegment}
                  onChange={(e) => setFilterSegment(e.target.value)}
                  className="w-full text-[13px] px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Segments</option>
                  <option value="Fresh Milk">Fresh Milk</option>
                  <option value="Products">Products</option>
                  <option value="Ice Cream">Ice Cream</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-medium mb-0.5 block">Agent Type</label>
                <select
                  value={filterAgentType}
                  onChange={(e) => setFilterAgentType(e.target.value)}
                  className="w-full text-[13px] px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Types</option>
                  {uniqueAgentTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-medium mb-0.5 block">Payment</label>
                <select
                  value={filterPaymentStatus}
                  onChange={(e) => setFilterPaymentStatus(e.target.value)}
                  className="w-full text-[13px] px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              {uniqueAgentCodes.length > 0 && (
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-medium mb-0.5 block">Agent Code</label>
                  <select
                    value={filterAgentCode}
                    onChange={(e) => setFilterAgentCode(e.target.value)}
                    className="w-full text-[13px] px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Agents</option>
                    {uniqueAgentCodes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/union'] });
                setShowFilters(false);
              }}
              className="w-full py-2 bg-purple-600 text-white text-[13px] font-semibold rounded-lg flex items-center justify-center gap-1.5 active:bg-purple-700"
            >
              <Filter className="h-3.5 w-3.5" />
              Fetch Orders
            </button>
          </div>
        </div>
      )}

      <div className="px-4 mb-4 flex gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'processing', 'completed'] as OrderFilter[]).map((f) => {
          const count = f === 'all' ? ordersData.length
            : f === 'pending' ? ordersData.filter((o: any) => o.status === 'pending').length
            : f === 'processing' ? ordersData.filter((o: any) =>
                ['accepted', 'processing', 'marketing_approved', 'assigned_to_delivery', 'out_for_delivery'].includes(o.status)).length
            : ordersData.filter((o: any) => o.status === 'completed' || o.status === 'delivered').length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      <div className="px-4 space-y-2">
        {filtered.length > 0 ? filtered.slice(0, 50).map((order: any) => {
          const items = parseItems(order);
          const itemCount = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
          const customerName = order.customerName || order.customer_name || 'Customer';
          const displayOrdId = formatOrderId({ id: String(order.id), orderNumber: order.orderNumber, displayId: order.displayId });

          return (
            <div key={order.id} className="border border-gray-100 rounded-xl p-3 cursor-pointer active:bg-gray-50 transition-colors" onClick={() => setSelectedOrder(order)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-[15px]">{displayOrdId}</p>
                    {order.agentId && (
                      <span className="text-[10px] font-mono bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{order.agentId}</span>
                    )}
                    {order.status === 'pending' && <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 animate-pulse" />}
                  </div>
                  <p className="text-[13px] text-gray-500">{itemCount} item{itemCount !== 1 ? 's' : ''} - {customerName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[13px] text-gray-400">{timeAgo(order.createdAt)}</p>
                    {order.productSegment && order.productSegment !== 'Products' && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{order.productSegment}</span>
                    )}
                    {order.paymentStatus && order.paymentStatus !== 'unpaid' && (
                      <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{order.paymentStatus}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={order.status} />
                  <p className="text-[13px] font-semibold text-gray-700">₹{fmt(parseFloat(order.total || 0))}</p>
                </div>
              </div>
            </div>
          );
        }) : (
          <p className="text-center text-gray-400 py-8 text-[15px]">No orders found</p>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAccept={() => updateMutation.mutate({ orderId: selectedOrder.id, status: 'accepted' })}
          onReject={() => updateMutation.mutate({ orderId: selectedOrder.id, status: 'cancelled' })}
          isUpdating={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ProductsTab({ ordersData }: { ordersData: any[] }) {
  const [segmentFilter, setSegmentFilter] = useState<string>('all');

  const itemCounts: Record<string, { name: string; count: number; orders: number; segment: string }> = {};
  ordersData.forEach((o: any) => {
    parseItems(o).forEach((item: any) => {
      const name = item.name || item.productName || 'Unknown';
      const qty = item.quantity || 1;
      const seg = item.segment || 'General';
      if (!itemCounts[name]) itemCounts[name] = { name, count: 0, orders: 0, segment: seg };
      itemCounts[name].count += qty;
      itemCounts[name].orders++;
    });
  });

  const allItems = Object.values(itemCounts).sort((a, b) => b.count - a.count);
  const segments = ['all', ...Array.from(new Set(allItems.map(i => i.segment)))];
  const filtered = segmentFilter === 'all' ? allItems : allItems.filter(i => i.segment === segmentFilter);

  const segmentSummary: Record<string, { count: number; items: number }> = {};
  allItems.forEach(item => {
    if (!segmentSummary[item.segment]) segmentSummary[item.segment] = { count: 0, items: 0 };
    segmentSummary[item.segment].count += item.count;
    segmentSummary[item.segment].items++;
  });

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-base font-bold">Product Catalog</h3>
        <p className="text-[13px] text-gray-400">Products ordered across all segments</p>
      </div>

      <div className="px-4 mb-4 grid grid-cols-3 gap-2">
        {Object.entries(segmentSummary).map(([seg, data]) => (
          <div key={seg} className="bg-gray-50 rounded-xl p-2.5 text-center">
            <p className="text-[12px] text-gray-400 truncate">{seg}</p>
            <p className="text-lg font-bold text-gray-900">{data.items}</p>
            <p className="text-[12px] text-gray-400">{fmtShort(data.count)} units</p>
          </div>
        ))}
      </div>

      {segments.length > 2 && (
        <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
          {segments.map(seg => (
            <button key={seg} onClick={() => setSegmentFilter(seg)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                segmentFilter === seg ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
              {seg === 'all' ? 'All Segments' : seg}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 space-y-2">
        {filtered.length > 0 ? filtered.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Box className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-[15px]">{item.name}</p>
                <p className="text-[13px] text-gray-400">{item.segment}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-[15px]">{fmtShort(item.count)} units</p>
              <p className="text-[13px] text-gray-400">{item.orders} orders</p>
            </div>
          </div>
        )) : (
          <p className="text-center text-gray-400 py-8 text-[15px]">No product data yet</p>
        )}
      </div>
    </div>
  );
}

type ReportType = 'item' | 'agent' | 'segment' | 'daterange' | 'milkdispatch';
type TimeRange = 'today' | 'week' | 'month' | 'custom';

function getDateRangeForTimeRange(range: TimeRange, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (range) {
    case 'today':
      return { from: todayStart, to: todayEnd };
    case 'week': {
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { from: weekStart, to: todayEnd };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: monthStart, to: todayEnd };
    }
    case 'custom':
      return {
        from: customFrom ? new Date(customFrom + 'T00:00:00') : todayStart,
        to: customTo ? new Date(customTo + 'T23:59:59') : todayEnd,
      };
  }
}

function filterOrdersByRange(orders: any[], range: TimeRange, customFrom?: string, customTo?: string) {
  const { from, to } = getDateRangeForTimeRange(range, customFrom, customTo);
  return orders.filter((o: any) => {
    if (!o.createdAt) return false;
    const d = new Date(o.createdAt);
    return d >= from && d <= to;
  });
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function TimeRangeSelector({ value, onChange, customFrom, customTo, onCustomFromChange, onCustomToChange, onFetch }: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  onFetch?: () => void;
}) {
  const options: { value: TimeRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'custom', label: 'Custom' },
  ];
  return (
    <div className="px-4 py-2 space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${value === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {opt.label}
          </button>
        ))}
      </div>
      {value === 'custom' && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[13px] text-gray-500 mb-1 block">From</label>
            <input type="date" value={customFrom} onChange={(e) => onCustomFromChange(e.target.value)} className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-[15px] bg-gray-50" />
          </div>
          <div className="flex-1">
            <label className="text-[13px] text-gray-500 mb-1 block">To</label>
            <input type="date" value={customTo} onChange={(e) => onCustomToChange(e.target.value)} className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-[15px] bg-gray-50" />
          </div>
          {onFetch && (
            <button onClick={onFetch} className="h-9 px-3 bg-blue-600 text-white rounded-lg text-[13px] font-medium flex-shrink-0">Fetch</button>
          )}
        </div>
      )}
    </div>
  );
}

function UnionTab({ merchant, ordersData }: {
  merchant: any;
  ordersData: any[];
}) {
  const [showReports, setShowReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const completedOrders = ordersData.filter((o: any) => o.status === 'completed' || o.status === 'delivered');
  const cancelledOrders = ordersData.filter((o: any) => o.status === 'cancelled');
  const pendingOrders = ordersData.filter((o: any) => o.status === 'pending');
  const totalOrderValue = ordersData.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);
  const completedValue = completedOrders.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);

  const monthlySales: Record<string, number> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  completedOrders.forEach((o: any) => {
    if (o.createdAt) {
      const d = new Date(o.createdAt);
      const key = monthNames[d.getMonth()];
      monthlySales[key] = (monthlySales[key] || 0) + (parseFloat(o.total) || 0);
    }
  });
  const maxSales = Math.max(...Object.values(monthlySales), 1);

  if (selectedReport) {
    const filteredOrders = filterOrdersByRange(ordersData, timeRange, dateFrom, dateTo);
    const allItems: Array<OrderItem & { orderTotal: number; customerName: string }> = [];
    filteredOrders.forEach((o: any) => {
      parseItems(o).forEach((item) => {
        allItems.push({ ...item, orderTotal: parseFloat(o.total) || 0, customerName: o.customerName || o.customer_name || 'Customer' });
      });
    });
    const totalRevenue = filteredOrders.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);
    const rangeLabel = timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : `${dateFrom} to ${dateTo}`;

    if (selectedReport === 'item') {
      const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      allItems.forEach((item) => {
        const name = item.name || item.productName || 'Unknown';
        const qty = item.quantity || 1;
        const rev = (item.price || item.unitPrice || 0) * qty;
        if (!itemMap[name]) itemMap[name] = { name, qty: 0, revenue: 0 };
        itemMap[name].qty += qty;
        itemMap[name].revenue += rev;
      });
      const sorted = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);
      const itemTotal = sorted.reduce((s, i) => s + i.revenue, 0);

      return (
        <div className="pb-24">
          <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
            <button onClick={() => setSelectedReport(null)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="font-bold text-base flex-1">Item-wise Sales Report</h2>
            <button onClick={() => downloadCSV(`item-report-${rangeLabel}.csv`, ['#', 'Item Name', 'Qty Sold', 'Revenue (₹)', 'Share (%)'], sorted.map((item, idx) => [String(idx + 1), item.name, String(item.qty), item.revenue.toFixed(2), itemTotal > 0 ? ((item.revenue / itemTotal) * 100).toFixed(1) : '0']))} className="p-1.5 bg-blue-50 rounded-lg">
              <Download className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} customFrom={dateFrom} customTo={dateTo} onCustomFromChange={setDateFrom} onCustomToChange={setDateTo} />
          <div className="px-4 py-2 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[13px] text-blue-600">Total Items</p>
              <p className="text-xl font-bold text-blue-900">{sorted.length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[13px] text-blue-600">Total Revenue</p>
              <p className="text-xl font-bold text-blue-900">₹{fmtShort(itemTotal)}</p>
            </div>
          </div>
          <div className="px-4 space-y-2">
            {sorted.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[13px] font-bold text-blue-600">{idx + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[15px] truncate">{item.name}</p>
                    <p className="text-[13px] text-gray-400">{fmtShort(item.qty)} units sold</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-[15px]">₹{fmtShort(item.revenue)}</p>
                  <p className="text-[13px] text-blue-600">{itemTotal > 0 ? ((item.revenue / itemTotal) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            ))}
            {sorted.length === 0 && <p className="text-center text-gray-400 py-8 text-[15px]">No item data for {rangeLabel}</p>}
          </div>
        </div>
      );
    }

    if (selectedReport === 'agent') {
      const agentMap: Record<string, { name: string; orderCount: number; totalValue: number }> = {};
      filteredOrders.forEach((o: any) => {
        const name = o.customerName || o.customer_name || 'Customer';
        if (!agentMap[name]) agentMap[name] = { name, orderCount: 0, totalValue: 0 };
        agentMap[name].orderCount++;
        agentMap[name].totalValue += parseFloat(o.total) || 0;
      });
      const sorted = Object.values(agentMap).sort((a, b) => b.totalValue - a.totalValue);

      return (
        <div className="pb-24">
          <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
            <button onClick={() => setSelectedReport(null)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="font-bold text-base flex-1">Agent-wise Sales Report</h2>
            <button onClick={() => downloadCSV(`agent-report-${rangeLabel}.csv`, ['#', 'Agent Name', 'Orders', 'Total Value (₹)', 'Avg Order Value (₹)'], sorted.map((a, idx) => [String(idx + 1), a.name, String(a.orderCount), a.totalValue.toFixed(2), (a.orderCount > 0 ? a.totalValue / a.orderCount : 0).toFixed(2)]))} className="p-1.5 bg-blue-50 rounded-lg">
              <Download className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} customFrom={dateFrom} customTo={dateTo} onCustomFromChange={setDateFrom} onCustomToChange={setDateTo} />
          <div className="px-4 py-2 grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[12px] text-blue-600">Agents</p>
              <p className="text-lg font-bold text-blue-900">{sorted.length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[12px] text-blue-600">Orders</p>
              <p className="text-lg font-bold text-blue-900">{filteredOrders.length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[12px] text-blue-600">Revenue</p>
              <p className="text-lg font-bold text-blue-900">₹{fmtShort(totalRevenue)}</p>
            </div>
          </div>
          <div className="px-4 space-y-2">
            {sorted.map((agent, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[15px] truncate">{agent.name}</p>
                    <p className="text-[13px] text-gray-400">{agent.orderCount} order{agent.orderCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-[15px]">₹{fmtShort(agent.totalValue)}</p>
                  <p className="text-[13px] text-gray-400">Avg ₹{fmtShort(agent.orderCount > 0 ? agent.totalValue / agent.orderCount : 0)}</p>
                </div>
              </div>
            ))}
            {sorted.length === 0 && <p className="text-center text-gray-400 py-8 text-[15px]">No agent data for {rangeLabel}</p>}
          </div>
        </div>
      );
    }

    if (selectedReport === 'segment') {
      const segMap: Record<string, { segment: string; qty: number; revenue: number }> = {};
      allItems.forEach((item) => {
        const seg = item.segment || 'General';
        const qty = item.quantity || 1;
        const rev = (item.price || item.unitPrice || 0) * qty;
        if (!segMap[seg]) segMap[seg] = { segment: seg, qty: 0, revenue: 0 };
        segMap[seg].qty += qty;
        segMap[seg].revenue += rev;
      });
      const sorted = Object.values(segMap).sort((a, b) => b.revenue - a.revenue);
      const segTotal = sorted.reduce((s, i) => s + i.revenue, 0);
      const segColors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500'];

      return (
        <div className="pb-24">
          <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
            <button onClick={() => setSelectedReport(null)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="font-bold text-base flex-1">Segment-wise Sales Report</h2>
            <button onClick={() => downloadCSV(`segment-report-${rangeLabel}.csv`, ['#', 'Segment', 'Qty Sold', 'Revenue (₹)', 'Share (%)'], sorted.map((seg, idx) => [String(idx + 1), seg.segment, String(seg.qty), seg.revenue.toFixed(2), segTotal > 0 ? ((seg.revenue / segTotal) * 100).toFixed(1) : '0']))} className="p-1.5 bg-blue-50 rounded-lg">
              <Download className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} customFrom={dateFrom} customTo={dateTo} onCustomFromChange={setDateFrom} onCustomToChange={setDateTo} />
          <div className="px-4 py-2 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[13px] text-blue-600">Segments</p>
              <p className="text-xl font-bold text-blue-900">{sorted.length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[13px] text-blue-600">Total Revenue</p>
              <p className="text-xl font-bold text-blue-900">₹{fmtShort(segTotal)}</p>
            </div>
          </div>
          {segTotal > 0 && (
            <div className="px-4 mb-3">
              <div className="flex rounded-full overflow-hidden h-3">
                {sorted.map((seg, idx) => (
                  <div key={idx} className={`${segColors[idx % segColors.length]} transition-all`} style={{ width: `${(seg.revenue / segTotal) * 100}%` }} />
                ))}
              </div>
            </div>
          )}
          <div className="px-4 space-y-2">
            {sorted.map((seg, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${segColors[idx % segColors.length]}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-[15px] truncate">{seg.segment}</p>
                    <p className="text-[13px] text-gray-400">{fmtShort(seg.qty)} units sold</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-[15px]">₹{fmtShort(seg.revenue)}</p>
                  <p className="text-[13px] text-blue-600">{segTotal > 0 ? ((seg.revenue / segTotal) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            ))}
            {sorted.length === 0 && <p className="text-center text-gray-400 py-8 text-[15px]">No segment data for {rangeLabel}</p>}
          </div>
        </div>
      );
    }

    if (selectedReport === 'daterange') {
      const dailyMap: Record<string, { date: string; orderCount: number; revenue: number }> = {};
      filteredOrders.forEach((o: any) => {
        const d = new Date(o.createdAt);
        const key = d.toISOString().split('T')[0];
        if (!dailyMap[key]) dailyMap[key] = { date: key, orderCount: 0, revenue: 0 };
        dailyMap[key].orderCount++;
        dailyMap[key].revenue += parseFloat(o.total) || 0;
      });
      const dailyData = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
      const rangeRevenue = filteredOrders.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);

      return (
        <div className="pb-24">
          <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
            <button onClick={() => setSelectedReport(null)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="font-bold text-base flex-1">Date Range Sales Report</h2>
            <button onClick={() => downloadCSV(`daterange-report-${rangeLabel}.csv`, ['Date', 'Day', 'Orders', 'Revenue (₹)'], dailyData.map(day => [day.date, new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), String(day.orderCount), day.revenue.toFixed(2)]))} className="p-1.5 bg-blue-50 rounded-lg">
              <Download className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} customFrom={dateFrom} customTo={dateTo} onCustomFromChange={setDateFrom} onCustomToChange={setDateTo} />
          <div className="px-4 py-2 grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
              <p className="text-[12px] text-blue-600">Orders</p>
              <p className="text-lg font-bold text-blue-900">{filteredOrders.length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
              <p className="text-[12px] text-blue-600">Revenue</p>
              <p className="text-lg font-bold text-blue-900">₹{fmtShort(rangeRevenue)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
              <p className="text-[12px] text-blue-600">Days</p>
              <p className="text-lg font-bold text-blue-900">{dailyData.length}</p>
            </div>
          </div>
          <div className="px-4 mb-2">
            <p className="font-bold text-[15px]">Daily Breakdown</p>
          </div>
          <div className="px-4 space-y-2">
            {dailyData.map((day, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[15px]">{new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <p className="text-[13px] text-gray-400">{day.orderCount} order{day.orderCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <p className="font-bold text-[15px]">₹{fmtShort(day.revenue)}</p>
              </div>
            ))}
            {dailyData.length === 0 && <p className="text-center text-gray-400 py-8 text-[15px]">No orders for {rangeLabel}</p>}
          </div>
        </div>
      );
    }

    if (selectedReport === 'milkdispatch') {
      return <MilkDispatchPWAReport onBack={() => setSelectedReport(null)} />;
    }
  }

  if (showReports) {
    const reportTypes: Array<{ type: ReportType; icon: any; label: string; desc: string }> = [
      { type: 'item', icon: Package, label: 'Item-wise Sales', desc: 'Sales breakdown by product' },
      { type: 'agent', icon: Users, label: 'Agent-wise Sales', desc: 'Sales breakdown by customer/agent' },
      { type: 'segment', icon: BarChart3, label: 'Segment-wise Sales', desc: 'Sales breakdown by segment' },
      { type: 'daterange', icon: Calendar, label: 'Date Range Sales', desc: 'Daily sales within date range' },
      { type: 'milkdispatch', icon: Droplets, label: 'Daily Dispatch Report', desc: 'Fresh milk route-wise dispatch' },
    ];

    return (
      <div className="pb-24">
        <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
          <button onClick={() => setShowReports(false)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
          <h2 className="font-bold text-base">Reports</h2>
        </div>
        <div className="px-4 py-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
            <p className="text-[15px] font-semibold text-blue-900">Generate Reports</p>
            <p className="text-[13px] text-blue-600 mt-0.5">Select a report type to view detailed analytics from your order data</p>
          </div>
          <div className="space-y-2">
            {reportTypes.map((report) => (
              <div key={report.type} onClick={() => setSelectedReport(report.type)} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <report.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[15px]">{report.label}</p>
                  <p className="text-[13px] text-gray-400">{report.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <img src={aavinUnionLogo} alt="Aavin" className="w-10 h-10 object-contain" />
        <div>
          <h3 className="text-base font-bold">{merchant?.businessName || merchant?.name || 'District Union'}</h3>
          <p className="text-[13px] text-gray-400">{merchant?.businessType || 'TCMPF District Union'}</p>
        </div>
      </div>

      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[13px] text-gray-400">Total Orders</p>
          <p className="text-xl font-bold text-gray-900">{ordersData.length}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[13px] text-gray-400">Completed</p>
          <p className="text-xl font-bold text-green-600">{completedOrders.length}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[13px] text-gray-400">Pending</p>
          <p className="text-xl font-bold text-orange-600">{pendingOrders.length}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[13px] text-gray-400">Cancelled</p>
          <p className="text-xl font-bold text-red-600">{cancelledOrders.length}</p>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
          <p className="font-bold text-[15px] text-blue-900">Order Value Overview</p>
          <div className="flex justify-between text-[15px]">
            <span className="text-blue-700">Total Order Value</span>
            <span className="font-bold text-blue-900">₹{fmtShort(totalOrderValue)}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-blue-700">Completed Value</span>
            <span className="font-bold text-green-700">₹{fmtShort(completedValue)}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-blue-700">Fulfillment Rate</span>
            <span className="font-bold text-blue-900">{ordersData.length > 0 ? Math.round((completedOrders.length / ordersData.length) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <p className="font-bold text-[15px] mb-2">Monthly Order Trends</p>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-end gap-1 h-[120px]">
            {monthNames.map((month) => {
              const val = monthlySales[month] || 0;
              const height = maxSales > 0 ? Math.max((val / maxSales) * 100, 2) : 2;
              return (
                <div key={month} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div className="w-full max-w-[24px] bg-blue-500 rounded-t-sm transition-all" style={{ height: `${height}%` }} />
                  <span className="text-[8px] text-gray-400">{month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-2">
        <p className="font-bold text-[15px]">Quick Links</p>
        {[
          { icon: MapPin, label: 'Union Address', desc: merchant?.address || 'View address details', action: null },
          { icon: Phone, label: 'Contact', desc: merchant?.phone || 'Union contact details', action: null },
          { icon: Settings, label: 'Settings', desc: 'Manage union preferences', action: null },
          { icon: FileText, label: 'Reports', desc: 'Generate operational reports', action: () => setShowReports(true) },
        ].map((link, idx) => (
          <div key={idx} onClick={link.action || undefined} className={`flex items-center gap-3 p-3 bg-gray-50 rounded-xl ${link.action ? 'cursor-pointer active:bg-gray-100' : ''}`}>
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <link.icon className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-[15px]">{link.label}</p>
              <p className="text-[13px] text-gray-400 truncate">{link.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface MmoOffice { id: string; unionId: string; officeName: string; officeCode: string; parentId: string | null; address: string | null; contactPerson: string | null; contactPhone: string | null; isActive: boolean; sequenceNo: number; }
interface MmoRoute { id: string; mmoOfficeId: string; routeName: string; routeCode: string; areaDescription: string | null; sequenceNo: number; }
interface MmoAgent { id: string; routeId: string; agentCode: string; agentName: string; pointName: string; segment: string; mobileNo: string | null; address: string | null; sequenceNo: number; }
interface MmoSegAgentRow { agentId: string; agentCode: string; agentName: string; pointName: string; morning: Record<string, number>; evening: Record<string, number>; morningValue: number; eveningValue: number; totalValue: number; orderCount: number; }
interface MmoSegData { products: string[]; productPrices: Record<string, number>; agents: MmoSegAgentRow[]; totalOrders: number; totalValue: number; productTotals: Record<string, { morning: number; evening: number }>; }
interface MmoUnmatchedOrder { id: number; customerName: string; customerPhone?: string | null; total: number; productSegment: string; items: { name: string; quantity: number; price: number }[]; createdAt: string; deliveryShift: string; }
interface MmoDispatchData { dispatchDate: string; orderDate: string; routeName: string; routeCode: string; agents: MmoAgent[]; segments: Record<string, MmoSegData>; matchedOrderCount: number; unmatchedOrderCount: number; unmatchedOrders: MmoUnmatchedOrder[]; totalAllUnionOrders: number; summary: { totalOrders: number; totalValue: number }; }

function mmoGetTomorrowDate(): string { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; }
function mmoGetTodayDate(): string { return new Date().toISOString().split("T")[0]; }
function mmoFormatDate(dateStr: string): string { const d = new Date(dateStr + "T00:00:00"); return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }

function shortProductName(name: string): string {
  const n = name.trim();
  const map: [RegExp, string][] = [
    [/premium.?full\s*cream\s*milk.?1\s*lit/i, 'FCM 1000'],
    [/premium.?full\s*cream\s*milk.?500/i, 'FCM 500'],
    [/delite\s*milk.?500/i, 'DLT 500'],
    [/standard\s*milk.?200/i, 'STD 200'],
    [/standard\s*milk.?500/i, 'STD 500'],
    [/standardised\s*milk.?500/i, 'STD 500'],
  ];
  for (const [re, short] of map) {
    if (re.test(n)) return short;
  }
  let s = n.replace(/\(.*?\)/g, '').replace(/^aavin\s*/i, '').trim();
  if (s.length > 20) s = s.substring(0, 20).trim();
  return s;
}

function agentHasShiftOrders(a: MmoSegAgentRow, shift: 'morning' | 'evening' | 'combined'): boolean {
  if (shift === 'combined') return a.orderCount > 0;
  const bucket = shift === 'morning' ? a.morning : a.evening;
  return Object.values(bucket).some(q => q > 0);
}

type MmoView = 'offices' | 'routes' | 'route_detail';

function parseStaffOffices(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; } catch {}
    return raw ? [raw] : [];
  }
  return [];
}

function MMOOfficesTab({ merchantId, staffSession }: { merchantId: string; staffSession?: any }) {
  const officeScopedRoles = ['marketing_executive', 'data_entry_operator'];
  const isOfficeLocked = staffSession && officeScopedRoles.includes(staffSession.designationId);
  const [view, setView] = useState<MmoView>('offices');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'agents' | 'dispatch'>('dispatch');
  const [dispatchDate, setDispatchDate] = useState(mmoGetTomorrowDate());
  const [dispatchSegment, setDispatchSegment] = useState<'Fresh Milk' | 'Products' | 'Ice Cream'>('Fresh Milk');
  const [freshMilkShift, setFreshMilkShift] = useState<'combined' | 'morning' | 'evening'>('combined');
  const [agentListDate, setAgentListDate] = useState(mmoGetTodayDate());
  const [agentListTab, setAgentListTab] = useState<'ordered' | 'unordered'>('ordered');
  const [showUnmatched, setShowUnmatched] = useState(false);

  const { data: offices = [], isLoading: officesLoading } = useQuery<MmoOffice[]>({ queryKey: ["/api/mmo/offices"] });

  const LEGACY_OFFICE_MAP: Record<string, string> = {
    'city_mmo': 'City MMO', 'mettur_mmo': 'Mettur MMO',
    'edappadi_mmo': 'Edappadi MMO', 'head_office': 'Head Office',
  };

  const staffOfficeNames = parseStaffOffices(staffSession?.assignedOffice).map(name => {
    const resolved = LEGACY_OFFICE_MAP[name] || name;
    return resolved;
  });
  const hasMultipleOffices = isOfficeLocked && staffOfficeNames.length > 1;
  const hasSingleOffice = isOfficeLocked && staffOfficeNames.length === 1;

  const allowedOffices = isOfficeLocked
    ? offices.filter(o => staffOfficeNames.some(name =>
        o.officeName.toLowerCase() === name.toLowerCase() ||
        o.officeName.toLowerCase().includes(name.toLowerCase()) ||
        o.officeCode.toLowerCase() === name.toLowerCase()
      ))
    : offices;

  useEffect(() => {
    if (hasSingleOffice && offices.length > 0 && !selectedOfficeId) {
      const match = allowedOffices[0];
      if (match) {
        setSelectedOfficeId(match.id);
        setView('routes');
      }
    }
  }, [hasSingleOffice, offices, selectedOfficeId, allowedOffices]);

  const { data: routes = [], isLoading: routesLoading } = useQuery<MmoRoute[]>({
    queryKey: ["/api/mmo/offices", selectedOfficeId, "routes"],
    queryFn: async () => { const res = await fetch(`/api/mmo/offices/${selectedOfficeId}/routes`, { credentials: "include" }); return res.json(); },
    enabled: !!selectedOfficeId,
  });

  const { data: agents = [] } = useQuery<MmoAgent[]>({
    queryKey: ["/api/mmo/routes", selectedRouteId, "agents"],
    queryFn: async () => { const res = await fetch(`/api/mmo/routes/${selectedRouteId}/agents`, { credentials: "include" }); return res.json(); },
    enabled: !!selectedRouteId,
  });

  const { data: dispatchData, isLoading: dispatchLoading } = useQuery<MmoDispatchData>({
    queryKey: ["/api/mmo/routes", selectedRouteId, "dispatch", dispatchDate],
    queryFn: async () => { const res = await fetch(`/api/mmo/routes/${selectedRouteId}/dispatch?date=${dispatchDate}`, { credentials: "include" }); return res.json(); },
    enabled: !!selectedRouteId,
  });

  const validAgentListDate = /^\d{4}-\d{2}-\d{2}$/.test(agentListDate) ? agentListDate : mmoGetTodayDate();
  const { data: agentDispatchData } = useQuery<MmoDispatchData>({
    queryKey: ["/api/mmo/routes", selectedRouteId, "dispatch", validAgentListDate, "agent-tab"],
    queryFn: async () => { const res = await fetch(`/api/mmo/routes/${selectedRouteId}/dispatch?date=${validAgentListDate}`, { credentials: "include" }); return res.json(); },
    enabled: !!selectedRouteId,
  });

  const { orderedAgents, unorderedAgents } = (() => {
    if (!agents.length) return { orderedAgents: [] as (MmoAgent & { orderCount: number; totalValue: number })[], unorderedAgents: [] as MmoAgent[] };
    const orderedIds = new Set<string>();
    const agentInfo = new Map<string, { orderCount: number; totalValue: number }>();
    if (agentDispatchData?.segments) {
      for (const segData of Object.values(agentDispatchData.segments)) {
        if (!segData?.agents) continue;
        for (const sa of segData.agents) {
          if (sa.orderCount > 0) {
            orderedIds.add(sa.agentId);
            const ex = agentInfo.get(sa.agentId) || { orderCount: 0, totalValue: 0 };
            agentInfo.set(sa.agentId, { orderCount: ex.orderCount + sa.orderCount, totalValue: ex.totalValue + sa.totalValue });
          }
        }
      }
    }
    return {
      orderedAgents: agents.filter(a => orderedIds.has(a.id)).map(a => ({ ...a, ...(agentInfo.get(a.id) || { orderCount: 0, totalValue: 0 }) })),
      unorderedAgents: agents.filter(a => !orderedIds.has(a.id)),
    };
  })();

  const selectedOffice = offices.find(o => o.id === selectedOfficeId);
  const selectedRoute = routes.find(r => r.id === selectedRouteId);
  const topLevelOffices = offices.filter(o => !o.parentId);
  const getSubOffices = (parentId: string) => offices.filter(o => o.parentId === parentId);

  function navigateToRoutes(officeId: string) {
    setSelectedOfficeId(officeId);
    setView('routes');
  }

  function navigateToRouteDetail(routeId: string) {
    setSelectedRouteId(routeId);
    setDetailTab('dispatch');
    setView('route_detail');
  }

  function goBack() {
    if (view === 'route_detail') { setSelectedRouteId(null); setView('routes'); }
    else if (view === 'routes') {
      if (hasSingleOffice) return;
      setSelectedOfficeId(null);
      setView('offices');
    }
  }

  if (view === 'offices') {
    if (hasSingleOffice) {
      return (
        <div className="pb-20">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <h1 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-5 w-5" /> Your MMO Office</h1>
            <p className="text-[13px] text-blue-100 mt-0.5">{staffOfficeNames[0] || 'Loading...'}</p>
          </div>
          <div className="p-6 text-center">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
              <p className="text-sm text-gray-500">Loading your office...</p>
            </div>
          </div>
        </div>
      );
    }
    if (hasMultipleOffices) {
      return (
        <div className="pb-20">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <h1 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-5 w-5" /> Your MMO Offices</h1>
            <p className="text-[13px] text-blue-100 mt-0.5">{allowedOffices.length} offices assigned</p>
          </div>
          <div className="p-3 space-y-2">
            {officesLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : allowedOffices.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-[15px]">No matching offices found</p>
              </div>
            ) : (
              allowedOffices.map(office => (
                <div key={office.id} className="bg-white border rounded-xl p-3 flex items-center gap-3 cursor-pointer active:bg-gray-50" onClick={() => navigateToRoutes(office.id)}>
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[15px]">{office.officeName}</p>
                    <p className="text-[13px] text-gray-500">{office.officeCode}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              ))
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="pb-20">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <h1 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-5 w-5" /> MMO Offices</h1>
          <p className="text-[13px] text-blue-100 mt-0.5">{offices.length} offices configured</p>
        </div>
        <div className="p-3 space-y-2">
          {officesLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : offices.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-[15px] text-gray-500">No MMO offices configured</p>
              <p className="text-[13px] text-gray-400 mt-1">Contact admin to set up offices</p>
            </div>
          ) : (
            topLevelOffices.map(office => {
              const subs = getSubOffices(office.id);
              return (
                <div key={office.id} className="bg-white rounded-xl border shadow-sm overflow-hidden" onClick={() => navigateToRoutes(office.id)}>
                  <div className="p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[15px] truncate">{office.officeName}</p>
                        <Badge variant="outline" className="text-[12px] font-mono shrink-0">{office.officeCode}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[13px] text-gray-500">
                        {office.contactPerson && <span className="flex items-center gap-1"><User className="h-3 w-3" />{office.contactPerson}</span>}
                        {office.contactPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{office.contactPhone}</span>}
                      </div>
                      {office.address && <p className="text-[13px] text-gray-400 mt-0.5 truncate flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{office.address}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                  {subs.length > 0 && (
                    <div className="px-3.5 pb-2.5 flex flex-wrap gap-1">
                      {subs.map(sub => (
                        <Badge key={sub.id} variant="secondary" className="text-[12px] cursor-pointer" onClick={(e) => { e.stopPropagation(); navigateToRoutes(sub.id); }}>
                          {sub.officeName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (view === 'routes') {
    return (
      <div className="pb-20">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <button onClick={goBack} className="flex items-center gap-1 text-blue-100 text-[13px] mb-1">
            <ChevronLeft className="h-4 w-4" /> Back to Offices
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Route className="h-5 w-5" /> {selectedOffice?.officeName || "Routes"}
          </h1>
          <p className="text-[13px] text-blue-100 mt-0.5">{routes.length} routes</p>
        </div>
        <div className="p-3 space-y-2">
          {routesLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : routes.length === 0 ? (
            <div className="text-center py-12">
              <Route className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-[15px] text-gray-500">No routes for this office</p>
            </div>
          ) : (
            routes.map(route => (
              <div key={route.id} className="bg-white rounded-xl border shadow-sm p-3.5 flex items-center gap-3" onClick={() => navigateToRouteDetail(route.id)}>
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <Route className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[15px] truncate">{route.routeName}</p>
                    <Badge variant="outline" className="text-[12px] font-mono shrink-0">{route.routeCode}</Badge>
                  </div>
                  {route.areaDescription && <p className="text-[13px] text-gray-500 mt-0.5 truncate">{route.areaDescription}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (view === 'route_detail') {
    const segData = dispatchData?.segments?.[dispatchSegment];
    const segIcons: Record<string, typeof Milk> = { 'Fresh Milk': Milk, 'Products': Package, 'Ice Cream': IceCream };
    const segColors: Record<string, string> = { 'Fresh Milk': 'bg-green-100 text-green-700', 'Products': 'bg-blue-100 text-blue-700', 'Ice Cream': 'bg-purple-100 text-purple-700' };

    const shareWhatsApp = () => {
      if (!segData) return;
      const officeLabel = selectedOffice?.officeName || '';
      const routeLabel = selectedRoute?.routeName || '';
      const shiftFilter = dispatchSegment === 'Fresh Milk' ? freshMilkShift : 'morning';
      const shiftEmoji = shiftFilter === 'morning' ? '☀️ ' : shiftFilter === 'evening' ? '🌙 ' : '';
      const shiftLabel = shiftFilter === 'morning' ? 'Morning' : shiftFilter === 'evening' ? 'Evening' : '';
      let text = `*${officeLabel} - ${routeLabel}*\n`;
      text += `*${dispatchSegment} — Dispatch Report*\n`;
      text += `📅 ${mmoFormatDate(dispatchDate)}${shiftLabel ? ` | ${shiftEmoji}${shiftLabel} Shift` : ''}\n`;
      text += `📊 ${segData.totalOrders} orders | ₹${segData.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}\n\n`;
      const filteredAgents = segData.agents.filter(a => dispatchSegment === 'Fresh Milk' ? agentHasShiftOrders(a, freshMilkShift) : a.orderCount > 0);
      filteredAgents.forEach((a, idx) => {
        text += `${idx + 1}. *${a.agentCode}* ${a.agentName}\n`;
        if (dispatchSegment === 'Fresh Milk' && shiftFilter === 'combined') {
          const mItems = Object.entries(a.morning).filter(([_, q]) => q > 0).map(([p, q]) => `   ☀️ ${shortProductName(p)}: ${q}`);
          const eItems = Object.entries(a.evening).filter(([_, q]) => q > 0).map(([p, q]) => `   🌙 ${shortProductName(p)}: ${q}`);
          if (mItems.length) text += mItems.join('\n') + '\n';
          if (eItems.length) text += eItems.join('\n') + '\n';
        } else {
          const bucket = dispatchSegment === 'Fresh Milk' ? (shiftFilter === 'morning' ? a.morning : a.evening) : a.morning;
          const items = Object.entries(bucket).filter(([_, q]) => q > 0).map(([p, q]) => `   ${shortProductName(p)}: ${q}`);
          if (items.length) text += items.join('\n') + '\n';
        }
        const val = dispatchSegment === 'Fresh Milk' ? (shiftFilter === 'morning' ? a.morningValue : shiftFilter === 'evening' ? a.eveningValue : a.totalValue) : a.totalValue;
        text += `   💰 ₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}\n`;
      });
      const encoded = encodeURIComponent(text);
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    const openStatementPDF = async () => {
      if (!selectedRoute) return;
      const res = await fetch(`/api/mmo/routes/${selectedRoute.id}/payment-statement?date=${dispatchDate}`, { credentials: 'include' });
      if (!res.ok) { alert('Failed to fetch payment statement: ' + (await res.text())); return; }
      const data = await res.json();
      const rows: any[] = data.rows || [];
      if (rows.length === 0) { alert('No online payment transactions found for this date.'); return; }
      const thS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#f0fdf4;text-align:center;white-space:nowrap;';
      const tdS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:center;white-space:nowrap;';
      const tdLS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:left;';
      const tdRS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:right;font-weight:600;';
      const totS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#dcfce7;text-align:right;';
      const totLS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#dcfce7;text-align:center;';
      const fmt = (d: string) => { const [y,m,day] = d.split('-'); return `${day}/${m}/${y}`; };
      const orderDate = data.orderDate ? fmt(data.orderDate) : fmt(dispatchDate);
      const deliverFor = data.dispatchDate ? fmt(data.dispatchDate) : '';
      const totalAmount = rows.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const dataRows = rows.map((r: any) => `<tr><td style="${tdS}">${r.sno}</td><td style="${tdS}">${r.zone}</td><td style="${tdS}">${(r.shift||'morning').charAt(0).toUpperCase()+(r.shift||'morning').slice(1)}</td><td style="${tdS}">${r.boothCode}</td><td style="${tdLS}">${r.agentName}</td><td style="${tdS}">${r.orderId}</td><td style="${tdS}">${r.pgName}</td><td style="${tdS}">${r.txnType}</td><td style="${tdRS}">₹${r.amount.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td style="${tdLS};font-size:10px;">${r.txnId}</td></tr>`).join('');
      const totalRow = `<tr><td colspan="8" style="${totLS}">TOTAL — ${rows.length} transaction${rows.length!==1?'s':''}</td><td style="${totS}">₹${totalAmount.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td style="${totLS}"></td></tr>`;
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${selectedOffice?.officeName} — ${selectedRoute.routeName} Online Payment Statement</title><style>@page{size:A4 portrait;margin:10mm;}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,Helvetica,sans-serif;}.header{text-align:center;margin-bottom:10px;border-bottom:2px solid #166534;padding-bottom:8px;}.header h1{font-size:15px;font-weight:bold;color:#166534;}.header h2{font-size:13px;font-weight:600;margin-top:2px;}.header p{font-size:11px;color:#555;margin-top:3px;}table{width:100%;border-collapse:collapse;}</style></head><body><div class="header"><h1>${selectedOffice?.officeName}</h1><h2>Online Payment Statement — ${selectedRoute.routeName}</h2><p>Order Date: ${orderDate}${deliverFor ? ` | Deliver For: ${deliverFor}` : ''}</p></div><table><thead><tr><th style="${thS}">S.No</th><th style="${thS}">Zone</th><th style="${thS}">Shift</th><th style="${thS}">Booth Code</th><th style="${thS};text-align:left;">Agent Name</th><th style="${thS}">Order #</th><th style="${thS}">PG Name</th><th style="${thS}">Txn Type</th><th style="${thS};text-align:right;">Amount (₹)</th><th style="${thS}">Txn ID</th></tr></thead><tbody>${dataRows}${totalRow}</tbody></table></body></html>`;
      const win = window.open('', '_blank'); if (!win) return;
      win.document.write(html); win.document.close(); win.focus(); win.print();
    };

    const buildCollectionPWAHtml = (data: any) => {
      const rows: any[] = data.rows || [];
      const fmt = (d: string) => { const [y,m,day] = d.split('-'); return `${day}/${m}/${y}`; };
      const orderDate = data.orderDate ? fmt(data.orderDate) : fmt(dispatchDate);
      const deliverFor = data.dispatchDate ? fmt(data.dispatchDate) : '';
      const thS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#eef2ff;text-align:center;white-space:nowrap;';
      const tdS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:center;white-space:nowrap;';
      const tdLS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:left;';
      const tdRS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:right;font-weight:600;';
      const totS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#e0e7ff;text-align:right;';
      const totLS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#e0e7ff;text-align:center;';
      const modeColor = (m: string) => m==='Cash'?'#065f46':m==='Razorpay'?'#1d4ed8':m==='Cashfree'?'#7c3aed':'#374151';
      const dataRows = rows.map((r: any) => `<tr><td style="${tdS}">${r.sno}</td><td style="${tdS}">${r.zone}</td><td style="${tdS}">${(r.shift||'morning').charAt(0).toUpperCase()+(r.shift||'morning').slice(1)}</td><td style="${tdS}">${r.boothCode}</td><td style="${tdLS}">${r.agentName}</td><td style="${tdS}">${r.orderId}</td><td style="${tdS}color:${modeColor(r.paymentMode)};font-weight:600;">${r.paymentMode}</td><td style="${tdRS}">₹${r.amount.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td style="${tdLS};font-size:10px;">${r.txnId||''}</td></tr>`).join('');
      const total = data.summary?.totalAmount ?? rows.reduce((s:number,r:any)=>s+r.amount,0);
      const byMode: Record<string,number> = data.summary?.byMode??{};
      const modeBreakdown = Object.entries(byMode).map(([m,v])=>`${m}: ₹${(v as number).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`).join(' | ');
      const totalRow = `<tr><td colspan="7" style="${totLS}">${modeBreakdown||'TOTAL'}</td><td style="${totS}">₹${total.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td style="${totLS}"></td></tr>`;
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${selectedOffice?.officeName} — ${selectedRoute?.routeName} Collection Statement</title><style>@page{size:A4 landscape;margin:10mm;}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,Helvetica,sans-serif;}.header{text-align:center;margin-bottom:10px;border-bottom:2px solid #4338ca;padding-bottom:8px;}.header h1{font-size:15px;font-weight:bold;color:#4338ca;}.header h2{font-size:13px;font-weight:600;margin-top:2px;}.header p{font-size:11px;color:#555;margin-top:3px;}table{width:100%;border-collapse:collapse;}</style></head><body><div class="header"><h1>${selectedOffice?.officeName}</h1><h2>Collection Statement — ${selectedRoute?.routeName}</h2><p>Order Date: ${orderDate}${deliverFor?` | Deliver For: ${deliverFor}`:''}</p></div><table><thead><tr><th style="${thS}">S.No</th><th style="${thS}">Zone</th><th style="${thS}">Shift</th><th style="${thS}">Booth Code</th><th style="${thS};text-align:left;">Agent Name</th><th style="${thS}">Order #</th><th style="${thS}">Payment Mode</th><th style="${thS};text-align:right;">Amount (₹)</th><th style="${thS}">Txn ID</th></tr></thead><tbody>${dataRows}${totalRow}</tbody></table></body></html>`;
    };

    const fetchCollectionData = async () => {
      if (!selectedRoute) return null;
      const res = await fetch(`/api/mmo/routes/${selectedRoute.id}/collection-statement?date=${dispatchDate}`, { credentials: 'include' });
      if (!res.ok) { alert('Failed to fetch collection statement: ' + (await res.text())); return null; }
      return await res.json();
    };

    const openCollectionPDF = async () => {
      const data = await fetchCollectionData();
      if (!data) return;
      if (!data.rows?.length) { alert('No matched orders found for this date.'); return; }
      const html = buildCollectionPWAHtml(data);
      const win = window.open('', '_blank'); if (!win) return;
      win.document.write(html); win.document.close(); win.focus(); win.print();
    };

    const downloadCollectionPDF = async () => {
      const data = await fetchCollectionData();
      if (!data) return;
      const html = buildCollectionPWAHtml(data);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Collection_${(selectedRoute?.routeName||'Route').replace(/\s+/g,'_')}_${dispatchDate}.html`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    const shareCollectionWhatsApp = async () => {
      const data = await fetchCollectionData();
      if (!data) return;
      const rows: any[] = data.rows || [];
      const fmt = (d: string) => { const [y,m,day] = d.split('-'); return `${day}/${m}/${y}`; };
      let text = `*${selectedOffice?.officeName} — Collection Statement*\n*Route:* ${selectedRoute?.routeName}\n*Order Date:* ${data.orderDate ? fmt(data.orderDate) : fmt(dispatchDate)}\n\n`;
      rows.forEach((r: any) => {
        text += `${r.sno}. ${r.agentName} (${r.boothCode}) — ₹${r.amount.toLocaleString('en-IN',{maximumFractionDigits:2})} [${r.paymentMode}]`;
        if (r.txnId) text += ` Txn: ${r.txnId}`;
        text += '\n';
      });
      const byMode: Record<string,number> = data.summary?.byMode??{};
      if (Object.keys(byMode).length) { text += '\n*Summary:*\n'; Object.entries(byMode).forEach(([m,v])=>{ text += `${m}: ₹${(v as number).toLocaleString('en-IN',{maximumFractionDigits:2})}\n`; }); }
      const total = data.summary?.totalAmount ?? rows.reduce((s:number,r:any)=>s+r.amount,0);
      text += `*TOTAL: ₹${total.toLocaleString('en-IN',{maximumFractionDigits:2})}*`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
      <div className="pb-20">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <button onClick={goBack} className="flex items-center gap-1 text-blue-100 text-[13px] mb-1">
            <ChevronLeft className="h-4 w-4" /> Back to Routes
          </button>
          <h1 className="text-lg font-bold truncate">{selectedRoute?.routeName || "Route"}</h1>
          <p className="text-[13px] text-blue-100 mt-0.5">{selectedOffice?.officeName} · {selectedRoute?.routeCode}</p>
        </div>

        <div className="flex border-b bg-white sticky top-0 z-10">
          <button className={`flex-1 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${detailTab === 'dispatch' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`} onClick={() => setDetailTab('dispatch')}>
            Dispatch Report
          </button>
          <button className={`flex-1 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${detailTab === 'agents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`} onClick={() => setDetailTab('agents')}>
            Agents ({agents.length})
          </button>
        </div>

        {detailTab === 'dispatch' && (
          <div className="p-3 space-y-3">
            <style>{`
              @media print {
                @page { size: landscape; margin: 8mm; }
                body * { visibility: hidden; }
                .pwa-print-area, .pwa-print-area * { visibility: visible; }
                .pwa-print-area { position: absolute; left: 0; top: 0; width: 100%; overflow: visible; }
                .pwa-print-area table { font-size: 10px; width: 100%; table-layout: auto; }
                .pwa-print-area th, .pwa-print-area td { padding: 2px 3px; white-space: nowrap; }
                .pwa-no-print { display: none !important; }
                .pwa-print-header { display: block !important; }
              }
              .pwa-print-header { display: none; }
            `}</style>
            <div className="flex items-center gap-2">
              <label className="text-[13px] text-gray-500 shrink-0">Date:</label>
              <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="flex-1 h-8 text-[13px] border rounded-lg px-2 bg-white" />
            </div>

            {dispatchLoading ? (
              <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : !dispatchData?.segments ? (
              <div className="text-center py-8">
                <Info className="h-8 w-8 mx-auto text-amber-400 mb-2" />
                <p className="text-[15px] text-gray-500">No dispatch data available</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-blue-700">{dispatchData.summary.totalOrders}</p>
                    <p className="text-[12px] text-gray-500">Matched Orders</p>
                    {dispatchData.unmatchedOrderCount > 0 && (
                      <button onClick={() => setShowUnmatched(!showUnmatched)} className="text-[12px] text-orange-600 font-medium underline underline-offset-2 hover:text-orange-700">
                        {dispatchData.unmatchedOrderCount} unmatched
                      </button>
                    )}
                    {dispatchData.unmatchedOrderCount === 0 && <p className="text-[12px] text-green-600">0 unmatched</p>}
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-green-700">₹{dispatchData.summary.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                    <p className="text-[12px] text-gray-500">Total Value</p>
                  </div>
                </div>

                {showUnmatched && dispatchData.unmatchedOrders && dispatchData.unmatchedOrders.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[14px] font-semibold text-orange-800">Unmatched Orders ({dispatchData.unmatchedOrders.length})</h4>
                      <button onClick={() => setShowUnmatched(false)} className="text-orange-400 hover:text-orange-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-orange-600 mb-2">These orders could not be matched to any agent on this route</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-orange-100">
                            <th className="text-left p-1.5 font-medium text-orange-800">S.No</th>
                            <th className="text-left p-1.5 font-medium text-orange-800">Customer Name</th>
                            <th className="text-left p-1.5 font-medium text-orange-800">Phone</th>
                            <th className="text-left p-1.5 font-medium text-orange-800">Segment</th>
                            <th className="text-left p-1.5 font-medium text-orange-800">Shift</th>
                            <th className="text-left p-1.5 font-medium text-orange-800">Items</th>
                            <th className="text-right p-1.5 font-medium text-orange-800">Value (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dispatchData.unmatchedOrders.map((uo, idx) => (
                            <tr key={uo.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-orange-50'}>
                              <td className="p-1.5">{idx + 1}</td>
                              <td className="p-1.5 font-medium">{uo.customerName}</td>
                              <td className="p-1.5">
                                {uo.customerPhone ? (
                                  <a href={`tel:${uo.customerPhone}`} className="text-blue-600 underline font-mono text-[11px]">{uo.customerPhone}</a>
                                ) : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="p-1.5">{uo.productSegment}</td>
                              <td className="p-1.5 capitalize">{uo.deliveryShift === 'morning' ? 'AM' : 'PM'}</td>
                              <td className="p-1.5">{uo.items.map(it => `${it.name} ×${it.quantity}`).join(', ')}</td>
                              <td className="p-1.5 text-right font-medium">₹{uo.total.toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                          <tr className="bg-orange-200 font-semibold">
                            <td colSpan={6} className="p-1.5 text-right text-orange-900">Total</td>
                            <td className="p-1.5 text-right text-orange-900">₹{dispatchData.unmatchedOrders.reduce((s, o) => s + o.total, 0).toLocaleString("en-IN")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-1.5">
                  {(['Fresh Milk', 'Products', 'Ice Cream'] as const).map(seg => {
                    const sd = dispatchData.segments[seg];
                    const isActive = dispatchSegment === seg;
                    const SegIcon = segIcons[seg];
                    return (
                      <button key={seg} onClick={() => setDispatchSegment(seg)}
                        className={`flex-1 rounded-lg p-2 text-center border transition-colors ${isActive ? `${segColors[seg]} border-current` : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        <SegIcon className="h-4 w-4 mx-auto mb-0.5" />
                        <p className="text-[12px] font-medium">{seg.replace('Fresh ', 'F.')}</p>
                        <p className="text-[12px]">{sd?.totalOrders || 0}</p>
                      </button>
                    );
                  })}
                </div>

                {dispatchData.summary.totalOrders === 0 ? (
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <Info className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                    <p className="text-[13px] text-gray-600">No matched orders for {mmoFormatDate(dispatchData.orderDate)}</p>
                  </div>
                ) : !segData || segData.totalOrders === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-[13px] text-gray-500">No {dispatchSegment} orders for this date</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold">{dispatchSegment}</span>
                        <Badge variant="outline" className="text-[12px]">{segData.totalOrders} orders</Badge>
                        <Badge variant="outline" className="text-[12px] text-green-700">₹{segData.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 pwa-no-print">
                        <button onClick={openStatementPDF} className="p-1.5 bg-emerald-100 rounded-lg" title="₹ Online Statement">
                          <Receipt className="h-4 w-4 text-emerald-700" />
                        </button>
                        <button onClick={openCollectionPDF} className="p-1.5 bg-indigo-100 rounded-lg" title="Collection Print">
                          <FileText className="h-4 w-4 text-indigo-700" />
                        </button>
                        <button onClick={downloadCollectionPDF} className="p-1.5 bg-indigo-50 rounded-lg" title="Collection Download">
                          <Download className="h-4 w-4 text-indigo-600" />
                        </button>
                        <button onClick={shareCollectionWhatsApp} className="p-1.5 bg-indigo-50 rounded-lg" title="Collection WhatsApp">
                          <Share2 className="h-4 w-4 text-indigo-600" />
                        </button>
                        <button onClick={shareWhatsApp} className="p-1.5 bg-green-100 rounded-lg" title="Dispatch WhatsApp">
                          <Share2 className="h-4 w-4 text-green-600" />
                        </button>
                        <button onClick={() => window.print()} className="p-1.5 bg-gray-100 rounded-lg" title="Print">
                          <Printer className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {dispatchSegment === 'Fresh Milk' && (
                      <div className="flex rounded-lg border overflow-hidden">
                        {(['morning', 'evening', 'combined'] as const).map(s => (
                          <button key={s} onClick={() => setFreshMilkShift(s)}
                            className={`flex-1 px-2 py-1.5 text-[12px] font-medium transition-colors ${freshMilkShift === s ? 'bg-green-600 text-white' : 'bg-white text-gray-500'}`}>
                            {s === 'morning' ? '☀️ AM' : s === 'evening' ? '🌙 PM' : '📋 All'}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="pwa-print-area border rounded-lg overflow-x-auto">
                      <div className="pwa-print-header text-center mb-3 pt-2">
                        <p className="text-[16px] font-bold">{dispatchSegment} — Dispatch Report</p>
                        <p className="text-[13px] text-gray-600">{selectedOffice?.officeName} · {selectedRoute?.routeName} · {mmoFormatDate(dispatchDate)}</p>
                        {dispatchSegment === 'Fresh Milk' && freshMilkShift !== 'combined' && (
                          <p className="text-[12px] text-gray-500">{freshMilkShift === 'morning' ? '☀️ Morning Shift' : '🌙 Evening Shift'}</p>
                        )}
                      </div>
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className={dispatchSegment === 'Fresh Milk' ? 'bg-green-50' : dispatchSegment === 'Products' ? 'bg-blue-50' : 'bg-purple-50'}>
                            <th className="px-1.5 py-1.5 text-left font-medium">#</th>
                            <th className="px-1.5 py-1.5 text-left font-medium">Code</th>
                            <th className="px-1.5 py-1.5 text-left font-medium">Agent</th>
                            {dispatchSegment === 'Fresh Milk' && freshMilkShift === 'combined' ? (
                              segData.products.map(p => (
                                <th key={p} className="px-1 py-1.5 text-center font-medium border-l" colSpan={2}>{shortProductName(p)}</th>
                              ))
                            ) : (
                              segData.products.map(p => (
                                <th key={p} className="px-1 py-1.5 text-center font-medium border-l">{shortProductName(p)}</th>
                              ))
                            )}
                            <th className="px-1.5 py-1.5 text-right font-medium border-l">₹</th>
                          </tr>
                          {dispatchSegment === 'Fresh Milk' && freshMilkShift === 'combined' && (
                            <tr className="bg-green-50">
                              <th colSpan={3}></th>
                              {segData.products.map(p => (
                                <Fragment key={`h-${p}`}>
                                  <th className="px-1 py-0.5 text-center text-[11px] border-l bg-yellow-50">M</th>
                                  <th className="px-1 py-0.5 text-center text-[11px] bg-blue-50">E</th>
                                </Fragment>
                              ))}
                              <th className="border-l"></th>
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {segData.agents.filter(a => dispatchSegment === 'Fresh Milk' ? agentHasShiftOrders(a, freshMilkShift) : a.orderCount > 0).map((a, idx) => (
                            <tr key={a.agentId} className="border-t">
                              <td className="px-1.5 py-1">{idx + 1}</td>
                              <td className="px-1.5 py-1 font-mono">{a.agentCode}</td>
                              <td className="px-1.5 py-1 font-medium truncate max-w-[80px]">{a.agentName}</td>
                              {dispatchSegment === 'Fresh Milk' && freshMilkShift === 'combined' ? (
                                segData.products.map(p => (
                                  <Fragment key={`${a.agentId}-${p}`}>
                                    <td className="px-1 py-1 text-center border-l">{a.morning[p] || '—'}</td>
                                    <td className="px-1 py-1 text-center">{a.evening[p] || '—'}</td>
                                  </Fragment>
                                ))
                              ) : (
                                segData.products.map(p => {
                                  if (dispatchSegment === 'Fresh Milk') {
                                    const bucket = freshMilkShift === 'morning' ? a.morning : a.evening;
                                    return <td key={`${a.agentId}-${p}`} className="px-1 py-1 text-center border-l">{bucket[p] || '—'}</td>;
                                  }
                                  const total = (a.morning[p] || 0) + (a.evening[p] || 0);
                                  return <td key={`${a.agentId}-${p}`} className="px-1 py-1 text-center border-l">{total || '—'}</td>;
                                })
                              )}
                              <td className="px-1.5 py-1 text-right font-medium border-l">
                                {dispatchSegment === 'Fresh Milk'
                                  ? (freshMilkShift === 'morning' ? a.morningValue : freshMilkShift === 'evening' ? a.eveningValue : a.totalValue).toLocaleString("en-IN", { maximumFractionDigits: 0 })
                                  : a.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          ))}
                          <tr className={`border-t font-bold ${dispatchSegment === 'Fresh Milk' ? 'bg-green-100' : dispatchSegment === 'Products' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                            <td className="px-1.5 py-1" colSpan={3}>TOTAL</td>
                            {dispatchSegment === 'Fresh Milk' && freshMilkShift === 'combined' ? (
                              segData.products.map(p => (
                                <Fragment key={`t-${p}`}>
                                  <td className="px-1 py-1 text-center border-l">{segData.productTotals[p]?.morning || 0}</td>
                                  <td className="px-1 py-1 text-center">{segData.productTotals[p]?.evening || 0}</td>
                                </Fragment>
                              ))
                            ) : (
                              segData.products.map(p => (
                                <td key={`t-${p}`} className="px-1 py-1 text-center border-l">
                                  {dispatchSegment === 'Fresh Milk' ? (segData.productTotals[p]?.[freshMilkShift] || 0) : ((segData.productTotals[p]?.morning || 0) + (segData.productTotals[p]?.evening || 0))}
                                </td>
                              ))
                            )}
                            <td className="px-1.5 py-1 text-right border-l">
                              ₹{(() => {
                                if (dispatchSegment !== 'Fresh Milk' || freshMilkShift === 'combined') return segData.totalValue;
                                return segData.agents.reduce((sum, a) => sum + (freshMilkShift === 'morning' ? a.morningValue : a.eveningValue), 0);
                              })().toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {detailTab === 'agents' && (
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-[13px] text-gray-500 shrink-0">Order Date:</label>
              <input type="date" value={agentListDate} onChange={e => setAgentListDate(e.target.value)} className="flex-1 h-8 text-[13px] border rounded-lg px-2 bg-white" />
            </div>

            <div className="flex rounded-lg border overflow-hidden">
              <button onClick={() => setAgentListTab('ordered')}
                className={`flex-1 px-2 py-2 text-[13px] font-medium transition-colors flex items-center justify-center gap-1 ${agentListTab === 'ordered' ? 'bg-green-600 text-white' : 'bg-white text-gray-500'}`}>
                <CheckCircle className="h-3 w-3" /> Ordered ({orderedAgents.length})
              </button>
              <button onClick={() => setAgentListTab('unordered')}
                className={`flex-1 px-2 py-2 text-[13px] font-medium transition-colors flex items-center justify-center gap-1 ${agentListTab === 'unordered' ? 'bg-red-500 text-white' : 'bg-white text-gray-500'}`}>
                <XCircle className="h-3 w-3" /> Unordered ({unorderedAgents.length})
              </button>
            </div>

            {agentListTab === 'ordered' ? (
              orderedAgents.length === 0 ? (
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <Info className="h-6 w-6 mx-auto text-amber-400 mb-1" />
                  <p className="text-[13px] text-gray-600">No agents have placed orders for {mmoFormatDate(validAgentListDate)}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderedAgents.map((agent, idx) => (
                    <div key={agent.id} className="bg-white rounded-lg border p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-gray-400 w-5">{idx + 1}</span>
                          <div>
                            <p className="text-[13px] font-medium">{agent.agentName}</p>
                            <p className="text-[12px] text-gray-500">{agent.agentCode} · {agent.pointName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-100 text-green-700 text-[12px]">{agent.orderCount} orders</Badge>
                          <p className="text-[12px] font-medium mt-0.5">₹{agent.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[12px] text-gray-400">
                        <Badge variant="outline" className="text-[11px]">{agent.segment}</Badge>
                        {agent.mobileNo && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{agent.mobileNo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              unorderedAgents.length === 0 ? (
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-1" />
                  <p className="text-[13px] text-gray-600">All agents have placed orders for {mmoFormatDate(validAgentListDate)}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unorderedAgents.map((agent, idx) => (
                    <div key={agent.id} className="bg-white rounded-lg border p-3 border-l-2 border-l-red-300">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-gray-400 w-5">{idx + 1}</span>
                        <div>
                          <p className="text-[13px] font-medium">{agent.agentName}</p>
                          <p className="text-[12px] text-gray-500">{agent.agentCode} · {agent.pointName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[12px] text-gray-400">
                        <Badge variant="outline" className="text-[11px]">{agent.segment}</Badge>
                        {agent.mobileNo && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{agent.mobileNo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

function AccountTab({ merchant, staffSession, ordersData, onLogout }: {
  merchant: any;
  staffSession: any;
  ordersData: any[];
  onLogout: () => void;
}) {
  const staffName = staffSession?.name || merchant?.businessName || 'Staff Member';
  const staffRole = staffSession?.designation || staffSession?.role || staffSession?.accessLevel || 'Staff';
  const parsedOffices = parseStaffOffices(staffSession?.assignedOffice);
  const assignedOffice = parsedOffices.length > 0 ? parsedOffices.join(', ') : 'All Offices';
  const assignedSegments = staffSession?.assignedSegments || [];

  const todayOrders = ordersData.filter((o: any) => {
    const d = o.createdAt ? new Date(o.createdAt) : null;
    if (!d) return false;
    return d.toDateString() === new Date().toDateString();
  });

  const thisWeekOrders = ordersData.filter((o: any) => {
    const d = o.createdAt ? new Date(o.createdAt) : null;
    if (!d) return false;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
  });

  return (
    <div className="pb-24">
      <div className="px-4 pt-6 pb-4 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <User className="h-10 w-10 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{staffName}</h3>
        <p className="text-[15px] text-gray-500 capitalize">{staffRole}</p>
        <p className="text-[13px] text-gray-400 mt-1">{merchant?.businessName || 'Aavin District Union'}</p>
      </div>

      <div className="px-4 mb-4">
        <div className="bg-gray-50 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[13px] text-gray-400">Assigned Office</p>
              <p className="text-[15px] font-medium">{assignedOffice}</p>
            </div>
          </div>
          {assignedSegments.length > 0 && (
            <div className="flex items-start gap-3">
              <Box className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] text-gray-400">Assigned Segments</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {assignedSegments.map((seg: string, idx: number) => (
                    <Badge key={idx} className="bg-blue-100 text-blue-700 text-[13px]">{seg}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mb-4">
        <p className="font-bold text-[15px] mb-2">My Activity</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-[13px] text-gray-400">Processed Today</p>
            <p className="text-xl font-bold text-gray-900">{todayOrders.length}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-[13px] text-gray-400">This Week</p>
            <p className="text-xl font-bold text-gray-900">{thisWeekOrders.length}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-4">
        <p className="font-bold text-[15px] mb-2">Recent Activity</p>
        <div className="space-y-2">
          {ordersData.slice(0, 5).map((order: any) => (
            <div key={order.id} className="flex items-center gap-3 py-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'pending' ? 'bg-orange-100' :
                order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100' :
                order.status === 'cancelled' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                {order.status === 'completed' || order.status === 'delivered' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : order.status === 'cancelled' ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : order.status === 'pending' ? (
                  <Clock className="h-4 w-4 text-orange-600" />
                ) : (
                  <Activity className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[15px]">{formatOrderId({ id: String(order.id), orderNumber: order.orderNumber, displayId: order.displayId })} - <span className="capitalize">{order.status?.replace(/_/g, ' ')}</span></p>
                <p className="text-[13px] text-gray-400">{timeAgo(order.createdAt)}</p>
              </div>
            </div>
          ))}
          {ordersData.length === 0 && (
            <p className="text-center text-gray-400 py-4 text-[15px]">No recent activity</p>
          )}
        </div>
      </div>

      <div className="px-4">
        <Button onClick={onLogout} variant="outline" className="w-full h-11 rounded-xl text-red-600 border-red-200 hover:bg-red-50">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

function getDemoOrders(): any[] {
  const now = new Date();
  const demoItems = [
    { name: 'Aavin Full Cream Milk 500ml', price: 28, segment: 'Fresh Milk', productCode: 'FM-001' },
    { name: 'Aavin Toned Milk 1L', price: 50, segment: 'Fresh Milk', productCode: 'FM-002' },
    { name: 'Aavin Standardised Milk 500ml', price: 32, segment: 'Fresh Milk', productCode: 'FM-003' },
    { name: 'Aavin Curd 400g', price: 30, segment: 'Fresh Milk', productCode: 'FM-006' },
    { name: 'Aavin Ghee 500ml', price: 260, segment: 'Products', productCode: 'PR-001' },
    { name: 'Aavin Butter 100g', price: 52, segment: 'Products', productCode: 'PR-002' },
    { name: 'Aavin Paneer 200g', price: 90, segment: 'Products', productCode: 'PR-003' },
    { name: 'Aavin Milk Peda 250g', price: 130, segment: 'Products', productCode: 'PR-005' },
    { name: 'Aavin Vanilla Cup 100ml', price: 30, segment: 'Ice Cream', productCode: 'IC-001' },
    { name: 'Aavin Butterscotch Bar 65ml', price: 22, segment: 'Ice Cream', productCode: 'IC-002' },
    { name: 'Aavin Chocolate Cone', price: 40, segment: 'Ice Cream', productCode: 'IC-003' },
    { name: 'Aavin Family Pack Vanilla 1L', price: 150, segment: 'Ice Cream', productCode: 'IC-005' },
  ];
  const customers = [
    { name: 'Murugan Dairy Distributors', phone: '9876543201', role: 'WHOLESALE_DEALER' },
    { name: 'Sri Lakshmi Stores', phone: '9876543202', role: 'DEALER' },
    { name: 'Selvi Retail Shop', phone: '9876543203', role: 'RETAILER' },
    { name: 'Vel Murugan Agencies', phone: '9876543204', role: 'WHOLESALE_DEALER' },
    { name: 'Annamalai Hotel', phone: '9876543205', role: 'MRP' },
    { name: 'Ramesh Kumar', phone: '9876543210', role: 'MRP' },
    { name: 'Priya Sundaram', phone: '9876543211', role: 'MRP' },
  ];
  const statuses = ['delivered', 'delivered', 'delivered', 'pending', 'delivered', 'out_for_delivery', 'delivered', 'cancelled'];
  const orders: any[] = [];
  for (let i = 0; i < 24; i++) {
    const daysAgo = Math.floor(i / 3);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(8 + (i % 12), (i * 17) % 60);
    const cust = customers[i % customers.length];
    const numItems = 1 + (i % 3);
    const items: any[] = [];
    for (let j = 0; j < numItems; j++) {
      const item = demoItems[(i + j) % demoItems.length];
      const qty = 1 + ((i + j) % 5);
      items.push({ name: item.name, price: item.price, quantity: qty, unitPrice: item.price, segment: item.segment, productCode: item.productCode });
    }
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const tax = subtotal * 0.05;
    orders.push({
      id: `demo-${i + 1}`,
      customerName: cust.name, customerPhone: cust.phone, customerEmail: `${cust.name.toLowerCase().replace(/\s+/g, '.')}@demo.in`,
      items, subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), total: (subtotal + tax).toFixed(2),
      status: statuses[i % statuses.length], orderType: i < 16 ? 'B2B' : 'delivery',
      pricingRole: cust.role, productSegment: items[0].segment,
      createdAt: date.toISOString(),
    });
  }
  return orders;
}

function MilkDispatchPWAReport({ onBack, b2bMerchantId }: { onBack: () => void; b2bMerchantId?: string }) {
  const unionId = b2bMerchantId || 'merchant-3';
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [shift, setShift] = useState('combined');

  const { data: routes = [] } = useQuery<any[]>({
    queryKey: ['/api/milk-dispatch/routes', unionId],
    queryFn: async () => {
      const res = await fetch(`/api/milk-dispatch/routes?unionId=${unionId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    if (routes.length > 0 && !selectedRoute) {
      setSelectedRoute(routes[0].routeCode);
    }
  }, [routes, selectedRoute]);

  const { data: reportData, isLoading } = useQuery<any>({
    queryKey: ['/api/milk-dispatch/report', unionId, dispatchDate, selectedRoute, shift],
    queryFn: async () => {
      const res = await fetch(`/api/milk-dispatch/report?unionId=${unionId}&date=${dispatchDate}&routeCode=${selectedRoute}&shift=${shift}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedRoute,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/milk-dispatch/sync', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unionId, date: dispatchDate }),
      });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith('/api/milk-dispatch') }); },
  });

  const agents: any[] = reportData?.rows || [];
  const totals = reportData?.totals || {};
  const summary = reportData?.summary || {};

  const exportCSV = () => {
    const headers = ['S.No', 'Code', 'Agent Name', 'OB', 'M-FCM1000', 'M-FCM500', 'M-DLT500', 'M-STD200', 'M-Total', 'E-FCM1000', 'E-FCM500', 'E-DLT500', 'E-STD200', 'E-Total', 'G.Total', 'Milk Value', 'Remittance', 'CB'];
    const rows = agents.map((a: any, i: number) => [
      i + 1, a.agentCode, a.agentName, a.ob || 0,
      a.morningFcm1000 || 0, a.morningFcm500 || 0, a.morningDlt500 || 0, a.morningStd200 || 0, a.morningTotal || 0,
      a.eveningFcm1000 || 0, a.eveningFcm500 || 0, a.eveningDlt500 || 0, a.eveningStd200 || 0, a.eveningTotal || 0,
      a.grandTotal || 0, a.milkValue || 0, a.remittance || 0, a.cb || 0
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const routeLabel = routes.find((r: any) => r.routeCode === selectedRoute)?.routeName || selectedRoute;
    link.download = `${unionId}_${routeLabel.replace(/\s+/g, '_')}_dispatch_${dispatchDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const routeName = routes.find((r: any) => r.routeCode === selectedRoute)?.routeName || selectedRoute;

  return (
    <div className="pb-24">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
        <button onClick={onBack} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="font-bold text-base flex-1">Daily Dispatch Report</h2>
        <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg text-[12px] font-medium text-green-700 flex items-center gap-1">
          <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? 'Syncing' : 'Sync'}
        </button>
        <button onClick={exportCSV} className="p-1.5 bg-blue-50 rounded-lg"><Download className="h-4 w-4 text-blue-600" /></button>
      </div>

      <div className="px-4 py-3 space-y-2 bg-gray-50 border-b">
        <div className="flex gap-2">
          <input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="flex-1 text-[15px] border rounded-lg px-3 py-2" />
          <select value={shift} onChange={e => setShift(e.target.value)} className="text-[15px] border rounded-lg px-3 py-2">
            <option value="combined">Both</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
        </div>
        <select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)} className="w-full text-[15px] border rounded-lg px-3 py-2">
          {routes.map((r: any) => <option key={r.routeCode} value={r.routeCode}>{r.routeName} ({r.routeCode})</option>)}
        </select>
      </div>

      <div className="px-4 py-3 grid grid-cols-2 gap-2">
        <div className="bg-blue-50 rounded-xl p-2.5 text-center">
          <p className="text-[11px] text-blue-600">Morning Pkts</p>
          <p className="text-lg font-bold text-blue-900">{summary.morningTotalPackets || 0}</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-2.5 text-center">
          <p className="text-[11px] text-indigo-600">Evening Pkts</p>
          <p className="text-lg font-bold text-indigo-900">{summary.eveningTotalPackets || 0}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-2.5 text-center">
          <p className="text-[11px] text-green-600">Milk Value</p>
          <p className="text-lg font-bold text-green-900">₹{(summary.totalMilkValue || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-2.5 text-center">
          <p className="text-[11px] text-amber-600">Net CB</p>
          <p className={`text-lg font-bold ${(summary.netClosingBalance || 0) < 0 ? 'text-red-600' : 'text-amber-900'}`}>₹{(summary.netClosingBalance || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-[15px]">No dispatch data for {dispatchDate}</div>
      ) : (
        <div className="px-2 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-1 py-1.5 text-left border border-blue-500">#</th>
                <th className="px-1 py-1.5 text-left border border-blue-500">Code</th>
                <th className="px-1 py-1.5 text-left border border-blue-500">Agent Name</th>
                <th className="px-1 py-1.5 text-right border border-blue-500">OB</th>
                <th className="px-1 py-1.5 text-right border border-blue-500" colSpan={5}>Morning (FCM1K|FCM5|DLT5|STD2|Tot)</th>
                <th className="px-1 py-1.5 text-right border border-blue-500" colSpan={5}>Evening (FCM1K|FCM5|DLT5|STD2|Tot)</th>
                <th className="px-1 py-1.5 text-right border border-blue-500">G.Tot</th>
                <th className="px-1 py-1.5 text-right border border-blue-500">Value</th>
                <th className="px-1 py-1.5 text-right border border-blue-500">Remt</th>
                <th className="px-1 py-1.5 text-right border border-blue-500">CB</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a: any, i: number) => {
                const cb = a.cb || 0;
                const hasSupply = (a.grandTotal || 0) > 0;
                const noRemit = hasSupply && !(a.remittance > 0);
                return (
                  <tr key={a.agentCode} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${cb < 0 ? 'bg-red-50' : ''}`}>
                    <td className="px-1 py-1 border">{i + 1}</td>
                    <td className="px-1 py-1 border font-mono">{a.agentCode}</td>
                    <td className="px-1 py-1 border truncate max-w-[100px]">{a.agentName}</td>
                    <td className="px-1 py-1 border text-right">{a.ob || 0}</td>
                    <td className="px-1 py-1 border text-right">{a.morningFcm1000 || '-'}</td>
                    <td className="px-1 py-1 border text-right">{a.morningFcm500 || '-'}</td>
                    <td className="px-1 py-1 border text-right">{a.morningDlt500 || '-'}</td>
                    <td className="px-1 py-1 border text-right">{a.morningStd200 || '-'}</td>
                    <td className="px-1 py-1 border text-right font-semibold bg-blue-50">{a.morningTotal || 0}</td>
                    <td className="px-1 py-1 border text-right">{a.eveningFcm1000 || '-'}</td>
                    <td className="px-1 py-1 border text-right">{a.eveningFcm500 || '-'}</td>
                    <td className="px-1 py-1 border text-right">{a.eveningDlt500 || '-'}</td>
                    <td className="px-1 py-1 border text-right">{a.eveningStd200 || '-'}</td>
                    <td className="px-1 py-1 border text-right font-semibold bg-indigo-50">{a.eveningTotal || 0}</td>
                    <td className="px-1 py-1 border text-right font-bold">{a.grandTotal || 0}</td>
                    <td className="px-1 py-1 border text-right">₹{(a.milkValue || 0).toLocaleString('en-IN')}</td>
                    <td className={`px-1 py-1 border text-right ${noRemit ? 'bg-amber-100 text-amber-700' : ''}`}>{a.remittance || 0}</td>
                    <td className={`px-1 py-1 border text-right font-bold ${cb < 0 ? 'text-red-600 bg-red-100' : ''}`}>{cb}</td>
                  </tr>
                );
              })}
              <tr className="bg-blue-100 font-bold text-[11px]">
                <td className="px-1 py-1.5 border" colSpan={3}>TOTAL ({agents.length} agents)</td>
                <td className="px-1 py-1.5 border text-right">{totals.ob || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.morningFcm1000 || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.morningFcm500 || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.morningDlt500 || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.morningStd200 || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.morningTotal || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.eveningFcm1000 || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.eveningFcm500 || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.eveningDlt500 || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.eveningStd200 || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.eveningTotal || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.grandTotal || 0}</td>
                <td className="px-1 py-1.5 border text-right">₹{(totals.milkValue || 0).toLocaleString('en-IN')}</td>
                <td className="px-1 py-1.5 border text-right">{totals.remittance || 0}</td>
                <td className="px-1 py-1.5 border text-right">{totals.cb || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-3 mt-2">
        <p className="text-[12px] text-gray-400 text-center">Route: {routeName} | Office: Edappadi | Rates: FCM1000=₹54, FCM500=₹27, DLT500=₹30, STD200=₹12</p>
      </div>
    </div>
  );
}

function ReportsTab({ ordersData, b2bMerchantId }: { ordersData: any[]; b2bMerchantId?: string }) {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: b2bUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/staff/b2b-users'],
    queryFn: async () => {
      const res = await fetch('/api/staff/b2b-users', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!b2bMerchantId,
  });

  const effectiveOrders = ordersData.length > 0 ? ordersData : getDemoOrders();
  const isDemo = ordersData.length === 0;

  if (selectedReport) {
    const filteredOrders = filterOrdersByRange(effectiveOrders, timeRange, dateFrom, dateTo);
    const allItems: Array<OrderItem & { orderTotal: number; customerName: string }> = [];
    filteredOrders.forEach((o: any) => {
      parseItems(o).forEach((item) => {
        allItems.push({ ...item, orderTotal: parseFloat(o.total) || 0, customerName: o.customerName || 'Customer' });
      });
    });
    const totalRevenue = filteredOrders.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);
    const rangeLabel = timeRange === 'today' ? 'Today' : timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : `${dateFrom} to ${dateTo}`;

    if (selectedReport === 'item') {
      const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      allItems.forEach((item) => {
        const name = item.name || item.productName || 'Unknown';
        const qty = item.quantity || 1;
        const rev = (item.price || item.unitPrice || 0) * qty;
        if (!itemMap[name]) itemMap[name] = { name, qty: 0, revenue: 0 };
        itemMap[name].qty += qty;
        itemMap[name].revenue += rev;
      });
      const sorted = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);
      const itemTotal = sorted.reduce((s, i) => s + i.revenue, 0);
      return (
        <div className="pb-24">
          <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
            <button onClick={() => setSelectedReport(null)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="font-bold text-base flex-1">Item-wise Sales Report</h2>
            <button onClick={() => downloadCSV(`item-report-${rangeLabel}.csv`, ['#', 'Item Name', 'Qty Sold', 'Revenue', 'Share (%)'], sorted.map((item, idx) => [String(idx + 1), item.name, String(item.qty), item.revenue.toFixed(2), itemTotal > 0 ? ((item.revenue / itemTotal) * 100).toFixed(1) : '0']))} className="p-1.5 bg-blue-50 rounded-lg">
              <Download className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          {isDemo && <div className="mx-4 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5"><p className="text-[13px] text-amber-700">Showing sample demo data</p></div>}
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} customFrom={dateFrom} customTo={dateTo} onCustomFromChange={setDateFrom} onCustomToChange={setDateTo} />
          <div className="px-4 py-2 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[13px] text-blue-600">Total Items</p>
              <p className="text-xl font-bold text-blue-900">{sorted.length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[13px] text-blue-600">Total Revenue</p>
              <p className="text-xl font-bold text-blue-900">₹{fmtShort(itemTotal)}</p>
            </div>
          </div>
          <div className="px-4 space-y-2">
            {sorted.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[13px] font-bold text-blue-600">{idx + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[15px] truncate">{item.name}</p>
                    <p className="text-[13px] text-gray-400">{fmtShort(item.qty)} units sold</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-[15px]">₹{fmtShort(item.revenue)}</p>
                  <p className="text-[13px] text-blue-600">{itemTotal > 0 ? ((item.revenue / itemTotal) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            ))}
            {sorted.length === 0 && <p className="text-center text-gray-400 py-8 text-[15px]">No item data for {rangeLabel}</p>}
          </div>
        </div>
      );
    }

    if (selectedReport === 'agent') {
      const agentMap: Record<string, { name: string; orderCount: number; totalValue: number }> = {};
      filteredOrders.forEach((o: any) => {
        const name = o.customerName || 'Customer';
        if (!agentMap[name]) agentMap[name] = { name, orderCount: 0, totalValue: 0 };
        agentMap[name].orderCount++;
        agentMap[name].totalValue += parseFloat(o.total) || 0;
      });
      const sorted = Object.values(agentMap).sort((a, b) => b.totalValue - a.totalValue);
      return (
        <div className="pb-24">
          <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
            <button onClick={() => setSelectedReport(null)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="font-bold text-base flex-1">Agent-wise Sales Report</h2>
            <button onClick={() => downloadCSV(`agent-report-${rangeLabel}.csv`, ['#', 'Agent Name', 'Orders', 'Total Value', 'Avg Order Value'], sorted.map((a, idx) => [String(idx + 1), a.name, String(a.orderCount), a.totalValue.toFixed(2), (a.orderCount > 0 ? a.totalValue / a.orderCount : 0).toFixed(2)]))} className="p-1.5 bg-blue-50 rounded-lg">
              <Download className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          {isDemo && <div className="mx-4 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5"><p className="text-[13px] text-amber-700">Showing sample demo data</p></div>}
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} customFrom={dateFrom} customTo={dateTo} onCustomFromChange={setDateFrom} onCustomToChange={setDateTo} />
          <div className="px-4 py-2 grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[12px] text-blue-600">Agents</p>
              <p className="text-lg font-bold text-blue-900">{sorted.length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[12px] text-blue-600">Orders</p>
              <p className="text-lg font-bold text-blue-900">{filteredOrders.length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[12px] text-blue-600">Revenue</p>
              <p className="text-lg font-bold text-blue-900">₹{fmtShort(totalRevenue)}</p>
            </div>
          </div>
          <div className="px-4 space-y-2">
            {sorted.map((agent, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[15px] truncate">{agent.name}</p>
                    <p className="text-[13px] text-gray-400">{agent.orderCount} order{agent.orderCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-[15px]">₹{fmtShort(agent.totalValue)}</p>
                  <p className="text-[13px] text-gray-400">Avg ₹{fmtShort(agent.orderCount > 0 ? agent.totalValue / agent.orderCount : 0)}</p>
                </div>
              </div>
            ))}
            {sorted.length === 0 && <p className="text-center text-gray-400 py-8 text-[15px]">No agent data for {rangeLabel}</p>}
          </div>
        </div>
      );
    }

    if (selectedReport === 'segment') {
      const segMap: Record<string, { segment: string; qty: number; revenue: number }> = {};
      allItems.forEach((item) => {
        const seg = item.segment || 'General';
        const qty = item.quantity || 1;
        const rev = (item.price || item.unitPrice || 0) * qty;
        if (!segMap[seg]) segMap[seg] = { segment: seg, qty: 0, revenue: 0 };
        segMap[seg].qty += qty;
        segMap[seg].revenue += rev;
      });
      const sorted = Object.values(segMap).sort((a, b) => b.revenue - a.revenue);
      const segTotal = sorted.reduce((s, i) => s + i.revenue, 0);
      const segColors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-indigo-500'];
      return (
        <div className="pb-24">
          <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
            <button onClick={() => setSelectedReport(null)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="font-bold text-base flex-1">Segment-wise Sales Report</h2>
            <button onClick={() => downloadCSV(`segment-report-${rangeLabel}.csv`, ['#', 'Segment', 'Qty Sold', 'Revenue', 'Share (%)'], sorted.map((seg, idx) => [String(idx + 1), seg.segment, String(seg.qty), seg.revenue.toFixed(2), segTotal > 0 ? ((seg.revenue / segTotal) * 100).toFixed(1) : '0']))} className="p-1.5 bg-blue-50 rounded-lg">
              <Download className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          {isDemo && <div className="mx-4 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5"><p className="text-[13px] text-amber-700">Showing sample demo data</p></div>}
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} customFrom={dateFrom} customTo={dateTo} onCustomFromChange={setDateFrom} onCustomToChange={setDateTo} />
          <div className="px-4 py-2 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[13px] text-blue-600">Segments</p>
              <p className="text-xl font-bold text-blue-900">{sorted.length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[13px] text-blue-600">Total Revenue</p>
              <p className="text-xl font-bold text-blue-900">₹{fmtShort(segTotal)}</p>
            </div>
          </div>
          {segTotal > 0 && (
            <div className="px-4 mb-3">
              <div className="flex rounded-full overflow-hidden h-3">
                {sorted.map((seg, idx) => (
                  <div key={idx} className={`${segColors[idx % segColors.length]} transition-all`} style={{ width: `${(seg.revenue / segTotal) * 100}%` }} />
                ))}
              </div>
            </div>
          )}
          <div className="px-4 space-y-2">
            {sorted.map((seg, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${segColors[idx % segColors.length]}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-[15px] truncate">{seg.segment}</p>
                    <p className="text-[13px] text-gray-400">{fmtShort(seg.qty)} units sold</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-[15px]">₹{fmtShort(seg.revenue)}</p>
                  <p className="text-[13px] text-blue-600">{segTotal > 0 ? ((seg.revenue / segTotal) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            ))}
            {sorted.length === 0 && <p className="text-center text-gray-400 py-8 text-[15px]">No segment data for {rangeLabel}</p>}
          </div>
        </div>
      );
    }

    if (selectedReport === 'daterange') {
      const dailyMap: Record<string, { date: string; orderCount: number; revenue: number }> = {};
      filteredOrders.forEach((o: any) => {
        const d = new Date(o.createdAt);
        const key = d.toISOString().split('T')[0];
        if (!dailyMap[key]) dailyMap[key] = { date: key, orderCount: 0, revenue: 0 };
        dailyMap[key].orderCount++;
        dailyMap[key].revenue += parseFloat(o.total) || 0;
      });
      const dailyData = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
      const rangeRevenue = filteredOrders.reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);
      return (
        <div className="pb-24">
          <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
            <button onClick={() => setSelectedReport(null)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="font-bold text-base flex-1">Date Range Sales Report</h2>
            <button onClick={() => downloadCSV(`daterange-report-${rangeLabel}.csv`, ['Date', 'Day', 'Orders', 'Revenue'], dailyData.map(day => [day.date, new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), String(day.orderCount), day.revenue.toFixed(2)]))} className="p-1.5 bg-blue-50 rounded-lg">
              <Download className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          {isDemo && <div className="mx-4 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5"><p className="text-[13px] text-amber-700">Showing sample demo data</p></div>}
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} customFrom={dateFrom} customTo={dateTo} onCustomFromChange={setDateFrom} onCustomToChange={setDateTo} />
          <div className="px-4 py-2 grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
              <p className="text-[12px] text-blue-600">Orders</p>
              <p className="text-lg font-bold text-blue-900">{filteredOrders.length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
              <p className="text-[12px] text-blue-600">Revenue</p>
              <p className="text-lg font-bold text-blue-900">₹{fmtShort(rangeRevenue)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
              <p className="text-[12px] text-blue-600">Days</p>
              <p className="text-lg font-bold text-blue-900">{dailyData.length}</p>
            </div>
          </div>
          <div className="px-4 mb-2"><p className="font-bold text-[15px]">Daily Breakdown</p></div>
          <div className="px-4 space-y-2">
            {dailyData.map((day, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[15px]">{new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <p className="text-[13px] text-gray-400">{day.orderCount} order{day.orderCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <p className="font-bold text-[15px]">₹{fmtShort(day.revenue)}</p>
              </div>
            ))}
            {dailyData.length === 0 && <p className="text-center text-gray-400 py-8 text-[15px]">No orders for {rangeLabel}</p>}
          </div>
        </div>
      );
    }

    if (selectedReport === 'milkdispatch') {
      return <MilkDispatchPWAReport onBack={() => setSelectedReport(null)} b2bMerchantId={b2bMerchantId} />;
    }
  }

  const reportTypes: Array<{ type: ReportType; icon: any; label: string; desc: string }> = [
    { type: 'item', icon: Package, label: 'Item-wise Sales', desc: 'Sales breakdown by product' },
    { type: 'agent', icon: Users, label: 'Agent-wise Sales', desc: 'Sales breakdown by customer/agent' },
    { type: 'segment', icon: BarChart3, label: 'Segment-wise Sales', desc: 'Sales breakdown by segment' },
    { type: 'daterange', icon: Calendar, label: 'Date Range Sales', desc: 'Daily sales within date range' },
    { type: 'milkdispatch', icon: Droplets, label: 'Daily Dispatch Report', desc: 'Fresh milk route-wise dispatch' },
  ];

  const totalSales = effectiveOrders.reduce((s, o) => s + parseFloat(String(o.total || 0)), 0);
  const deliveredOrders = effectiveOrders.filter(o => o.status === 'delivered');
  const deliveredSales = deliveredOrders.reduce((s, o) => s + parseFloat(String(o.total || 0)), 0);
  const pendingOrders = effectiveOrders.filter(o => o.status === 'pending');
  const todayOrders = effectiveOrders.filter(o => {
    const d = new Date(o.createdAt);
    const t = new Date();
    return d.toDateString() === t.toDateString();
  });
  const todaySales = todayOrders.reduce((s, o) => s + parseFloat(String(o.total || 0)), 0);

  const segmentSales: Record<string, { orders: number; total: number }> = {};
  effectiveOrders.forEach(o => {
    const seg = o.productSegment || 'general';
    if (!segmentSales[seg]) segmentSales[seg] = { orders: 0, total: 0 };
    segmentSales[seg].orders++;
    segmentSales[seg].total += parseFloat(String(o.total || 0));
  });

  const topBuyers: Record<string, { name: string; total: number; count: number }> = {};
  effectiveOrders.forEach(o => {
    const key = o.customerPhone || o.customerEmail || 'unknown';
    if (!topBuyers[key]) topBuyers[key] = { name: o.customerName || key, total: 0, count: 0 };
    topBuyers[key].total += parseFloat(String(o.total || 0));
    topBuyers[key].count++;
  });
  const topBuyersList = Object.values(topBuyers).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-base font-bold">Reports & Analytics</h3>
        <p className="text-[13px] text-gray-400">Sales performance overview</p>
      </div>

      {isDemo && <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5"><p className="text-[13px] text-amber-700">Showing sample demo data for demonstration</p></div>}

      <div className="px-4 mb-3 grid grid-cols-2 gap-2">
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-[12px] text-blue-500 font-medium">Today's Sales</p>
          <p className="text-lg font-bold text-blue-700">{fmt(todaySales)}</p>
          <p className="text-[12px] text-blue-400">{todayOrders.length} orders</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-[12px] text-green-500 font-medium">Total Sales</p>
          <p className="text-lg font-bold text-green-700">{fmt(totalSales)}</p>
          <p className="text-[12px] text-green-400">{effectiveOrders.length} orders</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-3">
          <p className="text-[12px] text-purple-500 font-medium">Delivered</p>
          <p className="text-lg font-bold text-purple-700">{fmt(deliveredSales)}</p>
          <p className="text-[12px] text-purple-400">{deliveredOrders.length} orders</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3">
          <p className="text-[12px] text-orange-500 font-medium">Pending</p>
          <p className="text-lg font-bold text-orange-700">{pendingOrders.length}</p>
          <p className="text-[12px] text-orange-400">orders awaiting</p>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
          <p className="text-[15px] font-semibold text-blue-900">Generate Reports</p>
          <p className="text-[13px] text-blue-600 mt-0.5">Select a report type to view detailed analytics from your order data</p>
        </div>
        <div className="space-y-2">
          {reportTypes.map((report) => (
            <div key={report.type} onClick={() => setSelectedReport(report.type)} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100 transition-colors">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <report.icon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[15px]">{report.label}</p>
                <p className="text-[13px] text-gray-400">{report.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mb-3">
        <h4 className="font-semibold text-[15px] mb-2 text-gray-700">Sales by Segment</h4>
        <div className="space-y-1.5">
          {Object.entries(segmentSales).map(([seg, data]) => (
            <div key={seg} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-[13px] font-medium capitalize">{seg}</span>
              <div className="text-right">
                <span className="text-[13px] font-bold">{fmt(data.total)}</span>
                <span className="text-[12px] text-gray-400 ml-1">({data.orders})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {topBuyersList.length > 0 && (
        <div className="px-4 mb-3">
          <h4 className="font-semibold text-[15px] mb-2 text-gray-700">Top Buyers</h4>
          <div className="space-y-1.5">
            {topBuyersList.map((buyer, i) => (
              <div key={i} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-gray-400 w-4">{i + 1}</span>
                  <span className="text-[13px] font-medium truncate max-w-[140px]">{buyer.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold">{fmt(buyer.total)}</p>
                  <p className="text-[12px] text-gray-400">{buyer.count} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mb-3">
        <h4 className="font-semibold text-[15px] mb-2 text-gray-700">B2B Users Summary</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <p className="text-base font-bold text-blue-700">{b2bUsers.length}</p>
            <p className="text-[12px] text-blue-500">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <p className="text-base font-bold text-green-700">{b2bUsers.filter(u => u.status === 'approved').length}</p>
            <p className="text-[12px] text-green-500">Approved</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-2 text-center">
            <p className="text-base font-bold text-orange-700">{b2bUsers.filter(u => u.status === 'pending').length}</p>
            <p className="text-[12px] text-orange-500">Pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function B2BUserProfile({ user, onBack }: { user: any; onBack: () => void }) {
  const { toast } = useToast();
  const { data: salesData, isLoading: salesLoading } = useQuery<any>({
    queryKey: ['/api/staff/b2b-users', user.id, 'sales'],
    queryFn: async () => {
      const res = await fetch(`/api/staff/b2b-users/${user.id}/sales`, { credentials: 'include' });
      if (!res.ok) return { totalSales: 0, totalOrders: 0, lastOrderDate: null, segmentBreakdown: {}, recentOrders: [] };
      return res.json();
    },
  });
  const { data: userAddresses = [] } = useQuery<any[]>({
    queryKey: ['/api/staff/b2b-users', user.id, 'addresses'],
    queryFn: async () => {
      const res = await fetch(`/api/staff/b2b-users/${user.id}/addresses`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const locationPhotos = userAddresses.filter((a: any) => a.locationPhotoUrl);

  const approveMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/staff/b2b-users/${userId}/approve`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User status updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/staff/b2b-users'] });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const roleLabel = (r: string) => {
    const map: Record<string, string> = {
      'wholesale_dealer': 'WSD', 'wsd': 'WSD', 'dealer': 'Dealer', 'retailer': 'Retailer',
      'mpcs': 'MPCS', 'hotel': 'Hotel', 'institution': 'Institution',
      'private_parlour': 'Pvt Parlour', 'union_parlour': 'Union Parlour',
      'general_shop': 'Gen Shop/MRP', 'inter_union': 'Inter Union', 'federation': 'Federation',
    };
    return map[r] || r;
  };

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
        <h3 className="font-bold text-base">User Profile</h3>
      </div>

      <div className="px-4 pt-4 pb-3">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
              <User className="h-7 w-7 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base truncate">{user.businessName || user.name || 'N/A'}</p>
              <p className="text-[13px] text-gray-500">{user.name !== user.businessName ? user.name : ''}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-blue-600 text-white text-[12px]">{roleLabel(user.role)}</Badge>
                <Badge className={`text-[12px] ${user.status === 'approved' ? 'bg-green-100 text-green-700' : user.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                  {user.status || 'pending'}
                </Badge>
              </div>
            </div>
          </div>
          {user.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => approveMutation.mutate({ userId: user.id, status: 'approved' })}
                disabled={approveMutation.isPending}
                className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-medium">
                <UserCheck className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => approveMutation.mutate({ userId: user.id, status: 'rejected' })}
                disabled={approveMutation.isPending}
                className="flex-1 h-8 rounded-lg text-[13px] font-medium border-red-200 text-red-600 hover:bg-red-50">
                <UserX className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mb-4">
        <h4 className="font-semibold text-[15px] mb-2 text-gray-700">Contact & Business</h4>
        <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2 text-[13px] text-gray-600">
          {user.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-gray-400" /> {user.phone}</p>}
          {user.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-gray-400" /> {user.email}</p>}
          {user.businessCode && <p className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-gray-400" /> Code: {user.businessCode}</p>}
          {user.businessAddress && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {user.businessAddress}</p>}
          {user.district && <p className="flex items-center gap-2"><Navigation className="h-3.5 w-3.5 text-gray-400" /> {user.district}</p>}
          {user.gstNumber && <p className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-gray-400" /> GST: {user.gstNumber}</p>}
          {user.businessRoute && <p className="flex items-center gap-2"><Route className="h-3.5 w-3.5 text-gray-400" /> Route: {user.businessRoute}</p>}
          {user.businessPoint && <p className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-gray-400" /> Point: {user.businessPoint}</p>}
          {user.office && <p className="flex items-center gap-2"><Store className="h-3.5 w-3.5 text-gray-400" /> Office: {user.office}</p>}
          {locationPhotos.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-[12px] text-gray-400 mb-1 font-medium flex items-center gap-1"><Camera className="h-3 w-3" /> Location Photo Proof ({locationPhotos.length})</p>
              <div className="space-y-2">
                {locationPhotos.map((addr: any, i: number) => (
                  <div key={i} className="relative">
                    <img src={addr.locationPhotoUrl} alt="Location proof" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                    {addr.label && <span className="absolute top-1 left-1 bg-black/60 text-white text-[12px] px-1.5 py-0.5 rounded">{addr.label}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 mb-4">
        <h4 className="font-semibold text-[15px] mb-2 text-gray-700">Sales Summary</h4>
        {salesLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-700">{fmtShort(salesData?.totalOrders || 0)}</p>
                <p className="text-[12px] text-green-600">Total Orders</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-[15px] font-bold text-blue-700">{fmt(salesData?.totalSales || 0)}</p>
                <p className="text-[12px] text-blue-600">Total Sales</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-[13px] font-bold text-purple-700">{salesData?.lastOrderDate ? new Date(salesData.lastOrderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}</p>
                <p className="text-[12px] text-purple-600">Last Order</p>
              </div>
            </div>

            {salesData?.segmentBreakdown && Object.keys(salesData.segmentBreakdown).length > 0 && (
              <div className="mb-3">
                <p className="text-[13px] font-medium text-gray-500 mb-1.5">By Segment</p>
                <div className="space-y-1.5">
                  {Object.entries(salesData.segmentBreakdown).map(([seg, data]: [string, any]) => (
                    <div key={seg} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-[13px] font-medium capitalize">{seg}</span>
                      <div className="text-right">
                        <span className="text-[13px] font-bold">{fmt(data.total)}</span>
                        <span className="text-[12px] text-gray-400 ml-1">({data.orders} orders)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {salesData?.recentOrders?.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-gray-500 mb-1.5">Recent Orders</p>
                <div className="space-y-1.5">
                  {salesData.recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-[13px] font-medium">{formatOrderId({ id: String(order.id), orderNumber: order.orderNumber, displayId: order.displayId })}</p>
                        <p className="text-[12px] text-gray-400">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-bold">{fmt(parseFloat(String(order.total || 0)))}</p>
                        <Badge className={`text-[12px] ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!salesData?.totalOrders || salesData.totalOrders === 0) && (
              <div className="text-center py-6">
                <ShoppingBag className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-[15px]">No sales data yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function B2BTab({ merchantId }: { merchantId: string }) {
  const [subView, setSubView] = useState<'overview' | 'approvals' | 'role_list'>('overview');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const { toast } = useToast();

  const { data: b2bUsers = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/staff/b2b-users'],
    queryFn: async () => {
      const res = await fetch('/api/staff/b2b-users', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/staff/b2b-users/${userId}/approve`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User status updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/staff/b2b-users'] });
    },
    onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
  });

  const roleCategories = [
    { key: 'wholesale_dealer', label: 'WSD', icon: '🚛', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    { key: 'dealer', label: 'Dealer', icon: '🏪', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    { key: 'retailer', label: 'Retailer', icon: '🏠', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    { key: 'mpcs', label: 'MPCS', icon: '🏛️', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    { key: 'hotel', label: 'Hotel', icon: '🏨', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { key: 'institution', label: 'Institution', icon: '🏢', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { key: 'private_parlour', label: 'Pvt Parlour', icon: '🍦', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    { key: 'union_parlour', label: 'Union Parlour', icon: '🏗️', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { key: 'general_shop', label: 'Gen Shop/MRP', icon: '🛒', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  ];

  const classifyUserRole = (u: any): string => {
    const bt = (u.businessType || '').toUpperCase();
    if (bt === 'WSD') return 'wholesale_dealer';
    if (bt === 'DLR' || bt === 'DEALER') return 'dealer';
    if (bt === 'MPCS') return 'mpcs';
    if (bt === 'HOTELS' || bt === 'HOTEL') return 'hotel';
    if (bt === 'INSTUTION' || bt === 'INSTITUTION') return 'institution';
    if (bt === 'PRIVATE PARLOUR') return 'private_parlour';
    if (bt === 'UNION PARLOUR') return 'union_parlour';
    if (bt === 'GENERAL SHOP' || bt === 'RETAIL') return 'general_shop';
    if (bt === 'RETAILER' || bt === 'RTL') return 'retailer';
    const role = u.role || '';
    if (role === 'wholesale_dealer' || role === 'wsd') return 'wholesale_dealer';
    if (role === 'dealer') return 'dealer';
    if (role === 'retailer') return 'retailer';
    if (role === 'mpcs') return 'mpcs';
    if (role === 'hotel') return 'hotel';
    if (role === 'institution') return 'institution';
    if (role === 'private_parlour') return 'private_parlour';
    if (role === 'union_parlour') return 'union_parlour';
    if (role === 'general_shop') return 'general_shop';
    const pr = (u.pricingRole || '').toUpperCase();
    if (pr === 'WHOLESALE_DEALER') return 'wholesale_dealer';
    if (pr === 'DEALER') return 'dealer';
    if (pr === 'RETAILER') return 'retailer';
    return 'general_shop';
  };

  const getRoleCount = (key: string) => {
    return b2bUsers.filter(u => classifyUserRole(u) === key).length;
  };

  const getRoleUsers = (key: string) => {
    return b2bUsers.filter(u => classifyUserRole(u) === key);
  };

  const pendingCount = b2bUsers.filter(u => u.status === 'pending').length;

  if (selectedUser) {
    return <B2BUserProfile user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  if (isLoading) {
    return (
      <div className="pb-24 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (subView === 'role_list' && selectedRole) {
    const roleInfo = roleCategories.find(r => r.key === selectedRole);
    const roleUsers = getRoleUsers(selectedRole);
    const searchFiltered = searchQuery.trim()
      ? roleUsers.filter((u: any) => {
          const q = searchQuery.toLowerCase();
          return (u.name || '').toLowerCase().includes(q)
            || (u.phone || '').includes(q)
            || (u.businessCode || '').toLowerCase().includes(q)
            || (u.businessName || '').toLowerCase().includes(q);
        })
      : roleUsers;

    return (
      <div className="pb-24">
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => { setSubView('overview'); setSelectedRole(null); setSearchQuery(''); }} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h3 className="font-bold text-base">{roleInfo?.icon} {roleInfo?.label || selectedRole}</h3>
            <p className="text-[12px] text-gray-400">{roleUsers.length} registered users</p>
          </div>
        </div>

        <div className="px-4 pt-3 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, code, business..."
              className="h-10 pl-10 rounded-xl border-gray-200 bg-gray-50" />
          </div>
        </div>

        <div className="px-4 space-y-2">
          {searchFiltered.length > 0 ? searchFiltered.map((user: any) => (
            <button key={user.id} onClick={() => setSelectedUser(user)}
              className="w-full text-left border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${roleInfo?.bg || 'bg-blue-50'} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-lg">{roleInfo?.icon || '👤'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] truncate">{user.businessName || user.name || 'N/A'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {user.businessCode && <span className="text-[12px] text-gray-500 font-mono">{user.businessCode}</span>}
                    <Badge className={`text-[12px] ${user.status === 'approved' ? 'bg-green-100 text-green-700' : user.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                      {user.status}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[13px] text-gray-400">
                {user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{user.phone}</span>}
                {user.district && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{user.district}</span>}
              </div>
            </button>
          )) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-[15px]">No users found</p>
              {searchQuery && <p className="text-gray-300 text-[13px] mt-1">Try a different search</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-base font-bold">B2B Management</h3>
        <p className="text-[13px] text-gray-400">Registered users under this union</p>
      </div>

      <div className="px-4 mb-3 flex gap-2">
        <button onClick={() => setSubView('overview')}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${subView === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Users ({b2bUsers.length})
        </button>
        <button onClick={() => setSubView('approvals')}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${subView === 'approvals' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Approvals {pendingCount > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-[12px]">{pendingCount}</span>}
        </button>
      </div>

      {subView === 'overview' && (
        <>
          <div className="px-4 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all users..."
                className="h-10 pl-10 rounded-xl border-gray-200 bg-gray-50" />
            </div>
          </div>

          {searchQuery.trim() ? (
            <div className="px-4 space-y-2">
              {b2bUsers.filter((u: any) => {
                const q = searchQuery.toLowerCase();
                return (u.name || '').toLowerCase().includes(q) || (u.phone || '').includes(q)
                  || (u.businessCode || '').toLowerCase().includes(q) || (u.businessName || '').toLowerCase().includes(q);
              }).map((user: any) => (
                <button key={user.id} onClick={() => setSelectedUser(user)}
                  className="w-full text-left border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[15px] truncate">{user.businessName || user.name || 'N/A'}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-blue-100 text-blue-700 text-[12px]">{roleCategories.find(r => r.key === classifyUserRole(user))?.label || user.businessType || user.role}</Badge>
                        {user.businessCode && <span className="text-[12px] text-gray-400 font-mono">{user.businessCode}</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </button>
              ))}
              {b2bUsers.filter((u: any) => {
                const q = searchQuery.toLowerCase();
                return (u.name || '').toLowerCase().includes(q) || (u.phone || '').includes(q)
                  || (u.businessCode || '').toLowerCase().includes(q) || (u.businessName || '').toLowerCase().includes(q);
              }).length === 0 && (
                <div className="text-center py-8"><p className="text-gray-400 text-[15px]">No users found for "{searchQuery}"</p></div>
              )}
            </div>
          ) : (
            <div className="px-4">
              <p className="text-[13px] text-gray-500 mb-2 font-medium">Registered users under this union</p>
              <div className="grid grid-cols-3 gap-2">
                {roleCategories.map((cat) => {
                  const count = getRoleCount(cat.key);
                  return (
                    <button key={cat.key} onClick={() => { setSelectedRole(cat.key); setSubView('role_list'); setSearchQuery(''); }}
                      className={`${cat.bg} border ${cat.border} rounded-xl p-3 text-center transition-all hover:shadow-sm active:scale-95`}>
                      <span className="text-xl block mb-1">{cat.icon}</span>
                      <p className={`text-xl font-bold ${cat.text}`}>{count}</p>
                      <p className="text-[12px] text-gray-500 font-medium leading-tight">{cat.label}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-bold text-blue-700">{b2bUsers.length}</p>
                  <p className="text-[12px] text-blue-500">Total B2B Users</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-green-700">{b2bUsers.filter(u => u.status === 'approved').length}</p>
                  <p className="text-[12px] text-green-500">Approved</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-orange-700">{pendingCount}</p>
                  <p className="text-[12px] text-orange-500">Pending</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {subView === 'approvals' && (
        <>
          <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => {
              const count = f === 'all' ? b2bUsers.length : b2bUsers.filter((u: any) => u.status === f).length;
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                </button>
              );
            })}
          </div>

          <div className="px-4 space-y-2">
            {(filter === 'all' ? b2bUsers : b2bUsers.filter((u: any) => u.status === filter)).length > 0 ?
              (filter === 'all' ? b2bUsers : b2bUsers.filter((u: any) => u.status === filter)).map((user: any) => (
              <div key={user.id} className="border border-gray-100 rounded-xl p-3">
                <button onClick={() => setSelectedUser(user)} className="w-full text-left">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px]">{user.businessName || user.name || 'N/A'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-blue-100 text-blue-700 text-[12px]">
                          {roleCategories.find(r => r.key === classifyUserRole(user))?.label || user.businessType || user.role}
                        </Badge>
                        <Badge className={`text-[12px] ${user.status === 'approved' ? 'bg-green-100 text-green-700' : user.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {user.status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-[13px] text-gray-500">
                    {user.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {user.phone}</p>}
                    {user.businessCode && <p className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> {user.businessCode}</p>}
                  </div>
                </button>
                {user.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => approveMutation.mutate({ userId: user.id, status: 'approved' })}
                      disabled={approveMutation.isPending}
                      className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-medium">
                      <UserCheck className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => approveMutation.mutate({ userId: user.id, status: 'rejected' })}
                      disabled={approveMutation.isPending}
                      className="flex-1 h-8 rounded-lg text-[13px] font-medium border-red-200 text-red-600 hover:bg-red-50">
                      <UserX className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-[15px]">{filter === 'pending' ? 'No pending approvals' : 'No users found'}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DeliveryManagementTab({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverSegment, setDriverSegment] = useState('Fresh Milk');
  const [driverVehicle, setDriverVehicle] = useState('');
  const [driverVehicleType, setDriverVehicleType] = useState('Mini Truck');
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  const { data: drivers = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/merchant/delivery-drivers'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/delivery-drivers', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: summary } = useQuery<any>({
    queryKey: ['/api/merchant/delivery-summary'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/delivery-summary', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const addDriverMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/delivery-drivers", {
        name: driverName, phone: driverPhone, segment: driverSegment,
        vehicleNumber: driverVehicle, vehicleType: driverVehicleType,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Driver added successfully" });
      setShowAddDriver(false);
      setDriverName(''); setDriverPhone(''); setDriverVehicle('');
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/delivery-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/delivery-summary'] });
    },
    onError: () => toast({ title: "Failed to add driver", variant: "destructive" }),
  });

  const toggleDriverMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/merchant/delivery-drivers/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Driver updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/delivery-drivers'] });
    },
  });

  const seedDriversMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/seed-test-drivers", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message || "Test drivers seeded" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/delivery-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/delivery-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/staff/driver-locations'] });
    },
    onError: () => toast({ title: "Failed to seed drivers", variant: "destructive" }),
  });

  if (isLoading) return <div className="pb-24 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  if (selectedDriver) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
          <button onClick={() => setSelectedDriver(null)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
          <h2 className="font-bold text-base flex-1">Driver Details</h2>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${selectedDriver.isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Truck className={`h-7 w-7 ${selectedDriver.isOnline ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-bold text-base">{selectedDriver.name}</p>
                <p className="text-[13px] text-gray-500">{selectedDriver.phone}</p>
                <div className="flex gap-1.5 mt-1">
                  <Badge className={`text-[12px] ${selectedDriver.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {selectedDriver.isOnline ? 'Online' : 'Offline'}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 text-[12px]">{selectedDriver.segment}</Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[12px] text-gray-500">Vehicle</p>
              <p className="text-[15px] font-bold">{selectedDriver.vehicleNumber || 'N/A'}</p>
              <p className="text-[12px] text-gray-400">{selectedDriver.vehicleType || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[12px] text-gray-500">Assigned Orders</p>
              <p className="text-[15px] font-bold">{selectedDriver.assignedOrders || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[12px] text-gray-500">Total Deliveries</p>
              <p className="text-[15px] font-bold">{selectedDriver.totalDeliveries || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[12px] text-gray-500">Active Route</p>
              <p className="text-[15px] font-bold">{selectedDriver.activeRoute || 'None'}</p>
            </div>
          </div>
          {selectedDriver.latitude && selectedDriver.longitude && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-[13px] font-medium text-green-700 mb-1">Last Known Location</p>
              <p className="text-[13px] text-green-600">Lat: {Number(selectedDriver.latitude).toFixed(4)}, Lng: {Number(selectedDriver.longitude).toFixed(4)}</p>
              {selectedDriver.lastUpdate && <p className="text-[12px] text-green-500 mt-1">Updated: {timeAgo(selectedDriver.lastUpdate)}</p>}
            </div>
          )}
          <button onClick={() => toggleDriverMutation.mutate({ id: selectedDriver.id, isActive: false })}
            className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-[15px] font-medium">
            Deactivate Driver
          </button>
        </div>
      </div>
    );
  }

  if (showAddDriver) {
    return (
      <div className="pb-24">
        <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
          <button onClick={() => setShowAddDriver(false)} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
          <h2 className="font-bold text-base">Add New Driver</h2>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div>
            <label className="text-[13px] text-gray-500 mb-1 block">Driver Name *</label>
            <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Enter full name" className="w-full h-10 px-3 border border-gray-200 rounded-xl text-[15px] bg-gray-50" />
          </div>
          <div>
            <label className="text-[13px] text-gray-500 mb-1 block">Phone Number *</label>
            <input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="10-digit mobile" className="w-full h-10 px-3 border border-gray-200 rounded-xl text-[15px] bg-gray-50" />
          </div>
          <div>
            <label className="text-[13px] text-gray-500 mb-1 block">Segment *</label>
            <select value={driverSegment} onChange={(e) => setDriverSegment(e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-[15px] bg-gray-50">
              <option value="Fresh Milk">Fresh Milk</option>
              <option value="Products">Products</option>
              <option value="Ice Cream">Ice Cream</option>
            </select>
          </div>
          <div>
            <label className="text-[13px] text-gray-500 mb-1 block">Vehicle Number</label>
            <input value={driverVehicle} onChange={(e) => setDriverVehicle(e.target.value)} placeholder="e.g. TN-01-AB-1234" className="w-full h-10 px-3 border border-gray-200 rounded-xl text-[15px] bg-gray-50" />
          </div>
          <div>
            <label className="text-[13px] text-gray-500 mb-1 block">Vehicle Type</label>
            <select value={driverVehicleType} onChange={(e) => setDriverVehicleType(e.target.value)} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-[15px] bg-gray-50">
              <option value="Mini Truck">Mini Truck</option>
              <option value="Van">Van</option>
              <option value="Tempo">Tempo</option>
              <option value="Refrigerated Van">Refrigerated Van</option>
              <option value="Auto">Auto</option>
              <option value="Bike">Bike</option>
            </select>
          </div>
          <button onClick={() => addDriverMutation.mutate()} disabled={!driverName || !driverPhone || addDriverMutation.isPending}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[15px] font-medium disabled:opacity-50">
            {addDriverMutation.isPending ? 'Adding...' : 'Add Driver'}
          </button>
        </div>
      </div>
    );
  }

  const onlineDrivers = drivers.filter((d: any) => d.isOnline);
  const offlineDrivers = drivers.filter((d: any) => !d.isOnline);
  const segments = ['Fresh Milk', 'Products', 'Ice Cream'];

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">Delivery Management</h3>
          <p className="text-[13px] text-gray-400">Manage drivers & deliveries</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => seedDriversMutation.mutate()} disabled={seedDriversMutation.isPending}
            className="px-3 py-1.5 bg-gray-100 rounded-lg text-[13px] font-medium text-gray-600 disabled:opacity-50">
            {seedDriversMutation.isPending ? '...' : 'Seed Test'}
          </button>
          <button onClick={() => setShowAddDriver(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[13px] font-medium">
            + Add Driver
          </button>
        </div>
      </div>

      {summary && (
        <div className="px-4 py-2">
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-green-50 rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-green-700">{summary.onlineDrivers}</p>
              <p className="text-[13px] text-green-500">Online</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-gray-700">{summary.offlineDrivers}</p>
              <p className="text-[13px] text-gray-500">Offline</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-blue-700">{summary.outForDelivery}</p>
              <p className="text-[13px] text-blue-500">Out</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-2 text-center">
              <p className="text-lg font-bold text-orange-700">{summary.pendingAssignment}</p>
              <p className="text-[13px] text-orange-500">Pending</p>
            </div>
          </div>
          <div className="flex gap-2">
            {segments.map(seg => {
              const count = drivers.filter((d: any) => d.segment === seg).length;
              return (
                <div key={seg} className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-[13px] font-bold">{count}</p>
                  <p className="text-[13px] text-gray-500">{seg}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 mt-2">
        {onlineDrivers.length > 0 && (
          <>
            <p className="text-[13px] font-semibold text-green-600 mb-2">Online ({onlineDrivers.length})</p>
            <div className="space-y-2 mb-3">
              {onlineDrivers.map((driver: any) => (
                <div key={driver.id} onClick={() => setSelectedDriver(driver)} className="border border-green-100 rounded-xl p-3 cursor-pointer active:bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Truck className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-bold text-[15px]">{driver.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className="bg-blue-50 text-blue-600 text-[13px]">{driver.segment}</Badge>
                          {driver.assignedOrders > 0 && <span className="text-[12px] text-orange-500">{driver.assignedOrders} orders</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] text-gray-500">{driver.vehicleNumber || ''}</p>
                      {driver.activeRoute && <p className="text-[12px] text-blue-500">{driver.activeRoute}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {offlineDrivers.length > 0 && (
          <>
            <p className="text-[13px] font-semibold text-gray-400 mb-2">Offline ({offlineDrivers.length})</p>
            <div className="space-y-2">
              {offlineDrivers.map((driver: any) => (
                <div key={driver.id} onClick={() => setSelectedDriver(driver)} className="border border-gray-100 rounded-xl p-3 cursor-pointer active:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Truck className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-[15px] text-gray-600">{driver.name}</p>
                        <Badge className="bg-gray-50 text-gray-400 text-[13px]">{driver.segment}</Badge>
                      </div>
                    </div>
                    <p className="text-[12px] text-gray-400">{driver.vehicleNumber || ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {drivers.length === 0 && (
          <div className="text-center py-12">
            <Truck className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-[15px]">No delivery drivers yet</p>
            <p className="text-gray-300 text-[13px] mt-1">Add drivers or use 'Seed Test' to populate sample data</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackingTab({ merchantId, staffSession }: { merchantId: string; staffSession: any }) {
  const [subView, setSubView] = useState<'drivers' | 'marketing'>('drivers');

  const { data: drivers = [], isLoading: driversLoading } = useQuery<any[]>({
    queryKey: ['/api/staff/driver-locations'],
    queryFn: async () => {
      const res = await fetch('/api/staff/driver-locations', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: subView === 'drivers',
    refetchInterval: 30000,
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: marketingStaff = [], isLoading: staffLoading } = useQuery<any[]>({
    queryKey: ['/api/staff-attendance', merchantId, 'today'],
    queryFn: async () => {
      const res = await fetch(`/api/staff-attendance/${merchantId}?date=${todayStr}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: subView === 'marketing' && !!merchantId,
  });

  const isLoading = subView === 'drivers' ? driversLoading : staffLoading;

  if (isLoading) {
    return (
      <div className="pb-24 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-base font-bold">Live Tracking</h3>
        <p className="text-[13px] text-gray-400">Monitor drivers & marketing staff</p>
      </div>

      <div className="px-4 mb-3 flex gap-2">
        <button onClick={() => setSubView('drivers')}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${subView === 'drivers' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <Truck className="h-3 w-3 inline mr-1" /> Drivers
        </button>
        <button onClick={() => setSubView('marketing')}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${subView === 'marketing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <MapPinned className="h-3 w-3 inline mr-1" /> Marketing Staff
        </button>
      </div>

      {subView === 'drivers' && (
        <div className="px-4">
          {drivers.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-green-50 rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-green-700">{drivers.filter((d: any) => d.isOnline).length}</p>
                <p className="text-[13px] text-green-500">Online</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-gray-600">{drivers.filter((d: any) => !d.isOnline).length}</p>
                <p className="text-[13px] text-gray-500">Offline</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-2 text-center">
                <p className="text-lg font-bold text-blue-700">{drivers.reduce((s: number, d: any) => s + (d.assignedOrders || 0), 0)}</p>
                <p className="text-[13px] text-blue-500">Active Orders</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {drivers.length > 0 ? drivers.map((driver: any, idx: number) => {
              const isOnline = driver.isOnline || driver.status === 'online' || (driver.lastUpdate && (Date.now() - new Date(driver.lastUpdate).getTime()) < 600000);
              const hasLocation = driver.latitude && driver.longitude;
              return (
                <div key={driver.id || idx} className={`border rounded-xl p-3 ${isOnline ? 'border-green-100 bg-green-50/30' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOnline ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Truck className={`h-5 w-5 ${isOnline ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        {isOnline && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
                      </div>
                      <div>
                        <p className="font-bold text-[15px]">{driver.name || driver.driverName || 'Driver'}</p>
                        {driver.phone && <p className="text-[13px] text-gray-500">{driver.phone}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} text-[12px]`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </Badge>
                      {driver.assignedOrders > 0 && (
                        <p className="text-[12px] text-orange-600 font-medium mt-0.5">{driver.assignedOrders} orders</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[13px] text-gray-500">
                    {driver.segment && (
                      <p className="flex items-center gap-1"><Box className="h-3 w-3 flex-shrink-0" /> {driver.segment}</p>
                    )}
                    {driver.vehicleNumber && (
                      <p className="flex items-center gap-1"><Navigation className="h-3 w-3 flex-shrink-0" /> {driver.vehicleNumber}</p>
                    )}
                    {driver.activeRoute && (
                      <p className="flex items-center gap-1 text-blue-600"><Route className="h-3 w-3 flex-shrink-0" /> {driver.activeRoute}</p>
                    )}
                    {driver.vehicleType && (
                      <p className="flex items-center gap-1"><Truck className="h-3 w-3 flex-shrink-0" /> {driver.vehicleType}</p>
                    )}
                  </div>
                  {hasLocation && (
                    <div className="mt-2 bg-white/70 rounded-lg p-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[12px] text-green-600">
                        <MapPin className="h-3 w-3" />
                        <span>{Number(driver.latitude).toFixed(4)}, {Number(driver.longitude).toFixed(4)}</span>
                      </div>
                      {driver.speed && <span className="text-[12px] text-blue-500">{Math.round(driver.speed)} km/h</span>}
                      {driver.lastUpdate && <span className="text-[12px] text-gray-400">{timeAgo(driver.lastUpdate)}</span>}
                    </div>
                  )}
                  {!hasLocation && driver.lastUpdate && (
                    <p className="mt-1.5 text-[12px] text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" /> Last seen: {timeAgo(driver.lastUpdate)}</p>
                  )}
                </div>
              );
            }) : (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-[15px]">No driver locations available</p>
                <p className="text-gray-300 text-[13px] mt-1">Go to Delivery Management to add or seed test drivers</p>
              </div>
            )}
          </div>
        </div>
      )}

      {subView === 'marketing' && (
        <div className="px-4 space-y-2">
          {marketingStaff.length > 0 ? marketingStaff.map((staff: any, idx: number) => (
            <div key={staff.id || idx} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-[15px]">{staff.staffName || staff.staffId || 'Staff'}</p>
                    <p className="text-[13px] text-gray-500">
                      {staff.checkInTime ? new Date(staff.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </p>
                  </div>
                </div>
                <Badge className={`${staff.status === 'present' ? 'bg-green-100 text-green-700' : staff.status === 'leave' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'} text-[12px]`}>
                  {staff.status || 'present'}
                </Badge>
              </div>
              <div className="space-y-1 text-[13px] text-gray-500">
                {(staff.checkInLat || staff.latitude) && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    {(staff.checkInLat || staff.latitude)?.toFixed(4)}, {(staff.checkInLng || staff.longitude)?.toFixed(4)}
                  </p>
                )}
                {staff.checkInTime && (
                  <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Check-in: {new Date(staff.checkInTime).toLocaleString('en-IN')}</p>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-12">
              <MapPinned className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-[15px]">No staff checked in today</p>
              <p className="text-gray-300 text-[13px] mt-1">Staff attendance data will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SFATab({ merchantId }: { merchantId: string }) {
  const [subView, setSubView] = useState<'attendance' | 'beats' | 'visits'>('attendance');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week'>('today');

  const todayStr = new Date().toISOString().split('T')[0];
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  })();

  const { data: attendance = [], isLoading: attendanceLoading } = useQuery<any[]>({
    queryKey: ['/api/staff-attendance', merchantId, timeFilter],
    queryFn: async () => {
      const dateParam = timeFilter === 'today' ? `?date=${todayStr}` : `?from=${weekStart}&to=${todayStr}`;
      const res = await fetch(`/api/staff-attendance/${merchantId}${dateParam}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: subView === 'attendance' && !!merchantId,
  });

  const { data: beatPlans = [], isLoading: beatsLoading } = useQuery<any[]>({
    queryKey: ['/api/beat-plans', merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/beat-plans/${merchantId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: subView === 'beats' && !!merchantId,
  });

  const { data: outletVisits = [], isLoading: visitsLoading } = useQuery<any[]>({
    queryKey: ['/api/outlet-visits', merchantId, timeFilter],
    queryFn: async () => {
      const dateParam = timeFilter === 'today' ? `?date=${todayStr}` : `?from=${weekStart}&to=${todayStr}`;
      const res = await fetch(`/api/outlet-visits/${merchantId}${dateParam}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: subView === 'visits' && !!merchantId,
  });

  const isLoading = subView === 'attendance' ? attendanceLoading : subView === 'beats' ? beatsLoading : visitsLoading;

  if (isLoading) {
    return (
      <div className="pb-24 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-base font-bold">Sales Force Automation</h3>
        <p className="text-[13px] text-gray-400">Staff attendance, beat plans & outlet visits</p>
      </div>

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setSubView('attendance')}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${subView === 'attendance' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Attendance
        </button>
        <button onClick={() => setSubView('beats')}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${subView === 'beats' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Beat Plans
        </button>
        <button onClick={() => setSubView('visits')}
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${subView === 'visits' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Outlet Visits
        </button>
      </div>

      {(subView === 'attendance' || subView === 'visits') && (
        <div className="px-4 mb-3 flex gap-2">
          <button onClick={() => setTimeFilter('today')}
            className={`px-3 py-1 rounded-full text-[13px] font-medium transition-colors ${timeFilter === 'today' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500'}`}>
            Today
          </button>
          <button onClick={() => setTimeFilter('week')}
            className={`px-3 py-1 rounded-full text-[13px] font-medium transition-colors ${timeFilter === 'week' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500'}`}>
            This Week
          </button>
        </div>
      )}

      {subView === 'attendance' && (
        <div className="px-4 space-y-2">
          {attendance.length > 0 ? attendance.map((record: any, idx: number) => {
            const checkIn = record.checkInTime ? new Date(record.checkInTime) : null;
            const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null;
            const totalHours = checkIn && checkOut ? ((checkOut.getTime() - checkIn.getTime()) / 3600000).toFixed(1) : null;

            return (
              <div key={record.id || idx} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-[15px]">{record.staffName || record.staffId || 'Staff'}</p>
                    <p className="text-[13px] text-gray-400">
                      {record.date ? new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'N/A'}
                    </p>
                  </div>
                  <Badge className={`${
                    record.status === 'present' ? 'bg-green-100 text-green-700' :
                    record.status === 'leave' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  } text-[12px]`}>
                    {record.status || 'absent'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[13px] text-gray-500">
                  <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> In: {checkIn ? checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                  <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> Out: {checkOut ? checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                  {(record.checkInLat || record.latitude) && (
                    <p className="flex items-center gap-1 col-span-2"><MapPin className="h-3 w-3" /> {(record.checkInLat || record.latitude)?.toFixed(4)}, {(record.checkInLng || record.longitude)?.toFixed(4)}</p>
                  )}
                  {totalHours && (
                    <p className="flex items-center gap-1"><Activity className="h-3 w-3" /> {totalHours} hrs</p>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-[15px]">No attendance records</p>
              <p className="text-gray-300 text-[13px] mt-1">Attendance data will appear here</p>
            </div>
          )}
        </div>
      )}

      {subView === 'beats' && (
        <div className="px-4 space-y-2">
          {beatPlans.length > 0 ? beatPlans.map((plan: any, idx: number) => (
            <div key={plan.id || idx} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-[15px]">{plan.name || plan.planName || 'Beat Plan'}</p>
                  <p className="text-[13px] text-gray-400">{plan.dayOfWeek || plan.day || 'N/A'}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 text-[12px]">
                  {plan.outletsCount || plan.outlets?.length || 0} outlets
                </Badge>
              </div>
              <div className="space-y-1 text-[13px] text-gray-500">
                {plan.area && <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {plan.area}</p>}
                {(plan.assignedStaff || plan.staffName) && (
                  <p className="flex items-center gap-1.5"><User className="h-3 w-3" /> {plan.assignedStaff || plan.staffName}</p>
                )}
                {plan.route && <p className="flex items-center gap-1.5"><Route className="h-3 w-3" /> {plan.route}</p>}
              </div>
            </div>
          )) : (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-[15px]">No beat plans configured</p>
              <p className="text-gray-300 text-[13px] mt-1">Beat plan data will appear here</p>
            </div>
          )}
        </div>
      )}

      {subView === 'visits' && (
        <div className="px-4 space-y-2">
          {outletVisits.length > 0 ? outletVisits.map((visit: any, idx: number) => (
            <div key={visit.id || idx} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-[15px]">{visit.outletName || visit.outlet || 'Outlet'}</p>
                  <p className="text-[13px] text-gray-400">
                    {visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                    {visit.staffName && ` · ${visit.staffName}`}
                  </p>
                </div>
                {visit.orderValue && (
                  <Badge className="bg-green-100 text-green-700 text-[12px]">
                    ₹{fmtShort(parseFloat(visit.orderValue) || 0)}
                  </Badge>
                )}
              </div>
              <div className="space-y-1 text-[13px] text-gray-500">
                {visit.checkInTime && (
                  <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> In: {new Date(visit.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                )}
                {visit.checkOutTime && (
                  <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> Out: {new Date(visit.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                )}
                {(visit.checkInLat || visit.latitude) && (
                  <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {(visit.checkInLat || visit.latitude)?.toFixed(4)}, {(visit.checkInLng || visit.longitude)?.toFixed(4)}</p>
                )}
                {visit.notes && (
                  <p className="flex items-center gap-1"><FileText className="h-3 w-3" /> {visit.notes}</p>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-12">
              <Eye className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-[15px]">No outlet visits recorded</p>
              <p className="text-gray-300 text-[13px] mt-1">Visit data will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RouteOptimizerTab({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const [pipelineStep, setPipelineStep] = useState(1);
  const [demandData, setDemandData] = useState<any>(null);
  const [clusterData, setClusterData] = useState<any>(null);
  const [splitData, setSplitData] = useState<any>(null);
  const [optimizeData, setOptimizeData] = useState<any>(null);
  const [expandedTrips, setExpandedTrips] = useState<Set<number>>(new Set());

  const { data: stops = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/transport/stops"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/transport/seed-stops"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/stops"] });
      toast({ title: "30 buttermilk delivery stops seeded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const validateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/transport/validate-pins"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/stops"] });
      toast({ title: `Pin validation: ${data.valid} valid, ${data.errors} errors out of ${data.total}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const demandMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/transport/compute-demand"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setDemandData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transport/stops"] });
      setPipelineStep(Math.max(pipelineStep, 2));
      toast({ title: `Demand: ${data.totalBags} bags, ${data.totalWeightKg} kg` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clusterMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/transport/cluster"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setClusterData(data);
      setPipelineStep(Math.max(pipelineStep, 3));
      toast({ title: `${data.clusters.length} clusters, ${data.totalVehicles} vehicles` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const splitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/transport/split-trips"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setSplitData(data);
      setPipelineStep(Math.max(pipelineStep, 4));
      toast({ title: `Split into ${data.totalTrips} trips` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const optimizeMutation = useMutation({
    mutationFn: (trips: any[]) => apiRequest("POST", "/api/admin/transport/optimize-trips", { trips }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setOptimizeData(data);
      setPipelineStep(5);
      toast({ title: `Optimized: ${data.totalKm} km across ${data.totalTrips} trips` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleTrip = (idx: number) => {
    const next = new Set(expandedTrips);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setExpandedTrips(next);
  };

  const steps = [
    { num: 1, label: "Load Pins", active: true },
    { num: 2, label: "Demand", active: pipelineStep >= 2 },
    { num: 3, label: "Cluster", active: pipelineStep >= 3 },
    { num: 4, label: "Split", active: pipelineStep >= 4 },
    { num: 5, label: "Optimize", active: pipelineStep >= 5 },
  ];

  return (
    <div className="pb-24">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold">Route Optimization</h1>
        <p className="text-blue-100 text-[15px] mt-1">5-Step Pipeline for Delivery Routes</p>
      </div>

      <div className="flex items-center gap-1 px-3 py-3 bg-gray-50 overflow-x-auto">
        {steps.map((s, i) => (
          <button key={s.num} onClick={() => setPipelineStep(s.num)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
              pipelineStep === s.num ? "bg-blue-600 text-white shadow" :
              s.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-500"
            }`}>
            {s.active && pipelineStep > s.num ? <CheckCircle className="h-3 w-3" /> : <span className="font-mono">{s.num}</span>}
            <span>{s.label}</span>
            {i < steps.length - 1 && <ChevronRight className="h-3 w-3 ml-1 text-gray-300" />}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {pipelineStep === 1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[15px]">Step 1: Load & Validate Pins</h3>
              <Badge variant="outline" className="text-[13px]">{stops.length} stops</Badge>
            </div>
            <div className="flex gap-2">
              {stops.length === 0 && (
                <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} size="sm" className="flex-1">
                  {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Seed 30 Stops
                </Button>
              )}
              <Button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending || stops.length === 0} size="sm" variant="outline" className="flex-1">
                {validateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Validate Pins
              </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : stops.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-[15px]">No stops loaded yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {stops.map((s: any) => (
                  <div key={s.id} className={`flex items-center justify-between p-2.5 rounded-lg border text-[15px] ${s.pinStatus === 'error' ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px] truncate">{s.locationName}</p>
                      <p className="text-[12px] text-gray-400 truncate">{s.address}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-[12px] font-mono text-gray-500">{s.totalPockets}pk</span>
                      <Badge className={`text-[12px] px-1.5 ${s.pinStatus === 'valid' ? 'bg-green-100 text-green-700' : s.pinStatus === 'fixed' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {s.pinStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {stops.length > 0 && (
              <Button onClick={() => { demandMutation.mutate(); }} disabled={demandMutation.isPending} className="w-full" size="sm">
                {demandMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Next → Compute Demand
              </Button>
            )}
          </div>
        )}

        {pipelineStep === 2 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-[15px]">Step 2: Convert Demand to Bags</h3>
            {demandData ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{demandData.totalPockets}</p>
                  <p className="text-[12px] text-blue-500">Total Pockets</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{demandData.totalBags}</p>
                  <p className="text-[12px] text-green-500">Total Bags</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-orange-700">{demandData.totalWeightKg}</p>
                  <p className="text-[12px] text-orange-500">Weight (kg)</p>
                </div>
              </div>
            ) : (
              <Button onClick={() => demandMutation.mutate()} disabled={demandMutation.isPending} className="w-full" size="sm">
                {demandMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Compute Demand
              </Button>
            )}
            <Button onClick={() => { clusterMutation.mutate(); }} disabled={clusterMutation.isPending || !demandData} className="w-full" size="sm">
              {clusterMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Next → Geo Clustering
            </Button>
          </div>
        )}

        {pipelineStep === 3 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-[15px]">Step 3: Geo Clustering</h3>
            {clusterData ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-purple-700">{clusterData.clusters.length}</p>
                    <p className="text-[12px] text-purple-500">Clusters</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-indigo-700">{clusterData.totalVehicles}</p>
                    <p className="text-[12px] text-indigo-500">Vehicles Needed</p>
                  </div>
                </div>
                {clusterData.clusters.map((c: any, i: number) => (
                  <div key={i} className="border rounded-lg p-2.5 bg-white">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-[13px]">Cluster {c.clusterId}</span>
                      <span className="text-[12px] text-gray-500">{c.stopCount} stops · {c.totalBags} bags</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Button onClick={() => clusterMutation.mutate()} disabled={clusterMutation.isPending} className="w-full" size="sm">
                Run Clustering
              </Button>
            )}
            <Button onClick={() => { splitMutation.mutate(); }} disabled={splitMutation.isPending || !clusterData} className="w-full" size="sm">
              {splitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Next → Split Trips
            </Button>
          </div>
        )}

        {pipelineStep === 4 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-[15px]">Step 4: Trip Splitting</h3>
            {splitData ? (
              <div className="space-y-2">
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-amber-700">{splitData.totalTrips}</p>
                  <p className="text-[12px] text-amber-500">Trips Generated</p>
                </div>
                {splitData.trips.map((t: any, i: number) => (
                  <div key={i} className="border rounded-lg p-2.5 bg-white">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-[13px]">Trip {t.tripIndex + 1} (Cluster {t.clusterId})</span>
                      <span className="text-[12px] text-gray-500">{t.stops.length} stops · {t.totalBags} bags</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Button onClick={() => splitMutation.mutate()} disabled={splitMutation.isPending} className="w-full" size="sm">
                Split Trips
              </Button>
            )}
            <Button onClick={() => { if (splitData?.trips) optimizeMutation.mutate(splitData.trips); }} disabled={optimizeMutation.isPending || !splitData} className="w-full" size="sm">
              {optimizeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Next → Optimize Routes
            </Button>
          </div>
        )}

        {pipelineStep === 5 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-[15px]">Step 5: Optimized Routes</h3>
            {optimizeData ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-emerald-700">{optimizeData.totalKm}</p>
                    <p className="text-[12px] text-emerald-500">Total km</p>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-teal-700">{optimizeData.totalTrips}</p>
                    <p className="text-[12px] text-teal-500">Total Trips</p>
                  </div>
                </div>
                {optimizeData.optimizedTrips?.map((trip: any, i: number) => (
                  <div key={i} className="border rounded-lg bg-white overflow-hidden">
                    <button onClick={() => toggleTrip(i)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
                      <span className="font-medium text-[13px]">Trip {trip.tripIndex + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-gray-500">{trip.distanceKm} km · {trip.stops?.length || 0} stops</span>
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedTrips.has(i) ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                    {expandedTrips.has(i) && trip.stops && (
                      <div className="px-3 pb-3 space-y-1.5 border-t pt-2">
                        {trip.stops.map((stop: any, si: number) => (
                          <div key={si} className="flex items-center gap-2 text-[13px]">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[12px] font-bold flex-shrink-0">{si + 1}</span>
                            <span className="flex-1 truncate">{stop.locationName}</span>
                            {stop.lat && stop.lng && (
                              <a href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                                <Navigation className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Route className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-[15px]">Run the pipeline to see optimized routes</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BulkDeliveryTab({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
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
  const [fileInputEl, setFileInputEl] = useState<HTMLInputElement | null>(null);

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
    if (fileInputEl) fileInputEl.value = '';
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
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center gap-3 border-b">
        <FileSpreadsheet className="h-5 w-5 text-green-600" />
        <div>
          <h2 className="font-bold text-base">Bulk Delivery</h2>
          <p className="text-[13px] text-gray-400">Mode B — Manual Bills Upload & Optimization</p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="font-semibold text-[15px]">Upload Excel File</p>
          <button onClick={downloadTemplate} className="flex items-center gap-2 text-[15px] text-blue-600">
            <Download className="h-4 w-4" /> Download Template
          </button>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-100 transition" onClick={() => fileInputEl?.click()}>
            <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium text-[15px] text-gray-700">Tap to upload Excel</p>
            <p className="text-[13px] text-gray-400 mt-1">.xlsx files accepted</p>
            <input ref={(el) => setFileInputEl(el)} type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" />
          </div>
          {loading && !uploadResult && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-[15px] text-gray-500">Processing...</span>
            </div>
          )}
        </div>

        {uploadResult && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-[15px]">Upload Summary</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                <p className="text-[12px] text-gray-500">Total</p>
                <p className="text-lg font-bold">{uploadResult.totalRows}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2.5 text-center">
                <p className="text-[12px] text-green-600">Valid</p>
                <p className="text-lg font-bold text-green-700">{uploadResult.validRows}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                <p className="text-[12px] text-blue-600">Matched</p>
                <p className="text-lg font-bold text-blue-700">{uploadResult.matchedRows}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                <p className="text-[12px] text-orange-600">Unmatched</p>
                <p className="text-lg font-bold text-orange-700">{uploadResult.unmatchedRows}</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-2.5 text-center">
              <p className="text-[12px] text-red-600">Errors</p>
              <p className="text-lg font-bold text-red-700">{uploadResult.errorRows}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {uploadResult.errorRows > 0 && (
                <button onClick={() => downloadFile('errors')} className="flex items-center gap-1 text-[13px] text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                  <Download className="h-3 w-3" /> Errors
                </button>
              )}
              {uploadResult.unmatchedRows > 0 && (
                <button onClick={() => downloadFile('unmatched')} className="flex items-center gap-1 text-[13px] text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                  <Download className="h-3 w-3" /> Unmatched
                </button>
              )}
            </div>
          </div>
        )}

        {uploadResult && !optimized && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <p className="font-semibold text-[15px]">Trip Configuration</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-gray-500 block mb-1">Bag Weight (kg)</label>
                <Input type="number" min={1} value={bagWeightKg} onChange={e => setBagWeightKg(Number(e.target.value) || 13)} className="h-10" />
              </div>
              <div>
                <label className="text-[12px] text-gray-500 block mb-1">Pack Size</label>
                <Input type="number" min={1} value={packSize} onChange={e => setPackSize(Number(e.target.value) || 50)} className="h-10" />
              </div>
              <div>
                <label className="text-[12px] text-gray-500 block mb-1">Capacity Mode</label>
                <select value={capacityMode} onChange={e => setCapacityMode(e.target.value as 'bags' | 'tons')} className="w-full h-10 px-3 rounded-md border border-gray-200 text-[15px]">
                  <option value="bags">Bags</option>
                  <option value="tons">Tons</option>
                </select>
              </div>
              {capacityMode === 'bags' ? (
                <div>
                  <label className="text-[12px] text-gray-500 block mb-1">Capacity (bags)</label>
                  <Input type="number" min={1} value={vehicleCapacityBags} onChange={e => setVehicleCapacityBags(Number(e.target.value) || 154)} className="h-10" />
                </div>
              ) : (
                <div>
                  <label className="text-[12px] text-gray-500 block mb-1">Capacity (tons)</label>
                  <Input type="number" min={0.1} step={0.1} value={vehicleCapacityTons} onChange={e => setVehicleCapacityTons(Number(e.target.value) || 2)} className="h-10" />
                </div>
              )}
              <div>
                <label className="text-[12px] text-gray-500 block mb-1">Fuel (km/L)</label>
                <Input type="number" min={1} value={kmPerLiter} onChange={e => setKmPerLiter(Number(e.target.value) || 8)} className="h-10" />
              </div>
              <div>
                <label className="text-[12px] text-gray-500 block mb-1">Fuel Price (₹/L)</label>
                <Input type="number" min={1} value={fuelPricePerLiter} onChange={e => setFuelPricePerLiter(Number(e.target.value) || 105)} className="h-10" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-[13px] text-gray-500">
              Effective: {capacityMode === 'tons' ? `${vehicleCapacityTons}t (${Math.floor((vehicleCapacityTons * 1000) / bagWeightKg)} bags)` : `${vehicleCapacityBags} bags (${((vehicleCapacityBags * bagWeightKg) / 1000).toFixed(1)}t)`}
            </div>
            <button
              onClick={runOptimize}
              disabled={loading || (uploadResult?.errorRows || 0) > 0}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Route className="h-4 w-4" /> {loading ? 'Optimizing...' : 'Optimize + Split by Capacity'}
            </button>
          </div>
        )}

        {optimized && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="font-semibold text-[15px]">Summary</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                  <p className="text-[12px] text-blue-500">Routes</p>
                  <p className="text-lg font-bold text-blue-700">{optimized.routeSummary?.length || 0}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2.5 text-center">
                  <p className="text-[12px] text-purple-500">Vehicles</p>
                  <p className="text-lg font-bold text-purple-700">{totalVehicles}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                  <p className="text-[12px] text-orange-500">Weight</p>
                  <p className="text-lg font-bold text-orange-700">{(totalKg / 1000).toFixed(1)}t</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                  <p className="text-[12px] text-amber-600">Fuel</p>
                  <p className="text-lg font-bold text-amber-700">{totalFuelL.toFixed(1)} L</p>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-2.5 text-center">
                <p className="text-[12px] text-red-500">Fuel Cost</p>
                <p className="text-lg font-bold text-red-700">₹{totalFuelCost.toFixed(0)}</p>
              </div>
            </div>

            <div className="space-y-2">
              {optimized.routeSummary?.map((r: any) => (
                <div key={r.routeNo} className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[15px]">Route {r.routeNo}</span>
                    <Badge className="bg-purple-100 text-purple-700 text-[11px]">{r.vehiclesNeeded || 1} vehicle{(r.vehiclesNeeded || 1) > 1 ? 's' : ''}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-gray-500">
                    <span>{r.stopsCount} stops</span>
                    <span>{r.totalBags} bags</span>
                    <span>{r.totalDistanceKm} km</span>
                    <span>{((r.totalKg || 0) / 1000).toFixed(1)}t</span>
                    <span>{(r.totalFuelLiters || 0).toFixed(1)} L</span>
                    <span>₹{(r.totalFuelCost || 0).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>

            {totalTrips > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="font-semibold text-[15px] mb-2">Trip Breakdown ({totalTrips} trips)</p>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 px-1 font-medium text-gray-500">Rte</th>
                        <th className="text-left py-1.5 px-1 font-medium text-gray-500">Trip</th>
                        <th className="text-left py-1.5 px-1 font-medium text-gray-500">Stops</th>
                        <th className="text-left py-1.5 px-1 font-medium text-gray-500">Bags</th>
                        <th className="text-left py-1.5 px-1 font-medium text-gray-500">Wt</th>
                        <th className="text-left py-1.5 px-1 font-medium text-gray-500">KM</th>
                        <th className="text-left py-1.5 px-1 font-medium text-gray-500">Fuel</th>
                        <th className="text-left py-1.5 px-1 font-medium text-gray-500">₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optimized.tripSummaries?.map((t: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1.5 px-1 font-medium">{t.routeNo}</td>
                          <td className="py-1.5 px-1"><Badge className="bg-gray-100 text-gray-700 text-[12px]">T{t.tripNo}</Badge></td>
                          <td className="py-1.5 px-1">{t.stopsCount}</td>
                          <td className="py-1.5 px-1">{t.bags}</td>
                          <td className="py-1.5 px-1">{(t.kg / 1000).toFixed(2)}t</td>
                          <td className="py-1.5 px-1">{t.distanceKm}</td>
                          <td className="py-1.5 px-1">{t.fuelLiters}</td>
                          <td className="py-1.5 px-1">₹{t.fuelCost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-[15px] mb-2">Optimized Stops ({optimized.optimizedStops?.length || 0})</p>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1.5 px-1 font-medium text-gray-500">Seq</th>
                      <th className="text-left py-1.5 px-1 font-medium text-gray-500">Rte</th>
                      <th className="text-left py-1.5 px-1 font-medium text-gray-500">Location</th>
                      <th className="text-left py-1.5 px-1 font-medium text-gray-500">Pkts</th>
                      <th className="text-left py-1.5 px-1 font-medium text-gray-500">BAGS</th>
                      <th className="text-left py-1.5 px-1 font-medium text-gray-500">Div</th>
                      <th className="text-left py-1.5 px-1 font-medium text-gray-500">KM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optimized.optimizedStops?.slice(0, 50).map((s: any) => (
                      <tr key={s.stopSeq} className="border-b border-gray-50">
                        <td className="py-1.5 px-1 font-bold">{s.stopSeq}</td>
                        <td className="py-1.5 px-1">{s.routeNo}</td>
                        <td className="py-1.5 px-1 max-w-[120px] truncate">{s.locationName}</td>
                        <td className="py-1.5 px-1">{s.totalQtyNos}</td>
                        <td className="py-1.5 px-1">{s.bags}</td>
                        <td className="py-1.5 px-1">{s.division || '-'}</td>
                        <td className="py-1.5 px-1">{s.cumulativeKm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(optimized.optimizedStops?.length || 0) > 50 && (
                  <p className="text-[11px] text-center text-gray-400 py-2">Showing first 50 of {optimized.optimizedStops.length}. Download XLSX for all.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => downloadFile('optimizedStops')} className="flex items-center justify-center gap-1.5 text-[13px] bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-gray-700">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Stops XLSX
              </button>
              <button onClick={() => downloadFile('routeSummary')} className="flex items-center justify-center gap-1.5 text-[13px] bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-gray-700">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Summary
              </button>
              <button onClick={() => downloadFile('tripsExcel')} className="flex items-center justify-center gap-1.5 text-[13px] bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-gray-700">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Trips XLSX
              </button>
              <button onClick={() => downloadFile('tripSheet')} className="flex items-center justify-center gap-1.5 text-[13px] bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-gray-700">
                <FileText className="h-3.5 w-3.5" /> Trip Sheet PDF
              </button>
              <button onClick={() => downloadFile('vehicleTripSheets')} className="flex items-center justify-center gap-1.5 text-[13px] bg-purple-50 border border-purple-200 rounded-xl py-2.5 px-3 text-purple-700 col-span-2">
                <Truck className="h-3.5 w-3.5" /> Vehicle Trip Sheets PDF
              </button>
              <button onClick={() => downloadFile('editable')} className="flex items-center justify-center gap-1.5 text-[13px] bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-gray-700">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Editable
              </button>
              <button onClick={createTrip} disabled={loading} className="flex items-center justify-center gap-1.5 text-[13px] bg-green-600 text-white rounded-xl py-2.5 px-3 disabled:opacity-50">
                <Truck className="h-3.5 w-3.5" /> Dispatch
              </button>
            </div>

            <button onClick={() => setOptimized(null)} className="w-full flex items-center justify-center gap-2 text-[13px] text-gray-500 bg-gray-50 border border-gray-200 rounded-xl py-2.5">
              <Settings className="h-3.5 w-3.5" /> Re-configure & Re-optimize
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BottomNav({ activeTab, onTabChange, onMoreClick }: { activeTab: TabId; onTabChange: (tab: TabId) => void; onMoreClick: () => void }) {
  const mainTabs = [
    { id: 'home' as TabId, icon: Home, label: 'Home' },
    { id: 'orders' as TabId, icon: ShoppingBag, label: 'Orders' },
    { id: 'b2b' as TabId, icon: Users, label: 'B2B' },
    { id: 'tracking' as TabId, icon: MapPin, label: 'Tracking' },
  ];

  const isMoreActive = ['products', 'union', 'sfa', 'account', 'reports', 'route_optimizer', 'bulk_delivery'].includes(activeTab);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 max-w-md mx-auto">
      <div className="flex justify-around py-2">
        {mainTabs.map((tab) => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
              activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
            }`}>
            <tab.icon className="h-5 w-5" />
            <span className="text-[12px] font-medium">{tab.label}</span>
          </button>
        ))}
        <button onClick={onMoreClick}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${isMoreActive ? 'text-blue-600' : 'text-gray-400'}`}>
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[12px] font-medium">More</span>
        </button>
      </div>
      <div className="h-safe-area-inset-bottom bg-white" />
    </div>
  );
}

export default function PwaStaffApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('pwaStaffSession');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.isStaff) {
          setIsLoggedIn(true);
        }
      } catch {}
    }
  }, []);

  const staffSession = (() => {
    try {
      const stored = localStorage.getItem('pwaStaffSession');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();

  const { data: merchant, isLoading: merchantLoading, error: merchantError } = useQuery<any>({
    queryKey: ['/api/merchant/me'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Not authenticated');
      return res.json();
    },
    enabled: isLoggedIn,
    retry: 3,
    retryDelay: 1000,
  });

  const merchantId = merchant?.id;

  const staffParsedOffices = parseStaffOffices(staffSession?.assignedOffice);

  const buildStaffFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (staffParsedOffices.length > 0) params.set('staffOffice', staffParsedOffices.join(','));
    if (staffSession?.assignedSegments?.length > 0) params.set('staffSegments', staffSession.assignedSegments.join(','));
    return params.toString() ? `?${params.toString()}` : '';
  }, [staffSession, staffParsedOffices]);

  const { data: ordersData = [] } = useQuery<any[]>({
    queryKey: ['/api/union', merchantId, 'orders', 'pwa-staff', staffParsedOffices.join(',')],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await fetch(`/api/union/${merchantId}/orders${buildStaffFilterParams()}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!merchantId && isLoggedIn,
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order updated" });
      setDetailOrder(null);
      queryClient.invalidateQueries({ queryKey: ['/api/union'] });
    },
    onError: () => {
      toast({ title: "Failed to update order", variant: "destructive" });
    },
  });

  const sendToDeliveryMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/delivery-jobs/from-order/${orderId}`);
      return res.json();
    },
    onSuccess: (data) => {
      const status = data?.status || 'created';
      toast({ title: status === 'ready_for_trip' ? "Sent to delivery" : "Delivery job created (needs validation)", description: status === 'ready_for_trip' ? "Order will appear in Trip Planning" : (data?.validationErrors || []).join(', ') });
      queryClient.invalidateQueries({ queryKey: ['/api/union'] });
    },
    onError: () => {
      toast({ title: "Failed to send to delivery", variant: "destructive" });
    },
  });

  const handleStaffLogin = () => {
    setIsLoggedIn(true);
    queryClient.invalidateQueries({ queryKey: ['/api/merchant/me'] });
  };

  if (!isLoggedIn) {
    return <StaffLoginForm onLogin={handleStaffLogin} />;
  }

  if (merchantLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (merchantError) {
    return <StaffLoginForm onLogin={handleStaffLogin} />;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/merchant/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.removeItem('pwaStaffSession');
    localStorage.removeItem('pwaStaffMerchantId');
    setIsLoggedIn(false);
    queryClient.clear();
  };

  const handleTabChange = (tab: TabId) => {
    setDetailOrder(null);
    setShowMoreMenu(false);
    setActiveTab(tab);
  };

  if (detailOrder) {
    return (
      <>
        <OrderDetailPage
          order={detailOrder}
          onBack={() => setDetailOrder(null)}
          onAccept={() => updateMutation.mutate({ orderId: detailOrder.id, status: 'accepted' })}
          onReject={() => updateMutation.mutate({ orderId: detailOrder.id, status: 'cancelled' })}
          isUpdating={updateMutation.isPending}
          onSendToDelivery={() => sendToDeliveryMutation.mutate(detailOrder.id)}
          isSendingToDelivery={sendToDeliveryMutation.isPending}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} onMoreClick={() => setShowMoreMenu(true)} />
      </>
    );
  }

  const moreMenuItems = [
    { id: 'delivery' as TabId, icon: Truck, label: 'Delivery', desc: 'Manage drivers & deliveries' },
    { id: 'bulk_delivery' as TabId, icon: FileSpreadsheet, label: 'Bulk Delivery', desc: 'Mode B manual bills upload & optimization' },
    { id: 'route_optimizer' as TabId, icon: Route, label: 'Route Optimization', desc: '5-step delivery route optimizer pipeline' },
    { id: 'reports' as TabId, icon: BarChart3, label: 'Reports', desc: 'Sales reports & analytics' },
    { id: 'products' as TabId, icon: Box, label: 'Products', desc: 'View product catalog' },
    { id: 'union' as TabId, icon: Store, label: 'Union', desc: 'District union overview' },
    { id: 'mmo_offices' as TabId, icon: Building2, label: 'MMO Offices', desc: 'Offices, routes & dispatch' },
    { id: 'sfa' as TabId, icon: Target, label: 'SFA', desc: 'Sales force automation & tracking' },
    { id: 'account' as TabId, icon: User, label: 'Account', desc: 'Profile settings & activity' },
  ];

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto relative">
      {activeTab === 'home' && (
        <HomeTab
          ordersData={ordersData}
          onViewOrder={(order) => setDetailOrder(order)}
          onNotificationClick={() => { setActiveTab('orders'); }}
        />
      )}
      {activeTab === 'orders' && (
        <OrdersTab ordersData={ordersData} onViewOrder={(order) => setDetailOrder(order)} />
      )}
      {activeTab === 'b2b' && merchantId && (
        <B2BTab merchantId={merchantId} />
      )}
      {activeTab === 'tracking' && merchantId && (
        <TrackingTab merchantId={merchantId} staffSession={staffSession} />
      )}
      {activeTab === 'products' && (
        <ProductsTab ordersData={ordersData} />
      )}
      {activeTab === 'union' && (
        <UnionTab merchant={merchant} ordersData={ordersData} />
      )}
      {activeTab === 'sfa' && merchantId && (
        <SFATab merchantId={merchantId} />
      )}
      {activeTab === 'delivery' && merchantId && (
        <DeliveryManagementTab merchantId={merchantId} />
      )}
      {activeTab === 'route_optimizer' && merchantId && (
        <RouteOptimizerTab merchantId={merchantId} />
      )}
      {activeTab === 'bulk_delivery' && merchantId && (
        <BulkDeliveryTab merchantId={merchantId} />
      )}
      {activeTab === 'reports' && (
        <ReportsTab ordersData={ordersData} b2bMerchantId={merchantId} />
      )}
      {activeTab === 'mmo_offices' && merchantId && (
        <MMOOfficesTab merchantId={merchantId} staffSession={staffSession} />
      )}
      {activeTab === 'account' && (
        <AccountTab
          merchant={merchant}
          staffSession={staffSession}
          ordersData={ordersData}
          onLogout={handleLogout}
        />
      )}

      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl animate-in slide-in-from-bottom duration-300 pb-20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-bold text-base">More Options</h3>
              <button onClick={() => setShowMoreMenu(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-2">
              {moreMenuItems.map((item) => (
                <button key={item.id} onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                    activeTab === item.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === item.id ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
                    <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium text-[15px] ${activeTab === item.id ? 'text-blue-700' : 'text-gray-900'}`}>{item.label}</p>
                    <p className="text-[13px] text-gray-400">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} onMoreClick={() => setShowMoreMenu(true)} />
    </div>
  );
}
