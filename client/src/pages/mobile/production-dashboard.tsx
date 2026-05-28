import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardList, Calendar, Clock, Settings,
  Lock, User, Eye, EyeOff, LogOut, Volume2, VolumeX,
  Bell, Search, CheckCircle, ChevronLeft, ChevronRight,
  RefreshCw
} from "lucide-react";

const ORDER_TYPE_COLORS: Record<string, string> = {
  dinein: "bg-red-500",
  takeout: "bg-yellow-500",
  delivery: "bg-green-500",
  pickup: "bg-purple-500",
};

const ORDER_TYPE_BADGE: Record<string, string> = {
  dinein: "bg-red-500 text-white",
  takeout: "bg-yellow-500 text-black",
  delivery: "bg-green-500 text-white",
  pickup: "bg-purple-500 text-white",
};

const STATUS_COLORS: Record<string, string> = {
  queue: "bg-gray-100 text-gray-700 border-gray-300",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-300",
  ready: "bg-green-100 text-green-800 border-green-300",
  delayed: "bg-orange-100 text-orange-800 border-orange-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
  completed: "bg-blue-100 text-blue-800 border-blue-300",
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatElapsed(createdAt: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  const h = String(Math.floor(diff / 3600)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const s = String(diff % 60).padStart(2, "0");
  return { text: `${h}:${m}:${s}`, seconds: diff };
}

function getTimerColor(seconds: number) {
  if (seconds < 300) return "text-green-400";
  if (seconds < 600) return "text-yellow-400";
  return "text-red-400";
}

function OrderTimer({ createdAt }: { createdAt: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const { text, seconds } = formatElapsed(createdAt);
  return <span className={`text-xs font-mono font-bold ${getTimerColor(seconds)}`}>{text}</span>;
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/kds/login", { username, password });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Login successful" });
      onLogin();
    },
    onError: (error: any) => {
      toast({ title: "Login Failed", description: error.message || "Invalid credentials", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-900">
      <div className="w-full max-w-sm bg-gray-800 rounded-2xl p-8 shadow-2xl border border-white/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Production Display</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to kitchen dashboard</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="h-14 pl-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-base"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-14 pl-11 pr-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-base"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 p-1"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <Button
            type="submit"
            className="w-full h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-base"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function MobileOrderCard({
  order,
  onItemToggle,
  onBump,
}: {
  order: any;
  onItemToggle: (orderId: number, itemId: number, newStatus: string) => void;
  onBump: (orderId: number) => void;
}) {
  const orderType = (order.orderType || "dinein").toLowerCase();
  const barColor = ORDER_TYPE_COLORS[orderType] || "bg-gray-500";
  const badgeStyle = ORDER_TYPE_BADGE[orderType] || "bg-gray-500 text-white";
  const items = order.items || [];
  const allDone = items.length > 0 && items.every((item: any) => item.status === "completed" || item.status === "cancelled");

  return (
    <div className="rounded-xl overflow-hidden bg-gray-800 border border-white/10">
      <div className={`${barColor} h-1.5`} />
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-white text-base font-bold">#{order.kdsId || order.id}</span>
          <Badge className={`${badgeStyle} text-[12px] font-bold capitalize px-2 py-0.5`}>
            {orderType}
          </Badge>
        </div>
        <OrderTimer createdAt={order.createdAt || new Date().toISOString()} />
      </div>

      {order.customerName && (
        <div className="px-4 py-2 border-b border-white/5">
          <span className="text-xs text-gray-400">{order.customerName}</span>
        </div>
      )}

      <div className="px-4 py-3 space-y-2">
        {items.map((item: any, idx: number) => {
          const nextStatus = item.status === "completed" ? "queue" : "completed";
          return (
            <div key={item.id || idx} className="flex items-center gap-3 min-h-[44px]">
              <input
                type="checkbox"
                checked={item.status === "completed"}
                onChange={() => onItemToggle(order.id, item.id, nextStatus)}
                className="h-5 w-5 rounded border-gray-600 text-teal-500 focus:ring-teal-500 bg-gray-700 flex-shrink-0"
              />
              <span className={`text-sm flex-1 ${item.status === "completed" ? "line-through text-gray-500" : "text-white"}`}>
                <span className="font-bold">{item.quantity || 1}x</span> {item.name}
              </span>
              <Badge className={`text-[12px] border capitalize ${STATUS_COLORS[item.status] || STATUS_COLORS.queue}`}>
                {formatStatus(item.status || "queue")}
              </Badge>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-3">No items</p>
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/10">
        <Button
          onClick={() => onBump(order.id)}
          disabled={!allDone && items.length > 0}
          className={`w-full h-11 font-bold rounded-xl text-sm ${
            allDone
              ? "bg-teal-600 hover:bg-teal-700 text-white"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          <CheckCircle className="h-4 w-4 mr-2" /> Bump Order
        </Button>
      </div>
    </div>
  );
}

function useKdsMutations() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const updateItemMutation = useMutation({
    mutationFn: async ({ orderId, itemId, status }: { orderId: number; itemId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/kds/orders/${orderId}/items/${itemId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/kds/orders"] });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const bumpMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("PATCH", `/api/kds/orders/${orderId}/bump`);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/kds/orders"] });
      toast({ title: "Order bumped" });
    },
    onError: (error: any) => {
      toast({ title: "Bump failed", description: error.message, variant: "destructive" });
    },
  });

  const recallMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("PATCH", `/api/kds/orders/${orderId}/recall`);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/kds/orders"] });
      toast({ title: "Order recalled" });
    },
    onError: (error: any) => {
      toast({ title: "Recall failed", description: error.message, variant: "destructive" });
    },
  });

  return { updateItemMutation, bumpMutation, recallMutation };
}

function OrdersTab() {
  const { updateItemMutation, bumpMutation } = useKdsMutations();

  const { data, isLoading } = useQuery<{ orders: any[]; count: number }>({
    queryKey: ["/api/kds/orders", "active"],
    refetchInterval: 10000,
  });

  const orders = data?.orders || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <ClipboardList className="h-14 w-14 mb-3 text-gray-600" />
        <p className="text-lg font-semibold text-gray-400">No active orders</p>
        <p className="text-sm mt-1 text-gray-600">New orders will appear automatically</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      {orders.map((order: any) => (
        <MobileOrderCard
          key={order.id}
          order={order}
          onItemToggle={(orderId, itemId, status) =>
            updateItemMutation.mutate({ orderId, itemId, status })
          }
          onBump={(id) => bumpMutation.mutate(id)}
        />
      ))}
    </div>
  );
}

function ScheduledTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ orders: any[]; count: number }>({
    queryKey: ["/api/kds/orders", "scheduled"],
    refetchInterval: 10000,
  });

  const orders = data?.orders || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Calendar className="h-14 w-14 mb-3 text-gray-600" />
        <p className="text-lg font-semibold text-gray-400">No scheduled orders</p>
        <p className="text-sm mt-1 text-gray-600">Upcoming orders will appear here</p>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["/api/kds/orders", "scheduled"] })}
          className="text-teal-400 hover:underline text-sm mt-3 flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      {orders.map((order: any) => {
        const orderType = (order.orderType || "dinein").toLowerCase();
        const badgeStyle = ORDER_TYPE_BADGE[orderType] || "bg-gray-500 text-white";
        const barColor = ORDER_TYPE_COLORS[orderType] || "bg-gray-500";
        const items = order.items || [];
        return (
          <div key={order.id} className="rounded-xl overflow-hidden bg-gray-800 border border-white/10">
            <div className={`${barColor} h-1.5`} />
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-sm">#{order.kdsId || order.id}</span>
                <Badge className={`${badgeStyle} text-[12px] font-bold capitalize px-2 py-0.5`}>
                  {orderType}
                </Badge>
              </div>
              <span className="text-xs text-gray-400">
                {order.scheduledAt
                  ? new Date(order.scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                  : order.createdAt
                  ? new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                  : "-"}
              </span>
            </div>
            {items.length > 0 && (
              <div className="px-4 pb-3">
                <p className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? "s" : ""}</p>
              </div>
            )}
            {order.customerName && (
              <div className="px-4 pb-3 border-t border-white/5 pt-2">
                <span className="text-xs text-gray-400">{order.customerName}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab() {
  const { recallMutation } = useKdsMutations();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { data, isLoading } = useQuery<{ orders: any[]; total: number; count: number }>({
    queryKey: ["/api/kds/orders", "completed"],
  });

  const allOrders = data?.orders || [];
  const filtered = allOrders.filter((o: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.kdsId || String(o.id)).toLowerCase().includes(q) ||
      (o.customerName || "").toLowerCase().includes(q) ||
      (o.reference || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-24">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="Search orders..."
          className="h-11 pl-10 rounded-xl bg-gray-800 border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      {paged.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <Clock className="h-14 w-14 mb-3 text-gray-600" />
          <p className="text-lg font-semibold text-gray-400">No history</p>
          <p className="text-sm mt-1 text-gray-600">Completed orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map((order: any) => {
            const orderType = (order.orderType || "dinein").toLowerCase();
            const badgeStyle = ORDER_TYPE_BADGE[orderType] || "bg-gray-500 text-white";
            return (
              <div
                key={order.id}
                className="rounded-xl bg-gray-800 border border-white/10 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-white font-bold text-sm">#{order.kdsId || order.id}</span>
                  </div>
                  <Badge className={`${badgeStyle} text-[12px] font-bold capitalize px-2 py-0.5`}>
                    {orderType}
                  </Badge>
                </div>
                {order.customerName && (
                  <p className="text-xs text-gray-400 mb-1">{order.customerName}</p>
                )}
                <p className="text-xs text-gray-500 mb-3">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </p>
                <Button
                  onClick={() => recallMutation.mutate(order.id)}
                  disabled={recallMutation.isPending}
                  className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Recall
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > perPage && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
          <span className="text-xs text-gray-500">{page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-9 bg-gray-800 border-white/10 text-white hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-9 bg-gray-800 border-white/10 text-white hover:bg-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsTab({ onLogout }: { onLogout: () => void }) {
  const [darkMode, setDarkMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [muteOrders, setMuteOrders] = useState(false);

  const transitionTypes = [
    { type: "Delivery", caution: "00:15:00", late: "00:30:00" },
    { type: "Pickup", caution: "00:10:00", late: "00:20:00" },
    { type: "Dinein", caution: "00:10:00", late: "00:20:00" },
    { type: "Takeout", caution: "00:12:00", late: "00:25:00" },
  ];

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <h2 className="text-xl font-bold text-white">Settings</h2>

      <div className="space-y-4">
        <div className="rounded-xl bg-gray-800 border border-white/10 p-4 flex items-center justify-between min-h-[56px]">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-teal-400" />
            <div>
              <p className="text-white text-sm font-semibold">Display Mode</p>
              <p className="text-gray-500 text-xs">{darkMode ? "Dark theme" : "Light theme"}</p>
            </div>
          </div>
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
        </div>

        <div className="rounded-xl bg-gray-800 border border-white/10 p-4 flex items-center justify-between min-h-[56px]">
          <div className="flex items-center gap-3">
            {soundEnabled ? <Volume2 className="h-5 w-5 text-green-400" /> : <VolumeX className="h-5 w-5 text-gray-500" />}
            <div>
              <p className="text-white text-sm font-semibold">Sound Notifications</p>
              <p className="text-gray-500 text-xs">{soundEnabled ? "Enabled" : "Disabled"}</p>
            </div>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
        </div>

        <div className="rounded-xl bg-gray-800 border border-white/10 p-4 flex items-center justify-between min-h-[56px]">
          <div className="flex items-center gap-3">
            <VolumeX className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-white text-sm font-semibold">Mute Order Sounds</p>
              <p className="text-gray-500 text-xs">{muteOrders ? "Muted" : "Not muted"}</p>
            </div>
          </div>
          <Switch checked={muteOrders} onCheckedChange={setMuteOrders} />
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-white mb-3">Transition Times</h3>
        <div className="space-y-3">
          {transitionTypes.map((t) => (
            <div key={t.type} className="rounded-xl bg-gray-800 border border-white/10 p-4">
              <p className="text-white text-sm font-semibold mb-2">{t.type}</p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Caution</span>
                <span className="text-xs font-mono text-yellow-400">{t.caution}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Late</span>
                <span className="text-xs font-mono text-red-400">{t.late}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={onLogout}
        className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-base mt-4"
      >
        <LogOut className="h-5 w-5 mr-2" /> Logout
      </Button>
    </div>
  );
}

type TabId = "orders" | "scheduled" | "history" | "settings";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "scheduled", label: "Scheduled", icon: Calendar },
  { id: "history", label: "History", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
];

function ProductionDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("orders");

  const { data: activeData } = useQuery<{ orders: any[]; count: number }>({
    queryKey: ["/api/kds/orders", "active"],
    refetchInterval: 10000,
  });

  const orderCount = activeData?.count || activeData?.orders?.length || 0;

  const handleLogout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/kds/logout");
    } catch {}
    queryClient.clear();
    window.location.reload();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#0d9488" }}>
        <h1 className="text-lg font-bold text-white">Kitchen Display</h1>
        <div className="relative">
          <Bell className="h-5 w-5 text-white" />
          {orderCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {orderCount > 9 ? "9+" : orderCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "scheduled" && <ScheduledTab />}
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "settings" && <SettingsTab onLogout={handleLogout} />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 flex bg-gray-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-3 min-h-[60px] transition-colors ${
                isActive ? "text-teal-400" : "text-gray-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[12px] font-semibold mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MobileProductionDashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/kds/orders?status=active", { credentials: "include" })
      .then((res) => {
        setAuthenticated(res.ok);
      })
      .catch(() => {
        setAuthenticated(false);
      });
  }, []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm onLogin={() => setAuthenticated(true)} />;
  }

  return <ProductionDashboard />;
}
