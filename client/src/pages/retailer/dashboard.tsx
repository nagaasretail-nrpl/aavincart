import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatTimestamp } from '@/lib/format-timestamp';
import { 
  Package, LogOut, User, MapPin, Phone, Mail, Building2, 
  Search, ShoppingCart, Plus, Minus, Truck, FileText, Milk,
  TrendingUp, DollarSign, Receipt, Users, Calendar, BarChart3, Store, Warehouse,
  Wallet, CreditCard, ArrowDownCircle, ArrowUpCircle, RefreshCw, History, Home
} from "lucide-react";

export default function RetailerDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [cart, setCart] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (user.pricingRole !== 'RETAILER' && user.pricingRole !== 'RTL') {
      toast({
        title: "Access Denied",
        description: "This dashboard is for Retailers only",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  const { data: productsData, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
    enabled: !!user
  });

  const { data: ordersData } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    enabled: !!user
  });

  const { data: consumerOrdersData } = useQuery<any[]>({
    queryKey: ["/api/consumer-orders"],
    enabled: !!user
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
      // Initialize Razorpay
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

  const wallet = walletData || { balance: "0.00" };
  const walletTransactions = walletTransactionsData || [];

  const products = productsData || [];
  const orders = ordersData || [];
  const consumerOrders = consumerOrdersData || [];
  const inventory = inventoryData || [];

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const getRetailerBasePrice = (product: any) => {
    const mrp = parseFloat(product.mrp || product.price);
    const dealerPrice = parseFloat(product.retailPrice || (mrp * 0.85).toString());
    const difference = mrp - dealerPrice;
    return mrp - (difference * 0.60);
  };

  const getBillingPrice = (product: any) => {
    const base = getRetailerBasePrice(product);
    const gst = parseFloat(product.gstPercent || '0');
    return (base + (base * gst / 100)).toFixed(2);
  };

  const cartTotal = Object.entries(cart).reduce((total, [productId, qty]) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      return total + (parseFloat(getBillingPrice(product)) * qty);
    }
    return total;
  }, 0);

  const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });

  const todayConsumerOrders = consumerOrders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });

  const totalRevenue = consumerOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
  const todayRevenue = todayConsumerOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
  const purchaseCost = orders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
  const profit = totalRevenue - purchaseCost;
  const commissionEarned = profit * 0.60;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Store className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold truncate">Retailer Portal</h1>
                <p className="text-xs sm:text-sm text-purple-100 truncate">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-4">
              <Link href="/">
                <button className="p-2 hover:bg-white/20 rounded-lg text-white" title="Go to Aavin Home">
                  <Home className="h-5 w-5" />
                </button>
              </Link>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 px-2 sm:px-3">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                <span className="hidden sm:inline">Cart</span>
                {cartItemsCount > 0 && (
                  <Badge className="ml-1 sm:ml-2 bg-yellow-500 text-xs">{cartItemsCount}</Badge>
                )}
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 px-2 sm:px-3" onClick={handleLogout}>
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide mb-4 sm:mb-6 h-auto flex-wrap sm:flex-nowrap gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pos">POS</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="purchase">Purchase from Dealer</TabsTrigger>
            <TabsTrigger value="consumers">Consumer Orders</TabsTrigger>
            <TabsTrigger value="commission">Commission</TabsTrigger>
            <TabsTrigger value="gst">GST & E-way</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-[10px] sm:text-sm">Today's Orders</p>
                      <p className="text-xl sm:text-3xl font-bold">{todayConsumerOrders.length}</p>
                    </div>
                    <Users className="h-6 w-6 sm:h-10 sm:w-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-[10px] sm:text-sm">Today's Sales</p>
                      <p className="text-xl sm:text-3xl font-bold">₹{todayRevenue.toFixed(0)}</p>
                    </div>
                    <DollarSign className="h-6 w-6 sm:h-10 sm:w-10 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-[10px] sm:text-sm">Commission</p>
                      <p className="text-xl sm:text-3xl font-bold">₹{commissionEarned.toFixed(0)}</p>
                    </div>
                    <TrendingUp className="h-6 w-6 sm:h-10 sm:w-10 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-[10px] sm:text-sm">Purchases</p>
                      <p className="text-xl sm:text-3xl font-bold">{orders.length}</p>
                    </div>
                    <Package className="h-6 w-6 sm:h-10 sm:w-10 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recent Consumer Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {consumerOrders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No consumer orders yet</p>
                  ) : (
                    <div className="space-y-4">
                      {consumerOrders.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Order #{order.orderNumber || order.id?.slice(-6)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatTimestamp(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">₹{order.total}</p>
                            <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
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
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    My Purchase Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No purchase orders yet</p>
                  ) : (
                    <div className="space-y-4">
                      {orders.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Order #{order.orderNumber || order.id?.slice(-6)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatTimestamp(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">₹{order.total}</p>
                            <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* POS Tab - Retailers can only sell to MRP/Consumer */}
          <TabsContent value="pos">
            <RetailerPOSSection products={products} toast={toast} />
          </TabsContent>

          <TabsContent value="wallet">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5" />
                  My Stock Inventory
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => refetchInventory()}>
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
                            <td className="text-right py-3 px-4">
                              <Badge variant={item.quantity > 10 ? "default" : item.quantity > 0 ? "secondary" : "destructive"}>
                                {item.quantity} {item.unitType || 'units'}
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                              {item.lastPurchaseDate 
                                ? formatTimestamp(item.lastPurchaseDate)
                                : '-'}
                            </td>
                            <td className="text-right py-3 px-4">
                              {item.lastPurchaseQty || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Inventory Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Total Products</p>
                    <p className="text-2xl font-bold text-blue-700">{inventory.length}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">In Stock</p>
                    <p className="text-2xl font-bold text-green-700">
                      {inventory.filter((i: any) => i.quantity > 0).length}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-700">
                      {inventory.filter((i: any) => i.quantity === 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchase">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products to order from your dealer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                {productsLoading ? (
                  <p className="text-center py-8">Loading products...</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No products found</p>
                ) : (
                  filteredProducts.map((product: any) => (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">{product.category}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-lg font-bold text-purple-600">
                                ₹{getBillingPrice(product)}
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                ₹{product.mrp || product.price}
                              </span>
                              <Badge className="bg-purple-600">RETAILER</Badge>
                            </div>
                            {product.packagingType && product.unitsPerPackage && (
                              <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700 mt-1">
                                1 Case ({product.packagingType}) = {product.unitsPerPackage} {product.unitType || 'units'}
                              </Badge>
                            )}
                            {product.packagingType && product.unitsPerPackage && (
                              <p className="text-xs text-gray-500 mt-1">
                                Per Case: ₹{(parseFloat(getBillingPrice(product)) * product.unitsPerPackage).toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {cart[product.id] ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => removeFromCart(product.id)}>
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <div className="text-center">
                                  <span className="w-8 text-center">{cart[product.id]}</span>
                                  <p className="text-xs text-gray-500">{product.unitsPerPackage ? `${Math.round(cart[product.id] / product.unitsPerPackage)} case${Math.round(cart[product.id] / product.unitsPerPackage) !== 1 ? 's' : ''}` : 'units'}</p>
                                </div>
                                <Button size="sm" onClick={() => addToCart(product.id)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" onClick={() => addToCart(product.id)}>
                                <Plus className="h-4 w-4 mr-1" /> {product.unitsPerPackage ? 'Add 1 Case' : 'Add'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div>
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Purchase Cart ({cartItemsCount} {cartItemsCount === 1 ? 'box' : 'boxes'})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cartItemsCount === 0 ? (
                      <p className="text-muted-foreground text-center py-4">Cart is empty</p>
                    ) : (
                      <>
                        <div className="space-y-3 mb-4">
                          {Object.entries(cart).map(([productId, qty]) => {
                            const product = products.find(p => p.id === productId);
                            if (!product) return null;
                            const basePrice = getRetailerBasePrice(product);
                            const gstPct = parseFloat(product.gstPercent || '0');
                            const gstAmt = basePrice * gstPct / 100;
                            const billingPerUnit = basePrice + gstAmt;
                            return (
                              <div key={productId} className="border-b pb-2">
                                <div className="flex justify-between text-sm font-medium">
                                  <span>{product.name} x{qty} {product.unitsPerPackage ? `(${Math.round(qty / product.unitsPerPackage)} case${Math.round(qty / product.unitsPerPackage) !== 1 ? 's' : ''})` : ''}</span>
                                  <span>₹{(billingPerUnit * qty).toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Base: ₹{(basePrice * qty).toFixed(2)} + GST({gstPct}%): ₹{(gstAmt * qty).toFixed(2)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t pt-4 space-y-1">
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span>₹{Object.entries(cart).reduce((sum, [id, qty]) => { const p = products.find(x => x.id === id); return sum + (p ? getRetailerBasePrice(p) * qty : 0); }, 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>GST</span>
                            <span>₹{Object.entries(cart).reduce((sum, [id, qty]) => { const p = products.find(x => x.id === id); if (!p) return sum; const base = getRetailerBasePrice(p); return sum + (base * parseFloat(p.gstPercent || '0') / 100) * qty; }, 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg mb-4 pt-1 border-t">
                            <span>Total (incl. GST)</span>
                            <span>₹{cartTotal.toFixed(2)}</span>
                          </div>
                          <Button className="w-full bg-purple-600 hover:bg-purple-700">
                            Place Purchase Order
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="consumers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Consumer Orders (Orders from nearby consumers)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {consumerOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">No consumer orders yet</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Orders from consumers in your area will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consumerOrders.map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">Order #{order.orderNumber || order.id?.slice(-6)}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {order.address || 'No address'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">₹{order.total}</p>
                            <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                          <Button variant="outline" size="sm">
                            <Truck className="h-4 w-4 mr-1" /> Deliver
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commission">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Commission Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between p-4 bg-purple-50 rounded-lg">
                      <span>This Month</span>
                      <span className="font-bold text-purple-600">₹{commissionEarned.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-4 bg-blue-50 rounded-lg">
                      <span>Last Month</span>
                      <span className="font-bold text-blue-600">₹0.00</span>
                    </div>
                    <div className="flex justify-between p-4 bg-green-50 rounded-lg">
                      <span>Total Earnings</span>
                      <span className="font-bold text-green-600">₹{commissionEarned.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Margin Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-5xl font-bold text-purple-600">60%</p>
                    <p className="text-muted-foreground mt-2">of MRP-Dealer difference</p>
                    <p className="text-sm text-gray-500 mt-4">
                      You keep 60% of the margin between MRP and Dealer price
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="gst">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    GST Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                      <span>Total GST Collected</span>
                      <span className="font-bold">₹{(totalRevenue * 0.05).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                      <span>Input GST Credit</span>
                      <span className="font-bold text-green-600">₹{(purchaseCost * 0.05).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-4 bg-red-50 rounded-lg">
                      <span>GST Payable</span>
                      <span className="font-bold text-red-600">
                        ₹{Math.max(0, (totalRevenue - purchaseCost) * 0.05).toFixed(2)}
                      </span>
                    </div>
                    <Button className="w-full" variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate GSTR-1
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    E-way Bills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                      <span>Bills Generated</span>
                      <span className="font-bold">0</span>
                    </div>
                    <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                      <span>Pending Bills</span>
                      <span className="font-bold text-orange-600">0</span>
                    </div>
                    <Button className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate E-way Bill
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  No pending deliveries. All consumer orders have been fulfilled.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Retailer POS Section - Retailers can ONLY sell to MRP/Consumer
function RetailerPOSSection({ products, toast }: { products: any[]; toast: any }) {
  const [posCart, setPosCart] = useState<Record<string, { qty: number; price: number; name: string }>>({});
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<'Fresh Milk' | 'Products'>('Products');

  const getMRPPrice = (item: any) => {
    const base = parseFloat(item.mrp || item.price || '0');
    const gst = parseFloat(item.gstPercent || '0');
    return base + (base * gst / 100);
  };

  const filteredProducts = products.filter(p => 
    (p.productSegment === activeSegment) &&
    (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addToCart = (product: any) => {
    const price = getMRPPrice(product);
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
      description: `₹${total.toFixed(2)} collected via ${paymentMethod.toUpperCase()}` 
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
                Sell to Consumers (MRP)
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
                        ₹{getMRPPrice(product).toFixed(2)}
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
                Consumer Sale
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
            <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
              Pricing: <span className="font-medium text-primary">MRP (Consumer Price)</span>
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
                      <p className="text-xs text-muted-foreground">₹{item.price.toFixed(2)} x {item.qty}</p>
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
                  <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Tax (5%):</span><span>₹{tax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-1 border-t">
                    <span>Total:</span><span className="text-primary">₹{total.toFixed(2)}</span>
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
