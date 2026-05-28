import { useState, useEffect } from "react";
import { formatTimestamp } from '@/lib/format-timestamp';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calendar, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  FileText,
  Building2,
  Milk,
  Package,
  MapPin,
  ArrowLeft
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: string;
  mrp?: string;
  category: string;
  productSegment?: string;
  hsnCode?: string;
  gstPercent?: string;
  image?: string;
  isAvailable?: boolean;
  packagingType?: string;
  unitsPerPackage?: number;
  unitType?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface DailyIndent {
  id: string;
  customerName: string;
  deliveryDate: string;
  items: any[];
  productSegment: string;
  subtotal: string;
  total: string;
  status: string;
  submittedAt: string;
}

const MMO_OFFICES = [
  { value: "City", label: "City MMO Office" },
  { value: "Mettur", label: "Mettur MMO Office" },
  { value: "Edappadi", label: "Edappadi MMO Office" },
];

export default function DailyIndentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isAuthenticated = !!user;

  const [activeSegment, setActiveSegment] = useState<"Fresh Milk" | "Products">("Fresh Milk");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [mmoOffice, setMmoOffice] = useState("");

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
    enabled: isAuthenticated,
  });

  const { data: myIndents = [] } = useQuery<DailyIndent[]>({
    queryKey: ["/api/daily-indents"],
    enabled: isAuthenticated,
  });

  const createIndentMutation = useMutation({
    mutationFn: async (indentData: any) => {
      const res = await apiRequest("POST", "/api/daily-indents", indentData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Indent Submitted",
        description: `Your daily indent for ${activeSegment} has been submitted successfully.`,
      });
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ["/api/daily-indents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit indent",
        variant: "destructive",
      });
    },
  });

  const filteredItems = menuItems.filter(
    (item) => item.productSegment === activeSegment && item.isAvailable !== false
  );

  const addToCart = (item: MenuItem) => {
    const caseUnits = item.unitsPerPackage || 1;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + caseUnits } : i
        );
      }
      return [...prev, { ...item, quantity: caseUnits }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId) || menuItems.find(i => i.id === itemId);
    const caseUnits = item?.unitsPerPackage || 1;
    const actualDelta = delta > 0 ? caseUnits : -caseUnits;
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + actualDelta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const getItemPrice = (item: MenuItem): number => {
    return parseFloat(item.mrp || item.price || "0");
  };

  const getBillingPrice = (item: MenuItem): number => {
    const base = getItemPrice(item);
    const gst = parseFloat(item.gstPercent || "0");
    return base + (base * gst / 100);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0
  );

  const gstAmount = cart.reduce((sum, item) => {
    const gstPercent = parseFloat(item.gstPercent || "0");
    const itemTotal = getItemPrice(item) * item.quantity;
    return sum + (itemTotal * gstPercent) / 100;
  }, 0);

  const total = subtotal + gstAmount;

  const handleSubmitIndent = () => {
    if (!deliveryDate) {
      toast({
        title: "Error",
        description: "Please select a delivery date",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to your indent",
        variant: "destructive",
      });
      return;
    }

    const indentData = {
      customerId: user?.id,
      customerName: user?.name,
      customerPhone: user?.phone,
      customerEmail: user?.email,
      institutionType: (user as any)?.institutionType || (user as any)?.pricingRole || "B2B Customer",
      deliveryDate: new Date(deliveryDate).toISOString(),
      deliveryAddress,
      deliveryInstructions,
      productSegment: activeSegment,
      mmoOffice,
      items: cart.map((item) => ({
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: getItemPrice(item),
        hsnCode: item.hsnCode,
        gstPercent: item.gstPercent,
        segment: item.productSegment,
      })),
      subtotal,
      gstAmount,
      total,
      unionId: user?.unionId,
    };

    createIndentMutation.mutate(indentData);
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-10 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Please log in to submit daily indents.</p>
            <Button className="mt-4" onClick={() => navigate("/login")}>
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-4 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-white hover:bg-purple-700">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Daily Indent Submission
              </h1>
              <p className="text-purple-200 text-sm">
                Submit your daily milk and dairy product requirements
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Delivery Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deliveryDate">Delivery Date</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mmoOffice">MMO Office</Label>
                    <Select value={mmoOffice} onValueChange={setMmoOffice}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select MMO Office" />
                      </SelectTrigger>
                      <SelectContent>
                        {MMO_OFFICES.map((office) => (
                          <SelectItem key={office.value} value={office.value}>
                            {office.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="deliveryAddress">Delivery Address</Label>
                    <div className="flex gap-2">
                      <MapPin className="h-5 w-5 text-gray-400 mt-2" />
                      <Textarea
                        id="deliveryAddress"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Enter delivery address"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="instructions">Special Instructions</Label>
                    <Input
                      id="instructions"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      placeholder="Any special delivery instructions"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={activeSegment} onValueChange={(v) => setActiveSegment(v as any)}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="Fresh Milk" className="flex-1 gap-2">
                  <Milk className="h-4 w-4" />
                  Fresh Milk
                </TabsTrigger>
                <TabsTrigger value="Products" className="flex-1 gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeSegment}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredItems.map((item) => {
                    const inCart = cart.find((c) => c.id === item.id);
                    return (
                      <Card key={item.id} className="overflow-hidden">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-24 object-cover"
                          />
                        )}
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">
                            {item.name}
                          </h4>
                          <p className="text-purple-600 font-bold">
                            ₹{getBillingPrice(item).toFixed(2)}
                          </p>
                          {item.packagingType && item.unitsPerPackage && (
                            <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700 mt-1">
                              1 Case ({item.packagingType}) = {item.unitsPerPackage} {item.unitType || 'units'}
                            </Badge>
                          )}
                          {inCart ? (
                            <div className="flex items-center justify-between mt-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <div className="text-center">
                                <span className="font-medium">{inCart.quantity}</span>
                                <p className="text-[10px] text-gray-400">{item.unitsPerPackage ? `${Math.round(inCart.quantity / item.unitsPerPackage)} case${Math.round(inCart.quantity / item.unitsPerPackage) !== 1 ? 's' : ''}` : 'units'}</p>
                              </div>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => addToCart(item)}
                            >
                              <Plus className="h-4 w-4 mr-1" /> {item.unitsPerPackage ? 'Add 1 Case' : 'Add'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {filteredItems.length === 0 && (
                  <Card>
                    <CardContent className="py-10 text-center text-gray-500">
                      No {activeSegment} products available
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader className="pb-2 bg-purple-50">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Indent Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No items added yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const basePrice = getItemPrice(item);
                      const gstPct = parseFloat(item.gstPercent || '0');
                      const gstAmt = basePrice * gstPct / 100;
                      return (
                        <div
                          key={item.id}
                          className="border-b pb-2"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                ₹{getBillingPrice(item).toFixed(2)} × {item.quantity} {item.unitsPerPackage ? `(${Math.round(item.quantity / item.unitsPerPackage)} case${Math.round(item.quantity / item.unitsPerPackage) !== 1 ? 's' : ''})` : 'units'}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                Base: ₹{(basePrice * item.quantity).toFixed(2)} + GST({gstPct}%): ₹{(gstAmt * item.quantity).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>GST</span>
                        <span>₹{gstAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total (incl. GST)</span>
                        <span className="text-purple-600">₹{total.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                      onClick={handleSubmitIndent}
                      disabled={createIndentMutation.isPending}
                    >
                      {createIndentMutation.isPending ? "Submitting..." : "Submit Indent"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {myIndents.length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Indents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {myIndents.slice(0, 5).map((indent: DailyIndent) => (
                      <div
                        key={indent.id}
                        className="flex justify-between items-center border-b pb-2 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {formatTimestamp(indent.deliveryDate)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {indent.productSegment} • ₹{parseFloat(indent.total).toFixed(2)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            indent.status === "approved"
                              ? "default"
                              : indent.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {indent.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {indent.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
