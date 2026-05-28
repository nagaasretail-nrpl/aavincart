import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Settings, Clock, Calendar, CheckCircle, LogOut, Bell,
  Volume2, VolumeX, Printer, ChevronLeft, ChevronRight, Eye, EyeOff,
  Lock, User, RefreshCw, Filter, Trash2, Plus, X
} from "lucide-react";

const ORDER_TYPE_COLORS: Record<string, string> = {
  dinein: 'bg-red-500',
  takeout: 'bg-yellow-500',
  delivery: 'bg-green-500',
  pickup: 'bg-purple-500',
};

const STATUS_COLORS: Record<string, string> = {
  queue: 'bg-green-100 text-green-800 border-green-300',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ready: 'bg-blue-100 text-blue-800 border-blue-300',
  delayed: 'bg-orange-100 text-orange-800 border-orange-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  completed: 'bg-gray-100 text-gray-800 border-gray-300',
};

const STATUS_OPTIONS = ['queue', 'in_progress', 'ready', 'delayed', 'cancelled', 'completed'];

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatElapsed(createdAt: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  return { text: `${h}:${m}:${s}`, seconds: diff };
}

function getTimerColor(seconds: number) {
  if (seconds < 300) return 'text-green-600';
  if (seconds < 600) return 'text-yellow-600';
  return 'text-red-600';
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">K</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Kitchen Display</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="h-11 pl-10 rounded-xl"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-11 pl-10 pr-10 rounded-xl"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in..." : "Login"}
          </Button>
        </form>
        <p className="text-center text-sm text-teal-600 mt-4 cursor-pointer hover:underline">
          Forgot Password?
        </p>
      </div>
    </div>
  );
}

function OrderTimer({ createdAt }: { createdAt: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { text, seconds } = formatElapsed(createdAt);
  return <span className={`text-xs font-mono font-bold ${getTimerColor(seconds)}`}>{text}</span>;
}

function OrderCard({ order, onUpdateStatus, onUpdateItemStatus, onBump }: {
  order: any;
  onUpdateStatus: (orderId: number, status: string) => void;
  onUpdateItemStatus: (orderId: number, itemId: number, status: string) => void;
  onBump: (orderId: number) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const orderType = (order.orderType || 'dinein').toLowerCase();
  const headerColor = ORDER_TYPE_COLORS[orderType] || 'bg-gray-500';
  const items = order.items || [];
  const allDone = items.length > 0 && items.every((item: any) => item.status === 'completed' || item.status === 'cancelled');
  const canBump = allDone || order.status === 'cancelled';
  const createdTime = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-US', { hour12: false }) : '';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className={`${headerColor} px-3 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-bold">#{order.kdsId || order.id}</span>
          <span className="text-white/80 text-xs">Main [{items.length}]</span>
        </div>
        <OrderTimer createdAt={order.createdAt || new Date().toISOString()} />
      </div>

      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">{orderType}</Badge>
          <span className="text-xs text-gray-500">Asap</span>
        </div>
        <Badge className={`text-[10px] border ${STATUS_COLORS[order.status] || STATUS_COLORS.queue}`}>
          {formatStatus(order.status || 'queue')}
        </Badge>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {items.map((item: any, idx: number) => (
          <div key={item.id || idx}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.status === 'completed'}
                onChange={() => {
                  const newStatus = item.status === 'completed' ? 'queue' : 'completed';
                  onUpdateItemStatus(order.id, item.id, newStatus);
                }}
                className="h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
              />
              <span className="text-sm text-gray-800 flex-1">
                <span className="font-semibold">{item.quantity || 1}x</span> {item.name}
              </span>
              <Badge className={`text-[10px] border ${STATUS_COLORS[item.status] || STATUS_COLORS.queue}`}>
                {formatStatus(item.status || 'queue')}
              </Badge>
            </div>
            {item.modifiers && (
              <p className="text-xs text-gray-500 ml-6 mt-0.5">- {item.modifiers}</p>
            )}
            {item.notes && (
              <p className="text-xs text-gray-500 ml-6 mt-0.5">- {item.notes}</p>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">No items</p>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-teal-600 hover:bg-teal-50"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="text-teal-600 border-teal-300 hover:bg-teal-50 text-xs"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              Status
            </Button>
            {showDropdown && (
              <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-36">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { onUpdateStatus(order.id, s); setShowDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 capitalize"
                  >
                    {formatStatus(s)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {canBump && (
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white text-xs"
              onClick={() => onBump(order.id)}
            >
              Bump
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentView({ searchQuery }: { searchQuery: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ orders: any[]; count: number }>({
    queryKey: ['/api/kds/orders', 'current'],
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/kds/orders/${orderId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kds/orders'] });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ orderId, itemId, status }: { orderId: number; itemId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/kds/orders/${orderId}/items/${itemId}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kds/orders'] });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const bumpMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/kds/orders/${orderId}/bump`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kds/orders'] });
      toast({ title: "Order bumped" });
    },
    onError: (error: any) => {
      toast({ title: "Bump failed", description: error.message, variant: "destructive" });
    },
  });

  const orders = (data?.orders || []).filter((o: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (o.kdsId || String(o.id)).toLowerCase().includes(q) ||
      (o.reference || '').toLowerCase().includes(q);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Clock className="h-12 w-12 mb-3" />
        <p className="text-lg font-medium">No open orders</p>
        <p className="text-sm mt-1">New orders will appear automatically</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {orders.map((order: any) => (
        <OrderCard
          key={order.id}
          order={order}
          onUpdateStatus={(id, status) => updateStatusMutation.mutate({ orderId: id, status })}
          onUpdateItemStatus={(orderId, itemId, status) => updateItemMutation.mutate({ orderId, itemId, status })}
          onBump={(id) => bumpMutation.mutate(id)}
        />
      ))}
    </div>
  );
}

function ScheduledView() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ orders: any[]; count: number }>({
    queryKey: ['/api/kds/orders', 'scheduled'],
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
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Calendar className="h-12 w-12 mb-3" />
        <p className="text-lg font-medium">No available data</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/kds/orders', 'scheduled'] })}
          className="text-teal-500 hover:underline text-sm mt-2 flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {orders.map((order: any) => (
        <OrderCard
          key={order.id}
          order={order}
          onUpdateStatus={() => {}}
          onUpdateItemStatus={() => {}}
          onBump={() => {}}
        />
      ))}
    </div>
  );
}

function HistoryView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState("10");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useQuery<{ orders: any[]; total: number }>({
    queryKey: ['/api/kds/orders', 'history', page, perPage, searchQuery],
  });

  const recallMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/kds/orders/${orderId}/recall`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kds/orders'] });
      toast({ title: "Order recalled" });
    },
    onError: (error: any) => {
      toast({ title: "Recall failed", description: error.message, variant: "destructive" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/kds/orders/clear-history");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kds/orders'] });
      toast({ title: "History cleared" });
    },
    onError: (error: any) => {
      toast({ title: "Clear failed", description: error.message, variant: "destructive" });
    },
  });

  const orders = data?.orders || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / parseInt(perPage)));

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-900">History</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-9 pl-9 w-48 rounded-lg text-sm"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Clear Orders
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => toggleSort('reference')}
                >
                  Order Reference {sortField === 'reference' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Order Type</th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => toggleSort('date')}
                >
                  Date {sortField === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No history records</td>
                </tr>
              ) : (
                orders.map((order: any) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">#{order.kdsId || order.id}</td>
                    <td className="px-4 py-3 text-gray-600">{order.customerName || 'Guest'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize text-xs">{order.orderType || 'dinein'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                        onClick={() => recallMutation.mutate(order.id)}
                        disabled={recallMutation.isPending}
                      >
                        Recall
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Records per page:</span>
            <Select value={perPage} onValueChange={(v) => { setPerPage(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState("display");
  const [darkTheme, setDarkTheme] = useState(false);
  const [screenOption, setScreenOption] = useState("classic");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [muteOrderSounds, setMuteOrderSounds] = useState(false);
  const [repeatUntilAcknowledge, setRepeatUntilAcknowledge] = useState(false);
  const [language, setLanguage] = useState("en");
  const [showPrinterForm, setShowPrinterForm] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [printerModel, setPrinterModel] = useState("bluetooth");
  const [bluetoothAddress, setBluetoothAddress] = useState("");
  const [printingType, setPrintingType] = useState("escpos");
  const [paperWidth, setPaperWidth] = useState("58");
  const [printAutomatically, setPrintAutomatically] = useState(false);

  const categories = [
    { id: 'display', label: 'Display Mode' },
    { id: 'sounds', label: 'Sounds' },
    { id: 'transition', label: 'Transition Times' },
    { id: 'colors', label: 'Colors' },
    { id: 'language', label: 'Language' },
    { id: 'printers', label: 'Printers' },
    { id: 'delete', label: 'Delete Account' },
    { id: 'legal', label: 'Legal' },
  ];

  const transitionTypes = [
    { type: 'Delivery', caution: '00:15:00', last: '00:30:00' },
    { type: 'Pickup', caution: '00:10:00', last: '00:20:00' },
    { type: 'Dinein', caution: '00:10:00', last: '00:20:00' },
  ];

  const renderContent = () => {
    switch (activeCategory) {
      case 'display':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4">Display Mode</h3>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-700">Dark Theme</span>
                <Switch checked={darkTheme} onCheckedChange={setDarkTheme} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Screen Options</h4>
              <div className="space-y-2">
                {['classic', 'compact', 'split'].map(opt => (
                  <label key={opt} className="flex items-center gap-3 py-2 cursor-pointer">
                    <input
                      type="radio"
                      name="screenOption"
                      value={opt}
                      checked={screenOption === opt}
                      onChange={() => setScreenOption(opt)}
                      className="h-4 w-4 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'sounds':
        return (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 mb-4">Sounds</h3>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Push Notifications</span>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <VolumeX className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Mute Order Sounds</span>
              </div>
              <Switch checked={muteOrderSounds} onCheckedChange={setMuteOrderSounds} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <span className="text-sm text-gray-700 block">Repeat Until Order Acknowledge</span>
                <span className="text-xs text-gray-400">Sound will repeat until the order is acknowledged by staff</span>
              </div>
              <Switch checked={repeatUntilAcknowledge} onCheckedChange={setRepeatUntilAcknowledge} />
            </div>
          </div>
        );

      case 'transition':
        return (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 mb-1">Transition Times</h3>
            <p className="text-xs text-gray-500 mb-4">Set caution and late thresholds for each order type. Timer color changes based on these values.</p>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-600">Scheduled</h4>
              {transitionTypes.map(t => (
                <div key={t.type} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <span className="text-sm font-semibold text-gray-800">{t.type}</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Caution Time</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-gray-700">{t.caution}</span>
                      <ChevronRight className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Last Time</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-gray-700">{t.last}</span>
                      <ChevronRight className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'colors':
        return (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Colors</h3>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Status Colors</h4>
              <div className="space-y-2">
                {[
                  { label: 'On Time', color: 'bg-green-500' },
                  { label: 'Caution', color: 'bg-yellow-500' },
                  { label: 'Late', color: 'bg-red-500' },
                ].map(c => (
                  <div key={c.label} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full ${c.color}`} />
                      <span className="text-sm text-gray-700">{c.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Type</h4>
              <div className="space-y-2">
                {[
                  { label: 'Delivery', color: 'bg-green-500' },
                  { label: 'Pickup', color: 'bg-blue-500' },
                  { label: 'Dinein', color: 'bg-purple-500' },
                  { label: 'Takeout', color: 'bg-cyan-400' },
                ].map(c => (
                  <div key={c.label} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full ${c.color}`} />
                      <span className="text-sm text-gray-700">{c.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 mb-4">Language</h3>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="ta">தமிழ்</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'printers':
        return (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 mb-4">Printers</h3>
            {showPrinterForm ? (
              <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">Add Printer</h4>
                  <button onClick={() => setShowPrinterForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Name</label>
                  <Input value={printerName} onChange={(e) => setPrinterName(e.target.value)} placeholder="Printer name" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Printer Model</label>
                  <Select value={printerModel} onValueChange={setPrinterModel}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bluetooth">Bluetooth printer</SelectItem>
                      <SelectItem value="usb">USB printer</SelectItem>
                      <SelectItem value="network">Network printer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bluetooth printer</label>
                  <div className="flex gap-2">
                    <Input value={bluetoothAddress} onChange={(e) => setBluetoothAddress(e.target.value)} placeholder="Bluetooth address" className="h-9 text-sm flex-1" />
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white h-9 text-xs">
                      <Search className="h-3 w-3 mr-1" /> Search
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Printing Type</label>
                  <Select value={printingType} onValueChange={setPrintingType}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="escpos">Esc/Pos</SelectItem>
                      <SelectItem value="star">Star</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Paper width</label>
                  <Select value={paperWidth} onValueChange={setPaperWidth}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58">58mm</SelectItem>
                      <SelectItem value="80">80mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Print automatically</span>
                  <Switch checked={printAutomatically} onCheckedChange={setPrintAutomatically} />
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Printer className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No printers configured</p>
                <p className="text-xs text-gray-400 mt-1">Add a printer to enable printing</p>
              </div>
            )}
            {!showPrinterForm && (
              <button
                onClick={() => setShowPrinterForm(true)}
                className="fixed bottom-6 right-6 w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center z-30"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </div>
        );

      case 'delete':
        return (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 mb-4">Delete Account</h3>
            <p className="text-sm text-gray-600">Permanently delete your KDS account and all associated data. This action cannot be undone.</p>
            <Button variant="destructive" className="mt-4">
              <Trash2 className="h-4 w-4 mr-2" /> Delete Account
            </Button>
          </div>
        );

      case 'legal':
        return (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 mb-4">Legal</h3>
            <div className="space-y-3">
              <button className="w-full text-left py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm text-gray-700 flex items-center justify-between">
                Terms of Service <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
              <button className="w-full text-left py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm text-gray-700 flex items-center justify-between">
                Privacy Policy <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
              <button className="w-full text-left py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm text-gray-700 flex items-center justify-between">
                Licenses <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex">
      <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-bold text-gray-900">Settings</h2>
        </div>
        <nav className="flex-1 py-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                activeCategory === cat.id
                  ? 'bg-teal-50 text-teal-700 font-semibold border-r-2 border-teal-500'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </div>
    </div>
  );
}

function MainLayout({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'current' | 'scheduled' | 'history' | 'settings'>('current');
  const [searchQuery, setSearchQuery] = useState("");

  const { data: currentData } = useQuery<{ orders: any[]; count: number }>({
    queryKey: ['/api/kds/orders', 'current'],
    refetchInterval: 10000,
  });

  const openCount = currentData?.count || currentData?.orders?.length || 0;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/kds/logout");
    },
    onSuccess: () => {
      toast({ title: "Logged out" });
      onLogout();
    },
    onError: (error: any) => {
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
    },
  });

  if (activeView === 'settings') {
    return <SettingsPanel onClose={() => setActiveView('current')} />;
  }

  const sidebarItems = [
    { id: 'current' as const, icon: Clock, label: 'Current' },
    { id: 'scheduled' as const, icon: Calendar, label: 'Scheduled' },
    { id: 'history' as const, icon: CheckCircle, label: 'History' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-[70px] bg-white border-r border-gray-200 flex flex-col items-center py-4 shrink-0">
        <button className="relative mb-6">
          <Bell className="h-5 w-5 text-red-500" />
          {openCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {openCount > 9 ? '9+' : openCount}
            </span>
          )}
        </button>

        <nav className="flex-1 flex flex-col gap-1">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg transition-colors ${
                  isActive ? 'bg-teal-50 text-teal-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 mt-auto">
          <button
            onClick={() => setActiveView('settings')}
            className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
          <button
            onClick={() => logoutMutation.mutate()}
            className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">{openCount} open orders</span>
            <Bell className="h-4 w-4 text-gray-400" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference #"
              className="h-9 pl-9 w-56 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeView === 'current' && <CurrentView searchQuery={searchQuery} />}
          {activeView === 'scheduled' && <ScheduledView />}
          {activeView === 'history' && <HistoryView />}
        </div>
      </div>
    </div>
  );
}

export default function KDSDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const { data: meData, isLoading: meLoading } = useQuery<any>({
    queryKey: ['/api/kds/me'],
    retry: false,
  });

  useEffect(() => {
    if (meLoading) return;
    if (meData && !meData.error) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [meData, meLoading]);

  if (isAuthenticated === null || meLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return <MainLayout onLogout={() => setIsAuthenticated(false)} />;
}
