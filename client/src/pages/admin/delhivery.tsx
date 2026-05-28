import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Truck, Settings, Warehouse, Package, 
  Plus, RefreshCw, X, MapPin, Phone, 
  CheckCircle, Clock, AlertCircle, Download,
  Search, Filter
} from "lucide-react";

export default function DelhiveryShipping() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("shipments");
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [showCreateShipment, setShowCreateShipment] = useState(false);
  const [shipmentType, setShipmentType] = useState<"b2c" | "b2b">("b2c");

  const { data: config, isLoading: configLoading } = useQuery<any>({
    queryKey: ["/api/admin/delhivery/config"],
  });

  const { data: warehouses, isLoading: warehousesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/delhivery/warehouses"],
  });

  const { data: shipments, isLoading: shipmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/delhivery/shipments"],
  });

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8 text-blue-600" />
            Delhivery Shipping
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage B2B and B2C shipments with Delhivery logistics
          </p>
        </div>
        <div className="flex gap-2">
          {config?.hasApiToken && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" /> API Connected
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Shipments
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" /> Warehouses
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shipments" className="space-y-4">
          <ShipmentsTab 
            shipments={shipments || []} 
            isLoading={shipmentsLoading}
            config={config}
            showCreateShipment={showCreateShipment}
            setShowCreateShipment={setShowCreateShipment}
            shipmentType={shipmentType}
            setShipmentType={setShipmentType}
            warehouses={warehouses || []}
          />
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <WarehousesTab 
            warehouses={warehouses || []} 
            isLoading={warehousesLoading}
            showAddWarehouse={showAddWarehouse}
            setShowAddWarehouse={setShowAddWarehouse}
            config={config}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsTab config={config} isLoading={configLoading} />
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}

function SettingsTab({ config, isLoading }: { config: any; isLoading: boolean }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    apiToken: "",
    clientName: config?.clientName || "",
    environment: config?.environment || "staging",
    enableB2c: config?.enableB2c ?? true,
    enableB2b: config?.enableB2b ?? true,
    autoGenerateAwb: config?.autoGenerateAwb ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/delhivery/config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delhivery/config"] });
      toast({ title: "Settings Saved", description: "Delhivery configuration updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Connect your Delhivery account by entering your API credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Environment</Label>
            <Select 
              value={formData.environment} 
              onValueChange={(v) => setFormData({ ...formData, environment: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staging">Staging (Testing)</SelectItem>
                <SelectItem value="production">Production (Live)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input
              placeholder="Your Delhivery client name"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>API Token</Label>
            <Input
              type="password"
              placeholder={config?.hasApiToken ? "••••••••••••" : "Enter your API token"}
              value={formData.apiToken}
              onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Get your API token from Delhivery One → Settings → API Setup
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping Options</CardTitle>
          <CardDescription>Configure shipping preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable B2C Shipping</Label>
              <p className="text-sm text-muted-foreground">Business to Consumer shipments</p>
            </div>
            <Switch
              checked={formData.enableB2c}
              onCheckedChange={(v) => setFormData({ ...formData, enableB2c: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable B2B Shipping</Label>
              <p className="text-sm text-muted-foreground">Business to Business shipments</p>
            </div>
            <Switch
              checked={formData.enableB2b}
              onCheckedChange={(v) => setFormData({ ...formData, enableB2b: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Generate AWB</Label>
              <p className="text-sm text-muted-foreground">Automatically fetch waybill numbers</p>
            </div>
            <Switch
              checked={formData.autoGenerateAwb}
              onCheckedChange={(v) => setFormData({ ...formData, autoGenerateAwb: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>How to Get Delhivery API Credentials</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Log in to <a href="https://one.delhivery.com" target="_blank" className="text-blue-600 underline">Delhivery One Portal</a></li>
            <li>Navigate to <strong>Settings → API Setup</strong></li>
            <li>Click on <strong>Generate Token</strong> button</li>
            <li>Copy the generated token (it's shown only once)</li>
            <li>Paste the token above and save</li>
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            Note: For testing, use the Staging environment. Switch to Production for live shipments.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function WarehousesTab({ 
  warehouses, 
  isLoading, 
  showAddWarehouse, 
  setShowAddWarehouse,
  config 
}: { 
  warehouses: any[]; 
  isLoading: boolean;
  showAddWarehouse: boolean;
  setShowAddWarehouse: (v: boolean) => void;
  config: any;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/delhivery/warehouses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delhivery/warehouses"] });
      setShowAddWarehouse(false);
      setFormData({ name: "", phone: "", address: "", city: "", state: "", pincode: "" });
      toast({ title: "Warehouse Created", description: "Pickup location added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/delhivery/warehouses/${id}/register`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delhivery/warehouses"] });
      toast({ title: "Warehouse Registered", description: "Pickup location registered with Delhivery" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/delhivery/warehouses/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delhivery/warehouses"] });
      toast({ title: "Warehouse Deleted" });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Pickup Locations</h2>
        <Dialog open={showAddWarehouse} onOpenChange={setShowAddWarehouse}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Warehouse</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Warehouse</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Warehouse Name</Label>
                <Input
                  placeholder="e.g., Main Distribution Center"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="Contact phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Full address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  placeholder="6-digit pincode"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => createMutation.mutate(formData)}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Warehouse"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading warehouses...</div>
      ) : warehouses?.length === 0 ? (
        <Card className="py-12 text-center">
          <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No warehouses configured</p>
          <p className="text-sm text-muted-foreground">Add a warehouse to start shipping</p>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {warehouses?.map((warehouse) => (
            <Card key={warehouse.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">{warehouse.name}</h3>
                    <Badge variant={warehouse.registeredWithDelhivery ? "default" : "secondary"}>
                      {warehouse.registeredWithDelhivery ? "Registered" : "Not Registered"}
                    </Badge>
                  </div>
                  {warehouse.isDefault && (
                    <Badge variant="outline">Default</Badge>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{warehouse.address}, {warehouse.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{warehouse.phone}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {!warehouse.registeredWithDelhivery && config?.hasApiToken && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => registerMutation.mutate(warehouse.id)}
                      disabled={registerMutation.isPending}
                    >
                      Register with Delhivery
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(warehouse.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ShipmentsTab({ 
  shipments, 
  isLoading,
  config,
  showCreateShipment,
  setShowCreateShipment,
  shipmentType,
  setShipmentType,
  warehouses
}: { 
  shipments: any[]; 
  isLoading: boolean;
  config: any;
  showCreateShipment: boolean;
  setShowCreateShipment: (v: boolean) => void;
  shipmentType: "b2c" | "b2b";
  setShipmentType: (v: "b2c" | "b2b") => void;
  warehouses: any[];
}) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredShipments = shipments?.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (typeFilter !== "all" && s.shipmentType !== typeFilter) return false;
    return true;
  });

  const trackMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("GET", `/api/admin/delhivery/shipments/${id}/track`, undefined);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delhivery/shipments"] });
      toast({ title: "Tracking Updated", description: `Status: ${data.data?.Status?.Status || 'Updated'}` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/delhivery/shipments/${id}/cancel`, { reason: "Order cancelled" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delhivery/shipments"] });
      toast({ title: "Shipment Cancelled" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      created: "bg-gray-100 text-gray-800",
      manifested: "bg-blue-100 text-blue-800",
      in_transit: "bg-yellow-100 text-yellow-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      rto: "bg-purple-100 text-purple-800",
    };
    return (
      <Badge className={statusColors[status] || "bg-gray-100"}>
        {status.replace(/_/g, " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="manifested">Manifested</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="b2c">B2C</SelectItem>
              <SelectItem value="b2b">B2B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={showCreateShipment} onOpenChange={setShowCreateShipment}>
          <DialogTrigger asChild>
            <Button disabled={!config?.hasApiToken}>
              <Plus className="h-4 w-4 mr-2" /> Create Shipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Shipment</DialogTitle>
            </DialogHeader>
            <CreateShipmentForm 
              shipmentType={shipmentType}
              setShipmentType={setShipmentType}
              warehouses={warehouses}
              onSuccess={() => setShowCreateShipment(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading shipments...</div>
      ) : filteredShipments?.length === 0 ? (
        <Card className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No shipments found</p>
          <p className="text-sm text-muted-foreground">Create a shipment to get started</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredShipments?.map((shipment) => (
            <Card key={shipment.id}>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {shipment.shipmentType === 'b2b' ? 'LR#' : 'AWB#'} 
                        {shipment.lrNumber || shipment.waybillNumber || 'Pending'}
                      </span>
                      <Badge variant="outline">{shipment.shipmentType.toUpperCase()}</Badge>
                      {getStatusBadge(shipment.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">Order: {shipment.orderId}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{shipment.consigneeName}</p>
                    <p className="text-sm text-muted-foreground">{shipment.deliveryCity}, {shipment.deliveryPincode}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => trackMutation.mutate(shipment.id)}
                    disabled={trackMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> Track
                  </Button>
                  {shipment.status !== 'cancelled' && shipment.status !== 'delivered' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => cancelMutation.mutate(shipment.id)}
                      disabled={cancelMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateShipmentForm({ 
  shipmentType, 
  setShipmentType, 
  warehouses,
  onSuccess 
}: { 
  shipmentType: "b2c" | "b2b"; 
  setShipmentType: (v: "b2c" | "b2b") => void;
  warehouses: any[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    orderId: "",
    consigneeName: "",
    consigneePhone: "",
    consigneeAddress: "",
    consigneeCity: "",
    consigneeState: "",
    consigneePincode: "",
    consigneeGstin: "",
    productDescription: "",
    quantity: 1,
    weight: 0.5,
    paymentMode: "prepaid",
    codAmount: 0,
    invoiceAmount: 0,
    invoiceNumber: "",
    ewayBillNumber: "",
    senderGstin: "",
    pickupLocation: warehouses?.[0]?.name || "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = shipmentType === 'b2b' 
        ? '/api/admin/delhivery/shipments/b2b' 
        : '/api/admin/delhivery/shipments/b2c';
      const res = await apiRequest("POST", endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delhivery/shipments"] });
      toast({ title: "Shipment Created", description: "Shipment manifested successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button 
          variant={shipmentType === "b2c" ? "default" : "outline"}
          onClick={() => setShipmentType("b2c")}
          className="flex-1"
        >
          B2C Shipment
        </Button>
        <Button 
          variant={shipmentType === "b2b" ? "default" : "outline"}
          onClick={() => setShipmentType("b2b")}
          className="flex-1"
        >
          B2B Shipment
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Order ID</Label>
          <Input
            placeholder="Order reference"
            value={formData.orderId}
            onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Pickup Location</Label>
          <Select 
            value={formData.pickupLocation} 
            onValueChange={(v) => setFormData({ ...formData, pickupLocation: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses?.map((w) => (
                <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <h4 className="font-semibold mt-4">Consignee Details</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            placeholder="Receiver name"
            value={formData.consigneeName}
            onChange={(e) => setFormData({ ...formData, consigneeName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            placeholder="10-digit mobile"
            value={formData.consigneePhone}
            onChange={(e) => setFormData({ ...formData, consigneePhone: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Address</Label>
        <Input
          placeholder="Full delivery address"
          value={formData.consigneeAddress}
          onChange={(e) => setFormData({ ...formData, consigneeAddress: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            value={formData.consigneeCity}
            onChange={(e) => setFormData({ ...formData, consigneeCity: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Input
            value={formData.consigneeState}
            onChange={(e) => setFormData({ ...formData, consigneeState: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Pincode</Label>
          <Input
            maxLength={6}
            value={formData.consigneePincode}
            onChange={(e) => setFormData({ ...formData, consigneePincode: e.target.value })}
          />
        </div>
      </div>

      {shipmentType === "b2b" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sender GSTIN</Label>
            <Input
              placeholder="Your GSTIN"
              value={formData.senderGstin}
              onChange={(e) => setFormData({ ...formData, senderGstin: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Receiver GSTIN</Label>
            <Input
              placeholder="Consignee GSTIN"
              value={formData.consigneeGstin}
              onChange={(e) => setFormData({ ...formData, consigneeGstin: e.target.value })}
            />
          </div>
        </div>
      )}

      <h4 className="font-semibold mt-4">Package Details</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Weight (kg)</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Payment Mode</Label>
          <Select 
            value={formData.paymentMode} 
            onValueChange={(v) => setFormData({ ...formData, paymentMode: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prepaid">Prepaid</SelectItem>
              <SelectItem value="cod">Cash on Delivery</SelectItem>
              {shipmentType === "b2b" && <SelectItem value="fod">Freight on Delivery</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Product Description</Label>
        <Input
          placeholder="Description of goods"
          value={formData.productDescription}
          onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Invoice Amount (₹)</Label>
          <Input
            type="number"
            value={formData.invoiceAmount}
            onChange={(e) => setFormData({ ...formData, invoiceAmount: parseFloat(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input
            value={formData.invoiceNumber}
            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
          />
        </div>
      </div>

      {formData.paymentMode === "cod" && (
        <div className="space-y-2">
          <Label>COD Amount (₹)</Label>
          <Input
            type="number"
            value={formData.codAmount}
            onChange={(e) => setFormData({ ...formData, codAmount: parseFloat(e.target.value) })}
          />
        </div>
      )}

      {shipmentType === "b2b" && formData.invoiceAmount >= 50000 && (
        <div className="space-y-2">
          <Label>E-way Bill Number</Label>
          <Input
            placeholder="Required for value ≥ ₹50,000"
            value={formData.ewayBillNumber}
            onChange={(e) => setFormData({ ...formData, ewayBillNumber: e.target.value })}
          />
        </div>
      )}

      <Button 
        className="w-full" 
        onClick={() => createMutation.mutate(formData)}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? "Creating Shipment..." : `Create ${shipmentType.toUpperCase()} Shipment`}
      </Button>
    </div>
  );
}
