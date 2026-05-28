import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Store, 
  ShoppingBag, 
  DollarSign,
  CreditCard,
  RefreshCw,
  UserPlus,
  Calendar,
  BarChart3,
  Eye,
  Edit,
  Printer,
  ChevronRight,
  Filter,
  Layers,
  Activity,
  Trophy,
  Building2,
  Truck,
  Hotel,
  GraduationCap,
  Warehouse,
  LogIn
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "./layout";

interface RoleCounts {
  federation: number;
  interUnion: number;
  wholesaleDealer: number;
  dealer: number;
  retailer: number;
  mrp: number;
}

interface AnalyticsData {
  totalSales: number;
  totalMerchants: number;
  totalCommission: number;
  totalSubscriptions: number;
  commissionWeek: number;
  commissionMonth: number;
  subscriptionsMonth: number;
  ordersReceived: number;
  ordersDelivered: number;
  newCustomers: number;
  totalRefund: number;
  recentOrders: Array<{
    id: string;
    status: string;
    total: number;
    customerEmail: string;
    restaurantName: string;
    createdAt: string;
    productSegment?: string;
    pricingRole?: string;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    totalOrders: number;
    totalSpent: number;
  }>;
  roleWiseOrders?: RoleCounts;
  segmentWiseOrders?: {
    freshMilk: number;
    products: number;
    iceCream: number;
  };
  segmentRoleOrders?: {
    freshMilk: RoleCounts;
    products: RoleCounts;
    iceCream: RoleCounts;
  };
}

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const duration = 800;
    const start = ref.current;
    const end = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);
      ref.current = current;
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('en-IN')}{suffix}</span>;
}

const SEGMENT_CONFIG = {
  'Fresh Milk': { icon: '🥛', color: 'blue', label: 'Fresh Milk', bgFrom: 'from-blue-500', bgTo: 'to-blue-600', lightBg: 'bg-blue-50 dark:bg-blue-900/20', lightText: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-700', ring: 'ring-blue-500' },
  'Products': { icon: '📦', color: 'green', label: 'Products', bgFrom: 'from-emerald-500', bgTo: 'to-emerald-600', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', lightText: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-700', ring: 'ring-emerald-500' },
  'Ice Cream': { icon: '🍦', color: 'purple', label: 'Ice Cream', bgFrom: 'from-violet-500', bgTo: 'to-violet-600', lightBg: 'bg-violet-50 dark:bg-violet-900/20', lightText: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-700', ring: 'ring-violet-500' },
};

const TIER_CONFIG = [
  { key: 'FEDERATION', field: 'federation', label: 'Federation', pct: 50, color: '#8B5CF6', bg: 'bg-violet-500', lightBg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400' },
  { key: 'INTER_UNION', field: 'interUnion', label: 'Inter Union', pct: 55, color: '#3B82F6', bg: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400' },
  { key: 'WHOLESALE_DEALER', field: 'wholesaleDealer', label: 'WSD', pct: 65, color: '#06B6D4', bg: 'bg-cyan-500', lightBg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-400' },
  { key: 'DEALER', field: 'dealer', label: 'Dealer', pct: 85, color: '#10B981', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400' },
  { key: 'RETAILER', field: 'retailer', label: 'Retailer', pct: 90, color: '#F59E0B', bg: 'bg-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' },
  { key: 'MRP', field: 'mrp', label: 'MRP', pct: 100, color: '#EF4444', bg: 'bg-red-500', lightBg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400' },
];

function SegmentRing({ value, total, size = 80, strokeWidth = 8, color }: { value: number; total: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-100 dark:text-gray-700" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-800 dark:text-white">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

function CSSBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-1.5 h-32 px-1">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 group">
          <div className="relative w-full flex justify-center mb-1">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {d.value}
            </span>
          </div>
          <div className="w-full relative rounded-t-md overflow-hidden" style={{ height: `${Math.max((d.value / max) * 100, 4)}%`, backgroundColor: d.color, minHeight: '4px' }}>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors" />
          </div>
          <span className="text-[9px] mt-1.5 text-gray-500 dark:text-gray-400 font-medium truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [activeSegmentTab, setActiveSegmentTab] = useState<string>("all");
  const [metricsRange, setMetricsRange] = useState<string>("today");
  
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
  });

  const { data: userMetrics, isLoading: metricsLoading } = useQuery<{
    signedInCount: number;
    signupsCount: number;
    range: string;
  }>({
    queryKey: [`/api/admin/user-metrics?range=${metricsRange}`],
  });

  const { data: userStats } = useQuery<{
    total: number;
    districtUnions: number;
    byRole: Record<string, number>;
    byUnion: Record<string, number>;
  }>({
    queryKey: ["/api/admin/users/stats"],
  });

  const totalSegmentOrders = (analytics?.segmentWiseOrders?.freshMilk || 0) + 
    (analytics?.segmentWiseOrders?.products || 0) + 
    (analytics?.segmentWiseOrders?.iceCream || 0);

  const filteredOrders = analytics?.recentOrders?.filter(order => {
    const matchesStatus = orderFilter === "all" ||
      (orderFilter === "processing" && (order.status === "processing" || order.status === "pending")) ||
      (orderFilter === "ready" && order.status === "ready") ||
      (orderFilter === "completed" && (order.status === "delivered" || order.status === "confirmed"));
    const matchesSegment = segmentFilter === "all" || order.productSegment === segmentFilter;
    const matchesTier = tierFilter === "all" || order.pricingRole === tierFilter || (!order.pricingRole && tierFilter === "MRP");
    return matchesStatus && matchesSegment && matchesTier;
  }) || [];

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      pending: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", label: "Pending" },
      processing: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500", label: "Processing" },
      confirmed: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", label: "Confirmed" },
      ready: { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500", label: "Ready" },
      delivered: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", label: "Delivered" },
      cancelled: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", dot: "bg-red-500", label: "Cancelled" },
    };
    return configs[status] || { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-400", label: status };
  };

  const handlePrintOrder = (orderId: string) => {
    const order = analytics?.recentOrders?.find(o => o.id === orderId);
    if (!order) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printContent = `<!DOCTYPE html><html><head><title>Order #${orderId.slice(-6)} - Aavin Cart</title><style>body{font-family:system-ui,sans-serif;padding:20px;max-width:800px;margin:0 auto}.header{text-align:center;border-bottom:2px solid #4AB3E8;padding-bottom:20px;margin-bottom:20px}.logo{font-size:24px;font-weight:bold;color:#4AB3E8}.order-id{font-size:18px;color:#666;margin-top:10px}.section{margin-bottom:20px}.section-title{font-weight:bold;color:#333;margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:5px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}.label{color:#666}.value{font-weight:500}.total{font-size:20px;font-weight:bold;color:#4AB3E8}.status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold}.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee;color:#666;font-size:12px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><div class="header"><div class="logo">AAVIN CART - TCMPF</div><div class="order-id">Order #${orderId.slice(-6)}</div></div><div class="section"><div class="section-title">Order Details</div><div class="row"><span class="label">Order ID:</span><span class="value">${orderId}</span></div><div class="row"><span class="label">Customer:</span><span class="value">${order.customerEmail}</span></div><div class="row"><span class="label">District Union:</span><span class="value">${order.restaurantName || 'N/A'}</span></div><div class="row"><span class="label">Date:</span><span class="value">${new Date(order.createdAt).toLocaleString('en-IN')}</span></div><div class="row"><span class="label">Status:</span><span class="status">${order.status.toUpperCase()}</span></div></div><div class="section"><div class="section-title">Payment Summary</div><div class="row"><span class="label">Total Amount:</span><span class="total">₹${order.total.toFixed(2)}</span></div></div><div class="footer"><p>Tamil Nadu Cooperative Milk Producers' Federation</p><p>Printed on: ${new Date().toLocaleString('en-IN')}</p></div><script>window.onload=function(){window.print()}</script></body></html>`;
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const salesChartData = (() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (!analytics?.recentOrders?.length) {
      return days.map(d => ({ label: d, value: 0, color: '#4AB3E8' }));
    }
    const dayTotals: Record<string, number> = {};
    days.forEach(d => dayTotals[d] = 0);
    analytics.recentOrders.forEach(order => {
      const day = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (dayTotals[day] !== undefined) dayTotals[day] += order.total;
    });
    return days.map(d => ({ label: d, value: Math.round(dayTotals[d] || 0), color: '#4AB3E8' }));
  })();

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-gray-600 dark:text-gray-300" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {/* ── KPI METRIC CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Total Sales",
              value: analytics?.totalSales || 0,
              prefix: "₹",
              decimals: 2,
              icon: <DollarSign className="h-5 w-5" />,
              trend: "+12.5%",
              trendUp: true,
              gradient: "from-blue-600 to-blue-500",
              iconBg: "bg-blue-400/30",
            },
            {
              title: "District Unions",
              value: analytics?.totalMerchants || 0,
              prefix: "",
              decimals: 0,
              icon: <Store className="h-5 w-5" />,
              trend: `${analytics?.totalMerchants || 0} active`,
              trendUp: true,
              gradient: "from-emerald-600 to-emerald-500",
              iconBg: "bg-emerald-400/30",
            },
            {
              title: "Orders Received",
              value: analytics?.ordersReceived || 0,
              prefix: "",
              decimals: 0,
              icon: <ShoppingBag className="h-5 w-5" />,
              trend: `${analytics?.ordersDelivered || 0} delivered`,
              trendUp: true,
              gradient: "from-violet-600 to-violet-500",
              iconBg: "bg-violet-400/30",
            },
            {
              title: "New Customers",
              value: analytics?.newCustomers || 0,
              prefix: "",
              decimals: 0,
              icon: <UserPlus className="h-5 w-5" />,
              trend: "this month",
              trendUp: true,
              gradient: "from-amber-600 to-amber-500",
              iconBg: "bg-amber-400/30",
            },
          ].map((metric, i) => (
            <Card key={i} className={`relative overflow-hidden border-0 bg-gradient-to-br ${metric.gradient} text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${metric.iconBg} flex items-center justify-center`}>
                    {metric.icon}
                  </div>
                  <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {metric.trend}
                  </span>
                </div>
                <div className="mt-1">
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 bg-white/20" />
                  ) : (
                    <p className="text-2xl lg:text-3xl font-bold tracking-tight">
                      <AnimatedNumber value={metric.value} prefix={metric.prefix} decimals={metric.decimals} />
                    </p>
                  )}
                  <p className="text-xs text-white/70 mt-1 font-medium">{metric.title}</p>
                </div>
              </CardContent>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5" />
              <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
            </Card>
          ))}
        </div>

        {/* ── QUICK STATS ROW ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Commission (Week)", value: `₹${(analytics?.commissionWeek || 0).toFixed(0)}`, icon: <DollarSign className="h-4 w-4 text-emerald-600" />, bg: "bg-emerald-50 dark:bg-emerald-900/20" },
            { label: "Commission (Month)", value: `₹${(analytics?.commissionMonth || 0).toFixed(0)}`, icon: <Calendar className="h-4 w-4 text-violet-600" />, bg: "bg-violet-50 dark:bg-violet-900/20" },
            { label: "Subscriptions", value: `${analytics?.subscriptionsMonth || 0}`, icon: <CreditCard className="h-4 w-4 text-blue-600" />, bg: "bg-blue-50 dark:bg-blue-900/20" },
            { label: "Total Refund", value: `₹${(analytics?.totalRefund || 0).toFixed(0)}`, icon: <RefreshCw className="h-4 w-4 text-amber-600" />, bg: "bg-amber-50 dark:bg-amber-900/20" },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-xl p-3.5 flex items-center gap-3 border border-gray-100 dark:border-gray-700`}>
              <div className="shrink-0">{stat.icon}</div>
              <div className="min-w-0">
                {isLoading ? <Skeleton className="h-5 w-16" /> : <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{stat.value}</p>}
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── APP PERFORMANCE ── */}
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                  <Activity className="h-4 w-4 text-cyan-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">App Performance</CardTitle>
                  <CardDescription className="text-xs">User activity and sign-ups</CardDescription>
                </div>
              </div>
              <Select value={metricsRange} onValueChange={setMetricsRange}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => navigate(`/admin/performance/signed-in?range=${metricsRange}`)}
                className="cursor-pointer rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                    <LogIn className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    <AnimatedNumber value={userMetrics?.signedInCount || 0} />
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  Signed-in Users
                </p>
              </div>
              <div
                onClick={() => navigate(`/admin/performance/signups?range=${metricsRange}`)}
                className="cursor-pointer rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                {metricsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    <AnimatedNumber value={userMetrics?.signupsCount || 0} />
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  New Sign-ups
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── B2B USER COUNTS BY BUSINESS TYPE ── */}
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">B2B Users by Business Type</CardTitle>
                  <CardDescription className="text-xs">Distribution across all district unions</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">{userStats?.total || 0} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
              {[
                { key: 'districtUnions', label: 'District Union', icon: <Building2 className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800', count: userStats?.districtUnions || 0 },
                { key: 'wsd', label: 'WSD', icon: <Truck className="h-4 w-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-800', count: userStats?.byRole?.wsd || 0 },
                { key: 'dealer', label: 'Dealer', icon: <ShoppingBag className="h-4 w-4" />, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-100 dark:border-orange-800', count: userStats?.byRole?.dealer || 0 },
                { key: 'retailer', label: 'Retailer', icon: <Store className="h-4 w-4" />, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-100 dark:border-teal-800', count: userStats?.byRole?.retailer || 0 },
                { key: 'mpcs', label: 'MPCS', icon: <Warehouse className="h-4 w-4" />, color: 'text-lime-600', bg: 'bg-lime-50 dark:bg-lime-900/20', border: 'border-lime-100 dark:border-lime-800', count: userStats?.byRole?.mpcs || 0 },
                { key: 'hotel', label: 'Hotel', icon: <Hotel className="h-4 w-4" />, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-100 dark:border-rose-800', count: userStats?.byRole?.hotel || 0 },
                { key: 'institution', label: 'Institution', icon: <GraduationCap className="h-4 w-4" />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800', count: userStats?.byRole?.institution || 0 },
                { key: 'private_parlour', label: 'Private Parlour', icon: <Store className="h-4 w-4" />, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-100 dark:border-pink-800', count: userStats?.byRole?.private_parlour || 0 },
                { key: 'union_parlour', label: 'Union Parlour', icon: <Building2 className="h-4 w-4" />, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-100 dark:border-sky-800', count: userStats?.byRole?.union_parlour || 0 },
                { key: 'general_shop', label: 'General Shop / Retail - MRP', icon: <ShoppingBag className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800', count: userStats?.byRole?.general_shop || 0 },
              ].map(item => (
                <div key={item.key} className={`${item.bg} ${item.border} border rounded-xl p-3 text-center transition-all hover:shadow-md`}>
                  <div className={`${item.color} flex justify-center mb-1.5`}>{item.icon}</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{item.count}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{item.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── SEGMENT OVERVIEW with DONUT RINGS ── */}
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Layers className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Segment Overview</CardTitle>
                  <CardDescription className="text-xs">Order distribution across 3 product segments</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">{totalSegmentOrders} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'freshMilk', segment: 'Fresh Milk', value: analytics?.segmentWiseOrders?.freshMilk || 0, color: '#3B82F6' },
                  { key: 'products', segment: 'Products', value: analytics?.segmentWiseOrders?.products || 0, color: '#10B981' },
                  { key: 'iceCream', segment: 'Ice Cream', value: analytics?.segmentWiseOrders?.iceCream || 0, color: '#8B5CF6' },
                ].map(seg => {
                  const config = SEGMENT_CONFIG[seg.segment as keyof typeof SEGMENT_CONFIG];
                  const isActive = segmentFilter === seg.segment;
                  return (
                    <div
                      key={seg.key}
                      onClick={() => { setSegmentFilter(isActive ? 'all' : seg.segment); setTierFilter('all'); }}
                      className={`relative rounded-xl p-4 cursor-pointer transition-all duration-300 border-2 ${
                        isActive 
                          ? `${config.border} ${config.lightBg} dark:bg-gray-800 shadow-md scale-[1.02]` 
                          : 'border-transparent bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <SegmentRing value={seg.value} total={totalSegmentOrders} color={seg.color} size={72} strokeWidth={7} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-lg">{config.icon}</span>
                            <h3 className={`font-semibold text-sm ${config.lightText}`}>{seg.segment}</h3>
                          </div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{seg.value}</p>
                          <p className="text-[11px] text-gray-500">
                            {totalSegmentOrders > 0 ? `${((seg.value / totalSegmentOrders) * 100).toFixed(1)}%` : '0%'} of total orders
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <div className={`absolute top-2 right-2`}>
                          <Badge className={`bg-gradient-to-r ${config.bgFrom} ${config.bgTo} text-white text-[10px] px-1.5`}>Active</Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── PRICING TIER MATRIX ── */}
        <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-50 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Pricing Tier Distribution</CardTitle>
                  <CardDescription className="text-xs">Orders across 6 pricing tiers per segment</CardDescription>
                </div>
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'freshMilk', label: '🥛', title: 'Fresh Milk' },
                  { key: 'products', label: '📦', title: 'Products' },
                  { key: 'iceCream', label: '🍦', title: 'Ice Cream' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveSegmentTab(tab.key)}
                    title={tab.title || tab.label}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      activeSegmentTab === tab.key
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : (
              <div className="space-y-5">
                {[
                  { key: 'freshMilk', segment: 'Fresh Milk' },
                  { key: 'products', segment: 'Products' },
                  { key: 'iceCream', segment: 'Ice Cream' },
                ].filter(seg => activeSegmentTab === 'all' || activeSegmentTab === seg.key)
                .map(seg => {
                  const config = SEGMENT_CONFIG[seg.segment as keyof typeof SEGMENT_CONFIG];
                  const data = analytics?.segmentRoleOrders?.[seg.key as keyof typeof analytics.segmentRoleOrders];
                  const segTotal = analytics?.segmentWiseOrders?.[seg.key as keyof typeof analytics.segmentWiseOrders] || 0;

                  return (
                    <div key={seg.key} className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <h4 className={`text-sm font-semibold ${config.lightText}`}>{seg.segment}</h4>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono ml-auto">{segTotal} orders</span>
                      </div>
                      <div className="space-y-1.5">
                        {TIER_CONFIG.map(tier => {
                          const count = (data as any)?.[tier.field] || 0;
                          const pct = segTotal > 0 ? (count / segTotal) * 100 : 0;
                          const isActiveTier = segmentFilter === seg.segment && tierFilter === tier.key;
                          return (
                            <div
                              key={tier.key}
                              className={`group flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                                isActiveTier ? `${tier.lightBg} ring-1 ring-offset-1` : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                              style={isActiveTier ? { ['--tw-ring-color' as string]: tier.color } : {}}
                              onClick={() => { setSegmentFilter(seg.segment); setTierFilter(isActiveTier ? 'all' : tier.key); }}
                            >
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-20 shrink-0">{tier.label}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 w-8 shrink-0">{tier.pct}%</span>
                              <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700 ease-out"
                                  style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%`, backgroundColor: tier.color }}
                                />
                              </div>
                              <span className={`text-xs font-bold w-8 text-right ${tier.text}`}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── BOTTOM SECTION: ORDERS + SIDEBAR ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Latest Orders */}
          <div className="lg:col-span-2">
            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Latest Orders</CardTitle>
                      <CardDescription className="text-xs">Recent orders with segment and tier filters</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 gap-1" onClick={() => navigate('/admin/orders')}>
                    View All <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 w-fit max-w-full overflow-x-auto scrollbar-hide">
                  {[
                    { key: 'all', label: 'All Orders' },
                    { key: 'processing', label: 'Processing' },
                    { key: 'ready', label: 'Ready' },
                    { key: 'completed', label: 'Completed' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setOrderFilter(f.key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                        orderFilter === f.key
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Segment + Tier Filters */}
                <div className="flex flex-wrap gap-3 sm:gap-4 mt-2 overflow-x-auto scrollbar-hide">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3 w-3 text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Segment</span>
                    <div className="flex gap-1 ml-1">
                      {[
                        { key: 'all', label: 'All', ariaLabel: 'All segments' },
                        { key: 'Fresh Milk', label: '🥛', ariaLabel: 'Fresh Milk segment' },
                        { key: 'Products', label: '📦', ariaLabel: 'Products segment' },
                        { key: 'Ice Cream', label: '🍦', ariaLabel: 'Ice Cream segment' },
                      ].map(s => (
                        <button
                          key={s.key}
                          onClick={() => { setSegmentFilter(s.key); setTierFilter('all'); }}
                          aria-label={s.ariaLabel}
                          aria-pressed={segmentFilter === s.key}
                          className={`w-7 h-7 rounded-md text-xs flex items-center justify-center transition-all ${
                            segmentFilter === s.key
                              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300 dark:ring-blue-600'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title={s.ariaLabel}
                        >
                          {s.label === 'All' ? '∗' : s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Tier</span>
                    <div className="flex gap-1 ml-1 overflow-x-auto scrollbar-hide">
                      <button
                        onClick={() => setTierFilter('all')}
                        aria-label="All pricing tiers"
                        aria-pressed={tierFilter === 'all'}
                        className={`px-2 h-6 rounded text-[10px] font-medium transition-all shrink-0 ${
                          tierFilter === 'all' ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >All</button>
                      {TIER_CONFIG.map(t => (
                        <button
                          key={t.key}
                          onClick={() => setTierFilter(t.key)}
                          aria-label={`${t.label} tier (${t.pct}% of MRP)`}
                          aria-pressed={tierFilter === t.key}
                          className={`px-2 h-6 rounded text-[10px] font-medium transition-all shrink-0 ${
                            tierFilter === t.key ? 'text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          style={tierFilter === t.key ? { backgroundColor: t.color } : {}}
                          title={`${t.label} (${t.pct}% of MRP)`}
                        >
                          {t.label.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-24" /></div>
                        <Skeleton className="h-5 w-16" />
                      </div>
                    ))}
                  </div>
                ) : filteredOrders.length > 0 ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredOrders.slice(0, 6).map((order) => {
                      const segConfig = SEGMENT_CONFIG[order.productSegment as keyof typeof SEGMENT_CONFIG];
                      const statusConfig = getStatusConfig(order.status);
                      return (
                        <div key={order.id} className="flex items-center gap-3 py-3 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 -mx-2 px-2 rounded-lg transition-colors">
                          {/* Segment Icon */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${segConfig?.lightBg || 'bg-gray-100'}`}>
                            <span className="text-base">{segConfig?.icon || '🛒'}</span>
                          </div>

                          {/* Order Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">#{order.id.slice(-6)}</span>
                              {order.productSegment && (
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 font-medium ${segConfig?.border || ''} ${segConfig?.lightText || ''}`}>
                                  {order.productSegment}
                                </Badge>
                              )}
                              {order.pricingRole && order.pricingRole !== 'MRP' && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                                  {order.pricingRole.replace(/_/g, ' ')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{order.customerEmail}</p>
                          </div>

                          {/* Amount + Status */}
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">₹{order.total.toFixed(2)}</p>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                              {statusConfig.label}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 sm:opacity-0 touch-visible transition-opacity shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/admin/orders?view=${order.id}`)} title="View">
                              <Eye className="h-3.5 w-3.5 text-gray-400" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/admin/orders?edit=${order.id}`)} title="Edit">
                              <Edit className="h-3.5 w-3.5 text-gray-400" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrintOrder(order.id)} title="Print">
                              <Printer className="h-3.5 w-3.5 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag className="h-7 w-7 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No matching orders found</p>
                    <Button variant="ghost" size="sm" className="mt-2 text-xs text-blue-600" onClick={() => { setOrderFilter('all'); setSegmentFilter('all'); setTierFilter('all'); }}>
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            
            {/* Sales Overview Chart */}
            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-sm font-semibold">Sales This Week</CardTitle>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">₹{(analytics?.totalSales || 0).toFixed(0)}</span>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full rounded-lg" />
                ) : (
                  <CSSBarChart data={salesChartData} />
                )}
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-semibold">Top Customers</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1"><Skeleton className="h-3.5 w-28 mb-1" /><Skeleton className="h-3 w-20" /></div>
                      </div>
                    ))}
                  </div>
                ) : analytics?.topCustomers && analytics.topCustomers.length > 0 ? (
                  <div className="space-y-2.5">
                    {analytics.topCustomers.slice(0, 5).map((customer, index) => {
                      const rankColors = ['from-amber-400 to-amber-500', 'from-gray-300 to-gray-400', 'from-orange-400 to-orange-500', 'from-blue-400 to-blue-500', 'from-violet-400 to-violet-500'];
                      const rankBadge = index < 3;
                      return (
                        <div key={customer.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="relative">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${rankColors[index]} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                              {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            {rankBadge && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-[9px] font-bold text-amber-600">#{index + 1}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{customer.name || 'Customer'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{customer.email}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-gray-800 dark:text-white">{customer.totalOrders}</p>
                            <p className="text-[9px] text-gray-400">orders</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="h-10 w-10 text-gray-200 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No customers yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
