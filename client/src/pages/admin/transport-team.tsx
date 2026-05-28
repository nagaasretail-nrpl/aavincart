import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "./layout";
import { DISTRICT_UNIONS } from "@/lib/union-constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Truck,
  Plus,
  User,
  Users,
  Phone,
  Mail,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  Activity,
  RefreshCw,
  Search,
  Loader2,
} from "lucide-react";

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  unionId: string | null;
  assignedSegment: string | null;
  createdAt: string | null;
}

interface StaffMember {
  id: string;
  unionId: string;
  unionName: string;
  name: string;
  phone: string;
  email?: string;
  username?: string;
  designation: string;
  designationId: string;
  assignedSegments: string[];
  approvalStatus: string;
  isActive: boolean;
  createdAt: string;
}

interface Vehicle {
  id: string;
  merchantId: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  driverUserId: string | null;
  driverName: string;
  driverPhone: string;
  driverLicense: string;
  status: string;
}

const SEGMENTS = ["Fresh Milk", "Products", "Ice Cream"];

export default function TransportTeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const merchantId = user?.unionId || user?.id || "";

  const [activeTab, setActiveTab] = useState("managers");
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddManagerDialog, setShowAddManagerDialog] = useState(false);
  const [managerForm, setManagerForm] = useState({
    name: "",
    phone: "",
    employeeId: "",
    username: "",
    email: "",
    password: "",
    unionId: merchantId,
    segments: [] as string[],
  });

  const [showAddDriverDialog, setShowAddDriverDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [driverForm, setDriverForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    unionId: "",
    assignedSegment: "",
    vehicleId: "",
  });

  const TRANSPORT_DESIGNATION_IDS = [
    "transport_manager", "gm_transport", "agm_transport", "dgm_transport",
    "manager_transport", "logistics_coordinator",
  ];

  const { data: staffList = [], isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/admin/all-staff", "transport"],
    queryFn: async () => {
      const res = await fetch("/api/admin/all-staff", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ["/api/admin/delivery-drivers"],
  });

  const { data: vehiclesList = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles", merchantId],
    enabled: !!merchantId,
  });

  const transportManagers = staffList.filter(
    (s) => TRANSPORT_DESIGNATION_IDS.includes(s.designationId) ||
           (s.department && (s.department.toLowerCase() === "transport" || s.department.toLowerCase() === "delivery"))
  );

  const filteredManagers = transportManagers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.phone && m.phone.includes(searchQuery))
  );

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.email && d.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.phone && d.phone.includes(searchQuery))
  );

  const createManagerMutation = useMutation({
    mutationFn: async (data: typeof managerForm) => {
      const targetUnionId = data.unionId || merchantId;
      const res = await apiRequest("POST", `/api/union/${targetUnionId}/staff`, {
        name: data.name,
        phone: data.phone,
        email: data.email,
        employeeId: data.employeeId,
        username: data.username,
        password: data.password,
        department: "delivery",
        designationId: "transport_manager",
        accessTier: "transport",
        assignedSegments: data.segments,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-staff"] });
      toast({ title: "Transport Manager Created" });
      setShowAddManagerDialog(false);
      setManagerForm({ name: "", phone: "", employeeId: "", username: "", email: "", password: "", unionId: merchantId, segments: [] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createDriverMutation = useMutation({
    mutationFn: async (data: typeof driverForm) => {
      const res = await apiRequest("POST", "/api/admin/delivery-drivers", {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        unionId: data.unionId,
        assignedSegment: data.assignedSegment,
      });
      const result = await res.json();
      if (data.vehicleId && result.id) {
        await apiRequest("PATCH", `/api/vehicles/${data.vehicleId}`, {
          driverUserId: result.id,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-drivers"] });
      toast({ title: "Driver Created" });
      setShowAddDriverDialog(false);
      setDriverForm({ name: "", email: "", phone: "", password: "", unionId: "", assignedSegment: "", vehicleId: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const assignDriverToVehicleMutation = useMutation({
    mutationFn: async ({ vehicleId, driverUserId }: { vehicleId: string; driverUserId: string }) => {
      const res = await apiRequest("PATCH", `/api/vehicles/${vehicleId}`, { driverUserId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", merchantId] });
      toast({ title: "Driver Assigned to Vehicle" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleSegment = (segment: string) => {
    setManagerForm((prev) => ({
      ...prev,
      segments: prev.segments.includes(segment)
        ? prev.segments.filter((s) => s !== segment)
        : [...prev.segments, segment],
    }));
  };

  const availableVehicles = vehiclesList.filter((v) => !v.driverUserId && v.status !== "inactive");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Transport Team</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Manage transport managers, drivers, and vehicle assignments</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="managers" className="text-xs sm:text-sm">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Transport Managers
            </TabsTrigger>
            <TabsTrigger value="drivers" className="text-xs sm:text-sm">
              <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Drivers
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="text-xs sm:text-sm">
              <Truck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Vehicles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="managers" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="p-3">
                  <p className="text-purple-100 text-xs">Total Managers</p>
                  <p className="text-2xl font-bold">{transportManagers.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-3">
                  <p className="text-green-100 text-xs">Active</p>
                  <p className="text-2xl font-bold">{transportManagers.filter((m) => m.isActive).length}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-3">
                  <p className="text-blue-100 text-xs">Pending Approval</p>
                  <p className="text-2xl font-bold">{transportManagers.filter((m) => m.approvalStatus === "pending").length}</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowAddManagerDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Transport Manager
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {staffLoading ? (
                  <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                ) : filteredManagers.length === 0 ? (
                  <div className="p-12 text-center">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Transport Managers</h3>
                    <p className="text-muted-foreground">Add a transport manager to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone / Username</TableHead>
                          <TableHead>Union</TableHead>
                          <TableHead>Segments</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredManagers.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center">
                                  <Shield className="h-3.5 w-3.5 text-purple-600" />
                                </div>
                                {m.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3 text-muted-foreground" />{m.phone}</div>
                                {m.username && <div className="text-xs text-muted-foreground">@{m.username}</div>}
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline">{m.unionName || m.unionId}</Badge></TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(m.assignedSegments || []).map((seg) => (
                                  <Badge key={seg} variant="secondary" className="text-xs">{seg}</Badge>
                                ))}
                                {(!m.assignedSegments || m.assignedSegments.length === 0) && (
                                  <span className="text-xs text-muted-foreground">All</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {m.isActive && m.approvalStatus === "approved" ? (
                                <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
                              ) : m.approvalStatus === "pending" ? (
                                <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-3">
                  <p className="text-blue-100 text-xs">Total Drivers</p>
                  <p className="text-2xl font-bold">{drivers.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-3">
                  <p className="text-green-100 text-xs">Assigned to Vehicle</p>
                  <p className="text-2xl font-bold">{vehiclesList.filter((v) => v.driverUserId).length}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                <CardContent className="p-3">
                  <p className="text-indigo-100 text-xs">Unassigned</p>
                  <p className="text-2xl font-bold">{drivers.length - vehiclesList.filter((v) => v.driverUserId).length}</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end mb-4">
              <Button onClick={() => { setDriverForm({ name: "", email: "", phone: "", password: "", unionId: "", assignedSegment: "", vehicleId: "" }); setShowAddDriverDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {driversLoading ? (
                  <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                ) : filteredDrivers.length === 0 ? (
                  <div className="p-12 text-center">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Drivers</h3>
                    <p className="text-muted-foreground">Add a driver to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email / Login</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Union</TableHead>
                          <TableHead>Segment</TableHead>
                          <TableHead>Assigned Vehicle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDrivers.map((d) => {
                          const assignedVehicle = vehiclesList.find((v) => v.driverUserId === d.id);
                          return (
                            <TableRow key={d.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="h-3.5 w-3.5 text-blue-600" />
                                  </div>
                                  {d.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3 text-muted-foreground" />{d.email}</div>
                              </TableCell>
                              <TableCell>
                                {d.phone ? (
                                  <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3 text-muted-foreground" />{d.phone}</div>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {d.unionId ? <Badge variant="outline">{d.unionId}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {d.assignedSegment ? <Badge variant="secondary">{d.assignedSegment}</Badge> : <span className="text-xs text-muted-foreground">All</span>}
                              </TableCell>
                              <TableCell>
                                {assignedVehicle ? (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    <Truck className="h-3 w-3 mr-1" />{assignedVehicle.vehicleNumber}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Not assigned</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-3">
                  <p className="text-blue-100 text-xs">Total Fleet</p>
                  <p className="text-2xl font-bold">{vehiclesList.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-3">
                  <p className="text-green-100 text-xs">With Driver</p>
                  <p className="text-2xl font-bold">{vehiclesList.filter((v) => v.driverUserId || v.driverName).length}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-3">
                  <p className="text-orange-100 text-xs">No Driver</p>
                  <p className="text-2xl font-bold">{vehiclesList.filter((v) => !v.driverUserId && !v.driverName).length}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                <CardContent className="p-3">
                  <p className="text-indigo-100 text-xs">Available</p>
                  <p className="text-2xl font-bold">{vehiclesList.filter((v) => v.status === "available").length}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                {vehiclesLoading ? (
                  <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
                ) : vehiclesList.length === 0 ? (
                  <div className="p-12 text-center">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Vehicles</h3>
                    <p className="text-muted-foreground">Add vehicles from Transport Master.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vehicle No</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Assigned Driver</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assign Driver</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehiclesList.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.vehicleNumber}</TableCell>
                            <TableCell className="capitalize">{v.vehicleType}</TableCell>
                            <TableCell>{v.capacity || "—"}</TableCell>
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
                                  <Badge className="ml-2 bg-yellow-100 text-yellow-800 text-[10px]">Legacy</Badge>
                                  {v.driverPhone && <span className="text-xs text-muted-foreground ml-2">{v.driverPhone}</span>}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not assigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {v.status === "available" ? (
                                <Badge className="bg-green-500 hover:bg-green-600">Available</Badge>
                              ) : v.status === "on_delivery" ? (
                                <Badge className="bg-blue-500 hover:bg-blue-600">On Delivery</Badge>
                              ) : v.status === "maintenance" ? (
                                <Badge className="bg-orange-500 hover:bg-orange-600">Maintenance</Badge>
                              ) : (
                                <Badge variant="secondary">{v.status}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={v.driverUserId || ""}
                                onValueChange={(driverId) => {
                                  if (driverId) {
                                    assignDriverToVehicleMutation.mutate({ vehicleId: v.id, driverUserId: driverId });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select driver" />
                                </SelectTrigger>
                                <SelectContent>
                                  {drivers.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {d.name} {d.phone ? `(${d.phone})` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showAddManagerDialog} onOpenChange={setShowAddManagerDialog}>
          <DialogContent className="w-[95vw] sm:w-auto">
            <DialogHeader>
              <DialogTitle>Add Transport Manager</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={managerForm.name} onChange={(e) => setManagerForm((p) => ({ ...p, name: e.target.value }))} placeholder="Manager name" />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input value={managerForm.phone} onChange={(e) => setManagerForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee ID *</Label>
                  <Input value={managerForm.employeeId} onChange={(e) => setManagerForm((p) => ({ ...p, employeeId: e.target.value }))} placeholder="e.g. TM-001" />
                </div>
                <div>
                  <Label>Designation</Label>
                  <Input value="Transport Manager" disabled className="bg-muted" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Username *</Label>
                  <Input value={managerForm.username} onChange={(e) => setManagerForm((p) => ({ ...p, username: e.target.value }))} placeholder="Login username" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={managerForm.email} onChange={(e) => setManagerForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" />
                </div>
              </div>
              <div>
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={managerForm.password}
                    onChange={(e) => setManagerForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Set password"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Union</Label>
                <Select value={managerForm.unionId} onValueChange={(v) => setManagerForm((p) => ({ ...p, unionId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select union" /></SelectTrigger>
                  <SelectContent>
                    {DISTRICT_UNIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Segment Scope</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {SEGMENTS.map((seg) => (
                    <label key={seg} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={managerForm.segments.includes(seg)}
                        onCheckedChange={() => toggleSegment(seg)}
                      />
                      {seg}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddManagerDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!managerForm.name || !managerForm.phone || !managerForm.employeeId || !managerForm.username || !managerForm.password) {
                    toast({ title: "Missing Fields", description: "Name, phone, employee ID, username, and password are required", variant: "destructive" });
                    return;
                  }
                  createManagerMutation.mutate(managerForm);
                }}
                disabled={createManagerMutation.isPending}
              >
                {createManagerMutation.isPending ? "Creating..." : "Create Manager"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddDriverDialog} onOpenChange={setShowAddDriverDialog}>
          <DialogContent className="w-[95vw] sm:w-auto">
            <DialogHeader>
              <DialogTitle>Add Driver</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={driverForm.name} onChange={(e) => setDriverForm((p) => ({ ...p, name: e.target.value }))} placeholder="Driver name" />
                </div>
                <div>
                  <Label>Email / Login ID *</Label>
                  <Input value={driverForm.email} onChange={(e) => setDriverForm((p) => ({ ...p, email: e.target.value }))} placeholder="driver@email.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input value={driverForm.phone} onChange={(e) => setDriverForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
                </div>
                <div>
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={driverForm.password}
                      onChange={(e) => setDriverForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Set password"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Union</Label>
                  <Select value={driverForm.unionId} onValueChange={(v) => setDriverForm((p) => ({ ...p, unionId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select union" /></SelectTrigger>
                    <SelectContent>
                      {DISTRICT_UNIONS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Segment</Label>
                  <Select value={driverForm.assignedSegment} onValueChange={(v) => setDriverForm((p) => ({ ...p, assignedSegment: v }))}>
                    <SelectTrigger><SelectValue placeholder="All segments" /></SelectTrigger>
                    <SelectContent>
                      {SEGMENTS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Vehicle Assignment (optional)</Label>
                <Select value={driverForm.vehicleId} onValueChange={(v) => setDriverForm((p) => ({ ...p, vehicleId: v }))}>
                  <SelectTrigger><SelectValue placeholder="No vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vehicle</SelectItem>
                    {availableVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.vehicleType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDriverDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!driverForm.name || !driverForm.email || !driverForm.password) {
                    toast({ title: "Missing Fields", description: "Name, email, and password are required", variant: "destructive" });
                    return;
                  }
                  const submitData = { ...driverForm };
                  if (submitData.vehicleId === "none") submitData.vehicleId = "";
                  createDriverMutation.mutate(submitData);
                }}
                disabled={createDriverMutation.isPending}
              >
                {createDriverMutation.isPending ? "Creating..." : "Create Driver"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
