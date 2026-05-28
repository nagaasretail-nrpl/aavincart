import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminLayout from "./layout";
import { 
  Users, Store, Package, TrendingUp, MapPin, BarChart3, 
  Calendar, Filter, Download, Eye, Edit, Milk, ShoppingBag,
  Truck, Building2, UserCheck, Clock
} from "lucide-react";

interface UserCounts {
  wsd: number;
  dealer: number;
  retailer: number;
  consumer: number;
  total: number;
}

interface OrderStats {
  freshMilk: { count: number; total: number };
  products: { count: number; total: number };
}

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateFilter, setDateFilter] = useState("today");
  const [routeFilter, setRouteFilter] = useState("all");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

  const { data: usersData } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: ordersData } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  const { data: restaurantsData } = useQuery<any[]>({
    queryKey: ["/api/restaurants"],
  });

  const users = usersData || [];
  const orders = ordersData || [];
  const restaurants = restaurantsData || [];

  const userCounts: UserCounts = {
    wsd: users.filter(u => u.pricingRole === 'WHOLESALE_DEALER' || u.pricingRole === 'WSD').length,
    dealer: users.filter(u => u.pricingRole === 'DEALER' || u.pricingRole === 'DLR').length,
    retailer: users.filter(u => u.pricingRole === 'RETAILER' || u.pricingRole === 'RTL').length,
    consumer: users.filter(u => u.pricingRole === 'MRP' || !u.pricingRole).length,
    total: users.length,
  };

  const getFilteredOrders = () => {
    let filtered = [...orders];
    
    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter(o => new Date(o.createdAt).toDateString() === now.toDateString());
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      filtered = filtered.filter(o => new Date(o.createdAt).toDateString() === yesterday.toDateString());
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(o => new Date(o.createdAt) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(o => new Date(o.createdAt) >= monthAgo);
    }
    
    if (segmentFilter !== 'all') {
      const segmentMap: Record<string, string> = { 'fresh-milk': 'Fresh Milk', 'products': 'Products', 'ice-cream': 'Ice Cream' };
      const segmentValue = segmentMap[segmentFilter] || segmentFilter;
      filtered = filtered.filter(o => o.productSegment === segmentValue);
    }
    
    if (officeFilter !== 'all') {
      filtered = filtered.filter(o => o.mmoOffice === officeFilter);
    }
    
    if (routeFilter !== 'all') {
      filtered = filtered.filter(o => o.deliveryRoute === routeFilter);
    }
    
    return filtered;
  };

  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });
  
  const filteredOrders = getFilteredOrders();

  const iceCreamStats = {
    count: todayOrders.filter(o => o.productSegment === 'Ice Cream').length,
    total: todayOrders.filter(o => o.productSegment === 'Ice Cream')
      .reduce((sum, o) => sum + parseFloat(o.total || '0'), 0)
  };

  const orderStats: OrderStats = {
    freshMilk: {
      count: todayOrders.filter(o => o.productSegment === 'Fresh Milk').length,
      total: todayOrders.filter(o => o.productSegment === 'Fresh Milk')
        .reduce((sum, o) => sum + parseFloat(o.total || '0'), 0)
    },
    products: {
      count: todayOrders.filter(o => o.productSegment === 'Products' || !o.productSegment).length,
      total: todayOrders.filter(o => o.productSegment === 'Products' || !o.productSegment)
        .reduce((sum, o) => sum + parseFloat(o.total || '0'), 0)
    }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
  const filteredRevenue = filteredOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);

  const mmoOffices = [
    { id: 'city', name: 'City MMO Office', location: 'Salem City' },
    { id: 'mettur', name: 'Mettur MMO Office', location: 'Mettur' },
    { id: 'edappadi', name: 'Edappadi MMO Office', location: 'Edappadi' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Manager Dashboard</h1>
            <p className="text-muted-foreground">Monitor business operations and performance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="map">Locations Map</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Wholesale Dealers</p>
                      <p className="text-3xl font-bold">{userCounts.wsd}</p>
                    </div>
                    <Truck className="h-10 w-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Dealers</p>
                      <p className="text-3xl font-bold">{userCounts.dealer}</p>
                    </div>
                    <Building2 className="h-10 w-10 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Retailers</p>
                      <p className="text-3xl font-bold">{userCounts.retailer}</p>
                    </div>
                    <Store className="h-10 w-10 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Consumers</p>
                      <p className="text-3xl font-bold">{userCounts.consumer}</p>
                    </div>
                    <Users className="h-10 w-10 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Milk className="h-5 w-5 text-blue-500" />
                    Today's Fresh Milk Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Orders</span>
                      <span className="text-2xl font-bold">{orderStats.freshMilk.count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₹{orderStats.freshMilk.total.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-500" />
                    Today's Products Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Orders</span>
                      <span className="text-2xl font-bold">{orderStats.products.count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₹{orderStats.products.total.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-500" />
                    Today's Ice Cream Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Orders</span>
                      <span className="text-2xl font-bold">{iceCreamStats.count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₹{iceCreamStats.total.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  MMO Offices Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mmoOffices.map(office => (
                    <div key={office.id} className="p-4 border rounded-lg">
                      <h3 className="font-semibold">{office.name}</h3>
                      <p className="text-sm text-muted-foreground">{office.location}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Orders Today</span>
                          <span className="font-medium">0</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Revenue</span>
                          <span className="font-medium">₹0</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">User Management</h2>
              <div className="flex gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="wsd">WSD</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="retailer">Retailer</SelectItem>
                    <SelectItem value="consumer">Consumer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{userCounts.total}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Today</p>
                      <p className="text-2xl font-bold">{Math.floor(userCounts.total * 0.3)}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">New This Month</p>
                      <p className="text-2xl font-bold">{Math.floor(userCounts.total * 0.1)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Approval</p>
                      <p className="text-2xl font-bold">0</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Name</th>
                        <th className="text-left p-4 font-medium">Role</th>
                        <th className="text-left p-4 font-medium">Location</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.slice(0, 10).map((user: any) => (
                        <tr key={user.id} className="border-t">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary">{user.pricingRole || 'Consumer'}</Badge>
                          </td>
                          <td className="p-4 text-muted-foreground">-</td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="fresh-milk">🥛 Fresh Milk</SelectItem>
                  <SelectItem value="products">📦 Products</SelectItem>
                  <SelectItem value="ice-cream">🍦 Ice Cream</SelectItem>
                </SelectContent>
              </Select>

              <Select value={officeFilter} onValueChange={setOfficeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Office" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  <SelectItem value="city">City MMO</SelectItem>
                  <SelectItem value="mettur">Mettur MMO</SelectItem>
                  <SelectItem value="edappadi">Edappadi MMO</SelectItem>
                </SelectContent>
              </Select>

              <Select value={routeFilter} onValueChange={setRouteFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  <SelectItem value="route-1">Route 1</SelectItem>
                  <SelectItem value="route-2">Route 2</SelectItem>
                  <SelectItem value="route-3">Route 3</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Filtered Orders</p>
                    <p className="text-2xl font-bold">{filteredOrders.length}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Filtered Revenue</p>
                    <p className="text-2xl font-bold">₹{filteredRevenue.toFixed(0)}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600">Avg Order Value</p>
                    <p className="text-2xl font-bold">
                      ₹{filteredOrders.length > 0 ? (filteredRevenue / filteredOrders.length).toFixed(0) : 0}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Order ID</th>
                        <th className="text-left p-4 font-medium">Segment</th>
                        <th className="text-left p-4 font-medium">Customer</th>
                        <th className="text-left p-4 font-medium">Amount</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.slice(0, 20).map((order: any) => (
                        <tr key={order.id} className="border-t">
                          <td className="p-4 font-medium">#{order.id}</td>
                          <td className="p-4">
                            <Badge variant="outline" className={`text-xs ${
                              order.productSegment === 'Fresh Milk' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                              order.productSegment === 'Ice Cream' ? 'border-purple-300 text-purple-700 bg-purple-50' :
                              'border-green-300 text-green-700 bg-green-50'
                            }`}>
                              {order.productSegment === 'Fresh Milk' ? '🥛' : order.productSegment === 'Ice Cream' ? '🍦' : '📦'} {order.productSegment || 'Products'}
                            </Badge>
                          </td>
                          <td className="p-4">{order.customerEmail || 'Guest'}</td>
                          <td className="p-4 font-medium">₹{order.total}</td>
                          <td className="p-4">
                            <Badge>{order.status}</Badge>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Business Locations Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">Map integration coming soon</p>
                    <p className="text-sm text-gray-400 mt-2">
                      View WSD, Dealer, and Retailer locations
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span className="font-medium">WSD Locations</span>
                    </div>
                    <p className="text-2xl font-bold">{userCounts.wsd}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="font-medium">Dealer Locations</span>
                    </div>
                    <p className="text-2xl font-bold">{userCounts.dealer}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full" />
                      <span className="font-medium">Retailer Locations</span>
                    </div>
                    <p className="text-2xl font-bold">{userCounts.retailer}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Generate Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <Package className="h-8 w-8 text-blue-500 mb-3" />
                    <h3 className="font-semibold">Daily Order Report</h3>
                    <p className="text-sm text-muted-foreground">Orders by segment, route, office</p>
                    <Button size="sm" className="mt-3">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <Users className="h-8 w-8 text-green-500 mb-3" />
                    <h3 className="font-semibold">User Activity Report</h3>
                    <p className="text-sm text-muted-foreground">User engagement and orders</p>
                    <Button size="sm" className="mt-3">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <TrendingUp className="h-8 w-8 text-purple-500 mb-3" />
                    <h3 className="font-semibold">Performance Report</h3>
                    <p className="text-sm text-muted-foreground">Sales performance metrics</p>
                    <Button size="sm" className="mt-3">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <Milk className="h-8 w-8 text-cyan-500 mb-3" />
                    <h3 className="font-semibold">Fresh Milk Report</h3>
                    <p className="text-sm text-muted-foreground">Fresh milk segment analysis</p>
                    <Button size="sm" className="mt-3">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <ShoppingBag className="h-8 w-8 text-orange-500 mb-3" />
                    <h3 className="font-semibold">Products Report</h3>
                    <p className="text-sm text-muted-foreground">Products segment analysis</p>
                    <Button size="sm" className="mt-3">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <Package className="h-8 w-8 text-purple-500 mb-3" />
                    <h3 className="font-semibold">Ice Cream Report</h3>
                    <p className="text-sm text-muted-foreground">Ice cream segment analysis</p>
                    <Button size="sm" className="mt-3">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <Calendar className="h-8 w-8 text-pink-500 mb-3" />
                    <h3 className="font-semibold">Monthly Summary</h3>
                    <p className="text-sm text-muted-foreground">Complete monthly overview</p>
                    <Button size="sm" className="mt-3">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
