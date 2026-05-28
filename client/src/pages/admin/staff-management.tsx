import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DISTRICT_UNIONS } from "@/lib/union-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Milk,
  Package,
  IceCream,
  Shield,
  MoreHorizontal,
  ArrowRightLeft,
  Trash2,
} from "lucide-react";
import AdminLayout from "./layout";

interface StaffMember {
  id: string;
  unionId: string;
  unionName: string;
  name: string;
  phone: string;
  email?: string;
  employeeId?: string;
  department?: string;
  designation: string;
  designationId: string;
  level: number;
  accessTier: string;
  permissions: string[];
  assignedSegments: string[];
  salesSegment?: string;
  approvalStatus: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

const SEGMENT_META: Record<string, { label: string; color: string; bgColor: string; icon: typeof Milk }> = {
  FM: { label: "Fresh Milk", color: "text-blue-800", bgColor: "bg-blue-100", icon: Milk },
  DP: { label: "Dairy Products", color: "text-amber-800", bgColor: "bg-amber-100", icon: Package },
  IC: { label: "Ice Cream", color: "text-pink-800", bgColor: "bg-pink-100", icon: IceCream },
};

const TRANSFER_DEPARTMENTS = [
  "Administration", "Transport", "Sales", "Production",
  "Quality Control", "Accounts", "Marketing", "IT",
];

const TRANSFER_DESIGNATIONS: Record<string, { id: string; label: string; backendDept: string }[]> = {
  Administration: [
    { id: "gm", label: "General Manager", backendDept: "Administration" },
    { id: "agm_admin", label: "AGM (Admin)", backendDept: "Administration" },
    { id: "office_staff", label: "Office Staff", backendDept: "Administration" },
  ],
  Transport: [
    { id: "gm_transport", label: "GM – Transport", backendDept: "delivery" },
    { id: "agm_transport", label: "AGM – Transport", backendDept: "delivery" },
    { id: "transport_manager", label: "Transport Manager", backendDept: "delivery" },
    { id: "dgm_transport", label: "DGM – Transport", backendDept: "delivery" },
    { id: "manager_transport", label: "Manager – Transport", backendDept: "delivery" },
    { id: "logistics_coordinator", label: "Logistics Coordinator", backendDept: "delivery" },
  ],
  Sales: [
    { id: "sales_manager", label: "Sales Manager", backendDept: "Sales" },
    { id: "sales_executive", label: "Sales Executive", backendDept: "Sales" },
    { id: "area_manager", label: "Area Manager", backendDept: "Sales" },
  ],
  Production: [
    { id: "production_manager", label: "Production Manager", backendDept: "Production" },
    { id: "manager_packing", label: "Packing Manager", backendDept: "Production" },
    { id: "shift_incharge", label: "Shift In-Charge", backendDept: "Production" },
  ],
  "Quality Control": [
    { id: "qc_manager", label: "QC Manager", backendDept: "Quality Control" },
    { id: "qc_inspector", label: "QC Inspector", backendDept: "Quality Control" },
  ],
  Accounts: [
    { id: "accounts_manager", label: "Accounts Manager", backendDept: "Accounts" },
    { id: "accounts_officer", label: "Accounts Officer", backendDept: "Accounts" },
  ],
  Marketing: [
    { id: "marketing_manager", label: "Marketing Manager", backendDept: "Marketing" },
  ],
  IT: [
    { id: "it_admin", label: "IT Admin", backendDept: "IT" },
  ],
};

const TRANSFER_ACCESS_TIERS = [
  { id: "full", label: "Full Access", desc: "All modules" },
  { id: "manager", label: "Manager", desc: "Orders, Inventory, Reports" },
  { id: "transport", label: "Transport Management", desc: "Dashboard + Delivery modules" },
  { id: "operational", label: "Operational", desc: "Dashboard only" },
  { id: "union", label: "Union Level", desc: "Union-scoped access" },
];

function getDesignationLabel(designationId: string, department: string): string {
  const desigs = TRANSFER_DESIGNATIONS[department] || [];
  const found = desigs.find(d => d.id === designationId);
  return found?.label || designationId;
}

export default function StaffManagementPage() {
  const { toast } = useToast();
  const [unionFilter, setUnionFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [transferForm, setTransferForm] = useState({
    department: "",
    designationId: "",
    accessTier: "",
    newUnionId: "",
  });

  const queryParams = new URLSearchParams();
  if (unionFilter !== "all") queryParams.set("unionId", unionFilter);
  if (departmentFilter !== "all") queryParams.set("department", departmentFilter);
  if (segmentFilter !== "all") queryParams.set("segment", segmentFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (searchQuery) queryParams.set("search", searchQuery);

  const queryString = queryParams.toString();
  const endpoint = `/api/admin/all-staff${queryString ? `?${queryString}` : ""}`;

  const { data: staffList = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/admin/all-staff", unionFilter, departmentFilter, segmentFilter, statusFilter, searchQuery],
    queryFn: async () => {
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, isActive, approvalStatus }: { id: string; isActive: boolean; approvalStatus?: string }) => {
      const body: any = { isActive };
      if (approvalStatus) body.approvalStatus = approvalStatus;
      const res = await apiRequest("PATCH", `/api/admin/staff/${id}/status`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-staff"] });
      toast({ title: "Status Updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ staffIds, isActive }: { staffIds: string[]; isActive: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/staff/bulk-status", { staffIds, isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-staff"] });
      setSelectedIds(new Set());
      toast({ title: "Bulk Status Updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({ staffId, unionId, data }: { staffId: string; unionId: string; data: typeof transferForm }) => {
      const desigEntry = TRANSFER_DESIGNATIONS[data.department]?.find(d => d.id === data.designationId);
      const backendDept = desigEntry?.backendDept || data.department;
      const designation = desigEntry?.label || data.designationId;
      const payload: any = {
        department: backendDept,
        designationId: data.designationId,
        designation,
        accessTier: data.accessTier,
      };
      if (data.newUnionId && data.newUnionId !== unionId) {
        payload.newUnionId = data.newUnionId;
      }
      const res = await apiRequest("PUT", `/api/union/${unionId}/staff/${staffId}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-staff"] });
      toast({ title: "Staff member transferred successfully" });
      setShowTransferDialog(false);
      setSelectedStaff(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ staffId, unionId }: { staffId: string; unionId: string }) => {
      const res = await apiRequest("DELETE", `/api/union/${unionId}/staff/${staffId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-staff"] });
      toast({ title: "Staff member deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openTransfer(staff: StaffMember) {
    setSelectedStaff(staff);
    const deptMatch = TRANSFER_DEPARTMENTS.find(d =>
      (TRANSFER_DESIGNATIONS[d] || []).some(des => des.id === staff.designationId)
    );
    const dept = deptMatch || "Administration";
    const desigs = TRANSFER_DESIGNATIONS[dept] || [];
    const hasDesig = desigs.some(d => d.id === staff.designationId);
    setTransferForm({
      department: dept,
      designationId: hasDesig ? staff.designationId : (desigs[0]?.id || ""),
      accessTier: staff.accessTier || "operational",
      newUnionId: staff.unionId || "",
    });
    setShowTransferDialog(true);
  }

  const totalCount = staffList.length;
  const activeCount = staffList.filter((s) => s.isActive && s.approvalStatus === "approved").length;
  const inactiveCount = staffList.filter((s) => !s.isActive && s.approvalStatus !== "pending").length;
  const pendingCount = staffList.filter((s) => s.approvalStatus === "pending").length;

  const unions = Array.from(new Set(staffList.map((s) => s.unionName).filter(Boolean)));
  const departments = Array.from(new Set(staffList.map((s) => s.department).filter(Boolean))) as string[];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === staffList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(staffList.map((s) => s.id)));
    }
  };

  const handleBulkAction = (isActive: boolean) => {
    if (selectedIds.size === 0) return;
    bulkStatusMutation.mutate({ staffIds: Array.from(selectedIds), isActive });
  };

  const getStatusBadge = (staff: StaffMember) => {
    if (staff.approvalStatus === "pending") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800" variant="secondary">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
    }
    if (staff.isActive) {
      return (
        <Badge className="bg-green-100 text-green-800" variant="secondary">
          <CheckCircle className="h-3 w-3 mr-1" /> Active
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800" variant="secondary">
        <XCircle className="h-3 w-3 mr-1" /> Inactive
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-full overflow-hidden">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Staff Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage all staff accounts across unions, departments, and segments
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("active")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("inactive")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{inactiveCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("pending")}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Select value={unionFilter} onValueChange={setUnionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Union" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Unions</SelectItem>
                  {unions.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="FM">Fresh Milk (FM)</SelectItem>
                  <SelectItem value="DP">Dairy Products (DP)</SelectItem>
                  <SelectItem value="IC">Ice Cream (IC)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedIds.size > 0 && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium">{selectedIds.size} staff selected</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction(true)}
                  disabled={bulkStatusMutation.isPending}
                >
                  {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Bulk Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction(false)}
                  disabled={bulkStatusMutation.isPending}
                >
                  {bulkStatusMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Bulk Deactivate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Staff ({totalCount})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive ({inactiveCount})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          </TabsList>

          {["all", "active", "inactive", "pending"].map((tab) => {
            const tabFiltered = staffList.filter((s) => {
              if (tab === "active") return s.isActive && s.approvalStatus === "approved";
              if (tab === "inactive") return !s.isActive && s.approvalStatus !== "pending";
              if (tab === "pending") return s.approvalStatus === "pending";
              return true;
            });

            return (
              <TabsContent key={tab} value={tab}>
                <Card>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Loading staff...</span>
                      </div>
                    ) : tabFiltered.length === 0 ? (
                      <p className="text-center py-12 text-muted-foreground">No staff found</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={selectedIds.size === staffList.length && staffList.length > 0}
                                  onCheckedChange={toggleSelectAll}
                                />
                              </TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Employee ID</TableHead>
                              <TableHead>Union</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Designation</TableHead>
                              <TableHead>Segments</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tabFiltered.map((staff) => {
                              const segments = staff.assignedSegments || [];
                              return (
                                <TableRow key={staff.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedIds.has(staff.id)}
                                      onCheckedChange={() => toggleSelect(staff.id)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{staff.name}</p>
                                      <p className="text-xs text-muted-foreground">{staff.phone}</p>
                                      {staff.email && <p className="text-xs text-muted-foreground">{staff.email}</p>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{staff.employeeId || "—"}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{staff.unionName || staff.unionId}</Badge>
                                  </TableCell>
                                  <TableCell>{staff.department || "—"}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{staff.designation || staff.designationId}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {segments.map((seg) => {
                                        const meta = SEGMENT_META[seg];
                                        if (!meta) return null;
                                        const SegIcon = meta.icon;
                                        return (
                                          <Badge key={seg} className={`${meta.bgColor} ${meta.color}`} variant="secondary">
                                            <SegIcon className="h-3 w-3 mr-1" />
                                            {meta.label}
                                          </Badge>
                                        );
                                      })}
                                      {segments.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell>{getStatusBadge(staff)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {staff.approvalStatus === "pending" && (
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-600 hover:text-green-700"
                                            disabled={statusMutation.isPending}
                                            onClick={() =>
                                              statusMutation.mutate({
                                                id: staff.id,
                                                isActive: true,
                                                approvalStatus: "approved",
                                              })
                                            }
                                          >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Approve
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700"
                                            disabled={statusMutation.isPending}
                                            onClick={() =>
                                              statusMutation.mutate({
                                                id: staff.id,
                                                isActive: false,
                                                approvalStatus: "rejected",
                                              })
                                            }
                                          >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Reject
                                          </Button>
                                        </div>
                                      )}
                                      {staff.approvalStatus !== "pending" && (
                                        <Switch
                                          checked={staff.isActive}
                                          onCheckedChange={(checked) =>
                                            statusMutation.mutate({ id: staff.id, isActive: checked })
                                          }
                                          disabled={statusMutation.isPending}
                                        />
                                      )}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => openTransfer(staff)}>
                                            <ArrowRightLeft className="h-4 w-4 mr-2 text-blue-500" /> Transfer / Reassign
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-red-600"
                                            onClick={() => {
                                              if (confirm(`Delete ${staff.name}? This cannot be undone.`)) {
                                                deleteMutation.mutate({ staffId: staff.id, unionId: staff.unionId });
                                              }
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
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
            );
          })}
        </Tabs>

        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent className="w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" /> Transfer / Reassign Staff
              </DialogTitle>
            </DialogHeader>
            {selectedStaff && (
              <div className="space-y-4">
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="font-medium">{selectedStaff.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedStaff.phone} · {selectedStaff.unionName || selectedStaff.unionId}</p>
                  <p className="text-sm text-muted-foreground">Current: {selectedStaff.designation} ({selectedStaff.department})</p>
                </div>
                <div>
                  <Label>Transfer to Union</Label>
                  <Select
                    value={transferForm.newUnionId}
                    onValueChange={(v) => setTransferForm(p => ({ ...p, newUnionId: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Same union (no transfer)" /></SelectTrigger>
                    <SelectContent>
                      {DISTRICT_UNIONS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {transferForm.newUnionId && transferForm.newUnionId !== selectedStaff.unionId && (
                    <p className="text-xs text-orange-600 mt-1">
                      Staff will be transferred from {DISTRICT_UNIONS.find(u => u.value === selectedStaff.unionId)?.label || selectedStaff.unionId} → {DISTRICT_UNIONS.find(u => u.value === transferForm.newUnionId)?.label || transferForm.newUnionId}
                    </p>
                  )}
                </div>
                <div>
                  <Label>New Department *</Label>
                  <Select
                    value={transferForm.department}
                    onValueChange={(v) => {
                      const firstDesig = TRANSFER_DESIGNATIONS[v]?.[0]?.id || "";
                      setTransferForm(p => ({ ...p, department: v, designationId: firstDesig }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRANSFER_DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>New Designation *</Label>
                  <Select
                    value={transferForm.designationId}
                    onValueChange={(v) => setTransferForm(p => ({ ...p, designationId: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(TRANSFER_DESIGNATIONS[transferForm.department] || []).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Access Tier *</Label>
                  <Select
                    value={transferForm.accessTier}
                    onValueChange={(v) => setTransferForm(p => ({ ...p, accessTier: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRANSFER_ACCESS_TIERS.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.label} — {t.desc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!selectedStaff || !transferForm.department || !transferForm.designationId || !transferForm.accessTier) {
                    toast({ title: "Missing Fields", description: "Please fill all fields", variant: "destructive" });
                    return;
                  }
                  transferMutation.mutate({
                    staffId: selectedStaff.id,
                    unionId: selectedStaff.unionId,
                    data: transferForm,
                  });
                }}
                disabled={transferMutation.isPending}
              >
                {transferMutation.isPending ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
