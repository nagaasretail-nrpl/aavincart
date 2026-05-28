import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  LayoutDashboard, ShoppingBag, Package, Monitor, User,
  LogOut, Lock, Mail, Store, MapPin, Phone, IndianRupee,
  Clock, CheckCircle, AlertCircle, Plus, Minus, ShoppingCart,
  ExternalLink, Loader2
} from "lucide-react";

interface MerchantData {
  id: string;
  restaurantName: string;
  contactName: string;
  contactEmail: string;
  restaurantPhone: string;
  address: string;
  status: string;
  logo?: string;
  description?: string;
  role: string;
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
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
        toast({ title: "Login successful", description: "Welcome to your dashboard!" });
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
          <h1 className="text-xl font-bold text-gray-900">District Union Login</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your merchant dashboard</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); loginMutation.mutate(); }} className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-sm font-medium">Username / Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username or email" className="h-11 pl-10 rounded-xl" required />
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
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/merchant-register" className="text-purple-600 hover:underline font-medium">Register as District Union</Link>
        </p>
      </div>
    </div>
  );
}

function DashboardTab({ merchant, orders }: { merchant: MerchantData; orders: any[] }) {
  const totalOrders = orders.length;
  const revenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0);
  const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;

  const { data: menuItems = [] } = useQuery<any[]>({
    queryKey: ['/api/union', merchant.id, 'menu-items'],
  });

  const activeProducts = Array.isArray(menuItems) ? menuItems.filter((item: any) => item.available !== false).length : 0;

  const recentOrders = orders.slice(0, 3);

  const stats = [
    { label: "Total Orders", value: totalOrders, icon: ShoppingBag, color: "bg-blue-500" },
    { label: "Revenue", value: `₹${revenue.toFixed(0)}`, icon: IndianRupee, color: "bg-green-500" },
    { label: "Active Products", value: activeProducts, icon: Package, color: "bg-purple-500" },
    { label: "Pending Orders", value: pendingOrders, icon: Clock, color: "bg-orange-500" },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">#{order.id?.slice(-6) || order.id}</p>
                  <p className="text-xs text-gray-500">{order.customerName || 'Walk-in'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₹{parseFloat(order.total || '0').toFixed(2)}</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "New", className: "bg-green-100 text-green-700" },
    accepted: { label: "Processing", className: "bg-yellow-100 text-yellow-700" },
    preparing: { label: "Processing", className: "bg-yellow-100 text-yellow-700" },
    ready: { label: "Ready", className: "bg-blue-100 text-blue-700" },
    completed: { label: "Completed", className: "bg-gray-100 text-gray-600" },
    delivered: { label: "Delivered", className: "bg-gray-100 text-gray-600" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
  };
  const { label, className } = config[status] || { label: status, className: "bg-gray-100 text-gray-600" };
  return <Badge className={`text-[12px] px-2 py-0.5 rounded-full ${className}`}>{label}</Badge>;
}

function OrdersTab({ merchant, orders }: { merchant: MerchantData; orders: any[] }) {
  const [filter, setFilter] = useState("all");
  const qc = useQueryClient();
  const { toast } = useToast();

  const filteredOrders = filter === "all" ? orders : orders.filter((o: any) => {
    if (filter === "new") return o.status === "pending";
    if (filter === "processing") return o.status === "accepted" || o.status === "preparing";
    if (filter === "ready") return o.status === "ready";
    if (filter === "completed") return o.status === "completed" || o.status === "delivered";
    return true;
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/union/${merchant.id}/orders/${orderId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Order Updated" });
      qc.invalidateQueries({ queryKey: ['/api/union', merchant.id, 'orders'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const filters = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "processing", label: "Processing" },
    { key: "ready", label: "Ready" },
    { key: "completed", label: "Done" },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filter === f.key ? "bg-[#2d1b4e] text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order: any) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">#{order.id?.slice(-6) || order.id}</p>
                  <p className="text-xs text-gray-500">{order.customerName || 'Walk-in Customer'}</p>
                  {order.createdAt && (
                    <p className="text-[12px] text-gray-400 mt-1">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-gray-900">₹{parseFloat(order.total || '0').toFixed(2)}</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>

              {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                <div className="text-xs text-gray-500 mb-3 border-t border-gray-50 pt-2">
                  {order.items.slice(0, 2).map((item: any, i: number) => (
                    <span key={i}>{item.name || item.itemName} x{item.quantity}{i < Math.min(order.items.length, 2) - 1 ? ', ' : ''}</span>
                  ))}
                  {order.items.length > 2 && <span> +{order.items.length - 2} more</span>}
                </div>
              )}

              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'accepted' })}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-all"
                    disabled={updateStatusMutation.isPending}
                  >
                    Accept
                  </button>
                )}
                {(order.status === 'accepted' || order.status === 'preparing') && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'ready' })}
                    className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition-all"
                    disabled={updateStatusMutation.isPending}
                  >
                    Mark Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'delivered' })}
                    className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold transition-all"
                    disabled={updateStatusMutation.isPending}
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductsTab({ merchant }: { merchant: MerchantData }) {
  const { data: menuItems = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/union', merchant.id, 'menu-items'],
  });

  const items = Array.isArray(menuItems) ? menuItems : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">Products ({items.length})</h3>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item: any) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <div className="text-3xl mb-2 text-center">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg mx-auto" />
                ) : (
                  <span>{item.emoji || '📦'}</span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-500 truncate">{item.category || 'Uncategorized'}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm font-bold text-purple-700">₹{parseFloat(item.price || '0').toFixed(2)}</p>
                <Badge className={`text-[12px] px-1.5 py-0.5 rounded-full ${
                  item.available !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {item.available !== false ? 'In Stock' : 'Out'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function POSTab({ merchant }: { merchant: MerchantData }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cart, setCart] = useState<Record<string, number>>({});

  const { data: menuItems = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/union', merchant.id, 'menu-items'],
  });

  const items = Array.isArray(menuItems) ? menuItems.filter((item: any) => item.available !== false) : [];

  const addToCart = (itemId: string) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const item = items.find((i: any) => String(i.id) === id);
    return { ...item, quantity: qty };
  }).filter(i => i.name);

  const cartTotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.price || '0') * item.quantity), 0);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderItems = cartItems.map(item => ({
        menuItemId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));
      const res = await apiRequest("POST", `/api/orders`, {
        restaurantId: merchant.id,
        items: orderItems,
        total: cartTotal.toFixed(2),
        status: 'completed',
        paymentMethod: 'cash',
        orderType: 'pos',
        customerName: 'Walk-in Customer',
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Order Created", description: `Total: ₹${cartTotal.toFixed(2)}` });
      setCart({});
      qc.invalidateQueries({ queryKey: ['/api/union', merchant.id, 'orders'] });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-40">
      <h3 className="text-base font-bold text-gray-900">Quick POS</h3>

      {items.length === 0 ? (
        <div className="py-12 text-center">
          <Monitor className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No products available</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl">{item.emoji || '📦'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-purple-600 font-bold">₹{parseFloat(item.price || '0').toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cart[String(item.id)] ? (
                  <>
                    <button onClick={() => removeFromCart(String(item.id))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{cart[String(item.id)]}</span>
                    <button onClick={() => addToCart(String(item.id))} className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Plus className="h-3 w-3 text-purple-700" />
                    </button>
                  </>
                ) : (
                  <button onClick={() => addToCart(String(item.id))} className="px-4 py-1.5 bg-[#2d1b4e] text-white rounded-lg text-xs font-semibold">
                    Add
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cartItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-900">{cartItems.length} items</span>
              </div>
              <span className="text-lg font-bold text-gray-900">₹{cartTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={() => createOrderMutation.mutate()}
              disabled={createOrderMutation.isPending}
              className="w-full py-3 bg-[#2d1b4e] hover:bg-[#3d2b5e] text-white rounded-xl font-bold text-sm transition-all"
            >
              {createOrderMutation.isPending ? 'Creating Order...' : `Place Order • ₹${cartTotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountTab({ merchant }: { merchant: MerchantData }) {
  const handleLogout = async () => {
    try {
      document.cookie = 'merchant_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
            <Store className="h-7 w-7 text-purple-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{merchant.restaurantName}</p>
            <Badge className={`text-[12px] px-2 py-0.5 rounded-full ${
              merchant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {merchant.status || 'Active'}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Contact Name</p>
              <p className="text-sm font-medium text-gray-900">{merchant.contactName || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{merchant.contactEmail || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-sm font-medium text-gray-900">{merchant.restaurantPhone || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Address</p>
              <p className="text-sm font-medium text-gray-900">{merchant.address || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      <Link href={`/union/dashboard?auto_login=${merchant.id}`}>
        <button className="w-full bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ExternalLink className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-semibold text-gray-900">Open Desktop Dashboard</span>
          </div>
          <span className="text-xs text-gray-400">Full view</span>
        </button>
      </Link>

      <button
        onClick={handleLogout}
        className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}

function Dashboard({ merchant }: { merchant: MerchantData }) {
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: ordersData = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['/api/union', merchant.id, 'orders'],
  });

  const orders = Array.isArray(ordersData) ? ordersData : [];

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "products", label: "Products", icon: Package },
    { id: "pos", label: "POS", icon: Monitor },
    { id: "account", label: "Account", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
      <header className="bg-[#2d1b4e] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold truncate max-w-[200px]">{merchant.restaurantName}</h1>
            <p className="text-[12px] text-purple-200">District Union</p>
          </div>
        </div>
        <button
          onClick={() => {
            document.cookie = 'merchant_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            window.location.reload();
          }}
          className="p-2 hover:bg-white/10 rounded-lg transition-all"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <main className="pb-20">
        {ordersLoading && activeTab !== 'products' && activeTab !== 'account' ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && <DashboardTab merchant={merchant} orders={orders} />}
            {activeTab === "orders" && <OrdersTab merchant={merchant} orders={orders} />}
            {activeTab === "products" && <ProductsTab merchant={merchant} />}
            {activeTab === "pos" && <POSTab merchant={merchant} />}
            {activeTab === "account" && <AccountTab merchant={merchant} />}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-md mx-auto flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 pt-2.5 transition-all ${
                activeTab === tab.id ? 'text-[#2d1b4e]' : 'text-gray-400'
              }`}
            >
              <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-[#2d1b4e]' : ''}`} />
              <span className={`text-[12px] mt-1 font-medium ${activeTab === tab.id ? 'text-[#2d1b4e] font-bold' : ''}`}>{tab.label}</span>
              {activeTab === tab.id && <div className="w-5 h-0.5 bg-[#2d1b4e] rounded-full mt-0.5" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function MobileMerchantDashboard() {
  const [authChecked, setAuthChecked] = useState(false);

  const { data: merchant, isLoading, error } = useQuery<MerchantData>({
    queryKey: ['/api/merchant/me'],
    retry: false,
    staleTime: 60000,
  });

  useEffect(() => {
    if (!isLoading) {
      setAuthChecked(true);
    }
  }, [isLoading]);

  if (isLoading || !authChecked) {
    return (
      <div className="min-h-screen bg-[#2d1b4e] flex flex-col items-center justify-center">
        <div className="animate-spin w-10 h-10 border-3 border-white border-t-transparent rounded-full mb-3" />
        <p className="text-white text-sm">Loading...</p>
      </div>
    );
  }

  if (error || !merchant) {
    return <LoginForm onLogin={() => window.location.reload()} />;
  }

  return <Dashboard merchant={merchant} />;
}
