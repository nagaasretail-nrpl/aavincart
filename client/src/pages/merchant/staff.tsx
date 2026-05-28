import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { DISTRICT_UNIONS } from "@/lib/union-constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { parseXlsxToRows, downloadSampleExcel, SAMPLE_EXCEL_CONFIGS } from "@/lib/excel-utils";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Shield, Search, RefreshCw, Users, UserCheck, Clock,
  Plus, CheckCircle, XCircle, Trash2, ArrowRightLeft,
  MoreHorizontal, Upload, Download, Eye, EyeOff,
  Phone, Mail, Building, User, Pencil, KeyRound, LogIn,
} from "lucide-react";

const DEPARTMENTS = [
  "Administration", "Transport", "Sales", "Production",
  "Quality Control", "Accounts", "Marketing", "IT",
];

const DESIGNATIONS: Record<string, { id: string; label: string; department: string }[]> = {
  Administration: [
    { id: "gm", label: "General Manager", department: "Administration" },
    { id: "agm_admin", label: "AGM (Admin)", department: "Administration" },
    { id: "office_staff", label: "Office Staff", department: "Administration" },
  ],
  Transport: [
    { id: "gm_transport", label: "GM – Transport", department: "delivery" },
    { id: "agm_transport", label: "AGM – Transport", department: "delivery" },
    { id: "transport_manager", label: "Transport Manager", department: "delivery" },
    { id: "dgm_transport", label: "DGM – Transport", department: "delivery" },
    { id: "manager_transport", label: "Manager – Transport", department: "delivery" },
    { id: "logistics_coordinator", label: "Logistics Coordinator", department: "delivery" },
  ],
  Sales: [
    { id: "sales_manager", label: "Sales Manager", department: "Sales" },
    { id: "sales_executive", label: "Sales Executive", department: "Sales" },
    { id: "area_manager", label: "Area Manager", department: "Sales" },
  ],
  Production: [
    { id: "production_manager", label: "Production Manager", department: "Production" },
    { id: "manager_packing", label: "Packing Manager", department: "Production" },
    { id: "shift_incharge", label: "Shift In-Charge", department: "Production" },
  ],
  "Quality Control": [
    { id: "qc_manager", label: "QC Manager", department: "Quality Control" },
    { id: "qc_inspector", label: "QC Inspector", department: "Quality Control" },
  ],
  Accounts: [
    { id: "accounts_manager", label: "Accounts Manager", department: "Accounts" },
    { id: "accounts_officer", label: "Accounts Officer", department: "Accounts" },
  ],
  Marketing: [
    { id: "agm_marketing", label: "AGM – Marketing", department: "marketing" },
    { id: "manager_marketing", label: "Manager – Marketing", department: "marketing" },
    { id: "deputy_manager_marketing", label: "Deputy Manager – Marketing", department: "marketing" },
    { id: "segment_mgr_marketing_fm", label: "Segment Manager – FM (Marketing)", department: "marketing" },
    { id: "segment_mgr_marketing_dp", label: "Segment Manager – DP (Marketing)", department: "marketing" },
    { id: "segment_mgr_marketing_ic", label: "Segment Manager – IC (Marketing)", department: "marketing" },
    { id: "marketing_executive", label: "Marketing Executive", department: "marketing" },
    { id: "data_entry_operator", label: "Data Entry Operator", department: "marketing" },
  ],
  IT: [
    { id: "it_admin", label: "IT Admin", department: "IT" },
  ],
};

const ACCESS_TIERS: { id: string; label: string; desc: string }[] = [
  { id: "full", label: "Full Access", desc: "All modules" },
  { id: "manager", label: "Manager", desc: "Orders, Inventory, Reports" },
  { id: "transport", label: "Transport Management", desc: "Dashboard + Delivery modules" },
  { id: "operational", label: "Operational", desc: "Dashboard only" },
  { id: "union", label: "Union Level", desc: "Union-scoped access" },
  { id: "field_ops", label: "Field Operations", desc: "MMO Offices & Head Office only" },
];

export default function MerchantStaff() {
  const { merchantId } = useMerchantContext();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("Union@123");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalPassword, setApprovalPassword] = useState("");
  const [showApprovalPwd, setShowApprovalPwd] = useState(false);
  const [staffToApprove, setStaffToApprove] = useState<any>(null);
  const [approvedCredentials, setApprovedCredentials] = useState<{ name: string; employeeId: string; phone: string; password: string } | null>(null);

  const [addForm, setAddForm] = useState({
    name: "", phone: "", email: "", employeeId: "", username: "", password: "Union@123",
    department: "", designationId: "", accessTier: "operational",
    segments: [] as string[],
    assignedOffices: [] as string[],
  });

  const [transferForm, setTransferForm] = useState({
    department: "", designationId: "", accessTier: "", newUnionId: "",
  });

  const [editForm, setEditForm] = useState({
    name: "", phone: "", email: "", employeeId: "",
    department: "", designationId: "", accessTier: "operational",
    segments: [] as string[],
    assignedOffices: [] as string[],
  });

  const { data: staffList = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: mmoOfficesList = [] } = useQuery<any[]>({
    queryKey: ["/api/mmo/offices"],
  });

  const filtered = staffList.filter((s: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.username?.toLowerCase().includes(q) || s.designation?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
  });

  const pending = filtered.filter((s: any) => s.approvalStatus === "pending");
  const approved = filtered.filter((s: any) => s.approvalStatus === "approved");
  const rejected = filtered.filter((s: any) => s.approvalStatus === "rejected");
  const displayList = activeTab === "pending" ? pending : activeTab === "approved" ? approved : filtered;

  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof addForm) => {
      const desigEntry = DESIGNATIONS[data.department]?.find(d => d.id === data.designationId);
      const backendDept = desigEntry?.department || data.department;
      const payload: any = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        employeeId: data.employeeId,
        username: data.username,
        password: data.password,
        department: backendDept,
        designationId: data.designationId,
        accessTier: data.accessTier,
        assignedSegments: data.segments,
      };
      if (data.accessTier === "field_ops" && data.assignedOffices?.length > 0) {
        payload.assignedOffice = JSON.stringify(data.assignedOffices);
      }
      const res = await apiRequest("POST", "/api/staff", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member created successfully" });
      setShowAddDialog(false);
      resetAddForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (staffId: string) => {
      await apiRequest("PUT", `/api/union/${merchantId}/staff/${staffId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member approved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (staffId: string) => {
      await apiRequest("PUT", `/api/union/${merchantId}/staff/${staffId}`, {
        approvalStatus: "rejected",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member rejected" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (staffId: string) => {
      await apiRequest("DELETE", `/api/union/${merchantId}/staff/${staffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function resolveUnionId(staff?: any) {
    return staff?.unionId || merchantId || "";
  }

  const editMutation = useMutation({
    mutationFn: async ({ staffId, unionId, data }: { staffId: string; unionId: string; data: typeof editForm }) => {
      const desigEntry = DESIGNATIONS[data.department]?.find(d => d.id === data.designationId);
      const backendDept = desigEntry?.department || data.department;
      const designation = getDesignationLabel(data.designationId, data.department);
      const payload: any = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        employeeId: data.employeeId,
        department: backendDept,
        designationId: data.designationId,
        designation,
        accessTier: data.accessTier,
        assignedSegments: data.segments,
      };
      if (data.accessTier === "field_ops" && data.assignedOffices?.length > 0) {
        payload.assignedOffice = JSON.stringify(data.assignedOffices);
      } else {
        payload.assignedOffice = null;
      }
      await apiRequest("PUT", `/api/union/${unionId}/staff/${staffId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member updated" });
      setShowEditDialog(false);
      setSelectedStaff(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ staffId, unionId, password }: { staffId: string; unionId: string; password: string }) => {
      await apiRequest("PUT", `/api/union/${unionId}/staff/${staffId}/reset-password`, { newPassword: password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Password reset successfully" });
      setShowResetPasswordDialog(false);
      setSelectedStaff(null);
      setResetPasswordValue("Union@123");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const autoLoginMutation = useMutation({
    mutationFn: async ({ staffId, unionId }: { staffId: string; unionId: string }) => {
      if (!unionId) {
        throw new Error("No union context available for this staff member");
      }
      const res = await apiRequest("POST", `/api/union/${unionId}/staff/${staffId}/auto-login`);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.token) {
        window.location.href = `/?auto_login_token=${data.token}`;
      } else if (data.autoLoginUrl) {
        window.location.href = data.autoLoginUrl;
      } else {
        toast({ title: "Auto-login failed", description: "No login token received from server", variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Auto-login failed", description: e.message, variant: "destructive" }),
  });

  const transferMutation = useMutation({
    mutationFn: async ({ staffId, data }: { staffId: string; data: typeof transferForm }) => {
      const designation = getDesignationLabel(data.designationId, data.department);
      const desigEntry = (DESIGNATIONS[data.department] || []).find((d: any) => d.id === data.designationId);
      const backendDept = desigEntry?.department || data.department;
      const payload: any = {
        department: backendDept,
        designationId: data.designationId,
        designation,
        accessTier: data.accessTier,
      };
      if (data.newUnionId && data.newUnionId !== merchantId) {
        payload.newUnionId = data.newUnionId;
      }
      await apiRequest("PUT", `/api/union/${merchantId}/staff/${staffId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member transferred" });
      setShowTransferDialog(false);
      setSelectedStaff(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      let created = 0;
      for (const row of rows) {
        try {
          await apiRequest("POST", `/api/union/${merchantId}/staff`, {
            ...row,
            designation: getDesignationLabel(row.designationId, row.department),
          });
          created++;
        } catch {}
      }
      return created;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: `${count} staff imported successfully` });
      setShowBulkImportDialog(false);
    },
  });

  function resetAddForm() {
    setAddForm({ name: "", phone: "", email: "", employeeId: "", username: "", password: "Union@123", department: "", designationId: "", accessTier: "operational", segments: [], assignedOffices: [] });
  }

  function getDesignationLabel(desId: string, dept: string): string {
    const deptDesignations = DESIGNATIONS[dept] || [];
    return deptDesignations.find(d => d.id === desId)?.label || desId;
  }

  function handleAddStaff() {
    if (!addForm.name || !addForm.phone || !addForm.employeeId || !addForm.username || !addForm.password || !addForm.department || !addForm.designationId) {
      toast({ title: "Please fill all required fields (including Employee ID)", variant: "destructive" });
      return;
    }
    if (addForm.accessTier === "field_ops" && addForm.assignedOffices.length === 0) {
      toast({ title: "Please select at least one mapped office", variant: "destructive" });
      return;
    }
    createStaffMutation.mutate(addForm);
  }

  function openTransfer(staff: any) {
    setSelectedStaff(staff);
    setTransferForm({
      department: staff.department || "",
      designationId: staff.designationId || "",
      accessTier: staff.accessTier || "operational",
      newUnionId: staff.unionId || merchantId,
    });
    setShowTransferDialog(true);
  }

  function parseAssignedOffices(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; } catch {}
      return raw ? [raw] : [];
    }
    return [];
  }

  function openEditStaff(staff: any) {
    setSelectedStaff(staff);
    let deptKey = "";
    if (staff.designationId) {
      deptKey = Object.keys(DESIGNATIONS).find(dk =>
        DESIGNATIONS[dk].some(d => d.id === staff.designationId)
      ) || "";
    }
    if (!deptKey && staff.department) {
      const deptLower = staff.department.toLowerCase();
      deptKey = DEPARTMENTS.find(d => d.toLowerCase() === deptLower)
        || DEPARTMENTS.find(d => d === staff.department)
        || Object.keys(DESIGNATIONS).find(dk =>
            DESIGNATIONS[dk].some(d => d.department?.toLowerCase() === deptLower)
          ) || staff.department;
    }
    const existingOffices = staff.assignedOffices || parseAssignedOffices(staff.assignedOffice);
    setEditForm({
      name: staff.name || "",
      phone: staff.phone || "",
      email: staff.email || "",
      employeeId: staff.employeeId || "",
      department: deptKey,
      designationId: staff.designationId || "",
      accessTier: staff.accessTier || "operational",
      segments: staff.assignedSegments || [],
      assignedOffices: existingOffices,
    });
    setShowEditDialog(true);
  }

  function openResetPassword(staff: any) {
    setSelectedStaff(staff);
    setResetPasswordValue("Union@123");
    setShowResetPwd(false);
    setShowResetPasswordDialog(true);
  }

  function openCredentials(staff: any) {
    setSelectedStaff(staff);
    setShowCredentialsDialog(true);
  }

  function openApproveDialog(staff: any) {
    const last4 = (staff.phone || "").slice(-4);
    setApprovalPassword(last4 ? `Aavin@${last4}` : "Union@123");
    setShowApprovalPwd(false);
    setStaffToApprove(staff);
    setShowApprovalDialog(true);
  }

  const approveWithPasswordMutation = useMutation({
    mutationFn: async ({ staffId, unionId, password }: { staffId: string; unionId: string; password: string }) => {
      await apiRequest("PUT", `/api/union/${unionId}/staff/${staffId}/approve`);
      await apiRequest("PUT", `/api/union/${unionId}/staff/${staffId}/reset-password`, { newPassword: password });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setShowApprovalDialog(false);
      setApprovedCredentials({
        name: staffToApprove?.name || "",
        employeeId: staffToApprove?.employeeId || staffToApprove?.username || "",
        phone: staffToApprove?.phone || "",
        password: vars.password,
      });
      toast({ title: `${staffToApprove?.name} approved`, description: "Share login credentials with the staff member." });
    },
    onError: (e: any) => toast({ title: "Approval failed", description: e.message, variant: "destructive" }),
  });

  async function handleBulkImport(file: File) {
    try {
      const buffer = await file.arrayBuffer();
      const { rows: rawRows } = await parseXlsxToRows(buffer);

      const rows = rawRows.map((row: any, i: number) => ({
        name: row["Name"] || row["name"] || "",
        phone: String(row["Phone"] || row["phone"] || ""),
        email: row["Email"] || row["email"] || "",
        username: row["Username"] || row["username"] || row["Employee ID"] || `staff${i + 1}`,
        password: row["Password"] || row["password"] || "Union@123",
        department: row["Department"] || row["department"] || "Administration",
        designationId: row["Designation ID"] || row["designationId"] || "office_staff",
        accessTier: row["Access Tier"] || row["accessTier"] || "operational",
        assignedSegments: [],
      })).filter((r: any) => r.name && r.phone);

      if (rows.length === 0) {
        toast({ title: "No valid rows found in Excel", variant: "destructive" });
        return;
      }
      bulkImportMutation.mutate(rows);
    } catch {
      toast({ title: "Failed to parse Excel file", variant: "destructive" });
    }
  }

  function downloadSample() {
    const headers = ["Name", "Phone", "Email", "Username", "Password", "Department", "Designation ID", "Access Tier"];
    const sample = [
      ["John Doe", "9876543210", "john@example.com", "john.doe", "Union@123", "Sales", "sales_executive", "manager"],
      ["Jane Smith", "9876543211", "jane@example.com", "jane.smith", "Union@123", "Transport", "logistics_coordinator", "operational"],
    ];
    const csv = [headers.join(","), ...sample.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "staff_import_sample.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const segmentOptions = ["Fresh Milk", "Products", "Ice Cream"];

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Staff Management</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {staffList.length} staff members ({pending.length} pending)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" /> Add Staff
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkImportDialog(true)}>
              <Upload className="h-4 w-4 mr-1" /> Bulk Import
            </Button>
            <Button variant="outline" size="sm" onClick={downloadSample}>
              <Download className="h-4 w-4 mr-1" /> Sample
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{staffList.length}</p>
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <UserCheck className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{staffList.filter((s: any) => s.approvalStatus === "approved").length}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{staffList.filter((s: any) => s.approvalStatus === "pending").length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, username, designation..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : displayList.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No staff found</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Add Staff" to create a new staff member</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden md:block">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayList.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.username || "—"}</TableCell>
                        <TableCell className="text-sm">{s.department || "—"}</TableCell>
                        <TableCell className="text-sm">{s.designation || "—"}</TableCell>
                        <TableCell className="text-sm">{s.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge className={
                            s.approvalStatus === "approved" ? "bg-green-500" :
                            s.approvalStatus === "rejected" ? "bg-red-500" :
                            "bg-orange-500"
                          }>
                            {s.approvalStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditStaff(s)}>
                                <Pencil className="h-4 w-4 mr-2 text-blue-500" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openCredentials(s)}>
                                <Eye className="h-4 w-4 mr-2 text-purple-500" /> View Credentials
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openResetPassword(s)}>
                                <KeyRound className="h-4 w-4 mr-2 text-orange-500" /> Reset Password
                              </DropdownMenuItem>
                              {s.approvalStatus === "approved" && (
                                <DropdownMenuItem onClick={() => autoLoginMutation.mutate({ staffId: s.id, unionId: resolveUnionId(s) })} disabled={autoLoginMutation.isPending}>
                                  <LogIn className="h-4 w-4 mr-2 text-green-600" /> Auto Login
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {s.approvalStatus === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => openApproveDialog(s)}>
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => rejectMutation.mutate(s.id)}>
                                    <XCircle className="h-4 w-4 mr-2 text-red-500" /> Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {s.approvalStatus === "rejected" && (
                                <DropdownMenuItem onClick={() => openApproveDialog(s)}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Approve
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openTransfer(s)}>
                                <ArrowRightLeft className="h-4 w-4 mr-2 text-blue-500" /> Transfer / Reassign
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { if (confirm(`Delete staff member "${s.name}"?`)) deleteMutation.mutate(s.id); }} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="md:hidden space-y-3">
              {displayList.map((s: any) => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-medium">{s.name}</span>
                        <p className="text-xs text-muted-foreground">@{s.username}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          s.approvalStatus === "approved" ? "bg-green-500 text-xs" :
                          s.approvalStatus === "rejected" ? "bg-red-500 text-xs" :
                          "bg-orange-500 text-xs"
                        }>
                          {s.approvalStatus}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditStaff(s)}>
                              <Pencil className="h-4 w-4 mr-2 text-blue-500" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCredentials(s)}>
                              <Eye className="h-4 w-4 mr-2 text-purple-500" /> View Credentials
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResetPassword(s)}>
                              <KeyRound className="h-4 w-4 mr-2 text-orange-500" /> Reset Password
                            </DropdownMenuItem>
                            {s.approvalStatus === "approved" && (
                              <DropdownMenuItem onClick={() => autoLoginMutation.mutate({ staffId: s.id, unionId: resolveUnionId(s) })} disabled={autoLoginMutation.isPending}>
                                <LogIn className="h-4 w-4 mr-2 text-green-600" /> Auto Login
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {s.approvalStatus === "pending" && (
                              <>
                                <DropdownMenuItem onClick={() => openApproveDialog(s)}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => rejectMutation.mutate(s.id)}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-500" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {s.approvalStatus === "rejected" && (
                              <DropdownMenuItem onClick={() => openApproveDialog(s)}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openTransfer(s)}>
                              <ArrowRightLeft className="h-4 w-4 mr-2 text-blue-500" /> Transfer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id); }} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.department || "—"} · {s.designation || "—"}
                    </p>
                    {s.phone && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Add Staff Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Full Name *</Label>
                <Input placeholder="Staff name" value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Phone *</Label>
                <Input placeholder="Phone number" value={addForm.phone} onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Employee ID *</Label>
                <Input placeholder="Employee ID" value={addForm.employeeId} onChange={(e) => setAddForm(f => ({ ...f, employeeId: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <Input placeholder="Email (optional)" value={addForm.email} onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Username *</Label>
                <Input placeholder="Login username" value={addForm.username} onChange={(e) => setAddForm(f => ({ ...f, username: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Password *</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={addForm.password} onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))} />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Department *</Label>
                <Select value={addForm.department} onValueChange={(v) => setAddForm(f => ({ ...f, department: v, designationId: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Designation *</Label>
                <Select value={addForm.designationId} onValueChange={(v) => setAddForm(f => ({ ...f, designationId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    {(DESIGNATIONS[addForm.department] || []).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm">Access Tier</Label>
              <Select value={addForm.accessTier} onValueChange={(v) => setAddForm(f => ({ ...f, accessTier: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_TIERS.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label} — {t.desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addForm.accessTier === "field_ops" && (
              <div>
                <Label className="text-sm font-medium">Mapped Offices *</Label>
                <p className="text-xs text-gray-500 mb-2">Select the MMO offices and/or Head Office this staff member can access</p>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1">
                    <Checkbox
                      checked={addForm.assignedOffices.includes("Head Office")}
                      onCheckedChange={(checked) => {
                        setAddForm(f => ({
                          ...f,
                          assignedOffices: checked
                            ? [...f.assignedOffices, "Head Office"]
                            : f.assignedOffices.filter(o => o !== "Head Office"),
                        }));
                      }}
                    />
                    <Building className="h-3.5 w-3.5 text-blue-500" />
                    Head Office
                  </label>
                  {mmoOfficesList.map((office: any) => (
                    <label key={office.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1">
                      <Checkbox
                        checked={addForm.assignedOffices.includes(office.officeName)}
                        onCheckedChange={(checked) => {
                          setAddForm(f => ({
                            ...f,
                            assignedOffices: checked
                              ? [...f.assignedOffices, office.officeName]
                              : f.assignedOffices.filter(o => o !== office.officeName),
                          }));
                        }}
                      />
                      <Building className="h-3.5 w-3.5 text-gray-400" />
                      {office.officeName}
                    </label>
                  ))}
                </div>
                {addForm.assignedOffices.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">At least one office must be selected</p>
                )}
              </div>
            )}
            <div>
              <Label className="text-sm">Assigned Segments</Label>
              <div className="flex gap-3 mt-1">
                {segmentOptions.map(seg => (
                  <label key={seg} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={addForm.segments.includes(seg)}
                      onCheckedChange={(checked) => {
                        setAddForm(f => ({
                          ...f,
                          segments: checked ? [...f.segments, seg] : f.segments.filter(s => s !== seg),
                        }));
                      }}
                    />
                    {seg}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddStaff} disabled={createStaffMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createStaffMutation.isPending ? "Creating..." : "Create Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" /> Transfer / Reassign Staff
            </DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedStaff.name}</p>
                <p className="text-xs text-muted-foreground">
                  Currently: {selectedStaff.department || "—"} · {selectedStaff.designation || "—"}
                </p>
              </div>
              <div>
                <Label className="text-sm">Transfer to Union</Label>
                <Select value={transferForm.newUnionId} onValueChange={(v) => setTransferForm(f => ({ ...f, newUnionId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Same union (no transfer)" /></SelectTrigger>
                  <SelectContent>
                    {DISTRICT_UNIONS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedStaff && transferForm.newUnionId && transferForm.newUnionId !== (selectedStaff.unionId || merchantId) && (
                  <p className="text-xs text-orange-600 mt-1">
                    Staff will be transferred to {DISTRICT_UNIONS.find(u => u.value === transferForm.newUnionId)?.label || transferForm.newUnionId}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-sm">New Department</Label>
                <Select value={transferForm.department} onValueChange={(v) => setTransferForm(f => ({ ...f, department: v, designationId: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">New Designation</Label>
                <Select value={transferForm.designationId} onValueChange={(v) => setTransferForm(f => ({ ...f, designationId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                  <SelectContent>
                    {(DESIGNATIONS[transferForm.department] || []).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Access Tier</Label>
                <Select value={transferForm.accessTier} onValueChange={(v) => setTransferForm(f => ({ ...f, accessTier: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCESS_TIERS.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedStaff && transferForm.department && transferForm.designationId) {
                transferMutation.mutate({ staffId: selectedStaff.id, data: transferForm });
              }
            }} disabled={transferMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {transferMutation.isPending ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Bulk Import Staff
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload an Excel (.xlsx) or CSV file with staff data. Required columns: Name, Phone, Username, Password, Department, Designation ID.
            </p>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                id="staff-import-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBulkImport(file);
                  e.target.value = "";
                }}
              />
              <label htmlFor="staff-import-input" className="cursor-pointer">
                <p className="text-sm font-medium text-blue-600">Click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Excel or CSV files</p>
              </label>
            </div>
            {bulkImportMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Importing staff members...
              </div>
            )}
            <Button variant="outline" size="sm" onClick={downloadSample} className="w-full">
              <Download className="h-4 w-4 mr-1" /> Download Sample Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Edit Staff Member
            </DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Full Name *</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm">Phone *</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Employee ID</Label>
                  <Input value={editForm.employeeId} onChange={(e) => setEditForm(f => ({ ...f, employeeId: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm">Email</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Department *</Label>
                  <Select value={editForm.department} onValueChange={(v) => setEditForm(f => ({ ...f, department: v, designationId: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Designation *</Label>
                  <Select value={editForm.designationId} onValueChange={(v) => setEditForm(f => ({ ...f, designationId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                    <SelectContent>
                      {(DESIGNATIONS[editForm.department] || []).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm">Access Tier</Label>
                <Select value={editForm.accessTier} onValueChange={(v) => setEditForm(f => ({ ...f, accessTier: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCESS_TIERS.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label} — {t.desc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Assigned Segments</Label>
                <div className="flex gap-3 mt-1">
                  {segmentOptions.map(seg => (
                    <label key={seg} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <Checkbox
                        checked={editForm.segments.includes(seg)}
                        onCheckedChange={(checked) => {
                          setEditForm(f => ({
                            ...f,
                            segments: checked ? [...f.segments, seg] : f.segments.filter(s => s !== seg),
                          }));
                        }}
                      />
                      {seg}
                    </label>
                  ))}
                </div>
              </div>
              {editForm.accessTier === "field_ops" && (
                <div>
                  <Label className="text-sm font-medium">Mapped Offices *</Label>
                  <p className="text-xs text-gray-500 mb-2">Select the MMO offices and/or Head Office this staff member can access</p>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1">
                      <Checkbox
                        checked={editForm.assignedOffices.includes("Head Office")}
                        onCheckedChange={(checked) => {
                          setEditForm(f => ({
                            ...f,
                            assignedOffices: checked
                              ? [...f.assignedOffices, "Head Office"]
                              : f.assignedOffices.filter(o => o !== "Head Office"),
                          }));
                        }}
                      />
                      <Building className="h-3.5 w-3.5 text-blue-500" />
                      Head Office
                    </label>
                    {mmoOfficesList.map((office: any) => (
                      <label key={office.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-1">
                        <Checkbox
                          checked={editForm.assignedOffices.includes(office.officeName)}
                          onCheckedChange={(checked) => {
                            setEditForm(f => ({
                              ...f,
                              assignedOffices: checked
                                ? [...f.assignedOffices, office.officeName]
                                : f.assignedOffices.filter(o => o !== office.officeName),
                            }));
                          }}
                        />
                        <Building className="h-3.5 w-3.5 text-gray-400" />
                        {office.officeName}
                      </label>
                    ))}
                  </div>
                  {editForm.assignedOffices.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">At least one office must be selected</p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedStaff && editForm.name && editForm.department && editForm.designationId) {
                if (editForm.accessTier === "field_ops" && editForm.assignedOffices.length === 0) {
                  toast({ title: "Please select at least one mapped office", variant: "destructive" });
                  return;
                }
                editMutation.mutate({ staffId: selectedStaff.id, unionId: resolveUnionId(selectedStaff), data: editForm });
              }
            }} disabled={editMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Reset Password
            </DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedStaff.name}</p>
                <p className="text-xs text-muted-foreground">@{selectedStaff.username}</p>
              </div>
              <div>
                <Label className="text-sm">New Password</Label>
                <div className="relative">
                  <Input
                    type={showResetPwd ? "text" : "password"}
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowResetPwd(!showResetPwd)}>
                    {showResetPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Default password: Union@123</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!resetPasswordValue || resetPasswordValue.length < 6) {
                toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
                return;
              }
              if (selectedStaff) {
                resetPasswordMutation.mutate({ staffId: selectedStaff.id, unionId: resolveUnionId(selectedStaff), password: resetPasswordValue });
              }
            }} disabled={resetPasswordMutation.isPending} className="bg-orange-600 hover:bg-orange-700">
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Login Credentials
            </DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedStaff.name}</p>
                <p className="text-xs text-muted-foreground">{selectedStaff.department || "—"} · {selectedStaff.designation || "—"}</p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Username</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={selectedStaff.username || "—"} readOnly className="bg-muted" />
                    <Button variant="outline" size="sm" onClick={() => {
                      try {
                        navigator.clipboard.writeText(selectedStaff.username || "");
                        toast({ title: "Username copied" });
                      } catch {
                        toast({ title: "Could not copy", description: "Please select and copy manually", variant: "destructive" });
                      }
                    }}>Copy</Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <p className="text-sm mt-1 text-muted-foreground">
                    Passwords are securely hashed and cannot be viewed. Use "Reset Password" to set a new one if needed.
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCredentialsDialog(false)}>Close</Button>
            <Button variant="outline" onClick={() => { setShowCredentialsDialog(false); if (selectedStaff) openResetPassword(selectedStaff); }} className="text-orange-600 border-orange-300 hover:bg-orange-50">
              <KeyRound className="h-4 w-4 mr-1" /> Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval + password setup dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={(open) => { if (!approveWithPasswordMutation.isPending) setShowApprovalDialog(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" /> Approve Staff Member
            </DialogTitle>
          </DialogHeader>
          {staffToApprove && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <p className="font-medium">{staffToApprove.name}</p>
                <p className="text-xs text-muted-foreground">{staffToApprove.designation || "—"} · {staffToApprove.department || "—"}</p>
                <div className="flex gap-4 mt-1">
                  {staffToApprove.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {staffToApprove.phone}</p>}
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> ID: {staffToApprove.employeeId || staffToApprove.username || "—"}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Set Login Password</Label>
                <p className="text-xs text-muted-foreground mb-2">This password will replace the one they set during registration. Share it with the staff member so they can log in.</p>
                <div className="relative">
                  <Input
                    type={showApprovalPwd ? "text" : "password"}
                    value={approvalPassword}
                    onChange={(e) => setApprovalPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="pr-10"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowApprovalPwd(!showApprovalPwd)}>
                    {showApprovalPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Default: Aavin@ + last 4 digits of phone</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={approveWithPasswordMutation.isPending}>Cancel</Button>
            <Button onClick={() => {
              if (!approvalPassword || approvalPassword.length < 6) {
                toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
                return;
              }
              if (staffToApprove) {
                approveWithPasswordMutation.mutate({
                  staffId: staffToApprove.id,
                  unionId: resolveUnionId(staffToApprove),
                  password: approvalPassword,
                });
              }
            }} disabled={approveWithPasswordMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {approveWithPasswordMutation.isPending ? "Approving..." : "Approve & Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share credentials card shown after approval */}
      {approvedCredentials && (
        <Dialog open={!!approvedCredentials} onOpenChange={(open) => { if (!open) setApprovedCredentials(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" /> Share Login Credentials
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{approvedCredentials.name}</span> has been approved. Share these credentials with them so they can log in.
              </p>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Login URL</p>
                  <p className="text-sm font-mono mt-0.5">aavincart.com/pwa/staff</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Employee ID (Username)</p>
                  <p className="text-sm font-mono font-bold mt-0.5">{approvedCredentials.employeeId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Password</p>
                  <p className="text-sm font-mono font-bold mt-0.5">{approvedCredentials.password}</p>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => {
                const text = `Aavin Staff Login\nURL: aavincart.com/pwa/staff\nEmployee ID: ${approvedCredentials.employeeId}\nPassword: ${approvedCredentials.password}`;
                try {
                  navigator.clipboard.writeText(text);
                  toast({ title: "Credentials copied to clipboard" });
                } catch {
                  toast({ title: "Could not copy", description: "Please note the credentials manually", variant: "destructive" });
                }
              }}>
                Copy Credentials
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setApprovedCredentials(null)} className="bg-green-600 hover:bg-green-700">Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MerchantLayout>
  );
}
