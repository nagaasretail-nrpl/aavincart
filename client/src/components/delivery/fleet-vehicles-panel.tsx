import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Truck, Plus, Edit, MapPin, Trash2, RefreshCw,
  CheckCircle, Activity, Ban,
} from "lucide-react";

interface Vehicle {
  id: string;
  merchantId: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  driverUserId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  driverLicense: string | null;
  currentLat: string | null;
  currentLng: string | null;
  status: string;
  updatedAt: string;
}

interface DriverAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface FleetVehiclesPanelProps {
  merchantId: string;
  isAdmin: boolean;
}

const VEHICLE_TYPES = ["refrigerated", "frozen", "insulated", "standard", "van", "truck", "tempo", "bike", "auto"];

function vehicleStatusBadge(status: string) {
  switch (status) {
    case "available":
      return <Badge className="bg-green-500 hover:bg-green-600">Available</Badge>;
    case "on_delivery":
      return <Badge className="bg-blue-500 hover:bg-blue-600">On Delivery</Badge>;
    case "maintenance":
      return <Badge className="bg-orange-500 hover:bg-orange-600">Maintenance</Badge>;
    case "inactive":
      return <Badge variant="secondary">Inactive</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function FleetVehiclesPanel({ merchantId, isAdmin }: FleetVehiclesPanelProps) {
  const { toast } = useToast();

  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [locationDialog, setLocationDialog] = useState<Vehicle | null>(null);
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");

  const [vForm, setVForm] = useState({
    vehicleNumber: "",
    vehicleType: "van",
    capacity: "",
    driverUserId: "",
    driverName: "",
    driverPhone: "",
    driverLicense: "",
  });

  const { data: vehicles = [], isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles", merchantId],
    enabled: !!merchantId,
  });

  const { data: driverAccounts = [] } = useQuery<DriverAccount[]>({
    queryKey: ["/api/admin/delivery-drivers"],
  });

  const addVehicleMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/vehicles", { ...data, merchantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", merchantId] });
      toast({ title: "Success", description: "Vehicle added successfully" });
      closeVehicleDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => apiRequest("PATCH", `/api/vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", merchantId] });
      toast({ title: "Success", description: "Vehicle updated successfully" });
      closeVehicleDialog();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, currentLat, currentLng }: { id: string; currentLat: string; currentLng: string }) =>
      apiRequest("PATCH", `/api/vehicles/${id}/location`, { currentLat, currentLng }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", merchantId] });
      toast({ title: "Success", description: "Location updated" });
      setLocationDialog(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deactivateVehicleMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/vehicles/${id}`, { status: "inactive" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", merchantId] });
      toast({ title: "Vehicle deactivated" });
    },
  });

  function closeVehicleDialog() {
    setVehicleDialog(false);
    setEditingVehicle(null);
    setVForm({ vehicleNumber: "", vehicleType: "van", capacity: "", driverUserId: "", driverName: "", driverPhone: "", driverLicense: "" });
  }

  function openEditVehicle(v: Vehicle) {
    setEditingVehicle(v);
    setVForm({
      vehicleNumber: v.vehicleNumber,
      vehicleType: v.vehicleType,
      capacity: String(v.capacity),
      driverUserId: v.driverUserId || "",
      driverName: v.driverName || "",
      driverPhone: v.driverPhone || "",
      driverLicense: v.driverLicense || "",
    });
    setVehicleDialog(true);
  }

  function openLocationDialog(v: Vehicle) {
    setLocationDialog(v);
    setLatInput(v.currentLat || "");
    setLngInput(v.currentLng || "");
  }

  function handleVehicleSubmit() {
    const payload: any = {
      vehicleNumber: vForm.vehicleNumber,
      vehicleType: vForm.vehicleType,
      capacity: Number(vForm.capacity),
      driverName: vForm.driverName,
      driverPhone: vForm.driverPhone,
      driverLicense: vForm.driverLicense,
    };
    if (vForm.driverUserId) {
      payload.driverUserId = vForm.driverUserId;
    }
    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, ...payload });
    } else {
      addVehicleMutation.mutate(payload);
    }
  }

  function handleDriverSelect(driverId: string) {
    if (driverId === "manual") {
      setVForm((p) => ({ ...p, driverUserId: "", driverName: "", driverPhone: "", driverLicense: "" }));
      return;
    }
    const driver = driverAccounts.find((d) => d.id === driverId);
    if (driver) {
      setVForm((p) => ({
        ...p,
        driverUserId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone || "",
        driverLicense: "",
      }));
    }
  }

  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter((v) => v.status === "available").length;
  const onDeliveryVehicles = vehicles.filter((v) => v.status === "on_delivery").length;
  const inactiveVehicles = vehicles.filter((v) => v.status === "inactive").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Fleet & Vehicles</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Vehicle Master Data</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchVehicles()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Total Fleet</p>
                <p className="text-xl sm:text-2xl font-bold">{totalVehicles}</p>
              </div>
              <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">Available</p>
                <p className="text-xl sm:text-2xl font-bold">{availableVehicles}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs">On Delivery</p>
                <p className="text-xl sm:text-2xl font-bold">{onDeliveryVehicles}</p>
              </div>
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-200 text-xs">Inactive</p>
                <p className="text-xl sm:text-2xl font-bold">{inactiveVehicles}</p>
              </div>
              <Ban className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setEditingVehicle(null); setVForm({ vehicleNumber: "", vehicleType: "van", capacity: "", driverUserId: "", driverName: "", driverPhone: "", driverLicense: "" }); setVehicleDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {vehiclesLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading vehicles...</div>
          ) : vehicles.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Vehicles</h3>
              <p className="text-muted-foreground">Add your first vehicle to get started.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle No</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Assigned Driver</TableHead>
                      <TableHead>GPS Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.vehicleNumber}</TableCell>
                        <TableCell className="capitalize">{v.vehicleType}</TableCell>
                        <TableCell>{v.capacity}</TableCell>
                        <TableCell>
                          {v.driverUserId ? (
                            <div>
                              <span className="font-medium">{v.driverName}</span>
                              <Badge className="ml-2 bg-green-100 text-green-800 text-[10px]">Linked</Badge>
                              {v.driverPhone && <span className="text-xs text-muted-foreground ml-2">{v.driverPhone}</span>}
                            </div>
                          ) : v.driverName ? (
                            <div>
                              <span className="font-medium">{v.driverName}</span>
                              <span className="text-xs text-muted-foreground ml-2">{v.driverPhone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {v.currentLat && v.currentLng ? (
                            <span className="text-xs">{v.currentLat}, {v.currentLng}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{vehicleStatusBadge(v.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEditVehicle(v)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openLocationDialog(v)}>
                              <MapPin className="h-3 w-3" />
                            </Button>
                            {v.status !== "inactive" && (
                              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => deactivateVehicleMutation.mutate(v.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-2 p-3">
                {vehicles.map((v) => (
                  <Card key={v.id} className="border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{v.vehicleNumber}</span>
                        {vehicleStatusBadge(v.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <span>Type: <span className="capitalize">{v.vehicleType}</span></span>
                        <span>Capacity: {v.capacity}</span>
                        <span>Driver: {v.driverName || "N/A"}</span>
                        <span>Phone: {v.driverPhone || "N/A"}</span>
                      </div>
                      <div className="flex gap-1 pt-1">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditVehicle(v)}>
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openLocationDialog(v)}>
                          <MapPin className="h-3 w-3" />
                        </Button>
                        {v.status !== "inactive" && (
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => deactivateVehicleMutation.mutate(v.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={vehicleDialog} onOpenChange={(open) => !open && closeVehicleDialog()}>
        <DialogContent className="w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input id="vehicleNumber" value={vForm.vehicleNumber} onChange={(e) => setVForm((p) => ({ ...p, vehicleNumber: e.target.value }))} placeholder="TN 30 AB 1234" />
            </div>
            <div>
              <Label htmlFor="vehicleType">Vehicle Type</Label>
              <Select value={vForm.vehicleType} onValueChange={(val) => setVForm((p) => ({ ...p, vehicleType: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="capacity">Capacity (kg)</Label>
              <Input id="capacity" type="number" value={vForm.capacity} onChange={(e) => setVForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="e.g. 2000" />
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Assign Driver</p>
              <div className="space-y-3">
                <div>
                  <Label>Select Driver Account</Label>
                  <Select value={vForm.driverUserId || "manual"} onValueChange={handleDriverSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a driver account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">— Enter manually —</SelectItem>
                      {driverAccounts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} {d.phone ? `(${d.phone})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {vForm.driverUserId ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Driver: {vForm.driverName}</p>
                    {vForm.driverPhone && <p className="text-xs text-green-600 dark:text-green-400">Phone: {vForm.driverPhone}</p>}
                    <p className="text-xs text-green-600 dark:text-green-400">Linked to login-capable account</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="driverName">Driver Name</Label>
                      <Input id="driverName" value={vForm.driverName} onChange={(e) => setVForm((p) => ({ ...p, driverName: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="driverPhone">Driver Phone</Label>
                        <Input id="driverPhone" value={vForm.driverPhone} onChange={(e) => setVForm((p) => ({ ...p, driverPhone: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="driverLicense">License Number</Label>
                        <Input id="driverLicense" value={vForm.driverLicense} onChange={(e) => setVForm((p) => ({ ...p, driverLicense: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeVehicleDialog}>Cancel</Button>
            <Button onClick={handleVehicleSubmit} disabled={addVehicleMutation.isPending || updateVehicleMutation.isPending}>
              {addVehicleMutation.isPending || updateVehicleMutation.isPending ? "Saving..." : editingVehicle ? "Update" : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!locationDialog} onOpenChange={(open) => !open && setLocationDialog(null)}>
        <DialogContent className="w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>Update GPS Location</DialogTitle>
          </DialogHeader>
          {locationDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Vehicle: {locationDialog.vehicleNumber}</p>
              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input id="lat" value={latInput} onChange={(e) => setLatInput(e.target.value)} placeholder="e.g. 13.1087" />
              </div>
              <div>
                <Label htmlFor="lng">Longitude</Label>
                <Input id="lng" value={lngInput} onChange={(e) => setLngInput(e.target.value)} placeholder="e.g. 80.1793" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationDialog(null)}>Cancel</Button>
            <Button
              onClick={() => locationDialog && updateLocationMutation.mutate({ id: locationDialog.id, currentLat: latInput, currentLng: lngInput })}
              disabled={updateLocationMutation.isPending}
            >
              {updateLocationMutation.isPending ? "Updating..." : "Update Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
