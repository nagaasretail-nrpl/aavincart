import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  LayoutDashboard, ShoppingBag, BarChart3, User,
  LogOut, Lock, Mail, Store, Eye, ChevronRight,
  Package, IndianRupee, Clock, CheckCircle, AlertCircle,
  TrendingUp, Users, FileText, Loader2, ArrowLeft
} from "lucide-react";

type TabId = 'dashboard' | 'orders' | 'report' | 'profile';
type ReportView = 'menu' | 'agent-wise' | 'item-wise' | 'daily-sales' | 'segment-wise';
type OrderFilter = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled';

function StaffLoginForm({ onLogin }: { onLogin: () => void }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant/login", { username, password });
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        if (data.staffSession) {
          sessionStorage.setItem('staffSession', JSON.stringify(data.staffSession));
        }
        toast({ title: "Login successful" });
        onLogin();
      } else {
        toast({ title: "Login Failed", description: data.message || "Invalid credentials", variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Login Failed", description: error.message || "Invalid credentials", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d1b4e] to-[#1a0f30] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Store className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Staff Login</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your staff dashboard</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-sm font-medium">Username</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" className="h-11 pl-10 rounded-xl" required />
            </div>
          </div>
          <div>
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="h-11 pl-10 rounded-xl" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-11 bg-[#2d1b4e] hover:bg-[#3d2b5e] text-white rounded-xl font-semibold" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in...</> : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function DashboardTab({ merchantId, ordersData }: { merchantId: string; ordersData: any[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = ordersData.filter((o: any) => {
    const d = o.createdAt ? new Date(o.createdAt) : null;
    return d && d >= today;
  });
  const todayReceived = todayOrders.length;
  const todayDelivered = todayOrders.filter((o: any) => o.status === 'completed' || o.status === 'delivered').length;
  const todaySales = todayOrders.filter((o: any) => o.status === 'completed' || o.status === 'delivered').reduce((s: number, o: any) => s + (parseFloat(o.total) || 0), 0);
  const pendingOrders = ordersData.filter((o: any) => o.status === 'pending');
  const processingCount = ordersData.filter((o: any) => o.status === 'accepted' || o.status === 'processing').length;

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const monthOrders = ordersData.filter((o: any) => {
    const d = o.createdAt ? new Date(o.createdAt) : null;
    return d && d >= thisMonth && (o.status === 'completed' || o.status === 'delivered');
  });
  const itemCounts: Record<string, { name: string; count: number }> = {};
  monthOrders.forEach((o: any) => {
    const items = o.items || [];
    const arr = typeof items === 'string' ? (() => { try { return JSON.parse(items); } catch { return []; } })() : (Array.isArray(items) ? items : []);
    arr.forEach((item: any) => {
      const name = item.name || item.productName || 'Unknown';
      if (!itemCounts[name]) itemCounts[name] = { name, count: 0 };
      itemCounts[name].count += (item.quantity || 1);
    });
  });
  const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <div className="space-y-4 px-4 pb-24">
      <h2 className="text-lg font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-xl border-0 shadow-sm bg-green-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{todayReceived}</p>
            <p className="text-xs text-gray-600 mt-1">Orders Today</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm bg-blue-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{todayDelivered}</p>
            <p className="text-xs text-gray-600 mt-1">Delivered Today</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm bg-purple-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">₹{todaySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-gray-600 mt-1">Today Sales</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm bg-amber-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingOrders.length}</p>
            <p className="text-xs text-gray-600 mt-1">Pending Orders</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-base font-semibold">Pending Orders Today</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {pendingOrders.length > 0 ? (
            <div className="space-y-2">
              {pendingOrders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-sm">ORD-{String(order.id).padStart(4, '0')}</p>
                    <p className="text-xs text-gray-500">{order.customerName || 'Customer'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">₹{parseFloat(order.total || 0).toLocaleString('en-IN')}</p>
                    <Badge className="bg-orange-100 text-orange-700 text-[12px]">pending</Badge>
                  </div>
                </div>
              ))}
              {pendingOrders.length > 5 && (
                <p className="text-center text-xs text-purple-600 font-medium pt-1">+{pendingOrders.length - 5} more pending</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No pending orders</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-base font-semibold">Top 3 Items Sold This Month</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {topItems.length > 0 ? (
            <div className="space-y-2">
              {topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-sm font-bold text-purple-600">#{idx + 1}</div>
                    <p className="font-medium text-sm">{item.name}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">{item.count} sold</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No completed orders this month</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-base font-semibold">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <div className="flex justify-between p-2 bg-yellow-50 rounded-lg">
            <span className="text-sm">Pending</span>
            <span className="font-bold text-yellow-600">{pendingOrders.length}</span>
          </div>
          <div className="flex justify-between p-2 bg-blue-50 rounded-lg">
            <span className="text-sm">Processing</span>
            <span className="font-bold text-blue-600">{processingCount}</span>
          </div>
          <div className="flex justify-between p-2 bg-green-50 rounded-lg">
            <span className="text-sm">Completed</span>
            <span className="font-bold text-green-600">{ordersData.filter((o: any) => o.status === 'completed' || o.status === 'delivered').length}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
            <span className="text-sm">Total Orders</span>
            <span className="font-bold">{ordersData.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrdersTab({ merchantId, ordersData }: { merchantId: string; ordersData: any[] }) {
  const [filter, setFilter] = useState<OrderFilter>('all');

  const filtered = filter === 'all' ? ordersData
    : filter === 'pending' ? ordersData.filter((o: any) => o.status === 'pending')
    : filter === 'processing' ? ordersData.filter((o: any) => o.status === 'accepted' || o.status === 'processing')
    : filter === 'completed' ? ordersData.filter((o: any) => o.status === 'completed' || o.status === 'delivered')
    : ordersData.filter((o: any) => o.status === 'cancelled');

  const statusColor = (s: string) =>
    s === 'pending' ? 'bg-orange-100 text-orange-700' :
    s === 'accepted' || s === 'processing' ? 'bg-blue-100 text-blue-700' :
    s === 'completed' || s === 'delivered' ? 'bg-green-100 text-green-700' :
    s === 'cancelled' ? 'bg-red-100 text-red-700' :
    s === 'ready' ? 'bg-purple-100 text-purple-700' :
    'bg-gray-100 text-gray-700';

  return (
    <div className="px-4 pb-24 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Orders</h2>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(['all', 'pending', 'processing', 'completed', 'cancelled'] as OrderFilter[]).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
            className={`rounded-full text-xs whitespace-nowrap ${filter === f ? 'bg-[#2d1b4e]' : ''}`}
            onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${ordersData.length})` :
             f === 'pending' ? `Pending (${ordersData.filter((o: any) => o.status === 'pending').length})` :
             f === 'processing' ? `Processing (${ordersData.filter((o: any) => o.status === 'accepted' || o.status === 'processing').length})` :
             f === 'completed' ? `Completed (${ordersData.filter((o: any) => o.status === 'completed' || o.status === 'delivered').length})` :
             `Cancelled (${ordersData.filter((o: any) => o.status === 'cancelled').length})`}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? filtered.slice(0, 50).map((order: any) => (
          <Card key={order.id} className="rounded-xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-sm text-purple-700">ORD-{String(order.id).padStart(4, '0')}</p>
                <Badge className={`${statusColor(order.status)} text-xs`}>{order.status}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{order.customerName || order.customer_name || 'Customer'}</span>
                <span className="font-semibold">₹{parseFloat(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                <span>{order.paymentMethod || order.payment_method || 'COD'}</span>
                <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
              </div>
            </CardContent>
          </Card>
        )) : (
          <p className="text-center text-gray-400 py-8">No orders found</p>
        )}
      </div>
    </div>
  );
}

function ReportTab({ merchantId, ordersData }: { merchantId: string; ordersData: any[] }) {
  const [view, setView] = useState<ReportView>('menu');

  const parseItems = (order: any) => {
    const items = order.items || [];
    if (typeof items === 'string') { try { return JSON.parse(items); } catch { return []; } }
    return Array.isArray(items) ? items : [];
  };

  const completedOrders = ordersData.filter((o: any) => o.status === 'completed' || o.status === 'delivered');

  if (view === 'menu') {
    return (
      <div className="px-4 pb-24 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Reports</h2>
        <div className="space-y-3">
          {[
            { id: 'agent-wise' as ReportView, label: 'Agent-wise Report', desc: 'Sales breakdown by agent/buyer', icon: Users, color: 'bg-blue-100 text-blue-600' },
            { id: 'item-wise' as ReportView, label: 'Item-wise Report', desc: 'Product-wise sales analysis', icon: Package, color: 'bg-green-100 text-green-600' },
            { id: 'daily-sales' as ReportView, label: 'Daily Sales Report', desc: 'Day-by-day sales summary', icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
            { id: 'segment-wise' as ReportView, label: 'Segment-wise Report', desc: 'Fresh Milk, Products, Ice Cream breakdown', icon: BarChart3, color: 'bg-amber-100 text-amber-600' },
          ].map((report) => (
            <Card key={report.id} className="rounded-xl border-0 shadow-sm cursor-pointer active:bg-gray-50" onClick={() => setView(report.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${report.color} rounded-xl flex items-center justify-center`}>
                    <report.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{report.label}</p>
                    <p className="text-xs text-gray-500">{report.desc}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const BackButton = () => (
    <button onClick={() => setView('menu')} className="flex items-center gap-1 text-purple-600 text-sm font-medium mb-3">
      <ArrowLeft className="h-4 w-4" /> Back to Reports
    </button>
  );

  if (view === 'agent-wise') {
    const agentSales: Record<string, { name: string; orders: number; total: number }> = {};
    completedOrders.forEach((o: any) => {
      const name = o.customerName || o.customer_name || 'Walk-in';
      if (!agentSales[name]) agentSales[name] = { name, orders: 0, total: 0 };
      agentSales[name].orders++;
      agentSales[name].total += (parseFloat(o.total) || 0);
    });
    const sorted = Object.values(agentSales).sort((a, b) => b.total - a.total);

    return (
      <div className="px-4 pb-24 space-y-4">
        <BackButton />
        <h2 className="text-lg font-bold text-gray-900">Agent-wise Report</h2>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Card className="rounded-xl border-0 shadow-sm bg-blue-50">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{sorted.length}</p>
              <p className="text-xs text-gray-600">Total Agents</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-0 shadow-sm bg-green-50">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-green-600">₹{sorted.reduce((s, a) => s + a.total, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-gray-600">Total Sales</p>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-2">
          {sorted.slice(0, 20).map((agent, idx) => (
            <Card key={idx} className="rounded-xl border-0 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.orders} orders</p>
                  </div>
                </div>
                <p className="font-bold text-sm text-green-600">₹{agent.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </CardContent>
            </Card>
          ))}
          {sorted.length === 0 && <p className="text-center text-gray-400 py-8">No completed orders data</p>}
        </div>
      </div>
    );
  }

  if (view === 'item-wise') {
    const itemSales: Record<string, { name: string; qty: number; revenue: number; segment: string }> = {};
    completedOrders.forEach((o: any) => {
      parseItems(o).forEach((item: any) => {
        const name = item.name || item.productName || 'Unknown';
        const price = parseFloat(item.price || item.unitPrice || 0);
        const qty = item.quantity || 1;
        if (!itemSales[name]) itemSales[name] = { name, qty: 0, revenue: 0, segment: item.segment || '' };
        itemSales[name].qty += qty;
        itemSales[name].revenue += price * qty;
      });
    });
    const sorted = Object.values(itemSales).sort((a, b) => b.qty - a.qty);

    return (
      <div className="px-4 pb-24 space-y-4">
        <BackButton />
        <h2 className="text-lg font-bold text-gray-900">Item-wise Report</h2>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <Card className="rounded-xl border-0 shadow-sm bg-green-50">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-green-600">{sorted.length}</p>
              <p className="text-xs text-gray-600">Products Sold</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-0 shadow-sm bg-purple-50">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-purple-600">{sorted.reduce((s, i) => s + i.qty, 0)}</p>
              <p className="text-xs text-gray-600">Total Qty Sold</p>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-2">
          {sorted.slice(0, 30).map((item, idx) => (
            <Card key={idx} className="rounded-xl border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {item.segment && <p className="text-xs text-gray-500">{item.segment}</p>}
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-sm">{item.qty} units</p>
                    <p className="text-xs text-green-600">₹{item.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {sorted.length === 0 && <p className="text-center text-gray-400 py-8">No item data available</p>}
        </div>
      </div>
    );
  }

  if (view === 'daily-sales') {
    const dailySales: Record<string, { date: string; orders: number; total: number }> = {};
    completedOrders.forEach((o: any) => {
      const d = o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown';
      if (!dailySales[d]) dailySales[d] = { date: d, orders: 0, total: 0 };
      dailySales[d].orders++;
      dailySales[d].total += (parseFloat(o.total) || 0);
    });
    const sorted = Object.values(dailySales).reverse();

    return (
      <div className="px-4 pb-24 space-y-4">
        <BackButton />
        <h2 className="text-lg font-bold text-gray-900">Daily Sales Report</h2>
        <div className="space-y-2">
          {sorted.length > 0 ? sorted.map((day, idx) => (
            <Card key={idx} className="rounded-xl border-0 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{day.date}</p>
                  <p className="text-xs text-gray-500">{day.orders} orders</p>
                </div>
                <p className="font-bold text-green-600">₹{day.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </CardContent>
            </Card>
          )) : (
            <p className="text-center text-gray-400 py-8">No sales data available</p>
          )}
        </div>
      </div>
    );
  }

  if (view === 'segment-wise') {
    const segments: Record<string, { name: string; orders: number; total: number; items: number }> = {
      'Fresh Milk': { name: 'Fresh Milk', orders: 0, total: 0, items: 0 },
      'Products': { name: 'Products', orders: 0, total: 0, items: 0 },
      'Ice Cream': { name: 'Ice Cream', orders: 0, total: 0, items: 0 },
    };
    completedOrders.forEach((o: any) => {
      parseItems(o).forEach((item: any) => {
        const seg = item.segment || 'Products';
        if (!segments[seg]) segments[seg] = { name: seg, orders: 0, total: 0, items: 0 };
        segments[seg].items += (item.quantity || 1);
        segments[seg].total += (parseFloat(item.price || item.unitPrice || 0) * (item.quantity || 1));
      });
      const orderSegs = new Set(parseItems(o).map((i: any) => i.segment || 'Products'));
      orderSegs.forEach((s: any) => { if (segments[s]) segments[s].orders++; });
    });

    return (
      <div className="px-4 pb-24 space-y-4">
        <BackButton />
        <h2 className="text-lg font-bold text-gray-900">Segment-wise Report</h2>
        <div className="space-y-3">
          {Object.values(segments).map((seg, idx) => (
            <Card key={idx} className={`rounded-xl border-0 shadow-sm ${seg.name === 'Fresh Milk' ? 'bg-blue-50' : seg.name === 'Products' ? 'bg-green-50' : 'bg-pink-50'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-base">{seg.name === 'Fresh Milk' ? '🥛' : seg.name === 'Ice Cream' ? '🍦' : '📦'} {seg.name}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{seg.orders}</p>
                    <p className="text-xs text-gray-500">Orders</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{seg.items}</p>
                    <p className="text-xs text-gray-500">Items</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">₹{seg.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function ProfileTab({ merchant, staffSession, onLogout }: { merchant: any; staffSession: any; onLogout: () => void }) {
  return (
    <div className="px-4 pb-24 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Profile</h2>

      <Card className="rounded-xl border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-purple-600">
                {(staffSession?.name || merchant?.contactName || 'S').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-bold text-base">{staffSession?.name || merchant?.contactName || 'Staff'}</p>
              <p className="text-sm text-gray-500">{staffSession?.username || merchant?.contactEmail || ''}</p>
              {staffSession?.designation && (
                <Badge className="bg-purple-100 text-purple-700 text-xs mt-1">{staffSession.designation}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {staffSession && (
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold">Staff Details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {staffSession.accessTier && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Access Level</span>
                <span className="font-medium">{staffSession.accessTier.replace(/_/g, ' ')}</span>
              </div>
            )}
            {staffSession.assignedOffice && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Office</span>
                <span className="font-medium">{staffSession.assignedOffice}</span>
              </div>
            )}
            {staffSession.assignedSegments && staffSession.assignedSegments.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Segments</span>
                <span className="font-medium">{staffSession.assignedSegments.join(', ')}</span>
              </div>
            )}
            {staffSession.permissions && (
              <div className="text-sm">
                <p className="text-gray-500 mb-1">Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {staffSession.permissions.slice(0, 8).map((p: string) => (
                    <Badge key={p} variant="outline" className="text-[12px]">{p.replace(/_/g, ' ')}</Badge>
                  ))}
                  {staffSession.permissions.length > 8 && (
                    <Badge variant="outline" className="text-[12px]">+{staffSession.permissions.length - 8} more</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-base font-semibold">Union Details</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Union Name</span>
            <span className="font-medium">{merchant?.restaurantName || '-'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Union ID</span>
            <span className="font-medium">{merchant?.id || '-'}</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onLogout} variant="outline" className="w-full h-11 rounded-xl text-red-600 border-red-200 hover:bg-red-50">
        <LogOut className="h-4 w-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}

export default function MobileStaffDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { toast } = useToast();

  const { data: merchant, isLoading: merchantLoading, error: merchantError } = useQuery<any>({
    queryKey: ['/api/merchant/me'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Not authenticated');
      return res.json();
    },
    enabled: isLoggedIn,
    retry: false,
  });

  useEffect(() => {
    fetch('/api/merchant/me', { credentials: 'include' })
      .then(res => { if (res.ok) setIsLoggedIn(true); })
      .catch(() => {});
  }, []);

  const staffSession = (() => {
    try {
      const stored = sessionStorage.getItem('staffSession');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();

  const merchantId = merchant?.id;

  const buildStaffFilterParams = () => {
    const params = new URLSearchParams();
    if (staffSession?.assignedOffice) params.set('staffOffice', staffSession.assignedOffice);
    if (staffSession?.assignedSegments?.length > 0) params.set('staffSegments', staffSession.assignedSegments.join(','));
    return params.toString() ? `?${params.toString()}` : '';
  };

  const { data: ordersData = [] } = useQuery<any[]>({
    queryKey: ['/api/union', merchantId, 'orders', 'mobile-staff', staffSession?.assignedOffice],
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

  if (!isLoggedIn) {
    return <StaffLoginForm onLogin={() => setIsLoggedIn(true)} />;
  }

  if (merchantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (merchantError) {
    return <StaffLoginForm onLogin={() => { setIsLoggedIn(true); queryClient.invalidateQueries({ queryKey: ['/api/merchant/me'] }); }} />;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/merchant/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    sessionStorage.removeItem('staffSession');
    setIsLoggedIn(false);
    queryClient.clear();
  };

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'report', label: 'Report', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 bg-[#2d1b4e] text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">{(staffSession?.name || merchant?.contactName || 'S').charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-sm">{staffSession?.name || merchant?.contactName || 'Staff'}</p>
            <p className="text-xs text-purple-200">{merchant?.restaurantName || 'District Union'}</p>
          </div>
        </div>
        {ordersData.filter((o: any) => o.status === 'pending').length > 0 && (
          <Badge className="bg-red-500 text-white">{ordersData.filter((o: any) => o.status === 'pending').length} pending</Badge>
        )}
      </div>

      <div className="pt-3">
        {activeTab === 'dashboard' && <DashboardTab merchantId={merchantId} ordersData={ordersData} />}
        {activeTab === 'orders' && <OrdersTab merchantId={merchantId} ordersData={ordersData} />}
        {activeTab === 'report' && <ReportTab merchantId={merchantId} ordersData={ordersData} />}
        {activeTab === 'profile' && <ProfileTab merchant={merchant} staffSession={staffSession} onLogout={handleLogout} />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? 'text-[#2d1b4e] bg-purple-50'
                  : 'text-gray-400'
              }`}
            >
              <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-[#2d1b4e]' : ''}`} />
              <span className="text-[12px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>
    </div>
  );
}
