import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  DollarSign,
  Package,
  Clock,
  TrendingUp,
  TrendingDown,
  Truck,
  Users,
  Milk,
  IceCream,
  ArrowRight,
  BarChart3,
  UserCheck,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { formatOrderId } from "@/lib/format-order-id";

interface DashboardStats {
  today: {
    orders: number;
    sales: number;
    pending: number;
    delivered: number;
  };
  yesterday: {
    orders: number;
    sales: number;
  };
  ordersByStatus: Record<string, number>;
  segmentBreakdown: Record<string, { count: number; revenue: number }>;
  workflowPipeline: Record<string, number>;
  topCustomers: { name: string; orders: number; revenue: number }[];
  signedInUsers: number;
  signedInStaff: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  deliveryRate: number;
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function ChangeIndicator({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const isUp = pct >= 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct)}% vs yesterday
    </span>
  );
}

const SEGMENT_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  "Fresh Milk": { icon: Milk, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800" },
  "Products": { icon: Package, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800" },
  "Ice Cream": { icon: IceCream, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/40", border: "border-pink-200 dark:border-pink-800" },
};

function MerchantOverviewContent() {
  const { merchantId } = useMerchantContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const syncDeliveryJobsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/union/${merchantId}/sync-delivery-jobs`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Delivery Jobs Synced", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/union", merchantId, "dashboard-stats"] });
    },
    onError: (err: any) => {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: stats, isLoading, isError, refetch, isFetching } = useQuery<DashboardStats>({
    queryKey: ["/api/union", merchantId, "dashboard-stats"],
    queryFn: async () => {
      const res = await fetch(`/api/union/${merchantId}/dashboard-stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load dashboard stats");
      return res.json();
    },
    enabled: !!merchantId,
    refetchInterval: 60000,
    retry: 2,
  });

  const { data: products } = useQuery<any[]>({
    queryKey: ["/api/union", merchantId, "my-products"],
    queryFn: async () => {
      const res = await fetch(`/api/union/${merchantId}/my-products`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentOrders } = useQuery<any[]>({
    queryKey: ["/api/orders", merchantId, "recent"],
    queryFn: async () => {
      const res = await fetch(`/api/orders?merchantId=${merchantId}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.orders || [];
      return arr
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 8);
    },
    enabled: !!merchantId,
  });

  const activeProducts = products?.filter((p: any) => p.isActive !== false).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-red-500 font-medium">Failed to load dashboard data</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const s = stats;

  const kpis = [
    {
      title: "Total Orders",
      value: s?.totalOrders ?? 0,
      sub: `Today: ${s?.today.orders ?? 0}`,
      icon: ShoppingBag,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/40",
      change: s ? <ChangeIndicator current={s.today.orders} previous={s.yesterday.orders} label="orders" /> : null,
    },
    {
      title: "Revenue",
      value: formatINR(s?.totalRevenue ?? 0),
      sub: `Today: ${formatINR(s?.today.sales ?? 0)}`,
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/40",
      change: s ? <ChangeIndicator current={s.today.sales} previous={s.yesterday.sales} label="sales" /> : null,
    },
    {
      title: "Active Products",
      value: activeProducts,
      sub: `${products?.length ?? 0} total assigned`,
      icon: Package,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/40",
      change: null,
    },
    {
      title: "Pending Orders",
      value: s?.today.pending ?? 0,
      sub: `Delivered today: ${s?.today.delivered ?? 0}`,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-900/40",
      change: null,
    },
  ];

  const segments = Object.entries(s?.segmentBreakdown || {});
  const allSegments = ["Fresh Milk", "Products", "Ice Cream"];
  const segmentDisplay = allSegments.map((name) => {
    const data = s?.segmentBreakdown?.[name] || { count: 0, revenue: 0 };
    const cfg = SEGMENT_CONFIG[name] || SEGMENT_CONFIG["Products"];
    return { name, ...data, ...cfg };
  });

  const statusOrder = ["pending", "accepted", "marketing_approved", "assigned_to_delivery", "out_for_delivery", "delivered"];
  const pipelineSteps = statusOrder.map((key) => ({
    key,
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    count: s?.workflowPipeline?.[key] ?? s?.ordersByStatus?.[key] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to Union Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of your union performance</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.title}</CardTitle>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{kpi.sub}</span>
                {kpi.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Today's Segment Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {segmentDisplay.map((seg) => {
            const Icon = seg.icon;
            return (
              <Card
                key={seg.name}
                className={`cursor-pointer hover:shadow-md transition-shadow ${seg.bg} ${seg.border}`}
                onClick={() => setLocation(`/merchant/orders?segment=${encodeURIComponent(seg.name)}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${seg.color}`} />
                      <span className={`font-semibold text-sm ${seg.color}`}>{seg.name}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{seg.count}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Orders today</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{formatINR(seg.revenue)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-center">
          <CardContent className="p-5">
            <BarChart3 className="h-8 w-8 mx-auto text-indigo-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s?.deliveryRate ?? 0}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Delivery Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-center">
          <CardContent className="p-5">
            <DollarSign className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatINR(s?.avgOrderValue ?? 0)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Order Value</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-center">
          <CardContent className="p-5">
            <UserCheck className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s?.signedInUsers ?? 0}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Users Signed In Today</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Order Pipeline</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncDeliveryJobsMutation.mutate()}
            disabled={syncDeliveryJobsMutation.isPending}
          >
            <Zap className={`h-4 w-4 mr-2 ${syncDeliveryJobsMutation.isPending ? "animate-spin" : ""}`} />
            {syncDeliveryJobsMutation.isPending ? "Syncing..." : "Sync Delivery Jobs"}
          </Button>
        </div>
        <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {pipelineSteps.map((step, idx) => (
                <div key={step.key} className="flex items-center gap-2">
                  <div
                    className="text-center px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 min-w-[80px] cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:ring-1 hover:ring-purple-300 dark:hover:ring-purple-700 transition-all"
                    onClick={() => setLocation(`/merchant/orders?status=${step.key}`)}
                  >
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{step.count}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{step.label}</p>
                  </div>
                  {idx < pipelineSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recent Orders</h2>
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardContent className="p-0">
              {!recentOrders || recentOrders.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No recent orders</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatOrderId({ id: String(order.id), orderNumber: order.orderNumber, displayId: order.displayId })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.customerName || "Walk-in"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatINR(parseFloat(order.total || "0"))}
                        </p>
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Button
            variant="link"
            size="sm"
            className="mt-2 text-purple-600"
            onClick={() => setLocation("/merchant/orders")}
          >
            View All Orders <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Top Customers</h2>
          <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardContent className="p-0">
              {!s?.topCustomers || s.topCustomers.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">No customer data yet</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {s.topCustomers.map((c, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{c.orders} orders</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatINR(c.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "completed":
    case "delivered":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case "accepted":
    case "marketing_approved":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
}

export default function MerchantOverview() {
  return (
    <MerchantLayout>
      <MerchantOverviewContent />
    </MerchantLayout>
  );
}
