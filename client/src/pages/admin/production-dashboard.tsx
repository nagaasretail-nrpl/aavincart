import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminLayout from "./layout";
import { 
  Package, TrendingUp, AlertTriangle, Clock, RefreshCw, 
  Milk, CheckCircle, BarChart3, Calendar, Download, Eye
} from "lucide-react";

interface ProductRequirement {
  id: string;
  name: string;
  category: string;
  segment: 'Fresh Milk' | 'Products' | 'Ice Cream';
  orderedQty: number;
  producedQty: number;
  pendingQty: number;
  unit: string;
}

export default function ProductionDashboard() {
  const [activeTab, setActiveTab] = useState("live");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: ordersData, refetch: refetchOrders } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 30000,
  });

  const { data: menuItemsData } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
  });

  const orders = ordersData || [];
  const menuItems = menuItemsData || [];

  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });

  const calculateProductRequirements = (): ProductRequirement[] => {
    const requirements: Record<string, ProductRequirement> = {};

    todayOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const menuItem = menuItems.find(m => m.id === item.id || m.name === item.name);
          const key = item.id || item.name;
          
          if (!requirements[key]) {
            requirements[key] = {
              id: key,
              name: item.name,
              category: menuItem?.category || 'Other',
              segment: menuItem?.productSegment || 'Products',
              orderedQty: 0,
              producedQty: 0,
              pendingQty: 0,
              unit: menuItem?.unitType || 'units'
            };
          }
          requirements[key].orderedQty += item.quantity;
          
          const isDelivered = order.status === 'delivered' || order.status === 'completed';
          const isProcessing = order.status === 'preparing' || order.status === 'ready';
          
          if (isDelivered) {
            requirements[key].producedQty += item.quantity;
          } else if (isProcessing) {
            requirements[key].producedQty += Math.floor(item.quantity * 0.5);
            requirements[key].pendingQty += Math.ceil(item.quantity * 0.5);
          } else {
            requirements[key].pendingQty += item.quantity;
          }
        });
      }
    });

    return Object.values(requirements);
  };

  const productRequirements = calculateProductRequirements();
  
  const freshMilkRequirements = productRequirements.filter(r => r.segment === 'Fresh Milk');
  const productsRequirements = productRequirements.filter(r => r.segment === 'Products');
  const iceCreamRequirements = productRequirements.filter(r => r.segment === 'Ice Cream');

  const totalFreshMilkOrdered = freshMilkRequirements.reduce((sum, r) => sum + r.orderedQty, 0);
  const totalProductsOrdered = productsRequirements.reduce((sum, r) => sum + r.orderedQty, 0);
  const totalIceCreamOrdered = iceCreamRequirements.reduce((sum, r) => sum + r.orderedQty, 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchOrders();
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getMissingForTomorrow = () => {
    return productRequirements.filter(r => r.pendingQty > 0);
  };

  const missingItems = getMissingForTomorrow();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Production Manager Dashboard</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">🥛 Fresh Milk</p>
                  <p className="text-3xl font-bold">{totalFreshMilkOrdered}</p>
                  <p className="text-blue-200 text-sm">units today</p>
                </div>
                <Milk className="h-9 w-9 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">📦 Products</p>
                  <p className="text-3xl font-bold">{totalProductsOrdered}</p>
                  <p className="text-green-200 text-sm">units today</p>
                </div>
                <Package className="h-9 w-9 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">🍦 Ice Cream</p>
                  <p className="text-3xl font-bold">{totalIceCreamOrdered}</p>
                  <p className="text-purple-200 text-sm">units today</p>
                </div>
                <Package className="h-9 w-9 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-sm">Total Orders</p>
                  <p className="text-3xl font-bold">{todayOrders.length}</p>
                  <p className="text-teal-200 text-sm">LIVE</p>
                </div>
                <TrendingUp className="h-9 w-9 text-teal-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Missing Items</p>
                  <p className="text-3xl font-bold">{missingItems.length}</p>
                  <p className="text-orange-200 text-sm">for tomorrow</p>
                </div>
                <AlertTriangle className="h-9 w-9 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="live" className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live
            </TabsTrigger>
            <TabsTrigger value="fresh-milk">🥛 Fresh Milk</TabsTrigger>
            <TabsTrigger value="products">📦 Products</TabsTrigger>
            <TabsTrigger value="ice-cream">🍦 Ice Cream</TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  LIVE Production Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productRequirements.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No orders yet today</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-4 font-medium">Product</th>
                          <th className="text-left p-4 font-medium">Segment</th>
                          <th className="text-left p-4 font-medium">Category</th>
                          <th className="text-left p-4 font-medium">Ordered</th>
                          <th className="text-left p-4 font-medium">Produced</th>
                          <th className="text-left p-4 font-medium">Pending</th>
                          <th className="text-left p-4 font-medium">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productRequirements.map((req) => (
                          <tr key={req.id} className="border-t">
                            <td className="p-4 font-medium">{req.name}</td>
                            <td className="p-4">
                              <Badge variant="outline" className={`text-xs ${
                                req.segment === 'Fresh Milk' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                                req.segment === 'Ice Cream' ? 'border-purple-300 text-purple-700 bg-purple-50' :
                                'border-green-300 text-green-700 bg-green-50'
                              }`}>
                                {req.segment === 'Fresh Milk' ? '🥛' : req.segment === 'Ice Cream' ? '🍦' : '📦'} {req.segment}
                              </Badge>
                            </td>
                            <td className="p-4 text-muted-foreground">{req.category}</td>
                            <td className="p-4 font-medium">{req.orderedQty} {req.unit}</td>
                            <td className="p-4 text-green-600 font-medium">{req.producedQty} {req.unit}</td>
                            <td className="p-4">
                              {req.pendingQty > 0 ? (
                                <span className="text-orange-600 font-medium">{req.pendingQty} {req.unit}</span>
                              ) : (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                            </td>
                            <td className="p-4 w-40">
                              <Progress 
                                value={req.orderedQty > 0 ? (req.producedQty / req.orderedQty) * 100 : 0} 
                                className="h-2"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fresh-milk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Milk className="h-5 w-5 text-blue-500" />
                  Fresh Milk Production Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {freshMilkRequirements.length === 0 ? (
                  <div className="text-center py-12">
                    <Milk className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">No Fresh Milk orders today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {freshMilkRequirements.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{req.name}</p>
                          <p className="text-sm text-muted-foreground">{req.category}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Ordered</p>
                            <p className="font-bold text-lg">{req.orderedQty}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Pending</p>
                            <p className="font-bold text-lg text-orange-600">{req.pendingQty}</p>
                          </div>
                          <div className="w-24">
                            <Progress 
                              value={req.orderedQty > 0 ? (req.producedQty / req.orderedQty) * 100 : 0} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-500" />
                  Products Production Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productsRequirements.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">No Products orders today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productsRequirements.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{req.name}</p>
                          <p className="text-sm text-muted-foreground">{req.category}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Ordered</p>
                            <p className="font-bold text-lg">{req.orderedQty}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Pending</p>
                            <p className="font-bold text-lg text-orange-600">{req.pendingQty}</p>
                          </div>
                          <div className="w-24">
                            <Progress 
                              value={req.orderedQty > 0 ? (req.producedQty / req.orderedQty) * 100 : 0} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ice-cream" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  🍦 Ice Cream Production Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {iceCreamRequirements.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">No Ice Cream orders today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {iceCreamRequirements.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg border-purple-100">
                        <div>
                          <p className="font-medium">{req.name}</p>
                          <p className="text-sm text-muted-foreground">{req.category}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Ordered</p>
                            <p className="font-bold text-lg">{req.orderedQty}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Pending</p>
                            <p className="font-bold text-lg text-orange-600">{req.pendingQty}</p>
                          </div>
                          <div className="w-24">
                            <Progress 
                              value={req.orderedQty > 0 ? (req.producedQty / req.orderedQty) * 100 : 0} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tomorrow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Tomorrow's Production Planning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="p-6 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="h-6 w-6 text-orange-500" />
                      <h3 className="font-semibold text-orange-800">Missing Items</h3>
                    </div>
                    <p className="text-3xl font-bold text-orange-600 mb-2">{missingItems.length}</p>
                    <p className="text-sm text-orange-700">items need to be manufactured for tomorrow</p>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <BarChart3 className="h-6 w-6 text-blue-500" />
                      <h3 className="font-semibold text-blue-800">Estimated Production</h3>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {missingItems.reduce((sum, item) => sum + item.pendingQty, 0)}
                    </p>
                    <p className="text-sm text-blue-700">total units required</p>
                  </div>
                </div>

                {missingItems.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">All items fulfilled! No production needed for tomorrow.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-4 font-medium">Product</th>
                          <th className="text-left p-4 font-medium">Segment</th>
                          <th className="text-left p-4 font-medium">Quantity Needed</th>
                          <th className="text-left p-4 font-medium">Priority</th>
                          <th className="text-left p-4 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missingItems.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-4 font-medium">{item.name}</td>
                            <td className="p-4">
                              <Badge variant="outline" className={`text-xs ${
                                item.segment === 'Fresh Milk' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                                item.segment === 'Ice Cream' ? 'border-purple-300 text-purple-700 bg-purple-50' :
                                'border-green-300 text-green-700 bg-green-50'
                              }`}>
                                {item.segment === 'Fresh Milk' ? '🥛' : item.segment === 'Ice Cream' ? '🍦' : '📦'} {item.segment}
                              </Badge>
                            </td>
                            <td className="p-4 font-bold text-orange-600">
                              {item.pendingQty} {item.unit}
                            </td>
                            <td className="p-4">
                              <Badge variant={item.pendingQty > 50 ? 'destructive' : 'outline'}>
                                {item.pendingQty > 50 ? 'High' : 'Normal'}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                Schedule
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
