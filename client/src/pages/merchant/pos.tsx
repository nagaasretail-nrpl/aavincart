import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, ShoppingCart, History, Search, Plus, Package } from "lucide-react";
import { formatOrderId } from "@/lib/format-order-id";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount || 0);
}

export default function MerchantPOS() {
  const { merchantId } = useMerchantContext();
  const [activeTab, setActiveTab] = useState("create");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/union", merchantId, "my-products"],
    queryFn: async () => {
      const res = await fetch(`/api/union/${merchantId}/my-products`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((m: any) => ({
        id: m.masterProductId || m.id,
        name: m.masterProduct?.name || m.name || 'Product',
        price: parseFloat(m.mrp || m.masterProduct?.mrp || '0'),
        segment: m.masterProduct?.segment || '',
        unit: m.masterProduct?.unit || '',
        image: m.masterProduct?.image || null,
        isAvailable: m.isActive !== false,
      })).filter((p: any) => p.isAvailable);
    },
    enabled: !!merchantId,
  });

  const { data: posOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders", merchantId, "pos"],
    queryFn: async () => {
      const res = await fetch(`/api/orders?merchantId=${merchantId}&source=pos`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId && activeTab === "history",
  });

  const filteredProducts = products.filter((p: any) => {
    if (!searchQuery) return true;
    return p.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Monitor className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Point of Sale</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Create orders and manage POS transactions</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="create">
              <ShoppingCart className="h-4 w-4 mr-1" /> Create Order
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-1" /> Order History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No products found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((product: any) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-3">
                      <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Package className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      {product.segment && (
                        <Badge variant="outline" className="text-xs mt-1">{product.segment}</Badge>
                      )}
                      <p className="text-purple-600 font-bold text-sm mt-1">
                        {formatCurrency(product.price)}
                      </p>
                      <Button size="sm" className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {posOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No POS orders yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {posOrders.map((order: any) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{formatOrderId(order)}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "N/A"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(order.total)}</p>
                          <Badge className="bg-green-500 text-xs">{order.status || "completed"}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MerchantLayout>
  );
}
