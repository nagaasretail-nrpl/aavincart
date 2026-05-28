import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, User, MapPin, Phone, Mail, Building2, 
  Search, ShoppingCart, Plus, Minus, Milk, FileText 
} from "lucide-react";

interface FMDDealer {
  id: string;
  fmdCode: string;
  name: string;
  email: string;
  location: string;
  address: string;
  mobileNumber: string;
  districtUnion: string;
  pricingTier: string;
  gstin: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  mrp: string;
  wholesalePrice: string;
  retailPrice: string;
  hsnCode: string;
  gstPercent: string;
  unitSize: string;
  unitType: string;
  productSegment: string;
}

export default function FmdDashboard() {
  const [, setLocation] = useLocation();
  const [dealer, setDealer] = useState<FMDDealer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<{[key: string]: number}>({});
  const { toast } = useToast();

  const { data: profileData, isLoading: profileLoading, error: profileError } = useQuery<{ success: boolean; dealer: FMDDealer }>({
    queryKey: ["/api/fmd/me"],
    retry: false
  });

  useEffect(() => {
    if (profileData?.success && profileData?.dealer) {
      setDealer(profileData.dealer);
      localStorage.setItem("fmd_dealer", JSON.stringify(profileData.dealer));
    } else if (profileError || (profileData && !profileData.success)) {
      localStorage.removeItem("fmd_dealer");
      setLocation("/fmd/login");
    }
  }, [profileData, profileError, setLocation]);

  const { data: productsData, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/menu-items"],
    enabled: !!dealer
  });

  const products = (productsData || []).filter(p => 
    p.productSegment === "Fresh Milk"
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    try {
      await fetch("/api/fmd/logout", { method: "POST", credentials: "include" });
      queryClient.clear();
      localStorage.removeItem("fmd_dealer");
      setLocation("/fmd/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    const caseUnits = (product as any)?.unitsPerPackage || 1;
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + caseUnits }));
  };

  const removeFromCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    const caseUnits = (product as any)?.unitsPerPackage || 1;
    setCart(prev => {
      const newQty = (prev[productId] || 0) - caseUnits;
      if (newQty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newQty };
    });
  };

  const getWholesalePrice = (product: Product): number => {
    return parseFloat(product.wholesalePrice || product.mrp || "0");
  };

  const getMrpPrice = (product: Product): number => {
    return parseFloat(product.mrp || product.wholesalePrice || "0");
  };

  const getBillingPrice = (product: Product): number => {
    const base = getWholesalePrice(product);
    const gst = parseFloat((product as any).gstPercent || '0');
    return base + (base * gst / 100);
  };

  const calculateSavings = (product: Product): number => {
    const wholesale = getWholesalePrice(product);
    const mrp = getMrpPrice(product);
    return mrp - wholesale;
  };

  const cartTotal = Object.entries(cart).reduce((total, [productId, qty]) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      return total + getBillingPrice(product) * qty;
    }
    return total;
  }, 0);

  const cartItemsCount = Object.values(cart).reduce((a, b) => a + b, 0);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Milk className="h-12 w-12 text-green-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!dealer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white shadow-lg">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Milk className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">Aavincart FMD</h1>
                <p className="text-green-100 text-xs sm:text-sm hidden sm:block">Fresh Milk Dealer Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative">
                <Button variant="ghost" className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10 p-0">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </Button>
              </div>
              <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-white/20 h-9 sm:h-10 px-2 sm:px-3">
                <LogOut className="h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0 sticky top-6">
              <CardHeader className="bg-green-50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-green-600" />
                  Dealer Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="text-center pb-4 border-b">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Building2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-bold text-lg">{dealer.name}</h3>
                  <Badge className="bg-green-600 mt-2">{dealer.fmdCode}</Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-500">Location</p>
                      <p className="font-medium">{dealer.location || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-500">Mobile</p>
                      <p className="font-medium">{dealer.mobileNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium text-xs">{dealer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-500">District Union</p>
                      <p className="font-medium">{dealer.districtUnion}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Pricing Tier</p>
                    <p className="font-bold text-green-700 text-lg">{dealer.pricingTier}</p>
                    <p className="text-xs text-green-600 mt-1">Fresh Milk Segment</p>
                  </div>
                </div>

                {dealer.gstin && (
                  <div className="pt-2">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">GSTIN</p>
                      <p className="font-mono text-sm">{dealer.gstin}</p>
                    </div>
                  </div>
                )}

                {cartItemsCount > 0 && (
                  <div className="pt-4 border-t">
                    <div className="bg-green-100 rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium">Cart ({cartItemsCount} {cartItemsCount === 1 ? 'item' : 'items'})</p>
                      {Object.entries(cart).map(([productId, qty]) => {
                        const product = products.find(p => p.id === productId);
                        if (!product) return null;
                        const base = getWholesalePrice(product);
                        const gstPct = parseFloat((product as any).gstPercent || '0');
                        const gstAmt = base * gstPct / 100;
                        return (
                          <div key={productId} className="border-b border-green-200 pb-1.5">
                            <div className="flex justify-between text-xs font-medium">
                              <span>{product.name} x{qty}</span>
                              <span>₹{((base + gstAmt) * qty).toFixed(2)}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">
                              Base: ₹{(base * qty).toFixed(2)} + GST({gstPct}%): ₹{(gstAmt * qty).toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-sm font-bold text-green-700">Total (incl. GST)</span>
                        <span className="font-bold text-green-700">₹{cartTotal.toFixed(2)}</span>
                      </div>
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <FileText className="h-4 w-4 mr-2" />
                        Place Order
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search fresh milk products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Milk className="h-3 w-3 mr-1" />
                  Fresh Milk Segment
                </Badge>
                <span className="text-sm text-gray-500">
                  {filteredProducts.length} products available
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-40 bg-gray-200 rounded-t-lg" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card className="p-8 text-center">
                <Milk className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No Fresh Milk Products Found</h3>
                <p className="text-gray-400 mt-2">Fresh milk products will appear here once added to the system.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map(product => {
                  const wholesalePrice = getWholesalePrice(product);
                  const mrpPrice = getMrpPrice(product);
                  const savings = calculateSavings(product);
                  const cartQty = cart[product.id] || 0;

                  return (
                    <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative h-40 bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <Milk className="h-16 w-16 text-green-300" />
                        )}
                        {savings > 0 && (
                          <Badge className="absolute top-2 right-2 bg-green-600">
                            Save ₹{savings.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                            <p className="text-sm text-gray-500">{product.category}</p>
                          </div>
                          {product.hsnCode && (
                            <Badge variant="outline" className="text-xs">
                              HSN: {product.hsnCode}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-xl font-bold text-green-600">₹{getBillingPrice(product).toFixed(2)}</span>
                          {mrpPrice > wholesalePrice && (
                            <span className="text-sm text-gray-400 line-through">₹{mrpPrice.toFixed(2)}</span>
                          )}
                          {product.unitSize && (
                            <span className="text-xs text-gray-500">/ {product.unitSize} {product.unitType}</span>
                          )}
                        </div>
                        {(product as any).packagingType && (product as any).unitsPerPackage && (
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                              1 Case ({(product as any).packagingType}) = {(product as any).unitsPerPackage} {product.unitType || 'units'}
                            </Badge>
                          </div>
                        )}
                        {(product as any).packagingType && (product as any).unitsPerPackage && (
                          <p className="text-xs text-gray-500 mb-2">
                            Per Case: ₹{(getBillingPrice(product) * (product as any).unitsPerPackage).toFixed(2)}
                          </p>
                        )}

                        {cartQty > 0 ? (
                          <div className="flex items-center justify-between bg-green-50 rounded-lg p-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => removeFromCart(product.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="text-center">
                              <span className="font-bold text-green-700">{cartQty}</span>
                              <p className="text-xs text-gray-500">{(product as any).unitsPerPackage ? `${Math.round(cartQty / (product as any).unitsPerPackage)} case${Math.round(cartQty / (product as any).unitsPerPackage) !== 1 ? 's' : ''}` : 'units'}</p>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => addToCart(product.id)}
                              className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => addToCart(product.id)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {(product as any).unitsPerPackage ? 'Add 1 Case' : 'Add to Cart'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
