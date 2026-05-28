import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { 
  LayoutDashboard,
  Package, LogOut, User, MapPin, Phone, Mail, Building2, 
  Search, ShoppingCart, Plus, Minus, Truck, FileText, Milk,
  TrendingUp, DollarSign, Receipt, Users, Calendar, BarChart3, Warehouse,
  Wallet, CreditCard, ArrowDownCircle, ArrowUpCircle, RefreshCw, History,
  ChevronDown, ChevronRight, Bell, Settings, ShoppingBag, Store, Menu, X,
  UserPlus, Shield, CheckCircle, XCircle, Edit, Trash2, IceCream, Clock, Home
} from "lucide-react";

const PRICING_ROLES = ['FEDERATION', 'INTER_UNION', 'WHOLESALE_DEALER', 'DEALER', 'RETAILER', 'MRP'];

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  subItems?: { id: string; label: string; count?: number; countColor?: string }[];
}

const baseSidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'POS', icon: Store, subItems: [
    { id: 'pos-sell', label: 'Sell Products' },
    { id: 'pos-history', label: 'Sales History' },
  ]},
  { id: 'wallet', label: 'Wallet', icon: Wallet, subItems: [
    { id: 'wallet-balance', label: 'Balance & Add Funds' },
    { id: 'wallet-transactions', label: 'Transaction History' },
  ]},
  { id: 'inventory', label: 'Inventory', icon: Warehouse, subItems: [
    { id: 'my-stock', label: 'My Stock' },
    { id: 'stock-alerts', label: 'Stock Alerts' },
  ]},
  { id: 'orders', label: 'Orders', icon: ShoppingBag, subItems: [
    { id: 'order-history', label: 'Order History' },
    { id: 'pending-orders', label: 'Pending Orders', count: 0 },
    { id: 'downstream-orders', label: 'Downstream Orders' },
  ]},
  { id: 'retailers', label: 'My Retailers', icon: Users, subItems: [
    { id: 'retailer-list', label: 'Retailer List' },
    { id: 'add-retailer', label: 'Add Retailer' },
  ]},
  { id: 'approvals', label: 'Approvals', icon: Shield, subItems: [
    { id: 'hierarchy-pending', label: 'Pending' },
    { id: 'hierarchy-approved', label: 'Approved' },
  ]},
  { id: 'commission', label: 'Commission', icon: TrendingUp, subItems: [
    { id: 'commission-summary', label: 'Summary' },
    { id: 'commission-history', label: 'History' },
  ]},
  { id: 'gst', label: 'GST & E-way', icon: FileText, subItems: [
    { id: 'gst-returns', label: 'GST Returns' },
    { id: 'eway-bills', label: 'E-way Bills' },
  ]},
  { id: 'delivery', label: 'Delivery', icon: Truck, subItems: [
    { id: 'delivery-schedule', label: 'Schedule' },
    { id: 'delivery-tracking', label: 'Tracking' },
  ]},
  { id: 'home', label: 'Aavin Home', icon: Home },
];

const sidebarItems = baseSidebarItems;

// View-only sidebar items (for viewer role - only orders access)
const viewerSidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, subItems: [
    { id: 'order-history', label: 'All Orders' },
    { id: 'pending-orders', label: 'Pending Orders', count: 0 },
  ]},
  { id: 'home', label: 'Aavin Home', icon: Home },
];

export default function DealerDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
    // All logged-in users can access their dashboard
  }, [user, setLocation]);

  const { data: productsData, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
    enabled: !!user
  });

  // For viewers, fetch all orders for their union; for others, fetch user's orders
  const { data: ordersData } = useQuery<any[]>({
    queryKey: user?.role === 'viewer' ? ["/api/orders", "union", user?.unionId] : ["/api/orders"],
    queryFn: async () => {
      // For viewers, get all orders for their union (Salem = UNI-SLM-01)
      if (user?.role === 'viewer') {
        const unionRestaurantId = user?.unionId === 'merchant-3' ? 'UNI-SLM-01' : null;
        if (unionRestaurantId) {
          const response = await fetch(`/api/orders?restaurantId=${unionRestaurantId}`);
          return response.json();
        }
      }
      // For regular users, fetch their own orders
      const response = await fetch('/api/orders');
      return response.json();
    },
    enabled: !!user
  });

  const { data: retailersData } = useQuery<any[]>({
    queryKey: ["/api/retailers"],
    enabled: !!user
  });

  const { data: hierarchyData } = useQuery<{ success: boolean; users: any[] }>({
    queryKey: ["/api/hierarchy/my-users"],
    enabled: !!user
  });

  const { data: downstreamOrdersData } = useQuery<{ success: boolean; orders: any[] }>({
    queryKey: ["/api/hierarchy/downstream-orders"],
    enabled: !!user
  });

  const hierarchyUsers = hierarchyData?.users || [];
  const hierarchyRetailers = hierarchyUsers.filter((u: any) => u.childRole === 'retailer');
  const hierarchyDealers = hierarchyUsers.filter((u: any) => u.childRole === 'dealer');
  const pendingHierarchyApprovals = hierarchyUsers.filter((u: any) => u.approvalStatus === 'pending');
  const downstreamOrders = downstreamOrdersData?.orders || [];

  const addHierarchyUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest('POST', '/api/hierarchy/add-user', userData);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "User Added", description: "User added to your hierarchy" });
        queryClient.invalidateQueries({ queryKey: ["/api/hierarchy/my-users"] });
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    }
  });

  const updateHierarchyUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('POST', `/api/hierarchy/${id}/update`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy/my-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy/downstream-orders"] });
    }
  });

  const deleteHierarchyUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/hierarchy/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Removed", description: "User removed from hierarchy" });
      queryClient.invalidateQueries({ queryKey: ["/api/hierarchy/my-users"] });
    }
  });

  const { data: inventoryData, refetch: refetchInventory } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
    enabled: !!user
  });

  const { data: walletData, refetch: refetchWallet } = useQuery<any>({
    queryKey: ["/api/wallet"],
    enabled: !!user
  });

  const { data: walletTransactionsData, refetch: refetchWalletTransactions } = useQuery<any[]>({
    queryKey: ["/api/wallet/transactions"],
    enabled: !!user
  });

  const [addFundsAmount, setAddFundsAmount] = useState<string>("");
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);

  const addFundsMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest('POST', '/api/wallet/add-funds', { amount });
      return response.json();
    },
    onSuccess: async (data) => {
      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: "AAVIN",
        description: "Add funds to wallet",
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await apiRequest('POST', '/api/wallet/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount: data.amount
            });
            if (verifyResponse.ok) {
              toast({
                title: "Success",
                description: `₹${data.amount} added to your wallet`
              });
              refetchWallet();
              refetchWalletTransactions();
              setIsAddFundsOpen(false);
              setAddFundsAmount("");
            }
          } catch (error) {
            toast({
              title: "Error",
              description: "Payment verification failed",
              variant: "destructive"
            });
          }
        },
        prefill: {
          email: user?.email || "",
          contact: user?.phone || ""
        },
        theme: {
          color: "#4AB3E8"
        }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create payment order",
        variant: "destructive"
      });
    }
  });

  const wallet = walletData && typeof walletData === 'object' && !Array.isArray(walletData) ? walletData : { balance: "0.00" };
  const walletTransactions = Array.isArray(walletTransactionsData) ? walletTransactionsData : [];

  const products = Array.isArray(productsData) ? productsData : [];
  const orders = Array.isArray(ordersData) ? ordersData : [];
  const retailers = Array.isArray(retailersData) ? retailersData : [];
  const inventory = Array.isArray(inventoryData) ? inventoryData : [];

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    const caseUnits = product?.unitsPerPackage || 1;
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + caseUnits
    }));
  };

  const removeFromCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    const caseUnits = product?.unitsPerPackage || 1;
    setCart(prev => {
      const newQty = (prev[productId] || 0) - caseUnits;
      if (newQty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const getDealerBasePrice = (product: any) => {
    return parseFloat(product.retailPrice || (parseFloat(product.mrp || product.price) * 0.85).toFixed(2));
  };

  const getDealerBillingPrice = (product: any) => {
    const base = getDealerBasePrice(product);
    const gst = parseFloat(product.gstPercent || '0');
    return (base + (base * gst / 100)).toFixed(2);
  };

  const cartTotal = Object.entries(cart).reduce((total, [productId, qty]) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      return total + (parseFloat(getDealerBillingPrice(product)) * qty);
    }
    return total;
  }, 0);

  const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });

  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
  const commissionEarned = totalRevenue * 0.15;

  // Calculate order counts for sidebar badges
  const orderCounts = {
    pending: orders.filter((o: any) => o.status === 'pending').length,
  };

  // Use viewer sidebar for viewer role, regular sidebar for others
  const baseSidebarItems = user?.role === 'viewer' ? viewerSidebarItems : sidebarItems;
  
  // Dynamic sidebar items with real counts
  const dynamicSidebarItems = baseSidebarItems.map(item => {
    if (item.id === 'orders' && item.subItems) {
      return {
        ...item,
        subItems: item.subItems.map((subItem: any) => {
          if (subItem.id === 'pending-orders') {
            return { ...subItem, count: orderCounts.pending };
          }
          return subItem;
        }),
      };
    }
    return item;
  });

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'wallet-balance':
      case 'wallet':
        return <WalletSection 
          wallet={wallet} 
          isAddFundsOpen={isAddFundsOpen}
          setIsAddFundsOpen={setIsAddFundsOpen}
          addFundsAmount={addFundsAmount}
          setAddFundsAmount={setAddFundsAmount}
          addFundsMutation={addFundsMutation}
          refetchWallet={refetchWallet}
          refetchWalletTransactions={refetchWalletTransactions}
          walletTransactions={walletTransactions}
          user={user}
          toast={toast}
        />;
      case 'wallet-transactions':
        return <TransactionHistorySection walletTransactions={walletTransactions} />;
      case 'my-stock':
      case 'inventory':
        return <InventorySection inventory={inventory} refetchInventory={refetchInventory} />;
      case 'order-history':
      case 'pending-orders':
        return <OrderHistorySection orders={orders} filterStatus={activeSection === 'pending-orders' ? 'pending' : undefined} />;
      case 'retailer-list':
      case 'retailers':
        return <RetailersSection retailers={retailers} hierarchyRetailers={hierarchyRetailers} onAdd={addHierarchyUserMutation} onUpdate={updateHierarchyUserMutation} onDelete={deleteHierarchyUserMutation} />;
      case 'add-retailer':
        return <RetailersSection retailers={retailers} hierarchyRetailers={hierarchyRetailers} onAdd={addHierarchyUserMutation} onUpdate={updateHierarchyUserMutation} onDelete={deleteHierarchyUserMutation} showAddDialog={true} />;
      case 'downstream-orders':
        return <DownstreamOrdersSection orders={downstreamOrders} hierarchyUsers={hierarchyUsers} />;
      case 'hierarchy-pending':
        return <HierarchyApprovalSection users={pendingHierarchyApprovals} title="Pending Approvals" onUpdate={updateHierarchyUserMutation} onDelete={deleteHierarchyUserMutation} />;
      case 'hierarchy-approved':
        return <HierarchyApprovalSection users={hierarchyUsers.filter((u: any) => u.approvalStatus === 'approved')} title="Approved Users" onUpdate={updateHierarchyUserMutation} onDelete={deleteHierarchyUserMutation} />;
      case 'commission-summary':
      case 'commission':
        return <CommissionSection commissionEarned={commissionEarned} totalRevenue={totalRevenue} />;
      case 'gst-returns':
      case 'gst':
        return <GSTSection />;
      case 'delivery-schedule':
      case 'delivery':
        return <DeliverySection />;
      case 'pos-sell':
      case 'pos':
        return <POSSellSection products={products} user={user} toast={toast} />;
      case 'pos-history':
        return <POSHistorySection />;
      default:
        return <DashboardOverview 
          todayOrders={todayOrders}
          todayRevenue={todayRevenue}
          commissionEarned={commissionEarned}
          retailers={retailers}
          orders={orders}
          pendingApprovals={pendingHierarchyApprovals.length}
          hierarchyRetailers={hierarchyRetailers}
          downstreamOrders={downstreamOrders}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Left Sidebar - Hidden on mobile, overlay when open */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 lg:w-56 bg-[#1a472a] min-h-screen flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-green-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <Avatar className="h-10 w-10 bg-green-600 flex-shrink-0">
                <AvatarFallback className="bg-green-600 text-white">
                  {user.name?.charAt(0) || 'D'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.name}</p>
                <p className="text-green-300 text-xs truncate">{user.email}</p>
              </div>
            </div>
            <button 
              className="lg:hidden text-white p-1 hover:bg-green-700 rounded"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {dynamicSidebarItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.id === 'home') {
                    setLocation('/');
                    return;
                  }
                  if (item.subItems) {
                    toggleMenu(item.id);
                  } else {
                    setActiveSection(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  activeSection === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeSection))
                    ? 'bg-green-700 text-white border-l-4 border-yellow-400'
                    : 'text-green-200 hover:bg-green-800 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <item.icon className="h-4 w-4 mr-3" />
                  {item.label}
                </div>
                {item.subItems && (
                  expandedMenus.includes(item.id) 
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {item.subItems && expandedMenus.includes(item.id) && (
                <div className="bg-green-900/50">
                  {item.subItems.map((subItem: any) => (
                    <button
                      key={subItem.id}
                      onClick={() => setActiveSection(subItem.id)}
                      className={`w-full flex items-center justify-between pl-12 pr-4 py-2 text-sm transition-colors ${
                        activeSection === subItem.id
                          ? 'text-yellow-400 bg-green-800'
                          : 'text-green-300 hover:text-white hover:bg-green-800'
                      }`}
                    >
                      <span>{subItem.label}</span>
                      {subItem.count !== undefined && subItem.count > 0 && (
                        <span className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          {subItem.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-green-800">
          <Button 
            variant="ghost" 
            className="w-full text-green-200 hover:text-white hover:bg-green-800 justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b h-14 flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            {/* Mobile hamburger */}
            <button 
              className="lg:hidden p-2 -ml-1 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm md:text-lg font-semibold text-gray-800 truncate">Dashboard</h1>
            {user?.role === 'viewer' ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-medium text-xs hidden sm:flex">
                View Only
              </Badge>
            ) : user?.pricingRole && (
              <Badge variant="secondary" className="bg-primary/10 text-primary font-medium text-xs hidden sm:flex">
                {user.pricingRole === 'WHOLESALE_DEALER' || user.pricingRole === 'WSD' ? 'WSD' :
                 user.pricingRole === 'DEALER' || user.pricingRole === 'DLR' ? 'Dealer' :
                 user.pricingRole === 'RETAILER' ? 'Retailer' :
                 user.pricingRole === 'INTER_UNION' ? 'Union' :
                 user.pricingRole === 'FEDERATION' ? 'Fed' :
                 user.pricingRole === 'MRP' ? 'Consumer' : user.pricingRole}
              </Badge>
            )}
            {user?.role !== 'viewer' && (
              <div className="hidden md:flex items-center space-x-2">
                <Switch 
                  checked={acceptingOrders}
                  onCheckedChange={setAcceptingOrders}
                  className="data-[state=checked]:bg-green-500"
                />
                <span className={`text-sm font-medium ${acceptingOrders ? 'text-green-600' : 'text-gray-500'}`}>
                  {acceptingOrders ? 'Accepting' : 'Paused'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile order toggle */}
            {user?.role !== 'viewer' && (
              <div className="md:hidden flex items-center">
                <Switch 
                  checked={acceptingOrders}
                  onCheckedChange={setAcceptingOrders}
                  className="data-[state=checked]:bg-green-500 scale-90"
                />
              </div>
            )}
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-5 w-5 text-gray-600" />
            </Button>
            <Link href="/">
              <button className="p-2 hover:bg-muted rounded-lg text-[#4AB3E8]" title="Go to Aavin Home">
                <Home className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// Dashboard Overview Section - Comprehensive Layout
function DashboardOverview({ todayOrders, todayRevenue, commissionEarned, retailers, orders, pendingApprovals, hierarchyRetailers, downstreamOrders }: any) {
  const [orderTab, setOrderTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const { toast } = useToast();

  const totalSales = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0);
  const deliveredOrders = orders.filter((o: any) => o.status === 'delivered');
  const pendingOrders = orders.filter((o: any) => o.status === 'pending');
  const confirmedOrders = orders.filter((o: any) => o.status === 'confirmed');
  const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled');
  const processingOrders = orders.filter((o: any) => ['preparing', 'ready', 'out_for_delivery'].includes(o.status));

  const ordersByPricingRole = {
    federation: orders.filter((o: any) => o.pricingRole === 'FEDERATION').length,
    interUnion: orders.filter((o: any) => o.pricingRole === 'INTER_UNION').length,
    wholesale: orders.filter((o: any) => o.pricingRole === 'WHOLESALE_DEALER' || o.pricingRole === 'WSD').length,
    dealer: orders.filter((o: any) => o.pricingRole === 'DEALER').length,
    retailer: orders.filter((o: any) => o.pricingRole === 'RETAILER').length,
    consumer: orders.filter((o: any) => o.pricingRole === 'MRP' || !o.pricingRole).length,
  };

  const filteredOrders = orderTab === 'all' ? orders :
    orderTab === 'processing' ? processingOrders :
    orderTab === 'ready' ? orders.filter((o: any) => o.status === 'ready') :
    orderTab === 'completed' ? deliveredOrders : orders;

  const topCustomers = orders.reduce((acc: any, order: any) => {
    const email = order.customerEmail;
    if (!acc[email]) {
      acc[email] = { name: order.customerName, email, orders: 0 };
    }
    acc[email].orders += 1;
    return acc;
  }, {});
  const topCustomersList = Object.values(topCustomers).sort((a: any, b: any) => b.orders - a.orders).slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': case 'ready': case 'out_for_delivery': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-orange-500';
    }
  };

  const printInvoice = (order: any) => {
    const items = order.items || [];
    const printContent = `
      <html>
        <head>
          <title>Invoice - Order #${order.orderNumber || order.id?.slice(-6)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { color: #1a472a; margin: 0; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #1a472a; color: white; }
            .total { font-weight: bold; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AAVIN - Tamil Nadu Cooperative Milk Producers' Federation</h1>
            <p>Order #${order.orderNumber || order.id?.slice(-6)} | ${new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
          </div>
          <p><strong>Customer:</strong> ${order.customerName} | ${order.customerPhone}</p>
          <p><strong>Address:</strong> ${order.deliveryAddress}</p>
          <table>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            ${items.map((item: any) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>₹${parseFloat(item.price).toFixed(2)}</td><td>₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</td></tr>`).join('')}
          </table>
          <p class="total">Grand Total: ₹${parseFloat(order.total).toFixed(2)}</p>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); printWindow.print(); }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Top Stats Cards - 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="bg-gradient-to-r from-pink-400 to-pink-500 text-white relative overflow-hidden">
          <CardContent className="p-3 md:p-5">
            <p className="text-pink-100 text-[10px] md:text-xs font-medium">Total Sales</p>
            <p className="text-lg md:text-2xl font-bold mt-1">₹{totalSales.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-400 to-blue-500 text-white">
          <CardContent className="p-3 md:p-5">
            <p className="text-blue-100 text-[10px] md:text-xs font-medium">Total Orders</p>
            <p className="text-lg md:text-2xl font-bold mt-1">{orders.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-teal-400 to-teal-500 text-white">
          <CardContent className="p-3 md:p-5">
            <p className="text-teal-100 text-[10px] md:text-xs font-medium">Commission</p>
            <p className="text-lg md:text-2xl font-bold mt-1">₹{commissionEarned.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-400 to-purple-500 text-white">
          <CardContent className="p-3 md:p-5">
            <p className="text-purple-100 text-[10px] md:text-xs font-medium">Retailers</p>
            <p className="text-lg md:text-2xl font-bold mt-1">{retailers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission & Stats Row - 2 cols on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="bg-white border">
          <CardContent className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-gray-500 truncate">Week Comm.</p>
              <p className="font-bold text-sm md:text-base">₹{(commissionEarned * 0.3).toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border">
          <CardContent className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-gray-500 truncate">Month Comm.</p>
              <p className="font-bold text-sm md:text-base">₹{commissionEarned.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border">
          <CardContent className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Receipt className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-gray-500 truncate">Today Orders</p>
              <p className="font-bold text-sm md:text-base">{todayOrders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border">
          <CardContent className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-gray-500 truncate">Today Revenue</p>
              <p className="font-bold text-sm md:text-base">₹{todayRevenue.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row - Scrollable on mobile, 5 cols on desktop */}
      <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
          <Card className="bg-white border hover:shadow-md transition-shadow">
            <CardContent className="p-2 md:p-4 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-1 md:mb-2">
                <Package className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
              </div>
              <p className="text-lg md:text-2xl font-bold">{orders.length}</p>
              <p className="text-[10px] md:text-xs text-gray-500">Orders</p>
            </CardContent>
          </Card>
          <Card className="bg-white border hover:shadow-md transition-shadow">
            <CardContent className="p-2 md:p-4 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-1 md:mb-2">
                <Truck className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <p className="text-lg md:text-2xl font-bold">{deliveredOrders.length}</p>
              <p className="text-[10px] md:text-xs text-gray-500">Delivered</p>
            </CardContent>
          </Card>
          <Card className="bg-white border hover:shadow-md transition-shadow">
            <CardContent className="p-2 md:p-4 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-1 md:mb-2">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
              </div>
              <p className="text-lg md:text-2xl font-bold text-emerald-600">₹{totalSales.toFixed(0)}</p>
              <p className="text-[10px] md:text-xs text-gray-500">Sales</p>
            </CardContent>
          </Card>
          <Card className="bg-white border hover:shadow-md transition-shadow">
            <CardContent className="p-2 md:p-4 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-1 md:mb-2">
                <RefreshCw className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              </div>
              <p className="text-lg md:text-2xl font-bold text-red-600">₹0</p>
              <p className="text-[10px] md:text-xs text-gray-500">Refund</p>
            </CardContent>
          </Card>
          <Card className="bg-white border hover:shadow-md transition-shadow">
            <CardContent className="p-2 md:p-4 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-1 md:mb-2">
                <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
              </div>
              <p className="text-lg md:text-2xl font-bold">{pendingOrders.length}</p>
              <p className="text-[10px] md:text-xs text-gray-500">Pending</p>
            </CardContent>
          </Card>
          {pendingApprovals > 0 && (
            <Card className="bg-white border border-orange-200 hover:shadow-md transition-shadow">
              <CardContent className="p-2 md:p-4 text-center">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-1 md:mb-2">
                  <Shield className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
                </div>
                <p className="text-lg md:text-2xl font-bold text-orange-600">{pendingApprovals}</p>
                <p className="text-[10px] md:text-xs text-gray-500">Approvals</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Last Orders - Full Width, Mobile Optimized */}
      <Card>
          <CardHeader className="pb-2 px-3 md:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-medium">Last Orders</CardTitle>
                <p className="text-xs text-gray-500 hidden sm:block">Quick management of orders</p>
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {['all', 'processing', 'ready', 'completed'].map(tab => (
                  <Button
                    key={tab}
                    size="sm"
                    variant={orderTab === tab ? 'default' : 'ghost'}
                    className={`text-xs h-7 px-2 md:px-3 flex-shrink-0 ${orderTab === tab ? 'bg-green-600' : ''}`}
                    onClick={() => setOrderTab(tab)}
                  >
                    {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {filteredOrders.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No orders found</p>
            ) : (
              <div className="space-y-2">
                {filteredOrders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 hidden sm:flex">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs md:text-sm font-medium text-blue-600 truncate">#{order.orderNumber || order.id?.slice(-6)}</p>
                        <p className="text-[10px] md:text-xs text-gray-500 truncate">{order.customerEmail?.split('@')[0]}</p>
                        <p className="text-[10px] text-gray-400 md:hidden">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm md:text-base">₹{parseFloat(order.total).toFixed(0)}</p>
                        <Badge className={`${getStatusColor(order.status)} text-white text-[10px] md:text-xs`}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex gap-0.5 md:gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6 md:h-7 md:w-7" onClick={() => { setSelectedOrder(order); setIsOrderDialogOpen(true); }}>
                          <Search className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 md:h-7 md:w-7" onClick={() => printInvoice(order)}>
                          <FileText className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Order Detail Dialog - Mobile Optimized */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Order #{selectedOrder?.id?.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
                <div><span className="text-gray-500">Customer:</span> {selectedOrder.customerName}</div>
                <div><span className="text-gray-500">Phone:</span> {selectedOrder.customerPhone}</div>
                <div className="sm:col-span-2"><span className="text-gray-500">Address:</span> {selectedOrder.deliveryAddress}</div>
              </div>
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-xs md:text-sm min-w-[280px]">
                  <thead className="bg-gray-100">
                    <tr><th className="p-2 text-left">Item</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((item: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 max-w-[120px] truncate">{item.name}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-right">₹{(parseFloat(item.price) * item.quantity).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                <p className="text-base md:text-lg font-bold">₹{parseFloat(selectedOrder.total).toFixed(2)}</p>
              </div>
              <Button className="w-full" onClick={() => printInvoice(selectedOrder)}>
                <FileText className="h-4 w-4 mr-2" /> Print Invoice
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wallet Section
function WalletSection({ wallet, isAddFundsOpen, setIsAddFundsOpen, addFundsAmount, setAddFundsAmount, addFundsMutation, refetchWallet, refetchWalletTransactions, walletTransactions, user, toast }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm mb-1">Wallet Balance</p>
                <p className="text-4xl font-bold">₹{parseFloat(wallet.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <Wallet className="h-14 w-14 text-emerald-200" />
            </div>
            <div className="mt-6 flex gap-3">
              <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-white text-emerald-600 hover:bg-emerald-50">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Funds
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Funds to Wallet</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Amount (₹)</label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={addFundsAmount}
                        onChange={(e) => setAddFundsAmount(e.target.value)}
                        min="100"
                        step="100"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[500, 1000, 2000, 5000, 10000].map((amt) => (
                        <Button
                          key={amt}
                          variant="outline"
                          size="sm"
                          onClick={() => setAddFundsAmount(String(amt))}
                        >
                          ₹{amt.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        const amount = parseFloat(addFundsAmount);
                        if (amount >= 100) {
                          addFundsMutation.mutate(amount);
                        } else {
                          toast({
                            title: "Invalid Amount",
                            description: "Minimum amount is ₹100",
                            variant: "destructive"
                          });
                        }
                      }}
                      disabled={addFundsMutation.isPending || !addFundsAmount}
                    >
                      {addFundsMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay with Razorpay
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/20"
                onClick={() => {
                  refetchWallet();
                  refetchWalletTransactions();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <History className="h-5 w-5" />
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Credits</span>
                <span className="font-medium text-green-600">
                  ₹{walletTransactions
                    .filter((t: any) => t.type === 'credit')
                    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0)
                    .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Debits</span>
                <span className="font-medium text-red-600">
                  ₹{walletTransactions
                    .filter((t: any) => t.type === 'debit')
                    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0)
                    .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Transactions</span>
                <span className="font-medium">{walletTransactions.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Transaction History Section
function TransactionHistorySection({ walletTransactions }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {walletTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Transactions Yet</h3>
            <p className="text-muted-foreground">
              Add funds to your wallet to see transaction history here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {walletTransactions.map((transaction: any) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {transaction.type === 'credit' ? (
                    <ArrowDownCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <ArrowUpCircle className="h-8 w-8 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">{transaction.description || (transaction.type === 'credit' ? 'Added Funds' : 'Payment')}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'credit' ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Balance: ₹{parseFloat(transaction.newBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Inventory Section
function InventorySection({ inventory, refetchInventory }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Warehouse className="h-5 w-5" />
          My Stock Inventory
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetchInventory()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {inventory.length === 0 ? (
          <div className="text-center py-12">
            <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Inventory Yet</h3>
            <p className="text-muted-foreground">
              Your inventory will be automatically updated when you receive orders.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Product</th>
                  <th className="text-right py-3 px-4 font-medium">Quantity</th>
                  <th className="text-right py-3 px-4 font-medium">Last Purchase</th>
                  <th className="text-right py-3 px-4 font-medium">Last Qty</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        {item.unitType && (
                          <p className="text-sm text-muted-foreground">{item.unitType}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{item.quantity}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">{item.lastPurchaseQty || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Place Order Section
function PlaceOrderSection({ products, searchQuery, setSearchQuery, cart, addToCart, removeFromCart, getDealerPrice: getDealerBillingPrice, getDealerBasePrice, cartItemsCount, cartTotal, productsLoading }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {cartItemsCount > 0 && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-3 px-4">
              <div className="space-y-2">
                {Object.entries(cart).map(([productId, qty]: [string, any]) => {
                  const product = products.find((p: any) => p.id === productId);
                  if (!product) return null;
                  const base = getDealerBasePrice(product);
                  const gstPct = parseFloat(product.gstPercent || '0');
                  const gstAmt = base * gstPct / 100;
                  return (
                    <div key={productId} className="border-b border-green-200 pb-1.5">
                      <div className="flex justify-between text-sm font-medium">
                        <span>{product.name} x{qty} {product.unitsPerPackage ? `(${Math.round(qty / product.unitsPerPackage)} case${Math.round(qty / product.unitsPerPackage) !== 1 ? 's' : ''})` : ''}</span>
                        <span>₹{((base + gstAmt) * qty).toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Base: ₹{(base * qty).toFixed(2)} + GST({gstPct}%): ₹{(gstAmt * qty).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{Object.entries(cart).reduce((sum, [id, qty]: [string, any]) => { const p = products.find((x: any) => x.id === id); return sum + (p ? getDealerBasePrice(p) * qty : 0); }, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>GST</span>
                  <span>₹{Object.entries(cart).reduce((sum, [id, qty]: [string, any]) => { const p = products.find((x: any) => x.id === id); if (!p) return sum; const b = getDealerBasePrice(p); return sum + (b * parseFloat(p.gstPercent || '0') / 100) * qty; }, 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-green-300">
                  <span className="font-bold text-green-700">Total (incl. GST): ₹{cartTotal.toFixed(2)}</span>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    Checkout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {productsLoading ? (
        <div className="text-center py-12">Loading products...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product: any) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {product.image && (
                    <img src={product.image} alt={product.name} className="w-20 h-20 rounded object-cover" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                    {product.packagingType && product.unitsPerPackage && (
                      <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700 mt-1">
                        1 Case ({product.packagingType}) = {product.unitsPerPackage} {product.unitType || 'units'}
                      </Badge>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-green-600">₹{getDealerBillingPrice(product)}</p>
                        <p className="text-xs text-muted-foreground line-through">MRP: ₹{product.mrp || product.price}</p>
                        {product.packagingType && product.unitsPerPackage && (
                          <p className="text-xs text-gray-500 mt-1">
                            Per Case: ₹{(parseFloat(getDealerBillingPrice(product)) * product.unitsPerPackage).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {cart[product.id] ? (
                          <>
                            <Button size="icon" variant="outline" onClick={() => removeFromCart(product.id)}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="text-center">
                              <span className="w-8 text-center font-medium">{cart[product.id]}</span>
                              <p className="text-xs text-gray-500">{product.unitsPerPackage ? `${Math.round(cart[product.id] / product.unitsPerPackage)} case${Math.round(cart[product.id] / product.unitsPerPackage) !== 1 ? 's' : ''}` : 'units'}</p>
                            </div>
                            <Button size="icon" variant="outline" onClick={() => addToCart(product.id)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => addToCart(product.id)}>
                            <Plus className="h-4 w-4 mr-1" />
                            {product.unitsPerPackage ? 'Add 1 Case' : 'Add'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Order History Section
function OrderHistorySection({ orders, filterStatus }: any) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const { toast } = useToast();

  const filteredOrders = filterStatus 
    ? orders.filter((o: any) => o.status === filterStatus)
    : orders;

  const statusOptions = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

  const updateOrderStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast({ title: "Success", description: "Order status updated" });
        setEditingStatus(false);
        setSelectedOrder({ ...selectedOrder, status: newStatus });
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      } else {
        toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const printInvoice = () => {
    if (!selectedOrder) return;
    const items = selectedOrder.items || [];
    const printContent = `
      <html>
        <head>
          <title>Invoice - Order #${selectedOrder.id?.slice(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { color: #1a472a; margin: 0; }
            .header p { margin: 5px 0; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-box { padding: 15px; background: #f9f9f9; border-radius: 8px; }
            .info-box h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; }
            .info-box p { margin: 3px 0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #1a472a; color: white; }
            .total-row { font-weight: bold; background: #f0f0f0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AAVIN - Tamil Nadu Cooperative Milk Producers' Federation</h1>
            <p>Invoice / Tax Invoice</p>
          </div>
          <div class="info-grid">
            <div class="info-box">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> ${selectedOrder.id?.slice(0, 8)}</p>
              <p><strong>Date:</strong> ${new Date(selectedOrder.createdAt).toLocaleDateString('en-IN')}</p>
              <p><strong>Time:</strong> ${new Date(selectedOrder.createdAt).toLocaleTimeString('en-IN')}</p>
              <p><strong>Status:</strong> ${selectedOrder.status?.toUpperCase()}</p>
              <p><strong>Payment:</strong> ${selectedOrder.paymentMethod?.toUpperCase()}</p>
            </div>
            <div class="info-box">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> ${selectedOrder.customerName}</p>
              <p><strong>Phone:</strong> ${selectedOrder.customerPhone}</p>
              <p><strong>Email:</strong> ${selectedOrder.customerEmail}</p>
              <p><strong>Address:</strong> ${selectedOrder.deliveryAddress}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>₹${parseFloat(item.price).toFixed(2)}</td>
                  <td>₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Subtotal:</td>
                <td>₹${parseFloat(selectedOrder.subtotal || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="4" style="text-align: right;">Tax:</td>
                <td>₹${parseFloat(selectedOrder.tax || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="4" style="text-align: right;">Delivery:</td>
                <td>₹${parseFloat(selectedOrder.deliveryFee || 0).toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="4" style="text-align: right;"><strong>Grand Total:</strong></td>
                <td><strong>₹${parseFloat(selectedOrder.total || 0).toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <p>Thank you for your order!</p>
            <p>AAVIN - Quality Milk & Dairy Products</p>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-yellow-500';
      case 'out_for_delivery': return 'bg-purple-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {filterStatus ? `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Orders` : 'Order History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Orders Found</h3>
              <p className="text-muted-foreground">Orders will appear here once placed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order: any) => (
                <div 
                  key={order.id} 
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setSelectedOrder(order);
                    setNewStatus(order.status);
                    setIsDialogOpen(true);
                  }}
                >
                  <div>
                    <p className="font-medium">Order #{order.orderNumber || order.id?.slice(-6)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} • {order.customerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{order.total}</p>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Order #{selectedOrder?.id?.slice(0, 8)}</span>
              <Badge className={getStatusColor(selectedOrder?.status || '')}>
                {selectedOrder?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" /> Customer
                  </h4>
                  <p className="text-sm">{selectedOrder.customerName}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Delivery Address
                  </h4>
                  <p className="text-sm">{selectedOrder.deliveryAddress}</p>
                  {selectedOrder.deliveryInstructions && (
                    <p className="text-sm text-muted-foreground mt-1">Note: {selectedOrder.deliveryInstructions}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold mb-3">Order Items</h4>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-3 text-sm">Item</th>
                        <th className="text-center p-3 text-sm">Qty</th>
                        <th className="text-right p-3 text-sm">Price</th>
                        <th className="text-right p-3 text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((item: any, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="p-3 text-sm">{item.name}</td>
                          <td className="p-3 text-sm text-center">{item.quantity}</td>
                          <td className="p-3 text-sm text-right">₹{parseFloat(item.price).toFixed(2)}</td>
                          <td className="p-3 text-sm text-right">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{parseFloat(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Tax</span>
                  <span>₹{parseFloat(selectedOrder.tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Delivery Fee</span>
                  <span>₹{parseFloat(selectedOrder.deliveryFee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                  <span>Total</span>
                  <span>₹{parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Order Date:</span>
                  <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Method:</span>
                  <p className="font-medium">{selectedOrder.paymentMethod?.toUpperCase()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Order Type:</span>
                  <p className="font-medium">{selectedOrder.orderType?.toUpperCase()}</p>
                </div>
              </div>

              {/* Edit Status Section */}
              {editingStatus ? (
                <div className="p-4 border rounded-lg bg-yellow-50">
                  <h4 className="font-semibold mb-3">Update Order Status</h4>
                  <div className="flex gap-2 flex-wrap">
                    {statusOptions.map(status => (
                      <Button
                        key={status}
                        size="sm"
                        variant={newStatus === status ? 'default' : 'outline'}
                        onClick={() => setNewStatus(status)}
                        className={newStatus === status ? getStatusColor(status) : ''}
                      >
                        {status.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={updateOrderStatus} className="bg-green-600 hover:bg-green-700">
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingStatus(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={printInvoice} className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Print Invoice
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingStatus(!editingStatus)}
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {editingStatus ? 'Cancel Edit' : 'Edit Status'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RetailersSection({ retailers, hierarchyRetailers, onAdd, onUpdate, onDelete, showAddDialog }: any) {
  const [isAddOpen, setIsAddOpen] = useState(showAddDialog || false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newRetailer, setNewRetailer] = useState({
    childName: '', childEmail: '', childPhone: '', childRole: 'retailer',
    childAddress: '', childGstin: '', childBusinessName: '',
    pricingTier: 'RETAILER', districtUnion: '',
    freshMilkApproved: false, productsApproved: true, iceCreamApproved: false,
    freshMilkPricingRole: 'RETAILER', productsPricingRole: 'RETAILER', iceCreamPricingRole: 'RETAILER',
  });

  const allRetailers = hierarchyRetailers || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> My Retailers</h2>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Retailer
        </Button>
      </div>

      {allRetailers.length === 0 && (!retailers || retailers.length === 0) ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Retailers Yet</h3>
            <p className="text-muted-foreground">Add retailers to manage their orders and approve pricing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allRetailers.map((user: any) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={user.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                        {user.childName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.childName}</p>
                      {user.childBusinessName && <p className="text-sm text-gray-600">{user.childBusinessName}</p>}
                      <p className="text-xs text-gray-500">{user.childEmail}</p>
                    </div>
                  </div>
                  {user.approvalStatus === 'approved' ? (
                    <Badge className="bg-green-500 text-white">Approved</Badge>
                  ) : user.approvalStatus === 'pending' ? (
                    <Badge className="bg-orange-500 text-white">Pending</Badge>
                  ) : (
                    <Badge className="bg-red-500 text-white">Rejected</Badge>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-500">Pricing:</span>
                    <span className="font-medium ml-1">{user.pricingTier?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className={`rounded p-2 ${user.freshMilkApproved ? 'bg-cyan-50 text-cyan-800' : 'bg-gray-50 text-gray-400'}`}>
                    <Milk className="h-3 w-3 inline mr-1" />Fresh Milk: {user.freshMilkApproved ? 'Yes' : 'No'}
                  </div>
                  <div className={`rounded p-2 ${user.productsApproved ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-400'}`}>
                    <Package className="h-3 w-3 inline mr-1" />Products: {user.productsApproved ? 'Yes' : 'No'}
                  </div>
                  <div className={`rounded p-2 ${user.iceCreamApproved ? 'bg-pink-50 text-pink-800' : 'bg-gray-50 text-gray-400'}`}>
                    <IceCream className="h-3 w-3 inline mr-1" />Ice Cream: {user.iceCreamApproved ? 'Yes' : 'No'}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {user.approvalStatus === 'pending' && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onUpdate.mutate({ id: user.id, data: { approvalStatus: 'approved' } })}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onUpdate.mutate({ id: user.id, data: { approvalStatus: 'rejected' } })}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setEditingUser(user); setIsEditOpen(true); }}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('Remove?')) onDelete.mutate(user.id); }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {retailers?.filter((r: any) => !allRetailers.find((h: any) => h.childEmail === r.email)).map((retailer: any) => (
            <div key={retailer.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{retailer.name}</p>
                <p className="text-sm text-muted-foreground">{retailer.email}</p>
              </div>
              <Badge>{retailer.status || 'Active'}</Badge>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle><UserPlus className="h-5 w-5 inline mr-2" />Add Retailer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Business Name *</label><Input value={newRetailer.childBusinessName} onChange={e => setNewRetailer(p => ({...p, childBusinessName: e.target.value}))} /></div>
              <div><label className="text-sm font-medium">Contact Name *</label><Input value={newRetailer.childName} onChange={e => setNewRetailer(p => ({...p, childName: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Email *</label><Input value={newRetailer.childEmail} onChange={e => setNewRetailer(p => ({...p, childEmail: e.target.value}))} type="email" /></div>
              <div><label className="text-sm font-medium">Phone</label><Input value={newRetailer.childPhone} onChange={e => setNewRetailer(p => ({...p, childPhone: e.target.value}))} /></div>
            </div>
            <div><label className="text-sm font-medium">Address</label><Input value={newRetailer.childAddress} onChange={e => setNewRetailer(p => ({...p, childAddress: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">GSTIN</label><Input value={newRetailer.childGstin} onChange={e => setNewRetailer(p => ({...p, childGstin: e.target.value}))} /></div>
              <div>
                <label className="text-sm font-medium">Pricing Tier</label>
                <Select value={newRetailer.pricingTier} onValueChange={v => setNewRetailer(p => ({...p, pricingTier: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <h4 className="font-semibold flex items-center gap-2 pt-2"><Shield className="h-4 w-4" /> Segment Approval</h4>
            <div className="space-y-3">
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><Milk className="h-4 w-4 text-cyan-600" /><span className="text-sm font-medium">Fresh Milk</span></div>
                <Switch checked={newRetailer.freshMilkApproved} onCheckedChange={v => setNewRetailer(p => ({...p, freshMilkApproved: v}))} />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><Package className="h-4 w-4 text-blue-600" /><span className="text-sm font-medium">Products</span></div>
                <Switch checked={newRetailer.productsApproved} onCheckedChange={v => setNewRetailer(p => ({...p, productsApproved: v}))} />
              </div>
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><IceCream className="h-4 w-4 text-pink-600" /><span className="text-sm font-medium">Ice Cream</span></div>
                <Switch checked={newRetailer.iceCreamApproved} onCheckedChange={v => setNewRetailer(p => ({...p, iceCreamApproved: v}))} />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={!newRetailer.childName || !newRetailer.childEmail || onAdd.isPending} onClick={() => { onAdd.mutate(newRetailer); setIsAddOpen(false); }}>
                {onAdd.isPending ? 'Adding...' : 'Add Retailer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {editingUser && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle><Edit className="h-5 w-5 inline mr-2" />Edit: {editingUser.childName}</DialogTitle>
            </DialogHeader>
            <DealerEditUserForm user={editingUser} onSave={(data: any) => { onUpdate.mutate({ id: editingUser.id, data }); setIsEditOpen(false); }} onCancel={() => setIsEditOpen(false)} isPending={onUpdate.isPending} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DealerEditUserForm({ user, onSave, onCancel, isPending }: any) {
  const [formData, setFormData] = useState({
    approvalStatus: user.approvalStatus,
    pricingTier: user.pricingTier,
    freshMilkApproved: user.freshMilkApproved,
    productsApproved: user.productsApproved,
    iceCreamApproved: user.iceCreamApproved,
    freshMilkPricingRole: user.freshMilkPricingRole || 'RETAILER',
    productsPricingRole: user.productsPricingRole || 'RETAILER',
    iceCreamPricingRole: user.iceCreamPricingRole || 'RETAILER',
  });

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p><span className="text-gray-500">Name:</span> {user.childName}</p>
        <p><span className="text-gray-500">Email:</span> {user.childEmail}</p>
        <p><span className="text-gray-500">Role:</span> {user.childRole}</p>
      </div>
      <div>
        <label className="text-sm font-medium">Approval Status</label>
        <Select value={formData.approvalStatus} onValueChange={v => setFormData(p => ({...p, approvalStatus: v}))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Pricing Tier</label>
        <Select value={formData.pricingTier} onValueChange={v => setFormData(p => ({...p, pricingTier: v}))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <h4 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Segment Approval</h4>
      <div className="space-y-3">
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Milk className="h-4 w-4 text-cyan-600" /><span className="text-sm">Fresh Milk</span></div>
            <Switch checked={formData.freshMilkApproved} onCheckedChange={v => setFormData(p => ({...p, freshMilkApproved: v}))} />
          </div>
          {formData.freshMilkApproved && (
            <Select value={formData.freshMilkPricingRole} onValueChange={v => setFormData(p => ({...p, freshMilkPricingRole: v}))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Package className="h-4 w-4 text-blue-600" /><span className="text-sm">Products</span></div>
            <Switch checked={formData.productsApproved} onCheckedChange={v => setFormData(p => ({...p, productsApproved: v}))} />
          </div>
          {formData.productsApproved && (
            <Select value={formData.productsPricingRole} onValueChange={v => setFormData(p => ({...p, productsPricingRole: v}))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><IceCream className="h-4 w-4 text-pink-600" /><span className="text-sm">Ice Cream</span></div>
            <Switch checked={formData.iceCreamApproved} onCheckedChange={v => setFormData(p => ({...p, iceCreamApproved: v}))} />
          </div>
          {formData.iceCreamApproved && (
            <Select value={formData.iceCreamPricingRole} onValueChange={v => setFormData(p => ({...p, iceCreamPricingRole: v}))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{PRICING_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isPending} onClick={() => onSave(formData)}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

function DownstreamOrdersSection({ orders, hierarchyUsers }: any) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? orders : orders.filter((o: any) => o.status === filter);

  const getChildName = (email: string) => {
    const user = hierarchyUsers.find((u: any) => u.childEmail === email);
    return user?.childName || email;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Downstream Orders</h2>
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map(status => (
          <Button key={status} size="sm" variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)} className="capitalize">
            {status} ({status === 'all' ? orders.length : orders.filter((o: any) => o.status === status).length})
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No downstream orders found</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order: any) => (
            <Card key={order.id}><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Order #{order.orderNumber || order.id?.slice(-6)}</p>
                  <p className="text-sm text-gray-600">By: {getChildName(order.customerEmail)}</p>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">₹{parseFloat(order.total || '0').toFixed(2)}</p>
                  <Badge className={order.status === 'pending' ? 'bg-orange-500' : order.status === 'delivered' ? 'bg-green-500' : 'bg-blue-500'}>{order.status}</Badge>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

function HierarchyApprovalSection({ users, title, onUpdate, onDelete }: any) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> {title}</h2>
      {users.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No users in this category</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {users.map((user: any) => (
            <Card key={user.id}><CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={user.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                      {user.childName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.childName}</p>
                    <p className="text-xs text-gray-500">{user.childEmail} | {user.childRole}</p>
                  </div>
                </div>
                <Badge variant="outline">{user.pricingTier?.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className={`rounded p-2 ${user.freshMilkApproved ? 'bg-cyan-50 text-cyan-800' : 'bg-gray-50 text-gray-400'}`}>
                  <Milk className="h-3 w-3 inline mr-1" />Fresh Milk: {user.freshMilkApproved ? user.freshMilkPricingRole?.replace(/_/g, ' ') : 'No'}
                </div>
                <div className={`rounded p-2 ${user.productsApproved ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-400'}`}>
                  <Package className="h-3 w-3 inline mr-1" />Products: {user.productsApproved ? user.productsPricingRole?.replace(/_/g, ' ') : 'No'}
                </div>
                <div className={`rounded p-2 ${user.iceCreamApproved ? 'bg-pink-50 text-pink-800' : 'bg-gray-50 text-gray-400'}`}>
                  <IceCream className="h-3 w-3 inline mr-1" />Ice Cream: {user.iceCreamApproved ? user.iceCreamPricingRole?.replace(/_/g, ' ') : 'No'}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {user.approvalStatus === 'pending' && (
                  <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onUpdate.mutate({ id: user.id, data: { approvalStatus: 'approved' } })}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onUpdate.mutate({ id: user.id, data: { approvalStatus: 'rejected' } })}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm('Remove?')) onDelete.mutate(user.id); }}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Commission Section
function CommissionSection({ commissionEarned, totalRevenue }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Commission</p>
                <p className="text-3xl font-bold">₹{commissionEarned.toFixed(0)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold">₹{totalRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission Rate: 15%</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You earn 15% commission on all sales made through your retailer network.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// GST Section
function GSTSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          GST & E-way Bills
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">GST Management</h3>
          <p className="text-muted-foreground">
            Generate GST returns and E-way bills for your orders.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Delivery Section
function DeliverySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Delivery Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Delivery Schedule</h3>
          <p className="text-muted-foreground">
            Manage your delivery schedules and track shipments.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// POS Sell Section - Dealers can sell to Retailer and MRP customers only
function POSSellSection({ products, user, toast }: { products: any[]; user: any; toast: any }) {
  const [posCart, setPosCart] = useState<Record<string, { qty: number; price: number; name: string }>>({});
  const [customerType, setCustomerType] = useState<'retailer' | 'mrp'>('mrp');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<'Fresh Milk' | 'Products'>('Products');

  // Fetch merchant settings to check retailerPriceEnabled for the dealer's associated union
  const merchantId = user?.merchantId || user?.unionId;
  const { data: merchantSettings } = useQuery<{ retailerPriceEnabled?: boolean }>({
    queryKey: [`/api/merchants/${merchantId}`],
    enabled: !!merchantId,
  });
  const retailerPriceEnabled = merchantSettings?.retailerPriceEnabled === true;

  // Dealers can only sell to Retailer (if enabled) and MRP (their tier and below)
  const customerTypes = [
    { id: 'mrp', label: 'MRP/Consumer' },
    ...(retailerPriceEnabled ? [{ id: 'retailer', label: 'Retailer' }] : []),
  ];

  const getPriceForCustomerType = (item: any) => {
    const mrp = parseFloat(item.mrp || item.price || '0');
    const dealerPrice = parseFloat(item.retailPrice || item.mrp || '0');
    const gst = parseFloat(item.gstPercent || '0');
    
    let base: number;
    switch (customerType) {
      case 'retailer':
        base = mrp - ((mrp - dealerPrice) * 0.6);
        break;
      case 'mrp':
      default:
        base = mrp;
        break;
    }
    return base + (base * gst / 100);
  };

  const filteredProducts = products.filter(p => 
    (p.productSegment === activeSegment) &&
    (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addToCart = (product: any) => {
    const price = getPriceForCustomerType(product);
    setPosCart(prev => ({
      ...prev,
      [product.id]: {
        qty: (prev[product.id]?.qty || 0) + 1,
        price,
        name: product.name
      }
    }));
  };

  const updateQty = (productId: string, delta: number) => {
    setPosCart(prev => {
      const current = prev[productId];
      if (!current) return prev;
      const newQty = current.qty + delta;
      if (newQty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: { ...current, qty: newQty } };
    });
  };

  const clearCart = () => setPosCart({});

  const cartItems = Object.entries(posCart);
  const subtotal = cartItems.reduce((sum, [_, item]) => sum + (item.price * item.qty), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const processPayment = () => {
    if (cartItems.length === 0) {
      toast({ title: "Cart is empty", description: "Add products to sell", variant: "destructive" });
      return;
    }
    toast({ 
      title: "Sale Completed", 
      description: `${'\u20B9'}${total.toFixed(2)} collected via ${paymentMethod.toUpperCase()}` 
    });
    clearCart();
    setCustomerName('Walk-in Customer');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Sell Products
              </CardTitle>
              <div className="flex gap-2">
                {['Products', 'Fresh Milk'].map(seg => (
                  <Button
                    key={seg}
                    variant={activeSegment === seg ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveSegment(seg as any)}
                  >
                    {seg === 'Fresh Milk' ? <Milk className="h-4 w-4 mr-1" /> : <Package className="h-4 w-4 mr-1" />}
                    {seg}
                  </Button>
                ))}
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No products found</p>
                </div>
              ) : (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="p-3 bg-white border-2 rounded-lg hover:border-primary hover:shadow-md transition-all text-left group"
                  >
                    <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                    <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary text-sm">
                        {'\u20B9'}{getPriceForCustomerType(product).toFixed(2)}
                      </span>
                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Current Sale
              </div>
              <Badge variant="secondary">{cartItems.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Name</label>
              <Input 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Type (Pricing)</label>
              <div className="flex gap-2">
                {customerTypes.map(ct => (
                  <Button
                    key={ct.id}
                    variant={customerType === ct.id ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setCustomerType(ct.id as any);
                      setPosCart({});
                      toast({ title: "Pricing Updated", description: `Now using ${ct.label} pricing` });
                    }}
                  >
                    {ct.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t pt-3 max-h-48 overflow-y-auto space-y-2">
              {cartItems.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : (
                cartItems.map(([id, item]) => (
                  <div key={id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{'\u20B9'}{item.price.toFixed(2)} x {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.qty}</span>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <>
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal:</span><span>{'\u20B9'}{subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Tax (5%):</span><span>{'\u20B9'}{tax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-1 border-t">
                    <span>Total:</span><span className="text-primary">{'\u20B9'}{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'Cash' },
                      { id: 'upi', label: 'UPI' },
                      { id: 'card', label: 'Card' },
                    ].map(method => (
                      <Button
                        key={method.id}
                        variant={paymentMethod === method.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod(method.id as any)}
                      >
                        {method.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={clearCart}>Clear</Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={processPayment}>
                    Complete Sale
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// POS History Section
function POSHistorySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Sales History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Sales Yet</h3>
          <p className="text-muted-foreground">
            Sales made from your POS will appear here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
