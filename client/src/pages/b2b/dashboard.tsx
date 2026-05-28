import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearch, Link, useLocation } from 'wouter';
import customerLogo from '@assets/aavin-logo.png';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { useCartStore } from '@/lib/store';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatTimestamp } from '@/lib/format-timestamp';
import { 
  LayoutDashboard,
  ShoppingBag, 
  Wallet,
  Receipt,
  User,
  CreditCard,
  Package,
  Truck,
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Plus,
  Home,
  Eye,
  MapPin,
  Phone,
  Mail,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  History,
  LogOut,
  Store,
  Menu,
  X
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
  subItems?: { id: string; label: string; count?: number; countColor?: string }[];
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, subItems: [
    { id: 'all-orders', label: 'All Orders' },
    { id: 'pending-orders', label: 'Pending', countColor: 'yellow' },
    { id: 'delivered-orders', label: 'Delivered', countColor: 'green' },
    { id: 'cancelled-orders', label: 'Cancelled', countColor: 'red' },
  ]},
  { id: 'wallet', label: 'Wallet', icon: Wallet, subItems: [
    { id: 'wallet-balance', label: 'Balance & Top Up' },
    { id: 'wallet-transactions', label: 'Transaction History' },
  ]},
  { id: 'credit', label: 'Credit', icon: CreditCard, subItems: [
    { id: 'credit-overview', label: 'Credit Overview' },
    { id: 'credit-fresh-milk', label: 'Fresh Milk Credit' },
    { id: 'credit-products', label: 'Products Credit' },
  ]},
  { id: 'profile', label: 'Profile', icon: User, subItems: [
    { id: 'business-info', label: 'Business Information' },
    { id: 'delivery-addresses', label: 'Delivery Addresses' },
    { id: 'pricing-tier', label: 'Pricing Tier' },
  ]},
  { id: 'home', label: 'Aavin Home', icon: Home },
  { id: 'shop', label: 'Shop Now', icon: Store },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const B2B_ROLES = ['WHOLESALE_DEALER', 'WSD', 'DEALER', 'DLR', 'RETAILER', 'RTL', 'AGENT', 'FMD', 'INTER_UNION', 'FEDERATION'];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function B2BDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const initialTab = urlParams.get('tab') || 'dashboard';
  
  const [activeSection, setActiveSection] = useState(initialTab);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['orders', 'wallet']);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('500');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const isB2BUser = user?.pricingRole && B2B_ROLES.includes(user.pricingRole.toUpperCase());

  useEffect(() => {
    if (user && !isB2BUser && user.pricingRole === 'MRP') {
      setLocation('/');
    }
  }, [user, isB2BUser, setLocation]);

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders/user', user?.id],
    enabled: !!user?.id,
  });

  const { data: walletData, refetch: refetchWallet } = useQuery<any>({
    queryKey: ['/api/wallet', user?.id],
    enabled: !!user?.id,
  });

  const { data: walletTransactions = [], refetch: refetchTransactions } = useQuery<any[]>({
    queryKey: ['/api/wallet/transactions', user?.id],
    enabled: !!user?.id,
  });

  const { data: creditData } = useQuery<any>({
    queryKey: ['/api/credit/user', user?.id],
    enabled: !!user?.id,
  });

  const { addItem, clearCart: clearCartStore } = useCartStore();

  const reorderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', `/api/orders/${orderId}/reorder`);
      return response.json();
    },
    onSuccess: (data) => {
      clearCartStore();
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
        title: "Items added to cart",
        description: "The items from your previous order have been added to your cart.",
      });
      setLocation('/checkout');
    },
    onError: (error: any) => {
      toast({
        title: "Re-order failed",
        description: error.message || "Could not re-order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReorder = (orderId: string) => {
    reorderMutation.mutate(orderId);
  };

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
      queryClient.invalidateQueries({ queryKey: ['/api/orders/user'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm delivery. Please try again.",
        variant: "destructive"
      });
    }
  });

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleAddFunds = async () => {
    const amount = parseFloat(topUpAmount);
    if (amount < 100) {
      toast({
        title: "Minimum amount ₹100",
        description: "Please enter an amount of at least ₹100.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      const response = await apiRequest('POST', '/api/wallet/add-funds', { amount });
      const orderData = await response.json();

      const options = {
        key: orderData.keyId,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: 'Aavin - TCMPF',
        description: 'Wallet Top Up',
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            await apiRequest('POST', '/api/wallet/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount: orderData.amount,
            });
            
            toast({
              title: "Funds added successfully",
              description: `₹${amount.toLocaleString()} has been added to your wallet.`,
            });
            
            refetchWallet();
            refetchTransactions();
            setAddFundsOpen(false);
          } catch (error) {
            toast({
              title: "Payment verification failed",
              description: "Please contact support if amount was deducted.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: user?.fullName || user?.username || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#4AB3E8',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Payment initiation failed",
        description: error.message || "Could not start payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleSectionClick = (sectionId: string, parentId?: string) => {
    if (sectionId === 'home' || sectionId === 'shop') {
      setLocation('/');
      return;
    }
    setActiveSection(sectionId);
    if (parentId && !expandedMenus.includes(parentId)) {
      setExpandedMenus(prev => [...prev, parentId]);
    }
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  const getPricingRoleDisplay = (role?: string) => {
    const roleMap: Record<string, string> = {
      'WHOLESALE_DEALER': 'Wholesale Dealer (WSD)',
      'WSD': 'Wholesale Dealer (WSD)',
      'DEALER': 'Dealer',
      'DLR': 'Dealer',
      'RETAILER': 'Retailer',
      'RTL': 'Retailer',
      'AGENT': 'Agent',
      'FMD': 'Fresh Milk Dealer (FMD)',
      'INTER_UNION': 'Inter Union',
      'FEDERATION': 'Federation',
      'MRP': 'Consumer (MRP)',
    };
    return roleMap[role || 'MRP'] || role || 'Consumer';
  };

  const getPricingDiscount = (role?: string) => {
    const discountMap: Record<string, string> = {
      'WHOLESALE_DEALER': '35% off MRP',
      'WSD': '35% off MRP',
      'DEALER': '15% off MRP',
      'DLR': '15% off MRP',
      'RETAILER': '10% off MRP',
      'RTL': '10% off MRP',
      'AGENT': '15% off MRP',
      'FMD': '15% off MRP',
      'INTER_UNION': '45% off MRP',
      'FEDERATION': '55% off MRP',
    };
    return discountMap[role || ''] || 'MRP pricing';
  };

  const pendingOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'preparing');
  const deliveredOrders = orders.filter((o: any) => o.status === 'delivered' || o.status === 'customer_acknowledged');
  const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled');

  const totalSpent = orders
    .filter((o: any) => o.status === 'delivered')
    .reduce((sum: number, o: any) => sum + parseFloat(o.total || '0'), 0);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardOverview();
      case 'all-orders':
        return renderOrders('all');
      case 'pending-orders':
        return renderOrders('pending');
      case 'delivered-orders':
        return renderOrders('delivered');
      case 'cancelled-orders':
        return renderOrders('cancelled');
      case 'wallet-balance':
        return renderWalletBalance();
      case 'wallet-transactions':
        return renderWalletTransactions();
      case 'credit-overview':
      case 'credit-fresh-milk':
      case 'credit-products':
        return renderCreditSection();
      case 'business-info':
        return renderBusinessInfo();
      case 'delivery-addresses':
        return renderDeliveryAddresses();
      case 'pricing-tier':
        return renderPricingTier();
      case 'notifications':
        return renderNotifications();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboardOverview();
    }
  };

  const renderDashboardOverview = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.name || 'User'}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {getPricingRoleDisplay(user?.pricingRole)} • {getPricingDiscount(user?.pricingRole)}
          </p>
        </div>
        <Button onClick={() => setLocation('/')} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Shop Now
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-2xl font-bold">₹{(walletData?.balance || 0).toLocaleString()}</p>
              </div>
              <Wallet className="w-8 h-8 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">₹{totalSpent.toLocaleString()}</p>
              </div>
              <IndianRupee className="w-8 h-8 text-blue-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Orders
              <Button variant="ghost" size="sm" onClick={() => setActiveSection('all-orders')}>
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No orders yet</p>
                <Button className="mt-4" onClick={() => setLocation('/')}>
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Order #{order.orderNumber || order.id.slice(-6)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTimestamp(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{parseFloat(order.total || '0').toLocaleString()}</p>
                      <Badge variant={
                        order.status === 'delivered' ? 'default' :
                        order.status === 'cancelled' ? 'destructive' : 'secondary'
                      }>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Wallet Overview
              <Button variant="outline" size="sm" onClick={() => setAddFundsOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Funds
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-green-600">
                ₹{(walletData?.balance || 0).toLocaleString()}
              </p>
              <p className="text-muted-foreground mt-2">Available Balance</p>
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium">Recent Transactions</p>
              {walletTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
              ) : (
                walletTransactions.slice(0, 3).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      {tx.type === 'credit' ? (
                        <ArrowDownRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm">{tx.description}</span>
                    </div>
                    <span className={`font-medium ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {creditData && (
        <Card>
          <CardHeader>
            <CardTitle>Credit Overview</CardTitle>
            <CardDescription>Your credit limits and usage across segments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Fresh Milk Credit</span>
                  <span className="text-sm text-muted-foreground">
                    ₹{creditData.freshMilkCreditUsed || 0} / ₹{creditData.freshMilkCreditLimit || 0}
                  </span>
                </div>
                <Progress 
                  value={creditData.freshMilkCreditLimit ? 
                    (creditData.freshMilkCreditUsed / creditData.freshMilkCreditLimit) * 100 : 0
                  } 
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Products Credit</span>
                  <span className="text-sm text-muted-foreground">
                    ₹{creditData.productsCreditUsed || 0} / ₹{creditData.productsCreditLimit || 0}
                  </span>
                </div>
                <Progress 
                  value={creditData.productsCreditLimit ? 
                    (creditData.productsCreditUsed / creditData.productsCreditLimit) * 100 : 0
                  } 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderOrders = (filter: string) => {
    let filteredOrders = orders;
    if (filter === 'pending') {
      filteredOrders = pendingOrders;
    } else if (filter === 'delivered') {
      filteredOrders = deliveredOrders;
    } else if (filter === 'cancelled') {
      filteredOrders = cancelledOrders;
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">
            {filter === 'all' ? 'All Orders' : 
             filter === 'pending' ? 'Pending Orders' :
             filter === 'delivered' ? 'Delivered Orders' : 'Cancelled Orders'}
          </h1>
          <Button onClick={() => setLocation('/')} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.orderNumber || order.id.slice(-6)}</TableCell>
                      <TableCell>{formatTimestamp(order.createdAt)}</TableCell>
                      <TableCell>{order.items?.length || 0} items</TableCell>
                      <TableCell>₹{parseFloat(order.total || '0').toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'delivered' ? 'default' :
                          order.status === 'customer_acknowledged' ? 'default' :
                          order.status === 'cancelled' ? 'destructive' : 'secondary'
                        } className={order.status === 'customer_acknowledged' ? 'bg-green-700' : ''}>
                          {order.status === 'customer_acknowledged' ? 'Confirmed' : order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" title="View Order">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {order.status === 'delivered' && (
                            <Button 
                              variant="default" 
                              size="sm" 
                              title="Confirm Delivery"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => acknowledgeMutation.mutate(order.id)}
                              disabled={acknowledgeMutation.isPending}
                            >
                              <CheckCircle className={`w-4 h-4 mr-1 ${acknowledgeMutation.isPending ? 'animate-spin' : ''}`} />
                              Confirm
                            </Button>
                          )}
                          {(order.status === 'delivered' || order.status === 'customer_acknowledged') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Re-order"
                              onClick={() => handleReorder(order.id)}
                              disabled={reorderMutation.isPending}
                            >
                              <RefreshCw className={`w-4 h-4 ${reorderMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderWalletBalance = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wallet Balance</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <p className="text-4xl font-bold text-green-600">
                ₹{(walletData?.balance || 0).toLocaleString()}
              </p>
              <p className="text-muted-foreground mt-2">Current Balance</p>
              <Button className="mt-6" onClick={() => setAddFundsOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Funds
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Top Up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['500', '1000', '2000', '5000', '10000', '20000'].map((amount) => (
                <Button 
                  key={amount} 
                  variant={topUpAmount === amount ? 'default' : 'outline'}
                  onClick={() => setTopUpAmount(amount)}
                >
                  ₹{parseInt(amount).toLocaleString()}
                </Button>
              ))}
            </div>
            <div className="mt-4">
              <Label>Custom Amount</Label>
              <Input 
                type="number" 
                value={topUpAmount} 
                onChange={(e) => setTopUpAmount(e.target.value)}
                min="100"
                className="mt-2"
              />
            </div>
            <Button className="w-full mt-4" onClick={() => setAddFundsOpen(true)}>
              Add ₹{parseInt(topUpAmount || '0').toLocaleString()} to Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderWalletTransactions = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>

      <Card>
        <CardContent className="p-0">
          {walletTransactions.length === 0 ? (
            <div className="py-12 text-center">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {walletTransactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>{formatTimestamp(tx.createdAt)}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'credit' ? 'default' : 'secondary'}>
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderCreditSection = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Credit Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Fresh Milk Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Credit Limit</span>
                <span className="font-bold">₹{(creditData?.freshMilkCreditLimit || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Used</span>
                <span className="text-red-600">₹{(creditData?.freshMilkCreditUsed || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Available</span>
                <span className="text-green-600 font-bold">
                  ₹{((creditData?.freshMilkCreditLimit || 0) - (creditData?.freshMilkCreditUsed || 0)).toLocaleString()}
                </span>
              </div>
              <Progress 
                value={creditData?.freshMilkCreditLimit ? 
                  (creditData.freshMilkCreditUsed / creditData.freshMilkCreditLimit) * 100 : 0
                } 
                className="h-3"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Products Credit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Credit Limit</span>
                <span className="font-bold">₹{(creditData?.productsCreditLimit || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Used</span>
                <span className="text-red-600">₹{(creditData?.productsCreditUsed || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Available</span>
                <span className="text-green-600 font-bold">
                  ₹{((creditData?.productsCreditLimit || 0) - (creditData?.productsCreditUsed || 0)).toLocaleString()}
                </span>
              </div>
              <Progress 
                value={creditData?.productsCreditLimit ? 
                  (creditData.productsCreditUsed / creditData.productsCreditLimit) * 100 : 0
                } 
                className="h-3"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credit Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              Credit is available for B2B orders only
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              Separate credit limits for Fresh Milk and Products segments
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              Payment due within 7 days of delivery
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
              Credit limit may be adjusted based on payment history
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  const renderBusinessInfo = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Business Information</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="text-2xl">
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Business Name</Label>
                  <p className="font-medium">{user?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Business Type</Label>
                  <p className="font-medium">{getPricingRoleDisplay(user?.pricingRole)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user?.email || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {user?.phone || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">District Union</Label>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {user?.unionId || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Member Since</Label>
                  <p className="font-medium">
                    {formatTimestamp((user as any)?.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDeliveryAddresses = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Delivery Addresses</h1>
        <Button className="w-full sm:w-auto min-h-[44px] sm:min-h-0" onClick={() => setLocation('/profile')}>
          <Plus className="w-4 h-4 mr-2" />
          Manage Addresses
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Manage your delivery addresses from your profile page</p>
            <Button className="mt-4" variant="outline" onClick={() => setLocation('/profile')}>
              <Plus className="w-4 h-4 mr-2" />
              Go to Profile to Add Address
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPricingTier = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pricing Tier</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <Badge className="text-lg px-4 py-2">
              {getPricingRoleDisplay(user?.pricingRole)}
            </Badge>
            <p className="text-muted-foreground mt-2">{getPricingDiscount(user?.pricingRole)}</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">All Pricing Tiers</h3>
            <div className="grid gap-3">
              {[
                { role: 'Federation', discount: '55% off MRP', tier: 'FEDERATION' },
                { role: 'Inter Union', discount: '45% off MRP', tier: 'INTER_UNION' },
                { role: 'Wholesale Dealer (WSD)', discount: '35% off MRP', tier: 'WHOLESALE_DEALER' },
                { role: 'Dealer', discount: '15% off MRP', tier: 'DEALER' },
                { role: 'Retailer', discount: '10% off MRP', tier: 'RETAILER' },
                { role: 'Consumer (MRP)', discount: 'Full price', tier: 'MRP' },
              ].map((tier) => (
                <div 
                  key={tier.tier}
                  className={`p-3 rounded-lg border ${
                    user?.pricingRole === tier.tier ? 'bg-primary/10 border-primary' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{tier.role}</span>
                    <span className="text-muted-foreground">{tier.discount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <Card>
        <CardContent className="py-12 text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No notifications</p>
        </CardContent>
      </Card>
    </div>
  );

  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);

  const renderSettings = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive order updates via email</p>
              </div>
              <Button
                variant={emailNotif ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setEmailNotif(!emailNotif);
                  toast({ title: emailNotif ? "Email notifications disabled" : "Email notifications enabled" });
                }}
              >
                {emailNotif ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">Receive order updates via SMS</p>
              </div>
              <Button
                variant={smsNotif ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSmsNotif(!smsNotif);
                  toast({ title: smsNotif ? "SMS notifications disabled" : "SMS notifications enabled" });
                }}
              >
                {smsNotif ? "Enabled" : "Disabled"}
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Change Password</p>
                <p className="text-sm text-muted-foreground">Update your account password</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLocation('/profile')}>
                Change
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <img src={customerLogo} alt="Aavin" className="h-10 w-10 rounded-lg" />
                <span className="font-bold text-lg text-primary">Aavin Cart</span>
              </div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-muted rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sidebarItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => item.subItems ? toggleMenu(item.id) : handleSectionClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors ${
                  activeSection === item.id || 
                  item.subItems?.some(sub => sub.id === activeSection)
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {item.subItems && (
                  expandedMenus.includes(item.id) 
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />
                )}
              </button>
              {item.subItems && expandedMenus.includes(item.id) && (
                <div className="bg-muted/30">
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => handleSectionClick(subItem.id, item.id)}
                      className={`w-full flex items-center justify-between px-4 py-2 pl-12 text-sm hover:bg-muted transition-colors ${
                        activeSection === subItem.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <span>{subItem.label}</span>
                      {subItem.count !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {subItem.count}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <Avatar>
              <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {getPricingRoleDisplay(user?.pricingRole)}
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto min-w-0">
        <div className="lg:hidden flex items-center gap-3 p-3 border-b bg-card sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-muted rounded-lg">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm truncate flex-1">{sidebarItems.find(i => i.id === activeSection || i.subItems?.some(s => s.id === activeSection))?.label || 'Dashboard'}</span>
          <Link href="/">
            <button className="p-2 hover:bg-muted rounded-lg text-[#4AB3E8]" title="Go to Aavin Home">
              <Home className="h-5 w-5" />
            </button>
          </Link>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
          {renderContent()}
        </div>
      </div>

      {/* Add Funds Dialog */}
      <Dialog open={addFundsOpen} onOpenChange={setAddFundsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds to Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                value={topUpAmount} 
                onChange={(e) => setTopUpAmount(e.target.value)}
                min="100"
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">Minimum ₹100</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {['500', '1000', '2000'].map((amount) => (
                <Button 
                  key={amount} 
                  variant="outline" 
                  size="sm"
                  onClick={() => setTopUpAmount(amount)}
                >
                  ₹{amount}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFundsOpen(false)} disabled={isProcessingPayment}>
              Cancel
            </Button>
            <Button onClick={handleAddFunds} disabled={isProcessingPayment}>
              {isProcessingPayment ? 'Processing...' : `Pay ₹${topUpAmount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
