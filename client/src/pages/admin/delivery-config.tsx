import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { 
  Truck, Settings, DollarSign, MapPin, Users, Save, RefreshCw, Bike, Car
} from "lucide-react";

interface DeliveryConfig {
  id?: string;
  districtUnionId: string;
  districtUnionName: string;
  deliveryBoyPayType: 'per_delivery' | 'per_km';
  perDeliveryRate: string;
  perKmRate: string;
  minimumDeliveryPay: string;
  transportPayType: 'per_delivery' | 'per_km' | 'fixed_route';
  transportPerKmRate: string;
  transportFixedRouteRate: string;
  fuelSurchargePercent: string;
  nightDeliveryBonus: string;
  holidayBonus: string;
  freshMilkDeliveryRate?: string;
  productsDeliveryRate?: string;
  isActive: boolean;
}

const DEFAULT_CONFIG: DeliveryConfig = {
  districtUnionId: "",
  districtUnionName: "",
  deliveryBoyPayType: "per_delivery",
  perDeliveryRate: "50.00",
  perKmRate: "10.00",
  minimumDeliveryPay: "30.00",
  transportPayType: "per_km",
  transportPerKmRate: "15.00",
  transportFixedRouteRate: "500.00",
  fuelSurchargePercent: "0.00",
  nightDeliveryBonus: "20.00",
  holidayBonus: "50.00",
  isActive: true
};

const DISTRICT_UNIONS = [
  "Chennai",
  "Salem",
  "Coimbatore",
  "Madurai",
  "Tirunelveli",
  "Trichy",
  "Vellore",
  "Erode",
  "Tirupur",
  "Dindigul",
  "Kanchipuram",
  "Dharmapuri",
  "Villupuram",
  "Cuddalore",
  "Thanjavur",
  "Nagapattinam",
  "Sivagangai",
  "Ramanathapuram",
  "Virudhunagar",
  "Theni",
  "Thoothukudi",
  "Kanyakumari",
  "Namakkal",
  "Karur",
  "Krishnagiri",
  "Tiruvannamalai",
  "Ariyalur"
];

export default function DeliveryConfigPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUnion, setSelectedUnion] = useState<string>("");
  const [config, setConfig] = useState<DeliveryConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState("delivery-boy");

  useEffect(() => {
    if (!user) {
      setLocation("/admin/login");
    } else if (user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  const { data: configsData, refetch } = useQuery<DeliveryConfig[]>({
    queryKey: ["/api/admin/delivery-config"],
    enabled: !!user && user.role === 'admin'
  });

  const configs = configsData || [];

  useEffect(() => {
    if (selectedUnion) {
      const existingConfig = configs.find(c => c.districtUnionId === selectedUnion);
      if (existingConfig) {
        setConfig(existingConfig);
      } else {
        setConfig({
          ...DEFAULT_CONFIG,
          districtUnionId: selectedUnion,
          districtUnionName: selectedUnion
        });
      }
    }
  }, [selectedUnion, configs]);

  const saveMutation = useMutation({
    mutationFn: async (configData: DeliveryConfig) => {
      const response = await apiRequest('POST', '/api/admin/delivery-config', configData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Delivery configuration saved successfully"
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-config"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    if (!selectedUnion) {
      toast({
        title: "Error",
        description: "Please select a District Union first",
        variant: "destructive"
      });
      return;
    }
    saveMutation.mutate(config);
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold">Delivery Configuration</h1>
            <p className="text-sm text-muted-foreground">Manage delivery team rates and transport pricing</p>
          </div>
        </div>
      </div>

      <div>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Select District Union
            </CardTitle>
            <CardDescription>
              Choose a District Union to configure delivery rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="district-union">District Union</Label>
                <Select value={selectedUnion} onValueChange={setSelectedUnion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a District Union" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICT_UNIONS.map((union) => (
                      <SelectItem key={union} value={union}>{union}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedUnion && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
              <TabsTrigger value="delivery-boy" className="flex items-center gap-2">
                <Bike className="h-4 w-4" />
                Delivery Boy Rates
              </TabsTrigger>
              <TabsTrigger value="transport" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Transport Rates
              </TabsTrigger>
              <TabsTrigger value="bonuses" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Bonuses & Extras
              </TabsTrigger>
            </TabsList>

            <TabsContent value="delivery-boy">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bike className="h-5 w-5" />
                    Delivery Boy Commission Settings
                  </CardTitle>
                  <CardDescription>
                    Configure how delivery personnel are paid for their deliveries
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="pay-type">Payment Type</Label>
                    <Select 
                      value={config.deliveryBoyPayType} 
                      onValueChange={(v: 'per_delivery' | 'per_km') => 
                        setConfig({...config, deliveryBoyPayType: v})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_delivery">Per Delivery</SelectItem>
                        <SelectItem value="per_km">Per Kilometer</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      {config.deliveryBoyPayType === 'per_delivery' 
                        ? "Pay a fixed amount for each delivery completed"
                        : "Pay based on distance traveled for each delivery"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="per-delivery-rate">Per Delivery Rate (₹)</Label>
                      <Input
                        id="per-delivery-rate"
                        type="number"
                        step="0.01"
                        value={config.perDeliveryRate}
                        onChange={(e) => setConfig({...config, perDeliveryRate: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Amount paid per completed delivery
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="per-km-rate">Per Kilometer Rate (₹)</Label>
                      <Input
                        id="per-km-rate"
                        type="number"
                        step="0.01"
                        value={config.perKmRate}
                        onChange={(e) => setConfig({...config, perKmRate: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Amount paid per kilometer traveled
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="min-pay">Minimum Delivery Pay (₹)</Label>
                    <Input
                      id="min-pay"
                      type="number"
                      step="0.01"
                      value={config.minimumDeliveryPay}
                      onChange={(e) => setConfig({...config, minimumDeliveryPay: e.target.value})}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Minimum amount guaranteed per delivery (for short distances)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transport">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Transport/Vehicle Settings
                  </CardTitle>
                  <CardDescription>
                    Configure rates for larger vehicle deliveries (vans, trucks)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="transport-pay-type">Transport Payment Type</Label>
                    <Select 
                      value={config.transportPayType} 
                      onValueChange={(v: 'per_delivery' | 'per_km' | 'fixed_route') => 
                        setConfig({...config, transportPayType: v})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_delivery">Per Delivery</SelectItem>
                        <SelectItem value="per_km">Per Kilometer</SelectItem>
                        <SelectItem value="fixed_route">Fixed Route Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="transport-km-rate">Transport Per Km Rate (₹)</Label>
                      <Input
                        id="transport-km-rate"
                        type="number"
                        step="0.01"
                        value={config.transportPerKmRate}
                        onChange={(e) => setConfig({...config, transportPerKmRate: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Rate per kilometer for transport vehicles
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="fixed-route-rate">Fixed Route Rate (₹)</Label>
                      <Input
                        id="fixed-route-rate"
                        type="number"
                        step="0.01"
                        value={config.transportFixedRouteRate}
                        onChange={(e) => setConfig({...config, transportFixedRouteRate: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Fixed payment per route completion
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="fuel-surcharge">Fuel Surcharge (%)</Label>
                    <Input
                      id="fuel-surcharge"
                      type="number"
                      step="0.01"
                      value={config.fuelSurchargePercent}
                      onChange={(e) => setConfig({...config, fuelSurchargePercent: e.target.value})}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Additional percentage added for fuel costs
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bonuses">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Bonuses & Extra Payments
                  </CardTitle>
                  <CardDescription>
                    Configure additional payments for special circumstances
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="night-bonus">Night Delivery Bonus (₹)</Label>
                      <Input
                        id="night-bonus"
                        type="number"
                        step="0.01"
                        value={config.nightDeliveryBonus}
                        onChange={(e) => setConfig({...config, nightDeliveryBonus: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Extra pay for deliveries between 9 PM - 6 AM
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="holiday-bonus">Holiday Bonus (₹)</Label>
                      <Input
                        id="holiday-bonus"
                        type="number"
                        step="0.01"
                        value={config.holidayBonus}
                        onChange={(e) => setConfig({...config, holidayBonus: e.target.value})}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Extra pay for deliveries on public holidays
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Segment-Specific Rates (Optional)
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Override default rates for specific product segments
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="fresh-milk-rate">Fresh Milk Delivery Rate (₹)</Label>
                        <Input
                          id="fresh-milk-rate"
                          type="number"
                          step="0.01"
                          placeholder="Leave empty to use default"
                          value={config.freshMilkDeliveryRate || ""}
                          onChange={(e) => setConfig({...config, freshMilkDeliveryRate: e.target.value || undefined})}
                        />
                      </div>

                      <div>
                        <Label htmlFor="products-rate">Products Delivery Rate (₹)</Label>
                        <Input
                          id="products-rate"
                          type="number"
                          step="0.01"
                          placeholder="Leave empty to use default"
                          value={config.productsDeliveryRate || ""}
                          onChange={(e) => setConfig({...config, productsDeliveryRate: e.target.value || undefined})}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end gap-4">
              <Button 
                variant="outline" 
                onClick={() => setConfig({...DEFAULT_CONFIG, districtUnionId: selectedUnion, districtUnionName: selectedUnion})}
              >
                Reset to Defaults
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </Tabs>
        )}

        {!selectedUnion && (
          <Card className="text-center py-12">
            <CardContent>
              <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Select a District Union</h3>
              <p className="text-muted-foreground">
                Choose a District Union from the dropdown above to configure delivery rates and transport pricing.
              </p>
            </CardContent>
          </Card>
        )}

        {configs.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Configured District Unions</CardTitle>
              <CardDescription>
                District Unions with existing delivery configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {configs.map((c) => (
                  <Button
                    key={c.districtUnionId}
                    variant={selectedUnion === c.districtUnionId ? "default" : "outline"}
                    onClick={() => setSelectedUnion(c.districtUnionId)}
                    className="justify-start"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {c.districtUnionName}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </AdminLayout>
  );
}
