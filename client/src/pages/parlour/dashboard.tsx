import { useState, useEffect } from 'react';
import { formatTimestamp } from '@/lib/format-timestamp';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Store,
  ShoppingCart,
  History,
  BarChart3,
  LogOut,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  Search,
  Package,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Receipt
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  mrp: number;
  wholesalePrice: number;
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  costTotal: number;
  profit: number;
  paymentMethod: string;
  customerType: string;
  createdAt: Date;
  status: 'completed' | 'cancelled' | 'refunded';
}

const products: Product[] = [
  { id: '1', name: 'Aavin Full Cream Milk 500ml', category: 'Milk', mrp: 28, wholesalePrice: 24 },
  { id: '2', name: 'Aavin Toned Milk 500ml', category: 'Milk', mrp: 24, wholesalePrice: 20 },
  { id: '3', name: 'Aavin Curd 400g', category: 'Curd', mrp: 35, wholesalePrice: 30 },
  { id: '4', name: 'Aavin Butter 100g', category: 'Butter', mrp: 55, wholesalePrice: 47 },
  { id: '5', name: 'Aavin Ghee 200ml', category: 'Ghee', mrp: 160, wholesalePrice: 136 },
  { id: '6', name: 'Aavin Paneer 200g', category: 'Paneer', mrp: 90, wholesalePrice: 77 },
  { id: '7', name: 'Aavin Buttermilk 200ml', category: 'Buttermilk', mrp: 15, wholesalePrice: 13 },
  { id: '8', name: 'Aavin Ice Cream Cup', category: 'Ice Cream', mrp: 40, wholesalePrice: 34 },
  { id: '9', name: 'Aavin Khova 250g', category: 'Sweets', mrp: 120, wholesalePrice: 102 },
  { id: '10', name: 'Aavin Lassi 200ml', category: 'Beverages', mrp: 25, wholesalePrice: 21 },
  { id: '11', name: 'Aavin Flavored Milk 200ml', category: 'Beverages', mrp: 30, wholesalePrice: 26 },
  { id: '12', name: 'Aavin Cheese 100g', category: 'Cheese', mrp: 75, wholesalePrice: 64 },
];

const categories = ['All', 'Milk', 'Curd', 'Butter', 'Ghee', 'Paneer', 'Buttermilk', 'Ice Cream', 'Sweets', 'Beverages', 'Cheese'];

export default function ParlourDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pos');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerType, setCustomerType] = useState('MRP/Consumer');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  
  const parlourName = localStorage.getItem('parlourName') || 'Aavin Parlour';
  const parlourCode = localStorage.getItem('parlourCode') || '';
  const parlourUnion = localStorage.getItem('parlourUnion') || '';
  const parlourManager = localStorage.getItem('parlourManager') || '';
  const parlourType = localStorage.getItem('parlourType') || 'own';
  
  // Fetch merchant settings to check retailerPriceEnabled
  // Parlour uses localStorage-stored union info, so we query by union name
  const { data: merchantSettings } = useQuery<{ retailerPriceEnabled?: boolean }>({
    queryKey: [`/api/merchants/by-union/${encodeURIComponent(parlourUnion)}`],
    enabled: !!parlourUnion,
  });
  const retailerPriceEnabled = merchantSettings?.retailerPriceEnabled === true;

  useEffect(() => {
    const savedOrders = localStorage.getItem(`parlourOrders_${parlourCode}`);
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders));
    }
  }, [parlourCode]);

  const saveOrders = (newOrders: Order[]) => {
    localStorage.setItem(`parlourOrders_${parlourCode}`, JSON.stringify(newOrders));
    setOrders(newOrders);
  };

  const handleLogout = () => {
    localStorage.removeItem('parlourId');
    localStorage.removeItem('parlourCode');
    localStorage.removeItem('parlourName');
    localStorage.removeItem('parlourUnion');
    localStorage.removeItem('parlourManager');
    localStorage.removeItem('parlourType');
    setLocation('/parlour/login');
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.mrp * item.quantity), 0);
  const costTotal = cart.reduce((sum, item) => sum + (item.wholesalePrice * item.quantity), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const profit = subtotal - costTotal;

  const handlePayment = () => {
    if (cart.length === 0) {
      toast({
        title: 'Error',
        description: 'Cart is empty',
        variant: 'destructive'
      });
      return;
    }
    setIsPaymentDialogOpen(true);
    setReceivedAmount(total.toFixed(2));
  };

  const processPayment = () => {
    const newOrder: Order = {
      id: `POS-${Date.now()}`,
      items: [...cart],
      total,
      costTotal,
      profit,
      paymentMethod,
      customerType,
      createdAt: new Date(),
      status: 'completed'
    };

    const newOrders = [newOrder, ...orders];
    saveOrders(newOrders);
    setCart([]);
    setIsPaymentDialogOpen(false);
    
    toast({
      title: 'Payment Successful',
      description: `Order ${newOrder.id} completed - ₹${total.toFixed(2)}`
    });
  };

  const todayOrders = orders.filter(o => {
    const today = new Date();
    const orderDate = new Date(o.createdAt);
    return orderDate.toDateString() === today.toDateString();
  });

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const completedOrders = todayOrders.filter(o => o.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-purple-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="h-8 w-8" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold">{parlourName}</h1>
              <Badge className={parlourType === 'own' ? 'bg-green-500' : 'bg-blue-500'}>
                {parlourType === 'own' ? 'Own Parlour' : 'Private Parlour'}
              </Badge>
            </div>
            <p className="text-purple-200 text-sm">{parlourCode} • {parlourUnion}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-purple-200">Manager: {parlourManager}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-purple-600">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-60px)]">
          <nav className="p-4 space-y-2">
            <Button
              variant={activeTab === 'pos' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('pos')}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              POS Terminal
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('history')}
            >
              <History className="h-4 w-4 mr-2" />
              Order History
            </Button>
            <Button
              variant={activeTab === 'reports' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('reports')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Sales Reports
            </Button>
          </nav>

          <div className="p-4 border-t space-y-3">
            <Card className="bg-purple-50">
              <CardContent className="pt-4">
                <p className="text-sm text-purple-600">Today's Sales</p>
                <p className="text-2xl font-bold text-purple-800">₹{todayRevenue.toFixed(2)}</p>
                <p className="text-xs text-purple-500">{completedOrders} orders</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-4">
                <p className="text-sm text-green-600">Today's Profit</p>
                <p className="text-xl font-bold text-green-800">₹{todayOrders.reduce((sum, o) => sum + (o.profit || 0), 0).toFixed(2)}</p>
                <p className="text-xs text-green-500">MRP - Wholesale</p>
              </CardContent>
            </Card>
          </div>
        </aside>

        <main className="flex-1 p-4">
          {activeTab === 'pos' && (
            <div className="flex gap-4">
              <div className="flex-1">
                <Card className="mb-4">
                  <CardContent className="pt-4">
                    <div className="flex gap-4 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <Button
                          key={cat}
                          variant={selectedCategory === cat ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {filteredProducts.map(product => (
                    <Card 
                      key={product.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <Package className="h-8 w-8 text-purple-600" />
                        </div>
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-purple-600 font-bold">₹{product.mrp}</p>
                        <p className="text-xs text-green-600">Profit: ₹{product.mrp - product.wholesalePrice}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="w-96">
                <Card className="sticky top-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Current Order
                      </span>
                      <Badge>{cart.length} items</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Label className="text-sm">Customer Type</Label>
                      <Select value={customerType} onValueChange={setCustomerType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MRP/Consumer">MRP/Consumer</SelectItem>
                          {retailerPriceEnabled && (
                            <SelectItem value="Retailer">Retailer</SelectItem>
                          )}
                          <SelectItem value="Dealer">Dealer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                      {cart.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Cart is empty</p>
                          <p className="text-sm">Click products to add</p>
                        </div>
                      ) : (
                        cart.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              <p className="text-sm text-gray-500">₹{item.mrp} x {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center">{item.quantity}</span>
                              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal (MRP)</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Cost (Wholesale)</span>
                        <span>₹{costTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (5%)</span>
                        <span>₹{tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-purple-600">₹{total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600 font-medium border-t pt-2">
                        <span>Profit Margin</span>
                        <span>₹{profit.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" className="flex-1" onClick={clearCart}>
                        Clear
                      </Button>
                      <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handlePayment} disabled={cart.length === 0}>
                        Pay ₹{total.toFixed(2)}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  Order History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Customer Type</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No orders yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id}</TableCell>
                          <TableCell>{formatTimestamp(order.createdAt)}</TableCell>
                          <TableCell>{order.items.length} items</TableCell>
                          <TableCell>{order.customerType}</TableCell>
                          <TableCell className="capitalize">{order.paymentMethod}</TableCell>
                          <TableCell className="font-medium">₹{order.total.toFixed(2)}</TableCell>
                          <TableCell className="text-green-600 font-medium">₹{(order.profit || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={
                              order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {order.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Today's Orders</p>
                        <p className="text-2xl font-bold text-blue-800">{todayOrders.length}</p>
                      </div>
                      <Receipt className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600">Today's Revenue</p>
                        <p className="text-2xl font-bold text-purple-800">₹{todayRevenue.toFixed(0)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Today's Profit</p>
                        <p className="text-2xl font-bold text-green-800">₹{todayOrders.reduce((sum, o) => sum + (o.profit || 0), 0).toFixed(0)}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-600">Avg Order Value</p>
                        <p className="text-2xl font-bold text-amber-800">
                          ₹{todayOrders.length > 0 ? (todayRevenue / todayOrders.length).toFixed(0) : 0}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-amber-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600">Total Orders</p>
                        <p className="text-2xl font-bold text-orange-800">{orders.length}</p>
                      </div>
                      <Package className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Sales Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Avg Value</TableHead>
                        <TableHead>Top Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>{new Date().toLocaleDateString()}</TableCell>
                        <TableCell>{todayOrders.length}</TableCell>
                        <TableCell>₹{todayRevenue.toFixed(2)}</TableCell>
                        <TableCell>₹{todayOrders.length > 0 ? (todayRevenue / todayOrders.length).toFixed(2) : '0.00'}</TableCell>
                        <TableCell>Milk</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-3xl font-bold text-purple-600">₹{total.toFixed(2)}</p>
            </div>

            <div>
              <Label>Payment Method</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className="flex flex-col h-auto py-4"
                >
                  <Banknote className="h-6 w-6 mb-1" />
                  <span>Cash</span>
                </Button>
                <Button
                  variant={paymentMethod === 'upi' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('upi')}
                  className="flex flex-col h-auto py-4"
                >
                  <Smartphone className="h-6 w-6 mb-1" />
                  <span>UPI</span>
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('card')}
                  className="flex flex-col h-auto py-4"
                >
                  <CreditCard className="h-6 w-6 mb-1" />
                  <span>Card</span>
                </Button>
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <Label>Received Amount</Label>
                <Input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="text-xl font-bold"
                />
                {parseFloat(receivedAmount) >= total && (
                  <p className="text-green-600 mt-2">
                    Change: ₹{(parseFloat(receivedAmount) - total).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={processPayment} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
